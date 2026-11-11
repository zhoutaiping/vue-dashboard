/**
 * 从「登录时获取并格式化后的菜单数据」里解析路由埋点需要的菜单字段。
 * 菜单树来自 store.getters.currentMenus（已过滤按钮，页面菜单带 meta）。
 * 命中返回 { firstLevelMenu, secondLevelMenu }，未命中返回 null，由调用方兜底。
 */

function normalizeKey(value) {
  return String(value === undefined || value === null ? '' : value)
    .trim()
    .replace(/[?#].*$/, '')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '')
    .toLowerCase()
}

function lastSegment(value) {
  const parts = normalizeKey(value).split('/')
  return parts[parts.length - 1] || ''
}

// 只收集带 meta 的页面菜单，目录与按钮不参与匹配
export function flattenMenuPages(menus) {
  const pages = []
  const walk = list => {
    const nodes = Array.isArray(list) ? list : []
    nodes.forEach(node => {
      if (!node) return
      if (node.meta) {
        pages.push({
          code: normalizeKey(node.menuCode),
          codeSegment: lastSegment(node.menuCode),
          title: normalizeKey(node.meta.title || node.name),
          name: normalizeKey(node.name),
          firstLevelMenu: String(node.meta.firstLevelMenu || ''),
          secondLevelMenu: String(node.meta.title || node.name || '')
        })
      }
      walk(node.children)
    })
  }
  walk(menus)
  return pages
}

function routeKeys(route) {
  const meta = (route && route.meta) || {}
  const keys = [
    normalizeKey(meta.menuCode),
    normalizeKey(route && route.path),
    normalizeKey(route && route.fullPath),
    normalizeKey(route && route.name),
    normalizeKey(meta.title)
  ]
  return keys.filter((key, index) => key && keys.indexOf(key) === index)
}

function fieldsOf(page) {
  return {
    firstLevelMenu: page.firstLevelMenu,
    secondLevelMenu: page.secondLevelMenu
  }
}

export function resolveTrackerMenuFields(menus, route) {
  const pages = flattenMenuPages(menus)
  if (!pages.length || !route) return null
  const keys = routeKeys(route)
  if (!keys.length) return null

  // 1. menuCode 精确匹配：优先用路由 meta.menuCode，其次是 path / fullPath
  for (let i = 0; i < keys.length; i += 1) {
    const hit = pages.find(page => page.code && page.code === keys[i])
    if (hit) return fieldsOf(hit)
  }

  // 2. 菜单名称与路由标题 / name 精确匹配
  for (let i = 0; i < keys.length; i += 1) {
    const hit = pages.find(page => page.title === keys[i] || page.name === keys[i])
    if (hit) return fieldsOf(hit)
  }

  // 3. 兼容接口 menuCode 带多级目录（/system/menuManage）而前端路由只有末段（/menuManage）
  for (let i = 0; i < keys.length; i += 1) {
    const segment = lastSegment(keys[i])
    if (!segment) continue
    const hit = pages.find(page => page.codeSegment && page.codeSegment === segment)
    if (hit) return fieldsOf(hit)
  }

  return null
}

export default resolveTrackerMenuFields
