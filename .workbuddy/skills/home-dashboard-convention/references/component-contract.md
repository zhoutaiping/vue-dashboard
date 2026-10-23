# 通用展示组件字段契约

所有组件位于 `src/components/Dashboard/`，**纯展示、零请求**，通过 props 接收数据，通过事件向上通信。后端字段改名只需修改 `config.js` 中的字段映射，组件本身不动。

| 组件 | 关键 props | 字段映射 / 配置 | 事件 |
|------|-----------|----------------|------|
| `PanelCard` | `title` `subTitle` `icon` `bodyStyle` | 面板容器；插槽 `header` / `extra` / 默认 | — |
| `MetricList` | `items` `fieldMap{label,value,unit,color}` `columns` `formatter` | 指标列表；`formatter(raw,item)` 自定义数值 | — |
| `ChartPie` | `data` `fieldMap{name,value}` `colors` `centerText` `extraOption` | 环形/饼图；`extraOption` 深度合并默认配置 | `item-click` |
| `ChartBarLine` | `xData` `series[{name,type,data,yAxisIndex,color}]` `yAxisNames` `stack` `extraOption` | 柱线混合双 Y 轴；series 由外部传入 | — |
| `RankList` | `items` `tabs` `activeTab` `fieldMap{name,value,code}` `unit` `max` | 排名列表；`tabs` 为排名维度（建设个数/达标率…） | `update:activeTab` `row-click` |
| `CategoryTabs` | `items` `value(v-model)` `fieldMap{label,value,count}` `activeColor` | 分类 Tab（带数量角标） | `input` `change` |
| `LevelTabs` | `items[{code,name}]` `value(v-model)` | 层级下钻 Tab（首页/省/市），首项不可关闭 | `input` `change` `close` |
| `MapViewer` | `points` `categories` `fieldMap{id,name,lng,lat,category}` `layers` `activeLayers(.sync)` `hoverFields` `center` `zoom` | 地图打点/悬浮/图层/全屏；图标按分类颜色动态生成 SVG | `ready` `point-click` `point-more` `region-click` `layer-change` `fullscreen-change` |
| `ProjectCardList` | `items` `fields[{label,field,unit}]` `fieldMap{id,name,tag}` `tagTypeMap` `showMore` | 项目卡片列表；展示字段由 `fields` 配置 | `item-click` `more` |

## 配置中心示例（config.js）
```js
export const CATEGORIES = [
  { id: 'power', name: '能源电力', color: '#0088ff' },
  { id: 'energy', name: '节能环保', color: '#67c23a' }
]
export const RANK_FIELD_MAP = { name: 'name', value: 'value', code: 'code' }
export const POINT_FIELD_MAP = { id: 'id', name: 'name', lng: 'lng', lat: 'lat', category: 'category' }
export const HOVER_FIELDS = [
  { label: '项目类型', field: 'categoryName' },
  { label: '装机容量', field: 'capacity', unit: 'MW' }
]
```

## 容器取数范式（index.vue）
- 所有接口在 `created` + `watch(query)` 中通过 `safeRequest` 并发请求（`Promise.all` + 单接口 try/catch，互不拖累）。
- 子组件只 `:data` 传值、`@event` 收事件，例如：
  ```html
  <ChartPie :data="pieData" :field-map="pieFieldMap" @item-click="handlePieClick" />
  <RankList :items="rankList" :field-map="RANK_FIELD_MAP" @row-click="handleRankClick" />
  ```
