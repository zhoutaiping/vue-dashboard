/**
 * 从登录用户菜单里解析「默认进入的页面」。
 * 优先级：首页 > 数据概览 > 待办；返回值的 defaultActive 可直接给侧栏，path 可用于登录后 redirect。
 *
 * 零外部依赖，可整段拷贝。menus 传 store.getters.currentMenus（格式化后）或接口原始树 / 响应对象均可。
 */

// codes 按 code / menuCode 精确匹配，names 按菜单名包含匹配（「待办」可命中「待办消息」）
export const DEFAULT_PAGE_CANDIDATES = [
  { key: 'home', codes: ['RAA4'], names: ['首页'] },
  { key: 'overview', codes: ['RAA1'], names: ['数据概览', '数据总览', '概览'], needHomePageStatus: true },
  { key: 'todo', codes: ['RAA2'], names: ['待办'] }
]

function str(value) {
  return String(value === undefined || value === null ? '' : value).trim()
}

function normalize(value) {
  return str(value).toLowerCase()
}

// 兼容直接传接口响应 { code, data: [...] } 或 data 里再包一层 menus / list
function toTree(menus) {
  if (Array.isArray(menus)) return menus
  const data = menus && menus.data
  if (Array.isArray(data)) return data
  const inner = data && (data.menus || data.menuList || data.menuTree || data.tree || data.list || data.children)
  return Array.isArray(inner) ? inner : []
}

// 隐藏、已删除、按钮节点不参与，与菜单格式化链路保持一致，迁移时不会漏过滤
function isAvailable(node) {
  return !!node &&
    Number(node.sidebarShow) !== 1 &&
    Number(node.deleteFlag) !== 1 &&
    (node.meantype || node.menutype) !== 'button'
}

function flattenMenus(tree) {
  const result = []
  const walk = list => {
    (Array.isArray(list) ? list : []).forEach(node => {
      if (!isAvailable(node)) return
      result.push(node)
      walk(node.children)
    })
  }
  walk(tree)
  return result
}

function tokensOf(node) {
  const meta = node.meta || {}
  return [
    normalize(node.code),
    normalize(node.menuCode),
    normalize(node.path),
    normalize(node.name),
    normalize(meta.title),
    normalize(meta.menuCode)
  ].filter(Boolean)
}

function matchNode(node, candidate) {
  const tokens = tokensOf(node)
  const codes = (candidate.codes || []).map(normalize).filter(Boolean)
  const names = (candidate.names || []).map(normalize).filter(Boolean)
  return codes.some(code => tokens.indexOf(code) > -1) ||
    names.some(name => tokens.some(token => token.indexOf(name) > -1))
}

/**
 * Element UI 2.x：el-submenu 的 index 是 type: String；el-menu-item 的 index 带
 * custom validator（必须是非空字符串）。接口菜单 id 常是 Number（249），直接绑
 * :index="item.id" 会分别报 type check failed / custom validator check failed。
 * el-menu 的 default-active 也只按字符串匹配，index 与 defaultActive 必须同源。
 *
 * @param {Number|String|Object} value 菜单 id 或菜单节点（自动取 id，缺失取 code）
 * @param {String} fallback id 缺失时的兜底值，模板里建议带下标保证唯一，如 'sub-' + i
 * @returns {String} 非空字符串
 */
export function toMenuIndex(value, fallback) {
  const node = value && typeof value === 'object' ? value : null
  const raw = node ? (node.id === undefined || node.id === null ? node.code : node.id) : value
  const index = str(raw)
  if (index) return index
  return str(fallback) || 'menu'
}

// menuCode 一般是路由 path；url 是组件路径（@/view/...），只作为信息保留
function toDefaultMenu(node) {
  const meta = node.meta || {}
  const route = [node.menuCode, node.path, meta.menuCode, meta.path]
    .map(str)
    .filter(value => value.charAt(0) === '/')[0] || ''
  const id = node.id === undefined || node.id === null ? '' : node.id
  return {
    id,
    code: node.code || '',
    name: (meta && meta.title) || node.name || '',
    menuCode: node.menuCode || '',
    url: node.url || '',
    path: route,
    defaultActive: id === '' ? '' : toMenuIndex(id),
    meta: Object.assign({}, meta)
  }
}

/**
 * @param {Array|Object} menus store.getters.currentMenus
 * @param {Object} options
 *   candidates      自定义优先级，默认 DEFAULT_PAGE_CANDIDATES
 *   homePageStatus  传入后才启用旧逻辑的「HomePageStatus > 0 才可进数据概览」门槛；不传则按纯优先级
 * @returns {Object|null} { id, code, name, menuCode, url, path, defaultActive, meta }，没有可见菜单返回 null
 */
export function resolveDefaultMenu(menus, options) {
  const opts = options || {}
  const candidates = Array.isArray(opts.candidates) ? opts.candidates : DEFAULT_PAGE_CANDIDATES
  const nodes = flattenMenus(toTree(menus))
  const statusProvided = opts.homePageStatus !== undefined
  const statusOk = Number(opts.homePageStatus) > 0

  for (let i = 0; i < candidates.length; i += 1) {
    const candidate = candidates[i]
    if (candidate.needHomePageStatus && statusProvided && !statusOk) continue
    const hit = nodes.find(node => matchNode(node, candidate))
    if (hit) return toDefaultMenu(hit)
  }
  return null
}

/** 只要侧栏默认高亮：可直接替换旧的 hasPermission 三元表达式；与 toMenuIndex 同源，保证能匹配上 index */
export function resolveDefaultActive(menus, options) {
  const menu = resolveDefaultMenu(menus, options)
  return menu ? menu.defaultActive : ''
}

export default resolveDefaultMenu
