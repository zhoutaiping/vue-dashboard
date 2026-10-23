---
name: echarts-vue2-wrapper
description: 在本项目（Vue 2.6 Options API + echarts）中新增或修改任何图表/地图时触发。规定 echarts 实例生命周期、resize mixin 复用、省级 GeoJSON 按需注册、setOption 全量替换、symbolSize 数值约束等铁律，避免实例泄漏、地图白屏与点位点击失效。
---

# echarts + Vue 2 图表/地图封装规范

本项目**没有使用 vue-echarts**，全部是手写包装：`echarts.init` + `mixins/resize` + `setOption`。
新增图表前先找现成组件复用，不要新造一套生命周期。

## 何时使用

- 新增统计图表（柱/线/饼/雷达/混合）
- 修改首页大屏中国地图、省份下钻、点位悬浮卡片
- 出现「图表不随窗口缩放」「切换路由后报错」「地图空白」「点位点不动」等问题时

## 复用优先级（自上而下找）

1. `src/views/homePage/components/EchartsChinaMap.vue` —— 中国/省地图（打点、下钻、visualMap 着色、悬浮卡片、全屏）
2. `src/components/Charts/MixChart.vue`、`LineMarker.vue`、`Keyboard.vue` —— 示例型图表
3. `src/views/dashboard/admin/components/{Bar,Line,Pie,Raddar}Chart.vue` —— 仪表盘四件套
4. 都不合适再新建，但**必须**照抄下面的骨架

## 铁律

1. **实例生命周期成对出现**：`mounted`（必要时 `$nextTick`）里 `echarts.init`，`beforeDestroy` 里 `dispose()` 并把 `this.chart = null`。缺一个就是内存泄漏 + 路由切换后 `setOption` 报 "Instance is disposed"。
2. **resize 必须走 mixin**：`import resize from '@/components/Charts/mixins/resize'`，`mixins: [resize]`。mixin 里已处理 `window.resize`（debounce 100ms）、侧边栏 `transitionend`、`keep-alive` 的 `activated/deactivated`。**禁止**组件内自己 `window.addEventListener('resize')`。
3. **容器高度必须有确定值**：`height: 100%` 需要父级定高，否则图表高度为 0 且不报错。优先 `ref` 取容器：`echarts.init(this.$refs.chart)`，不要 `document.getElementById`。
4. **地图只能走静态映射表**：`import * as provinceMapLoaders from '@/assets/maps'` → `loader()` → `echarts.registerMap(code, geoJson)`，并用 `mapCache` 去重。**禁止** `import(\`../map/${code}.json\`)`：dev 下 `babel-plugin-dynamic-import-node` 会把它降级成 `require` 表达式，webpack 收集不到模块，运行时 `Cannot find module`。
5. **更新一律 `setOption(option, true)`**：全量替换，防止上一次的 series / visualMap 残留导致「图例多出来一项」「颜色不跟着变」。
6. **`symbolSize` 必须是数字**：写成数组会让 zrender 走 scale 渲染分支，`Image.contain` 不做逆变换，鼠标命中/悬浮全部失效。
7. **异步渲染要兜底**：GeoJSON 未加载完成时 `map` 名未注册，此时先渲染全国图，不要直接 setOption 未注册的 map 名。
8. **配色/字段集中到 `src/views/homePage/overview/config.js`**（`POINT_CATEGORIES`、`REGION_PRICE_COMPARE`），组件只读配置，不内联色值。
9. **大屏组件保持纯展示**：props 进、事件出（`point-click` / `region-click`），不发请求——取数只在容器 `overview/index.vue`。

## 骨架

```js
import * as echarts from 'echarts'
import resize from '@/components/Charts/mixins/resize'

export default {
  name: 'XxxChart',
  mixins: [resize],
  props: { /* 数据与 fieldMap 全部由外部传入 */ },
  data() { return { chart: null } },
  watch: {
    // deep 监听数据源 → this.renderOption()
  },
  mounted() { this.$nextTick(() => this.initChart()) },
  beforeDestroy() {
    if (this.chart) { this.chart.dispose(); this.chart = null }
  },
  methods: {
    initChart() {
      this.chart = echarts.init(this.$refs.chart)
      this.renderOption()
    },
    renderOption() {
      if (!this.chart || this.chart.isDisposed()) return
      this.chart.setOption(this.buildOption(), true)
    }
  }
}
```

## 详细踩坑与代码模板

见 `references/pitfalls.md`：双 geo 底座同步（`syncShadowGeo`）、`eachComponent` 取 geo 组件、`georoam` 递归防护、容器级 mousemove 兜底隐藏悬浮图标、全屏后 `checkResize`。

## 版本注意

`package.json` 写的是 `echarts: ^6.0.0`，实际安装为 **6.1.0**（2026-10 实测），但 `EchartsChinaMap.vue` 的注释混着 echarts 4 的痕迹（如「echarts 4 的 `getComponent` 查不到 geo」）。改造旧组件前先确认版本，不要照注释推断：

```bash
node -p "require('echarts/package.json').version"
```

`BarChart.vue` 里的 `require('echarts/theme/macarons')` 在 6.1.0 仍可解析（`node_modules/echarts/theme/macarons.js` 存在）。风险不在构建，而在**主题静默不生效**：该文件是 UMD 包，requires `echarts` 自身注册主题，打包器或 `import * as echarts` 的 interop 差异下可能不注册。若发现 macarons 配色没生效，改为显式注册：

```js
import macarons from 'echarts/theme/macarons'
// 主题文件导出的是主题对象（部分版本是副作用注册），不确定时优先用 echarts.registerTheme + 自备 JSON
```
