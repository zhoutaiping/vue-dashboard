export default {
  init,
  wgs84ToGcj02,
  gcj02ToBd09,
  wgs84ToBd09,
  wgs84ToBd09Point
}

export function init(isHttps) {
  const AK = 'pIEEgYph9pvzXX3IAVecgh75PuTV2vmC' // "Vecco...": "bqV9WHAbidIf3E7u7T8E9LrOmWH2kr"//;
  var BMap_URL = ''
  if (isHttps) {
    BMap_URL =
      'https://api.map.baidu.com/api?v=1.0&type=webgl&ak=' +
      AK +
      '&callback=onBMapCallback'
  } else {
    BMap_URL =
      'http://api.map.baidu.com/api?v=1.0&type=webgl&ak=' +
      AK +
      '&callback=onBMapCallback'
  }

  // BMap_URL = "https://api.map.baidu.com/api?v=1.0&type=webgl&ak=" + AK + "&callback=onBMapCallback"
  // console.log("BMap_URL",BMap_URL)

  return new Promise((resolve, reject) => {
    // 如果已加载直接返回
    if (typeof BMapGL !== 'undefined') {
      resolve(BMapGL)
      return true
    }
    if (window.allmap === 'function') { // "allmap": Unknown word.
    }

    // 百度地图异步加载回调处理
    window.onBMapCallback = function() {
      resolve(BMapGL)
    }

    // 插入script脚本
    const scriptNode = document.createElement('script')
    scriptNode.setAttribute('type', 'text/javascript')
    scriptNode.setAttribute('src', BMap_URL)
    document.body.appendChild(scriptNode)
  })
}

/* --------------------------------------------------------------------------
 * 坐标系转换
 * 接口（GPS/北斗设备）返回的是 WGS84 坐标，百度地图内部用的是 BD09 坐标，
 * 直接把 WGS84 丢给 BMapGL.Point 打点会整体偏移几百米（国内尤其明显）。
 * 转换链路：WGS84 → GCJ02（火星坐标，国测局加密）→ BD09（百度在 GCJ02 上二次加密）
 * 这里用纯本地算法实现：
 *   - 不需要 AK、不依赖百度 SDK 是否已加载，可同步调用，适合列表批量打点；
 *   - 与官方 BMapGL.Convertor.translate 的差别：后者是异步回调+有配额限制，
 *     批量点位会串行排队、还可能失败，日常渲染不划算
 * -------------------------------------------------------------------------- */

const PI = Math.PI
const X_PI = PI * 3000.0 / 180.0
// 克拉索夫斯基椭球长半轴 / 偏心率平方，GCJ02 加偏算法的既定参数
const AXIS = 6378245.0
const EE = 0.00669342162296594323

// 粗略的国内范围判断：境外坐标不做加偏（GCJ02 对境外不加密）
function outOfChina(lng, lat) {
  return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271
}

function transformLat(x, y) {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0
  ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0
  return ret
}

function transformLng(x, y) {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0
  ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0
  ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0
  return ret
}

// GCJ02 相对 WGS84 的偏移量（度）
function deltaOffset(lng, lat) {
  let dLat = transformLat(lng - 105.0, lat - 35.0)
  let dLng = transformLng(lng - 105.0, lat - 35.0)
  const radLat = lat / 180.0 * PI
  let magic = Math.sin(radLat)
  magic = 1 - EE * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / ((AXIS * (1 - EE)) / (magic * sqrtMagic) * PI)
  dLng = (dLng * 180.0) / (AXIS / sqrtMagic * Math.cos(radLat) * PI)
  return { lng: dLng, lat: dLat }
}

// WGS84 → GCJ02（火星坐标）
export function wgs84ToGcj02(lng, lat) {
  if (outOfChina(lng, lat)) return { lng, lat }
  const d = deltaOffset(lng, lat)
  return { lng: lng + d.lng, lat: lat + d.lat }
}

// GCJ02 → BD09（百度坐标）
export function gcj02ToBd09(lng, lat) {
  const z = Math.sqrt(lng * lng + lat * lat) + 0.00002 * Math.sin(lat * X_PI)
  const theta = Math.atan2(lat, lng) + 0.000003 * Math.cos(lng * X_PI)
  return { lng: z * Math.cos(theta) + 0.0065, lat: z * Math.sin(theta) + 0.006 }
}

// WGS84（GPS 原始坐标）→ BD09（百度坐标），返回 { lng, lat }；入参非法（非数值/超出范围）返回 null
// 入参允许字符串（接口常返回 "116.397428"）
export function wgs84ToBd09(lng, lat) {
  const nLng = parseFloat(lng)
  const nLat = parseFloat(lat)
  if (!isFinite(nLng) || !isFinite(nLat)) return null
  if (nLng < -180 || nLng > 180 || nLat < -90 || nLat > 90) return null
  const gcj = wgs84ToGcj02(nLng, nLat)
  return gcj02ToBd09(gcj.lng, gcj.lat)
}

// 直接返回 BMapGL.Point，用于打点：new BMapGL.Point 之前先转一次坐标
// SDK 未加载（typeof BMapGL === 'undefined'）时退化成普通 { lng, lat }，调用方自行判断
export function wgs84ToBd09Point(lng, lat) {
  const point = wgs84ToBd09(lng, lat)
  if (!point) return null
  if (typeof BMapGL === 'undefined') return point
  return new BMapGL.Point(point.lng, point.lat)
}
