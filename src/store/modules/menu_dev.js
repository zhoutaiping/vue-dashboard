import router from '@/router'
import Layout from '@/view/frame/Main'
import { getCurrentMenu } from '@/api/menu'

const _import = require('@/router/_import_' + process.env.NODE_ENV)
const NotFound = _import('frame/Login')

function normalizeViewPath(url) {
  const raw = String(url || '').trim().replace(/\\/g, '/')
  if (!raw || /^(https?:)?\/\//.test(raw)) return ''
  return raw
    .replace(/^@\/views?\//, '')
    .replace(/^\/+/, '')
    .replace(/^(?:src\/)?views?\//, '')
    .replace(/\.vue$/, '')
    .replace(/\/{2,}/g, '/')
}

function resolveViewComponent(url) {
  const path = normalizeViewPath(url)
  if (!path || path.split('/').some(segment => segment === '..')) return NotFound
  // 单个菜单的 url 指向不存在的组件时不能中断整棵动态路由：降级到 NotFound，
  // 其余菜单照常注册（webpack require.context 找不到模块会抛 Cannot find module）
  // 兼容后端把目录型组件写成 assets/xxx，实际文件是 assets/xxx/index.vue
  const candidates = [path, path.replace(/\/+$/, '') + '/index']
  for (let i = 0; i < candidates.length; i += 1) {
    try {
      const component = _import(candidates[i])
      if (component) return component
    } catch (error) {
      // 继续尝试下一个候选路径
    }
  }
  console.warn(`[menu] 组件不存在，已降级到默认页: ${path}`)
  return NotFound
}

function normalizeRoutePath(menuCode) {
  const code = String(menuCode || '').trim().replace(/\\/g, '/')
  if (!code || /^(https?:)?\/\//.test(code)) return ''
  return code.charAt(0) === '/' ? code : `/${code}`
}

function routeName(node, fullPath) {
  const source = node.code || node.id || fullPath
  return `Menu_${String(source).replace(/[^A-Za-z0-9]+/g, '_')}`
}

// 页面菜单补 meta.cache：cacheFlag 0 为 true，其余（含 1 / 缺失）为 false
// 与 api/menu.js 的 withMenuMeta 保持一致；不修改接口返回的原始树
function withCacheMeta(list) {
  return (Array.isArray(list) ? list : []).map(node => {
    if (!node) return node
    const next = Object.assign({}, node)
    if (Array.isArray(node.children)) next.children = withCacheMeta(node.children)
    const type = node.meantype || node.menutype
    if (type === 'menu' && String(node.menuCode || '').trim() && String(node.url || '').trim()) {
      next.meta = Object.assign({}, node.meta, {
        cache: Number(node.cacheFlag) === 0
      })
    }
    return next
  })
}

function routeMeta(node) {
  const meta = Object.assign({}, node.meta || {})
  // cacheFlag: 0=缓存，其余值不缓存；meta.cache 为正向标记，true 表示需要缓存
  const flag = node.cacheFlag
  const cacheEnabled = typeof meta.cache === 'boolean'
    ? meta.cache
    : (flag !== null && flag !== undefined && flag !== '' && Number(flag) === 0)
  return Object.assign(meta, {
    title: node.name || meta.title || '',
    icon: node.icon || meta.icon || '',
    firstLevelMenu: meta.firstLevelMenu || node.name || '',
    cache: cacheEnabled
  })
}

function parentPathOf(fullPath) {
  const index = fullPath.lastIndexOf('/')
  if (index <= 0) return ''
  return fullPath.slice(0, index)
}

function relativePathOf(fullPath, parentPath) {
  if (!parentPath) return fullPath
  if (fullPath === parentPath) return ''
  return fullPath.slice(parentPath.length + 1)
}

function groupName(fullPath) {
  return `Menu_Group_${fullPath.replace(/[^A-Za-z0-9]+/g, '_')}`
}

function buildMenuRoutes(menus) {
  const records = []
  const walk = list => {
    const nodes = Array.isArray(list) ? list : []
    nodes.forEach(node => {
      if (!node) return
      const fullPath = normalizeRoutePath(node.menuCode)
      if (fullPath) {
        records.push({
          node,
          fullPath,
          url: String(node.url || '').trim(),
          parentPath: parentPathOf(fullPath)
        })
      }
      walk(node.children)
    })
  }
  walk(menus)

  const registry = {}
  const topRoutes = []

  const ensureGroup = fullPath => {
    if (!fullPath) return null
    const existing = registry[fullPath]
    if (existing) {
      if (!existing.isGroup) {
        const old = existing.route
        const parentEntry = ensureGroup(parentPathOf(fullPath))
        // group 若挂在父级 children 下必须用相对路径，否则 vue-router 报
        // "Non-nested routes must include a leading slash character"
        const group = {
          path: relativePathOf(fullPath, parentEntry ? parentEntry.fullPath : ''),
          component: Layout,
          name: old.name,
          meta: old.meta,
          children: [{
            path: '',
            component: existing.view,
            name: `${old.name}_Page`,
            meta: old.meta
          }]
        }
        const siblings = parentEntry ? parentEntry.route.children : topRoutes
        const index = siblings.indexOf(old)
        if (index > -1) siblings[index] = group
        else siblings.push(group)
        existing.route = group
        existing.isGroup = true
      }
      return existing
    }
    const route = {
      path: fullPath,
      component: Layout,
      name: groupName(fullPath),
      meta: { title: fullPath.split('/').filter(Boolean).pop() || '' },
      children: []
    }
    const entry = { fullPath, route, isGroup: true }
    registry[fullPath] = entry
    const parentEntry = ensureGroup(parentPathOf(fullPath))
    if (parentEntry) parentEntry.route.children.push(route)
    else topRoutes.push(route)
    route.path = relativePathOf(fullPath, parentEntry ? parentEntry.fullPath : '')
    return entry
  }

  records.sort((a, b) => a.fullPath.split('/').length - b.fullPath.split('/').length)
  records.forEach(record => {
    const parentEntry = ensureGroup(record.parentPath)
    const parentRoute = parentEntry ? parentEntry.route : null
    const path = relativePathOf(record.fullPath, parentEntry ? parentEntry.fullPath : '')
    if (!record.url) {
      let entry = registry[record.fullPath]
      if (!entry) {
        const route = {
          path,
          component: Layout,
          name: routeName(record.node, record.fullPath),
          meta: routeMeta(record.node),
          children: []
        }
        entry = { fullPath: record.fullPath, route, isGroup: true }
        registry[record.fullPath] = entry
        if (parentRoute) parentRoute.children.push(route)
        else topRoutes.push(route)
      } else {
        entry.route.meta = Object.assign(entry.route.meta || {}, routeMeta(record.node))
      }
      return
    }
    const name = routeName(record.node, record.fullPath)
    const meta = routeMeta(record.node)
    const view = resolveViewComponent(record.url)
    if (parentRoute) {
      parentRoute.children.push({ path, component: view, name, meta })
    } else {
      const route = {
        path: record.fullPath,
        component: Layout,
        name,
        meta,
        children: [{ path: '', component: view, name: `${name}_Page`, meta }]
      }
      topRoutes.push(route)
      registry[record.fullPath] = { fullPath: record.fullPath, route, view, isGroup: false }
    }
  })

  return topRoutes
}

function addMenuRoutes(routes) {
  routes.forEach(route => {
    const target = route.path.charAt(0) === '/' ? route : Object.assign({}, route, { path: `/${route.path}` })
    if (typeof router.addRoute === 'function') router.addRoute(target)
    else router.addRoutes([target])
  })
}

const state = {
  menus: [],
  loaded: false,
  routesAdded: false
}

const mutations = {
  SET_MENUS: (state, menus) => {
    state.menus = Array.isArray(menus) ? menus : []
  },
  SET_LOADED: (state, loaded) => {
    state.loaded = !!loaded
  },
  SET_ROUTES_ADDED: (state, added) => {
    state.routesAdded = !!added
  },
  RESET_MENU: state => {
    state.menus = []
    state.loaded = false
    state.routesAdded = false
  }
}

const actions = {
  async fetchCurrentMenu({ commit, state: menuState }, options) {
    const opt = options || {}
    if (menuState.loaded && !opt.force) return menuState.menus
    const menus = withCacheMeta(await getCurrentMenu())
    commit('SET_MENUS', menus)
    commit('SET_LOADED', true)
    if (!menuState.routesAdded) {
      const routes = buildMenuRoutes(menus)
      if (routes.length) addMenuRoutes(routes)
      commit('SET_ROUTES_ADDED', true)
    }
    return menuState.menus
  },

  refreshCurrentMenu({ dispatch }) {
    return dispatch('fetchCurrentMenu', { force: true })
  },

  resetCurrentMenu({ commit }) {
    commit('RESET_MENU')
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
