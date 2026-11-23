<template>
  <div ref="chart" class="chart-pie" :style="{ height: height }" />
</template>

<script>
import * as echarts from 'echarts'
import resize from '@/components/Charts/mixins/resize'
import { getChartDpr } from '../uiScale'
import { patchZoomPointer } from '../pointer'

const LEGEND_WIDTH = 140
const LEGEND_GAP = 20
const DONUT_INNER_RATIO = 0.72
const DONUT_OUTER_RATIO = 0.34
const DONUT_CENTER_RATIO = 0.25

/** 通用环形/饼图 / 玫瑰图（纯展示）；字段映射通过 fieldMap 自定义 */
export default {
  name: 'ChartPie',
  mixins: [resize],
  props: {
    data: { type: Array, default: () => [] },
    fieldMap: {
      type: Object,
      default: () => ({ name: 'name', value: 'value' })
    },
    colors: {
      type: Array,
      default: () => ['#0088ff', '#67c23a', '#e6a23c', '#f56c6c', '#909399']
    },
    height: { type: String, default: '220px' },
    centerText: { type: Object, default: () => ({}) },
    donut: { type: Boolean, default: true },
    roseType: { type: [String, Boolean], default: false },
    unit: { type: String, default: '个' },
    showLegend: { type: Boolean, default: true },
    minVisibleRatio: { type: Number, default: 0.03 },
    extraOption: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      chart: null
    }
  },
  computed: {
    renderSource() {
      return {
        data: this.data,
        fieldMap: this.fieldMap,
        colors: this.colors,
        centerText: this.centerText,
        donut: this.donut,
        roseType: this.roseType,
        unit: this.unit,
        minVisibleRatio: this.minVisibleRatio,
        showLegend: this.showLegend,
        extraOption: this.extraOption
      }
    }
  },
  watch: {
    renderSource: {
      deep: true,
      handler() {
        // 同一帧内多个 props 一起变化（接口刷新后数据/配色/中心值同时更新）只重绘一次
        this.scheduleRender()
      }
    }
  },
  mounted() {
    this.initChart()
    // 整页 zoom 放大后（2K/4K、全屏）鼠标命中点会按放大倍数偏移，换算回画布布局坐标
    this.unpatchPointer = patchZoomPointer(this.$refs.chart)
    // 容器尺寸变化（flex 自适应、面板显隐）时图表跟随缩放，window resize 覆盖不到这些场景
    // 走 resize() 而非直接 chart.resize()：圆心比例也要随宽度重算
    if (typeof ResizeObserver !== 'undefined' && this.$refs.chart) {
      this.resizeObserver = new ResizeObserver(() => this.resize())
      this.resizeObserver.observe(this.$refs.chart)
    }
  },
  beforeDestroy() {
    if (this.unpatchPointer) {
      this.unpatchPointer()
      this.unpatchPointer = null
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
    if (!this.chart) return
    this.chart.dispose()
    this.chart = null
  },
  methods: {
    pieGeometry() {
      const width = (this.chart && this.chart.getWidth()) || 0
      const height = (this.chart && this.chart.getHeight()) || 0
      if (!width || !height) return { centerRatio: this.showLegend ? DONUT_CENTER_RATIO : 0.5, outer: 0, inner: 0 }
      if (!this.showLegend) {
        const outer = Math.round(Math.max(28, Math.min(width * DONUT_OUTER_RATIO, height) / 2 - 6))
        return { centerRatio: 0.5, outer, inner: Math.round(outer * DONUT_INNER_RATIO) }
      }
      const boxWidth = Math.max(80, width - LEGEND_WIDTH - LEGEND_GAP)
      const outer = Math.round(Math.max(24, Math.min(
        (width * DONUT_OUTER_RATIO) / 2,
        boxWidth / 2,
        height / 2 - 6
      )))
      return {
        centerRatio: DONUT_CENTER_RATIO,
        outer,
        inner: Math.round(outer * DONUT_INNER_RATIO)
      }
    },
    // 字号跟随内径，限制在 13~20px 避免溢出环心
    centerTextSize(geo) {
      if (!geo.inner) return 20
      return Math.max(13, Math.min(20, Math.round(geo.inner * 0.34)))
    },
    geometryPatch(geo) {
      const patch = { center: [`${(geo.centerRatio * 100).toFixed(1)}%`, '50%'] }
      if (this.donut && geo.outer) {
        patch.radius = [geo.inner, geo.outer]
        // 字号随内径一起在 resize 时更新，避免容器变小后中心数字溢出环心
        patch.label = { fontSize: this.centerTextSize(geo), lineHeight: this.centerTextSize(geo) + 4 }
      }
      return patch
    },
    resize() {
      if (!this.chart) return
      // 页面整体缩放变了（窗口跨 1080P/2K/4K 档位）：画布像素比得重建，直接 resize 会糊
      if (this.chartDpr !== getChartDpr()) {
        this.chart.dispose()
        this.initChart()
        return
      }
      this.chart.resize()
      const geo = this.pieGeometry()
      const key = `${geo.centerRatio.toFixed(3)}|${geo.outer}`
      if (key === this._geomKey) return
      this._geomKey = key
      this.chart.setOption({ series: [this.geometryPatch(geo)] })
    },
    // 合并重绘：microtask 内去重，避免接口刷新时一次变更触发多轮 setOption
    scheduleRender() {
      if (this.renderScheduled) return
      this.renderScheduled = true
      Promise.resolve().then(() => {
        this.renderScheduled = false
        this.renderChart()
      })
    },
    initChart() {
      // 大屏 zoom 适配：画布像素比要乘上页面缩放系数，否则 4K 下图表被拉伸发虚
      this.chartDpr = getChartDpr()
      this.chart = echarts.init(this.$refs.chart, null, { devicePixelRatio: this.chartDpr })
      this.renderChart()
      this.chart.on('click', params => {
        this.$emit('item-click', params)
      })
    },
    renderChart() {
      if (!this.chart) return
      const items = this.data.map(item => ({
        name: item[this.fieldMap.name],
        value: Number(item[this.fieldMap.value]) || 0
      }))
      const total = items.reduce((sum, i) => sum + i.value, 0)

      const minVisible = total * this.minVisibleRatio
      const seriesData = items.map(item => ({
        name: item.name,
        value: item.value > 0 && item.value < minVisible ? minVisible : item.value,
        rawValue: item.value
      }))
      const realPercent = value => (total > 0 ? Math.round((value / total) * 100) : 0)

      const geo = this.pieGeometry()
      // 记录当前几何：resize 时对比，几何没变就不重复 setOption
      this._geomKey = `${geo.centerRatio.toFixed(3)}|${geo.outer}`

      const option = {
        color: this.colors,
        tooltip: {
          trigger: 'item',
          // confine：tooltip 限制在图表内，避免溢出遮挡中心数字与相邻扇区
          confine: true,
          formatter: params => {
            const raw = params.data && params.data.rawValue !== undefined ? params.data.rawValue : params.value
            return `${params.name}: ${raw}${this.unit} (${realPercent(raw)}%)`
          }
        },
        legend: this.showLegend
          ? {
            type: 'scroll',
            orient: 'vertical',
            right: 0,
            top: 'middle',
            itemWidth: 12,
            itemHeight: 12,
            itemGap: 10,
            textStyle: {
              fontSize: 12,
              color: '#606266',
              rich: {
                // label 用常规灰、value（数量+占比）加粗放大一号：占比是主要信息，不能被数量压住
                label: { color: '#606266', fontSize: 12, width: 62, align: 'left', lineHeight: 18 },
                value: { color: '#1890ff', fontSize: 13, fontWeight: 600, align: 'left', lineHeight: 18 }
              }
            },
            formatter: name => {
              const target = seriesData.find(i => i.name === name)
              if (!target) return name
              return `{label|${name}：}{value|${target.rawValue}${this.unit}(${realPercent(target.rawValue)}%)}`
            }
          }
          : { show: false },
        series: [
          {
            type: 'pie',
            roseType: this.roseType || false,
            stillShowZeroSum: false,
            radius: this.donut && geo.outer ? [geo.inner, geo.outer] : (this.donut ? ['30%', '80%'] : '55%'),
            center: [`${(geo.centerRatio * 100).toFixed(1)}%`, '50%'],
            itemStyle: {
              borderColor: '#fff',
              borderWidth: 2
            },
            avoidLabelOverlap: true,
            label: this.centerText && this.centerText.value !== undefined
              ? {
                show: true,
                position: 'center',
                formatter: () => `${this.centerText.value}`,
                fontSize: this.centerTextSize(geo),
                fontWeight: 700,
                lineHeight: this.centerTextSize(geo) + 4,
                color: '#303133'
              }
              : { show: false },
            emphasis: {
              label: { show: this.centerText && this.centerText.value !== undefined }
            },
            labelLine: { show: false },
            data: seriesData
          }
        ]
      }

      this.chart.setOption(this.mergeOption(option, this.extraOption), true)
    },
    // 浅层合并，extraOption 优先级更高（不能用 JSON 序列化，会丢失 formatter 函数）
    mergeOption(base, extra) {
      const result = Object.assign({}, base)
      if (!extra || typeof extra !== 'object') return result
      Object.keys(extra).forEach(key => {
        const value = extra[key]
        const isPlainObject = obj => obj && typeof obj === 'object' && !Array.isArray(obj)
        if (isPlainObject(value) && isPlainObject(result[key])) {
          result[key] = Object.assign({}, result[key], value)
        } else {
          result[key] = value
        }
      })
      return result
    }
  }
}
</script>

<style lang="scss" scoped>
.chart-pie {
  width: 100%;
  /* 画布为固定像素：容器变窄时先裁掉，避免溢出到父级滚动容器里产生假滚动条 */
  overflow: hidden;
}
</style>
