import { CURRENT_MENU_URL, isMenuSuccess, unwrapMenuData, getCurrentMenu } from '@/api/menu'
import menuModule from '@/store/modules/menu'

jest.mock('@/api/menu', () => {
  const actual = jest.requireActual('@/api/menu')
  return Object.assign({}, actual, { getCurrentMenu: jest.fn() })
})

const menuMocks = require('../../../mock/menuManage')

const MENU_FIELDS = [
  'id', 'pid', 'parentCode', 'code', 'description', 'name', 'menuCode',
  'meantype', 'icon', 'url', 'level0', 'orderNum', 'regular', 'deleteFlag',
  'cacheFlag', 'sidebarShow', 'children'
]

describe('POST /system/menu/current-menu mock 契约', () => {
  const route = menuMocks.find(item => item.url === CURRENT_MENU_URL)

  it('按接口文档返回 code=200 / msg / data 树形数组', () => {
    expect(route).toBeTruthy()
    expect(route.type).toBe('post')
    // url 可能是 @/view/...，必须原样返回，不能被 Mock.js 当模板解析
    expect(route.raw).toBe(true)
    const res = route.response({ body: {}, query: {} })
    expect(res.code).toBe(200)
    expect(res.msg).toBe('success')
    expect(Array.isArray(res.data)).toBe(true)
    expect(res.data.length).toBeGreaterThan(0)
  })

  it('节点字段与菜单管理树 DTO 一致', () => {
    const res = route.response({ body: {}, query: {} })
    MENU_FIELDS.forEach(key => expect(res.data[0]).toHaveProperty(key))
    expect(res.data[0].children).toEqual(expect.any(Array))
  })

  it('复用 GET /system/menu/tree 的同一份内存数据，且过滤逻辑删除节点', () => {
    const treeRoute = menuMocks.find(item => item.url === '/system/menu/tree')
    const tree = treeRoute.response({ query: {} }).data
    const current = route.response({ body: {}, query: {} }).data
    expect(current.map(node => node.id)).toEqual(tree.map(node => node.id))
    const walk = list => {
      list.forEach(node => {
        expect(Number(node.deleteFlag)).not.toBe(1)
        walk(node.children || [])
      })
    }
    walk(current)
  })
})

describe('菜单接口解包', () => {
  it('成功码兼容 200 / 字符串 200 / success 标记', () => {
    ;[200, '200'].forEach(code => {
      expect(isMenuSuccess({ code })).toBe(true)
    })
    expect(isMenuSuccess({ success: true })).toBe(true)
    expect(isMenuSuccess({ code: 401 })).toBe(false)
    expect(isMenuSuccess(null)).toBe(false)
  })

  it('data 直接为数组，或包在 menus / list / tree 里都能取出', () => {
    const tree = [{ id: 1 }]
    expect(unwrapMenuData(tree)).toEqual(tree)
    expect(unwrapMenuData({ code: 200, data: tree })).toEqual(tree)
    expect(unwrapMenuData({ code: 200, data: { menus: tree } })).toEqual(tree)
    expect(unwrapMenuData({ code: 200, data: { list: tree } })).toEqual(tree)
    expect(unwrapMenuData({ code: 200, data: { tree } })).toEqual(tree)
    expect(unwrapMenuData({ code: 200 })).toEqual([])
  })

  it('失败响应抛出可读取的错误信息', () => {
    expect(() => unwrapMenuData({ code: 401, msg: 'Unauthorized' })).toThrow('Unauthorized')
  })
})

describe('menu store', () => {
  // 接口层已过滤按钮并补 meta：store 收到的菜单树只含目录 / 页面菜单
  const filteredTree = [{
    id: 1,
    code: 'RAA',
    name: '系统管理',
    meantype: 'menu',
    menuCode: '',
    url: '',
    children: [{
      id: 2,
      code: 'RAA01',
      name: '菜单管理',
      meantype: 'menu',
      menuCode: '/system/menuManage',
      url: 'view/menuManage/index.vue',
      meta: { title: '菜单管理', firstLevelMenu: '系统管理', tracker: true },
      children: []
    }]
  }]
  const makeContext = () => {
    const ctx = {
      state: { menus: [], loaded: false },
      commit: null,
      dispatch: null
    }
    ctx.commit = (type, payload) => menuModule.mutations[type](ctx.state, payload)
    ctx.dispatch = (type, payload) => menuModule.actions[type](ctx, payload)
    return ctx
  }

  beforeEach(() => {
    getCurrentMenu.mockReset()
    getCurrentMenu.mockResolvedValue(filteredTree)
  })

  it('拉取后保存过滤并补 meta 后的菜单树', async() => {
    const ctx = makeContext()
    const menus = await menuModule.actions.fetchCurrentMenu(ctx)
    expect(getCurrentMenu).toHaveBeenCalledTimes(1)
    expect(menus).toEqual(filteredTree)
    expect(ctx.state.menus).toEqual(filteredTree)
    expect(ctx.state.menus[0].meta).toBeUndefined()
    expect(ctx.state.menus[0].children[0].meta).toEqual({
      title: '菜单管理',
      firstLevelMenu: '系统管理',
      tracker: true
    })
    const walk = list => {
      list.forEach(node => {
        expect(node.meantype).not.toBe('button')
        walk(node.children || [])
      })
    }
    walk(ctx.state.menus)
    expect(ctx.state.loaded).toBe(true)
  })

  it('已加载时复用缓存，force 才重新请求', async() => {
    const ctx = makeContext()
    await menuModule.actions.fetchCurrentMenu(ctx)
    await menuModule.actions.fetchCurrentMenu(ctx)
    expect(getCurrentMenu).toHaveBeenCalledTimes(1)
    await menuModule.actions.refreshCurrentMenu(ctx)
    expect(getCurrentMenu).toHaveBeenCalledTimes(2)
  })

  it('请求失败直接向上抛异常，不写入菜单也不置为已加载', async() => {
    const ctx = makeContext()
    getCurrentMenu.mockRejectedValueOnce(new Error('接口异常'))
    await expect(menuModule.actions.fetchCurrentMenu(ctx)).rejects.toThrow('接口异常')
    expect(ctx.state.loaded).toBe(false)
    expect(ctx.state.menus).toEqual([])
  })

  it('重置后清空菜单状态', async() => {
    const ctx = makeContext()
    await menuModule.actions.fetchCurrentMenu(ctx)
    menuModule.actions.resetCurrentMenu(ctx)
    expect(ctx.state).toEqual({ menus: [], loaded: false })
  })
})
