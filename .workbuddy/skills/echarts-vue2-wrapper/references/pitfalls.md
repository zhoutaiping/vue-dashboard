# 踩坑与代码模板

来源：`src/views/homePage/components/EchartsChinaMap.vue`（1085 行，生产可用实现）。下面所有片段都是该文件的真实写法，可直接复制改造。

## 1. 症状 → 原因速查

| 症状 | 根因 | 处理 |
|---|---|---|
| 图表不随窗口/侧边栏缩放 | 没挂 resize mixin，或容器无确定高度 | `mixins: [resize]` + 父级定高 |
| 切路由后 `setOption` 报 disposed | `beforeDestroy` 只置 null 没 dispose，或 dispose 后没清引用 | `dispose(); this.chart = null` |
| 生产环境 `Cannot find module './330000_full.json'` | 动态 import 带变量被 babel 降级为 require | 改走 `@/assets/maps` 静态映射表 |
| 地图白屏但无报错 | `map` 名未 `registerMap` 就 setOption | 异步加载完成后再渲染，先兜底全国图 |
| 点位/图标点不动、悬浮无反应 | `symbolSize` 传了数组 | 改成单个数字 |
| 图例越点越多、颜色不对 | `setOption(option)` 未 notMerge | `setOption(option, true)` |
| 鼠标移出地图后图标残留 | 非 canvas 区域不派发 `globalout` | 容器级 mousemove/mouseleave 兜底 |
| 全屏后地图错位 | 全屏未触发 resize | `fullscreenchange` 里 `$nextTick` + `chart.resize()` |

## 2. 省级地图按需加载（dev/prod 双环境安全）

```js
import * as provinceMapLoaders from '@/assets/maps'

async loadRegionMap() {
  const code = this.mapCode
  if (!code) { this.renderOption(); return }        // 返回全国
  if (this.mapCache[code]) { this.renderOption(); return }
  this.loading = true
  try {
    // 兼容 interop：default 导出可能被包一层
    const loaders = provinceMapLoaders.default || provinceMapLoaders
    const loader = loaders[code]
    if (!loader) throw new Error(`缺少省份地图文件: ${code}.json`)
    const mod = await loader()
    echarts.registerMap(code, (mod && mod.default) || mod)
    this.mapCache[code] = true
    this.renderOption()
  } catch (e) {
    console.error('省份地图加载失败:', e)
    this.$message.error('省份地图加载失败')
  } finally {
    this.loading = false
  }
}
```

`src/assets/maps/index.js` 由 `node scripts/download-map-data.js` 生成（数据源 DataV.GeoAtlas），**不要手改**；缺省份就重跑脚本，脚本幂等、可增量补齐。

## 3. 双 geo 底座同步（灰色底图跟随缩放平移）

不要转发「相对增量」——两层 `viewRect` 有 `layoutCenter` 偏移，同样 dx/dy/zoom 在各自投影下算出的 center 有微小差异，会随缩放累积漂移。要对齐绝对值：

```js
syncShadowGeo() {
  if (!this.chart || this.chart.isDisposed()) return
  const ecModel = this.chart.getModel()
  // 注意：echarts 4 的 getComponent({mainType,id}) 查不到 geo，必须遍历
  let main = null, shadow = null
  ecModel.eachComponent({ mainType: 'geo' }, c => {
    if (c.id === 'mapMain') main = c
    if (c.id === 'mapShadow') shadow = c
  })
  if (!main || !shadow || !main.coordinateSystem || !shadow.coordinateSystem) return
  const zoom = main.coordinateSystem.getZoom()
  const center = main.coordinateSystem.getCenter()
  shadow.coordinateSystem.setZoom(zoom)
  shadow.coordinateSystem.setCenter(center)
  shadow.setZoom(zoom)
  shadow.setCenter(center)
  // 空变换：仅触发 updateTransform 重绘
  this.chart.dispatchAction({ type: 'geoRoam', componentType: 'geo', geoId: 'mapShadow', dx: 0, dy: 0 })
}
```

触发点必须过滤自身，否则递归：

```js
this.chart.on('georoam', params => {
  if (!params || params.geoId !== 'mapMain') return
  Promise.resolve().then(() => this.syncShadowGeo())   // 微任务，与主图同帧重绘
})
```

## 4. 区域命中事件归属

区域 hover 的事件可能来自 `geo` 组件，也可能来自绑定了 `geoIndex` 的 `map` series：

```js
const isRegion = params.componentType === 'geo' || params.componentSubType === 'map'
```

只判断 `componentType === 'geo'` 会漏掉一半省份。

## 5. 悬浮图标不残留

zrender 只在画布内派发 `mousemove` / `globalout`，鼠标移到同容器内的 DOM 覆盖层（电价菜单、返回按钮、详情卡片）时不会触发，图标会粘在最后悬浮的省份上：

```js
const wrapEl = this.$refs.wrap
this._onWrapMove = e => {
  if (this.hoverIcon && e.target && e.target.tagName !== 'CANVAS') this.hoverIcon = ''
}
this._onWrapLeave = () => { this.hoverIcon = '' }
wrapEl.addEventListener('mousemove', this._onWrapMove)
wrapEl.addEventListener('mouseleave', this._onWrapLeave)
// beforeDestroy 里成对 removeEventListener 并置 null
```

## 6. 全屏

```js
bindFullscreen() {
  this._onFsChange = () => {
    this.isFullscreen = !!document.fullscreenElement
    this.$nextTick(() => { if (this.chart) this.chart.resize() })
  }
  document.addEventListener('fullscreenchange', this._onFsChange)
}
```

全屏作用于 `$refs.wrap`（容器），不是 canvas；退出走 `document.exitFullscreen()`。

## 7. 点位 symbolSize

```js
symbolSize: 22            // 正确
// symbolSize: [22, 22]   // 错误：zrender 走 scale 分支，Image.contain 不做逆变换 → 命中失效
```

带图标点位用 `symbol: 'image://' + iconUrl`，尺寸仍传数字。

## 8. 与配置中心解耦

地图的所有分类配色、电价档位、卡片字段文案来自 `src/views/homePage/overview/config.js`（`POINT_CATEGORIES` / `REGION_PRICE_COMPARE` / `PROJECT_DETAIL_TEXT`）。组件里出现 `#0088ff` 这类硬编码色值时，先看是不是应该加到 config。
