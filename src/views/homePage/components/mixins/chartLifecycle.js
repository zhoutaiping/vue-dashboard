import { getChartDpr } from '../../uiScale'

/**
 * 纯展示图表公共生命周期（与 Charts/mixins/resize 的 window 监听互补）
 *
 * 约定：组件自己实现 initChart()（建实例 + 首次渲染）；本 mixin 负责
 *   1）容器尺寸跟随（ResizeObserver —— window resize 覆盖不到 flex 自适应、面板显隐等场景）
 *   2）销毁时断开观察并释放实例
 *   3）重绘合并（scheduleRender）与跨缩放档位的实例重建
 */
export default {
  mounted() {
    this.initChart()
    if (typeof ResizeObserver === 'undefined' || !this.$refs.chart) return
    // 走 resize() 而非直接 chart.resize()：各组件还要同步重算几何/排版（圆心、图例位置等）
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(this.$refs.chart)
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
    // 页面整体缩放跨档（1080P ↔ 2K ↔ 4K）时画布像素比要重建，否则直接 resize 会糊。
    // 需要重建时销毁并重新 init，返回 true（调用方据此提前 return）
    rebuildIfDprChanged() {
      if (!this.chart || this.chartDpr === getChartDpr()) return false
      this.chart.dispose()
      this.initChart()
      return true
    }
  }
}
