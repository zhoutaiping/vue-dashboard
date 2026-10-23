# BMapGL + Vue 2 踩坑清单与代码模板

## 1. AK 异步加载器（统一入口）
在 `src/util/map.js` 暴露 `init(isHttps)`，组件只调用它，禁止各自 `new BMapGL.Map`。

```js
let promise = null
export function init(isHttps) {
  if (promise) return promise
  promise = new Promise((resolve, reject) => {
    if (typeof window.BMapGL !== 'undefined') { resolve(window.BMapGL); return }
    const script = document.createElement('script')
    const AK = process.env.VUE_APP_BMAP_AK // 走环境变量，禁止硬编码
    const protocol = isHttps ? 'https' : 'http'
    script.src = `${protocol}://api.map.baidu.com/api?type=webgl&v=1.0&ak=${AK}&callback=__bmapInit`
    window.__bmapInit = () => resolve(window.BMapGL)
    script.onerror = reject
    document.head.appendChild(script)
  })
  return promise
}
```

**安全要点**：AK 从 `.env.local`（加入 `.gitignore`）注入；百度控制台配置 Referer 白名单；商用场景由后端代理签发 JS API 票据。切勿把明文 key 提交到仓库（本项目 `src/util/map.js` 曾硬编码真实 AK，需整改）。

## 2. el-dialog 内坐标偏移（已踩坑）
对话框根节点被加 `transform: translate(-50%, -50%)`，导致 `map.addEventListener('click', e)` 的 `e.pixel` 与可视位置错位。还原方式：

```js
const rect = this.$refs.map.getBoundingClientRect()
const x = e.clientX - rect.left
const y = e.clientY - rect.top
// 用 map.pointToLngLat(new BMapGL.Pixel(x, y)) 得到真实经纬度
```

不要使用地图事件中的 `e.pixel`（已受 transform 影响）。

## 3. marker click 与 map click 冲突（下钻误触发）
marker 点击会冒泡到地图 click，下钻前拦截：

```js
marker.addEventListener('click', () => {
  this._pointClicked = true
  this.$emit('point-click', point)
})
this.map.addEventListener('click', e => {
  if (this._pointClicked) { this._pointClicked = false; return } // 拦截 marker 冒泡
  // 反查省份下钻
  this.geocoder.getLocation(e.point, result => {
    const province = result.addressComponents.province
    this.$emit('region-click', { province, lng: e.point.lng, lat: e.point.lat })
  })
})
```

## 4. InfoWindow 内按钮事件绑定
`InfoWindow` 的 content 是 HTML 字符串，挂在 body 下（非组件作用域）。用 `this.$nextTick` + `document.querySelector` 绑定"更多>>"按钮再 `emit` 给父组件：

```js
this.infoWindow = new BMapGL.InfoWindow(content, { width: 220, offset: new BMapGL.Size(0, -14) })
this.map.openInfoWindow(this.infoWindow, point)
this.$nextTick(() => {
  const moreEl = document.querySelector('.map-info__more')
  if (moreEl) moreEl.onclick = () => this.$emit('point-more', point)
})
```

scoped 样式对 InfoWindow 无效，相关样式（`.map-info__*`）需放在全局 `<style>` 中。

## 5. 全屏 resize
```js
document.addEventListener('fullscreenchange', () => {
  this.$nextTick(() => {
    this.map.checkResize()
    window.dispatchEvent(new Event('resize')) // 触发 echarts mixin resize
  })
})
```
全屏元素 CSS：`&:fullscreen { width: 100vw; height: 100vh; }`，canvas 子元素同尺寸。

## 6. 关闭楼宇遮挡
`map.setDisplayOptions({ building: false })`

## 7. 电子围栏绘制（多边形/矩形）
- 进入绘制模式：监听地图 `click` 收集左上/右下两点，用 `new BMapGL.Polygon(points, { strokeColor, fillColor })` 渲染，`map.addOverlay` 显示框。
- 保存前校验：两点必须**同时存在**或**同时为空**，否则红框提示并阻止保存（参考 `gpsLocalDialog.saveFence`）。
  - 都存在 → 正常保存；都为空 → 发送空值取消围栏；一有一无 → 不保存 + 红框。
- 拖拽 marker 补发坐标：`marker.addEventListener('dragend', () => { ...updateFencePolygon() })`，拖拽结束重算围栏框。

## 8. 自适应缩放
点位渲染完后：`map.setViewport(positions, { margins: [60, 40, 40, 40] })`；仅单点时 `map.centerAndZoom(point, zoom)`。下钻到省时无需关心具体坐标，直接 `setViewport` 即可自动聚焦。
