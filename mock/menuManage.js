/**
 * 菜单管理 mock
 *
 * 列表接口：GET /system/menu/tree?keyword=xxx
 * 响应结构：{ code: 200, msg: 'success', data: [ ...树形节点 ] }（与真实接口一致）
 *
 * 节点字段（与接口文档一一对应）：
 *   id         菜单ID
 *   pid        父级菜单ID，0 表示一级目录
 *   parentCode 父级权限编码
 *   code       权限编码
 *   name       菜单展示名称
 *   menuCode   前端菜单组件编码
 *   meantype   菜单类型：menu 目录或页面菜单 / button 按钮权限
 *   icon       菜单图标
 *   url        前端页面组件路径
 *   level      菜单层级：1 一级菜单，2 二级菜单，3 三级菜单
 *   cacheFlag  是否缓存：0 缓存，1 不缓存（仅目录/页面菜单，按钮类型不带）
 *   sidebarShow 是否在左侧栏显示：0 显示，1 不显示（仅目录/页面菜单，按钮类型不带）
 *   orderNum   菜单排序号
 *   regular    锁定标志：0 锁定（不可移动），1 可移动
 *   deleteFlag 删除标志：0 正常，1 已删除
 *   children   子节点集合
 */

// 内存数据：按 src/router/index.js 里实际启用的页面模拟，字段与接口 DTO 一致
// 一级目录名对应静态路由 meta.firstLevelMenu，页面 menuCode 对应路由 path，
// url 指向项目里真实的组件文件；真实接口为 @/view/xxx/index.vue，mock 省略 @ 前缀，
// 避免 Mock.js 把 @xxx 当成数据模板占位符（GET /system/menu/tree 仍走 Mock.mock）
// 新增/编辑/删除/排序都改这里，刷新页面后仍然生效（重启 dev server 恢复初始值）
const MENU_TREE = [
  {
    id: 101,
    pid: 0,
    parentCode: '0',
    code: 'RAA',
    name: '工作台',
    menuCode: '',
    meantype: 'menu',
    icon: 'dashboard',
    url: '',
    level: 1,
    level0: 1,
    orderNum: 1,
    regular: 1,
    deleteFlag: 0,
    cacheFlag: 0,
    sidebarShow: 0,
    children: [
      {
        id: 102,
        pid: 101,
        parentCode: 'RAA',
        code: 'RAA01',
        name: 'Dashboard',
        menuCode: '/dashboard',
        meantype: 'menu',
        icon: 'dashboard',
        url: 'views/dashboard/index.vue',
        level: 2,
        level0: 2,
        orderNum: 1,
        regular: 1,
        deleteFlag: 0,
        cacheFlag: 0,
        sidebarShow: 0,
        children: []
      }
    ]
  },
  {
    id: 201,
    pid: 0,
    parentCode: '0',
    code: 'RAB',
    name: '首页总览',
    menuCode: '',
    meantype: 'menu',
    icon: 'dashboard',
    url: '',
    level: 1,
    level0: 1,
    orderNum: 2,
    regular: 1,
    deleteFlag: 0,
    cacheFlag: 0,
    sidebarShow: 0,
    children: [
      {
        id: 202,
        pid: 201,
        parentCode: 'RAB',
        code: 'RAB01',
        name: '首页总览',
        menuCode: '/homeOverview',
        meantype: 'menu',
        icon: 'dashboard',
        url: 'views/homePage/overview/index.vue',
        level: 2,
        level0: 2,
        orderNum: 1,
        regular: 1,
        deleteFlag: 0,
        cacheFlag: 0,
        sidebarShow: 0,
        children: []
      }
    ]
  },
  {
    id: 301,
    pid: 0,
    parentCode: '0',
    code: 'RAC',
    name: '系统管理',
    menuCode: '',
    meantype: 'menu',
    icon: 'tree',
    url: '',
    level: 1,
    level0: 1,
    orderNum: 3,
    regular: 1,
    deleteFlag: 0,
    cacheFlag: 0,
    sidebarShow: 0,
    children: [
      {
        id: 302,
        pid: 301,
        parentCode: 'RAC',
        code: 'RAC01',
        name: '菜单管理',
        menuCode: '/menuManage',
        meantype: 'menu',
        icon: 'tree',
        url: 'views/menuManage/index.vue',
        level: 2,
        level0: 2,
        orderNum: 1,
        regular: 1,
        deleteFlag: 0,
        cacheFlag: 0,
        sidebarShow: 0,
        children: [
          {
            id: 303,
            pid: 302,
            parentCode: 'RAC01',
            code: 'RAC01:B1',
            name: '新增',
            meantype: 'button',
            icon: '',
            menuCode: '',
            url: '',
            level: 3,
            level0: 3,
            orderNum: 1,
            regular: 1,
            deleteFlag: 0,
            children: []
          },
          {
            id: 304,
            pid: 302,
            parentCode: 'RAC01',
            code: 'RAC01:B2',
            name: '导出',
            meantype: 'button',
            icon: '',
            menuCode: '',
            url: '',
            level: 3,
            level0: 3,
            orderNum: 2,
            regular: 1,
            deleteFlag: 0,
            children: []
          }
        ]
      }
    ]
  }
]

let menuSeq = 900

function ok(data, msg = 'success') {
  return { code: 200, msg, data }
}

function fail(msg, code = 3001) {
  return { code, msg, data: null }
}

/**
 * 出参统一补齐接口字段（description / level0 等历史数据缺省时给默认值），
 * 并过滤掉逻辑删除的节点，保证前端拿到的结构与文档一致
 */
function toDTO(node) {
  const children = (node.children || [])
    .filter(child => Number(child.deleteFlag) !== 1)
    .map(child => toDTO(child))
  return {
    id: node.id,
    pid: node.pid,
    parentCode: node.parentCode || '0',
    code: node.code || '',
    description: node.description || '',
    name: node.name || '',
    menuCode: node.menuCode || '',
    meantype: node.meantype === 'button' ? 'button' : 'menu',
    icon: node.icon || '',
    url: node.url || '',
    level0: Number(node.level0 || node.level) || 1,
    orderNum: Number(node.orderNum) || 0,
    // 0/1 标志位：历史数据缺省按 0（缓存 / 显示）处理
    cacheFlag: node.cacheFlag === 1 ? 1 : 0,
    // 真实接口可能下发字符串 '1'，统一按数值判定隐藏，避免 DTO 环节把隐藏标志抹成 0
    sidebarShow: Number(node.sidebarShow) === 1 ? 1 : 0,
    regular: Number(node.regular) === 0 ? 0 : 1,
    deleteFlag: Number(node.deleteFlag) || 0,
    children
  }
}

// 标志位取 0/1；未传（按钮类型）返回 undefined，编辑时保留原值
function flagOf(value) {
  if (value === 0 || value === 1) return value
  if (value === '0' || value === '1') return Number(value)
  return undefined
}

// 请求体 → 接口 DTO（忽略非接口字段）
function pickDTO(body) {
  const dto = {
    code: String(body.code || '').trim(),
    description: String(body.description || ''),
    icon: body.icon ? String(body.icon) : '',
    meantype: body.meantype === 'button' ? 'button' : 'menu',
    menuCode: String(body.menuCode || ''),
    name: String(body.name || '').trim(),
    orderNum: Number(body.orderNum) || 0,
    pid: Number(body.pid) || 0,
    url: String(body.url || '')
  }
  const cacheFlag = flagOf(body.cacheFlag)
  if (cacheFlag !== undefined) dto.cacheFlag = cacheFlag
  const sidebarShow = flagOf(body.sidebarShow)
  if (sidebarShow !== undefined) dto.sidebarShow = sidebarShow
  return dto
}

// 同级数组：pid 为 0 时返回顶层
function findSiblings(list, pid) {
  if (Number(pid) === 0) return list
  for (let i = 0; i < list.length; i += 1) {
    const node = list[i]
    if (node.id === Number(pid)) return node.children || []
    const hit = findSiblings(node.children || [], pid)
    if (hit) return hit
  }
  return null
}

function findNode(list, id) {
  for (let i = 0; i < (list || []).length; i += 1) {
    const node = list[i]
    if (node.id === Number(id)) return node
    const hit = findNode(node.children || [], id)
    if (hit) return hit
  }
  return null
}

// id 是否位于 node 的子树内（用于阻止把上级设为自己的后代）
function isDescendant(node, id) {
  return (node.children || []).some(child => child.id === Number(id) || isDescendant(child, id))
}

// 权限编码全局查重
function hasCode(list, code) {
  return (list || []).some(node => node.code === code || hasCode(node.children, code))
}

// 权限编码查重（编辑时排除自身）
function hasCodeExcept(list, code, excludeId) {
  return (list || []).some(node => {
    if (node.code === code && Number(node.id) !== Number(excludeId)) return true
    return hasCodeExcept(node.children, code, excludeId)
  })
}

function pad2(n) {
  return String(n).padStart(2, '0')
}

// 取编码末尾序号：数字（RAB04 → 4）或单个字母（RAA → 1）
function seqOf(code, prefix) {
  const rest = String(code || '').slice(prefix.length)
  if (/^\d+$/.test(rest)) return Number(rest)
  if (/^[A-Z]$/.test(rest)) return rest.charCodeAt(0) - 64
  return 0
}

/**
 * 生成候选权限编码（对应 POST /system/menu/generate-code）
 * 顶级：RA + 字母（RAA、RAB …）；子级：父级编码 + 两位序号（RAB04）
 * codePrefix 传入时优先使用（不包含末尾序号）
 */
function nextCode(pid, codePrefix) {
  const parentId = Number(pid) || 0
  const parent = parentId ? findNode(MENU_TREE, parentId) : null
  const siblings = (findSiblings(MENU_TREE, parentId) || [])
    .filter(item => Number(item.deleteFlag) !== 1)
  const prefix = String(codePrefix || '').trim() || (parent ? parent.code : 'RA')

  let maxSequence = 0
  siblings.forEach(item => {
    if (String(item.code || '').indexOf(prefix) === 0) {
      maxSequence = Math.max(maxSequence, seqOf(item.code, prefix))
    }
  })

  const build = n => (parentId ? prefix + pad2(n) : prefix + String.fromCharCode(64 + n))
  let seq = maxSequence + 1
  let code = build(seq)
  while (hasCode(MENU_TREE, code)) {
    seq += 1
    code = build(seq)
  }

  return {
    code,
    codePrefix: prefix,
    maxSequence,
    level0: parent ? Number(parent.level0 || parent.level) + 1 : 1
  }
}

// 修改上级：从原父级摘除并挂到新父级，同步 parentCode / level（含后代）
function moveToParent(node, newPid) {
  const oldSiblings = findSiblings(MENU_TREE, node.pid)
  if (oldSiblings) {
    const idx = oldSiblings.findIndex(item => item.id === node.id)
    if (idx > -1) oldSiblings.splice(idx, 1)
  }
  const newSiblings = findSiblings(MENU_TREE, newPid)
  if (!newSiblings) return false
  const newParent = Number(newPid) ? findNode(MENU_TREE, newPid) : null
  node.pid = Number(newPid)
  node.parentCode = newParent ? newParent.code : '0'
  const fixLevel = (item, level) => {
    item.level = level
    item.level0 = level
    const children = item.children || []
    children.forEach(child => fixLevel(child, level + 1))
  }
  fixLevel(node, newParent ? Number(newParent.level0 || newParent.level) + 1 : 1)
  newSiblings.push(node)
  return true
}

// 权限编码变更时，同步所有后代的 parentCode
function syncChildrenParentCode(node) {
  const children = node.children || []
  children.forEach(child => {
    child.parentCode = node.code
    syncChildrenParentCode(child)
  })
}

// 统计子树节点数（用于删除提示）
function countTree(node) {
  return (node.children || []).reduce((sum, child) => sum + 1 + countTree(child), 1)
}

// keyword 过滤：命中的节点保留全部子级，未命中但后代命中的保留祖先链
function filterTree(list, keyword) {
  const kw = String(keyword || '').trim().toLowerCase()
  const nodes = (list || [])
    .filter(node => Number(node.deleteFlag) !== 1)
    .map(node => toDTO(node))
  if (!kw) return nodes

  const result = []
  nodes.forEach(node => {
    const hit = [node.name, node.code, node.menuCode, node.url, node.description]
      .some(val => String(val || '').toLowerCase().indexOf(kw) > -1)
    const children = hit ? node.children : filterTree(node.children, keyword)
    if (hit || children.length) {
      result.push(Object.assign({}, node, { children }))
    }
  })
  return result
}

module.exports = [
  // 登录人员当前拥有的目录、页面菜单及按钮权限：POST /system/menu/current-menu
  // 请求：form-urlencoded，body 为空、无必填参数；身份由 authorization: Bearer <token> 携带；
  //       文档中的 groupId / userId / name 等均为非必填 query，本接口按登录态直接返回该用户可见菜单
  // 响应：{ code: 200, msg: 'success', data: [树形菜单] }，字段与 GET /system/menu/tree 完全一致
  // 数据源直接复用本文件的 MENU_TREE：菜单管理页新增/编辑/删除/排序后，这里立即生效，避免两套菜单数据不一致
  // raw: true —— 真实 DTO 的 url 形如 @/view/xxx/index.vue，Mock.js 会把 @xxx 当数据模板占位符并报 500
  {
    url: '/system/menu/current-menu',
    type: 'post',
    raw: true,
    response: () => ok(filterTree(MENU_TREE, ''))
  },
  // 菜单树列表：GET /system/menu/tree?keyword=
  {
    url: '/system/menu/tree',
    type: 'get',
    response: config => {
      const query = (config && config.query) || {}
      return ok(filterTree(MENU_TREE, query.keyword))
    }
  },
  // 菜单-按钮详情：GET /system/menu/info?id=
  {
    url: '/system/menu/info',
    type: 'get',
    response: config => {
      const query = (config && config.query) || {}
      const node = findNode(MENU_TREE, query.id)
      if (!node || Number(node.deleteFlag) === 1) return fail('菜单不存在')
      return ok(toDTO(node))
    }
  },
  // 生成菜单权限编码建议：POST /system/menu/generate-code
  {
    url: '/system/menu/generate-code',
    type: 'post',
    response: config => {
      const body = (config && config.body) || {}
      const pid = Number(body.pid) || 0
      if (pid && !findNode(MENU_TREE, pid)) return fail('上级菜单不存在')
      const result = nextCode(pid, body.codePrefix)
      return ok({
        code: result.code,
        codePrefix: result.codePrefix,
        // 允许前端按需修改候选编码
        editable: true,
        // 层级以父节点为准（后端自动计算）
        level0: result.level0,
        maxSequence: result.maxSequence,
        meantype: body.meantype === 'button' ? 'button' : 'menu',
        message: '编码已自动生成，可手动修改'
      })
    }
  },
  // 新增：目录、菜单、按钮：POST /system/menu/save
  {
    url: '/system/menu/save',
    type: 'post',
    response: config => {
      const body = (config && config.body) || {}
      const dto = pickDTO(body)
      if (!dto.name) return fail('菜单名称不能为空')
      if (!dto.code) return fail('权限编码不能为空')
      if (hasCode(MENU_TREE, dto.code)) return fail('权限编码已存在')

      const parent = dto.pid ? findNode(MENU_TREE, dto.pid) : null
      if (dto.pid && !parent) return fail('上级菜单不存在')
      const siblings = findSiblings(MENU_TREE, dto.pid)
      if (!siblings) return fail('上级菜单不存在')

      menuSeq += 1
      const node = {
        id: menuSeq,
        pid: dto.pid,
        parentCode: parent ? parent.code : '0',
        code: dto.code,
        description: dto.description,
        name: dto.name,
        menuCode: dto.menuCode,
        meantype: dto.meantype,
        icon: dto.icon || null,
        url: dto.url,
        level: parent ? Number(parent.level0 || parent.level) + 1 : 1,
        level0: parent ? Number(parent.level0 || parent.level) + 1 : 1,
        orderNum: dto.orderNum || siblings.length + 1,
        // 按钮类型不传这两个字段，按接口默认 0 落库
        cacheFlag: dto.cacheFlag === undefined ? 0 : dto.cacheFlag,
        sidebarShow: dto.sidebarShow === undefined ? 0 : dto.sidebarShow,
        regular: 1,
        deleteFlag: 0,
        children: []
      }
      siblings.push(node)
      return ok(toDTO(node), '新增成功')
    }
  },
  // 编辑：目录、菜单、按钮：POST /system/menu/update?id=
  {
    url: '/system/menu/update',
    type: 'post',
    response: config => {
      const query = (config && config.query) || {}
      const body = (config && config.body) || {}
      const node = findNode(MENU_TREE, query.id || body.id)
      if (!node || Number(node.deleteFlag) === 1) return fail('菜单不存在')

      const dto = pickDTO(body)
      if (!dto.name) return fail('菜单名称不能为空')
      if (!dto.code) return fail('权限编码不能为空')
      if (hasCodeExcept(MENU_TREE, dto.code, node.id)) return fail('权限编码已存在')

      // 上级变更：先从原父级摘除再挂到新父级，并同步 parentCode / level0
      if (dto.pid !== Number(node.pid)) {
        if (dto.pid === Number(node.id)) return fail('上级菜单不能是当前菜单')
        if (isDescendant(node, dto.pid)) return fail('上级菜单不能是当前菜单的子级')
        if (!moveToParent(node, dto.pid)) return fail('上级菜单不存在')
      }
      // 权限编码是全局唯一标识，变更时同步所有后代
      if (dto.code !== node.code) {
        node.code = dto.code
        syncChildrenParentCode(node)
      }
      node.name = dto.name
      node.description = dto.description
      node.menuCode = dto.menuCode
      node.meantype = dto.meantype
      node.icon = dto.icon || null
      node.url = dto.url
      if (dto.orderNum) node.orderNum = dto.orderNum
      // 按钮类型不传标志位时保留原值，不误清
      if (dto.cacheFlag !== undefined) node.cacheFlag = dto.cacheFlag
      if (dto.sidebarShow !== undefined) node.sidebarShow = dto.sidebarShow
      return ok(toDTO(node), '修改成功')
    }
  },
  // 删除当前节点及其全部子节点（逻辑删除）：POST /system/menu/delete
  {
    url: '/system/menu/delete',
    type: 'post',
    response: config => {
      const query = (config && config.query) || {}
      const body = (config && config.body) || {}
      const node = findNode(MENU_TREE, query.id || body.id)
      if (!node || Number(node.deleteFlag) === 1) return fail('菜单不存在')

      // 逻辑删除：整棵子树标记 deleteFlag=1，并从父级摘除
      const markDeleted = item => {
        item.deleteFlag = 1
        ;(item.children || []).forEach(markDeleted)
      }
      markDeleted(node)
      const total = countTree(node)
      const siblings = findSiblings(MENU_TREE, node.pid)
      const idx = siblings ? siblings.findIndex(item => item.id === node.id) : -1
      if (idx > -1) siblings.splice(idx, 1)
      return ok({ deleted: total }, '删除成功')
    }
  },
  // 同层级菜单上移 / 下移：direction = UP | DOWN，regular=0 锁定不可移动
  {
    url: '/system/menu/move',
    type: 'post',
    response: config => {
      const body = (config && config.body) || {}
      const node = findNode(MENU_TREE, body.id)
      if (!node || Number(node.deleteFlag) === 1) return fail('菜单不存在')
      if (Number(node.regular) === 0) return fail('该菜单已锁定，不可移动')

      const siblings = findSiblings(MENU_TREE, node.pid)
      if (!siblings) return fail('同级菜单不存在')
      const idx = siblings.findIndex(item => item.id === node.id)
      const direction = String(body.direction || '').toUpperCase()
      if (direction !== 'UP' && direction !== 'DOWN') return fail('移动方向不合法')
      const target = direction === 'UP' ? idx - 1 : idx + 1
      if (idx < 0 || target < 0 || target >= siblings.length) return fail('已经在边界，无法移动')

      const other = siblings[target]
      const tmpOrder = node.orderNum
      node.orderNum = other.orderNum
      other.orderNum = tmpOrder
      siblings.splice(idx, 1)
      siblings.splice(target, 0, node)
      return ok(true, '移动成功')
    }
  }
]
