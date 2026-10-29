<template>
  <div ref="wrap" class="echarts-china-map">
    <div ref="chart" class="echarts-china-map__canvas" />

    <!-- 右上角：显示状态筛选（多选，时间控件下方） -->
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

    <!-- 右下角：补贴属性筛选（多选） -->
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

    <!-- 左下角：颜色图例由 echarts visualMap 在画布内渲染；此处只保留结算电价菜单（单选，check/uncheck 图标）。
         菜单与行业筛选无关，始终展示：不勾选任何电价维度时该维度不着色，菜单本身仍常驻可点 -->
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

    <!-- 底部中间：返回（下钻省份时显示） + 全屏/退出全屏（同一时刻只展示一个） -->
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

    <!-- 悬浮省份/市区跟随图标（原型：鼠标位置显示 province 图标，底尖对准鼠标） -->
    <img
      v-if="hoverIcon"
      class="echarts-china-map__hover-icon"
      :src="hoverIcon"
      :style="{ left: hoverIconPos.x + 'px', top: hoverIconPos.y + 'px' }"
      alt=""
    >

    <!-- 点位点击详情卡片（原型：白色卡片 + 更多>>；tag 文字为行业名、配色为补贴分类色；发电/非标两类字段不同） -->
    <div
      v-if="activePoint"
      ref="pointCard"
      class="echarts-china-map__point-card"
      :style="{ left: activePoint.x + 'px', top: activePoint.y + 'px', borderColor: pointCardColor }"
      @click.stop
    >
      <!-- tag 底色随补贴分类色变化：用 CSS 变量下发，主体与右侧斜切角共用同一颜色 -->
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
          <span v-if="row.sub" :style="{ color: pointCardColor }">{{ row.sub }}</span>
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
// 全国底图采用「分区版」GeoJSON：内蒙古拆成 蒙西/蒙东、河北拆成 冀北/河北南网
// 由 scripts/build-split-map.js 生成（地市面多边形合并），properties.name 即区域名
import chinaJson from '@/assets/maps/china.json'
import * as provinceMapLoaders from '@/assets/maps'
import resize from '@/components/Charts/mixins/resize'
import chartLifecycle from './mixins/chartLifecycle'
import { REGION_PRICE_COMPARE, pointCategory, PROJECT_DETAIL_TEXT, pickPriceValue } from '../overview/config'
import priceIcon from '../price.png'

// 注册中国地图（模块级只注册一次）
echarts.registerMap('china', chinaJson)

// 去掉行政后缀，用于区域内地市面匹配（呼和浩特市→呼和浩特、锡林郭勒盟→锡林郭勒）
const stripSuffix = name => String(name || '').replace(/(市|盟|地区|自治州|自治区|省)$/, '')

const DEFAULT_COLOR = '#0088ff'

// 地图默认填充率：自适应放大后地图占「可用区域」的比例（留一点边距，
// 灰色底座比主图大 3%，取 0.98 时底座刚好贴边不溢出）
const MAP_FILL_RATIO = 0.98
// 可用区域的上下留白（px）：上方是分类/筛选条，下方是图例与全屏按钮
const MAP_V_PADDING = 34
// 浮动菜单距地图边缘的间距（px），与父级样式里的 --panel-gutter 保持一致
const SIDE_GUTTER = 12
// 地图初始缩放与缩放上下限：主图与灰色底座必须用同一组值，
// 否则某一层先到极值被单向截断，两层会错开（底座漂移）
const MAP_ZOOM = 0.8
const MAP_SCALE_LIMIT = { min: 0.4, max: 2 }
// 省份 GeoJSON 未到位时「加载中遮罩」的延迟出现阈值（ms）：
// 加载通常几十毫秒完成，立刻铺遮罩会让下钻闪一层灰；超过该时长才显示，真正慢加载仍有反馈
const MAP_LOADING_DELAY = 250

/**
 * 通用 echarts 2D 中国地图（打点 / 悬浮卡片 / 分类图例显隐 / 全屏）
 * 纯展示：点位、分类配色、悬浮字段全部由 props 传入，不含任何业务请求
 * 对外事件：point-click（点击点位）/ region-click（点击省份区域，用于下钻）
 */
export default {
  name: 'EchartsChinaMap',
  mixins: [resize, chartLifecycle],
  props: {
    // 点位数据：[{ id, name, lng, lat, category, ... }]
    points: { type: Array, default: () => [] },
    // 字段映射，后端字段改名只需改这里
    fieldMap: {
      type: Object,
      default: () => ({ id: 'id', name: 'name', lng: 'lng', lat: 'lat', category: 'category' })
    },
    // 分类配色：[{ id, name, color }]
    categories: { type: Array, default: () => [] },
    defaultColor: { type: String, default: DEFAULT_COLOR },
    // 兼容旧接口：图层与已激活图层（此处用 echarts legend 控制显隐，prop 保留以便迁移）
    layers: { type: Array, default: () => [] },
    activeLayers: { type: Array, default: () => [] },
    showFullscreen: { type: Boolean, default: false },
    // 左右浮层占位比例：宽屏 = 父级左右栏各占 25%（传 0.25）；窄屏纵向布局无遮挡（传 0）
    // 仅用于 echarts visualMap 的 px 定位（echarts 的 left 不支持 calc），
    // 组件内浮动菜单的同类让位由 CSS 变量 --map-side-inset 控制，二者由父级同时下发
    sideRatio: { type: Number, default: 0.25 },
    // 右上角状态筛选：可选项 + 已选中集合（.sync 双向，多选）
    buildOptions: { type: Array, default: () => [] },
    buildFilter: { type: Array, default: () => [] },
    // 右下角补贴属性筛选：可选项 + 已选中集合（.sync 双向，多选）
    subsidyOptions: { type: Array, default: () => [] },
    subsidyFilter: { type: Array, default: () => [] },
    // 补贴属性 → 图标 URL（点位按此渲染 station 图标）
    subsidyIcons: { type: Object, default: () => ({}) },
    // 左下角估算电价（单选，.sync 双向）
    priceOptions: { type: Array, default: () => [] },
    priceType: { type: String, default: '' },
    // 各省着色数据：[{ name, value }]，由 visualMap 按 value 渐变着色（如电价）
    provinceData: { type: Array, default: () => [] },
    // 省会标记点：[{ name, city, lng, lat }]（仅在有省会图标时渲染）
    capitals: { type: Array, default: () => [] },
    // 省会图标 URL（svg/png）
    capitalIcon: { type: String, default: '' },
    // 省会图标尺寸
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
    // 全屏按钮图标 { 1: 全屏, 2: 退出 }
    fullscreenIcons: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      chart: null,
      loading: false,
      isFullscreen: false,
      // 已加载过的地图缓存 { mapKey: true }
      mapCache: {},
      // 点击点位弹出的详情卡片 { x, y, raw }，点击地图空白处关闭
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
    // 卡片所属补贴分类：与地图打点、右下角图例同一套口径（POINT_CATEGORIES + classifyProject）
    activePointCategory() {
      const raw = (this.activePoint && this.activePoint.raw) || {}
      return pointCategory(raw.category || raw.categoryName)
    },
    // 卡片主题色（边框 / tag 底色 / 数值与链接文字）：与打点同色
    pointCardColor() {
      return this.activePointCategory.color
    },
    // 卡片标题左侧图钉：与右下角图例同一张 station 图标（无图标时退化为同色圆点）
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
    // 卡片行（原型交互13：发电项目与非标项目展示内容不一致）
    // 发电项目：实控人/装机容量/发电利用小时数(达标率)/结算电价/补贴电价
    // 非标项目：实控人/接入方式/生产及预警/项目规模/是否平台转发
    // 接口未返回时回退点位原始数据；字段值缺失（随项目状态差异）渲染为 --
    // 点位卡片行：非标项目与发电项目字段不同，各走一套
    pointCardRows() {
      return this.pointCardIsNonStandard ? this.nonStandardCardRows() : this.powerCardRows()
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
    // 全屏切换：图例位置需复位到贴边
    isFullscreen() {
      this.renderOption()
    },
    // 宽屏 ↔ 窄屏布局切换：地图容器宽度不变（都通栏），ResizeObserver 不会触发，
    // 需单独重排图例位置（等布局完成后再取容器宽度）
    sideRatio() {
      this.syncLegendPosition()
    }
  },
  // initChart / ResizeObserver 跟随见 mixins/chartLifecycle
  beforeDestroy() {
    if (this._maskTimer) {
      clearTimeout(this._maskTimer)
      this._maskTimer = null
    }
    this.unbindWrapEvents()
    this.unbindFullscreen()
  },
  methods: {
    // 卡片行文案：空值统一占位
    cardText(v) {
      return v === undefined || v === null || v === '' ? '--' : v
    },
    // 卡片行文案：枚举码 → 文案；未知码按占位规则原样展示
    cardEnumText(map, code) {
      return map[code] !== undefined ? map[code] : this.cardText(code)
    },
    nonStandardCardRows() {
      const raw = (this.activePoint && this.activePoint.raw) || {}
      const n = (this.pointDetail || {}).nonStandardDetail || {}
      const hasTransfer = n.platformTransfer !== undefined && n.platformTransfer !== null && n.platformTransfer !== ''
      return [
        { label: '实控人', value: this.cardText(n.actualController || raw.controller) },
        { label: '接入方式', value: this.cardEnumText(PROJECT_DETAIL_TEXT.accessMethod, n.accessMethod) },
        { label: '生产及预警', value: this.cardEnumText(PROJECT_DETAIL_TEXT.productionTypes, n.productionTypes) },
        { label: '项目规模', value: this.cardText(n.productionCapacity) },
        {
          label: '是否平台转发',
          value: hasTransfer
            ? this.cardEnumText(PROJECT_DETAIL_TEXT.platformTransfer, n.platformTransfer)
            : PROJECT_DETAIL_TEXT.platformTransfer.none
        }
      ]
    },
    powerCardRows() {
      const raw = (this.activePoint && this.activePoint.raw) || {}
      const p = (this.pointDetail || {}).powerGenerationDetail || {}
      // 详情接口优先，点位自身兜底；0 是有效值，只跳过 undefined
      const capacity = p.capacity !== undefined ? p.capacity : (p.installCapacity !== undefined ? p.installCapacity : raw.capacity)
      const hours = p.hours !== undefined ? p.hours : (p.powerGenerationHours !== undefined ? p.powerGenerationHours : raw.hours)
      const rate = p.rate !== undefined ? p.rate : raw.rate
      // 电价类字段：价格口径多且可能为 0，按「真值优先」依次回退
      const settle = p.editWindPrice || p.settlementPrice || raw.settlementPrice
      const sube = p.subePrice || p.subsidyPrice || raw.subsidyPrice
      return [
        { label: '实控人', value: this.cardText(p.actualController || raw.controller) },
        { label: '装机容量', value: `${this.cardText(capacity)}kW` },
        {
          label: '发电利用小时数',
          value: `${this.cardText(hours)}h`,
          sub: rate !== undefined && rate !== null && rate !== '' ? `（达标率：${rate}%）` : ''
        },
        { label: '结算电价', value: `${this.cardText(settle)}元/kWh` },
        { label: '补贴电价', value: `${this.cardText(sube)}元/kWh` }
      ]
    },
    // 左右侧让位宽度（px）= 容器宽 × 浮层占比 + 间距，与 CSS 的 --map-side-inset 同口径：
    // 宽屏有左右浮层 → 让开「浮层外边距 12 + 浮层宽 + 浮层与地图间距 12」；
    // 窄屏无浮层 → 只留一个 12px 边距
    calcSideInset() {
      const width = this.chart ? this.chart.getWidth() : 0
      const gutter = this.sideRatio > 0 ? SIDE_GUTTER * 2 : SIDE_GUTTER
      return Math.round(width * this.sideRatio) + gutter
    },
    // 覆盖 resize mixin：容器尺寸变化后除了重绘，还要重排用 px 定位的颜色图例
    resize() {
      if (!this.chart || this.rebuildIfDprChanged()) return
      this.chart.resize()
      // 尺寸变化后重新自适应放大（比例变了，原来的 zoom 会留白或溢出）
      this.fitMapZoom()
      const left = this.calcSideInset()
      // 宽度没变时不重复 setOption，避免连续拖拽缩放期间的无谓重绘
      if (left === this._legendLeft) return
      this._legendLeft = left
      this.chart.setOption({ visualMap: { left }})
    },
    // 布局模式切换（宽屏 ↔ 窄屏）后重排：等 DOM 回流完成再取容器宽度
    syncLegendPosition() {
      this.$nextTick(() => this.resize())
    },
    // 底座跟随主图：把主图当前的 zoom/center 原样写入底座的模型与坐标系。
    // 不用「转发相对增量」：两层 viewRect 有 layoutCenter 偏移，相同的 dx/dy/zoom 增量
    // 在各自投影下算出的 center 有微小差异，会随缩放累积放大导致底座漂移。
    // 直接对齐绝对值可保证任意层级下两层严格重合，屏幕间距恒等于 layoutCenter 偏移。
    // 全程只读模型/坐标系，不走 getOption + setOption（避免深拷贝与全量更新造成的卡顿）。

    initChart() {
      // 大屏 zoom 适配：画布像素比要乘上页面缩放系数，否则 4K 下地图被拉伸发虚
      this.chartDpr = getChartDpr()
      this.chart = echarts.init(this.$refs.chart, null, { devicePixelRatio: this.chartDpr })
      this.renderOption()
      this.bindChartEvents()
      this.bindWrapEvents()
      this.bindFullscreen()
    },
    // echarts 实例内事件：点击下钻、roam 转发给灰色底座、悬浮图标与清除兜底
    bindChartEvents() {
      this.chart.on('click', this.handleClick)
      // 主图缩放/平移时同步灰色底座：微任务中执行，与主图在同一帧重绘，视觉上完全同步
      this.chart.on('georoam', params => {
        // 只处理主地图的缩放、拖动事件，避免底座事件重复转发
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
      // 悬浮省份/市区时在鼠标处显示 province 图标（原型效果）；指向点位或移出地图时隐藏
      // 注意：区域命中的事件归属是绑定了 geoIndex 的 map series（componentType='series'、
      // componentSubType='map'），并非 'geo'，因此两种来源都要覆盖
      this.chart.on('mousemove', params => {
        const isRegion = params.componentType === 'geo' || params.componentSubType === 'map'
        if (isRegion && this.capitalIcon) {
          const ev = params.event || {}
          // 图标底尖对准鼠标位置
          this.hoverIconPos = { x: (ev.offsetX || 0) - 16, y: (ev.offsetY || 0) - 32 }
          this.hoverIcon = this.capitalIcon
        } else if (this.hoverIcon) {
          this.hoverIcon = ''
        }
      })
      // 画布级 mousemove 兜底：chart.on('mousemove') 是命中代理事件，只在悬停到省份/点位上
      // 才派发；鼠标移到画布空白处（无命中元素）时不会触发上面的 else 清理分支，
      // 图标会残留在最后悬浮的省份位置。zrender 原生事件始终派发，无命中元素即清除
      this.chart.getZr().on('mousemove', e => {
        if (!e.target && this.hoverIcon) this.hoverIcon = ''
      })
      this.chart.on('globalout', () => {
        this.hoverIcon = ''
      })
    },
    // DOM 全局兜底（捕获阶段）：鼠标跟随图标只在指针位于本地图画布上时展示；
    // 点位弹窗在指针离开整个地图容器时关闭（弹窗本身在容器内，可正常交互）
    // zrender 的 mousemove/globalout 在「移到 DOM 覆盖层（菜单/面板/卡片）」「快速移出窗口」
    // 「页面滚动」等场景下不再派发，图标/弹窗会残留，这里统一兜底清理
    bindWrapEvents() {
      this._onDocMove = e => {
        const t = e.target
        const wrap = this.$refs.wrap
        const onCanvas = !!(t && t.tagName === 'CANVAS' && wrap && wrap.contains(t))
        if (!onCanvas && this.hoverIcon) this.hoverIcon = ''
        // 弹窗关闭判定：是否还在地图容器内（含容器内的浮层/卡片）
        const insideWrap = !!(wrap && (wrap === t || (t && wrap.contains(t))))
        if (!insideWrap && this.activePoint) this.activePoint = null
      }
      // 移出浏览器窗口：mouseout 且 relatedTarget 为空
      this._onDocOut = e => {
        if (!e.relatedTarget && !e.toElement) {
          if (this.hoverIcon) this.hoverIcon = ''
          if (this.activePoint) this.activePoint = null
        }
      }
      // 页面滚动：指针相对地图位置变化（弹窗定位坐标失效），直接清理
      this._onAnyScroll = () => {
        if (this.hoverIcon) this.hoverIcon = ''
        if (this.activePoint) this.activePoint = null
      }
      document.addEventListener('mousemove', this._onDocMove, true)
      document.addEventListener('mouseout', this._onDocOut, true)
      window.addEventListener('scroll', this._onAnyScroll, true)
      window.addEventListener('blur', this._onAnyScroll)
      // 容器 mouseleave 直连兜底：zrender 事件被 DOM 覆盖层拦截时仍能触发
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
    // 解绑全局兜底事件（与 bindWrapEvents 内绑定成对）
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
    // 加载并注册当前层级的地图 GeoJSON（本地文件，webpack 动态 import 按需加载异步 chunk），成功后重绘
    //   mapKey = 'china'                 → 全国分区底图（模块级已注册）
    //   mapKey = '{code}'                → 整省地市图
    //   mapKey = '{code}|{region}'       → 只含该业务区域（蒙西/蒙东、冀北/河北南网）地市的图
    async loadRegionMap() {
      const key = this.mapKey
      if (key === 'china') {
        // 返回全国
        this.renderOption()
        return
      }
      if (this.mapCache[key]) {
        this.renderOption()
        return
      }
      // 加载遮罩延时出现：省份 GeoJSON 是本地 chunk，通常几十毫秒就到位，
      // 立刻铺遮罩会在下钻瞬间闪一层灰（地图越流畅越明显）；超过阈值才显示，慢加载仍有反馈。
      // 与 finally 里的 loading=false 配合，保证遮挡时间 = 加载耗时 - 阈值
      this._maskTimer = setTimeout(() => { this.loading = true }, MAP_LOADING_DELAY)
      try {
        // 本地 GeoJSON 位于 src/assets/maps/{code}.json（scripts/download-map-data.js 下载，文件名去掉 _full）
        // 走静态映射表（map/index.js）：
        //   开发环境 babel-plugin-dynamic-import-node 会把「带变量的 import()」降级为 require 表达式，
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
      // 一个都没匹配上说明配置与 GeoJSON 不一致：回退整省，至少不出现空地图
      if (!features.length) {
        console.warn('区域地市与地图数据未匹配，回退为整省地图:', this.region, this.regionCities)
        return provinceGeoJson
      }
      return Object.assign({}, provinceGeoJson, { features })
    },
    // 按分类分组为多个 scatter series，每个分类一种颜色
    // 点位若带补贴属性图标（subsidyIcons = station-1/2/3，蓝=无补贴 / 橙=已补贴 / 绿=合规清单），
    // 用对应 station 图片作为 symbol（图片自带配色，与右下角图例共用同一套图标）
    // symbolSize 必须用数字：数组尺寸会让 zrender 走 scale 缩放渲染（style.width=2 + scale），
    // zrender 4 的 Image.contain 不做 transform 逆变换，该形态下鼠标命中/悬浮全部失效
    buildSeries() {
      const groups = this.groupPoints()
      const known = new Set(this.categories.map(c => c.id))
      // 分类色用于未配置图标时的圆点兜底（带图标的点位颜色由 station 图片自带）
      const series = this.categories.map(c => this.scatterSeries(c.name, c.color, groups[c.id] || []))
      // 兜底：分类不在 categories 中的点位（保持朴素样式，不带悬浮放大/描边，与原实现一致）
      const others = []
      Object.keys(groups).forEach(k => { if (!known.has(k)) others.push(...groups[k]) })
      if (others.length) series.push(this.scatterSeries('其他', this.defaultColor, others, false))
      // 省会标记默认不渲染（会遮挡省份悬浮高亮与点击下钻），保留 capitals prop 供需要时开启
      return series
    },
    // 按补贴分类把点位分组 → { 分类 id: [echarts 数据项] }；坐标缺失/不可解析的点直接丢弃
    groupPoints() {
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
        if (!groups[cat]) groups[cat] = []
        groups[cat].push(this.scatterDatum(p, lng, lat))
      })
      return groups
    },
    // 单个点位 → echarts 数据项：带补贴属性图标时用 station 图片作 symbol
    // symbolSize 必须用数字：数组尺寸会让 zrender 走 scale 缩放渲染（style.width=2 + scale），
    // zrender 4 的 Image.contain 不做 transform 逆变换，该形态下鼠标命中/悬浮全部失效
    scatterDatum(p, lng, lat) {
      const icon = this.subsidyIcons[p.subsidy]
      return Object.assign(
        { name: p[this.fieldMap.name] || '--', value: [lng, lat], raw: p },
        icon ? { symbol: `image://${icon}`, symbolSize: 28 } : {}
      )
    },
    // 一组同色散点与主 geo 坐标系绑定（geo[0] 是灰色底座，这里指向 geo[1]）
    scatterSeries(name, color, data, emphasis = true) {
      const series = {
        name,
        type: 'scatter',
        coordinateSystem: 'geo',
        geoIndex: 1,
        symbolSize: 10,
        itemStyle: { color },
        data
      }
      if (!emphasis) return series
      series.emphasis = {
        scale: true,
        itemStyle: { borderColor: '#fff', borderWidth: 1 }
      }
      return series
    },
    // 底图系列：区域绘制 + 电价着色（visualMap 作用其上），与 geo 共享坐标系，保证缩放平移时散点同步
    buildMapSeries(mapName, hasColor) {
      return {
        name: '省份电价',
        type: 'map',
        map: mapName,
        // 与索引 1 的主 geo 组件共享坐标系（geo[0] 是灰色底座；roam 由 geo 驱动，底图与散点随之同步）
        geoIndex: 1,
        // 显示省份名称（点击省份可下钻）
        label: {
          show: true,
          color: '#303133',
          fontSize: 12
        },
        // 底色 / 悬浮与 geo[1] 同源，避免两处各写一份导致配色不一致
        ...this.regionStyle(hasColor),
        data: hasColor ? this.provinceData : []
      }
    },
    // 区域底色与悬浮态：map 系列与 geo[1] 共用（区域绘制实际取 geo 样式，series 侧保持一致）
    regionStyle(hasColor) {
      // 有电价着色或已下钻到省 → 灰白底；仅「全国视图 + 未选电价」保持纯白无热力（交互7）
      const filled = hasColor || this.mapCode
      return {
        itemStyle: {
          areaColor: filled ? '#f0f2f5' : '#ffffff',
          // 区域之间只用细界线区分，不带投影（原 shadowColor/shadowBlur/shadowOffsetY 已移除）：
          // 有底色时用白色细线；纯白底（全国 + 未选电价）白线会完全看不见，改用浅灰细线
          borderColor: filled ? '#ffffff' : '#e6e9ef',
          borderWidth: 1.5
        },
        emphasis: {
          itemStyle: {
            // 悬浮：区域填充透明绿、边框变绿并加粗
            areaColor: 'rgba(0, 200, 0, 0.18)',
            borderColor: '#00c800',
            borderWidth: 2.5
          },
          // 悬浮时名称保持显示（透明绿底上深色文字）
          label: { show: true, color: '#1a5c1a', fontWeight: 600 }
        }
      }
    },
    renderOption() {
      if (!this.chart) return
      // GeoJSON 异步加载未完成时（省地图尚未注册）先渲染全国，避免 setOption 使用未注册的 map 名报错
      const mapName = this.mapKey !== 'china' && this.mapCache[this.mapKey] ? this.mapKey : 'china'
      // 未选电价维度 → 无着色数据：地图纯白、隐藏图例（交互7）
      const hasColor = (this.provinceData || []).length > 0
      // 图例左缘对齐「左侧浮层右缘 + 间距」：按容器宽度百分比动态计算，不再写死 px
      // （echarts 的 left 不支持 calc，故由 sideRatio × 容器宽 + 间距 得出）
      const legendLeft = this.calcSideInset()
      this._legendLeft = legendLeft

      this.chart.setOption({
        // 地图与点位全部即时渲染：下钻省份 / 返回全国 / 数据刷新都不再走
        // 「点位飞入 + 区域形变」的过渡动画，画面立刻可用（悬停高亮、缩放交互不受影响）
        animation: false,
        tooltip: this.buildTooltip(),
        // geo 承担区域绘制：map series 与 geo 共享坐标系（geoIndex）时不绘制图形（MapView.render 直接 return），
        // 仅承载数据供 visualMap 着色（着色通过 series 数据写入 geo regions）；因此底图/悬浮/标签样式都配在 geo 上
        geo: this.buildGeo(mapName, hasColor),
        // 左下角颜色图例（连续型 visualMap），与地图着色同源
        visualMap: this.buildVisualMap(hasColor, legendLeft),
        // 分类筛选已由顶部 CategoryTabs 承担，且底部中间需留给全屏按钮，故关闭内置图例
        legend: { show: false },
        series: [this.buildMapSeries(mapName, hasColor)].concat(this.buildSeries())
      }, true)
      // 每次重绘后按容器比例重新自适应放大（切换省份、全屏、数据刷新都走这里）
      this.fitMapZoom()
    },
    // 悬浮浮层：深色胶囊由 formatter 内联实现（原型效果），外层容器置透明
    buildTooltip() {
      return {
        trigger: 'item',
        confine: true,
        // 浮层常驻鼠标正上方：水平居中于鼠标，底部留出 province 跟随图标的高度；
        // 上方空间不足时落到鼠标下方，左右再按容器宽度收敛，避免溢出
        position: (point, params, dom, rect, size) => {
          const gap = 38
          const contentWidth = size.contentSize[0]
          const contentHeight = size.contentSize[1]
          const viewWidth = size.viewSize[0]
          const x = point[0] - contentWidth / 2
          const y = point[1] - contentHeight - gap
          const top = y < 4 ? point[1] + gap : y
          return [Math.max(4, Math.min(x, viewWidth - contentWidth - 4)), top]
        },
        backgroundColor: 'transparent',
        borderWidth: 0,
        padding: 0,
        extraCssText: 'box-shadow: none;',
        formatter: params => {
          // 只有区域悬浮才有内容（点位浮层由 point-card 承担）
          if (params.seriesType === 'map' || params.componentType === 'geo') {
            return this.regionTooltipHtml(params)
          }
          return ''
        }
      }
    },
    // 区域悬浮（交互8）：电价 + 与 spot 均价的差值
    // 全国含标杆结算电价三行；下钻到省（市区粒度）仅光伏/发电两行（无市区级标杆数据）
    // 左下角电价菜单选中某一项 → 只展示该项对应的电价；未选中（''）→ 展示全部
    regionTooltipHtml(params) {
      const data = this.regionTooltipData[params.name]
      const selected = this.priceOptions.find(o => o.id === this.priceType)
      const base = REGION_PRICE_COMPARE.filter(item => !this.mapCode || !item.nationalOnly)
      const list = selected ? base.filter(item => item.field === selected.field) : base
      // 选中项在当前层级不可展示（如标杆电价下钻到省）时回退为全部，避免出现空浮层
      const rows = (list.length ? list : base).map(item => this.priceRowHtml(data, item)).join('<br/>')
      // 拆分省份（内蒙古/河北）下钻：浮层先展示业务区域名（蒙西/蒙东、冀北/河北南网）
      const regionHead = data && data._regionName
        ? `<div style="font-size:12px;opacity:.85;margin-bottom:2px;">${data._regionName}</div>`
        : ''
      return this.wrapTooltip(`${regionHead}${rows}`)
    },
    // 单行电价：价格图标 + 数值，可比较时附带与 spot 均价的差值（>0 绿↓ / <0 红↑）
    priceRowHtml(data, item) {
      // 取值兼容：avgXxx 为 null 时回退 xxx 字段，字符串数值（"0.4155"）可解析
      const v = data ? pickPriceValue(data, item.fields || item.field) : null
      // 每行前置价格图标（原型：icon + 电价）
      const icon = `<img src="${priceIcon}" style="width:14px;height:14px;vertical-align:-3px;margin-right:4px;">`
      const priceHtml = `${icon}<b>${v !== null ? v : '--'}</b>`
      // noDiff：标杆电价本身取自 spot，无独立 spot 均价可比，只展示数值不展示差值
      if (item.noDiff) return priceHtml
      const spot = data ? pickPriceValue(data, item.spotField) : null
      const vn = Number(v)
      const sn = Number(spot)
      // 差值所需字段为 null / 空（pickPriceValue 已把 "" 归一为 null）时无法计算，
      // 直接不渲染括号，避免出现「0（--）」这种空括号
      if (v === null || spot === null || isNaN(vn) || isNaN(sn)) return priceHtml
      const diff = Math.round((vn - sn) * 100) / 100
      let diffHtml
      if (diff > 0) {
        diffHtml = `<span style="color:#2fc25b;">${diff.toFixed(2)}↓</span>`
      } else if (diff < 0) {
        diffHtml = `<span style="color:#f56c6c;">${diff.toFixed(2)}↑</span>`
      } else {
        diffHtml = '<span style="color:#909399;">0.00</span>'
      }
      return `${priceHtml}（${diffHtml}）`
    },
    // geo[0] = 灰色底座（伪 3D 立体轮廓，数组靠前先绘制、垫在底层）；geo[1] = 主地图，系列与交互均指向 geo[1]
    buildGeo(mapName, hasColor) {
      return [
        {
          // 灰色底座轮廓：与主图同形同尺寸，屏幕位置整体右移/下移，形成倾斜立体底座
          id: 'mapShadow',
          map: mapName,
          layoutCenter: ['50%', '49%'],
          layoutSize: '103%',
          // 初始缩放与主图一致；此后由 georoam 事件转发同一相对变换保持对齐
          zoom: MAP_ZOOM,
          // 与主图相同的缩放上下限，避免到达极值被单向截断导致两层错开
          scaleLimit: MAP_SCALE_LIMIT,
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
        Object.assign({
          // roam 事件与转发均以 id 标识主图
          id: 'mapMain',
          // 全国地图 / 下钻后的省市区县地图（mapCode 为空时回全国）
          map: mapName,
          // 与底座同布局尺寸（仅 layoutCenter 偏移），保证缩放平移后两图严格对齐
          layoutCenter: ['50%', '48%'],
          layoutSize: '104%',
          roam: true,
          zoom: MAP_ZOOM,
          scaleLimit: MAP_SCALE_LIMIT,
          // 显示省名 / 区县名
          label: { show: true, color: '#303133', fontSize: 12 }
        }, this.regionStyle(hasColor))
      ]
    },
    // 左下角颜色图例：连续型 visualMap，与地图着色同源
    // 无数据占位：选中了电价维度但接口无数据（如下钻省份全部为 0）时，
    // 图例仍显示（高/低），色阶置灰，避免左下角空缺；未选电价维度才完全隐藏（交互7）
    buildVisualMap(hasColor, legendLeft) {
      const base = {
        type: 'continuous',
        // 作用于底图系列（series 中第 0 项）
        seriesIndex: 0,
        orient: 'vertical',
        left: legendLeft,
        bottom: 12,
        itemWidth: 16,
        itemHeight: 160,
        // 纯图例，不显示可拖动手柄
        calculable: false,
        // 条上端「高」、下端「低」
        text: ['高', '低']
      }
      if (!hasColor) {
        // 未选电价维度 → 完全隐藏；已选但无数据 → 置灰占位
        return this.priceType
          ? Object.assign({}, base, {
            // 默认占位区间 0~1，仅作视觉占位，不参与着色（此时系列 data 为空）
            min: 0,
            max: 1,
            textStyle: { color: '#c0c4cc', fontSize: 12 },
            inRange: { color: ['#f0f2f5', '#f0f2f5'] }
          })
          : { show: false }
      }
      const values = (this.provinceData || []).map(d => Number(d.value) || 0)
      const min = Math.min(...values)
      const max = Math.max(...values)
      return Object.assign({}, base, {
        min,
        // 最小=最大时给微量跨度，避免 echarts 区间退化
        max: max === min ? min + 0.01 : max,
        textStyle: { color: '#303133', fontSize: 12 },
        // 色阶：浅蓝 → 深蓝（与地图着色一致）
        inRange: { color: ['#d6e8ff', '#7db9ff', '#0088ff'] }
      })
    },
    // 地图默认自适应放大：按地图实际绘制包围盒把主图缩放到容器填充率（原型默认铺满）。
    // 不做这一步时 zoom 固定 0.8，宽屏/窄屏/全屏下地图都缩在中部、四周留大片空白
    fitMapZoom() {
      if (!this.chart || this._fitting) return
      const geoModel = this.mainGeoModel()
      const coord = geoModel && geoModel.coordinateSystem
      // 地图经纬包围盒：null 表示尚未注册成功或区域无有效矩形
      const box = this.mapBoundingBox((coord && coord.regions) || [])
      if (!box) return
      // 经纬盒 → 像素：convertToPixel 走的是含 layoutCenter / layoutSize / zoom 的完整变换，
      // 换成 coord.dataToPoint 拿到的只是投影尺寸，不含布局缩放，会算出离谱的放大倍数
      const p0 = this.chart.convertToPixel({ geoIndex: 1 }, [box.minX, box.minY])
      const p1 = this.chart.convertToPixel({ geoIndex: 1 }, [box.maxX, box.maxY])
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
    // 按 id 找主图模型：getComponent 的第二个参数只认下标，这里遍历更稳
    mainGeoModel() {
      let geoModel = null
      this.chart.getModel().eachComponent('geo', model => {
        if (model.id === 'mapMain') geoModel = model
      })
      return geoModel
    },
    // 地图经纬包围盒：逐区域手算 min/max（区域 rect 不保证是 BoundingRect 实例，union 会算错）；
    // 没有有效区域时返回 null
    mapBoundingBox(regions) {
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
      if (!isFinite(minX) || !isFinite(maxX)) return null
      return { minX, minY, maxX, maxY }
    },
    // tooltip 深色胶囊外壳（原型效果）：所有系列统一包裹
    // 电价气泡外壳：深色胶囊。圆角 14px ≈ 单行气泡高度的一半，左右两端呈半圆（原型效果）；
    // 三行（取消电价维度选择时）则为圆角矩形，不会撑成怪异的大胶囊
    wrapTooltip(html) {
      return `<div style="background: rgba(23, 35, 54, 0.9); color: #fff; padding: 5px 12px; border-radius: 14px; font-size: 12px; line-height: 1.6; box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3); white-space: nowrap;">${html}</div>`
    },
    handleClick(params) {
      if (params.seriesType === 'scatter') {
        const raw = params.data && params.data.raw
        if (raw) {
          // 详情卡片出现在点位右上方，并收敛在容器边界内
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
    // 全屏作用于「整个页面」容器（首页总览根节点），页面上的左右面板、工具栏等功能保持可见；
    // 之前对地图容器自身全屏，会让页面其余功能被全屏元素遮盖
    setFullscreen(flag) {
      const pageRoot = (this.$el && this.$el.closest && this.$el.closest('.home-overview')) || null
      if (flag) {
        const el = pageRoot || document.documentElement
        el.requestFullscreen ? el.requestFullscreen() : null
      } else {
        document.exitFullscreen ? document.exitFullscreen() : null
      }
    },
    // 状态筛选（多选 toggle），集合由父级持有（.sync）
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
        this.$nextTick(() => { if (this.chart) this.chart.resize() })
      }
      document.addEventListener('fullscreenchange', this._onFsChange)
    },
    unbindFullscreen() {
      if (this._onFsChange) {
        document.removeEventListener('fullscreenchange', this._onFsChange)
        this._onFsChange = null
      }
    },
    // 更多>>点击：提取详情数据并传递给父组件
    handlePointMore() {
      const detail = this.pointDetail || {}
      this.$emit('handlePointMore', { raw: this.activePoint.raw, detail: detail })
    },
    // 详情>>点击：提取详情数据并传递给父组件
    handlePointDetail() {
      const detail = this.pointDetail || {}
      this.$emit('handlePointDetail', { raw: this.activePoint.raw, detail: detail })
    }
  }
}
</script>

<style lang="scss" scoped>
.echarts-china-map {
  position: relative;
  width: 100%;
  height: 100%;
  /* 地图背景图（bg.png，位于 views/homePage 同级） */
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

  /* 通用浮动面板 */
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

  /* 浮动菜单避让父级左右浮层：--map-side-inset 由父级下发
     （宽屏 = 浮层占比 + 间距，如 calc(25% + 12px)；窄屏 = 仅间距），随页面宽度动态变化 */
  &__panel--build {
    /* 宽屏落在顶部工具条（月份选择器）下方，窄屏工具条在文档流中，由父级改为贴边 */
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
    /* 原型无卡片底：直接铺在地图上 */
    padding: 0;
    background: transparent;
    box-shadow: none;
  }

  /* 多选行：勾选框 / 图标 + 文案（面板是半透明灰蓝底，文字统一用白色） */
  &__check {
    display: flex;
    align-items: center;
    padding: 4px 6px;
    border-radius: 4px;
    font-size: 13px;
    /* 未选中同样是白字：深色字压在半透明灰蓝底上对比不足，且与面板 color:#fff 不统一 */
    color: rgba(255, 255, 255, 0.75);
    cursor: pointer;
    white-space: nowrap;
    user-select: none;

    &:hover {
      /* 白色浮层：原来的浅灰底会把白字吃掉 */
      background: rgba(255, 255, 255, 0.16);
    }

    &.is-active {
      /* 选中态：纯白 + 加粗，与未选中的 75% 白形成层级 */
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
      /* 勾选态用绿色（Element success #67c23a，与页面其它绿色标识一致），不用主题蓝 */
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

  /* 结算电价（单选）：选中蓝色胶囊白字，未选中半透明灰底白字（蓝湖标注 rgba(96,105,127,0.3)） */
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

    /* 中心圆点 */
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

  /* 底部中间：全屏 / 退出全屏（左右浮层等宽，容器中点即可视区中点） */
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

  /* 悬浮省份/市区的鼠标跟随图标：不拦截任何鼠标事件 */
  &__hover-icon {
    position: absolute;
    width: 30px;
    height: auto;
    pointer-events: none;
    z-index: 5;
  }

  /* 点位点击详情卡片（原型：白色卡片、橙色主题边框） */
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

  /* 项目类型 tag：定位在卡片顶部，骑在边框上（上半截在卡片外），不占卡片布局高度 */
  &__point-card-tag {
    position: absolute;
    top: -27px;
    left: -2px;
    height: 27px;
    padding: 0 14px;
    /* 颜色由模板内联的 --point-card-color 下发（补贴分类色），斜切角共用同一值 */
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

  /* 无 station 图标时的同色圆点兜底（与打点、边框同色） */
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
