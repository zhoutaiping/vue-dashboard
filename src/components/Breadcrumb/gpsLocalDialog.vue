<template>
  <el-dialog
    v-dialogDrag
    :title="title"
    :modal-append-to-body="false"
    :visible.sync="open"
    width="1000px"
    class="dialog-center"
    :modal="false"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="map-header">
      <!-- 地名搜索 -->
      <el-input
        v-model="search"
        placeholder="请输入位置，支持模糊搜索"
        style="width: 200px"
        clearable
        @clear="clearAddressMarker"
        @keyup.enter.native="searchMap"
      />
      <!-- 经纬度搜索 -->
      <el-input
        v-model="searchPint"
        placeholder="经度, 纬度"
        style="width: 120px"
        clearable
        @clear="clearCoordMarker"
        @keyup.enter.native="searchMap"
      />
      <el-button type="primary" @click="searchMap">
        搜索
      </el-button>
      <el-form ref="fenceForm" :model="fenceForm" inline class="fence-form">
        <el-form-item label="电子围栏经纬度" style="margin-bottom: 0; margin-right: 5px" :class="{ 'is-error-border': fenceFormErrors.aPint }">
          <el-input v-model="fenceForm.aPint" placeholder="左上角" style="width: 140px" readonly :class="{ 'fence-input-error': fenceFormErrors.aPint }" />
        </el-form-item>
        <el-form-item label="" style="margin-bottom: 0; margin-right: 5px" :class="{ 'is-error-border': fenceFormErrors.dPint }">
          <el-input v-model="fenceForm.dPint" placeholder="右下角" style="width: 140px" readonly :class="{ 'fence-input-error': fenceFormErrors.dPint }" />
        </el-form-item>
        <el-button type="primary" @click="saveFence">保存</el-button>
        <el-button type="success" @click="startDrawFence">绘制围栏</el-button>
      </el-form>
    </div>
    <div id="gps-map" class="map-box custom-black-tooltip" />
  </el-dialog>
</template>

<script>
import dialog from '@/mixins/dialog'
import { init as initMap } from '@/util/map'

// 经纬度格式校验正则（格式：经度,纬度；小数点前≤3位、小数点后1~6位；英文逗号分隔，允许中文逗号经 normalize 转换）
const COORD_REG = /^-?\d{1,3}\.\d{1,6}\s*,\s*-?\d{1,3}\.\d{1,6}$/

export default {
  mixins: [dialog],
  props: {
    projectId: {
      type: [String, Number],
      default: ''
    },
    projectCode: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      dialogPageName: 'gpsLocalDialog',
      title: '绘制电子围栏',
      open: false,
      loading: false,
      search: '',
      searchPint: '',
      form: {},
      rules: {},
      plantList: [],
      mode: 'Created',
      map: null,
      parentData: null,

      localSearch: null,
      // 模糊搜索打点（独立，不与经纬度打点互相干扰）
      addressMarker: null,
      addressLabel: null,
      // 经纬度搜索打点（独立）
      coordMarker: null,
      coordLabel: null,

      isDrawing: false,
      fencePoints: [],
      fenceMarkers: [],
      drawMarkers: [],
      fenceRectangle: null,
      drawListener: null,

      fenceForm: {
        aPint: '',
        dPint: ''
      },
      fenceFormErrors: {
        aPint: false,
        dPint: false
      }
    }
  },
  computed: {
    // 判断围栏数据是否与 parentData 中的原始值一致（未修改则禁用保存按钮）
    isUnchanged() {
      if (!this.parentData) return false
      return (
        (this.fenceForm.aPint || '').trim() === (this.parentData.apoint || '').trim() &&
        (this.fenceForm.dPint || '').trim() === (this.parentData.dpoint || '').trim()
      )
    }
  },
  beforeDestroy() {
    this.exitDrawMode()
    this.unbindMouseMoveTip()
  },
  methods: {
    handleOpen(data, options, planList = []) {
      this.open = true
      this.parentData = data
      this.mode = options

      this.fenceForm.aPint = ''
      this.fenceForm.dPint = ''
      this.fenceFormErrors = { aPint: false, dPint: false }
      this.isDrawing = false
      this.fencePoints = []
      this.drawMarkers = []
      this.fenceMarkers = []
      this.fenceRectangle = null

      if (data) {
        this.fenceForm.aPint = data.apoint || '' // "apoint": Unknown word.
        this.fenceForm.dPint = data.dpoint || '' // "dpoint": Unknown word.
      }

      this.$nextTick(async() => {
        this.updataDialog('open', { name: this.dialogPageName })
        await this.initMapAsync()
      })
    },
    async initMapAsync() {
      try {
        const isHttps = window.location.protocol === 'https:'
        await initMap(isHttps)
        await this.handleInit()
      } catch (error) {
        console.error('地图初始化失败:', error)
      }
    },
    async handleInit() {
      const container = document.getElementById('gps-map')
      if (!container) return
      this.map = new BMapGL.Map('gps-map')
      this.map.enableScrollWheelZoom(true)
      // 关闭 3D 建筑图层，避免楼宇遮挡电子围栏
      this.map.setDisplayOptions({ building: false })

      this.map.addControl(new BMapGL.NavigationControl3D({ anchor: BMAP_ANCHOR_TOP_RIGHT, offset: new BMapGL.Size(10, 20) }))
      this.map.addControl(new BMapGL.ZoomControl({ anchor: BMAP_ANCHOR_BOTTOM_RIGHT, offset: new BMapGL.Size(10, 20) }))

      const getCurrentCityName = () => {
        return new Promise((resolve) => {
          const myCity = new BMapGL.LocalCity()
          myCity.get((result) => {
            resolve(result)
          })
        })
      }
      const city = await getCurrentCityName()
      this.map.centerAndZoom(new BMapGL.Point(city.center.lng, city.center.lat), 15)

      // 鼠标移动时实时显示经纬度
      this.bindMouseMoveTip()
      // 绑定地图单击：搜索图钉点击显示详情、空白点击更新坐标框并隐藏详情
      this.bindMapClick()

      // 等待地图完全渲染后再绘制围栏（确保 marker 拖拽正常工作）
      await new Promise(resolve => this.map.addEventListener('tilesloaded', resolve))
      this.renderFenceFromForm()
    },

    // 绑定鼠标移动事件，实时显示经纬度（DOM 挂载到 body 避开地图 canvas 遮挡）
    bindMouseMoveTip() {
      if (!this.map) return
      const container = this.map.getContainer()

      // 创建经纬度提示 DOM 元素，挂载到 document.body（内联样式避免 scoped CSS 不生效）
      if (!this._mouseCoordEl) {
        this._mouseCoordEl = document.createElement('div')
        const s = this._mouseCoordEl.style
        s.position = 'fixed'
        s.zIndex = '9999'
        s.pointerEvents = 'none'
        s.background = 'rgba(0, 0, 0, 0.75)'
        s.color = '#fff'
        s.fontSize = '12px'
        s.padding = '4px 8px'
        s.borderRadius = '4px'
        s.whiteSpace = 'nowrap'
        s.lineHeight = '1.5'
        s.display = 'none'
        s.transform = 'translate(-50%, -100%)'
        document.body.appendChild(this._mouseCoordEl)
      }

      this._hoveringMarker = false

      this.mouseMoveHandler = (e) => {
        const rect = container.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        // 判断是否在地图容器内
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
          this._mouseCoordEl.style.display = 'none'
          return
        }

        // 悬停在已标记的 marker 上时不显示经纬度跟随提示（避免遮挡 marker tip）
        if (this._hoveringMarker) {
          this._mouseCoordEl.style.display = 'none'
          return
        }

        const pixel = new BMapGL.Pixel(x, y)
        const pt = this.map.pixelToPoint(pixel)
        this._mouseCoordEl.textContent = `${pt.lng.toFixed(6)}, ${pt.lat.toFixed(6)}`
        this._mouseCoordEl.style.left = `${e.clientX}px`
        this._mouseCoordEl.style.top = `${e.clientY - 15}px`
        this._mouseCoordEl.style.display = ''
      }

      container.addEventListener('mousemove', this.mouseMoveHandler)

      // 鼠标离开地图容器时立即清除经纬度提示
      this._mouseLeaveHandler = () => {
        if (this._mouseCoordEl) this._mouseCoordEl.style.display = 'none'
        this._hoveringMarker = false
      }
      container.addEventListener('mouseleave', this._mouseLeaveHandler)
    },

    // 移除鼠标移动监听
    unbindMouseMoveTip() {
      if (this.mouseMoveHandler && this.map) {
        const container = this.map.getContainer()
        if (container) {
          container.removeEventListener('mousemove', this.mouseMoveHandler)
          container.removeEventListener('mouseleave', this._mouseLeaveHandler)
        }
        this.mouseMoveHandler = null
        this._mouseLeaveHandler = null
      }

      if (this._mouseCoordEl) {
        this._mouseCoordEl.remove()
        this._mouseCoordEl = null
      }
    },

    // 根据 fenceForm 中的经纬度绘制电子围栏
    // draggable: 是否启用 marker 拖拽（手动绘制/复用坐标后重绘需要可拖拽，初始化不需要）
    renderFenceFromForm({ draggable = false } = {}) {
      if (!this.map) return
      this.clearFenceOverlays()

      const aValid = this.isValidCoord(this.fenceForm.aPint)
      const bValid = this.isValidCoord(this.fenceForm.dPint)
      if (!aValid || !bValid) return

      const [aLng, aLat] = this.fenceForm.aPint.split(',').map(Number)
      const [bLng, bLat] = this.fenceForm.dPint.split(',').map(Number)

      // 自动纠正：无论存储顺序如何，始终取 minLng/maxLat 为左上角，maxLng/minLat 为右下角
      const topLeft = new BMapGL.Point(
        Math.min(aLng, bLng),
        Math.max(aLat, bLat)
      )
      const bottomRight = new BMapGL.Point(
        Math.max(aLng, bLng),
        Math.min(aLat, bLat)
      )

      this.fenceMarkers = []
      this.drawMarkerWithTip(topLeft, `左上角: ${topLeft.lng.toFixed(6)},${topLeft.lat.toFixed(6)}`, 'aMarker')
      this.drawMarkerWithTip(bottomRight, `右下角: ${bottomRight.lng.toFixed(6)},${bottomRight.lat.toFixed(6)}`, 'bMarker')

      if (draggable) {
        this.fenceMarkers.forEach(({ marker, label, tag }) => {
          this.bindFenceMarkerDrag(marker, label, tag === 'aMarker')
        })
      }

      const rectPoints = [
        topLeft,
        new BMapGL.Point(bottomRight.lng, topLeft.lat),
        bottomRight,
        new BMapGL.Point(topLeft.lng, bottomRight.lat)
      ]
      this.fenceRectangle = new BMapGL.Polygon(rectPoints, {
        strokeColor: 'rgba(233,157,66,1)',
        strokeWeight: 3,
        fillColor: 'rgba(233,157,66,1)',
        fillOpacity: 0.15,
        zIndex: 1000
      })
      this.map.addOverlay(this.fenceRectangle)

      this.map.setViewport([topLeft, bottomRight], { margins: [80, 50, 50, 50] })
    },

    // 绘制 tooltip 的 marker
    drawMarkerWithTip(point, labelText, tag) {
      const icon = new BMapGL.Icon('/static/image/gps_point.svg', new BMapGL.Size(25, 25))
      const marker = new BMapGL.Marker(point, { icon })
      const label = this.makeBlackTipLabel(labelText, point)
      // tip 始终显示，仅在清理时隐藏；mouseover 时标记悬停状态以隐藏经纬度跟随提示
      marker.addEventListener('mouseover', () => { this._hoveringMarker = true; label.show() })
      marker.addEventListener('mouseout', () => { this._hoveringMarker = false })
      label.show()
      this.map.addOverlay(marker)
      this.map.addOverlay(label)
      this.fenceMarkers.push({ marker, label, tag })
    },

    // 绑定围栏 marker 拖拽事件
    bindFenceMarkerDrag(marker, label, isTopLeft) {
      if (!marker || !this.map) return
      const container = this.map.getContainer()
      let isDragging = false

      const onDown = (e) => {
        const rect = container.getBoundingClientRect()
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top

        // 判断点击是否落在当前 marker 附近（容错半径 25px，不依赖图标锚点）
        const markerPixel = this.map.pointToPixel(marker.getPosition())
        const dx = mouseX - markerPixel.x
        const dy = mouseY - markerPixel.y
        if (Math.sqrt(dx * dx + dy * dy) > 25) return

        if (e && e.stopPropagation) e.stopPropagation()
        if (e && e.preventDefault) e.preventDefault()
        isDragging = true
        document.body.style.cursor = 'grabbing'
        // 禁用地图拖拽，避免 marker 拖拽与地图平移冲突
        this.map.disableDragging()
      }

      const onMove = (e) => {
        if (!isDragging || !this.map) return
        const rect = container.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) return

        const pixel = new BMapGL.Pixel(x, y)
        const pos = this.map.pixelToPoint(pixel)
        marker.setPosition(pos)

        const coordStr = `${pos.lng.toFixed(6)},${pos.lat.toFixed(6)}`
        const tipText = isTopLeft ? `左上角: ${coordStr}` : `右下角: ${coordStr}`
        label.setContent(tipText)
        label.setPosition(pos)
        if (isTopLeft) {
          this.fenceForm.aPint = coordStr
        } else {
          this.fenceForm.dPint = coordStr
        }
        this.clearFenceFormErrors()
        this.updateFencePolygon()
      }

      const onUp = () => {
        if (!isDragging) return
        isDragging = false
        document.body.style.cursor = ''
        label.show()
        this.map.enableDragging()
        // 标记本次为围栏 marker 交互，避免随后补发的 click 误更新搜索框
        this._fenceClicked = true
      }

      // 使用 capture 阶段监听，确保在 BMapGL 地图平移事件之前处理 marker 命中
      container.addEventListener('mousedown', onDown, true)
      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
      marker._dragHandlers = { onDown, onMove, onUp, useCapture: true }
    },

    // 根据当前 fenceForm 坐标更新矩形覆盖物
    updateFencePolygon() {
      if (!this.fenceRectangle || !this.isValidCoord(this.fenceForm.aPint) || !this.isValidCoord(this.fenceForm.dPint)) return
      const [aLng, aLat] = this.fenceForm.aPint.split(',').map(Number)
      const [bLng, bLat] = this.fenceForm.dPint.split(',').map(Number)
      const topLeft = new BMapGL.Point(
        Math.min(aLng, bLng),
        Math.max(aLat, bLat)
      )
      const bottomRight = new BMapGL.Point(
        Math.max(aLng, bLng),
        Math.min(aLat, bLat)
      )
      const rectPoints = [
        topLeft,
        new BMapGL.Point(bottomRight.lng, topLeft.lat),
        bottomRight,
        new BMapGL.Point(topLeft.lng, bottomRight.lat)
      ]
      this.fenceRectangle.setPath(rectPoints)
    },

    // 清除地图上所有围栏相关覆盖物
    clearFenceOverlays() {
      if (!this.map) return
      this.fenceMarkers.forEach(({ marker, label }) => {
        // 清理自定义拖拽事件
        if (marker._dragHandlers) {
          const container = this.map.getContainer()
          const { onDown, onMove, onUp, useCapture } = marker._dragHandlers
          container.removeEventListener('mousedown', onDown, useCapture)
          document.removeEventListener('mousemove', onMove)
          document.removeEventListener('mouseup', onUp)
          marker._dragHandlers = null
        }
        this.map.removeOverlay(marker)
        this.map.removeOverlay(label)
      })
      this.fenceMarkers = []
      if (this.fenceRectangle) {
        this.map.removeOverlay(this.fenceRectangle)
        this.fenceRectangle = null
      }
      this.drawMarkers.forEach(m => {
        this.map.removeOverlay(m)
      })
      this.drawMarkers = []
    },

    // 经纬度字符串规范化：中文逗号转英文、去除逗号两侧及多余空白
    normalizeCoordStr(str) {
      if (!str) return ''
      return String(str)
        .replace(/，/g, ',')
        .replace(/\s*,\s*/g, ',')
        .replace(/\s+/g, '')
        .trim()
    },

    // 校验经纬度字符串格式与合理性（格式：经度,纬度；经度∈[-180,180]，纬度∈[-90,90]）
    isValidCoord(str) {
      if (!str) return false
      const trimmed = this.normalizeCoordStr(str)
      if (!COORD_REG.test(trimmed)) return false
      const [lng, lat] = trimmed.split(',').map(Number)
      if (isNaN(lng) || isNaN(lat)) return false
      if (lng < -180 || lng > 180) return false
      if (lat < -90 || lat > 90) return false
      return true
    },

    // 搜索：地址 / 经纬度二选一；同时填写时优先按经纬度搜索
    searchMap() {
      const hasSearch = !!this.search.trim()
      const hasPint = !!this.normalizeCoordStr(this.searchPint)

      if (!hasSearch && !hasPint) {
        this.$message.warning('请输入搜索内容')
        return
      }

      // 同时填写地址和经纬度时，优先按经纬度搜索
      if (hasPint) {
        this.searchByCoord()
        return
      }
      if (hasSearch) {
        this.searchByAddress()
      }
    },

    // 地点模糊搜索
    searchByAddress() {
      if (!this.search.trim()) return
      if (this.localSearch) {
        this.localSearch.clearResults()
      }
      this.clearAddressMarker()
      this.clearCoordMarker()
      this.localSearch = new BMapGL.LocalSearch(this.map, {
        renderOptions: { map: null, panel: null },
        onSearchComplete: (results) => {
          if (results && results.getNumPois() > 0) { // "Pois": Unknown word.
            const poi = results.getPoi(0)
            const pt = poi.point
            // tip 展示：地点名称 / 地址 / 经纬度，换行展示
            const lng = poi.point.lng.toFixed(6)
            const lat = poi.point.lat.toFixed(6)
            const tipText = `${poi.title}\n地址：${poi.address || '--'}\n经纬度：${lng},${lat}`
            // 使用自定义图标
            const icon = new BMapGL.Icon('/static/image/gps_address.svg', new BMapGL.Size(25, 25))
            this.clearAddressMarker()
            this.addressMarker = new BMapGL.Marker(pt, { icon })
            this.addressLabel = this.makeBlackTipLabel(tipText, pt, [0, -90])
            // 详情初始隐藏，由点击图钉触发显示
            this.addressLabel.hide()
            this.addressMarker.addEventListener('mouseover', () => { this._hoveringMarker = true })
            this.addressMarker.addEventListener('mouseout', () => { this._hoveringMarker = false })
            this.map.addOverlay(this.addressMarker)
            this.map.addOverlay(this.addressLabel)
            this.map.centerAndZoom(pt, 16)
          } else {
            this.$message.warning('未找到相关位置')
          }
        }
      })
      this.localSearch.search(this.search.trim())
    },

    // 经纬度搜索
    searchByCoord() {
      const coord = this.normalizeCoordStr(this.searchPint)
      if (!COORD_REG.test(coord)) {
        this.$message.warning('经纬度格式不正确，请输入格式如 116.40,39.90（经度,纬度）')
        return
      }
      const [lng, lat] = coord.split(',').map(Number)
      if (isNaN(lng) || isNaN(lat) || lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        this.$message.warning('经纬度超出范围：经度(-180~180)，纬度(-90~90)')
        return
      }
      const pt = new BMapGL.Point(lng, lat)
      this.clearCoordMarker()
      this.clearAddressMarker()
      const icon = new BMapGL.Icon('/static/image/gps_point.svg', new BMapGL.Size(25, 25))
      this.coordMarker = new BMapGL.Marker(pt, { icon })
      this.coordLabel = this.makeBlackTipLabel(`${lng.toFixed(6)},${lat.toFixed(6)}`, pt, [0, -45])
      // 详情初始隐藏，由点击图钉触发显示
      this.coordLabel.hide()
      this.coordMarker.addEventListener('mouseover', () => { this._hoveringMarker = true })
      this.coordMarker.addEventListener('mouseout', () => { this._hoveringMarker = false })
      this.map.addOverlay(this.coordMarker)
      this.map.addOverlay(this.coordLabel)
      this.map.centerAndZoom(pt, 16)
    },

    // 隐藏搜索图钉的详细信息（点击空白时调用）
    hideSearchDetail() {
      if (this.addressLabel) this.addressLabel.hide()
      if (this.coordLabel) this.coordLabel.hide()
    },

    // 绑定地图单击事件：
    // 1) 点击搜索图钉 → 显示其详细信息（地点名/地址/经纬度）
    // 2) 点击空白 → 坐标框更新为点击处经纬度，并隐藏搜索详情
    // 绘制模式下交由绘制监听处理，此处直接跳过
    bindMapClick() {
      if (!this.map) return
      const container = this.map.getContainer()
      if (this.mapClickHandler) {
        container.removeEventListener('click', this.mapClickHandler)
      }
      this.mapClickHandler = (e) => {
        // 围栏 marker 拖拽/点击后补发的 click 直接忽略，避免污染搜索框
        if (this._fenceClicked) {
          this._fenceClicked = false
          return
        }
        // 绘制围栏模式下不处理（避免与打点逻辑冲突、且不更新搜索框）
        if (this.isDrawing || this.drawListener) return
        const rect = container.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) return

        const pixel = new BMapGL.Pixel(x, y)
        const pt = this.map.pixelToPoint(pixel)

        // 命中搜索图钉（像素距离容错 25px）→ 显示详情，不更新坐标框
        const searchMarkers = []
        if (this.addressMarker) searchMarkers.push({ marker: this.addressMarker, label: this.addressLabel })
        if (this.coordMarker) searchMarkers.push({ marker: this.coordMarker, label: this.coordLabel })
        for (const { marker, label } of searchMarkers) {
          const mp = this.map.pointToPixel(marker.getPosition())
          const dx = x - mp.x
          const dy = y - mp.y
          if (Math.sqrt(dx * dx + dy * dy) <= 25) {
            if (label) label.show()
            return
          }
        }

        // 命中围栏角点 marker（像素容错 25px）→ 不更新搜索框（避免误改）
        for (const { marker } of this.fenceMarkers) {
          const mp = this.map.pointToPixel(marker.getPosition())
          const dx = x - mp.x
          const dy = y - mp.y
          if (Math.sqrt(dx * dx + dy * dy) <= 25) {
            return
          }
        }

        // 点击空白 → 坐标框更新为点击处经纬度，并隐藏详情
        this.searchPint = `${pt.lng.toFixed(6)},${pt.lat.toFixed(6)}`
        this.hideSearchDetail()
      }
      container.addEventListener('click', this.mapClickHandler)
    },

    clearAddressMarker() {
      if (!this.map) return
      if (this.addressMarker) {
        this.map.removeOverlay(this.addressMarker)
        this.addressMarker = null
      }
      if (this.addressLabel) {
        this.map.removeOverlay(this.addressLabel)
        this.addressLabel = null
      }
    },

    clearCoordMarker() {
      if (!this.map) return
      if (this.coordMarker) {
        this.map.removeOverlay(this.coordMarker)
        this.coordMarker = null
      }
      if (this.coordLabel) {
        this.map.removeOverlay(this.coordLabel)
        this.coordLabel = null
      }
    },

    // 清空全部搜索打点（进入绘制围栏时调用）
    clearSearchMarker() {
      this.clearAddressMarker()
      this.clearCoordMarker()
    },

    // 绘制围栏按钮
    startDrawFence() {
      this.clearSearchMarker()
      const hasA = !!this.fenceForm.aPint.trim()
      const hasB = !!this.fenceForm.dPint.trim()

      if (hasA && hasB) {
        this.$confirm('当前已有经纬度数据，是否使用现有坐标绘制围栏？', '提示', {
          confirmButtonText: '是',
          cancelButtonText: '否 (重新打点)',
          type: 'info'
        }).then(() => {
          this.renderFenceFromForm({ draggable: true })
        }).catch(() => {
          this.fenceForm.aPint = ''
          this.fenceForm.dPint = ''
          this.clearFenceFormErrors()
          this.clearFenceOverlays()
          this.enterPointDrawMode()
        })
      } else {
        this.enterPointDrawMode()
      }
    },

    // 进入打点绘制模式
    enterPointDrawMode() {
      this.isDrawing = true
      this.fencePoints = []
      this.drawMarkers = []
      this._fenceClicked = false
      this.clearFenceOverlays()
      this.map.checkResize()

      this.$message.info('请在地图上点击两个点绘制电子围栏（左上角 → 右下角）')

      // 核心修复：使用原生 DOM click 绑定，而非 BMapGL 事件
      // el-dialog 的 CSS transform 居中会破坏 BMapGL 内部坐标计算，
      // 通过 clientX/clientY + getBoundingClientRect 手动算像素，绕过偏移
      const container = this.map.getContainer()
      // 避免重复进入时叠加多个 drawListener
      if (this.drawListener) {
        container.removeEventListener('click', this.drawListener)
        this.drawListener = null
      }
      this.drawListener = (nativeEvent) => {
        const rect = container.getBoundingClientRect()
        const x = nativeEvent.clientX - rect.left
        const y = nativeEvent.clientY - rect.top

        // 只处理地图容器内的点击
        if (x < 0 || y < 0 || x > rect.width || y > rect.height) return

        const pixel = new BMapGL.Pixel(x, y)
        const pt = this.map.pixelToPoint(pixel)
        this.processFenceClick(pt)
      }
      container.addEventListener('click', this.drawListener)
    },

    // 处理围栏点击选点
    processFenceClick(pt) {
      if (!this.isDrawing || !pt) return

      const coordStr = `${pt.lng.toFixed(6)},${pt.lat.toFixed(6)}`

      if (this.fencePoints.length < 2) {
        this.fencePoints.push(pt)
        const icon = new BMapGL.Icon('/static/image/gps_point.svg', new BMapGL.Size(25, 25))
        const marker = new BMapGL.Marker(pt, { icon })
        const labelText = this.fencePoints.length === 1
          ? `第1点(左上角): ${coordStr}`
          : `第2点(右下角): ${coordStr}`
        const label = this.makeBlackTipLabel(labelText, pt)
        marker.addEventListener('mouseover', () => {
          this._hoveringMarker = true
          label.show()
        })
        marker.addEventListener('mouseout', () => { this._hoveringMarker = false })
        label.show()
        this.map.addOverlay(marker)
        this.map.addOverlay(label)
        this.drawMarkers.push(marker, label)
      } else {
        this.fencePoints[1] = pt
        this.drawMarkers.forEach(m => this.map.removeOverlay(m))
        this.drawMarkers = []
        const icon = new BMapGL.Icon('/static/image/gps_point.svg', new BMapGL.Size(25, 25))
        const marker = new BMapGL.Marker(pt, { icon })
        const label = this.makeBlackTipLabel(`第2点(右下角): ${coordStr}`, pt)
        marker.addEventListener('mouseover', () => {
          this._hoveringMarker = true
          label.show()
        })
        marker.addEventListener('mouseout', () => { this._hoveringMarker = false })
        label.show()
        this.map.addOverlay(marker)
        this.map.addOverlay(label)
        this.drawMarkers.push(marker, label)
      }

      if (this.fencePoints.length === 2) {
        this.finishFenceDrawing()
      }
    },

    // 完成打点，绘制正式矩形
    finishFenceDrawing() {
      const [ptA, ptB] = this.fencePoints

      // 自动纠正：无论点击顺序如何，始终取 minLng/maxLat 为左上角，maxLng/minLat 为右下角
      const topLeft = new BMapGL.Point(
        Math.min(ptA.lng, ptB.lng),
        Math.max(ptA.lat, ptB.lat)
      )
      const bottomRight = new BMapGL.Point(
        Math.max(ptA.lng, ptB.lng),
        Math.min(ptA.lat, ptB.lat)
      )
      this.fenceForm.aPint = `${topLeft.lng.toFixed(6)},${topLeft.lat.toFixed(6)}`
      this.fenceForm.dPint = `${bottomRight.lng.toFixed(6)},${bottomRight.lat.toFixed(6)}`
      this.clearFenceFormErrors()

      this.drawMarkers.forEach(m => this.map.removeOverlay(m))
      this.drawMarkers = []
      this.fenceMarkers = []

      const icon = new BMapGL.Icon('/static/image/gps_point.svg', new BMapGL.Size(25, 25))
      const aMarker = new BMapGL.Marker(topLeft, { icon })
      const bMarker = new BMapGL.Marker(bottomRight, { icon })
      const aLabel = this.makeBlackTipLabel(`左上角: ${this.fenceForm.aPint}`, topLeft)
      const bLabel = this.makeBlackTipLabel(`右下角: ${this.fenceForm.dPint}`, bottomRight)

      aMarker.addEventListener('mouseover', () => {
        this._hoveringMarker = true
        aLabel.show()
      })
      aMarker.addEventListener('mouseout', () => {
        this._hoveringMarker = false
      })
      bMarker.addEventListener('mouseover', () => {
        this._hoveringMarker = true
        bLabel.show()
      })
      bMarker.addEventListener('mouseout', () => { this._hoveringMarker = false })

      this.map.addOverlay(aMarker)
      this.map.addOverlay(bMarker)
      this.map.addOverlay(aLabel)
      this.map.addOverlay(bLabel)

      this.fenceMarkers.push({ marker: aMarker, label: aLabel, tag: 'aMarker' })
      this.fenceMarkers.push({ marker: bMarker, label: bLabel, tag: 'bMarker' })

      // 启用拖拽：拖动时实时更新坐标、标签和矩形
      this.bindFenceMarkerDrag(aMarker, aLabel, true)
      this.bindFenceMarkerDrag(bMarker, bLabel, false)

      const rectPoints = [
        topLeft,
        new BMapGL.Point(bottomRight.lng, topLeft.lat),
        bottomRight,
        new BMapGL.Point(topLeft.lng, bottomRight.lat)
      ]
      this.fenceRectangle = new BMapGL.Polygon(rectPoints, {
        strokeColor: 'rgba(233,157,66,1)',
        strokeWeight: 3,
        fillColor: 'rgba(233,157,66,1)',
        fillOpacity: 0.15,
        zIndex: 1000
      })
      this.map.addOverlay(this.fenceRectangle)

      this.map.setViewport([topLeft, bottomRight], { margins: [80, 50, 50, 50] })

      this.exitDrawMode()
      this.$message.success('电子围栏绘制完成')
    },

    makeBlackTipLabel(text, point, pixelOffset = [0, -45]) {
      const label = new BMapGL.Label(text, {
        offset: new BMapGL.Size(pixelOffset[0], pixelOffset[1]),
        position: point
      })
      // 还原原型图样式：黑色背景、白色文字
      label.setStyle({
        border: 'none',
        borderRadius: '4px',
        padding: '6px 10px',
        backgroundColor: '#000',
        color: '#fff',
        fontSize: '12px',
        lineHeight: '1.5',
        boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
        whiteSpace: 'pre-line',
        minWidth: '220px', // ← 新增：保证 tip 有足够宽度
        width: 'auto', // ← 新增：允许根据内容自适应加宽
        zIndex: 2000,
        transform: 'translateX(-50%)'
      })
      return label
    },

    // 退出打点绘制模式
    exitDrawMode() {
      this.isDrawing = false
      if (this.drawListener && this.map) {
        const container = this.map.getContainer()
        if (container) {
          container.removeEventListener('click', this.drawListener)
        }
        this.drawListener = null
      }
    },

    // 清除围栏表单错误红框标记
    clearFenceFormErrors() {
      this.fenceFormErrors = { aPint: false, dPint: false }
    },

    // 保存
    saveFence() {
      const aPintVal = (this.fenceForm.aPint || '').trim()
      const dPintVal = (this.fenceForm.dPint || '').trim()
      const hasA = !!aPintVal
      const hasD = !!dPintVal

      // 必须同时存在或同时为空，否则红框提示并阻止保存
      if (hasA !== hasD) {
        this.fenceFormErrors = { aPint: !hasA, dPint: !hasD }
        this.$message.warning('左上角和右下角经纬度必须同时填写或同时为空！')
        return
      }
      this.clearFenceFormErrors()

      // 两者都为空 → 取消电子围栏设置
      if (!hasA && !hasD) {
        const parentA = (this.parentData.apoint || '').trim()
        const parentD = (this.parentData.dpoint || '').trim()
        if (!parentA && !parentD) {
          this.$message.warning('暂无电子围栏数据，无需取消！')
          return
        }
        const params = {
          aPoint: '',
          dPoint: '',
          sn: this.parentData.sn,
          deviceId: this.parentData.deviceId,
          id: this.parentData.id,
          projectId: this.projectId
        }
        this.Fetch.get('/regulatory_s/project/gps/addGpsfence', params).then(res => { // "Gpsfence": Unknown word.
          if (res.code === 200) {
            this.$message.success('电子围栏已取消')
            this.$emit('init')
            this.handleClose()
          } else {
            this.$message.warning(res.msg || '操作失败')
          }
        })
        return
      }

      // 两者都存在 → 正常保存
      if (this.isUnchanged) {
        this.$message.warning('电子围栏未修改！')
        return
      }

      const params = {
        aPoint: aPintVal,
        dPoint: dPintVal,
        sn: this.parentData.sn,
        deviceId: this.parentData.deviceId,
        id: this.parentData.id,
        projectId: this.projectId
      }

      this.Fetch.get('/regulatory_s/project/gps/addGpsfence', params).then(res => { // "Gpsfence": Unknown word.
        if (res.code === 200) {
          this.$message.success('电子围栏已保存')
          this.$emit('init')
          this.handleClose()
        } else {
          this.$message.warning(res.msg || '操作失败')
        }
      })
    },

    handleClose() {
      this.exitDrawMode()
      this.unbindMouseMoveTip()
      this.open = false
      this.updataDialog('close')
    }
  }
}
</script>

<style lang="scss" scoped>
.map-header {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 10px;
  border-radius: 4px;
  background-color: #fff;
  border: 1px solid #bbb;
}

.fence-form {
  flex: 1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 5px;
}

.map-box {
  width: 100%;
  height: 500px;
  position: relative;
}

/* 黑色气泡tooltip - 底部尖角 */
.custom-black-tooltip .BMapGL_Label {
  position: relative;
}

/* 电子围栏表单输入框红框错误提示 */
/* 样式穿透统一用 ::v-deep：本项目 dart-sass 1.26 解析不了 /deep/（expected selector），
   而 :deep() 是 Vue 3 语法，在 Vue 2.6 下会原样输出、被浏览器丢弃 */
.fence-input-error {
  ::v-deep .el-input__inner {
    border-color: #F56C6C !important;
    box-shadow: 0 0 0 2px rgba(245, 108, 108, 0.2) !important;
  }
}

.custom-black-tooltip .BMapGL_Label::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: -8px;
  transform: translateX(-50%);
  /* 用边框绘制朝下的三角形 */
  width: 0;
  height: 0;
  border-left: 8px solid transparent;
  border-right: 8px solid transparent;
  border-top: 8px solid #000;
}
</style>
