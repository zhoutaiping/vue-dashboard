/**
 * 菜单管理 mock
 * 响应结构与后端保持一致：{ code: 0, msg: 'success', data: [...] }
 * data 为树形数组：父级带 childList，叶子节点 childList: []
 *
 * 字段说明（与接口返回一一对应）：
 *   menuId     菜单编码（列表「菜单编码」列，如 M101）
 *   parentId   上级菜单 id，顶级为 '0'
 *   menuCode   权限标识（列表「权限标识」列，如 GanSu/Home）
 *   name       菜单名称
 *   icon       图标名（前端映射成 Element 图标）
 *   url        路由地址（views/... 或 http 链接）
 *   type       菜单类型 0 目录 / 1 菜单
 *   isOn       是否显示 1 显示 / 0 隐藏
 *   keepAlive  是否缓存 1 是 / 0 否
 *   orderNum   排序号（同级内比较）
 *   modifyTime 更新时间
 */

// 内存数据：新增/编辑/删除/排序都改这里，刷新页面后仍然生效（重启 dev server 恢复初始值）
const MENU_TREE = [
  {
    menuId: 'M101',
    parentId: '0',
    name: '现货概览',
    menuCode: 'GanSu/Home',
    icon: 'icon-shouye',
    url: 'views/GanSu/Home/index.vue',
    type: 1,
    isOn: '1',
    keepAlive: '1',
    orderNum: 1,
    modifyTime: '2024-09-12 17:26:26',
    childList: []
  },
  {
    menuId: 'M142',
    parentId: '0',
    name: '行情看板',
    menuCode: 'GanSu/MarketDashboard',
    icon: 'icon-hangqingkanban',
    url: '',
    type: 0,
    isOn: '1',
    keepAlive: '1',
    orderNum: 39,
    modifyTime: '2024-09-12 17:26:26',
    childList: [
      {
        menuId: 'M143',
        parentId: 'M142',
        name: '气象面板',
        menuCode: 'GanSu/MarketDashboard/MeteorologicalPanel',
        icon: null,
        url: 'views/GanSu/MarketDashboard/MeteorologicalPanel/index.vue',
        type: 1,
        isOn: '1',
        keepAlive: '1',
        orderNum: 43,
        modifyTime: '2024-09-12 17:26:26',
        childList: []
      },
      {
        menuId: 'M144',
        parentId: 'M142',
        name: '市场供需',
        menuCode: 'GanSu/MarketDashboard/MarketSupplyDemand',
        icon: null,
        url: 'views/GanSu/MarketDashboard/MarketSupplyDemand/index.vue',
        type: 1,
        isOn: '1',
        keepAlive: '1',
        orderNum: 44,
        modifyTime: '2024-09-12 17:26:26',
        childList: []
      },
      {
        menuId: 'M145',
        parentId: 'M142',
        name: '供需对比',
        menuCode: 'GanSu/MarketDashboard/SupplyDemandComparison',
        icon: null,
        url: 'views/GanSu/MarketDashboard/SupplyDemandComparison/index.vue',
        type: 1,
        isOn: '1',
        keepAlive: '1',
        orderNum: 45,
        modifyTime: '2024-09-12 17:26:26',
        childList: []
      }
    ]
  },
  {
    menuId: 'M147',
    parentId: '0',
    name: '数据预测',
    menuCode: 'GanSu/DataForecast',
    icon: 'icon-shujuyuce',
    url: '',
    type: 0,
    isOn: '1',
    keepAlive: '1',
    orderNum: 46,
    modifyTime: '2024-09-12 17:26:26',
    childList: [
      {
        menuId: 'M148',
        parentId: 'M147',
        name: '发电量预测',
        menuCode: 'GanSu/DataForecast/PowerForecast',
        icon: null,
        url: 'views/GanSu/DataForecast/PowerForecast/index.vue',
        type: 1,
        isOn: '1',
        keepAlive: '1',
        orderNum: 47,
        modifyTime: '2024-09-12 17:26:26',
        childList: []
      },
      {
        menuId: 'M149',
        parentId: 'M147',
        name: '负荷预测',
        menuCode: 'GanSu/DataForecast/LoadForecast',
        icon: null,
        url: 'views/GanSu/DataForecast/LoadForecast/index.vue',
        type: 1,
        isOn: '1',
        keepAlive: '0',
        orderNum: 48,
        modifyTime: '2024-09-12 17:26:26',
        childList: []
      }
    ]
  },
  {
    menuId: 'M150',
    parentId: '0',
    name: '现货复盘',
    menuCode: 'GanSu/SpotInventoryReview',
    icon: 'icon-xianhuofupan',
    url: '',
    type: 0,
    isOn: '1',
    keepAlive: '1',
    orderNum: 49,
    modifyTime: '2024-09-12 17:26:26',
    childList: [
      {
        menuId: 'M151',
        parentId: 'M150',
        name: '月度复盘',
        menuCode: 'GanSu/SpotInventoryReview/MonthlyReview',
        icon: null,
        url: 'views/GanSu/SpotInventoryReview/MonthlyReview/index.vue',
        type: 1,
        isOn: '1',
        keepAlive: '1',
        orderNum: 50,
        modifyTime: '2024-09-12 17:26:26',
        childList: []
      },
      {
        menuId: 'M152',
        parentId: 'M150',
        name: '交易日复盘',
        menuCode: 'GanSu/SpotInventoryReview/TradingDayReview',
        icon: null,
        url: 'views/GanSu/SpotInventoryReview/TradingDayReview/index.vue',
        type: 1,
        isOn: '0',
        keepAlive: '1',
        orderNum: 51,
        modifyTime: '2024-09-12 17:26:26',
        childList: []
      }
    ]
  },
  {
    menuId: 'M103',
    parentId: '0',
    name: '公开数据',
    menuCode: 'GanSu/PublicData',
    icon: 'icon-gongkaishuju',
    url: '',
    type: 0,
    isOn: '1',
    keepAlive: '1',
    orderNum: 52,
    modifyTime: '2024-09-12 17:26:26',
    childList: [
      {
        menuId: 'M104',
        parentId: 'M103',
        name: '政策文件',
        menuCode: 'GanSu/PublicData/PolicyDocument',
        icon: null,
        url: 'views/GanSu/PublicData/PolicyDocument/index.vue',
        type: 1,
        isOn: '1',
        keepAlive: '1',
        orderNum: 53,
        modifyTime: '2024-09-12 17:26:26',
        childList: []
      },
      {
        menuId: 'M105',
        parentId: 'M103',
        name: '市场公告',
        menuCode: 'GanSu/PublicData/MarketNotice',
        icon: null,
        url: 'views/GanSu/PublicData/MarketNotice/index.vue',
        type: 1,
        isOn: '1',
        keepAlive: '1',
        orderNum: 54,
        modifyTime: '2024-09-12 17:26:26',
        childList: []
      }
    ]
  },
  {
    menuId: 'M174',
    parentId: '0',
    name: '中长期决策',
    menuCode: 'GanSu/MediumLongDecision',
    icon: 'icon-zhongchangqi',
    url: '',
    type: 0,
    isOn: '1',
    keepAlive: '1',
    orderNum: 55,
    modifyTime: '2025-05-20 15:32:38',
    childList: [
      {
        menuId: 'M175',
        parentId: 'M174',
        name: '年度交易',
        menuCode: 'GanSu/MediumLongDecision/AnnualTrade',
        icon: null,
        url: 'views/GanSu/MediumLongDecision/AnnualTrade/index.vue',
        type: 1,
        isOn: '1',
        keepAlive: '1',
        orderNum: 56,
        modifyTime: '2025-05-20 15:32:38',
        childList: []
      },
      {
        menuId: 'M176',
        parentId: 'M174',
        name: '月度交易',
        menuCode: 'GanSu/MediumLongDecision/MonthlyTrade',
        icon: null,
        url: 'views/GanSu/MediumLongDecision/MonthlyTrade/index.vue',
        type: 1,
        isOn: '1',
        keepAlive: '1',
        orderNum: 57,
        modifyTime: '2025-05-20 15:32:38',
        childList: []
      }
    ]
  },
  {
    menuId: 'M134',
    parentId: '0',
    name: '私有数据',
    menuCode: 'GanSu/PrivateData',
    icon: 'icon-siyoushuju',
    url: '',
    type: 0,
    isOn: '1',
    keepAlive: '1',
    orderNum: 58,
    modifyTime: '2025-05-20 15:32:38',
    childList: [
      {
        menuId: 'M135',
        parentId: 'M134',
        name: '自有场站',
        menuCode: 'GanSu/PrivateData/OwnStation',
        icon: null,
        url: 'views/GanSu/PrivateData/OwnStation/index.vue',
        type: 1,
        isOn: '1',
        keepAlive: '1',
        orderNum: 59,
        modifyTime: '2025-05-20 15:32:38',
        childList: []
      }
    ]
  },
  {
    menuId: 'M301',
    parentId: '0',
    name: '资料库',
    menuCode: 'Database',
    icon: 'icon-ziliaoku',
    url: 'views/Database/index.vue',
    type: 0,
    isOn: '1',
    keepAlive: '1',
    orderNum: 60,
    modifyTime: '2024-09-12 17:26:26',
    childList: [
      {
        menuId: 'M302',
        parentId: 'M301',
        name: '文档库',
        menuCode: 'Database/Document',
        icon: null,
        url: 'views/Database/Document/index.vue',
        type: 1,
        isOn: '1',
        keepAlive: '1',
        orderNum: 61,
        modifyTime: '2024-09-12 17:26:26',
        childList: []
      }
    ]
  }
]

let menuSeq = 900

function ok(data) {
  return { code: 0, msg: 'success', data }
}

function fail(msg) {
  return { code: 500, msg, data: null }
}

function clone(list) {
  return JSON.parse(JSON.stringify(list))
}

// 递归找节点所在的同级数组（parentId 为 '0' 时返回顶层数组）
function findSiblings(list, parentId) {
  if (parentId === '0') return list
  for (let i = 0; i < list.length; i += 1) {
    const node = list[i]
    if (node.menuId === parentId) return node.childList || []
    const hit = findSiblings(node.childList || [], parentId)
    if (hit) return hit
  }
  return null
}

function findNode(list, menuId) {
  for (let i = 0; i < list.length; i += 1) {
    const node = list[i]
    if (node.menuId === menuId) return node
    const hit = findNode(node.childList || [], menuId)
    if (hit) return hit
  }
  return null
}

function nowText() {
  const d = new Date()
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

module.exports = [
  // 菜单树列表
  {
    url: '/menu/qryMenuList',
    type: 'post',
    response: () => ok(clone(MENU_TREE))
  },
  // 保存（新增/编辑）：menuId 为空视为新增，否则更新
  {
    url: '/menu/saveMenu',
    type: 'post',
    response: config => {
      const body = (config && config.body) || {}
      const name = String(body.name || '').trim()
      if (!name) return fail('菜单名称不能为空')

      if (body.menuId) {
        const node = findNode(MENU_TREE, body.menuId)
        if (!node) return fail('菜单不存在')
        node.name = name
        node.menuCode = body.menuCode || ''
        node.icon = body.icon || null
        node.url = body.url || ''
        node.type = Number(body.type) || 0
        node.isOn = String(body.isOn) === '0' ? '0' : '1'
        node.keepAlive = String(body.keepAlive) === '0' ? '0' : '1'
        node.orderNum = Number(body.orderNum) || 1
        node.modifyTime = nowText()
        return ok(clone(node))
      }

      const parentId = String(body.parentId || '0')
      const siblings = findSiblings(MENU_TREE, parentId)
      if (!siblings) return fail('上级菜单不存在')

      menuSeq += 1
      const node = {
        menuId: `M${menuSeq}`,
        parentId,
        name,
        menuCode: body.menuCode || '',
        icon: body.icon || null,
        url: body.url || '',
        type: Number(body.type) || 0,
        isOn: String(body.isOn) === '0' ? '0' : '1',
        keepAlive: String(body.keepAlive) === '0' ? '0' : '1',
        orderNum: Number(body.orderNum) || siblings.length + 1,
        modifyTime: nowText(),
        childList: []
      }
      siblings.push(node)
      return ok(clone(node))
    }
  },
  // 删除：有下级时不允许删（与常见菜单管理一致）
  {
    url: '/menu/deleteMenu',
    type: 'post',
    response: config => {
      const body = (config && config.body) || {}
      const node = findNode(MENU_TREE, body.menuId)
      if (!node) return fail('菜单不存在')
      if ((node.childList || []).length) return fail('存在下级菜单，请先删除下级菜单')
      const siblings = findSiblings(MENU_TREE, node.parentId)
      const idx = siblings ? siblings.findIndex(item => item.menuId === node.menuId) : -1
      if (idx > -1) siblings.splice(idx, 1)
      return ok(true)
    }
  },
  // 同级排序：direction = up / down，交换与相邻项的位置与 orderNum
  {
    url: '/menu/sortMenu',
    type: 'post',
    response: config => {
      const body = (config && config.body) || {}
      const node = findNode(MENU_TREE, body.menuId)
      if (!node) return fail('菜单不存在')
      const siblings = findSiblings(MENU_TREE, node.parentId)
      if (!siblings) return fail('同级菜单不存在')
      const idx = siblings.findIndex(item => item.menuId === node.menuId)
      const target = body.direction === 'up' ? idx - 1 : idx + 1
      if (idx < 0 || target < 0 || target >= siblings.length) return fail('已经在边界，无法移动')

      const other = siblings[target]
      const tmpOrder = node.orderNum
      node.orderNum = other.orderNum
      other.orderNum = tmpOrder
      siblings.splice(idx, 1)
      siblings.splice(target, 0, node)
      return ok(true)
    }
  }
]
