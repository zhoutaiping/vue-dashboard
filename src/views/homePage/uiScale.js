/**
 * 大屏适配：整页按 1920×1080 设计稿等比放大，版式比例与 1080P 完全一致。
 *
 * 用 CSS zoom 而不是 transform: scale —— zoom 会真正参与排版，文字按放大后的字号重新渲染
 * （不发虚），transform 是把已栅格化的内容拉伸，4K 下字会糊。
 * 唯一的例外是 canvas：zoom 不改变 clientWidth / devicePixelRatio，
 * 图表必须自己把缩放系数乘进 pixelRatio（见 getChartDpr），否则画布按 1x 绘制后被拉伸。
 */
export const BASE_LAYOUT_WIDTH = 1920
export const BASE_LAYOUT_HEIGHT = 1080
// 最大放大倍数：覆盖到 4K；更大的屏（8K）不再放大，避免字号大到失真
export const MAX_UI_SCALE = 2

/**
 * 缩放系数 = min(视口宽 / 1920, 视口高 / 1080)，只放大不缩小并封顶 MAX_UI_SCALE。
 * 小屏保持 1（仍走现有的窄屏/中屏样式，避免字被缩到看不清）。
 * 取宽高两个方向的较小值，保证放大后整页都在视口内，不被裁切。
 */
export function calcUiScale(width, height) {
  if (!width || !height) return 1
  const scale = Math.min(width / BASE_LAYOUT_WIDTH, height / BASE_LAYOUT_HEIGHT)
  return Math.max(1, Math.min(MAX_UI_SCALE, Number(scale.toFixed(3))))
}

/** 当前视口的缩放系数（用例：图表初始化与 resize 时判断是否需要重建画布） */
export function getUiScale() {
  if (typeof window === 'undefined') return 1
  return calcUiScale(window.innerWidth, window.innerHeight)
}

/**
 * echarts 画布像素比 = 设备像素比 × 页面缩放系数。
 * 不乘缩放系数时，zoom 放大 N 倍后 canvas 仍是 1x 位图被拉伸显示 —— 图表文字、线条会发虚。
 */
export function getChartDpr() {
  const dpr = (typeof window !== 'undefined' && window.devicePixelRatio) || 1
  return dpr * getUiScale()
}
