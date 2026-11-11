import fetch from '@/utils/fetch'
import { getToken } from '@/utils/auth'

/**
 * 登录人员当前拥有的目录、页面菜单及按钮权限
 *
 * POST /system/menu/current-menu
 * 请求：Content-Type: application/x-www-form-urlencoded，body 为空，无必填参数；
 *      文档中的 groupId / identifier / name / userId / vendor 等均为非必填 query；
 *      身份由 authorization: Bearer <token> 携带（同时保留 X-Token），后端据此返回该用户可见菜单
 * 响应：{ code: 200, msg: 'success', data: [树形菜单] }
 *
 * 不复用 @/utils/request：它的响应拦截器强制 code === 20000 且会弹全局错误，
 * 本接口成功码是 200，取数失败也不该污染业务请求。
 */
export const CURRENT_MENU_URL = '/system/menu/current-menu'

const SUCCESS_CODES = [200, '200']

export function isMenuSuccess(res) {
  return !!res && (res.success === true || SUCCESS_CODES.indexOf(res.code) > -1)
}

// 兼容后端把菜单树直接放在 data、或包在 menus / list / tree 等字段里
export function unwrapMenuData(res) {
  if (Array.isArray(res)) return res
  if (!isMenuSuccess(res)) {
    throw new Error((res && (res.msg || res.message)) || '菜单权限接口返回失败')
  }
  const data = res.data
  if (Array.isArray(data)) return data
  if (!data) return []
  const keys = ['menus', 'menuList', 'menuTree', 'tree', 'list', 'rows', 'records', 'children']
  for (let i = 0; i < keys.length; i += 1) {
    if (Array.isArray(data[keys[i]])) return data[keys[i]]
  }
  return []
}

// 递归剔除按钮节点（含旧字段 menutype），只保留目录 / 页面菜单；不修改原始响应对象
export function filterMenuButtons(tree) {
  const walk = list => {
    const nodes = Array.isArray(list) ? list : []
    return nodes.reduce((result, node) => {
      if (!node) return result
      const type = node.meantype || node.menutype
      if (type === 'button') return result
      const next = Object.assign({}, node)
      if (Array.isArray(node.children)) next.children = walk(node.children)
      result.push(next)
      return result
    }, [])
  }
  return walk(tree)
}

// 递归剔除左侧栏不显示的菜单：sidebarShow 0 显示 / 1 不显示（兼容字符串 '1'）
// 隐藏节点连同其子树一起剔除，避免留下没有父级的孤儿菜单；不修改原始响应对象
export function filterHiddenMenus(tree) {
  const walk = list => {
    const nodes = Array.isArray(list) ? list : []
    return nodes.reduce((result, node) => {
      if (!node) return result
      if (Number(node.sidebarShow) === 1) return result
      const next = Object.assign({}, node)
      if (Array.isArray(node.children)) next.children = walk(node.children)
      result.push(next)
      return result
    }, [])
  }
  return walk(tree)
}

// 给可访问的页面菜单补 Vue Router meta
// 条件：meantype === 'menu' 且 menuCode、url 都不为空；目录等节点不写 meta
// 入口先过滤 sidebarShow=1：即使迁移时只带这个格式化函数，隐藏菜单也不会漏进结果
export function withMenuMeta(tree) {
  const visible = filterHiddenMenus(tree)
  const walk = (list, firstLevelMenu) => {
    const nodes = Array.isArray(list) ? list : []
    return nodes.map(node => {
      if (!node) return node
      const name = String(node.name || '')
      const rootName = firstLevelMenu === undefined ? name : firstLevelMenu
      const next = Object.assign({}, node)
      if (Array.isArray(node.children)) next.children = walk(node.children, rootName)
      const hasPage = String(node.menuCode || '').trim() !== '' && String(node.url || '').trim() !== ''
      const isMenu = (node.meantype || node.menutype) === 'menu'
      if (isMenu && hasPage) {
        next.meta = Object.assign({}, node.meta, {
          title: name,
          firstLevelMenu: rootName,
          tracker: true
        })
      }
      return next
    })
  }
  return walk(visible, undefined)
}

/**
 * 菜单格式化唯一入口：过滤按钮节点 → 过滤 sidebarShow=1（在 withMenuMeta 内）→ 补 meta。
 * 迁移时必须整体带走 formatMenus / filterMenuButtons / filterHiddenMenus / withMenuMeta，
 * 并让侧栏与路由只消费格式化后的输出（store.currentMenus），不要再直接渲染接口原始树。
 */
export function formatMenus(tree) {
  return withMenuMeta(filterMenuButtons(tree))
}

/**
 * 当前登录人员菜单：格式化后直接返回目录 / 页面菜单树
 * @param {Object} params 文档里的非必填 query（groupId / userId / name 等），默认不传
 */
export function getCurrentMenu(params = {}) {
  const token = getToken()
  const headers = { 'Content-Type': 'application/x-www-form-urlencoded' }
  if (token) headers.authorization = `Bearer ${token}`
  return fetch.post(CURRENT_MENU_URL, '', params, { headers })
    .then(res => formatMenus(unwrapMenuData(res)))
}

export default getCurrentMenu
