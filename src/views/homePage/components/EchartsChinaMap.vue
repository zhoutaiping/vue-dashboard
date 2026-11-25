<template>
  <div ref="wrap" class="echarts-china-map">
    <div ref="chart" class="echarts-china-map__canvas" />

    <div class="echarts-china-map__panel echarts-china-map__panel--build">
      <div
        v-for="item in buildOptions"
        :key="item.id"
        class="echarts-china-map__check"
        :class="{ 'is-active': buildFilter.includes(item.id) }"
        @click="toggleBuild(item.id)"
      >
        <span class="echarts-china-map__checkbox" />{{ item.label }}
      </div>
    </div>

    <div class="echarts-china-map__panel echarts-china-map__panel--subsidy">
      <div
        v-for="label in subsidyOptions"
        :key="label"
        class="echarts-china-map__check"
        :class="{ 'is-active': subsidyFilter.includes(label) }"
        @click="toggleSubsidy(label)"
      >
        <img v-if="subsidyIcons[label]" class="echarts-china-map__check-icon" :src="subsidyIcons[label]" alt="">
        {{ label }}
      </div>
    </div>

    <div class="echarts-china-map__panel echarts-china-map__panel--legend">
      <div class="echarts-china-map__price">
        <div
          v-for="item in priceOptions"
          :key="item.id"
          class="echarts-china-map__price-item"
          :class="{ 'is-active': priceType === item.id }"
          @click="$emit('update:priceType', priceType === item.id ? '' : item.id)"
        >
          <span class="echarts-china-map__price-dot" />{{ item.label }}
        </div>
      </div>
    </div>

    <div class="echarts-china-map__fs-bar">
      <div v-if="mapCode" class="echarts-china-map__fs-btn" @click="$emit('back')">
        <i class="el-icon-refresh-left" />返回
      </div>
      <div v-if="isFullscreen" class="echarts-china-map__fs-btn" @click="setFullscreen(false)">
        <img v-if="fullscreenIcons && fullscreenIcons[2]" :src="fullscreenIcons[2]" alt="">
        <i v-else class="el-icon-close" />退出
      </div>
      <div v-else class="echarts-china-map__fs-btn" @click="setFullscreen(true)">
        <img v-if="fullscreenIcons && fullscreenIcons[1]" :src="fullscreenIcons[1]" alt="">
        <i v-else class="el-icon-full-screen" />全屏
      </div>
    </div>

    <div v-if="loading" class="echarts-china-map__loading">
      地图加载中...
    </div>

    <img
      v-if="hoverIcon"
      class="echarts-china-map__hover-icon"
      :src="hoverIcon"
      :style="{ left: hoverIconPos.x + 'px', top: hoverIconPos.y + 'px' }"
      alt=""
    >

    <div
      v-if="activePoint"
      ref="pointCard"
      class="echarts-china-map__point-card"
      :style="{ left: activePoint.x + 'px', top: activePoint.y + 'px', borderColor: pointCardColor }"
      @click.stop
    >
      <div
        class="echarts-china-map__point-card-tag"
        :style="{ '--point-card-color': pointCardColor }"
      >{{ pointCardTag }}</div>
      <div class="echarts-china-map__point-card-head">
        <img v-if="pointCardPin" class="echarts-china-map__point-card-pin" :src="pointCardPin" alt="">
        <span v-else class="echarts-china-map__point-card-dot" :style="{ background: pointCardColor }" />
        <span class="echarts-china-map__point-card-title">{{ pointCardTitle }}</span>
        <span class="echarts-china-map__point-card-more" :style="{ color: pointCardColor }" @click="handlePointMore">更多&gt;&gt;</span>
      </div>
      <div v-if="pointDetailLoading" class="echarts-china-map__point-card-row is-loading">详情加载中...</div>
      <template v-else>
        <div
          v-for="row in pointCardRows"
          :key="row.label"
          class="echarts-china-map__point-card-row"
        >
          <span class="echarts-china-map__point-card-label">{{ row.label }}：</span>
          <span :style="{ color: pointCardColor }">{{ row.value }}</span>
          <span v-if="row.sub" :style="{ color: row.subColor || pointCardColor }">{{ row.sub }}</span>
        </div>
        <!-- 详情>>：非标项目固定不展示；发电项目仅状态为运营(status='2')时展示 -->
        <div v-if="pointCardCanShowDetail" class="echarts-china-map__point-card-footer">
          <span class="echarts-china-map__point-card-detail" :style="{ color: pointCardColor }" @click="handlePointDetail">详情&gt;&gt;</span>
        </div>
      </template>
    </div>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import { getChartDpr } from '../uiScale'
// 由 scripts/build-split-map.js 生成（地市面多边形合并），properties.name 即区域名
import chinaJson from '@/assets/maps/china.json'
import * as provinceMapLoaders from '@/assets/maps'
import resize from '@/components/Charts/mixins/resize'
import { REGION_PRICE_COMPARE, POINT_PRICE_COMPARE, POINT_TIP, pointCategory, classifyProjectColor, PROJECT_DETAIL_TEXT, pickPriceValue } from '../overview/config'
import { patchZoomPointer } from '../pointer'
import windPriceIcon from '../windSettlementPrice.svg'
import pvPriceIcon from '../pvSettlementPrice.svg'
import benchmarkPriceIcon from '../benchmarkPrice.svg'

const REGION_PRICE_ICONS = {
  wind: windPriceIcon,
  pv: pvPriceIcon,
  benchmark: benchmarkPriceIcon
}

echarts.registerMap('china', chinaJson)

// 去掉行政后缀，用于区域内地市面匹配（呼和浩特市→呼和浩特、锡林郭勒盟→锡林郭勒）
const stripSuffix = name => String(name || '').replace(/(市|盟|地区|自治州|自治区|省)$/, '')

const DEFAULT_COLOR = '#0088ff'

// 地图默认填充率：自适应放大后地图占「可用区域」的比例（留一点边距，
// 灰色底座比主图大 3%，取 0.98 时底座刚好贴边不溢出）
const MAP_FILL_RATIO = 0.98
// 可用区域的上下留白（px）：上方是分类/筛选条，下方是图例与全屏按钮
const MAP_V_PADDING = 34
const SIDE_GUTTER = 12
// 加载通常几十毫秒完成，立刻铺遮罩会让下钻闪一层灰；超过该时长才显示，真正慢加载仍有反馈
const MAP_LOADING_DELAY = 250

export default {
  name: 'EchartsChinaMap',
  mixins: [resize],
  props: {
    points: { type: Array, default: () => [] },
    // 字段映射，后端字段改名只需改这里
    fieldMap: {
      type: Object,
      default: () => ({ id: 'id', name: 'name', lng: 'lng', lat: 'lat', category: 'category' })
    },
    categories: { type: Array, default: () => [] },
    defaultColor: { type: String, default: DEFAULT_COLOR },
    // 兼容旧接口：图层与已激活图层（此处用 echarts legend 控制显隐，prop 保留以便迁移）
    layers: { type: Array, default: () => [] },
    activeLayers: { type: Array, default: () => [] },
    showFullscreen: { type: Boolean, default: false },
    // 仅用于 echarts visualMap 的 px 定位（echarts 的 left 不支持 calc），
    sideRatio: { type: Number, default: 0.25 },
    buildOptions: { type: Array, default: () => [] },
    buildFilter: { type: Array, default: () => [] },
    subsidyOptions: { type: Array, default: () => [] },
    subsidyFilter: { type: Array, default: () => [] },
    subsidyIcons: { type: Object, default: () => ({}) },
    priceOptions: { type: Array, default: () => [] },
    priceType: { type: String, default: '' },
    // 各省着色数据：[{ name, value }]，由 visualMap 按 value 渐变着色（如电价）
    provinceData: { type: Array, default: () => [] },
    capitals: { type: Array, default: () => [] },
    capitalIcon: { type: String, default: '' },
    capitalSize: { type: Number, default: 16 },
    // 省份悬浮浮层数据：{ 省名: { field: value } }，移入省份区域弹出对应数据
    regionTooltipData: {
      type: Object,
      default: () => ({})
    },
    // 当前地图区域：'' = 全国地图；省份行政 code = 下钻到该省区县地图
    mapCode: { type: String, default: '' },
    // 下钻到的业务区域名（蒙西/蒙东、冀北/河北南网）；非拆分省份为空
    // 与 mapCode 组合决定加载哪张图：只画该区域内的地市
    region: { type: String, default: '' },
    // 当前区域包含的地市名列表（由父级按 REGION_SPLIT 提供），用于过滤省份 GeoJSON 的 feature
    regionCities: { type: Array, default: () => [] },
    // 点位详情接口数据（/largeScreen/projectDetail 返回 data）：projectType 决定卡片展示字段
    pointDetail: { type: Object, default: null },
    // 点位详情接口加载中
    pointDetailLoading: { type: Boolean, default: false },
    fullscreenIcons: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      chart: null,
      loading: false,
      isFullscreen: false,
      mapCache: {},
      activePoint: null,
      // 悬浮省份/市区时的鼠标跟随图标（province.svg），移出区域隐藏
      hoverIcon: '',
      hoverIconPos: { x: 0, y: 0 }
    }
  },
  computed: {
    // 地图注册名：全国 = 'china'；下钻 = '{省code}' 或 '{省code}|{区域名}'
    // 区域维度进 key，保证 蒙西/蒙东 各自注册一份只含本区域地市的 GeoJSON
    mapKey() {
      if (!this.mapCode) return 'china'
      return this.region ? `${this.mapCode}|${this.region}` : this.mapCode
    },
    // 卡片所属分类：直接用地图 projectList 的 projectColor（蓝色=无补贴、绿色=已补贴），
    activePointCategory() {
      const raw = (this.activePoint && this.activePoint.raw) || {}
      return pointCategory(classifyProjectColor(raw.projectColor, raw))
    },
    pointCardColor() {
      return this.activePointCategory.color
    },
    pointCardPin() {
      return this.subsidyIcons[this.activePointCategory.name] || ''
    },
    // tag 文字：项目一级类型（行业名，取值同 CATEGORIES 的 name）；接口可能给 id 或中文名，两种都兼容
    // 注意：tag 的底色不走行业色，仍取补贴分类色（与打点、边框一致）
    pointCardTag() {
      const detail = this.pointDetail || {}
      const nonStandard = detail.nonStandardDetail || {}
      const power = detail.powerGenerationDetail || {}
      const raw = (this.activePoint && this.activePoint.raw) || {}
      return nonStandard.projectType || power.projectType || raw.projectType || ''
    },
    // 是否非标项目（接口未返回时默认按发电项目展示点位原始字段）
    pointCardIsNonStandard() {
      const detail = this.pointDetail
      return !!(detail && detail.projectType === 'NON_STANDARD')
    },
    pointCardTitle() {
      const detail = this.pointDetail || {}
      const nonStandard = detail.nonStandardDetail || {}
      const power = detail.powerGenerationDetail || {}
      const raw = (this.activePoint && this.activePoint.raw) || {}
      return nonStandard.projectName || power.projectName || raw.projectName || ''
    },
    // 详情>>按钮显示条件：非标项目固定不展示；发电项目只有状态为运营(status='2')时才展示
    pointCardCanShowDetail() {
      if (this.pointCardIsNonStandard) return false
      const detail = this.pointDetail || {}
      const power = detail.powerGenerationDetail || {}
      return power.status === '2'
    },
    // 接口未返回时回退点位原始数据；字段值缺失（随项目状态差异）渲染为 --
    pointCardRows() {
      const raw = (this.activePoint && this.activePoint.raw) || {}
      const detail = this.pointDetail || {}
      const fmt = v => (v === undefined || v === null || v === '' ? '--' : v)
      const enumText = (map, code) => (map[code] !== undefined ? map[code] : fmt(code))
      if (this.pointCardIsNonStandard) {
        const n = detail.nonStandardDetail || {}
        const hasTransfer = n.platformTransfer !== undefined && n.platformTransfer !== null && n.platformTransfer !== ''
        return [
          { label: '实控人', value: fmt(n.actualController || raw.controller) },
          { label: '接入方式', value: enumText(PROJECT_DETAIL_TEXT.accessMethod, n.accessMethod) },
          { label: '生产及预警', value: enumText(PROJECT_DETAIL_TEXT.productionTypes, n.productionTypes) },
          { label: '项目规模', value: fmt(n.productionCapacity) },
          { label: '是否平台转发', value: hasTransfer ? enumText(PROJECT_DETAIL_TEXT.platformTransfer, n.platformTransfer) : PROJECT_DETAIL_TEXT.platformTransfer.none }
        ]
      }
      const p = detail.powerGenerationDetail || {}
      const capacity = p.capacity !== undefined ? p.capacity : (p.installCapacity !== undefined ? p.installCapacity : raw.capacity)
      const hours = p.hours !== undefined ? p.hours : (p.powerGenerationHours !== undefined ? p.powerGenerationHours : raw.hours)
      // 达标率：接口字段为 radio，不兼容旧 rate / yield 字段。
      // 仅当 radio 有值时展示；详情缺失时回退点位原始数据的同名字段
      const pickRadio = obj => (obj && obj.radio !== undefined && obj.radio !== null && obj.radio !== '' ? obj.radio : null)
      const detailRadio = pickRadio(p)
      const rate = detailRadio === null ? pickRadio(raw) : detailRadio
      // 结算电价优先取详情（兼容历史 editWindPrice），详情无值时回退点位数据
      const settleRaw = pickPriceValue(p, POINT_PRICE_COMPARE.priceFields)
      const settle = settleRaw === null ? pickPriceValue(raw, [POINT_TIP.valueField]) : settleRaw
      // 任一字段缺失或非数值时不渲染括号，避免出现「--（0.0000）」这类空差值
      const spot = pickPriceValue(p, POINT_PRICE_COMPARE.spotField)
      let settleSub = ''
      let settleSubColor = ''
      if (settle !== null && spot !== null) {
        const diff = Number(settle) - Number(spot)
        const arrow = diff > 0 ? '↑' : (diff < 0 ? '↓' : '')
        settleSub = `（${Math.abs(diff).toFixed(POINT_PRICE_COMPARE.digits)}${arrow}）`
        settleSubColor = diff > 0 ? POINT_PRICE_COMPARE.upColor
          : (diff < 0 ? POINT_PRICE_COMPARE.downColor : POINT_PRICE_COMPARE.flatColor)
      }
      const sube = p.subelePrice || p.subsidyPrice || raw.subsidyPrice
      const status = p.status === undefined || p.status === null || p.status === '' ? raw.status : p.status
      // 在建项目（status=1）不展示发电利用小时数、结算电价、补贴电价
      const isBuilding = String(status) === '1' || status === '在建'
      const rows = [
        { label: '实控人', value: fmt(p.actualController || raw.controller) },
        { label: '装机容量', value: `${fmt(capacity)}kW` }
      ]
      if (!isBuilding) {
        rows.push(
          { label: '发电利用小时数', value: `${fmt(hours)}h`, sub: rate === null ? '' : `（达标率：${rate}%）` },
          { label: '结算电价', value: `${fmt(settle)}元/kWh`, sub: settleSub, subColor: settleSubColor },
          { label: '补贴电价', value: `${fmt(sube)}元/kWh` }
        )
      }
      return rows
    }
  },
  watch: {
    points: {
      deep: true,
      handler() {
        this.renderOption()
      }
    },
    categories: {
      deep: true,
      handler() {
        this.renderOption()
      }
    },
    // 着色数据（电价维度切换 / 下钻换省）变化 → 重绘，visualMap 随数据更新
    provinceData: {
      deep: true,
      handler() {
        this.renderOption()
      }
    },
    // 省份 / 区域下钻、返回全国：切换注册对应的地图
    // 用 mapKey 统一监听，mapCode 与 region 单独变化都会落到这里（区域间切换也生效）
    mapKey() {
      this.loadRegionMap()
    },
    isFullscreen() {
      this.renderOption()
    },
    // 宽屏 ↔ 窄屏布局切换：地图容器宽度不变（都通栏），ResizeObserver 不会触发，
    sideRatio() {
      this.syncLegendPosition()
    }
  },
  mounted() {
    this.initChart()
    // 整页 zoom 放大后（2K/4K、全屏）鼠标命中点会按放大倍数偏移，换算回画布布局坐标
    this.unpatchPointer = patchZoomPointer(this.$refs.chart)
    // 容器尺寸变化（父级改为百分比宽高、窄屏堆叠布局切换导致地图形变区域变化）时跟随缩放；
    // resize mixin 只监听 window resize，覆盖不到这些场景，会导致地图拉伸变形或留白
    if (this.$refs.chart && typeof ResizeObserver !== 'undefined') {
      // 走 resize() 而非直接 chart.resize()：图例用 px 定位，需同步重排
      this.resizeObserver = new ResizeObserver(() => this.resize())
      this.resizeObserver.observe(this.$refs.chart)
    }
  },
  beforeDestroy() {
    // 先打销毁标记并断开容器观察：ResizeObserver 已排队的回调仍会执行一次，
    // 此时容器宽高为 0，继续 chart.resize() 会让 ECharts geo 拿到空变换矩阵而抛错
    this._mapDestroyed = true
    if (this.resizeObserver) {
      this.resizeObserver.disconnect()
      this.resizeObserver = null
    }
    if (this.unpatchPointer) {
      this.unpatchPointer()
      this.unpatchPointer = null
    }
    if (this._maskTimer) {
      clearTimeout(this._maskTimer)
      this._maskTimer = null
    }
    this.unbindWrapEvents()
    this.unbindFullscreen()
    if (this.chart) {
      this.chart.dispose()
      this.chart = null
    }
  },
  methods: {
    // 地图区域名 → tooltip 数据：GeoJSON 的省级名是短名（贵州），市级名带后缀（贵阳市），
    // 而接口分组名可能写全称/短名两种口径；按原名、去后缀、补后缀逐级匹配，避免 tooltip 取不到数据
    findRegionTooltipData(name) {
      const source = this.regionTooltipData || {}
      const raw = String(name || '').trim()
      if (!raw) return null
      if (source[raw]) return source[raw]
      const stripped = raw.replace(/(省|市|自治区|特别行政区|地区|盟|自治州)$/, '')
      if (stripped && stripped !== raw) {
        if (source[stripped]) return source[stripped]
        const withCity = `${stripped}市`
        if (source[withCity]) return source[withCity]
      }
      const withSuffix = Object.keys(source).find(key => {
        const keyStripped = String(key || '').trim().replace(/(省|市|自治区|特别行政区|地区|盟|自治州)$/, '')
        return keyStripped === stripped || keyStripped === raw
      })
      return withSuffix ? source[withSuffix] : null
    },
    // 左右侧让位宽度（px）= 容器宽 × 浮层占比 + 间距，与 CSS 的 --map-side-inset 同口径：
    calcSideInset() {
      const width = this.chart ? this.chart.getWidth() : 0
      const gutter = this.sideRatio > 0 ? SIDE_GUTTER * 2 : SIDE_GUTTER
      return Math.round(width * this.sideRatio) + gutter
    },
    // 覆盖 resize mixin：容器尺寸变化后除了重绘，还要重排用 px 定位的颜色图例
    resize() {
      const el = this.$refs.chart
      // 组件销毁过程 / 容器已被移除（宽高为 0）时不能再 resize：
      if (this._mapDestroyed || !this.chart || !el || !el.clientWidth || !el.clientHeight) return
      // 页面整体缩放变了（窗口跨 1080P/2K/4K 档位）：画布像素比得重建，直接 resize 会糊
      if (this.chartDpr !== getChartDpr()) {
        this.chart.dispose()
        this.initChart()
        return
      }
      this.chart.resize()
      // 尺寸变化后重新自适应放大（比例变了，原来的 zoom 会留白或溢出）
      this.fitMapZoom()
      const left = this.calcSideInset()
      if (left === this._legendLeft) return
      this._legendLeft = left
      this.chart.setOption({ visualMap: { left }})
    },
    syncLegendPosition() {
      this.$nextTick(() => this.resize())
    },
    // 底座跟随主图：把主图当前的 zoom/center 原样写入底座的模型与坐标系。
    // 不用「转发相对增量」：两层 viewRect 有 layoutCenter 偏移，相同的 dx/dy/zoom 增量
    // 直接对齐绝对值可保证任意层级下两层严格重合，屏幕间距恒等于 layoutCenter 偏移。

    initChart() {
      // 大屏 zoom 适配：画布像素比要乘上页面缩放系数，否则 4K 下地图被拉伸发虚
      this.chartDpr = getChartDpr()
      this.chart = echarts.init(this.$refs.chart, null, { devicePixelRatio: this.chartDpr })
      this.renderOption()
      this.chart.on('click', this.handleClick)
      // 主图缩放/平移时同步灰色底座：微任务中执行，与主图在同一帧重绘，视觉上完全同步
      this.chart.on('georoam', (params) => {
        if (!params || params.geoId !== 'mapMain') return

        const action = {
          type: 'geoRoam',
          componentType: 'geo',
          geoId: 'mapShadow',
          dx: params.dx || 0,
          dy: params.dy || 0
        }

        // 只有缩放事件才携带 zoom，避免把未定义的值传进去
        if (params.zoom != null) {
          action.zoom = params.zoom
          action.originX = params.originX
          action.originY = params.originY
        }

        this.chart.dispatchAction(action)
      })
      // 注意：区域命中的事件归属是绑定了 geoIndex 的 map series（componentType='series'、
      this.chart.on('mousemove', params => {
        const isRegion = params.componentType === 'geo' || params.componentSubType === 'map'
        if (isRegion && this.capitalIcon) {
          const ev = params.event || {}
          this.hoverIconPos = { x: (ev.offsetX || 0) - 16, y: (ev.offsetY || 0) - 32 }
          this.hoverIcon = this.capitalIcon
        } else if (this.hoverIcon) {
          this.hoverIcon = ''
        }
      })
      this.chart.getZr().on('mousemove', e => {
        if (!e.target && this.hoverIcon) this.hoverIcon = ''
      })
      this.chart.on('globalout', () => {
        this.hoverIcon = ''
      })
      this.bindFullscreen()
      // 全局兜底（捕获阶段）：鼠标跟随图标只在指针位于本地图画布上时展示；
      this._onDocMove = e => {
        const t = e.target
        const wrap = this.$refs.wrap
        const onCanvas = !!(t && t.tagName === 'CANVAS' && wrap && wrap.contains(t))
        if (!onCanvas && this.hoverIcon) this.hoverIcon = ''
        const insideWrap = !!(wrap && (wrap === t || (t && wrap.contains(t))))
        if (!insideWrap && this.activePoint) this.activePoint = null
      }
      this._onDocOut = e => {
        if (!e.relatedTarget && !e.toElement) {
          if (this.hoverIcon) this.hoverIcon = ''
          if (this.activePoint) this.activePoint = null
        }
      }
      this._onAnyScroll = () => {
        if (this.hoverIcon) this.hoverIcon = ''
        if (this.activePoint) this.activePoint = null
      }
      document.addEventListener('mousemove', this._onDocMove, true)
      document.addEventListener('mouseout', this._onDocOut, true)
      window.addEventListener('scroll', this._onAnyScroll, true)
      window.addEventListener('blur', this._onAnyScroll)
      this._onMapLeave = () => {
        if (this.hoverIcon) this.hoverIcon = ''
        if (this.activePoint) this.activePoint = null
      }
      if (this.$refs.wrap) this.$refs.wrap.addEventListener('mouseleave', this._onMapLeave)
      // 点击卡片外部关闭弹窗（事件捕获阶段拦截，卡片内点击通过 @click.stop 阻止冒泡）
      this._onDocClick = e => {
        if (!this.activePoint) return
        const card = this.$refs.pointCard
        if (card && !card.contains(e.target)) {
          this.activePoint = null
        }
      }
      document.addEventListener('click', this._onDocClick, true)
    },
    unbindWrapEvents() {
      if (this._onDocMove) document.removeEventListener('mousemove', this._onDocMove, true)
      if (this.$refs.wrap && this._onMapLeave) this.$refs.wrap.removeEventListener('mouseleave', this._onMapLeave)
      this._onMapLeave = null
      if (this._onDocOut) document.removeEventListener('mouseout', this._onDocOut, true)
      if (this._onAnyScroll) {
        window.removeEventListener('scroll', this._onAnyScroll, true)
        window.removeEventListener('blur', this._onAnyScroll)
      }
      if (this._onDocClick) document.removeEventListener('click', this._onDocClick, true)
      this._onDocMove = null
      this._onDocOut = null
      this._onAnyScroll = null
      this._onDocClick = null
    },
    //   mapKey = '{code}|{region}'       → 只含该业务区域（蒙西/蒙东、冀北/河北南网）地市的图
    async loadRegionMap() {
      const key = this.mapKey
      if (key === 'china') {
        this.renderOption()
        return
      }
      if (this.mapCache[key]) {
        this.renderOption()
        return
      }
      // 立刻铺遮罩会在下钻瞬间闪一层灰（地图越流畅越明显）；超过阈值才显示，慢加载仍有反馈。
      this._maskTimer = setTimeout(() => { this.loading = true }, MAP_LOADING_DELAY)
      try {
        // 走静态映射表（map/index.js）：
        //   webpack 无法静态收集上级目录模块，运行时报 Cannot find module，因此这里不能用 import(`../map/${code}_full.json`)
        //   静态路径映射两种环境都能解析，生产构建会拆成独立的异步 chunk，按需加载不占首屏体积
        // 兼容不同编译环境的模块互操作（default 导出可能被 interop 包一层）
        const [code, region] = key.split('|')
        const loaders = provinceMapLoaders.default || provinceMapLoaders
        const loader = loaders[code]
        if (!loader) throw new Error(`缺少省份地图文件: ${code}.json（请先运行 node scripts/download-map-data.js）`)
        const geoJsonModule = await loader()
        const provinceGeoJson = (geoJsonModule && geoJsonModule.default) || geoJsonModule
        // 区域下钻：只保留本区域的地市面，蒙西下钻后不会再画出蒙东
        const geoJson = region ? this.filterRegionGeoJson(provinceGeoJson) : provinceGeoJson
        echarts.registerMap(key, geoJson)
        this.mapCache[key] = true
        this.renderOption()
      } catch (error) {
        console.error('省份地图加载失败:', error)
        this.$message.error('省份地图加载失败')
      } finally {
        clearTimeout(this._maskTimer)
        this._maskTimer = null
        this.loading = false
      }
    },
    // 按 regionCities 过滤省级 GeoJSON 的 feature（区域下钻用）
    // 匹配时去掉行政后缀，兼容 GeoJSON 的「呼和浩特市」与配置里的「呼和浩特」
    filterRegionGeoJson(provinceGeoJson) {
      const wanted = (this.regionCities || []).map(stripSuffix)
      if (!wanted.length) return provinceGeoJson
      const features = (provinceGeoJson.features || []).filter(feature => {
        const name = stripSuffix(feature && feature.properties && feature.properties.name)
        return wanted.indexOf(name) >= 0
      })
      if (!features.length) {
        console.warn('区域地市与地图数据未匹配，回退为整省地图:', this.region, this.regionCities)
        return provinceGeoJson
      }
      return Object.assign({}, provinceGeoJson, { features })
    },
    // symbolSize 必须用数字：数组尺寸会让 zrender 走 scale 缩放渲染（style.width=2 + scale），
    buildSeries() {
      const groups = {}
      this.points.forEach(p => {
        const lngRaw = p[this.fieldMap.lng]
        const latRaw = p[this.fieldMap.lat]
        const lng = Number(lngRaw)
        const lat = Number(latRaw)
        // 坐标缺失（null/undefined）或不可解析 → 丢弃该点（Number(null)=0，不能用 isNaN 单独拦截）
        if (lngRaw == null || latRaw == null || lngRaw === '' || latRaw === '' ||
          isNaN(lng) || isNaN(lat)) return
        const cat = p[this.fieldMap.category]
        const arr = groups[cat] || (groups[cat] = [])
        const icon = this.subsidyIcons[p.subsidy]
        arr.push(Object.assign(
          { name: p[this.fieldMap.name] || '--', value: [lng, lat], raw: p },
          // station 图标是底部带尖角的 pin，ECharts 默认按图片中心对齐坐标，
          // 会让尖角落在真实坐标下方；上移 40% 让尖角对准经纬度点
          icon ? { symbol: `image://${icon}`, symbolSize: 28, symbolOffset: [0, '-40%'] } : {}
        ))
      })

      const known = new Set(this.categories.map(c => c.id))
      const series = this.categories.map(c => ({
        name: c.name,
        type: 'scatter',
        coordinateSystem: 'geo',
        geoIndex: 1, // 指向主 geo（geo[0] 是灰色底座）
        symbolSize: 10,
        itemStyle: { color: c.color },
        emphasis: {
          scale: true,
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 1
          }
        },
        data: groups[c.id] || []
      }))

      const others = []
      Object.keys(groups).forEach(k => { if (!known.has(k)) others.push(...groups[k]) })
      if (others.length) {
        series.push({
          name: '其他',
          type: 'scatter',
          coordinateSystem: 'geo',
          geoIndex: 1,
          symbolSize: 10,
          itemStyle: { color: this.defaultColor },
          data: others
        })
      }

      // 省会标记默认不渲染（会遮挡省份悬浮高亮与点击下钻），保留 capitals prop 供需要时开启
      return series
    },
    // 底图系列：区域绘制 + 电价着色（visualMap 作用其上），与 geo 共享坐标系，保证缩放平移时散点同步
    buildMapSeries(mapName, hasColor) {
      return {
        name: '省份电价',
        type: 'map',
        map: mapName,
        geoIndex: 1,
        // 显示省份名称（点击省份可下钻）
        label: {
          show: true,
          color: '#303133',
          fontSize: 12
        },
        itemStyle: {
          // 有电价数据时颜色由 visualMap 接管；下钻到省后无省级着色、全国未选电价时也用灰白底
          areaColor: hasColor || this.mapCode ? '#f0f2f5' : '#ffffff',
          // 区域之间只用细界线区分，不带投影（原 shadowColor/shadowBlur/shadowOffsetY 已移除）：
          borderColor: hasColor || this.mapCode ? '#ffffff' : '#e6e9ef',
          borderWidth: 1.5
        },
        emphasis: {
          itemStyle: {
            areaColor: 'rgba(0, 200, 0, 0.18)',
            borderColor: '#00c800',
            borderWidth: 2.5
          },
          label: { show: true, color: '#1a5c1a', fontWeight: 600 }
        },
        data: hasColor ? this.provinceData : []
      }
    },
    renderOption() {
      if (this._mapDestroyed || !this.chart) return
      const mapName = this.mapKey !== 'china' && this.mapCache[this.mapKey] ? this.mapKey : 'china'
      const values = (this.provinceData || []).map(d => Number(d.value) || 0)
      const hasColor = values.length > 0
      const min = hasColor ? Math.min(...values) : 0
      const max = hasColor ? Math.max(...values) : 0
      const legendLeft = this.calcSideInset()
      this._legendLeft = legendLeft

      const option = {
        // 地图与点位全部即时渲染：下钻省份 / 返回全国 / 数据刷新都不再走
        // 「点位飞入 + 区域形变」的过渡动画，画面立刻可用（悬停高亮、缩放交互不受影响）
        animation: false,
        tooltip: {
          trigger: 'item',
          confine: true,
          // 上方空间不足时落到鼠标下方，左右再按容器宽度收敛，避免溢出
          position: (point, params, dom, rect, size) => {
            const gap = 38
            const contentWidth = size.contentSize[0]
            const contentHeight = size.contentSize[1]
            const viewWidth = size.viewSize[0]
            let x = point[0] - contentWidth / 2
            let y = point[1] - contentHeight - gap
            if (y < 4) y = point[1] + gap
            x = Math.max(4, Math.min(x, viewWidth - contentWidth - 4))
            return [x, y]
          },
          backgroundColor: 'transparent',
          borderWidth: 0,
          padding: 0,
          extraCssText: 'box-shadow: none;',
          formatter: params => {
            // 区域悬浮：省份/区县均固定展示风电、光伏、标杆三行，含专属图标与括号差值
            if (params.seriesType === 'map' || params.componentType === 'geo') {
              const data = this.findRegionTooltipData(params.name)
              const rows = REGION_PRICE_COMPARE.map(item => {
                const v = data ? pickPriceValue(data, item.fields || item.field) : null
                const hasV = v !== null
                const iconSrc = REGION_PRICE_ICONS[item.id]
                const icon = iconSrc
                  ? `<img src="${iconSrc}" style="width:14px;height:14px;vertical-align:-3px;margin-right:4px;">`
                  : ''
                const priceHtml = `${icon}${item.label}：<b>${hasV ? v : ' '}</b>`
                const diffNone = ' '
                if (item.noDiff) return priceHtml
                const benchmark = data ? pickPriceValue(data, item.diffFields || item.diffField) : null
                const vn = Number(v)
                const bn = Number(benchmark)
                if (!hasV || benchmark === null || isNaN(vn) || isNaN(bn)) return `${priceHtml}${diffNone}`
                const diff = Math.round((vn - bn) * 100) / 100
                if (diff > 0) {
                  return `${priceHtml}<span style="color:#2fc25b;margin-left:6px;">（${Math.abs(diff).toFixed(2)}↓）</span>`
                }
                if (diff < 0) {
                  return `${priceHtml}<span style="color:#f56c6c;margin-left:6px;">（${Math.abs(diff).toFixed(2)}↑）</span>`
                }
                return `${priceHtml}<span style="color:#909399;margin-left:6px;">（0.00）</span>`
              }).join('<br/>')
              // 拆分省份（内蒙古/河北）下钻：浮层先展示业务区域名（蒙西/蒙东、冀北/河北南网）
              const regionHead = data && data._regionName
                ? `<div style="font-size:12px;opacity:.85;margin-bottom:2px;">${data._regionName}</div>`
                : ''
              return this.wrapTooltip(`${regionHead}${rows}`)
            }
            return ''
          }
        },
        // geo 承担区域绘制：map series 与 geo 共享坐标系（geoIndex）时不绘制图形（MapView.render 直接 return），
        // 仅承载数据供 visualMap 着色（着色通过 series 数据写入 geo regions）；因此底图/悬浮/标签样式都配在 geo 上
        geo: [
          {
            id: 'mapShadow',
            map: mapName,
            layoutCenter: ['50%', '49%'],
            layoutSize: '103%',
            zoom: 0.8,
            scaleLimit: { min: 0.4, max: 2 },
            // roam 关闭：底座的 roam 控制器始终会因「指针压在主图区域上」
            // 被 onIrrelevantElement 判定为不相关而永不触发，跟随必须由主图事件转发完成
            roam: false,
            silent: true,
            label: { show: false },
            itemStyle: {
              areaColor: '#ccd4dc',
              borderColor: '#b9c3cd',
              borderWidth: 0.5
            }
          },
          {
            id: 'mapMain',
            // 全国地图 / 下钻后的省市区县地图（mapCode 为空时回全国）
            map: mapName,
            // 与底座同布局尺寸（仅 layoutCenter 偏移），保证缩放平移后两图严格对齐
            layoutCenter: ['50%', '48%'],
            layoutSize: '104%',
            roam: true,
            zoom: 0.8,
            scaleLimit: { min: 0.4, max: 2 },
            label: { show: true, color: '#303133', fontSize: 12 },
            itemStyle: {
              // 有电价着色或已下钻到省 → 灰白底；全国未选电价 → 纯白无热力（交互7）
              // 区域绘制实际取 geo 样式，此处与 buildMapSeries 保持一致
              areaColor: hasColor || this.mapCode ? '#f0f2f5' : '#ffffff',
              // 区域之间只用细界线区分，不带投影（原 shadowColor/shadowBlur/shadowOffsetY 已移除）：
              borderColor: hasColor || this.mapCode ? '#ffffff' : '#e6e9ef',
              borderWidth: 1.5
            },
            emphasis: {
              itemStyle: {
                // 悬浮：区域填充透明绿、边框变绿并加粗
                areaColor: 'rgba(0, 200, 0, 0.18)',
                borderColor: '#00c800',
                borderWidth: 2.5
              },
              label: { show: true, color: '#1a5c1a', fontWeight: 600 }
            }
          }
        ],
        // 左下角颜色图例：改用 echarts visualMap（连续型），与地图着色同源
        // 无数据占位：选中了电价维度但接口无数据（如下钻省份全部为 0）时，
        visualMap: hasColor
          ? {
            type: 'continuous',
            seriesIndex: 0,
            min,
            max: max === min ? min + 0.01 : max,
            orient: 'vertical',
            left: legendLeft,
            bottom: 12,
            itemWidth: 16,
            itemHeight: 160,
            calculable: false,
            text: ['高', '低'],
            textStyle: { color: '#303133', fontSize: 12 },
            inRange: { color: ['#d6e8ff', '#7db9ff', '#0088ff'] }
          }
          : (this.priceType
            ? {
              type: 'continuous',
              seriesIndex: 0,
              min: 0,
              max: 1,
              orient: 'vertical',
              left: legendLeft,
              bottom: 12,
              itemWidth: 16,
              itemHeight: 160,
              calculable: false,
              text: ['高', '低'],
              textStyle: { color: '#c0c4cc', fontSize: 12 },
              inRange: { color: ['#f0f2f5', '#f0f2f5'] }
            }
            : { show: false }),
        legend: { show: false },
        series: [this.buildMapSeries(mapName, hasColor)].concat(this.buildSeries())
      }
      this.chart.setOption(option, true)
      this.fitMapZoom()
    },
    // 不做这一步时 zoom 固定 0.8，宽屏/窄屏/全屏下地图都缩在中部、四周留大片空白
    fitMapZoom() {
      const el = this.$refs.chart
      if (this._mapDestroyed || !this.chart || this._fitting || !el || !el.clientWidth || !el.clientHeight) return
      let geoModel = null
      this.chart.getModel().eachComponent('geo', model => {
        if (model.id === 'mapMain') geoModel = model
      })
      const coord = geoModel && geoModel.coordinateSystem
      const regions = (coord && coord.regions) || []
      if (!regions.length) return
      // 地图经纬包围盒：逐区域手算 min/max（区域 rect 不保证是 BoundingRect 实例，union 会算错）
      let minX = Infinity
      let minY = Infinity
      let maxX = -Infinity
      let maxY = -Infinity
      regions.forEach(region => {
        const rect = typeof region.getBoundingRect === 'function' ? region.getBoundingRect() : null
        if (!rect || !rect.width || !rect.height) return
        minX = Math.min(minX, rect.x)
        minY = Math.min(minY, rect.y)
        maxX = Math.max(maxX, rect.x + rect.width)
        maxY = Math.max(maxY, rect.y + rect.height)
      })
      if (!isFinite(minX) || !isFinite(maxX)) return
      // 经纬盒 → 像素：convertToPixel 走的是含 layoutCenter / layoutSize / zoom 的完整变换，
      const p0 = this.chart.convertToPixel({ geoIndex: 1 }, [minX, minY])
      const p1 = this.chart.convertToPixel({ geoIndex: 1 }, [maxX, maxY])
      if (!p0 || !p1) return
      const usedW = Math.abs(p1[0] - p0[0])
      const usedH = Math.abs(p1[1] - p0[1])
      if (!usedW || !usedH) return
      const option = geoModel.option || {}
      const zoom = option.zoom || 1
      const width = this.chart.getWidth()
      const height = this.chart.getHeight()
      // 可用区域：左右去掉浮层让位（与颜色图例同口径），上下留出工具栏与底部按钮。
      // 圆心不一定在容器正中（layoutCenter 纵向 48%），所以按「圆心到四条边界的最小余量」反算，
      // 而不是直接用容器尺寸，否则放大后一侧仍会压到工具栏
      const padX = this.calcSideInset()
      const padY = MAP_V_PADDING
      const centerX = (p0[0] + p1[0]) / 2
      const centerY = (p0[1] + p1[1]) / 2
      const halfW = usedW / 2
      const halfH = usedH / 2
      const factor = Math.min(
        (centerX - padX) / halfW,
        (width - padX - centerX) / halfW,
        (centerY - padY) / halfH,
        (height - padY - centerY) / halfH
      ) * MAP_FILL_RATIO
      if (!isFinite(factor) || factor <= 0) return
      const limit = option.scaleLimit || {}
      const next = Math.max(limit.min || 0.4, Math.min(limit.max || 2, zoom * factor))
      if (Math.abs(next - zoom) < 0.01) return
      // 主图与灰色底座用同一 zoom：两层靠相同 zoom + layoutCenter 偏移保持 3D 错位
      this._fitting = true
      this.chart.setOption({
        geo: [{ id: 'mapShadow', zoom: next }, { id: 'mapMain', zoom: next }]
      })
      this._fitting = false
    },
    wrapTooltip(html) {
      return `<div style="background: rgba(23, 35, 54, 0.9); color: #fff; padding: 5px 12px; border-radius: 14px; font-size: 12px; line-height: 1.6; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3); white-space: nowrap;">${html}</div>`
    },
    handleClick(params) {
      if (params.seriesType === 'scatter') {
        const raw = params.data && params.data.raw
        if (raw) {
          const ev = params.event || {}
          const cardWidth = 300
          const wrap = this.$refs.wrap
          const maxLeft = wrap ? Math.max(wrap.clientWidth - cardWidth - 8, 8) : 600
          const x = Math.min(Math.max((ev.offsetX || 0) + 16, 8), maxLeft)
          const y = Math.max((ev.offsetY || 0) - 150, 8)
          this.activePoint = { x, y, raw }
          this.$emit('point-click', raw)
        }
        return
      }
      // 点击地图空白处 / 区域时关闭点位卡片
      this.activePoint = null
      // 区域由 geo 绘制，点击省份/区县命中的是 geo（map series 共享 geoIndex 时不绘制图形）
      if ((params.componentType === 'geo' || params.seriesType === 'map') && params.name) {
        // 点击省份区域 → 下钻
        this.$emit('region-click', { province: params.name })
      }
    },
    toggleFullscreen() {
      this.setFullscreen(!this.isFullscreen)
    },
    setFullscreen(flag) {
      const pageRoot = (this.$el && this.$el.closest && this.$el.closest('.home-overview')) || null
      if (flag) {
        const el = pageRoot || document.documentElement
        el.requestFullscreen ? el.requestFullscreen() : null
      } else {
        document.exitFullscreen ? document.exitFullscreen() : null
      }
    },
    toggleBuild(id) {
      const next = this.buildFilter.includes(id)
        ? this.buildFilter.filter(v => v !== id)
        : this.buildFilter.concat(id)
      this.$emit('update:buildFilter', next)
    },
    toggleSubsidy(label) {
      const next = this.subsidyFilter.includes(label)
        ? this.subsidyFilter.filter(v => v !== label)
        : this.subsidyFilter.concat(label)
      this.$emit('update:subsidyFilter', next)
    },
    bindFullscreen() {
      this._onFsChange = () => {
        this.isFullscreen = !!document.fullscreenElement
        this.$nextTick(() => {
          const el = this.$refs.chart
          // 退出全屏瞬间容器可能还是 0 尺寸，跳过这次 resize，避免 geo 变换矩阵为空
          if (this._mapDestroyed || !this.chart || !el || !el.clientWidth || !el.clientHeight) return
          this.chart.resize()
        })
      }
      document.addEventListener('fullscreenchange', this._onFsChange)
    },
    unbindFullscreen() {
      if (this._onFsChange) {
        document.removeEventListener('fullscreenchange', this._onFsChange)
        this._onFsChange = null
      }
    },
    // 更多>> / 详情>>：把地图 projectList 的 projectColor 连同详情数据交给父组件，
    // 目标详情页据此做项目分类（蓝色=无补贴、绿色=已补贴），不再用旧字段分类
    handlePointMore() {
      const raw = this.activePoint.raw
      const detail = this.pointDetail || {}
      this.$emit('handlePointMore', { raw, projectColor: raw.projectColor, detail })
    },
    handlePointDetail() {
      const raw = this.activePoint.raw
      const detail = this.pointDetail || {}
      this.$emit('handlePointDetail', { raw, projectColor: raw.projectColor, detail })
    }
  }
}
</script>

<style lang="scss" scoped>
.echarts-china-map {
  position: relative;
  width: 100%;
  height: 100%;
  background: #f5f7fa url('../bg.png') center / cover no-repeat;

  &__canvas {
    width: 100%;
    height: 100%;
  }

  &__fullscreen {
    position: absolute;
    right: 12px;
    top: 12px;
    z-index: 10;
    width: 28px;
    height: 28px;
    line-height: 28px;
    text-align: center;
    background: rgba(255, 255, 255, 0.92);
    border-radius: 4px;
    cursor: pointer;
    color: #606266;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);

    &:hover {
      color: #0088ff;
    }
  }

  &__panel {
    position: absolute;
    z-index: 10;
    padding: 8px;
    border-radius: 8px;
    border-radius: 8px;
    background-color: rgba(96,105,127,0.5);
    box-shadow: 0px 2px 6px 0px rgba(96,105,127,0.4);
    color: #fff;
  }

  &__panel--build {
    top: var(--map-panel-top, 60px);
    right: var(--map-side-inset, 12px);
  }

  &__panel--subsidy {
    right: var(--map-side-inset, 12px);
    bottom: var(--panel-gutter, 12px);
  }

  /* 颜色图例由 echarts visualMap 绘制在画布左下角（left = --map-side-inset） */
  &__panel--legend {
    /* 电价菜单排在 visualMap 右侧：让位宽度 + 图例宽 48 + 间距 8 */
    left: calc(var(--map-side-inset, 12px) + 56px);
    bottom: var(--panel-gutter, 12px);
    display: flex;
    flex-direction: row;
    align-items: flex-end;
    padding: 0;
    background: transparent;
    box-shadow: none;
  }

  &__check {
    display: flex;
    align-items: center;
    padding: 4px 6px;
    border-radius: 4px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.75);
    cursor: pointer;
    white-space: nowrap;
    user-select: none;

    &:hover {
      background: rgba(255, 255, 255, 0.16);
    }

    &.is-active {
      color: #fff;
      font-weight: 600;
    }
  }

  &__checkbox {
    width: 12px;
    height: 12px;
    margin-right: 6px;
    border: 1px solid #dcdfe6;
    border-radius: 2px;
    background: #fff;
    position: relative;
    flex-shrink: 0;

    .is-active > & {
      background: #67c23a;
      border-color: #67c23a;

      &::after {
        content: '';
        position: absolute;
        left: 3px;
        top: 0px;
        width: 4px;
        height: 8px;
        border: solid #fff;
        border-width: 0 2px 2px 0;
        transform: rotate(45deg);
      }
    }
  }

  &__check-icon {
    width: 16px;
    height: 16px;
    margin-right: 6px;
    object-fit: contain;
    flex-shrink: 0;
  }

  &__price {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__price-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 5px 12px;
    border-radius: 4px;
    background-color: rgba(96, 105, 127, 0.3);
    color: rgba(255, 255, 255, 1);
    font-size: 12px;
    text-align: left;
    font-family: Arial-regular;
    cursor: pointer;
    white-space: nowrap;
    user-select: none;

    &.is-active {
      background-color: rgba(0, 136, 255, 1);
    }
  }

  /* radio 控件：白色圆环 + 中心圆点，选中/未选中样式一致，选中态靠胶囊底色区分 */
  &__price-dot {
    position: relative;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 1);
    background: transparent;
    box-sizing: border-box;
    flex-shrink: 0;

    &::after {
      content: '';
      position: absolute;
      left: 50%;
      top: 50%;
      width: 4px;
      height: 4px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 1);
      transform: translate(-50%, -50%);
    }
  }

  &__fs-bar {
    position: absolute;
    left: 50%;
    bottom: var(--panel-gutter, 12px);
    transform: translateX(-50%);
    z-index: 10;
    display: flex;
    gap:12px;
  }

  &__fs-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 5px 14px;
    font-size: 13px;
    color: #fff;
    cursor: pointer;
    user-select: none;
    border-radius: 80px;
    background-color: rgba(96,105,127,0.5);
    box-shadow: 0px 2px 6px 0px rgba(96,105,127,0.4);
    img {
      width: 14px;
      height: 14px;
      object-fit: contain;
    }
  }

  &__loading {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f5f7fa;
    color: #909399;
    font-size: 13px;
  }

  &__hover-icon {
    position: absolute;
    width: 30px;
    height: auto;
    pointer-events: none;
    z-index: 5;
  }

  &__point-card {
    position: absolute;
    width: 300px;
    padding: 10px 12px;
    background: #fff;
    border: 2px solid #f5a623;
    border-radius: 0 8px 8px 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.18);
    font-size: 12px;
    color: #303133;
    z-index: 20;
  }

  &__point-card-tag {
    position: absolute;
    top: -27px;
    left: -2px;
    height: 27px;
    padding: 0 14px;
    background: var(--point-card-color, #008cff);
    color: #fff;
    border-radius: 6px 10px 0 0;
    font-size: 12px;
    line-height: 27px;
    white-space: nowrap;
    z-index: 1;

    &::after {
      content: '';
      position: absolute;
      top: 0;
      right: -10px;
      width: 20px;
      height: 27px;
      background: var(--point-card-color, #008cff);
      transform: skewX(25deg);
      transform-origin: bottom;
      border-radius: 0 6px 0 0;
      z-index: -1;
    }
  }

  &__point-card-head {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 4px;
  }

  &__point-card-pin {
    width: 14px;
    height: 18px;
    object-fit: contain;
    flex-shrink: 0;
  }

  &__point-card-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__point-card-title {
    flex: 1;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__point-card-more {
    flex-shrink: 0;
    color: #f5a623;
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }

  &__point-card-row {
    line-height: 1.9;

    &.is-loading {
      color: #909399;
    }
  }

  &__point-card-footer {
    margin-top: 2px;
    text-align: right;
    position: absolute;
    right: 12px;
    bottom: 36px;
  }

  &__point-card-detail {
    cursor: pointer;

    &:hover {
      text-decoration: underline;
    }
  }

  &__point-card-label {
    color: #909399;
  }
}
</style>
