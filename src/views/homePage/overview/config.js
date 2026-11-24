// 首页总览配置中心：后端字段、文案与配色集中在此，字段变更只改本文件

import totalProjectsIcon from '../totalProjects.png'
import monitorProjectsIcon from '../monitorProjects.png'
import listIcon1 from '../list-icon-1.svg'
import listIcon2 from '../list-icon-2.svg'
import listIcon3 from '../list-icon-3.svg'
import listIcon4 from '../list-icon-4.svg'
import listIcon5 from '../list-icon-5.svg'
import listIcon9 from '../list-icon-9.svg'

import fullscreen1 from '../fullscreen-1.svg'
import fullscreen2 from '../fullscreen-2.svg'

import station1 from '../station-1.png'
import station2 from '../station-2.png'

export const fullscreenIcon = {
  1: fullscreen1,
  2: fullscreen2
}

// 蓝=无补贴(station-1)、绿=已补贴(station-2)；文件名与颜色不对应，按图片实际颜色映射
export const station_type = {
  '无补贴': station1,
  '已补贴': station2
}

// name 与接口一致，id 与 mock 保持一致
export const CATEGORIES = [
  { id: 'wind', name: '风电', color: '#0088ff' },
  { id: 'groundPv', name: '地面光伏', color: '#f5a623' }
]

export const INDUSTRY_ALL = '全部'

// 兼容旧引用
export const POWER_CATEGORY_ID = 'power'

// 状态筛选 → status：1在建 2运营 3在建和运营 4未选择
export const STATUS_PARAM_MAP = {
  '在建,运营': '3',
  '在建': '1',
  '运营': '2',
  '': '4'
}

export const CATEGORY_FIELD_MAP = { label: 'name', value: 'id', count: 'count' }

// 全国排名维度，unit 用于拼接 tab 标签「label(unit)」
export const RANK_TYPES = [
  { label: '项目个数', value: 'projectCount', unit: '个' },
  { label: '达标率', value: 'rate', unit: '%' },
  { label: '装机容量', value: 'capacity', unit: 'MW' },
  { label: '利用小时数', value: 'hour', unit: 'h' }
]

// 省内排名维度：无「项目个数」
export const REGION_RANK_TYPES = [
  { label: '达标率', value: 'rate', unit: '%' },
  { label: '装机容量', value: 'capacity', unit: 'MW' },
  { label: '利用小时数', value: 'hour', unit: 'h' }
]

export const RANK_FIELD_MAP = { name: 'name', value: 'value', code: 'code' }

// 地图点位字段映射（mapDisplay 接口 projectList → 点位结构）
export const POINT_FIELD_MAP = {
  id: 'id',
  name: 'name',
  lng: 'lng',
  lat: 'lat',
  category: 'category'
}

// projectColor：蓝色=无补贴、绿色=有补贴
export const POINT_CATEGORIES = [
  { id: 'noSubsidy', name: '无补贴', color: '#0088ff' },
  { id: 'subsidy', name: '已补贴', color: '#2fc25b' }
]

export function pointCategory(key) {
  return POINT_CATEGORIES.find(c => c.id === key || c.name === key) || POINT_CATEGORIES[0]
}

// 后端枚举/文案变更只改这张表
export const PROJECT_COLOR_MAP = {
  '蓝色': 'noSubsidy',
  blue: 'noSubsidy',
  '#0088ff': 'noSubsidy',
  '绿色': 'subsidy',
  green: 'subsidy',
  '#2fc25b': 'subsidy'
}

// 以 projectColor 为准，natProject 仅作旧接口兜底
export function classifyProjectColor(projectColor, item) {
  const key = String(projectColor == null ? '' : projectColor).trim().toLowerCase()
  if (PROJECT_COLOR_MAP[key]) return PROJECT_COLOR_MAP[key]
  if (key.indexOf('绿') > -1 || key.indexOf('green') > -1) return 'subsidy'
  if (!key && Number(item && item.natProject) === 1) return 'subsidy'
  return 'noSubsidy'
}

export const HOVER_FIELDS = [
  { label: '城市', field: 'cityName' },
  { label: '项目编码', field: 'projectCode' },
  { label: '补贴类型', field: 'categoryName' }
]

export const POINT_TIP = { valueField: 'settlementPrice', codeField: 'projectCode' }

// 结算电价与 Spot 电价的差值展示（绝对值 + 涨跌箭头）
export const POINT_PRICE_COMPARE = {
  priceFields: ['editWindPrice', 'settlementPrice'],
  spotField: 'spotSettlementPrice',
  digits: 4,
  upColor: '#f56c6c',
  downColor: '#2fc25b',
  flatColor: '#909399'
}

export const PROJECT_DETAIL_TEXT = {
  accessMethod: { 1: '自动', 2: '手动', 3: '接入' },
  productionTypes: { 0: '正常运行', 1: '顺歌运行', 2: '预警运行' },
  platformTransfer: { 1: '是', 2: '否', none: '不涉及' }
}

export const PROJECT_CARD_FIELDS = [
  { label: '项目类型', field: 'categoryName' },
  { label: '装机容量', field: 'capacity', unit: 'MW' },
  { label: '利用小时', field: 'outputHours', unit: 'h' },
  { label: '平准收入', field: 'income', unit: '元/kW' }
]

export const PROJECT_FIELD_MAP = { id: 'id', name: 'name', tag: 'status' }

export const STATUS_TAG_TYPE = {
  在建: 'primary',
  运营: 'success',
  未按标准: 'warning'
}

export const ENERGY_LABELS = { wind: '风电', pv: '地面光伏' }

export const ENERGY_TYPE_KEYS = ['wind', 'pv']

// operateType：1.风电 2.光伏
export const OPERATE_TYPE_MAP = { wind: '1', pv: '2' }

const POWER_METRICS = [
  { label: '项目总数', field: ['projectCount'], unit: '个' },
  { label: '待补贴项目数', field: ['subCount'], unit: '个' },
  { label: '装机容量', field: ['capacity'], unit: 'MW' },
  { label: '上网电量', field: ['onlinePower'], unit: '万kWh' },
  { label: '利用小时数', field: ['usehour', 'useHour', 'useHours'], unit: 'h' },
  { label: '结算电价', field: ['electrovalence', 'electricityPrice', 'elecPrice'], unit: '元/kWh', amount: true }
]

export const OPERATE_METRICS = {
  wind: POWER_METRICS,
  pv: POWER_METRICS
}

// oneMetric=利用小时数，yield=达标率
export const OPERATE_CHART_FIELDS = {
  wind: [
    { field: 'oneMetric', label: '风电发电利用小时数', type: 'bar', unit: 'h' },
    { field: 'yield', label: '达标率', type: 'line', unit: '%' }
  ],
  pv: [
    { field: 'oneMetric', label: '地面光伏发电利用小时数', type: 'bar', unit: 'h' },
    { field: 'yield', label: '达标率', type: 'line', unit: '%' }
  ]
}

// field 对应 queryProjectOverview 接口字段
export const OVERVIEW_METRICS = [
  { label: '建设项目', field: 'constructionCount', unit: '个', icon: totalProjectsIcon, trend: 'up' },
  { label: '运营期项目', field: 'operationCount', unit: '个', icon: monitorProjectsIcon, trend: 'up' }
]

export const PIE_FIELD_MAP = { name: 'industry', value: 'projectCount' }

// 顺序与 MANAGE_TREND_FIELDS 一一对应
export const MANAGE_COLORS = ['#08f', '#0fc98f', '#F56C6C']

// field 对应 queryBuildandOperate 返回字段；bar=柱、line=折线
export const MANAGE_TREND_FIELDS = [
  { field: 'constructionCount', label: '在建项目', type: 'bar' },
  { field: 'operationCount', label: '运营项目', type: 'bar' },
  { field: 'outstandingCount', label: '未结清项目', type: 'line' }
]

export const SUMMARY_ICONS_1 = {
  项目总数: listIcon1,
  待补贴项目数: listIcon9,
  装机容量: listIcon2,
  上网电量: listIcon3,
  利用小时数: listIcon4,
  结算电价: listIcon5
}

export const SUMMARY_ICONS_2 = {
  项目总数: listIcon1,
  待补贴项目数: listIcon9,
  装机容量: listIcon2,
  上网电量: listIcon3,
  利用小时数: listIcon4,
  结算电价: listIcon5
}

export const SUMMARY_ICONS_MAP = {
  wind: SUMMARY_ICONS_1,
  pv: SUMMARY_ICONS_2
}

export const BUILD_FILTERS = [
  { id: '运营', label: '显示运营' },
  { id: '在建', label: '显示在建' }
]

export const SUBSIDY_FILTERS = ['无补贴', '已补贴']

// fields 为候选字段，按序取第一个有效值
export const PRICE_OPTIONS = [
  { id: 'wind', label: '风电结算电价', field: 'avgWindSettlementPrice', fields: ['avgWindSettlementPrice', 'windSettlementPrice', 'avgWindSettlementPrice1'] },
  { id: 'pv', label: '光伏结算电价', field: 'avgPvSettlementPrice', fields: ['avgPvSettlementPrice', 'pvSettlementPrice', 'avgPvSettlementPrice1'] },
  { id: 'benchmark', label: '标杆电价', field: 'benchmarkPrice', fields: ['benchmarkPrice', 'benchmarkPrice1'] }
]

export function pickPriceValue(obj, fields) {
  if (!obj) return null
  const list = Array.isArray(fields) ? fields : [fields]
  for (let i = 0; i < list.length; i++) {
    const raw = obj[list[i]]
    if (raw === undefined || raw === null || raw === '') continue
    const n = typeof raw === 'number' ? raw : parseFloat(String(raw).trim())
    if (!isNaN(n)) return raw
  }
  return null
}

export const PRICE_DTO_FIELDS = [
  'avgSettlementPrice',
  'avgWindSettlementPrice',
  'avgPvSettlementPrice',
  'pvSettlementPrice',
  'windSettlementPrice',
  'benchmarkPrice',
  'spotWindSettlementPrice',
  'spotPvSettlementPrice',
  'avgWindSettlementPrice1',
  'avgPvSettlementPrice1',
  'benchmarkPrice1'
]

export function pickPriceFields(source) {
  if (!source || typeof source !== 'object') return null
  const out = {}
  PRICE_DTO_FIELDS.forEach(key => {
    const val = source[key]
    if (val !== undefined && val !== null && val !== '') out[key] = val
  })

  if (!Object.keys(out).length) {
    const wrapped = Object.keys(source).filter(key => /^additionalProperties\d*$/.test(key))
    if (wrapped.length === 1) return pickPriceFields(source[wrapped[0]])
    return null
  }
  return out
}

// 差值 = 电价 - spot 均价；>0 绿↓，<0 红↑
export const REGION_PRICE_COMPARE = [
  { label: '光伏结算电价', field: 'avgPvSettlementPrice', fields: ['avgPvSettlementPrice', 'pvSettlementPrice', 'avgPvSettlementPrice1'], spotField: 'spotPvSettlementPrice' },
  { label: '发电结算电价', field: 'avgWindSettlementPrice', fields: ['avgWindSettlementPrice', 'windSettlementPrice', 'avgWindSettlementPrice1'], spotField: 'spotWindSettlementPrice' },
  { label: '标杆结算电价', field: 'benchmarkPrice', fields: ['benchmarkPrice', 'benchmarkPrice1'], nationalOnly: true, noDiff: true }
]

// 数据起始月份
export const MIN_MONTH = '2024-01'

const now = new Date()
const monthText = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
const [MIN_Y, MIN_M] = MIN_MONTH.split('-').map(Number)
const minMonthDate = new Date(MIN_Y, MIN_M - 1, 1)
const endMonthDate = new Date(now.getFullYear(), now.getMonth() - 2, 1)
const startMonthDate = new Date(now.getFullYear(), now.getMonth() - 14, 1)
if (endMonthDate < minMonthDate) endMonthDate.setTime(minMonthDate.getTime())
if (startMonthDate < minMonthDate) startMonthDate.setTime(minMonthDate.getTime())
export const DEFAULT_MONTH_RANGE = [monthText(startMonthDate), monthText(endMonthDate)]

export const DEFAULT_QUERY = {
  level: 'country',
  provinceCode: '',
  cityCode: '',
  provinceName: '',
  regionName: '',
  categories: [],
  monthRange: DEFAULT_MONTH_RANGE.slice(),
  rankType: 'projectCount',
  energyType: 'wind'
}

export const ROOT_LEVEL = { code: 'country', name: '全国' }

// full=接口全称，name=地图短名，code=行政区划码
export const PROVINCE_LIST = [
  { code: '110000', full: '北京市', name: '北京', capital: { name: '北京', lng: 116.41, lat: 39.9 }},
  { code: '120000', full: '天津市', name: '天津', capital: { name: '天津', lng: 117.2, lat: 39.13 }},
  { code: '130000', full: '河北省', name: '河北', capital: { name: '石家庄', lng: 114.51, lat: 38.04 }},
  { code: '140000', full: '山西省', name: '山西', capital: { name: '太原', lng: 112.55, lat: 37.87 }},
  { code: '150000', full: '内蒙古自治区', name: '内蒙古', capital: { name: '呼和浩特', lng: 111.75, lat: 40.84 }},
  { code: '210000', full: '辽宁省', name: '辽宁', capital: { name: '沈阳', lng: 123.43, lat: 41.8 }},
  { code: '220000', full: '吉林省', name: '吉林', capital: { name: '长春', lng: 125.32, lat: 43.82 }},
  { code: '230000', full: '黑龙江省', name: '黑龙江', capital: { name: '哈尔滨', lng: 126.53, lat: 45.8 }},
  { code: '310000', full: '上海市', name: '上海', capital: { name: '上海', lng: 121.47, lat: 31.23 }},
  { code: '320000', full: '江苏省', name: '江苏', capital: { name: '南京', lng: 118.78, lat: 32.04 }},
  { code: '330000', full: '浙江省', name: '浙江', capital: { name: '杭州', lng: 120.15, lat: 30.27 }},
  { code: '340000', full: '安徽省', name: '安徽', capital: { name: '合肥', lng: 117.28, lat: 31.86 }},
  { code: '350000', full: '福建省', name: '福建', capital: { name: '福州', lng: 119.3, lat: 26.08 }},
  { code: '360000', full: '江西省', name: '江西', capital: { name: '南昌', lng: 115.89, lat: 28.68 }},
  { code: '370000', full: '山东省', name: '山东', capital: { name: '济南', lng: 117.0, lat: 36.65 }},
  { code: '410000', full: '河南省', name: '河南', capital: { name: '郑州', lng: 113.63, lat: 34.75 }},
  { code: '420000', full: '湖北省', name: '湖北', capital: { name: '武汉', lng: 114.3, lat: 30.59 }},
  { code: '430000', full: '湖南省', name: '湖南', capital: { name: '长沙', lng: 112.94, lat: 28.23 }},
  { code: '440000', full: '广东省', name: '广东', capital: { name: '广州', lng: 113.26, lat: 23.13 }},
  { code: '450000', full: '广西壮族自治区', name: '广西', capital: { name: '南宁', lng: 108.37, lat: 22.82 }},
  { code: '460000', full: '海南省', name: '海南', capital: { name: '海口', lng: 110.2, lat: 20.04 }},
  { code: '500000', full: '重庆市', name: '重庆', capital: { name: '重庆', lng: 106.55, lat: 29.56 }},
  { code: '510000', full: '四川省', name: '四川', capital: { name: '成都', lng: 104.07, lat: 30.57 }},
  { code: '520000', full: '贵州省', name: '贵州', capital: { name: '贵阳', lng: 106.63, lat: 26.65 }},
  { code: '530000', full: '云南省', name: '云南', capital: { name: '昆明', lng: 102.83, lat: 24.88 }},
  { code: '540000', full: '西藏自治区', name: '西藏', capital: { name: '拉萨', lng: 91.11, lat: 29.65 }},
  { code: '610000', full: '陕西省', name: '陕西', capital: { name: '西安', lng: 108.95, lat: 34.34 }},
  { code: '620000', full: '甘肃省', name: '甘肃', capital: { name: '兰州', lng: 103.83, lat: 36.06 }},
  { code: '630000', full: '青海省', name: '青海', capital: { name: '西宁', lng: 101.78, lat: 36.62 }},
  { code: '640000', full: '宁夏回族自治区', name: '宁夏', capital: { name: '银川', lng: 106.23, lat: 38.49 }},
  { code: '650000', full: '新疆维吾尔自治区', name: '新疆', capital: { name: '乌鲁木齐', lng: 87.62, lat: 43.82 }}
]

export const PROVINCE_CAPITALS = PROVINCE_LIST
  .filter(p => p.capital)
  .map(p => ({ name: p.name, city: p.capital.name, lng: p.capital.lng, lat: p.capital.lat }))

// 内蒙古/河北下钻后按拆分区域统计，不按地市
export const REGION_SPLIT = {
  内蒙古: [
    { name: '蒙西', cities: ['呼和浩特', '包头', '鄂尔多斯', '乌兰察布', '乌海', '巴彦淖尔', '锡林郭勒', '阿拉善'] },
    { name: '蒙东', cities: ['赤峰', '通辽', '呼伦贝尔', '兴安盟'] }
  ],
  河北: [
    { name: '冀北', cities: ['唐山', '张家口', '秦皇岛', '承德', '廊坊'] },
    { name: '河北南网', cities: ['石家庄', '保定', '沧州', '衡水', '邢台', '邯郸'] }
  ]
}

export function cityRegionName(provinceShortName, cityName) {
  const groups = REGION_SPLIT[provinceShortName]
  if (!groups || !cityName) return ''
  // 去行政后缀后匹配
  const name = String(cityName).replace(/(自治州|地区|市|盟|区|县)$/, '')
  if (!name) return ''
  const hit = groups.find(g => g.cities.some(c => {
    const city = String(c).replace(/(自治州|地区|市|盟|区|县)$/, '')
    return city === name || city.indexOf(name) === 0 || name.indexOf(city) === 0
  }))
  return hit ? hit.name : ''
}

// 接口/历史别名 → 地图 GeoJSON 区域名
const REGION_ALIAS = { 冀南: '河北南网', 河北南: '河北南网', 蒙西电网: '蒙西', 蒙东电网: '蒙东' }

export const REGION_META = (() => {
  const meta = {}
  Object.keys(REGION_SPLIT).forEach(province => {
    const hit = PROVINCE_LIST.find(p => p.name === province)
    REGION_SPLIT[province].forEach(region => {
      meta[region.name] = {
        name: region.name,
        province,
        provinceFull: hit ? hit.full : province,
        code: hit ? hit.code : '',
        cities: region.cities.slice()
      }
    })
  })
  return meta
})()

export function normalizeRegionName(name) {
  const key = String(name || '').trim()
  if (!key) return ''
  if (REGION_META[key]) return key
  const alias = REGION_ALIAS[key]
  return alias && REGION_META[alias] ? alias : ''
}

export function findRegion(name) {
  const normalized = normalizeRegionName(name)
  return normalized ? REGION_META[normalized] : null
}

// true=下钻区域时 provinceName 传区域名，false=传省全称
export const DRILL_REGION_AS_PROVINCE_NAME = true

// 接口全称 → 地图短名
export function provinceShortName(fullName) {
  const name = String(fullName || '').trim()
  if (!name) return ''
  const hit = PROVINCE_LIST.find(p => p.full === name)
  if (hit) return hit.name
  const prefix = PROVINCE_LIST.find(p => name.indexOf(p.full) === 0 || name.indexOf(p.name) === 0)
  if (prefix) return prefix.name
  return name.replace(/(省|市|自治区)$/, '')
}

// 兼容逗号小数（"110,807"→110.807）与字符串数字
export function toCoordNumber(value) {
  if (value === undefined || value === null || value === '') return null
  const n = parseFloat(String(value).trim().replace(/,/g, '.'))
  return isNaN(n) ? null : n
}

export function findProvince(name) {
  return PROVINCE_LIST.find(p => p.name === name || p.full === name)
}
