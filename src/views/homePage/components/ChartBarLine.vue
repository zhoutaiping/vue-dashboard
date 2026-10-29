<template>
  <div ref="chart" class="chart-bar-line" :style="{ height: height }" />
</template>

<script>
import * as echarts from 'echarts'
import resize from '@/components/Charts/mixins/resize'
import { getChartDpr } from '../uiScale'
import { formatAmount } from '../format'

/**
 * 通用柱线混合图（双 Y 轴，纯展示）
 * series 由外部传入：[{ name, type: 'bar'|'line', data, yAxisIndex, color, amount }]
 * amount: true 表示该系列是金额（收入/电价），仅用于 tooltip 千分位展示，不进入 echarts 配置
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
        this.resize()
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
    // 跟随容器缩放（覆盖 mixin 的同名方法）：宽高变化都要 resize；宽度跨档时补一次重绘，
    // 因为图例/单位的排版档位是按「渲染那一刻的宽度」算出来的，全屏切换、面板显隐后
    // 若只 resize 不重绘，窄栏的紧凑图例/隐藏单位会被带到宽布局里
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
    // 画布尺寸同步：echarts 的 canvas 是固定像素，容器变矮/变高后不 resize 就会溢出容器，
    // 在可滚动的卡片里表现为「内容明明放得下却出现滚动条」的假溢出
    // （切换能源类型、指标项数变化都会改变容器高度，重绘后必须补一次尺寸同步）
    syncSize() {
      if (!this.chart || !this.$refs.chart) return
      const el = this.$refs.chart
      // 容器被隐藏（宽高为 0）时不 resize，避免把画布压成 0
      if (!el.clientWidth || !el.clientHeight) return
      if (this.chart.getWidth() !== el.clientWidth || this.chart.getHeight() !== el.clientHeight) {
        this.chart.resize()
      }
    },
    // 轴名括号里的刻度单位：「利用小时数(h)」→ h、「达标率(%)」→ %、「单位：个」→ 无
    // 只取 1~2 个字符的短单位拼到刻度上；「元/kWh」这类长单位仍只作轴名，避免刻度被撑长
    axisUnit(name) {
      const match = String(name || '').match(/[（(]([^)）]+)[)）]/)
      if (!match) return ''
      const unit = match[1].trim()
      return unit.length > 0 && unit.length <= 2 ? unit : ''
    },
    // 刻度文案：短单位直接拼在数值后（100h / 40%），无单位则纯数值
    tickFormatter(name) {
      const unit = this.axisUnit(name)
      return unit ? `{value}${unit}` : '{value}'
    },
    // tooltip 里的单位：优先取所属 Y 轴轴名括号内的单位（长单位也照用，如「元/kWh」）；
    // 没有轴名时回退到顶栏 unit 文案（「单位：个」→「个」），都没有则不带单位
    valueUnit(axisIndex) {
      const match = String(this.yAxisNames[axisIndex] || '').match(/[（(]([^)）]+)[)）]/)
      if (match) return match[1].trim()
      if (axisIndex === 0 && this.unit) {
        // 「单位：个」取冒号后的单位；直接传「个」这类纯单位时原样使用
        const parts = String(this.unit).split(/[：:]/)
        return (parts.length > 1 ? parts[1] : parts[0]).trim()
      }
      return ''
    },
    // 是否为整数轴（项目个数等）：是则禁止小数刻度，避免数据很小时出现 0.2/0.4 这类刻度
    isIntegerAxis(values) {
      return values.length > 0 && values.every(v => Number.isInteger(Number(v)))
    },
    renderChart() {
      if (!this.chart) return
      const hasSecondAxis = this.series.some(s => s.yAxisIndex === 1)
      // 金额标记按系列下标缓存在组件内：amount 仅供 tooltip 使用，不进入 echarts 配置
      const amountFlags = this.series.map(s => !!s.amount)
      const series = this.series.map((s, index) => {
        // colors prop 为权威取色来源；系列自带 color 仅作兜底，避免后端数据携带 color 时覆盖配置
        const color = this.colors[index % this.colors.length] || s.color
        const isLine = (s.type || 'bar') === 'line'
        const mapped = Object.assign({}, s, {
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
        delete mapped.amount
        return mapped
      })

      // 各 Y 轴的数据合集：用于判断该轴是否为「整数轴」（项目个数这类不能出现小数刻度）
      const axisValues = [0, 1].map(index => series
        .filter(s => (s.yAxisIndex || 0) === index)
        .reduce((acc, s) => acc.concat(s.data || []), []))
      // 是否配置了轴名/单位：有则多留一行，避免轴名与图例贴字
      const hasAxisName = !!(this.yAxisNames[0] || this.yAxisNames[1])
      // 顶栏布局：图例始终居中（顶栏视觉重心），右侧单位放得下才显示。
      // 全部按「实测文字宽度」计算，不用固定阈值 —— 本组件被多张卡片复用，每张卡片只按
      // 自己的宽度 + 自己的系列名排版，互不影响（不共享任何全局量）
      const chartWidth = (this.chart && this.chart.getWidth()) || 0
      // 记录本次排版所用的宽度：resize() 据此判断宽度是否跨档，需要补一次重绘
      this.legendLayoutWidth = chartWidth
      const legendData = this.buildLegendData()
      // 文字宽度估算：echarts.format.getTextRect 以 12px 为基准量宽，按目标字号等比换算
      const textWidth = (text, fontSize) => {
        const str = String(text == null ? '' : text)
        if (echarts.format && echarts.format.getTextRect) {
          return (echarts.format.getTextRect(str).width * fontSize) / 12
        }
        // 兜底：中文按 1 个字宽、其它按 0.6 个字宽
        return str.split('').reduce((w, ch) => w + (/[\u4e00-\u9fa5]/.test(ch) ? fontSize : fontSize * 0.6), 0)
      }
      // 单项目宽 = 图标 20 + 图标与文字间距 6 + 文字宽 + 2 容错；再加项目间距
      const legendWidth = (fontSize, itemGap) => legendData.reduce(
        (sum, d) => sum + 20 + 8 + textWidth(d.name, fontSize),
        itemGap * Math.max(0, legendData.length - 1)
      )
      const unitText = this.unit || ''
      const unitWidth = unitText ? textWidth(unitText, 12) : 0
      // 图例字号/间距三档降级：13/16 → 12/10 → 11/6，逐档试到图例本身放得下为止。
      // 图例不再「放不下就靠左」：窄栏只缩字号，位置始终居中，避免同一组件在不同卡片里
      // 一会儿居中一会儿靠左
      const legendTiers = [
        { fontSize: 13, itemGap: 16 },
        { fontSize: 12, itemGap: 10 },
        { fontSize: 11, itemGap: 6 }
      ]
      const fitsWidth = value => !chartWidth || value <= chartWidth
      // 居中后图例两侧各留 (W - legendW) / 2；单位占「单位宽 + 4 贴边 + 8 间距」，
      // 只有 legendW + 2 × 单位占位 ≤ W 时两者才不会叠字
      const unitTotal = unitText ? unitWidth + 12 : 0
      // 第一轮：优先「居中 + 带单位」，从大字号往下找，命中的第一档即最终档
      let tier = unitText
        ? legendTiers.find(t => fitsWidth(legendWidth(t.fontSize, t.itemGap) + 2 * unitTotal))
        : null
      const showUnit = !!tier
      // 第二轮：没有单位（或带单位放不下）时，只保证图例本身居中放得下
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
          // 容器加了 overflow: hidden（裁掉溢出的画布），浮层需限制在图表内，否则贴边时会被裁掉
          confine: true,
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
              // 金额系列（收入/电价）：整数部分加千分位，与指标卡口径一致
              const value = p.value == null
                ? '-'
                : (amountFlags[idx] ? formatAmount(p.value) : p.value)
              // 单位跟随系列所在 Y 轴（柱=h/个、折线=%），与轴名/刻度保持同一口径
              const unit = this.valueUnit((series[idx] && series[idx].yAxisIndex) || 0)
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
            // 图例始终居中（顶栏视觉重心），单位贴右边缘收尾；窄面板只缩字号，不改变居中
            left: 'center',
            icon: 'roundRect',
            itemWidth: 20,
            itemHeight: 10,
            itemGap: legendItemGap,
            inactiveColor: '#c0c4cc',
            // 项目当前为 echarts 4.x，legend.data 不支持 itemStyle（5.1+ 才有）；
            // 折线圆点是白心填充（itemStyle.color=#fff），图例取系列填充色会渲染成白色不可见，
            // 这里为每个图例项生成内联 SVG 彩色圆角图标，兼容 4.x/5.x
            data: legendData,
            // renderChart 是 notMerge 全量替换，需回填选中状态，避免图例切换被重置
            selected: Object.assign({}, this.legendSelected),
            textStyle: { fontSize: legendFontSize, color: '#303133', fontWeight: 500 }
          }
          : { show: false },
        // 单位标签：与图例同一行、贴右边缘，主题蓝 #08f（与数值同一套主色），小一号不抢图例
        // lineHeight 与图例文字（13px，行高约 18）对齐，二者在同一基线上，顶栏才整齐；
        // right 留 4px，避免贴边被裁；空间不足时（showUnit 为 false）隐藏，优先保证图例可读
        graphic: showUnit
          ? [{
            type: 'text',
            right: 4,
            top: 0,
            style: { text: unitText, fill: '#08f', fontSize: 12, lineHeight: 18 }
          }]
          : undefined,
        // 顶部留白：图例 18 + 轴名一行 22（无轴名时不占这一行，把高度还给绘图区）
        grid: {
          left: 8,
          right: hasSecondAxis ? 8 : 12,
          bottom: 4,
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
            // 轴名默认居中于轴顶，窄容器下左半截会被裁掉（只剩"/kWh"）；
            // 改为左对齐锚定轴顶向右延伸，保证完整落在容器内
            // nameLocation: 'end' 固定贴轴顶，与图例行（top 0~18）分行显示，不互相压字
            nameLocation: 'end',
            nameTextStyle: { color: '#909399', fontSize: 11, align: 'left' },
            nameGap: 10,
            // 整数轴（项目个数等）禁止小数刻度：数据很小时不会冒出 0.2/0.4 这类刻度
            minInterval: this.isIntegerAxis(axisValues[0]) ? 1 : undefined,
            axisLine: { show: false },
            axisTick: { show: false },
            splitLine: { lineStyle: { color: '#e8ebf0', type: 'dashed' }},
            axisLabel: {
              color: '#606266',
              fontSize: 12,
              // 刻度带单位（轴名括号内的短单位）：100h / 40%，避免出现无单位数值
              formatter: this.tickFormatter(this.yAxisNames[0])
            }
          },
          {
            type: 'value',
            name: this.yAxisNames[1] || '',
            // 右轴镜像：右对齐锚定轴顶向左延伸，避免超出右缘
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
      // 重绘后按容器实际尺寸校正画布（切换类型导致高度变化时尤需）
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
