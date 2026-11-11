import {
  DEFAULT_PAGE_CANDIDATES,
  resolveDefaultMenu,
  resolveDefaultActive,
  toMenuIndex
} from '@/utils/menu-default'

// 按接口返回结构模拟：一级「首页」，「我的办公」下挂「数据概览」「待办消息」
const buildMenus = () => [
  {
    id: 236,
    code: 'RAA4',
    name: '首页',
    meantype: 'menu',
    menuCode: '/system/menuManage',
    url: '@/view/homePage/overview/index.vue',
    sidebarShow: 0,
    deleteFlag: 0,
    meta: { title: '首页', firstLevelMenu: '首页', tracker: true },
    children: []
  },
  {
    id: 1,
    code: 'RAA',
    name: '我的办公',
    meantype: 'menu',
    menuCode: '/home',
    url: '',
    sidebarShow: 0,
    deleteFlag: 0,
    children: [
      {
        id: 2,
        code: 'RAA1',
        name: '数据概览',
        meantype: 'menu',
        menuCode: '/dataOverview',
        url: '@/view/homePage/data/index.vue',
        sidebarShow: 0,
        deleteFlag: 0,
        children: []
      },
      {
        id: 5,
        code: 'RAA2',
        name: '待办消息',
        meantype: 'menu',
        menuCode: '/todo',
        url: '@/view/homePage/todo/index.vue',
        sidebarShow: 0,
        deleteFlag: 0,
        children: []
      }
    ]
  }
]

describe('resolveDefaultMenu', () => {
  it('有首页时默认进入首页，返回可直接用的 defaultActive 与 path', () => {
    const menu = resolveDefaultMenu(buildMenus())
    expect(menu.defaultActive).toBe('236')
    expect(menu.code).toBe('RAA4')
    expect(menu.name).toBe('首页')
    expect(menu.path).toBe('/system/menuManage')
  })

  it('没有首页时降级到数据概览', () => {
    const menus = buildMenus().slice(1)
    expect(resolveDefaultMenu(menus).defaultActive).toBe('2')
    expect(resolveDefaultMenu(menus).name).toBe('数据概览')
  })

  it('没有首页和数据概览时降级到待办，菜单名「待办消息」也能命中', () => {
    const menus = [{ id: 1, code: 'RAA', name: '我的办公', children: [buildMenus()[1].children[1]] }]
    const menu = resolveDefaultMenu(menus)
    expect(menu.defaultActive).toBe('5')
    expect(menu.code).toBe('RAA2')
  })

  it('传入 homePageStatus 才启用旧门槛：<= 0 时跳过数据概览直接到待办', () => {
    const menus = buildMenus().slice(1)
    expect(resolveDefaultMenu(menus, { homePageStatus: 0 }).defaultActive).toBe('5')
    expect(resolveDefaultMenu(menus, { homePageStatus: 1 }).defaultActive).toBe('2')
    expect(resolveDefaultMenu(menus, { homePageStatus: '2' }).defaultActive).toBe('2')
  })

  it('按候选优先级命中，而不是按菜单树顺序', () => {
    const candidates = [
      { key: 'todo', codes: ['RAA2'], names: ['待办'] },
      { key: 'home', codes: ['RAA4'], names: ['首页'] }
    ]
    expect(resolveDefaultMenu(buildMenus(), { candidates }).defaultActive).toBe('5')
  })

  it('隐藏、已删除、按钮节点都不参与，字符串 1 同样过滤', () => {
    const menus = buildMenus()
    menus[0].sidebarShow = 1
    menus[1].children[0].sidebarShow = '1'
    const menusWithoutHidden = resolveDefaultMenu(menus)
    expect(menusWithoutHidden.defaultActive).toBe('5')

    const deleted = buildMenus()
    deleted[0].deleteFlag = '1'
    deleted[1].children[0].deleteFlag = 1
    deleted[1].children[1].deleteFlag = 1
    expect(resolveDefaultMenu(deleted)).toBe(null)

    const button = buildMenus()
    button[0].meantype = 'button'
    button[1].children[0].meantype = 'button'
    button[1].children[1].meantype = 'button'
    expect(resolveDefaultMenu(button)).toBe(null)

    // 无 meantype 时兼容旧字段 menutype
    const legacy = [{ id: 9, code: 'RAA4', name: '首页', menutype: 'button' }]
    expect(resolveDefaultMenu(legacy)).toBe(null)
  })

  it('兼容接口原始响应对象与未格式化的菜单树', () => {
    expect(resolveDefaultMenu({ code: 200, data: buildMenus() }).defaultActive).toBe('236')
    expect(resolveDefaultMenu({ code: 200, data: { menus: buildMenus() } }).defaultActive).toBe('236')
    const raw = buildMenus()
    raw.forEach(node => delete node.meta)
    expect(resolveDefaultMenu(raw).defaultActive).toBe('236')
  })

  it('空数据安全，且不修改原始菜单树', () => {
    expect(resolveDefaultMenu([])).toBe(null)
    expect(resolveDefaultMenu(null)).toBe(null)
    expect(resolveDefaultMenu(undefined)).toBe(null)
    expect(resolveDefaultActive([])).toBe('')
    const menus = buildMenus()
    const snapshot = JSON.stringify(menus)
    resolveDefaultMenu(menus)
    expect(JSON.stringify(menus)).toBe(snapshot)
  })
})

describe('DEFAULT_PAGE_CANDIDATES', () => {
  it('三级优先级为 首页 / 数据概览 / 待办', () => {
    expect(DEFAULT_PAGE_CANDIDATES.map(item => item.key)).toEqual(['home', 'overview', 'todo'])
  })
})

describe('toMenuIndex', () => {
  it('把接口返回的 Number id 转成字符串，消除 index 的 prop 报错', () => {
    expect(toMenuIndex(249)).toBe('249')
    expect(toMenuIndex('236')).toBe('236')
    expect(toMenuIndex(0)).toBe('0')
  })

  it('支持直接传菜单节点，id 缺失时回退到 code', () => {
    expect(toMenuIndex(buildMenus()[0])).toBe('236')
    expect(toMenuIndex({ code: 'RAA4', name: '首页' })).toBe('RAA4')
  })

  it('id 为空时用 fallback 保证非空且唯一，否则给安全的默认值', () => {
    expect(toMenuIndex(undefined, 'sub-' + 3)).toBe('sub-3')
    expect(toMenuIndex(null, 'item-' + 1 + '-' + 2)).toBe('item-1-2')
    expect(toMenuIndex('')).toBe('menu')
  })

  it('与 defaultActive 同源，default-active 能匹配上 el-menu-item 的 index', () => {
    const menus = buildMenus()
    const active = resolveDefaultActive(menus)
    expect(active).toBe('236')
    expect(toMenuIndex(menus[0].id)).toBe(active)
    expect(resolveDefaultActive(menus.slice(1))).toBe(toMenuIndex(menus[1].children[0].id))
  })
})
