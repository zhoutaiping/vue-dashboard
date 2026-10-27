import axios from 'axios'
import { getToken } from '@/utils/auth'

/**
 * 首页总览接口层
 * 所有请求集中在此，页面/组件不直接发请求，后期迁移只需替换本文件的实现
 * 响应不做统一 code 判定（后端以 code===200 为成功），由调用方处理
 */
const service = axios.create({
  baseURL: process.env.VUE_APP_BASE_API,
  timeout: 10000
})

service.interceptors.request.use(config => {
  const token = getToken()
  if (token) {
    config.headers['X-Token'] = token
  }
  return config
})

function request(url, params) {
  return service.get(url, { params }).then(res => res.data)
}

function postRequest(url, data) {
  return service.post(url, data).then(res => res.data)
}

// 说明：所有接口的 industry 统一传「数组」，不传字符串
//   全部 → []；多选 → ["能源电力","其他"]
// 项目总览（全国/省份）：POST /largeScreen/queryProjectOverview
// 入参 { industry, month, provinceName, status }
//   - industry: 行业类型数组，元素为 能源电力/节能环保/智慧能源/绿色交通/其他，空数组=全部
//   - month: 查询月份 yyyy-MM
//   - provinceName: 省份名称，空=全国
//   - status: 项目状态 1在建; 2运营; 3在建和运营; 4未选择
// 返回 { constructionCount, operationCount, industryNum: [{ industry, projectCount, percentage }] }
export function queryProjectOverview(data) {
  return postRequest('/largeScreen/queryProjectOverview', data)
}

// 地区排名（全国）：POST /largeScreen/queryNationalRanking
// 入参 { industry, month, rankingType, status }
//   - rankingType: projectCount·项目个数, rate·达标率, capacity·装机容量, hour·利用小时数
// 返回 data: [{ nameType(省份/电站名称), value }]
export function queryNationalRanking(data) {
  return postRequest('/largeScreen/queryNationalRanking', data)
}

// 地区排名（省内）：POST /largeScreen/queryRegionRanking
// 入参 { industry, month, provinceName, rankingType, status }
// 返回 data: [{ nameType(市/区县名称), value }]
export function queryRegionRanking(data) {
  return postRequest('/largeScreen/queryRegionRanking', data)
}

// 地图展示：POST /largeScreen/mapDisplay
// 入参 { industry, month, provinceName, status }
// 返回 data：
//   全国请求（provinceName 为空）→ 省份数组：[{ avgSettlementPrice, avgWindSettlementPrice, avgPvSettlementPrice,
//     benchmarkPrice, projectList: [{ projectName, projectCode, provinceName, cityName, longitude, latitude,
//     natProject, compCatalog, pvSettlementPrice, windSettlementPrice }] }]
//   省份请求 → 单个同结构对象（当前省）
// projectList 分类口径：
//   无补贴：natProject != 1；已补贴：natProject = 1；合规：natProject = 1 && compCatalog = 1（优先判定）
export function queryMapDisplay(data) {
  return postRequest('/largeScreen/mapDisplay', data)
}

// 建设/运营管理项目报表：POST /largeScreen/queryBuildandOperate
// 入参与项目总览一致：{ industry, month, provinceName, status }
// 返回 data: [{ month, constructionCount, operationCount, outstandingCount }]（逐月数组）
export function queryBuildandOperate(data) {
  return postRequest('/largeScreen/queryBuildandOperate', data)
}

// 运营项目情况：POST /largeScreen/queryOperateDetail
// 入参 { industry, month, operateType, provinceName, status }
//   - operateType: 类型 1.风电; 2.光伏; 3.非标
// 返回 data: { projectCount, capacity, onlinePower, useHours, electricityPrice, income,
//   writeIncome, accountIncome, yield, oneMetric,
//   powerLineChart: [{ oneMetric, yield, month }],      // 风电/光伏发电指标图（oneMetric=利用小时数）
//   nonPowerLineChart: [{ oneMetric, yield, month }] }  // 非标指标图表（oneMetric=度电收入）
export function queryOperateDetail(data) {
  return postRequest('/largeScreen/queryOperateDetail', data)
}

// 下钻后的项目列表（卡片）
export function getProjectList(params) {
  return request('/regulatory_s/project/home/projectList', params)
}

// 地图点位详情：POST /largeScreen/projectDetail
// 入参 { industry, month, projectCode, status }
//   - industry: 行业类型数组，元素为 能源电力/节能环保/智慧能源/绿色交通/其他，空数组=全部
//   - month: 查询月份 yyyy-MM
//   - projectCode: 项目编号
//   - status: 项目状态 1在建; 2运营; 3在建和运营; 6未选择
// 返回 data:
//   - projectType: POWER-发电项目, NON_STANDARD-非标项目（两类项目展示字段不同）
//   - powerGenerationDetail（POWER）: { projectName, projectCode, actualController, capacity 装机容量,
//       hours 发电利用小时数, editWindPrice 结算电价, subePrice 补贴电价 }
//   - nonStandardDetail（NON_STANDARD）: { projectName, projectCode, actualController, accessMethod 接入方式,
//       productionTypes 生产及预警, productionCapacity 项目规模, platformTransfer 是否平台转发 }
export function queryProjectDetail(data) {
  return postRequest('/largeScreen/projectDetail', data)
}
