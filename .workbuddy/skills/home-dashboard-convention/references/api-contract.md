# 接口契约与数据结构

接口层集中在 `src/api/homeOverview.js`（axios 实例，`baseURL = VUE_APP_BASE_API`，请求头带 `X-Token`）。dev 下 `baseURL=/dev-api`，由 `mock-server` 命中 `mock/homeOverview.js`；生产走真实后端。

**统一响应**：`{ code: 200, msg: 'success', data: {...} }`。成功判定 `res.code === 200`，由调用方处理（不依赖 `@/utils/request` 的 20000 约定，避免与后端 code=200 冲突）。

## 接口清单
| 方法 | URL | 入参（query） | data 结构 |
|------|-----|--------------|-----------|
| GET | `/regulatory_s/project/home/overview` | `level` `provinceCode` `category` | `{ totalProjects, monitorProjects, categories:[{id,name,count,color}] }` |
| GET | `/regulatory_s/project/home/regionRank` | `level` `provinceCode` `rankType(count\|standard\|contribution\|hours)` | `{ list:[{code,name,value}] }` |
| GET | `/regulatory_s/project/home/mapPoints` | `level` `provinceCode` `category` | `{ list:[{id,name,lng,lat,category,categoryName,status,capacity,outputHours,income}] }` |
| GET | `/regulatory_s/project/home/manageTrend` | `level` `energyType(wind\|pv)` | `{ xAxis:[月份], series:[{name,type,data,yAxisIndex}] }` |
| GET | `/regulatory_s/project/home/projectSummary` | `level` `provinceCode` | `{ list:[{label,value,unit}] }` |
| GET | `/regulatory_s/project/home/hoursTrend` | `level` | `{ xAxis, series:[{name,type:'bar',data},{name,type:'line',yAxisIndex:1,data}] }` |
| GET | `/regulatory_s/project/home/projectList` | `level` `provinceCode` `category` | `{ list:[{id,name,status,categoryName,capacity,outputHours,income}], total }` |

## 约定
1. 字段名与后端对齐，如需改名改 `config.js` 字段映射即可。
2. 下钻参数：`level=country|province|city`，`provinceCode` 用省份 code（6 位行政区划码），`cityCode` 用下钻到的地市标识。
3. 地区排名 Mock 在全国级返回省份、省级返回该省地市；真实后端替换 `getRegionRank` 实现即可，组件与容器零改动。
4. 新增字段只需扩展对应 `data` 对象并在 `config.js` 的展示配置里引用，不要改组件代码。
