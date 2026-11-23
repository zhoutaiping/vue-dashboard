/**
 * CSS zoom 放大后修正 ECharts/zrender 鼠标命中偏移：把显示像素的 offsetX/Y 换回画布布局坐标。
 * 监听挂在 window 捕获阶段以早于 zrender；返回解绑函数供 beforeDestroy 调用。
 */

// pointer 与 mouse 是不同事件对象，必须都列出并分别改写 offsetX/Y
const MOUSE_EVENTS = [
  // Pointer Events 实际路径
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
