import fetch from '@/utils/fetch'
import {
  CURRENT_MENU_URL,
  getCurrentMenu,
  filterMenuButtons,
  filterHiddenMenus,
  withMenuMeta,
  formatMenus
} from '@/api/menu'

jest.mock('@/utils/fetch', () => ({ post: jest.fn() }))

// 真实接口形态：目录 / 页面菜单 / 按钮节点混在同一棵树里
const rawTree = [
  {
    id: 1,
    code: 'RAA',
    name: '系统管理',
    meantype: 'menu',
    menuCode: '',
    url: '',
    children: [
      {
        id: 2,
        code: 'RAA01',
        name: '菜单管理',
        meantype: 'menu',
        menuCode: '/system/menuManage',
        url: '@/view/menuManage/index.vue',
        children: [
          { id: 3, code: 'RAA01:B1', name: '新增', meantype: 'button', menuCode: '', url: '', children: [] },
          { id: 4, code: 'RAA01:B2', name: '导出', meantype: 'button', menuCode: '', url: '', children: [] }
        ]
      },
      // 旧字段 menutype 也要一并过滤
      { id: 5, code: 'RAA01:B2', name: '旧字段按钮', menutype: 'button', children: [] }
    ]
  },
  // 权限编码可能为空的顶层按钮节点，同样不进菜单树
  { id: 6, code: '', name: '顶层按钮', meantype: 'button', children: [] }
]

const assertNoButtons = list => {
  list.forEach(node => {
    expect(node.meantype).not.toBe('button')
    expect(node.menutype).not.toBe('button')
    assertNoButtons(node.children || [])
  })
}

beforeEach(() => {
  fetch.post.mockReset()
  fetch.post.mockResolvedValue({ code: 200, msg: 'success', data: rawTree })
})

describe('getCurrentMenu 按钮过滤', () => {
  it('递归剔除 meantype=button / menutype=button 的节点', async() => {
    const menus = await getCurrentMenu()
    assertNoButtons(menus)
    expect(menus.length).toBe(1)
    expect(menus[0].children.length).toBe(1)
    expect(menus[0].children[0].children).toEqual([])
  })

  it('保留非按钮节点的原有字段', async() => {
    const menus = await getCurrentMenu()
    expect(menus[0].name).toBe('系统管理')
    expect(menus[0].children[0]).toMatchObject({
      id: 2,
      name: '菜单管理',
      menuCode: '/system/menuManage',
      url: '@/view/menuManage/index.vue'
    })
  })

  it('不修改接口返回的原始树', async() => {
    await getCurrentMenu()
    expect(rawTree[0].children[0].children.length).toBe(2)
    expect(rawTree.length).toBe(2)
  })

  it('filterMenuButtons 对空 / 非数组输入也安全', () => {
    expect(filterMenuButtons(null)).toEqual([])
    expect(filterMenuButtons([])).toEqual([])
  })
})

describe('页面菜单 meta', () => {
  it('目录不加 meta；页面菜单补 title / firstLevelMenu / tracker', async() => {
    const menus = await getCurrentMenu()
    expect(menus[0].meta).toBeUndefined()
    expect(menus[0].children[0].meta).toEqual({
      title: '菜单管理',
      firstLevelMenu: '系统管理',
      tracker: true
    })
  })

  it('menuCode 或 url 为空时不加 meta，按钮节点被过滤', async() => {
    fetch.post.mockResolvedValueOnce({
      code: 200,
      data: [
        {
          id: 11,
          name: '一级目录',
          meantype: 'menu',
          menuCode: '',
          url: '',
          children: [
            { id: 12, name: '缺 menuCode', meantype: 'menu', menuCode: '', url: 'views/x.vue', children: [] },
            { id: 13, name: '缺 url', meantype: 'menu', menuCode: '/x', url: '   ', children: [] },
            { id: 14, name: '按钮', meantype: 'button', menuCode: '/b', url: 'views/b.vue', children: [] }
          ]
        }
      ]
    })
    const menus = await getCurrentMenu()
    expect(menus[0].meta).toBeUndefined()
    expect(menus[0].children.length).toBe(2)
    expect(menus[0].children[0].meta).toBeUndefined()
    expect(menus[0].children[1].meta).toBeUndefined()
  })

  it('一级节点自身是页面菜单时 firstLevelMenu 取自身名称', async() => {
    fetch.post.mockResolvedValueOnce({
      code: 200,
      data: [{
        id: 21,
        name: '首页总览',
        meantype: 'menu',
        menuCode: '/homeOverview',
        url: '@/view/homePage/overview/index.vue',
        children: []
      }]
    })
    const menus = await getCurrentMenu()
    expect(menus[0].meta).toEqual({
      title: '首页总览',
      firstLevelMenu: '首页总览',
      tracker: true
    })
  })

  it('withMenuMeta 不改原始树，且保留已有 meta 的其他属性', () => {
    const tree = [{
      id: 1,
      name: 'A',
      meantype: 'menu',
      menuCode: '/a',
      url: 'a.vue',
      meta: { icon: 'chart' },
      children: []
    }]
    const result = withMenuMeta(tree)
    expect(tree[0].meta).toEqual({ icon: 'chart' })
    expect(result[0].meta).toEqual({
      icon: 'chart',
      title: 'A',
      firstLevelMenu: 'A',
      tracker: true
    })
  })
})

describe('接口请求与格式化结果', () => {
  it('直接返回菜单树数组，不再带 buttons 字段', async() => {
    const menus = await getCurrentMenu()
    expect(fetch.post).toHaveBeenCalledTimes(1)
    expect(Array.isArray(menus)).toBe(true)
    expect(menus.buttons).toBeUndefined()
    assertNoButtons(menus)
    expect(menus[0].children[0].meta.tracker).toBe(true)
  })

  it('请求格式按文档：form-urlencoded、空 body、非必填 query', async() => {
    await getCurrentMenu({ userId: 'u1' })
    expect(fetch.post).toHaveBeenCalledWith(
      CURRENT_MENU_URL,
      '',
      { userId: 'u1' },
      expect.objectContaining({
        headers: expect.objectContaining({ 'Content-Type': 'application/x-www-form-urlencoded' })
      })
    )
  })
})

describe('左侧栏不显示的菜单过滤', () => {
  const hiddenTree = [
    {
      id: 11,
      name: '可见目录',
      meantype: 'menu',
      menuCode: '',
      url: '',
      sidebarShow: 0,
      children: [
        { id: 12, name: '可见页面', meantype: 'menu', menuCode: '/visible', url: 'views/visible.vue', children: [] },
        {
          id: 13,
          name: '隐藏页面',
          meantype: 'menu',
          menuCode: '/hidden',
          url: 'views/hidden.vue',
          sidebarShow: 1,
          children: [
            {
              id: 14,
              name: '隐藏页面的子页',
              meantype: 'menu',
              menuCode: '/hidden/child',
              url: 'views/hidden/child.vue',
              sidebarShow: 0,
              children: []
            }
          ]
        },
        { id: 15, name: '字符串标记隐藏', meantype: 'menu', menuCode: '/hidden2', url: 'views/hidden2.vue', sidebarShow: '1', children: [] }
      ]
    },
    {
      id: 16,
      name: '隐藏目录',
      meantype: 'menu',
      menuCode: '',
      url: '',
      sidebarShow: 1,
      children: [
        { id: 17, name: '隐藏目录下页面', meantype: 'menu', menuCode: '/orphan', url: 'views/orphan.vue', sidebarShow: 0, children: [] }
      ]
    }
  ]

  it('递归剔除 sidebarShow=1 的节点及其子树，且不改原始树', () => {
    const result = filterHiddenMenus(hiddenTree)
    expect(result.length).toBe(1)
    expect(result[0].children.map(node => node.name)).toEqual(['可见页面'])
    expect(hiddenTree[0].children.length).toBe(3)
    expect(hiddenTree.length).toBe(2)
  })

  it('0 / null / 缺省视为显示，空输入安全', () => {
    const tree = [
      { id: 1, sidebarShow: 0, children: [] },
      { id: 2, sidebarShow: null, children: [] },
      { id: 3, children: [] }
    ]
    expect(filterHiddenMenus(tree).map(node => node.id)).toEqual([1, 2, 3])
    expect(filterHiddenMenus(null)).toEqual([])
  })

  it('getCurrentMenu 全链路过滤隐藏菜单，保留可见页面的 meta', async() => {
    fetch.post.mockResolvedValueOnce({ code: 200, data: hiddenTree })
    const menus = await getCurrentMenu()
    const names = []
    const walk = list => {
      list.forEach(node => {
        names.push(node.name)
        walk(node.children || [])
      })
    }
    walk(menus)
    expect(names).toEqual(['可见目录', '可见页面'])
    expect(menus[0].children[0].meta).toEqual({
      title: '可见页面',
      firstLevelMenu: '可见目录',
      tracker: true
    })
  })

  it('withMenuMeta 单独调用也会过滤隐藏菜单（只迁移格式化函数也不会漏）', () => {
    const result = withMenuMeta(hiddenTree)
    expect(result.length).toBe(1)
    expect(result[0].children.map(node => node.name)).toEqual(['可见页面'])
  })

  it('formatMenus 是单一入口：隐藏过滤与 meta 一次完成', () => {
    const result = formatMenus(hiddenTree)
    const names = []
    const walk = list => {
      list.forEach(node => {
        names.push(node.name)
        walk(node.children || [])
      })
    }
    walk(result)
    expect(names).toEqual(['可见目录', '可见页面'])
    expect(result[0].children[0].meta).toEqual({
      title: '可见页面',
      firstLevelMenu: '可见目录',
      tracker: true
    })
  })

  it('formatMenus 同时剔除按钮节点', () => {
    const tree = [{
      id: 31,
      name: '目录',
      meantype: 'menu',
      menuCode: '',
      url: '',
      children: [
        { id: 32, name: '按钮', meantype: 'button', menuCode: '', url: '', children: [] }
      ]
    }]
    expect(formatMenus(tree)[0].children).toEqual([])
  })
})
