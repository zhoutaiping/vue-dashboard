 /**
 * 生成「内蒙/河北分区」全国底图：src/assets/maps/china-region.json
 *
 * 背景：全屏地图的分区完全由 GeoJSON 的 properties.name 决定（数据只按 name 匹配上色/下钻）。
 * 业务上内蒙古要拆成 蒙西/蒙东、河北要拆成 冀北/河北南网，因此需要把原省级面
 * 替换成由地市面合并（union）出来的 4 个区域面：
 *   - 只拼接坐标不合并：区域内部仍保留地市轮廓线，看不出两个区域的分界；
 *   - 做多边形并集：区域内部的市界被消除，两区域之间自然形成一条省界线。
 *
 * 用法：node scripts/build-split-map.js
 * 依赖：polygon-clipping（devDependency，仅脚本使用，不进打包产物）
 */
const fs = require('fs')
const path = require('path')
const { union } = require('polygon-clipping')

const MAP_DIR = path.join(__dirname, '../src/assets/maps')
const china = require('../src/assets/maps/china.json')

// 与 src/views/homePage/overview/config.js 的 REGION_SPLIT 保持一致
// （前端配置是 ESM，脚本无法直接 require，改分区时两处同步修改）
const SPLITS = [
  {
    province: '内蒙古',
    code: '150000',
    regions: [
      { name: '蒙西', cities: ['呼和浩特', '包头', '鄂尔多斯', '乌兰察布', '乌海', '巴彦淖尔', '锡林郭勒', '阿拉善'] },
      { name: '蒙东', cities: ['赤峰', '通辽', '呼伦贝尔', '兴安盟'] }
    ]
  },
  {
    province: '河北',
    code: '130000',
    regions: [
      { name: '冀北', cities: ['唐山', '张家口', '秦皇岛', '承德', '廊坊'] },
      { name: '河北南网', cities: ['石家庄', '保定', '沧州', '衡水', '邢台', '邯郸'] }
    ]
  }
]

// 去掉行政后缀：呼和浩特市→呼和浩特、锡林郭勒盟→锡林郭勒
const shortName = name => String(name).replace(/(市|盟|地区|自治州|自治区|省)$/, '')

// Polygon / MultiPolygon → polygon-clipping 的 Polygon 数组（Ring[]）
const toPolygons = geometry =>
  geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates

// 坐标压缩到 4 位小数（约 11m 精度，地图渲染足够，体积明显变小）
const roundCoord = c => c.map(n => Math.round(n * 10000) / 10000)
const roundRing = ring => ring.map(roundCoord)
const roundPolygon = polygon => polygon.map(roundRing)
const roundMultiPolygon = multi => multi.map(roundPolygon)

function bboxOf(ring) {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  ring.forEach(([x, y]) => {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
  })
  return { minX, minY, maxX, maxY }
}

function bboxOfMulti(multiPolygon) {
  let box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
  multiPolygon.forEach(polygon => {
    const b = bboxOf(polygon[0])
    box = {
      minX: Math.min(box.minX, b.minX),
      minY: Math.min(box.minY, b.minY),
      maxX: Math.max(box.maxX, b.maxX),
      maxY: Math.max(box.maxY, b.maxY)
    }
  })
  return box
}

// 射线法判断点是否在多边形内（含孔洞判断）
function pointInRing(point, ring) {
  const [x, y] = point
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

function pointInPolygon(point, polygon) {
  if (!pointInRing(point, polygon[0])) return false
  for (let i = 1; i < polygon.length; i++) {
    if (pointInRing(point, polygon[i])) return false
  }
  return true
}

function pointInMulti(point, multiPolygon) {
  return multiPolygon.some(polygon => pointInPolygon(point, polygon))
}

// 区域标签位置（cp）：先取最大多边形的外接矩形中心；
// 若该点落在区域外（如蒙西是狭长弧形），再在矩形内做网格扫描，取离中心最近的内点。
// 合并后的面形状不规则，直接算质心容易飘到区域外，网格扫描最稳。
function labelCenter(multiPolygon) {
  let best = multiPolygon[0]
  let bestBox = bboxOf(multiPolygon[0][0])
  multiPolygon.forEach(polygon => {
    const b = bboxOf(polygon[0])
    const area = (b.maxX - b.minX) * (b.maxY - b.minY)
    const bestArea = (bestBox.maxX - bestBox.minX) * (bestBox.maxY - bestBox.minY)
    if (area > bestArea) {
      best = polygon
      bestBox = b
    }
  })

  const cx = (bestBox.minX + bestBox.maxX) / 2
  const cy = (bestBox.minY + bestBox.maxY) / 2
  if (pointInPolygon([cx, cy], best)) return [cx, cy]

  const steps = 80
  let candidate = null
  let candidateDist = Infinity
  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      const x = bestBox.minX + ((bestBox.maxX - bestBox.minX) * i) / steps
      const y = bestBox.minY + ((bestBox.maxY - bestBox.minY) * j) / steps
      if (!pointInPolygon([x, y], best)) continue
      const dist = (x - cx) * (x - cx) + (y - cy) * (y - cy)
      if (dist < candidateDist) {
        candidateDist = dist
        candidate = [x, y]
      }
    }
  }
  return candidate || [cx, cy]
}

// 地市面合并 → 区域 MultiPolygon
function mergeRegion(provinceGeoJson, region) {
  const wanted = region.cities.map(shortName)
  const polygons = []
  const matched = []
  provinceGeoJson.features.forEach(feature => {
    const name = shortName(feature.properties.name)
    if (wanted.indexOf(name) < 0) return
    matched.push(name)
    toPolygons(feature.geometry).forEach(polygon => polygons.push(polygon))
  })
  const missing = wanted.filter(city => matched.indexOf(city) < 0)
  if (missing.length) {
    throw new Error(`[${region.name}] 以下地市在省级 GeoJSON 中未找到：${missing.join('、')}`)
  }
  if (!polygons.length) {
    throw new Error(`[${region.name}] 没有可用于合并的地市面`)
  }
  return union(polygons[0], ...polygons.slice(1))
}

// 校验：省级 GeoJSON 的每个地市都必须被某个区域覆盖，否则区域图上会留空洞
function assertCoverage(provinceGeoJson, split) {
  const assigned = []
  split.regions.forEach(region => region.cities.map(shortName).forEach(c => assigned.push(c)))
  const uncovered = provinceGeoJson.features
    .map(feature => shortName(feature.properties.name))
    .filter(city => assigned.indexOf(city) < 0)
  if (uncovered.length) {
    throw new Error(`[${split.province}] 以下地市未分配到任何区域：${uncovered.join('、')}`)
  }
}

function main() {
  const removeProvinces = SPLITS.map(s => s.province)
  const regionFeatures = []

  SPLITS.forEach(split => {
    const provinceGeoJson = require(`../src/assets/maps/${split.code}.json`)
    assertCoverage(provinceGeoJson, split)
    split.regions.forEach(region => {
      const merged = roundMultiPolygon(mergeRegion(provinceGeoJson, region))
      const cp = labelCenter(merged)
      regionFeatures.push({
        type: 'Feature',
        properties: { name: region.name, cp: cp.map(n => Math.round(n * 10000) / 10000) },
        geometry: { type: 'MultiPolygon', coordinates: merged }
      })
      console.log(`✓ ${region.name}：${merged.length} 个多边形，标签位置 ${cp.map(n => n.toFixed(3)).join(', ')}`)
    })
  })

  const output = {
    type: 'FeatureCollection',
    UTF8Encoding: china.UTF8Encoding,
    features: china.features
      .filter(feature => removeProvinces.indexOf(feature.properties.name) < 0)
      .concat(regionFeatures)
  }

  const file = path.join(MAP_DIR, 'china-region.json')
  fs.writeFileSync(file, JSON.stringify(output))
  const size = (fs.statSync(file).size / 1024).toFixed(1)
  console.log(`\n已生成 ${path.relative(process.cwd(), file)}（${output.features.length} 个区域，${size} KB）`)
}

main()
