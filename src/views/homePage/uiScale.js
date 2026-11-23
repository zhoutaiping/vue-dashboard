/** 大屏适配：按 1920×1080 等比放大；用 CSS zoom 保证文字重新渲染，canvas 需自行乘缩放系数 */
export const BASE_LAYOUT_WIDTH = 1920
export const BASE_LAYOUT_HEIGHT = 1080
// 最大放大倍数（4K 封顶）
export const MAX_UI_SCALE = 2

/** 缩放系数：取宽高较小值，只放大不缩小，封顶 MAX_UI_SCALE */
export function calcUiScale(width, height) {
  if (!width || !height) return 1
  const scale = Math.min(width / BASE_LAYOUT_WIDTH, height / BASE_LAYOUT_HEIGHT)
  return Math.max(1, Math.min(MAX_UI_SCALE, Number(scale.toFixed(3))))
}

export function getUiScale() {
  if (typeof window === 'undefined') return 1
  return calcUiScale(window.innerWidth, window.innerHeight)
}

/** 画布像素比 = 设备像素比 × 页面缩放系数，避免 zoom 后 canvas 拉伸发虚 */
export function getChartDpr() {
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1
  return dpr * getUiScale()
}
