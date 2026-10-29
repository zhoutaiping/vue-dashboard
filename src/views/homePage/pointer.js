/**
 * 整页 CSS zoom 放大后，ECharts（zrender v4）的鼠标命中点会整体偏移，这里做换算补偿。
 *
 * 现象：1080P（zoom = 1）一切正常，放大后（2K/4K 或全屏）「鼠标停在 A 省，高亮/点中的是 B 省」，
 * 且偏离量正好等于放大倍数。
 *
 * 原因：Chrome 的 event.offsetX/offsetY 在 CSS zoom 下返回的是「放大后」的 CSS 像素，
 * 而 zrender 把它直接当作画布的布局坐标使用。画布布局宽 1815、放大 2 倍显示成 3630 时，
 * 鼠标停在显示坐标 2214 处，offsetX 就是 2214，zrender 却按布局坐标 2214 去命中
 * （实际应命中 1107）—— 放大几倍就偏几倍。
 *
 * 做法：抢在 zrender 之前把 offsetX/offsetY 换回画布布局坐标。
 * 监听挂在 window 的捕获阶段 —— 事件流是 window → document → … → 容器/画布，
 * zrender 在容器和 document 上都挂了监听，只有 window 捕获这一层必定早于它，
 * 挂在容器上会被 document 上更早的那次计算抢先（zrX 已经算完，再改 offsetX 就晚了）。
 * 缩放比由「显示宽度 / 布局宽度」实时算出，不写死页面的 uiScale。
 *
 * @param {HTMLElement} el echarts 容器（即 init 用的那个 div）
 * @returns {Function} 解绑函数，在 beforeDestroy 中调用
 */

// zrender 会用到的鼠标事件：move/down/up 决定命中与拖拽，click/dblclick 决定点选，
// wheel 决定缩放中心，都依赖 offsetX/offsetY。
// 注意 pointer 事件必须单独列：支持 Pointer Events 的浏览器里 zrender 只挂
// pointerdown/pointerup/pointermove/pointerout，鼠标事件它根本不监听；
// 而且 pointer 事件是与 mouse 事件不同的对象，只改 mousemove 的 offsetX 管不到它
const MOUSE_EVENTS = [
  // Pointer Events（Chrome/Edge/Safari 的实际路径）
  'pointerdown',
  'pointerup',
  'pointermove',
  'pointerout',
  'pointerover',
  'pointerenter',
  'pointerleave',
  'pointercancel',
  // 鼠标事件（不支持 Pointer Events 的环境 / wheel 与点选）
  'mousemove',
  'mousedown',
  'mouseup',
  'click',
  'dblclick',
  'mouseover',
  'mouseout',
  'mouseenter',
  'mouseleave',
  'contextmenu',
  'wheel',
  'mousewheel'
]

export function patchZoomPointer(el) {
  if (!el || !window.addEventListener) return () => {}

  let transformChecked = false
  let hasTransform = false

  const patch = event => {
    // 只处理落在图表内的事件：监听挂在 window 上，页面其余区域的事件原样放过
    if (!el.contains(event.target)) return

    const layoutWidth = el.clientWidth
    if (!layoutWidth) return
    const ratio = el.getBoundingClientRect().width / layoutWidth
    // 没有缩放（zoom = 1，1080P）时原样放过，零开销
    if (!ratio || Math.abs(ratio - 1) < 0.001) return

    // CSS transform 由 zrender 自己换算（transformCoordWithViewport），这里只补 zoom 的差，
    // 否则会二次修正。transform 不会变，只查一次
    if (!transformChecked) {
      const style = window.getComputedStyle(el)
      hasTransform = !!(style && style.transform && style.transform !== 'none')
      transformChecked = true
    }
    if (hasTransform) return

    const x = event.offsetX / ratio
    const y = event.offsetY / ratio
    // offsetX/offsetY 是 MouseEvent 原型上的只读 getter，用同名的自有属性遮蔽：
    // 事件对象是同一个实例，后续 zrender 读到的就是换算后的布局坐标
    Object.defineProperty(event, 'offsetX', { get: () => x, configurable: true })
    Object.defineProperty(event, 'offsetY', { get: () => y, configurable: true })
  }

  MOUSE_EVENTS.forEach(name => window.addEventListener(name, patch, true))
  return () => MOUSE_EVENTS.forEach(name => window.removeEventListener(name, patch, true))
}
