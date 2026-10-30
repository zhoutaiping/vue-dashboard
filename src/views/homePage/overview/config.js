/**
 * 首页总览配置中心
 * 所有与后端字段名、展示文案、配色相关的定义集中在此，
 * 后期接口字段变更 / 页面迁移只需改本文件，不动组件
 */

import totalProjectsIcon from '../totalProjects.png'
import monitorProjectsIcon from '../monitorProjects.png'
import listIcon1 from '../list-icon-1.svg'
import listIcon2 from '../list-icon-2.svg'
import listIcon3 from '../list-icon-3.svg'
import listIcon4 from '../list-icon-4.svg'
import listIcon5 from '../list-icon-5.svg'
import listIcon6 from '../list-icon-6.svg'
import listIcon7 from '../list-icon-7.svg'
import listIcon8 from '../list-icon-8.svg'

import fullscreen1 from '../fullscreen-1.svg'
import fullscreen2 from '../fullscreen-2.svg'

import station1 from '../station-1.png'
import station2 from '../station-2.png'
import station3 from '../station-3.png'

export const fullscreenIcon = {
  1: fullscreen1, // 全屏
  2: fullscreen2 // 退出
}

// 地图点位 / 右下角图例图标：station 三色图标（蓝=无补贴、橙=已补贴、绿=合规清单，与 POINT_CATEGORIES 一一对应）
// 注意：图标颜色是画在图片里的，文件名与业务分类并不对应（station-2 是绿色、station-3 是橙色），
// 这里按图片实际颜色映射，保证打点、图例、弹窗图钉三者同色
export const station_type = {
  '无补贴': station1, // 蓝
  '已补贴': station3, // 橙
  '合规清单': station2 // 绿
}

// 行业定义（name 与接口 industry 字段一致；color 用于地图打点与图表，对齐原型配色）
export const CATEGORIES = [
  { id: 'power', name: '能源电力', color: '#0088ff' },
  { id: 'energy', name: '节能环保', color: '#f5a623' },
  { id: 'build', name: '智慧能源', color: '#9254de' },
  { id: 'traffic', name: '绿色交通', color: '#2fc25b' },
  { id: 'other', name: '其他', color: '#6f7ef2' }
]

// 行业"全部"标识（industryNum 第一项）
export const INDUSTRY_ALL = '全部'

// 「能源电力」行业 id：运营项目情况的类型选项与默认值由它决定
// 选中行业包含能源电力（含「全部」）→ 风电/光伏/非标三项，默认风电；
// 不包含能源电力 → 仅非标一项，默认非标
export const POWER_CATEGORY_ID = 'power'

// 地图状态筛选（多选集合）→ 项目总览接口 status 参数
// 接口枚举：1在建; 2运营; 3在建和运营; 4未选择（key 为筛选集合排序后逗号拼接）
export const STATUS_PARAM_MAP = {
  '在建,运营': '3',
  '在建': '1',
  '运营': '2',
  '': '4'
}

// 分类 Tab 字段映射：组件按此读取字段，后端改名只改这里
export const CATEGORY_FIELD_MAP = { label: 'name', value: 'id', count: 'count' }

// 地区排名维度（全国 queryNationalRanking 的 rankingType：projectCount·项目个数, rate·达标率, capacity·装机容量, hour·利用小时数）
export const RANK_TYPES = [
  { label: '项目个数', value: 'projectCount', unit: '个' },
  { label: '达标率', value: 'rate', unit: '%' },
  { label: '装机容量', value: 'capacity', unit: 'MW' },
  { label: '利用小时数', value: 'hour', unit: 'h' }
]

// 地区排名维度（省内 queryRegionRanking，枚举与全国不同：无"项目个数"）
export const REGION_RANK_TYPES = [
  { label: '达标率', value: 'rate', unit: '%' },
  { label: '装机容量', value: 'capacity', unit: 'MW' },
  { label: '利用小时数', value: 'hour', unit: 'h' }
]

// 排名列表字段映射
export const RANK_FIELD_MAP = { name: 'name', value: 'value', code: 'code' }

// 地图点位字段映射（mapDisplay 接口 projectList → 点位结构）
export const POINT_FIELD_MAP = {
  id: 'id',
  name: 'name',
  lng: 'lng',
  lat: 'lat',
  category: 'category'
}

// 地图点位三分类（补贴属性，key 与接口 natProject/compCatalog 推导结果一致）
export const POINT_CATEGORIES = [
  { id: 'noSubsidy', name: '无补贴', color: '#0088ff' },
  { id: 'subsidy', name: '已补贴', color: '#f5a623' },
  { id: 'compliance', name: '合规清单', color: '#2fc25b' }
]

// 分类 id / 分类名 → 分类定义（color/name/id）
// 地图打点、右下角图例、点击弹窗配色统一走这里，避免各处各写一套导致颜色不一致
export function pointCategory(key) {
  return POINT_CATEGORIES.find(c => c.id === key || c.name === key) || POINT_CATEGORIES[0]
}

// projectList 分类规则（业务口径）：
//   无补贴：natProject != 1（含 0 / null / 空）
//   已补贴：natProject = 1
//   合规：  natProject = 1 && compCatalog = 1
// 合规与已补贴条件重叠，合规更具体，优先判定（每点只归属一个分类）
export function classifyProject(natProject, compCatalog) {
  // 合规：natProject = 1 && compCatalog = 1
  if (Number(natProject) === 1 && Number(compCatalog) === 1) return 'compliance'
  // 已补贴：natProject = 1
  if (Number(natProject) === 1) return 'subsidy'
  // 无补贴：natProject != 1
  return 'noSubsidy'
}

// 地图悬浮卡片展示字段（可自由增删）
export const HOVER_FIELDS = [
  { label: '城市', field: 'cityName' },
  { label: '项目编码', field: 'projectCode' },
  { label: '补贴类型', field: 'categoryName' }
]

// 点位悬浮 mini 胶囊（原型：⚡电价 + 项目编号）：valueField 为项目级电价字段
export const POINT_TIP = { valueField: 'settlementPrice', codeField: 'projectCode' }

// 点位详情（/largeScreen/projectDetail）非标项目枚举文案
// 发电项目（POWER）与非标项目（NON_STANDARD）卡片展示字段不同（原型交互13）
export const PROJECT_DETAIL_TEXT = {
  // 接入方式：1自动 2手动 3接入
  accessMethod: { 1: '自动', 2: '手动', 3: '接入' },
  // 生产及预警：0正常运行 1顺歌运行 2预警运行
  productionTypes: { 0: '正常运行', 1: '顺歌运行', 2: '预警运行' },
  // 是否平台转发：1是 2否，null/空 = 不涉及
  platformTransfer: { 1: '是', 2: '否', none: '不涉及' }
}

// 项目卡片展示字段
export const PROJECT_CARD_FIELDS = [
  { label: '项目类型', field: 'categoryName' },
  { label: '装机容量', field: 'capacity', unit: 'MW' },
  { label: '利用小时', field: 'outputHours', unit: 'h' },
  { label: '平准收入', field: 'income', unit: '元/kW' }
]

// 项目卡片字段映射
export const PROJECT_FIELD_MAP = { id: 'id', name: 'name', tag: 'status' }

// 项目状态 → tag 类型
export const STATUS_TAG_TYPE = {
  在建: 'primary',
  运营: 'success',
  未按标准: 'warning'
}

// 能源类型 → 展示文案（项目情况卡片右上角切换：风电/光伏/非标）
export const ENERGY_LABELS = { wind: '风电', pv: '光伏', nonstandard: '非标' }

// 运营项目情况的类型页签顺序（固定三项，不随行业筛选增减）
export const ENERGY_TYPE_KEYS = ['wind', 'pv', 'nonstandard']

// 能源类型 → 接口 operateType（queryOperateDetail：1.风电; 2.光伏; 3.非标）
export const OPERATE_TYPE_MAP = { wind: '1', pv: '2', nonstandard: '3' }

// 运营项目情况指标：energyType → 指标项
// field 支持「候选字段数组」：后端同一语义在不同 operateType 下的命名/大小写并不统一 ——
// 利用小时数：风电返回 usehour（全小写）、光伏返回 useHour（驼峰）；
// 结算电价：两种发电类型都返回 electrovalence（不是 electricityPrice）。
// 取值时按数组顺序取第一个非空值，兼容后端字段拼写差异
// amount 标记金额类指标（收入 / 电价）：展示时整数部分加千分位
const POWER_METRICS = [
  { label: '项目总数', field: ['projectCount'], unit: '个' },
  { label: '装机容量', field: ['capacity'], unit: 'MW' },
  { label: '上网电量', field: ['onlinePower'], unit: '万kWh' },
  { label: '利用小时数', field: ['usehour', 'useHour', 'useHours'], unit: 'h' },
  { label: '结算电价', field: ['electrovalence', 'electricityPrice', 'elecPrice'], unit: '元/kWh', amount: true },
  { label: '千瓦收入', field: ['income'], unit: '元/kW', amount: true }
]

export const OPERATE_METRICS = {
  wind: POWER_METRICS,
  pv: POWER_METRICS,
  // 非标：指标项不同（oneMetric 语义变为度电收入）
  nonstandard: [
    { label: '项目总数', field: ['projectCount'], unit: '个' },
    { label: '填报收入', field: ['writeIncome'], unit: '万元', amount: true },
    { label: '账户收入', field: ['accountIncome'], unit: '万元', amount: true },
    { label: '达标率', field: ['yield'], unit: '%' }
  ]
}

// 运营项目情况图表：energyType → 柱线图系列映射
// 风电/光伏取 powerLineChart（oneMetric=利用小时数）；非标取 nonPowerLineChart（oneMetric=度电收入）；yield=达标率折线
// amount 标记金额系列（非标填报收入）：tooltip 数值按金额加千分位
export const OPERATE_CHART_FIELDS = {
  wind: [
    { field: 'oneMetric', label: '风电发电利用小时数', type: 'bar' },
    { field: 'yield', label: '达标率', type: 'line' }
  ],
  pv: [
    { field: 'oneMetric', label: '光伏发电利用小时数', type: 'bar' },
    { field: 'yield', label: '达标率', type: 'line' }
  ],
  nonstandard: [
    { field: 'oneMetric', label: '填报收入', type: 'bar', amount: true },
    { field: 'yield', label: '达标率', type: 'line' }
  ]
}

// 项目总览顶部指标（左栏卡片），field 对应 queryProjectOverview 接口返回字段；trend: up/down 显示趋势箭头
export const OVERVIEW_METRICS = [
  { label: '建设项目', field: 'constructionCount', unit: '个', icon: totalProjectsIcon, trend: 'up' },
  { label: '运营期项目', field: 'operationCount', unit: '个', icon: monitorProjectsIcon, trend: 'up' }
]

// 项目总览玫瑰图字段映射（industryNum: [{ industry, projectCount, percentage }]）
export const PIE_FIELD_MAP = { name: 'industry', value: 'projectCount' }

// 建设/运营管理项目图表配色（与 MANAGE_TREND_FIELDS 顺序一一对应）
export const MANAGE_COLORS = ['#08f', '#0fc98f', '#F56C6C']

// 建设/运营管理项目报表（queryBuildandOperate 返回逐月数组）→ 柱线图系列映射
// field 对应接口返回字段；type: bar=柱（参与堆叠）/ line=折线
export const MANAGE_TREND_FIELDS = [
  { field: 'constructionCount', label: '在建项目', type: 'bar' },
  { field: 'operationCount', label: '运营项目', type: 'bar' },
  { field: 'outstandingCount', label: '未结清项目', type: 'line' }
]

// 风电
export const SUMMARY_ICONS_1 = {
  项目总数: listIcon1,
  装机容量: listIcon2,
  上网电量: listIcon3,
  利用小时数: listIcon4,
  结算电价: listIcon5,
  千瓦收入: listIcon6
}

// 光伏
export const SUMMARY_ICONS_2 = {
  项目总数: listIcon1,
  装机容量: listIcon2,
  上网电量: listIcon3,
  利用小时数: listIcon4,
  结算电价: listIcon5,
  千瓦收入: listIcon6
}

// 非标
export const SUMMARY_ICON_3 = {
  项目总数: listIcon1,
  填报收入: listIcon2,
  账户收入: listIcon7,
  达标率: listIcon8
}

// energyType → 图标映射（切换风电/光伏/非标时列表图标联动）
export const SUMMARY_ICONS_MAP = {
  wind: SUMMARY_ICONS_1,
  pv: SUMMARY_ICONS_2,
  nonstandard: SUMMARY_ICON_3
}

// 地图右上角浮动菜单：项目状态筛选（多选，字段对应点位 status）
export const BUILD_FILTERS = [
  { id: '运营', label: '显示运营' },
  { id: '在建', label: '显示在建' }
]

// 地图右下角浮动菜单：补贴属性筛选（多选，key 与 station_type 一致）
export const SUBSIDY_FILTERS = ['无补贴', '已补贴', '合规清单']

// 地图左下角浮动菜单：结算电价（单选，可再点取消=不选；默认风电）
// fields 为候选字段列表（按序取第一个有效值）：真实接口可能返回 avgXxx（null）
// 或 xxx（字符串数值，如 "0.4155"），两种字段名都要兼容
// 标杆电价仅全国视图提供（下钻到省后由容器过滤掉，见 overview/index.vue 的 priceOptions）
export const PRICE_OPTIONS = [
  { id: 'wind', label: '风电结算电价', field: 'avgWindSettlementPrice', fields: ['avgWindSettlementPrice', 'windSettlementPrice'] },
  { id: 'pv', label: '光伏结算电价', field: 'avgPvSettlementPrice', fields: ['avgPvSettlementPrice', 'pvSettlementPrice'] },
  { id: 'benchmark', label: '标杆电价', field: 'benchmarkPrice', fields: ['benchmarkPrice'] }
]

// 从对象中按候选字段列表取第一个「数值有效」的原始值，兼容字符串数值（"0.4155" / " 0.3 "）；
// 全部无效（undefined/null/空串/非数值）返回 null
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

// 电价接口（/largeScreen/mapDisplay/price）的字段集合：接口只返回这几项，
// 取出来后整体覆盖到 mapDisplay 的分组/地市数据上，供着色、热力与悬浮浮层共用
export const PRICE_DTO_FIELDS = [
  'avgSettlementPrice',
  'avgWindSettlementPrice',
  'avgPvSettlementPrice',
  'pvSettlementPrice',
  'windSettlementPrice',
  'benchmarkPrice',
  'spotWindSettlementPrice',
  'spotPvSettlementPrice'
]

// 从电价接口的单条数据里摘出有效电价字段（空串/undefined 不带走，避免覆盖掉 mapDisplay 的旧值）；
// 一项都没有时返回 null，调用方据此保留原数据
export function pickPriceFields(source) {
  if (!source || typeof source !== 'object') return null
  const out = {}
  PRICE_DTO_FIELDS.forEach(key => {
    const val = source[key]
    if (val !== undefined && val !== null && val !== '') out[key] = val
  })
  // 兼容 Swagger 里 Map 值被包一层 { additionalProperties1: {...} } 的形态
  if (!Object.keys(out).length) {
    const wrapped = Object.keys(source).filter(key => /^additionalProperties\d*$/.test(key))
    if (wrapped.length === 1) return pickPriceFields(source[wrapped[0]])
    return null
  }
  return out
}

// 地图悬浮省份 / 市区浮层展示行（交互8）：
// 差值 = 电价 - spot 均价；>0 绿色 + 向下箭头，<0 红色 + 向上箭头
// 左下角电价菜单选中某维度时仅展示该行，未选中展示全部
// fields：候选字段（avgXxx 为 null 时回退 xxx，兼容字符串数值），用 pickPriceValue 取值
// nationalOnly：仅全国视图展示（下钻到省后无市区级标杆数据）
// noDiff：标杆电价本身来自 spot（无独立 spot 均价可比），只展示数值不算差值
export const REGION_PRICE_COMPARE = [
  { label: '光伏结算电价', field: 'avgPvSettlementPrice', fields: ['avgPvSettlementPrice', 'pvSettlementPrice'], spotField: 'spotPvSettlementPrice' },
  { label: '发电结算电价', field: 'avgWindSettlementPrice', fields: ['avgWindSettlementPrice', 'windSettlementPrice'], spotField: 'spotWindSettlementPrice' },
  { label: '标杆结算电价', field: 'benchmarkPrice', fields: ['benchmarkPrice'], nationalOnly: true, noDiff: true }
]

// 最小可选月份：2024-01 之前的月份不允许选择（地图电价/报表数据从 2024-01 起才有）
export const MIN_MONTH = '2024-01'

// 默认查询月份：M-4（当前月往前推 4 个月，yyyy-MM）
// 例：当前 2026-10 → 2026-06。用 new Date(y, m - 4, 1) 由 Date 处理跨年借位，无需手工换算
const now = new Date()
const defaultMonthDate = new Date(now.getFullYear(), now.getMonth() - 4, 1)
// 不超过最小可选月份（如当前为 2024 年初，M-4 会落到 2023 年，需夹到 2024-01）
const [MIN_Y, MIN_M] = MIN_MONTH.split('-').map(Number)
const minMonthDate = new Date(MIN_Y, MIN_M - 1, 1)
if (defaultMonthDate < minMonthDate) defaultMonthDate.setTime(minMonthDate.getTime())
const DEFAULT_MONTH = `${defaultMonthDate.getFullYear()}-${String(defaultMonthDate.getMonth() + 1).padStart(2, '0')}`

// 默认查询条件
export const DEFAULT_QUERY = {
  level: 'country', // country | province | city
  provinceCode: '',
  cityCode: '',
  provinceName: '',
  // 下钻到的业务区域（蒙西/蒙东、冀北/河北南网）；非拆分省份为空
  regionName: '',
  // 行业多选：选中项 = 分类 id 数组；空数组 = 全部（industry 传空）
  // 必须在默认查询里声明：Vue 2 对 data 中不存在的新增属性不做响应式转换，
  // 否则 query.categories 赋值后不会触发 reportKey / categorySelection 重算，表现为行业多选不生效
  categories: [],
  month: DEFAULT_MONTH,
  rankType: 'projectCount',
  energyType: 'wind' // 风电 / 光伏 / 非标
}

// 层级根节点
export const ROOT_LEVEL = { code: 'country', name: '全国' }

// 省份字典：full=接口返回全称，name=地图短名，code=行政区划码（排名接口不返回 code，地图下钻加载省份 GeoJSON 需按 code）
// capital：省会城市名 + 经纬度（供地图省会标记使用）
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

// 省会标记点（地图用）：[{ name(省份短名), city(省会名), lng, lat }]
export const PROVINCE_CAPITALS = PROVINCE_LIST
  .filter(p => p.capital)
  .map(p => ({ name: p.name, city: p.capital.name, lng: p.capital.lng, lat: p.capital.lat }))

// 特殊省份拆分区域（业务规则）：下钻到内蒙古/河北时，省内排名/统计按拆分区域展示，不按地市
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

// 城市名 → 所属拆分区域（蒙西/蒙东、冀北/河北南网）
// 只用于下钻后的地图展示（接口数据不变），非拆分省份或未匹配返回 ''
export function cityRegionName(provinceShortName, cityName) {
  const groups = REGION_SPLIT[provinceShortName]
  if (!groups || !cityName) return ''
  // 去行政后缀后匹配（呼和浩特市→呼和浩特、锡林郭勒盟→锡林郭勒）
  const name = String(cityName).replace(/(自治州|地区|市|盟|区|县)$/, '')
  if (!name) return ''
  const hit = groups.find(g => g.cities.some(c => {
    const city = String(c).replace(/(自治州|地区|市|盟|区|县)$/, '')
    return city === name || city.indexOf(name) === 0 || name.indexOf(city) === 0
  }))
  return hit ? hit.name : ''
}

// 区域名别名：接口/历史数据可能用别的叫法，统一归一到与地图 GeoJSON properties.name 一致的名称
// （china.json 由 scripts/build-split-map.js 生成，区域名取自 REGION_SPLIT）
const REGION_ALIAS = { 冀南: '河北南网', 河北南: '河北南网', 蒙西电网: '蒙西', 蒙东电网: '蒙东' }

// 区域字典：区域名 → { name, province(省短名), provinceFull(接口全称), code(行政码), cities }
// 由 REGION_SPLIT 派生：地图过滤 feature、点位过滤、面包屑、下钻接口入参都从这里取
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

// 区域名归一（含别名）：是已知区域返回标准区域名，否则返回空字符串
export function normalizeRegionName(name) {
  const key = String(name || '').trim()
  if (!key) return ''
  if (REGION_META[key]) return key
  const alias = REGION_ALIAS[key]
  return alias && REGION_META[alias] ? alias : ''
}

// 区域名 → 区域信息 { name, province, provinceFull, code, cities }；不是区域返回 null
export function findRegion(name) {
  const normalized = normalizeRegionName(name)
  return normalized ? REGION_META[normalized] : null
}

// 下钻到拆分区域（蒙西/蒙东、冀北/河北南网）时，接口 provinceName 传什么：
//   true  → 传区域名（后端按区域返回数据时用这个，与全国层级返回的区域 key 一致）
//   false → 传省全称（内蒙古自治区/河北省），由前端按地市名过滤区域
export const DRILL_REGION_AS_PROVINCE_NAME = true

// 接口全称（山东省/内蒙古自治区）→ 地图短名（山东/内蒙古）
export function provinceShortName(fullName) {
  const name = String(fullName || '').trim()
  if (!name) return ''
  const hit = PROVINCE_LIST.find(p => p.full === name)
  if (hit) return hit.name
  // 真实接口的项目 provinceName 可能是长地名（如「内蒙古自治区阿拉善左旗××风电场」），
  // 按省份全称/短名前缀归一，保证与地图区域名（china.json）一致
  const prefix = PROVINCE_LIST.find(p => name.indexOf(p.full) === 0 || name.indexOf(p.name) === 0)
  if (prefix) return prefix.name
  return name.replace(/(省|市|自治区)$/, '')
}

// 经纬度兼容：真实接口可能返回逗号小数（"110,807"）或字符串数字，统一转 number；无效返回 null
export function toCoordNumber(value) {
  if (value === undefined || value === null || value === '') return null
  const n = parseFloat(String(value).trim().replace(/,/g, '.'))
  return isNaN(n) ? null : n
}

// 地图短名/全称 → 省份字典项（含 code/full/name）
export function findProvince(name) {
  return PROVINCE_LIST.find(p => p.name === name || p.full === name)
}
