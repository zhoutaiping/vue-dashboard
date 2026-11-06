import { qryMenuList, updateMenu } from './menuManage'

/**
 * 一次性数据修复：目录 / 页面菜单中 url 有值的节点
 *
 *   menuCode = 原来的 url（如 /home/homePage）
 *   url      = @/view + 原来的 url（如 @/view/home/homePage）
 *
 * 复用现有 GET /system/menu/tree 与 POST /system/menu/update?id= 两个接口，
 * 串行逐个提交，任一节点失败不影响其余节点。
 *
 * @param {Object}  options
 * @param {Boolean} options.dryRun      只统计不提交，默认 false
 * @param {Boolean} options.trimSlash   menuCode 是否去掉开头的 /，默认 false（保留 url 原值）
 * @returns {Object} { total, matched, updated, skipped, failures, details }
 */
const URL_PREFIX = '@/view'

function isOk(res) {
  if (!res) return false
  const code = res.code
  // 兼容后端把码值序列化成字符串 / 用 success 标记
  return code === 200 || code === 0 || code === '200' || code === '0' || res.success === true
}

// 迁移后后端包装层级可能不同：data 直接是数组，或包在 tree / list / rows / records 里
function toTree(res) {
  const data = res && res.data
  if (Array.isArray(data)) return data
  const candidates = [
    data && data.tree,
    data && data.list,
    data && data.rows,
    data && data.records,
    res && res.rows,
    res && res.list,
    res && res.tree
  ]
  for (let i = 0; i < candidates.length; i += 1) {
    if (Array.isArray(candidates[i])) return candidates[i]
  }
  return []
}

function flagOf(value) {
  if (value === 0 || value === 1 || value === '0' || value === '1') return Number(value)
  return 0
}

// update 是全量 DTO 提交：其余字段必须原样带回，否则会被清空
function toSaveDTO(node, patch) {
  const payload = {
    code: String(node.code || '').trim(),
    description: node.description || '',
    icon: node.icon || '',
    meantype: node.meantype || node.menutype || 'menu',
    menuCode: node.menuCode || '',
    name: String(node.name || '').trim(),
    orderNum: Number(node.orderNum) || 1,
    pid: Number(node.pid) || 0,
    url: node.url || ''
  }
  // 按钮类型不带这两个标志位
  if (payload.meantype !== 'button') {
    payload.sidebarShow = flagOf(node.sidebarShow)
    payload.cacheFlag = flagOf(node.cacheFlag)
  }
  return Object.assign(payload, patch)
}

export async function fixMenuCodeByUrl(options) {
  const opt = options || {}
  const result = {
    total: 0,
    matched: 0,
    updated: 0,
    skipped: 0,
    failures: [],
    details: []
  }

  // tree 请求异常也必须变成可读的失败原因，不能往上抛后被 $confirm 的 catch 吞掉
  let treeRes
  try {
    treeRes = await qryMenuList({})
  } catch (e) {
    result.failures.push({ id: '-', name: '-', msg: `菜单树请求异常：${(e && e.message) || 'unknown'}` })
    return result
  }
  if (!isOk(treeRes)) {
    result.failures.push({
      id: '-',
      name: '-',
      msg: `菜单树加载失败（code=${treeRes && treeRes.code}）：${(treeRes && treeRes.msg) || ''}`
    })
    return result
  }
  const tree = toTree(treeRes)
  if (!tree.length) {
    result.failures.push({ id: '-', name: '-', msg: '菜单树为空，请确认 tree 接口 data 的结构' })
    return result
  }

  const walk = async list => {
    for (let i = 0; i < (list || []).length; i += 1) {
      const node = list[i] || {}
      result.total += 1

      const type = node.meantype || node.menutype || 'menu'
      const url = String(node.url || '').trim()
      // 目录 / 页面菜单（接口里都是 menu），且 url 有值、尚未修复过
      const needFix = type !== 'button' && !!url && url.indexOf(URL_PREFIX) !== 0

      if (needFix) {
        result.matched += 1
        const menuCode = opt.trimSlash ? url.replace(/^\//, '') : url
        const nextUrl = URL_PREFIX + (url.charAt(0) === '/' ? url : '/' + url)
        const payload = toSaveDTO(node, { menuCode, url: nextUrl })
        const item = { id: node.id, name: node.name, menuCode, url: nextUrl }

        // code / name 是接口必填，脏数据直接跳过，避免把整条记录改坏
        if (!payload.code || !payload.name) {
          result.skipped += 1
          result.failures.push({ id: node.id, name: node.name, msg: 'code / name 为空，已跳过' })
        } else if (opt.dryRun) {
          result.details.push(Object.assign({ dryRun: true }, item))
        } else {
          try {
            const res = await updateMenu(node.id, payload)
            if (isOk(res)) {
              result.details.push(item)
            } else {
              result.failures.push({ id: node.id, name: node.name, msg: (res && res.msg) || '更新失败' })
            }
          } catch (e) {
            result.failures.push({ id: node.id, name: node.name, msg: (e && e.message) || '请求异常' })
          }
        }
      }

      // 深度优先，父节点改完再处理子节点
      await walk(node.children)
    }
  }

  await walk(tree)
  // 成功数统一在遍历结束后计算，避免 await 之后对计数做自增
  result.updated = result.details.filter(item => !item.dryRun).length
  return result
}

export default fixMenuCodeByUrl
