<template>
  <div ref="chart" class="chart-bar-line" :style="{ height: height }" />
</template>

<script>
import * as echarts from 'echarts'
import resize from '@/components/Charts/mixins/resize'
import { getChartDpr } from '../uiScale'
import { formatAmount } from '../format'
import { patchZoomPointer } from '../pointer'

export default {
  name: 'ChartBarLine',
  mixins: [resize],
  props: {
    xData: { type: Array, default: () => [] },
    series: { type: Array, default: () => [] },
    yAxisNames: { type: Array, default: () => ['', ''] },
    height: { type: String, default: '220px' },
    colors: {
      type: Array,
      default: () => ['#0088ff', '#67c23a', '##F56C6C', '#f56c6c']
    },
    showLegend: { type: Boolean, default: true },
    stack: { type: String, default: '' },
    unit: { type: String, default: '' },
    extraOption: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      chart: null,
      legendSelected: {}
    }
  },
  computed: {
    needsDataZoom() {
      const monthsPerYear = 12
      return (this.xData || []).length > monthsPerYear
    },
    renderSource() {
      return {
        xData: this.xData,
        series: this.series,
        yAxisNames: this.yAxisNames,
        colors: this.colors,
        showLegend: this.showLegend,
        stack: this.stack,
        unit: this.unit,
        extraOption: this.extraOption
      }
    }
  },
  watch: {
    renderSource: {
      deep: true,
      handler() {
        // 同一帧内 xData/series/colors 等一起变化时只重绘一次
        this.scheduleRender()
      }
    }
  },
  mounted() {
    this.initChart()
    // 整页 zoom 放大后（2K/4K、全屏）鼠标命中点会按放大倍数偏移，换算回画布布局坐标
    this.unpatchPointer = patchZoomPointer(this.$refs.chart)
    // 容器尺寸变化（flex 自适应高度、卡片显隐等）时图表跟随缩放，window resize 覆盖不到这些场景
    if (typeof ResizeObserver !== 'undefined' && this.$refs.chart) {
      this.resizeObserver = new ResizeObserver(() => {
        this.resize()
      })
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
    resize() {
      if (!this.chart) return
      // 页面整体缩放变了（窗口跨 1080P/2K/4K 档位）：画布像素比得重建，直接 resize 会糊
      if (this.chartDpr !== getChartDpr()) {
        this.chart.dispose()
        this.initChart()
        return
      }
      this.chart.resize()
      this.legendLayoutWidth = this.legendLayoutWidth || 0
      if (this.legendLayoutWidth && Math.abs(this.chart.getWidth() - this.legendLayoutWidth) > 40) {
        this.renderChart()
      }
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
      this.chart.on('legendselectchanged', params => {
        this.legendSelected = params.selected || {}
        this.chart.setOption({
          legend: {
            data: this.buildLegendData()
          }
        })
      })
      this.renderChart()
    },
    buildLegendData() {
      return this.series.map((s, index) => {
        const color = this.colors[index % this.colors.length] || s.color
        const isSelected = this.legendSelected[s.name] !== false
        const c = isSelected ? color : '#c0c4cc'
        const isLine = (s.type || 'bar') === 'line'
        const svg = isLine
          ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><line x1="0" y1="5" x2="20" y2="5" stroke="${c}" stroke-width="2"/><circle cx="10" cy="5" r="3" fill="#fff" stroke="${c}" stroke-width="2"/></svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 10"><rect width="20" height="10" rx="5" fill="${c}"/></svg>`
        return {
          name: s.name,
          icon: `image://data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
        }
      })
    },
    // canvas 为固定像素，容器高度变化后需同步尺寸，避免假溢出滚动条
    syncSize() {
      if (!this.chart || !this.$refs.chart) return
      const el = this.$refs.chart
      // 容器被隐藏（宽高为 0）时不 resize，避免把画布压成 0
      if (!el.clientWidth || !el.clientHeight) return
      if (this.chart.getWidth() !== el.clientWidth || this.chart.getHeight() !== el.clientHeight) {
        this.chart.resize()
      }
    },
    axisUnit(name) {
      const match = String(name || '').match(/[（(]([^)）]+)[)）]/)
      if (!match) return ''
      const unit = match[1].trim()
      return unit.length > 0 && unit.length <= 2 ? unit : ''
    },
    tickFormatter(name) {
      const unit = this.axisUnit(name)
      return unit ? `{value}${unit}` : '{value}'
    },
    valueUnit(axisIndex) {
      const match = String(this.yAxisNames[axisIndex] || '').match(/[（(]([^)）]+)[)）]/)
      if (match) return match[1].trim()
      if (axisIndex === 0 && this.unit) {
        const parts = String(this.unit).split(/[：:]/)
        return (parts.length > 1 ? parts[1] : parts[0]).trim()
      }
      return ''
    },
    isIntegerAxis(values) {
      return values.length > 0 && values.every(v => Number.isInteger(Number(v)))
    },
    renderChart() {
      if (!this.chart) return
      const hasSecondAxis = this.series.some(s => s.yAxisIndex === 1)
      const amountFlags = this.series.map(s => !!s.amount)
      const series = this.series.map((s, index) => {
        const color = this.colors[index % this.colors.length] || s.color
        const isLine = (s.type || 'bar') === 'line'
        const mapped = Object.assign({}, s, {
          type: isLine ? 'line' : 'bar',
          yAxisIndex: s.yAxisIndex || 0,
          // 保留外部传入的 itemStyle（如折线白心圆点），仅补默认颜色
          itemStyle: Object.assign({ color }, s.itemStyle || {}),
          barMaxWidth: isLine ? undefined : 18,
          smooth: isLine,
          stack: isLine ? undefined : (s.stack !== undefined ? s.stack : (this.stack || undefined)),
          // 折线默认样式：平滑 + 白心圆点标记
          ...(isLine ? {
            symbol: 'circle',
            symbolSize: 9,
            lineStyle: Object.assign({ width: 3, color }, s.lineStyle || {}),
            itemStyle: Object.assign(
              { color: '#fff', borderColor: color, borderWidth: 2 },
              s.itemStyle || {}
            )
          } : {})
        })
        delete mapped.amount
        return mapped
      })

      // 各 Y 轴的数据合集：用于判断该轴是否为「整数轴」（项目个数这类不能出现小数刻度）
      const axisValues = [0, 1].map(index => series
        .filter(s => (s.yAxisIndex || 0) === index)
        .reduce((acc, s) => acc.concat(s.data || []), []))
      const hasAxisName = !!(this.yAxisNames[0] || this.yAxisNames[1])
      const chartWidth = (this.chart && this.chart.getWidth()) || 0
      // 记录本次排版所用的宽度：resize() 据此判断宽度是否跨档，需要补一次重绘
      this.legendLayoutWidth = chartWidth
      const legendData = this.buildLegendData()
      const textWidth = (text, fontSize) => {
        const str = String(text == null ? '' : text)
        if (echarts.format && echarts.format.getTextRect) {
          return (echarts.format.getTextRect(str).width * fontSize) / 12
        }
        return str.split('').reduce((w, ch) => w + (/[\u4e00-\u9fa5]/.test(ch) ? fontSize : fontSize * 0.6), 0)
      }
      const legendWidth = (fontSize, itemGap) => legendData.reduce(
        (sum, d) => sum + 20 + 8 + textWidth(d.name, fontSize),
        itemGap * Math.max(0, legendData.length - 1)
      )
      const unitText = this.unit || ''
      const unitWidth = unitText ? textWidth(unitText, 12) : 0
      const legendTiers = [
        { fontSize: 13, itemGap: 16 },
        { fontSize: 12, itemGap: 10 },
        { fontSize: 11, itemGap: 6 }
      ]
      const fitsWidth = value => !chartWidth || value <= chartWidth
      const unitTotal = unitText ? unitWidth + 12 : 0
      let tier = unitText
        ? legendTiers.find(t => fitsWidth(legendWidth(t.fontSize, t.itemGap) + 2 * unitTotal))
        : null
      const showUnit = !!tier
      if (!tier) {
        tier = legendTiers.find(t => fitsWidth(legendWidth(t.fontSize, t.itemGap))) ||
          legendTiers[legendTiers.length - 1]
      }
      const legendFontSize = tier.fontSize
      const legendItemGap = tier.itemGap

      const option = {
        color: this.colors,
        tooltip: {
          trigger: 'axis',
          confine: true,
          axisPointer: { type: 'shadow' },
          // 按系列类型自绘 marker：柱=色块，折线=彩边白心圆点
          formatter: params => {
            if (!Array.isArray(params) || !params.length) return ''
            const palette = this.colors && this.colors.length ? this.colors : ['#909399']
            const title = params[0].axisValueLabel || params[0].name || ''
            const rows = params.map(p => {
              const idx = p.seriesIndex != null ? p.seriesIndex : 0
              const color = palette[idx % palette.length]
              const isLine = (series[idx] && (series[idx].type || 'bar')) === 'line'
              const marker = isLine
                ? `<span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#fff;border:2px solid ${color};box-sizing:border-box;margin-right:6px;vertical-align:-1px;"></span>`
                : `<span style="display:inline-block;width:12px;height:6px;border-radius:3px;background:${color};margin-right:6px;vertical-align:-1px;"></span>`
              // 金额系列（收入/电价）：整数部分加千分位，与指标卡口径一致
              const value = p.value == null
                ? '-'
                : (amountFlags[idx] ? formatAmount(p.value) : p.value)
              // 单位优先取系列自带 unit（配置化字段口径），没有时再跟随所属 Y 轴
              const unit = (series[idx] && series[idx].unit) || this.valueUnit((series[idx] && series[idx].yAxisIndex) || 0)
              const unitHtml = unit && p.value != null
                ? `<span style="color:#909399;margin-left:2px;">${unit}</span>`
                : ''
              return `<div style="margin-top:4px;">${marker}${p.seriesName}&nbsp;&nbsp;<b>${value}</b>${unitHtml}</div>`
            }).join('')
            return `<div style="font-weight:600;">${title}</div>${rows}`
          }
        },
        legend: this.showLegend
          ? {
            top: 0,
            left: 'center',
            icon: 'roundRect',
            itemWidth: 20,
            itemHeight: 10,
            itemGap: legendItemGap,
            inactiveColor: '#c0c4cc',
            // 内联 SVG 图标兼容 echarts 4.x（legend.data 不支持 itemStyle）
            data: legendData,
            selected: Object.assign({}, this.legendSelected),
            textStyle: { fontSize: legendFontSize, color: '#303133', fontWeight: 500 }
          }
          : { show: false },
        graphic: showUnit
          ? [{
            type: 'text',
            right: 4,
            top: 0,
            style: { text: unitText, fill: '#08f', fontSize: 12, lineHeight: 18 }
          }]
          : undefined,
        // 时间跨度超过一年挂 dataZoom：inside 缩放/平移，slider 可见窗口
        dataZoom: this.needsDataZoom ? [
          {
            type: 'inside',
            xAxisIndex: 0,
            start: 0,
            end: 100,
            zoomOnMouseWheel: true,
            moveOnMouseMove: true,
            moveOnMouseWheel: false
          },
          {
            type: 'slider',
            xAxisIndex: 0,
            start: 0,
            end: 100,
            bottom: 2,
            height: 14,
            borderColor: 'transparent',
            backgroundColor: '#f0f2f5',
            fillerColor: 'rgba(0, 136, 255, 0.16)',
            handleSize: '80%',
            handleStyle: { color: '#0088ff', borderColor: '#0088ff' },
            showDetail: false
          }
        ] : [],
        grid: {
          left: 8,
          right: hasSecondAxis ? 8 : 12,
          // 启用 dataZoom 时给底部滑块留高度，避免压住 X 轴月份标签
          bottom: this.needsDataZoom ? 26 : 4,
          top: (this.showLegend ? 36 : 16) + (hasAxisName ? 8 : 0),
          containLabel: true
        },
        xAxis: {
          type: 'category',
          data: this.xData,
          axisLine: { lineStyle: { color: '#dcdfe6' }},
          axisTick: {
            show: true,
            alignWithLabel: true,
            length: 4,
            lineStyle: { color: '#dcdfe6' }
          },
          axisLabel: { color: '#909399', fontSize: 12 }
        },
        yAxis: [
          {
            type: 'value',
            name: this.yAxisNames[0] || '',
            nameLocation: 'end',
            nameTextStyle: { color: '#909399', fontSize: 11, align: 'left' },
            nameGap: 10,
            minInterval: this.isIntegerAxis(axisValues[0]) ? 1 : undefined,
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { lineStyle: { color: '#e8ebf0', type: 'dashed' }},
            axisLabel: {
              color: '#606266',
              fontSize: 12,
              formatter: this.tickFormatter(this.yAxisNames[0])
            }
          },
          {
            type: 'value',
            name: this.yAxisNames[1] || '',
            nameLocation: 'end',
            nameTextStyle: { color: '#909399', fontSize: 11, align: 'right' },
            nameGap: 10,
            minInterval: this.isIntegerAxis(axisValues[1]) ? 1 : undefined,
            show: hasSecondAxis,
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: {
              color: '#909399',
              fontSize: 11,
              formatter: this.tickFormatter(this.yAxisNames[1])
            }
          }
        ],
        series
      }

      this.chart.setOption(Object.assign(option, this.extraOption), true)
      this.syncSize()
    }
  }
}
</script>

<style lang="scss" scoped>
.chart-bar-line {
  width: 100%;
  /* 画布是固定像素：容器变矮时先裁掉溢出部分，避免溢出到父级滚动容器里产生假滚动条 */
  overflow: hidden;
}
</style>
