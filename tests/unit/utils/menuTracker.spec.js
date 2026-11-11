import { resolveTrackerMenuFields, flattenMenuPages } from '@/utils/menu-tracker'

// 与 withMenuMeta 处理后的接口菜单树一致：目录无 meta，页面菜单带 meta
const menus = [
  {
    id: 1,
    name: '工作台',
    meantype: 'menu',
    menuCode: '',
    url: '',
    children: [
      {
        id: 2,
        name: 'Dashboard',
        meantype: 'menu',
        menuCode: '/dashboard',
        url: '@/view/dashboard/index.vue',
        meta: { title: 'Dashboard', firstLevelMenu: '工作台', tracker: true },
        children: []
      },
      {
        id: 3,
        name: '首页总览',
        meantype: 'menu',
        menuCode: '/system/homeOverview',
        url: '@/view/homePage/overview/index.vue',
        meta: { title: '首页总览', firstLevelMenu: '工作台', tracker: true },
        children: []
      }
    ]
  },
  {
    id: 4,
    name: '系统管理',
    meantype: 'menu',
    menuCode: '',
    url: '',
    children: [
      {
        id: 5,
        name: '菜单管理',
        meantype: 'menu',
        menuCode: '/system/menuManage',
        url: '@/view/menuManage/index.vue',
        meta: { title: '菜单管理', firstLevelMenu: '系统管理', tracker: true },
        children: []
      }
    ]
  }
]

describe('flattenMenuPages', () => {
  it('只收集带 meta 的页面菜单，目录不参与匹配', () => {
    const pages = flattenMenuPages(menus)
    expect(pages.length).toBe(3)
    expect(pages.map(page => page.secondLevelMenu)).toEqual(['Dashboard', '首页总览', '菜单管理'])
    expect(flattenMenuPages(null)).toEqual([])
  })
})

describe('resolveTrackerMenuFields', () => {
  it('按 menuCode 精确匹配，返回接口菜单的 title 与一级目录名', () => {
    expect(resolveTrackerMenuFields(menus, {
      path: '/dashboard',
      name: 'Dashboard',
      meta: { title: 'Dashboard', tracker: true }
    })).toEqual({ firstLevelMenu: '工作台', secondLevelMenu: 'Dashboard' })
  })

  it('路由 meta.menuCode 优先级最高', () => {
    expect(resolveTrackerMenuFields(menus, {
      path: '/some/other/page',
      meta: { menuCode: '/system/menuManage' }
    })).toEqual({ firstLevelMenu: '系统管理', secondLevelMenu: '菜单管理' })
  })

  it('按菜单名称 / 路由标题匹配', () => {
    expect(resolveTrackerMenuFields(menus, {
      path: '/homeOverview',
      meta: { title: '首页总览' }
    })).toEqual({ firstLevelMenu: '工作台', secondLevelMenu: '首页总览' })
  })

  it('menuCode 带多级目录时按路径末段匹配', () => {
    expect(resolveTrackerMenuFields(menus, {
      path: '/menuManage',
      name: 'MenuManage',
      meta: {}
    })).toEqual({ firstLevelMenu: '系统管理', secondLevelMenu: '菜单管理' })
  })

  it('忽略前导斜杠、大小写与 query 参数', () => {
    expect(resolveTrackerMenuFields(menus, {
      path: '/DASHBOARD?from=menu',
      meta: {}
    })).toEqual({ firstLevelMenu: '工作台', secondLevelMenu: 'Dashboard' })
  })

  it('目录名称、无关路由、空数据都不会误命中', () => {
    expect(resolveTrackerMenuFields(menus, { path: '/workbench', meta: { title: '工作台' } })).toBe(null)
    expect(resolveTrackerMenuFields(menus, { path: '/unknown', meta: {} })).toBe(null)
    expect(resolveTrackerMenuFields([], { path: '/dashboard', meta: {} })).toBe(null)
    expect(resolveTrackerMenuFields(menus, null)).toBe(null)
  })
})
