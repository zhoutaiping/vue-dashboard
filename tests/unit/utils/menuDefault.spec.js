import {
  DEFAULT_PAGE_CANDIDATES,
  resolveDefaultMenu,
  resolveDefaultActive,
  resolveDefaultPage,
  findMenuIdByCode,
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
    const nested = { menus: buildMenus() }
    expect(resolveDefaultMenu({ code: 200, data: nested }).defaultActive).toBe('236')
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

describe('resolveDefaultPage', () => {
  it('规则1：有 RAA4 权限或超级管理员 → 首页，并返回可用于 redirect 的 path', () => {
    const res = { code: 200, msg: 'success', data: buildMenus() }
    const page = resolveDefaultPage(res, { permissions: ['RAA4'], homePageStatus: 0 })
    expect(page.code).toBe('RAA4')
    expect(page.defaultActive).toBe('236')
    expect(page.path).toBe('/system/menuManage')
    expect(resolveDefaultPage(buildMenus(), { isSuperAdmin: true, homePageStatus: 2 }).code).toBe('RAA4')
  })

  it('规则2：无 RAA4 但 HomePageStatus > 0 且有 RAA1 → 数据概览', () => {
    const page = resolveDefaultPage(buildMenus(), { permissions: ['RAA1'], homePageStatus: 1 })
    expect(page.code).toBe('RAA1')
    expect(page.defaultActive).toBe('2')
    expect(resolveDefaultPage(buildMenus(), { permissions: code => code === 'RAA1', homePageStatus: '2' }).code).toBe('RAA1')
  })

  it('规则3：HomePageStatus <= 0 或缺 RAA1 → 待办消息', () => {
    expect(resolveDefaultPage(buildMenus(), { permissions: ['RAA1'], homePageStatus: 0 }).code).toBe('RAA2')
    expect(resolveDefaultPage(buildMenus(), { permissions: 'RAA,RAA1', homePageStatus: 0 }).code).toBe('RAA2')
    expect(resolveDefaultPage(buildMenus(), { permissions: [], homePageStatus: 1 }).code).toBe('RAA2')
  })

  it('未传 permissions 时按可见菜单判定权限', () => {
    expect(resolveDefaultPage(buildMenus(), { homePageStatus: 0 }).code).toBe('RAA4')
    const noHome = buildMenus().slice(1)
    expect(resolveDefaultPage(noHome, { homePageStatus: 1 }).code).toBe('RAA1')
  })

  it('目标菜单缺失时按候选降级；空数据返回 null', () => {
    const onlyTodo = [{ id: 5, code: 'RAA2', name: '待办消息', meantype: 'menu', menuCode: '/home/todo', sidebarShow: 0, deleteFlag: 0 }]
    expect(resolveDefaultPage(onlyTodo, { isSuperAdmin: true, homePageStatus: 0 }).code).toBe('RAA2')
    expect(resolveDefaultPage([], { isSuperAdmin: true })).toBe(null)
  })
})

describe('findMenuIdByCode', () => {
  it('按 code 从接口响应和嵌套 children 里查到 id', () => {
    const res = { code: 200, msg: 'success', data: buildMenus() }
    expect(findMenuIdByCode(res, 'RAA4')).toBe(236)
    expect(findMenuIdByCode(res, 'RAA1')).toBe(2)
    expect(findMenuIdByCode(res, 'RAA2')).toBe(5)
    const wrappedMenus = { menus: buildMenus() }
    expect(findMenuIdByCode({ data: wrappedMenus }, 'RAA4')).toBe(236)
    expect(findMenuIdByCode(buildMenus(), 'RAA1')).toBe(2)
  })

  it('忽略大小写与首尾空格；找不到返回 null', () => {
    expect(findMenuIdByCode(buildMenus(), ' raa1 ')).toBe(2)
    expect(findMenuIdByCode(buildMenus(), 'RAA9')).toBe(null)
    expect(findMenuIdByCode(buildMenus(), '')).toBe(null)
    expect(findMenuIdByCode([], 'RAA4')).toBe(null)
    expect(findMenuIdByCode(null, 'RAA4')).toBe(null)
  })

  it('隐藏 / 已删除 / 按钮节点不参与，与 resolveDefaultMenu 同口径', () => {
    const hidden = buildMenus()
    hidden[0].sidebarShow = 1
    expect(findMenuIdByCode(hidden, 'RAA4')).toBe(null)
    const deleted = buildMenus()
    deleted[1].children[0].deleteFlag = 1
    expect(findMenuIdByCode(deleted, 'RAA1')).toBe(null)
    const button = buildMenus()
    button[0].meantype = 'button'
    expect(findMenuIdByCode(button, 'RAA4')).toBe(null)
  })

  it('返回原始 id，可用 toMenuIndex 转成侧栏 default-active 字符串', () => {
    const id = findMenuIdByCode(buildMenus(), 'RAA4')
    expect(toMenuIndex(id)).toBe('236')
    expect(id === null ? '' : toMenuIndex(id)).toBe('236')
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
