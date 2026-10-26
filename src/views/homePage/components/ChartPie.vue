<template>
  <div ref="chart" class="chart-pie" :style="{ height: height }" />
</template>

<script>
import * as echarts from 'echarts'
import resize from '@/components/Charts/mixins/resize'

// 右侧竖向图例占用的宽度（px）：图标 12 + label 70 + 数值/占比文字 ≈ 168
// 环形图圆心按「容器宽 - 图例宽」剩余空间居中，宽度越窄圆心越靠左
const LEGEND_WIDTH = 168

/**
 * 通用环形/饼图 / 南丁格尔玫瑰图（纯展示，不含业务）
 * 字段名通过 fieldMap 自定义：{ name, value }
 * 需要深度定制时传 extraOption，会与默认配置合并
 */
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
    // 环心文案：{ label, value }
    centerText: { type: Object, default: () => ({}) },
    donut: { type: Boolean, default: true },
    // 南丁格尔玫瑰图：'radius' 半径映射值 / 'area' 圆心角相等（经典玫瑰）/ false 普通饼图
    roseType: { type: [String, Boolean], default: false },
    unit: { type: String, default: '个' },
    showLegend: { type: Boolean, default: true },
    // 最小可见占比：低于该比例的项抬到最小可见值渲染，避免极小类目（如"其他"）扇区看不见
    // tooltip / 图例始终显示真实数值与真实占比；传 0 可关闭
    minVisibleRatio: { type: Number, default: 0.03 },
    // 需要深度定制时传入，与默认 option 浅合并（优先级更高）
    extraOption: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      chart: null
    }
  },
  computed: {
    // 渲染源：所有影响渲染的 props 汇总，统一监听，避免遗漏（如仅 centerText/colors 变化不重绘）
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
    // 容器尺寸变化（flex 自适应、面板显隐）时图表跟随缩放，window resize 覆盖不到这些场景
    // 走 resize() 而非直接 chart.resize()：圆心比例也要随宽度重算
    if (typeof ResizeObserver !== 'undefined' && this.$refs.chart) {
      this.resizeObserver = new ResizeObserver(() => this.resize())
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
    // 圆心横向比例：右侧竖向图例固定占 LEGEND_WIDTH，剩余空间居中放置环形图。
    // 面板越窄圆心越靠左（在 0.20~0.32 之间连续变化），避免环形图与图例文字互挤或被挤出左边界；
    // 容器宽度未知（首帧未布局）时按原设计 0.28 兜底
    centerRatioFor(width) {
      if (!width) return 0.28
      return Math.min(0.32, Math.max(0.2, ((width - LEGEND_WIDTH) / 2) / width))
    },
    // 容器尺寸变化：缩放画布；宽度变化导致圆心比例变化时再微调一次圆心
    // （高度变化不影响圆心比例，跳过 setOption 避免连续缩放时的无谓重绘）
    resize() {
      if (!this.chart) return
      this.chart.resize()
      if (!this.showLegend) return
      const ratio = Number(this.centerRatioFor(this.chart.getWidth()).toFixed(3))
      if (ratio === this._centerRatio) return
      this._centerRatio = ratio
      this.chart.setOption({
        series: [{ center: [`${(ratio * 100).toFixed(1)}%`, '50%'] }]
      })
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
      this.chart = echarts.init(this.$refs.chart)
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

      // 渲染数据：极小占比项抬到最小可见值保证扇区可见，rawValue 保存真实值
      const minVisible = total * this.minVisibleRatio
      const seriesData = items.map(item => ({
        name: item.name,
        value: item.value > 0 && item.value < minVisible ? minVisible : item.value,
        rawValue: item.value
      }))
      // 按真实值计算占比（与渲染值无关）
      const realPercent = value => (total > 0 ? Math.round((value / total) * 100) : 0)

      // 圆心横向位置：随容器宽度自适应（越窄越靠左，见 centerRatioFor）
      const centerRatio = this.showLegend ? this.centerRatioFor(this.chart.getWidth()) : 0.5
      // 记录当前比例：resize 时对比，比例没变就不重复 setOption
      this._centerRatio = Number(centerRatio.toFixed(3))

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
            // 原型：每个类型项有最小行高（图标 12 + 行距 16 ≈ 28px/行），列表更舒展、易点选
            itemWidth: 12,
            itemHeight: 12,
            itemGap: 16,
            textStyle: {
              fontSize: 12,
              color: '#606266',
              // 图例两列排版：label 深色固定宽度对齐，value 蓝色（数值+占比）
              rich: {
                label: { color: '#303133', fontSize: 12, width: 70, align: 'left', lineHeight: 18 },
                value: { color: '#1890ff', fontSize: 12, fontWeight: 600, align: 'left', lineHeight: 18 }
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
            radius: this.donut ? ['25%', '68%'] : '55%',
            center: this.showLegend
              ? [`${(centerRatio * 100).toFixed(1)}%`, '50%']
              : ['50%', '50%'],
            // 扇区之间白色缝隙（原型效果）
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
                fontSize: 22,
                fontWeight: 700,
                lineHeight: 26,
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
