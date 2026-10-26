<template>
  <div ref="chart" class="chart-bar-line" :style="{ height: height }" />
</template>

<script>
import * as echarts from 'echarts'
import resize from '@/components/Charts/mixins/resize'

/**
 * 通用柱线混合图（双 Y 轴，纯展示）
 * series 由外部传入：[{ name, type: 'bar'|'line', data, yAxisIndex, color }]
 * 不绑定任何业务字段，便于迁移复用
 */
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
    // 右上角单位文案（如：单位：个），空则不显示
    unit: { type: String, default: '' },
    extraOption: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      chart: null,
      // 图例选中状态 { 系列名: true|false }，用于隐藏时图标联动置灰
      legendSelected: {}
    }
  },
  computed: {
    // 渲染源：所有影响渲染的 props 汇总，统一监听，避免遗漏（如仅 yAxisNames/unit/colors 变化不重绘）
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
    // 容器尺寸变化（flex 自适应高度、卡片显隐等）时图表跟随缩放，window resize 覆盖不到这些场景
    if (typeof ResizeObserver !== 'undefined' && this.$refs.chart) {
      this.resizeObserver = new ResizeObserver(() => {
        if (this.chart) this.chart.resize()
      })
      this.resizeObserver.observe(this.$refs.chart)
    }
  },
  beforeDestroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
    if (!this.chart) return
    this.chart.dispose()
    this.chart = null
  },
  methods: {
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
      this.chart = echarts.init(this.$refs.chart)
      // 点击图例切换系列显隐时，image:// 图标 echarts 不会自动置灰，这里联动重建图例图标
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
    // 构建图例数据：柱系列用色块图标，折线系列用“横线+圆点”图标；取消选中统一置灰
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
    renderChart() {
      if (!this.chart) return
      const hasSecondAxis = this.series.some(s => s.yAxisIndex === 1)
      const series = this.series.map((s, index) => {
        // colors prop 为权威取色来源；系列自带 color 仅作兜底，避免后端数据携带 color 时覆盖配置
        const color = this.colors[index % this.colors.length] || s.color
        const isLine = (s.type || 'bar') === 'line'
        return Object.assign({}, s, {
          type: isLine ? 'line' : 'bar',
          yAxisIndex: s.yAxisIndex || 0,
          // 保留外部传入的 itemStyle（如折线白心圆点），仅补默认颜色
          itemStyle: Object.assign({ color }, s.itemStyle || {}),
          barMaxWidth: isLine ? undefined : 18,
          smooth: isLine,
          // stack 只对柱生效，折线不参与堆叠
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
      })

      const option = {
        color: this.colors,
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          // 折线系列 itemStyle.color=#fff（白心圆点），默认 marker 会渲染成白色圆点看不见；
          // 按系列类型自绘 marker 与图例一致：柱=色块，折线=彩边白心圆点
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
              const value = p.value == null ? '-' : p.value
              return `<div style="margin-top:4px;">${marker}${p.seriesName}&nbsp;&nbsp;<b>${value}</b></div>`
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
            itemGap: 24,
            inactiveColor: '#c0c4cc',
            // 项目当前为 echarts 4.x，legend.data 不支持 itemStyle（5.1+ 才有）；
            // 折线圆点是白心填充（itemStyle.color=#fff），图例取系列填充色会渲染成白色不可见，
            // 这里为每个图例项生成内联 SVG 彩色圆角图标，兼容 4.x/5.x
            data: this.buildLegendData(),
            // renderChart 是 notMerge 全量替换，需回填选中状态，避免图例切换被重置
            selected: Object.assign({}, this.legendSelected),
            textStyle: { fontSize: 13, color: '#303133', fontWeight: 500 }
          }
          : { show: false },
        graphic: this.unit
          ? [{
            type: 'text',
            right: 0,
            // 与图例文字（top:0，fontSize 13，行高约 18px）垂直居中对齐
            top: 5,
            style: { text: this.unit, fill: '#08f', fontSize: 13, fontWeight: 500, textVerticalAlign: 'middle' }
          }]
          : undefined,
        grid: { left: 8, right: hasSecondAxis ? 8 : 12, bottom: 4, top: this.showLegend ? 36 : 16, containLabel: true },
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
            // 轴名默认居中于轴顶，窄容器下左半截会被裁掉（只剩"/kWh"）；
            // 改为左对齐锚定轴顶向右延伸，保证完整落在容器内
            nameTextStyle: { color: '#909399', fontSize: 11, align: 'left' },
            nameGap: 10,
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { lineStyle: { color: '#e8ebf0', type: 'dashed' }},
            axisLabel: { color: '#606266', fontSize: 12 }
          },
          {
            type: 'value',
            name: this.yAxisNames[1] || '',
            // 右轴镜像：右对齐锚定轴顶向左延伸，避免超出右缘
            nameTextStyle: { color: '#909399', fontSize: 11, align: 'right' },
            nameGap: 10,
            show: hasSecondAxis,
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { color: '#909399', fontSize: 11, formatter: '{value}' }
          }
        ],
        series
      }

      this.chart.setOption(Object.assign(option, this.extraOption), true)
    }
  }
}
</script>

<style lang="scss" scoped>
.chart-bar-line {
  width: 100%;
}
</style>
