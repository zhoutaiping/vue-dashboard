/**
 * 首页总览 mock 数据
 * 返回结构与真实后端保持一致：{ code: 200, msg: 'success', data: {...} }
 */

const fs = require('fs')
const path = require('path')

// 省份（含省会坐标，用于地图打点与排名）
const PROVINCES = [
  { code: '110000', name: '北京', lng: 116.407, lat: 39.904 },
  { code: '120000', name: '天津', lng: 117.201, lat: 39.084 },
  { code: '130000', name: '河北', lng: 114.502, lat: 38.045 },
  { code: '140000', name: '山西', lng: 112.549, lat: 37.857 },
  { code: '150000', name: '内蒙古', lng: 111.751, lat: 40.842 },
  { code: '210000', name: '辽宁', lng: 123.429, lat: 41.796 },
  { code: '220000', name: '吉林', lng: 125.323, lat: 43.817 },
  { code: '230000', name: '黑龙江', lng: 126.535, lat: 45.803 },
  { code: '310000', name: '上海', lng: 121.473, lat: 31.23 },
  { code: '320000', name: '江苏', lng: 118.797, lat: 32.06 },
  { code: '330000', name: '浙江', lng: 120.155, lat: 30.274 },
  { code: '340000', name: '安徽', lng: 117.283, lat: 31.861 },
  { code: '350000', name: '福建', lng: 119.306, lat: 26.075 },
  { code: '360000', name: '江西', lng: 115.892, lat: 28.676 },
  { code: '370000', name: '山东', lng: 117.121, lat: 36.651 },
  { code: '410000', name: '河南', lng: 113.625, lat: 34.746 },
  { code: '420000', name: '湖北', lng: 114.305, lat: 30.593 },
  { code: '430000', name: '湖南', lng: 112.939, lat: 28.675 },
  { code: '440000', name: '广东', lng: 113.264, lat: 23.129 },
  { code: '450000', name: '广西', lng: 108.32, lat: 22.824 },
  { code: '460000', name: '海南', lng: 110.199, lat: 20.044 },
  { code: '500000', name: '重庆', lng: 106.505, lat: 29.533 },
  { code: '510000', name: '四川', lng: 104.066, lat: 30.572 },
  { code: '520000', name: '贵州', lng: 106.63, lat: 26.647 },
  { code: '530000', name: '云南', lng: 102.833, lat: 24.88 },
  { code: '540000', name: '西藏', lng: 91.132, lat: 29.66 },
  { code: '610000', name: '陕西', lng: 108.948, lat: 34.263 },
  { code: '620000', name: '甘肃', lng: 103.823, lat: 36.058 },
  { code: '630000', name: '青海', lng: 101.778, lat: 36.617 },
  { code: '640000', name: '宁夏', lng: 106.278, lat: 38.467 },
  { code: '650000', name: '新疆', lng: 87.617, lat: 43.792 }
]

// 分类（颜色用于地图打点与图表；name 与接口 industry 字段一致）
const CATEGORIES = [
  { id: 'power', name: '能源电力', color: '#0088ff', count: 210 },
  { id: 'energy', name: '节能环保', color: '#67c23a', count: 151 },
  { id: 'build', name: '智慧能源', color: '#e6a23c', count: 186 },
  { id: 'traffic', name: '绿色交通', color: '#f56c6c', count: 188 },
  { id: 'other', name: '其他', color: '#909399', count: 99 }
]

// 排名维度基数（rankingType → 数量级，模拟各维度数值差异）
const RANK_BASE = {
  projectCount: { base: 260, min: 0.02 },
  rate: { base: 100, min: 0.6 },
  capacity: { base: 2000, min: 0.02 },
  hour: { base: 3200, min: 0.3 }
}

function randomInt(min, max, seed) {
  const value = Math.sin(seed) * 10000
  return Math.floor(min + Math.abs(value - Math.floor(value)) * (max - min))
}

// 特殊省份拆分区域（业务规则，与前端 config REGION_SPLIT 保持一致）：内蒙古→蒙西/蒙东，河北→冀北/河北南网
// 结构与前端 REGION_SPLIT 一致（对象含 name），避免字符串取 .name 得 undefined
const PROVINCE_SPLIT = {
  内蒙古: [{ name: '蒙西' }, { name: '蒙东' }],
  河北: [{ name: '冀北' }, { name: '冀南' }]
}

// 拆分区域的「区域名 → 地市」映射（与前端 config REGION_SPLIT 完全一致）
// 用途：① 下钻到区域时按区域名反查归属省份；② 只返回该区域地市的项目
const SPLIT_REGIONS = {
  内蒙古: [
    { name: '蒙西', cities: ['呼和浩特', '包头', '鄂尔多斯', '乌兰察布', '乌海', '巴彦淖尔', '锡林郭勒', '阿拉善'] },
    { name: '蒙东', cities: ['赤峰', '通辽', '呼伦贝尔', '兴安盟'] }
  ],
  河北: [
    { name: '冀北', cities: ['唐山', '张家口', '秦皇岛', '承德', '廊坊'] },
    { name: '河北南网', cities: ['石家庄', '保定', '沧州', '衡水', '邢台', '邯郸'] }
  ]
}

// 区域名（含别名后缀，如「蒙西电网」）→ { province, name, cities }
// 只做「入参包含区域名」的匹配，不做反向包含：否则入参「河北」会误命中「河北南网」
function findSplitRegion(name) {
  const key = String(name || '').replace(/(省|市|自治区)/g, '')
  if (!key) return null
  const provinces = Object.keys(SPLIT_REGIONS)
  for (let i = 0; i < provinces.length; i++) {
    const hit = SPLIT_REGIONS[provinces[i]].find(r => r.name === key || key.indexOf(r.name) > -1)
    if (hit) return Object.assign({ province: provinces[i] }, hit)
  }
  return null
}

// 项目是否属于某区域（按 cityName 命中最简：城市名去后缀后包含区域地市名）
const inRegion = (project, cities) => cities.some(c => String(project.cityName || '').indexOf(c) > -1)

// 短名 → 接口全称（山东省/内蒙古自治区等）
function fullProvinceName(name) {
  const special = {
    内蒙古: '内蒙古自治区',
    广西: '广西壮族自治区',
    西藏: '西藏自治区',
    宁夏: '宁夏回族自治区',
    新疆: '新疆维吾尔自治区',
    北京: '北京市',
    天津: '天津市',
    上海: '上海市',
    重庆: '重庆市'
  }
  return special[name] || `${name}省`
}

// 生成排名数据：[{ nameType, value }]，按 value 降序
function buildRankItems(names, rankingType, seedBase) {
  const conf = RANK_BASE[rankingType] || RANK_BASE.projectCount
  return names.map((name, i) => ({
    nameType: name,
    value: String(randomInt(conf.base * conf.min, conf.base, seedBase + i) / (rankingType === 'rate' ? 10 : 1))
  })).sort((a, b) => b.value - a.value)
}

// 取该省真实地市名（与 GeoJSON 区域一致），用于点位 cityName
function pickCityName(province, seed) {
  const geo = loadProvinceGeo(province.code)
  const names = geo && Array.isArray(geo.features)
    ? geo.features.map(f => (f.properties && f.properties.name) || '').filter(Boolean)
    : []
  if (!names.length) return `${province.name}市区`
  const idx = Math.abs(Math.floor(Math.sin(seed) * 10000)) % names.length
  return names[idx]
}

// 生成地图展示数据（mapDisplay）：每省 = 电价汇总 + 项目列表
// projectList 分类口径（业务规则）：
//   无补贴：natProject != 1
//   有补贴：natProject = 1
//   合规：  natProject = 1 && compCatalog = 1（优先判定）
function buildMapProject(province, seed) {
  const nat = [0, 1, 1, null][seed % 4]
  const comp = nat === 1 ? [0, 1, null][seed % 3] : null
  // 行业名与 CATEGORIES 严格一致（行业筛选按名称匹配）
  const industries = ['能源电力', '节能环保', '智慧能源', '绿色交通', '其他']
  return {
    projectName: `${province.name}${seed % 2 === 0 ? '风电' : '光伏'}项目${seed}号`,
    projectCode: `PJ${province.code}${String(seed).padStart(3, '0')}`,
    provinceName: fullProvinceName(province.name),
    // 地市名取真实值（与 GeoJSON 区域一致），便于前端按 REGION_SPLIT 映射地区分类（蒙西/蒙东等）
    cityName: pickCityName(province, seed),
    longitude: String(province.lng + randomInt(-15, 15, seed) / 10),
    latitude: String(province.lat + randomInt(-15, 15, seed) / 10),
    natProject: nat === null ? null : String(nat),
    compCatalog: comp === null ? null : String(comp),
    pvSettlementPrice: String(randomInt(20, 60, seed) / 100),
    windSettlementPrice: String(randomInt(20, 60, seed + 5) / 100),
    // 点位详情卡片字段（原型：点击点位弹出白色卡片）
    industry: industries[seed % industries.length], // 行业（卡片顶部标签）
    // 项目状态（在建/运营）：状态筛选（显示在建/显示运营）按此过滤
    status: seed % 2 === 0 ? '在建' : '运营',
    controller: `${province.name}市百色电力有限公司`, // 实控人
    capacity: randomInt(500, 3000, seed + 7), // 装机容量 kW
    hours: randomInt(80, 300, seed + 11), // 发电利用小时数 h
    rate: randomInt(70, 99, seed + 13), // 达标率 %
    settlementPrice: String(randomInt(20, 60, seed) / 100), // 结算电价 元/kWh（mini 胶囊同源）
    subsidyPrice: String(randomInt(5, 30, seed + 17) / 100) // 补贴电价 元/kWh
  }
}

function buildProvinceGroup(province, seed) {
  const list = []
  for (let i = 0; i < 3 + seed % 3; i++) list.push(buildMapProject(province, seed * 10 + i))
  return {
    avgSettlementPrice: String(randomInt(30, 60, seed) / 100),
    avgWindSettlementPrice: String(randomInt(25, 55, seed + 1) / 100),
    avgPvSettlementPrice: String(randomInt(25, 55, seed + 2) / 100),
    benchmarkPrice: String(randomInt(25, 50, seed + 3) / 100),
    // spot 均价：区域悬浮 tooltip 的差值对比基准（电价 - spot 均价）
    spotWindSettlementPrice: String(randomInt(25, 55, seed + 21) / 100),
    spotPvSettlementPrice: String(randomInt(25, 55, seed + 23) / 100),
    projectList: list
  }
}

// 读取省份 GeoJSON（本地文件，按行政区码），用于按市区粒度生成电价
const GEO_CACHE = {}
function loadProvinceGeo(code) {
  if (GEO_CACHE[code]) return GEO_CACHE[code]
  try {
    const file = path.resolve(__dirname, '../src/assets/maps', `${code}.json`)
    const json = JSON.parse(fs.readFileSync(file, 'utf-8'))
    GEO_CACHE[code] = json
    return json
  } catch (e) {
    return null
  }
}

// 省份下钻：按 GeoJSON 内的市区粒度生成电价数据（区域名与地图严格一致，便于 visualMap 着色）
function buildCityPriceList(province) {
  const geo = loadProvinceGeo(province.code)
  if (!geo || !Array.isArray(geo.features)) return []
  const base = Number(province.code) || 0
  return geo.features
    .map((f, i) => {
      const name = (f.properties && f.properties.name) || ''
      if (!name) return null
      const seed = base / 1000 + i * 7 + 3
      return {
        name,
        avgSettlementPrice: String(randomInt(30, 60, seed) / 100),
        avgWindSettlementPrice: String(randomInt(25, 55, seed + 1) / 100),
        avgPvSettlementPrice: String(randomInt(25, 55, seed + 2) / 100),
        // 悬浮字段含标杆电价，市区粒度同步提供（菜单维度不含标杆）
        benchmarkPrice: String(randomInt(25, 50, seed + 3) / 100),
        // spot 均价：市区悬浮 tooltip 的差值对比基准（下钻视图仅展示光伏/发电两行）
        spotWindSettlementPrice: String(randomInt(25, 55, seed + 21) / 100),
        spotPvSettlementPrice: String(randomInt(25, 55, seed + 23) / 100),
        projectCount: randomInt(2, 24, seed + 5)
      }
    })
    .filter(Boolean)
}

function buildMonths(count) {
  const months = []
  const now = new Date()
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

function ok(data) {
  return { code: 200, msg: 'success', data }
}

// 行业入参归一：接口只收数组（如 ["能源电力","其他"]，空数组=全部），
// 这里同时兼容历史字符串形态（JSON 数组串 / 逗号串），统一输出为字符串数组
function parseIndustry(raw) {
  if (Array.isArray(raw)) return raw.map(s => String(s).trim()).filter(Boolean)
  const str = String(raw === undefined || raw === null ? '' : raw).trim()
  if (!str) return []
  if (str.charAt(0) === '[') {
    try {
      const arr = JSON.parse(str)
      if (Array.isArray(arr)) return arr.map(s => String(s).trim()).filter(Boolean)
    } catch (e) { /* 解析失败回退逗号串 */ }
  }
  return str.split(',').map(s => s.trim()).filter(Boolean)
}

module.exports = [
  // 项目总览（全国/省份）：POST /largeScreen/queryProjectOverview
  // 入参 { industry, month, provinceName, status }；返回 { constructionCount, operationCount, industryNum }
  {
    url: '/largeScreen/queryProjectOverview',
    type: 'post',
    response: config => {
      const body = config.body || {}
      const { industry = '', provinceName = '', status = '3' } = body

      // 省份下钻后数值按比例缩小，模拟联动
      const ratio = provinceName ? 0.08 : 1

      // 行业基数（对齐原型：能源电力 1136 / 节能环保 1025 / 智慧能源 534 / 绿色交通 261 / 其他 19）
      const industryCounts = CATEGORIES.map((c, i) => ({
        industry: c.name,
        projectCount: Math.round([1136, 1025, 534, 261, 19][i] * ratio)
      }))
      const totalCount = industryCounts.reduce((sum, item) => sum + item.projectCount, 0)

      // 行业多选入参为数组；未指定行业（空数组）取合计
      const industries = parseIndustry(industry)
      const allCount = industries.length
        ? industries.reduce((sum, name) => {
          const hit = industryCounts.find(i => i.industry === name) || { projectCount: 0 }
          return sum + hit.projectCount
        }, 0)
        : totalCount

      // 百分比保留两位小数（字符串，与后端一致）
      const withPercent = list => list.map(item => Object.assign({}, item, {
        percentage: totalCount ? ((item.projectCount / totalCount) * 100).toFixed(2) : '0'
      }))

      // 行业筛选：指标按所选行业（支持逗号多选）占比缩小（模拟后端按 industry 过滤）
      const industryRatio = allCount && industries.length ? allCount / totalCount : 1

      return ok({
        constructionCount: Math.round(6220 * ratio * industryRatio * (status === '2' ? 0.2 : 1)),
        operationCount: Math.round(220 * ratio * industryRatio * (status === '1' ? 0.2 : 1)),
        industryNum: [
          { industry: '全部', projectCount: String(allCount), percentage: '100' }
        ].concat(withPercent(industryCounts).map(item => Object.assign({}, item, {
          projectCount: String(item.projectCount)
        })))
      })
    }
  },

  // 地区排名（全国）：POST /largeScreen/queryNationalRanking
  // 入参 { industry, month, rankingType, status }；返回 data: [{ nameType(省份全称), value }]
  {
    url: '/largeScreen/queryNationalRanking',
    type: 'post',
    response: config => {
      const body = config.body || {}
      const rankingType = body.rankingType || 'projectCount'
      return ok(buildRankItems(
        PROVINCES.map(p => fullProvinceName(p.name)),
        rankingType,
        7
      ))
    }
  },

  // 地区排名（省内）：POST /largeScreen/queryRegionRanking
  // 入参 { industry, month, provinceName, rankingType, status }；返回 data: [{ nameType(市/区县名称), value }]
  // 特殊省份按业务规则拆分：内蒙古→蒙西/蒙东，河北→冀北/河北南网
  {
    url: '/largeScreen/queryRegionRanking',
    type: 'post',
    response: config => {
      const body = config.body || {}
      const rankingType = body.rankingType || 'projectCount'
      // provinceName 兼容全称/短名
      const short = String(body.provinceName || '北京').replace(/(省|市|自治区)$/, '')

      // 拆分省份：返回拆分区域排名（蒙西/蒙东、冀北/河北南网）
      const split = PROVINCE_SPLIT[short]
      if (split) {
        return ok(buildRankItems(
          split.map(r => r.name),
          rankingType,
          27
        ))
      }

      const suffix = ['东', '南', '西', '北', '城', '郊', '新', '港', '宁', '阳', '州']
      return ok(buildRankItems(
        suffix.map(s => `${short}${s}市`),
        rankingType,
        17
      ))
    }
  },

  // 地图展示：POST /largeScreen/mapDisplay
  // 入参 { industry, month, provinceName, status }
  // 全国请求（provinceName 空）→ data: 省份数组；省份请求 → data: 单对象（当前省电价汇总 + 项目列表）
  {
    url: '/largeScreen/mapDisplay',
    type: 'post',
    response: config => {
      const body = config.body || {}
      // 行业多选入参为数组；空数组 = 全部（与前端 industryParam 对应）
      const industryFilter = parseIndustry(body.industry)
      // 状态筛选：1在建 2运营 3在建和运营 4未选择（未选择 = 全部，原型注5）
      const status = String(body.status || '4')
      const matchProject = p => {
        const industryOk = industryFilter.length === 0 || industryFilter.includes(p.industry)
        const statusOk =
          status === '4' || status === '3' ||
          (status === '1' && p.status === '在建') ||
          (status === '2' && p.status === '运营')
        return industryOk && statusOk
      }
      if (body.provinceName) {
        const requestName = String(body.provinceName)
        // 区域下钻（蒙西/蒙东/冀北/河北南网）：区域名不是省份名，必须先反查归属省份。
        // 直接 find 会一路落空 → 兜底 PROVINCES[0]（北京），表现为「蒙西里冒出北京的项目」
        const regionHit = findSplitRegion(requestName)
        const p = (regionHit && PROVINCES.find(x => x.name === regionHit.province)) ||
          PROVINCES.find(x => requestName.indexOf(x.name) > -1) || PROVINCES[0]
        const group = buildProvinceGroup(p, 5)
        group.projectList = (group.projectList || []).filter(matchProject)
        // 区域请求：只返回本区域地市的项目（与全国视图的分区口径一致）
        if (regionHit) {
          group.projectList = group.projectList.filter(pr => inRegion(pr, regionHit.cities))
        }
        // 下钻按市区着色：附带市区粒度电价（名称与 GeoJSON 区域一致）
        group.cityPriceList = buildCityPriceList(p)
        return ok(group)
      }
      // 全国请求：省名 key 映射（与真实接口一致：{ 省名: 电价汇总+项目列表 }）
      // 内蒙古/河北按业务分区拆分返回（蒙西/蒙东、冀北/河北南网），项目按 cityName 归属分区
      const result = {}
      PROVINCES.forEach((p, i) => {
        const splits = SPLIT_REGIONS[p.name]
        if (splits) {
          const list = (buildProvinceGroup(p, i + 2).projectList || []).filter(matchProject)
          splits.forEach((r, j) => {
            const group = buildProvinceGroup(p, i * 10 + 100 + j)
            group.projectList = list.filter(pr => inRegion(pr, r.cities))
            result[r.name] = group
          })
          return
        }
        const group = buildProvinceGroup(p, i + 2)
        group.projectList = (group.projectList || []).filter(matchProject)
        result[fullProvinceName(p.name)] = group
      })
      return ok(result)
    }
  },

  // 地图点位详情：POST /largeScreen/projectDetail
  // 入参 { industry, month, projectCode, status }
  // 按 projectCode 末三位奇偶返回两类项目：偶数 → POWER 发电项目，奇数 → NON_STANDARD 非标项目
  {
    url: '/largeScreen/projectDetail',
    type: 'post',
    response: config => {
      const body = config.body || {}
      const code = String(body.projectCode || '')
      const tail = Number(code.slice(-3)) || 0
      const province = PROVINCES.find(p => code.indexOf(p.code) > -1) || PROVINCES[0]
      const tail1 = tail + 1
      const tail2 = tail + 2
      const tail3 = tail + 3
      const tail4 = tail + 4
      const tail5 = tail + 5
      if (tail % 2 === 1) {
        // 非标项目（字段与真实接口一致：accessMethod/productionTypes/productionCapacity/platformTransfer）
        return ok({
          projectType: 'NON_STANDARD',
          nonStandardDetail: {
            projectName: `${province.name}东方低碳综合能源非标项目${tail}号`,
            projectCode: code,
            projectType: '能源电力',
            actualController: `${province.name}市百色电力有限公司`,
            accessMethod: String(tail % 3 + 1), // 1自动 2手动 3接入
            productionTypes: String(tail1 % 3), // 生产及预警：0正常运行 1顺歌运行 2预警运行
            productionCapacity: String(randomInt(6, 30, tail2)), // 项目规模
            platformTransfer: tail3 % 2 === 0 ? '1' : '2', // 是否平台转发：1是 2否
            status: '1' // 项目状态：1、在建；2、运营
          },
          powerGenerationDetail: null
        })
      }
      // 发电项目（字段与真实接口一致：capacity/hours/subePrice；editWindPrice 结算电价、rate 达标率为 swagger 补充字段）
      return ok({
        projectType: 'POWER',
        nonStandardDetail: null,
        powerGenerationDetail: {
          projectName: `${province.name}${tail % 4 === 0 ? '风电' : '光伏'}项目${tail}号`,
          projectCode: code,
          actualController: `${province.name}市百色电力有限公司`,
          capacity: String(randomInt(500, 3000, tail2)),
          hours: String(randomInt(80, 300, tail3)),
          rate: String(randomInt(70, 99, tail4)),
          editWindPrice: String(randomInt(20, 60, tail5) / 100),
          subePrice: String(randomInt(5, 30, tail1) / 100),
          status: tail % 3 === 0 ? '1' : '2' // 项目状态：1、在建；2、运营（偶数项目 2/3 概率运营）
        }
      })
    }
  },

  // 建设/运营管理项目报表：POST /largeScreen/queryBuildandOperate
  // 入参 { industry, month, provinceName, status }；返回 data: 逐月数组
  {
    url: '/largeScreen/queryBuildandOperate',
    type: 'post',
    response: config => {
      const body = config.body || {}
      const { provinceName = '', status = '3' } = body

      // 省份下钻后数值按比例缩小；状态筛选分别影响在建/运营数量
      const ratio = provinceName ? 0.08 : 1
      const statusFactor = field => (status === '1' && field === 'operationCount') || (status === '2' && field === 'constructionCount') ? 0.2 : 1

      const months = buildMonths(12)
      return ok(months.map((m, i) => ({
        month: m,
        constructionCount: Math.round(randomInt(60, 260, i + 2) * ratio * statusFactor('constructionCount')),
        operationCount: Math.round(randomInt(40, 200, i + 5) * ratio * statusFactor('operationCount')),
        outstandingCount: Math.round(randomInt(120, 320, i + 9) * ratio)
      })))
    }
  },

  // 运营项目情况：POST /largeScreen/queryOperateDetail
  // 入参 { industry, month, operateType, provinceName, status }；返回指标 + 指标图表一体
  {
    url: '/largeScreen/queryOperateDetail',
    type: 'post',
    response: config => {
      const body = config.body || {}
      const { provinceName = '', operateType = '1' } = body

      // 省份下钻后数值按比例缩小
      const ratio = provinceName ? 0.08 : 1
      const nonstandard = operateType === '3'
      const months = buildMonths(13)

      // 指标图表：风电/光伏 oneMetric=利用小时数；非标 oneMetric=度电收入（万元/kWh）；yield=达标率
      const lineChart = months.map((m, i) => ({
        month: m,
        oneMetric: nonstandard
          ? String(randomInt(10, 60, i + 4) / 100)
          : String(randomInt(1200, 3200, i + 4)),
        yield: String(randomInt(60, 100, i + 8))
      }))

      const metrics = nonstandard
        ? {
          projectCount: String(Math.round(96 * ratio)),
          writeIncome: String(randomInt(100, 900, 5) / 10),
          accountIncome: String(randomInt(80, 700, 9) / 10),
          yield: String(randomInt(80, 100, 12))
        }
        : {
          projectCount: String(Math.round(385 * ratio)),
          capacity: String(randomInt(100, 2000, 5) / 10),
          onlinePower: String(randomInt(5000, 30000, 7)),
          useHours: String(randomInt(1200, 3200, 11)),
          electricityPrice: String(randomInt(30, 80, 13) / 100),
          income: String(randomInt(100, 300, 15) / 10),
          oneMetric: '0.00'
        }

      return ok(Object.assign({ msg: '' }, metrics, {
        powerLineChart: nonstandard ? [] : lineChart,
        nonPowerLineChart: nonstandard ? lineChart : []
      }))
    }
  },

  // 项目列表（下钻后卡片）：数据源与 mapDisplay 一致（同省项目列表）
  {
    url: '/regulatory_s/project/home/projectList',
    type: 'get',
    response: config => {
      const { query } = config
      const provinceName = String(query.provinceName || '')
      const province = provinceName
        ? (PROVINCES.find(x => provinceName.indexOf(x.name) > -1) || PROVINCES[0])
        : PROVINCES[0]
      const seed = 5 + PROVINCES.indexOf(province)
      const group = buildProvinceGroup(province, seed)
      const list = (group.projectList || []).slice(0, 8).map(p => {
        // 分类口径与地图点位一致：无补贴/有补贴/合规清单
        const nat = Number(p.natProject)
        const comp = Number(p.compCatalog)
        const categoryName = nat === 1 ? (comp === 1 ? '合规清单' : '有补贴') : '无补贴'
        return {
          id: p.projectCode,
          name: p.projectName,
          status: nat % 2 === 0 ? '在建' : '运营',
          categoryName,
          cityName: p.cityName
        }
      })
      return ok({ list, total: (group.projectList || []).length })
    }
  }
]
