<template>
  <div
    class="home-overview"
    :class="'home-overview--' + layoutMode"
    :style="{ '--ui-scale': uiScale }"
  >
    <div class="home-overview__body">
      <!-- 地图铺满底层 -->
      <div class="home-overview__map">
        <EchartsChinaMap
          :points="visiblePoints"
          :categories="pointCategories"
          :field-map="POINT_FIELD_MAP"
          :side-ratio="mapSideRatio"
          :region-tooltip-data="provincePriceMap"
          :capitals="capitals"
          :capital-icon="capitalIcon"
          :layers="layerOptions"
          :active-layers.sync="activeLayers"
          :build-options="buildOptions"
          :build-filter.sync="buildFilter"
          :subsidy-options="subsidyOptions"
          :subsidy-filter.sync="subsidyFilter"
          :subsidy-icons="subsidyIcons"
          :point-detail="pointDetail"
          :point-detail-loading="pointDetailLoading"
          :price-options="priceOptions"
          :price-type.sync="priceType"
          :province-data="provincePrices"
          :map-code="mapCode"
          :region="mapRegion"
          :region-cities="regionCityNames"
          :fullscreen-icons="fullscreenIcons"
          @region-click="handleRegionClick"
          @back="handleMapBack"
          @point-click="handlePointClick"
          @handlePointMore="handlePointMore"
          @handlePointDetail="handlePointDetail"
        />
      </div>

      <!-- 顶部悬浮工具条：左列行业 tabs（可换行）+ 右列月份选择（固定右上角） -->
      <div class="home-overview__toolbar">
        <div class="home-overview__toolbar-left">
          <CategoryTabs
            :items="categoryTabs"
            :field-map="CATEGORY_FIELD_MAP"
            :value="categorySelection"
            multiple
            @input="handleCategoryChange"
          />
        </div>
        <div class="home-overview__toolbar-right">
          <!-- append-to-body 必须关掉：element-ui 默认把日期面板挂到 document.body，
               而全屏是以 .home-overview 为全屏元素，全屏时 body 上的其它子元素不参与渲染，
               面板会「点了不出现」（不是被遮挡，是根本不在全屏层里）。
               关掉后面板留在日期选择器内部，属于全屏元素子树，全屏下照样正常弹出 -->
          <el-date-picker
            v-model="query.month"
            type="month"
            size="small"
            :clearable="false"
            :append-to-body="false"
            value-format="yyyy-MM"
            placeholder="选择月份"
            style="width: 120px;"
          />
        </div>
      </div>

      <!-- 左侧浮层：项目总览 + 地区排名（内容区滚动）+ 底部备注（固定不遮挡） -->
      <div class="home-overview__col home-overview__col--left">
        <div class="home-overview__left-scroll">
          <PanelCard title="项目总览" :sub-title="regionTitle" class="panel-block">
            <MetricList :items="overviewMetrics" :columns="2" variant="stat" value-color="#08f" />
            <!-- 环形图（donut）：各扇区等半径，占比只靠圆心角表达（不传 rose-type），
                 圆心角/环宽随容器尺寸自适应，见 ChartPie.pieGeometry。
                 纯展示图表：不监听 item-click，点扇区不会改变顶部行业筛选。
                 无数据（行业全不选时接口不取数）走空态文案，避免 echarts 画出灰色空环 -->
            <ChartPie
              v-if="pieData.length"
              :data="pieData"
              :field-map="PIE_FIELD_MAP"
              :colors="pieColors"
              :center-text="pieCenter"
              height="100%"
            />
            <div v-else class="pie-empty">暂无数据</div>
          </PanelCard>

          <PanelCard title="地区排名" :sub-title="regionTitle" class="panel-block panel-block--flex">
            <RankList
              :items="rankList"
              :tabs="rankTypeOptions"
              :active-tab="query.rankType"
              :field-map="RANK_FIELD_MAP"
              @update:activeTab="handleRankTypeChange"
              @row-click="handleRankClick"
            />
          </PanelCard>
        </div>

        <div class="home-overview__note">
          备注：装机容量、利用小时数仅针对风电和光伏项目
        </div>
      </div>

      <!-- 右侧浮层：趋势图 + 指标 + 项目列表 -->
      <div class="home-overview__col home-overview__col--right">
        <PanelCard :title="manageTitle" :sub-title="regionTitle" class="panel-block">
          <ChartBarLine
            :x-data="manageTrend.xAxis"
            :series="manageTrend.series"
            :colors="MANAGE_COLORS"
            stack="total"
            unit="单位：个"
            height="100%"
          />
        </PanelCard>

        <PanelCard title="运营项目情况" :sub-title="regionTitle" class="panel-block panel-block--flex summary-card">
          <template slot="extra">
            <el-button-group class="energy-switch-group">
              <el-button
                v-for="item in energyTypeOptions"
                :key="item.key"
                size="mini"
                :type="operateEnergyType === item.key ? 'primary' : ''"
                @click="handleEnergyChange(item.key)"
              >
                {{ item.label }}
              </el-button>
            </el-button-group>
          </template>
          <MetricList :items="summaryMetrics" :columns="2" variant="card" value-color="#08f" />
          <ChartBarLine
            class="hours-chart"
            :x-data="operateChart.xAxis"
            :series="operateChart.series"
            :y-axis-names="operateChartYAxis"
            height="100%"
          />
        </PanelCard>
      </div>
    </div>
  </div>
</template>

<script>
import PanelCard from '../components/PanelCard'
import MetricList from '../components/MetricList'
import ChartPie from '../components/ChartPie'
import ChartBarLine from '../components/ChartBarLine'
import RankList from '../components/RankList'
import CategoryTabs from '../components/CategoryTabs'
import EchartsChinaMap from '../components/EchartsChinaMap'

import {
  queryProjectOverview,
  queryBuildandOperate,
  queryOperateDetail,
  queryNationalRanking,
  queryRegionRanking,
  queryMapDisplay,
  queryProjectDetail
} from '@/api/homeOverview'

import {
  CATEGORIES,
  CATEGORY_FIELD_MAP,
  RANK_TYPES,
  REGION_RANK_TYPES,
  RANK_FIELD_MAP,
  POINT_FIELD_MAP,
  POINT_CATEGORIES,
  pointCategory,
  classifyProject,
  ENERGY_LABELS,
  OVERVIEW_METRICS,
  PIE_FIELD_MAP,
  MANAGE_COLORS,
  MANAGE_TREND_FIELDS,
  SUMMARY_ICONS_MAP,
  OPERATE_TYPE_MAP,
  OPERATE_METRICS,
  OPERATE_CHART_FIELDS,
  DEFAULT_QUERY,
  ROOT_LEVEL,
  ENERGY_TYPE_KEYS,
  BUILD_FILTERS,
  SUBSIDY_FILTERS,
  PRICE_OPTIONS,
  pickPriceValue,
  STATUS_PARAM_MAP,
  INDUSTRY_ALL,
  PROVINCE_LIST,
  provinceShortName,
  findProvince,
  findRegion,
  normalizeRegionName,
  REGION_META,
  DRILL_REGION_AS_PROVINCE_NAME,
  toCoordNumber,
  cityRegionName,
  PROVINCE_CAPITALS,
  station_type,
  fullscreenIcon
} from './config'
import provinceIcon from '../province.svg'
import { calcUiScale } from '../uiScale'

// 布局分档（px，按页面主体宽度判定）：
//   < 1024      → 纵向堆叠（「工具条 → 左栏 → 地图 → 右栏」，真放不下三栏时才开始整页滚动）
//   1024 ~ 1440 → 三栏 + 浮层加宽到 28%（1300~1400 是「1920 屏开侧边 DevTools」「1366 笔记本」的常见可用宽度，
//                 按 25% 只剩 270px 左右，卡片标题会与操作按钮挤在一起）
//   ≥ 1440      → 三栏 + 浮层 25%
// 旧阈值 1280 会把上面这类桌面窗口误判成移动端堆叠
const NARROW_LAYOUT_WIDTH = 1024
const MEDIUM_LAYOUT_WIDTH = 1440

// 左右浮层宽度占比（与样式里的 --panel-width 保持一致）
// 宽屏下传给地图组件，用于计算浮动菜单/颜色图例的让位宽度；窄屏无浮层遮挡，传 0
const PANEL_WIDTH_RATIO = 0.25
// 中等宽度档的浮层占比（与样式 --panel-width: 28% 一致）
const PANEL_WIDTH_RATIO_MEDIUM = 0.28

/**
 * 首页总览容器
 * 唯一的数据请求入口：所有子组件只接收 props、抛出事件，不直接请求接口
 * 后期迁移：替换 api/homeOverview.js 与 config.js 即可
 */
export default {
  name: 'HomeOverview',
  components: {
    PanelCard,
    MetricList,
    ChartPie,
    ChartBarLine,
    RankList,
    CategoryTabs,
    EchartsChinaMap
  },
  data() {
    return {
      // 静态配置（模板中直接引用）
      CATEGORY_FIELD_MAP,
      RANK_FIELD_MAP,
      POINT_FIELD_MAP,
      PIE_FIELD_MAP,
      MANAGE_COLORS,
      // 地图浮动菜单配置
      buildOptions: BUILD_FILTERS,
      subsidyOptions: SUBSIDY_FILTERS,
      subsidyIcons: station_type,
      fullscreenIcons: fullscreenIcon,
      // 点位详情接口数据与加载态（点击点位 → /largeScreen/projectDetail）
      pointDetail: null,
      pointDetailLoading: false,
      // 请求序号：用于丢弃过期响应（详见 methods.nextSeq）
      reqSeq: 0,

      // 地图筛选状态（子组件 .sync 回写）
      // 状态筛选（显示运营/显示在建）默认全选：初始勾选态与原型一致；
      // 全选与"未选"等价（均展示全量，接口 status=3），全部取消 = 展示全量（原型注5）
      buildFilter: ['运营', '在建'],
      subsidyFilter: ['无补贴', '已补贴', '合规清单'],
      priceType: 'wind',
      // 行业「全不选」空态标记（原型注4：全部取消时页面数据清空，仅保留筛选器可操作）。
      // 必须单独用标记而不是靠数组：query.categories 的空数组语义是「全部」（industry 传空取全量），
      // 「全选」与「全不选」无法用同一个空数组区分
      categoryNone: false,

      query: Object.assign({}, DEFAULT_QUERY),
      // 层级 Tab 数据
      levels: [Object.assign({}, ROOT_LEVEL)],

      overview: {},
      // 行业 tabs 计数快照（来自 queryProjectOverview.industryNum）：
      // 分类全部取消、页面数据清空时仍保留，保证筛选器可操作
      categoryStats: [],
      rankList: [],
      // 建设/运营管理项目报表原始数据（逐月数组，经 manageTrend 计算属性映射为图表结构）
      manageList: [],
      // 运营项目情况的能源类型（风电/光伏/非标，卡片右上角按钮切换，独立状态不与上报表联动）
      operateEnergyType: 'wind',
      // 运营项目情况原始数据（queryOperateDetail 返回，指标与图表一体）
      operateDetail: {},
      activeLayers: [],
      // 地图展示原始数据（mapDisplay 返回：全国=省份数组，省份=单对象；归一化存为省份数组）
      provinceGroups: [],
      // 地图点位分类（补贴属性三分类：无补贴/已补贴/合规清单）
      pointCategories: POINT_CATEGORIES,
      // 省会标记点 + 图标
      capitals: PROVINCE_CAPITALS,
      capitalIcon: provinceIcon,
      // 页面主体宽度（动态检测，驱动宽屏/窄屏布局切换）
      // 初值取窗口宽度做兜底，避免小屏首帧先按宽屏渲染再跳变；mounted 后以真实容器宽度为准
      pageWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
      // 视口尺寸（CSS 像素）：大屏缩放系数按它算，不能用页面主体宽度 ——
      // 主体宽度是 zoom 之后回流出来的值，用它会自激
      viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 0,
      viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0
    }
  },
  computed: {
    // 整页缩放系数：min(视口宽/1920, 视口高/1080)，1~2 倍。
    // 超过 1080P 的屏（2K/带鱼屏/4K）整体等比放大，版式、图表、字号与 1080P 完全同比例；
    // 1080P 及以上但不足 1 倍时保持 1（小屏继续走现有的多档样式）
    uiScale() {
      return calcUiScale(this.viewportWidth, this.viewportHeight)
    },
    // 布局档位：narrow（纵向堆叠）/ medium（三栏 + 浮层 28%）/ wide（三栏 + 浮层 25%）
    layoutMode() {
      if (!this.pageWidth) return 'wide'
      if (this.pageWidth < NARROW_LAYOUT_WIDTH) return 'narrow'
      if (this.pageWidth < MEDIUM_LAYOUT_WIDTH) return 'medium'
      return 'wide'
    },
    // 窄屏：页面主体宽度不足，切换为纵向排布
    isNarrow() {
      return this.layoutMode === 'narrow'
    },
    // 地图浮动菜单的让位比例：宽屏让开左右浮层，窄屏地图通栏无需让位
    mapSideRatio() {
      if (this.isNarrow) return 0
      return this.layoutMode === 'medium' ? PANEL_WIDTH_RATIO_MEDIUM : PANEL_WIDTH_RATIO
    },
    // 多选分类 → 刷新键组成部分：全不选 = 'none'；空数组 = 全部（'all'），否则逗号拼接的 id 串
    categoryParam() {
      if (this.categoryNone) return 'none'
      return (this.query.categories || []).join(',') || 'all'
    },
    // tabs 选中态：全不选 → 空数组（含「全部」在内全部不高亮）；
    // 空数组（= 全部）映射为全选 id 列表，使「全部」项高亮
    categorySelection() {
      if (this.categoryNone) return []
      const sel = this.query.categories || []
      if (sel.length) return sel
      return (this.categoryTabs || []).filter(t => t.id !== 'all').map(t => t.id)
    },
    // 报表刷新键：影响全部报表接口入参的条件（月份/行业/状态/下钻层级/区域）
    // 用于替代 query 深监听，避免无关字段（如排名维度）触发全量请求
    // regionName 必须进 key：否则点蒙西、点蒙东都是「内蒙古」层级，不会重新取数
    reportKey() {
      return [
        this.query.month,
        this.categoryParam,
        this.statusParam,
        this.query.level,
        this.query.provinceCode,
        this.query.regionName,
        this.query.cityCode
      ].join('|')
    },
    // 当前下钻省份的接口全称（山东省/内蒙古自治区），全国层级为空
    // 按 provinceCode 反查而不是取 levels 末项：区域下钻后末项是「蒙西」，按名称反查会失败
    currentProvinceFullName() {
      if (this.query.level !== 'province') return ''
      const hit = PROVINCE_LIST.find(p => p.code === this.query.provinceCode)
      if (hit) return hit.full
      // 兜底：code 缺失时按层级名称反查
      const name = (this.levels[this.levels.length - 1] || {}).name || ''
      const legacy = findProvince(name)
      return legacy ? legacy.full : name
    },
    // 下钻接口的 provinceName 传值：拆分区域下钻时按配置传区域名或省全称
    drillProvinceParam() {
      const region = this.query.regionName
      if (!region) return this.currentProvinceFullName
      return DRILL_REGION_AS_PROVINCE_NAME ? region : this.currentProvinceFullName
    },
    // 全局报表请求参数（单一来源，所有报表接口共用这 4 个字段）
    // industry: 行业类型数组（多选），元素为行业名（能源电力/节能环保/智慧能源/绿色交通/其他）。
    // 「全部」= 展开后的全部行业名；「全不选」= 空数组（接口据此返回空结果集）
    // month: 查询月份 yyyy-MM
    // provinceName: 省份（下钻省份的接口全称）或拆分区域名，空=全国
    // status: 项目状态 1在建; 2运营; 3在建和运营; 4未选择
    reportParams() {
      return {
        industry: this.industryParam,
        month: this.query.month || '',
        provinceName: this.drillProvinceParam,
        status: this.statusParam
      }
    },
    // 地区排名接口入参：全国 queryNationalRanking / 省内 queryRegionRanking 共用
    // rankingType 对应接口枚举（projectCount/rate/capacity/hour），随排名 tabs 切换
    rankParams() {
      return Object.assign({}, this.reportParams, {
        rankingType: this.query.rankType
      })
    },
    // 「全部」展开后的行业名数组（也用于行业 tabs 的计数请求，见 fetchIndustryStats）
    allIndustryNames() {
      return CATEGORIES.map(c => c.name)
    },
    // 多选行业 → 接口 industry 参数：始终传数组，不做字符串序列化。
    // 全不选 → []（空数组，接口按「无行业」返回，页面随之为空）；
    // 全部 → 全部行业名；选中若干行业 → 对应行业名
    industryParam() {
      if (this.categoryNone) return []
      const sel = this.query.categories || []
      if (!sel.length) return this.allIndustryNames
      return sel.map(id => {
        const cat = CATEGORIES.find(c => c.id === id)
        return cat ? cat.name : id
      })
    },
    // 电价维度默认值：菜单首项（风电结算电价）。
    // 电价菜单与行业筛选无关，任何行业组合下都常驻可选
    defaultPriceType() {
      return PRICE_OPTIONS[0].id
    },
    // 运营项目情况的类型可选项：风电/光伏/非标 始终全部可选，与行业筛选无关。
    // 行业只影响接口入参 industry；某个类型在当前行业下没有项目时，
    // 该页签自己的数据为空即可，不再靠隐藏页签来表达
    energyTypeOptions() {
      return ENERGY_TYPE_KEYS.map(key => ({ key, label: ENERGY_LABELS[key] }))
    },
    // 地图状态筛选（在建/运营多选）→ 接口 status 枚举
    statusParam() {
      const key = [...this.buildFilter].sort().join(',')
      return STATUS_PARAM_MAP[key] || '4'
    },
    manageTitle() {
      return `建设/运营管理项目`
    },
    regionTitle() {
      const names = this.levels.map(l => l.name).slice(1)
      return names.length ? names.join(' / ') : '全国'
    },
    // 行业 tabs：由 industryNum 派生，行业名反查 id 供筛选回写
    // 计数取独立快照 categoryStats：分类全部取消（数据清空）时 tabs 仍可展示与操作
    categoryTabs() {
      const list = this.categoryStats || []
      return list.map(item => {
        const cat = CATEGORIES.find(c => c.name === item.industry)
        return {
          id: item.industry === INDUSTRY_ALL ? 'all' : (cat ? cat.id : item.industry),
          name: item.industry,
          count: item.projectCount
        }
      })
    },
    overviewMetrics() {
      return OVERVIEW_METRICS.map(m => ({
        label: m.label,
        value: this.overview[m.field],
        unit: m.unit,
        icon: m.icon,
        trend: m.trend
      }))
    },
    pieData() {
      return (this.overview.industryNum || []).filter(item => item.industry !== INDUSTRY_ALL)
    },
    // 运营项目情况指标：按能源类型取对应指标项，字段取自 queryOperateDetail 返回，图标按 label 容错匹配
    summaryMetrics() {
      const conf = OPERATE_METRICS[this.operateEnergyType] || OPERATE_METRICS.wind
      const icons = SUMMARY_ICONS_MAP[this.operateEnergyType] || SUMMARY_ICONS_MAP.wind
      return conf.map(m => {
        const label = String(m.label || '').trim()
        // 精确匹配 → 去空白匹配 → 包含匹配（容忍图标 key 带前后缀）
        const key = Object.keys(icons).find(
          k => k === label || k.trim() === label || label.includes(k) || k.includes(label)
        )
        return {
          label: m.label,
          value: this.pickOperateValue(m.field),
          unit: m.unit,
          icon: icons[key] || 'el-icon-document'
        }
      })
    },
    // 运营项目情况图表：风电/光伏取 powerLineChart，非标取 nonPowerLineChart，按配置映射柱线系列
    operateChart() {
      const nonstandard = this.operateEnergyType === 'nonstandard'
      const list = (nonstandard ? this.operateDetail.nonPowerLineChart : this.operateDetail.powerLineChart) || []
      const fields = OPERATE_CHART_FIELDS[this.operateEnergyType] || OPERATE_CHART_FIELDS.wind
      return {
        xAxis: list.map(item => item.month),
        series: fields.map(f => ({
          name: f.label,
          type: f.type,
          yAxisIndex: f.type === 'line' ? 1 : 0,
          data: list.map(item => {
            const value = Number(item[f.field]) || 0
            // 达标率口径兼容：接口可能返回比率（0.85）也可能返回百分数（85），
            // 统一换算成百分数，轴名「达标率(%)」与刻度 40%/60% 才成立
            return f.field === 'yield' && value > 0 && value <= 1
              ? Math.round(value * 1000) / 10
              : value
          })
        }))
      }
    },
    // 双 Y 轴名称：原型里风电/光伏为「利用小时数(h)」「达标率(%)」、非标为「度电收入(元/kWh)」「达标率(%)」。
    // 当前系列已自带单位，轴名暂不展示（传空数组 = 两侧轴名都为空）
    operateChartYAxis() {
      return []
    },
    // 饼图配色按行业名匹配，与数据顺序解耦
    pieColors() {
      return this.pieData.map(item => {
        const cat = CATEGORIES.find(c => c.name === item.industry)
        return cat ? cat.color : '#909399'
      })
    },
    // 玫瑰图中心数字：取接口 industryNum 中"全部"行的 projectCount（非扇区合计）
    pieCenter() {
      const all = (this.overview.industryNum || []).find(item => item.industry === INDUSTRY_ALL)
      return { label: '', value: all ? all.projectCount : '' }
    },
    // 建设/运营管理项目报表：逐月数组按 MANAGE_TREND_FIELDS 配置映射为柱线图结构
    manageTrend() {
      const list = this.manageList || []
      return {
        xAxis: list.map(item => item.month),
        series: MANAGE_TREND_FIELDS.map(f => ({
          name: f.label,
          type: f.type,
          data: list.map(item => Number(item[f.field]) || 0)
        }))
      }
    },
    // 排名维度 tabs：全国 4 项（含项目个数），省内 3 项（接口枚举不同），只由层级决定
    rankTypeOptions() {
      return this.rankOptionsFor(this.query.level)
    },
    layerOptions() {
      return CATEGORIES.map(c => ({ key: c.id, label: c.name, color: c.color }))
    },
    // 地图点位：provinceGroups.projectList 平铺归一化
    // 分类按业务口径推导：合规 natProject=1 && compCatalog=1（优先）；已补贴 natProject=1；其余无补贴 natProject!=1
    points() {
      return this.provinceGroups.reduce(
        (list, group) => list.concat((group.projectList || []).map(item => this.toPoint(item))),
        []
      )
    },

    // 地图着色数据：按左下角选中的电价维度取聚合值
    // 全国视图 → 各省汇总值；省份下钻 → 该省各市区值（按市区粒度着色，visualMap 随之展示）
    // 取值兼容：字段候选列表（avgXxx 为 null 时回退 xxx）+ 字符串数值（"0.3655"）；
    // 未选中（priceType 为空）→ 返回空数组，地图不着色（纯白，交互7）
    provincePrices() {
      const option = PRICE_OPTIONS.find(o => o.id === this.priceType)
      if (!option) return []
      // 全国层级：后端按区域返回（蒙西/蒙东、冀北/河北南网），区域的汇总电价直接取分组字段，
      // 与其它省份走同一套取值逻辑；countryGroups 已剔除被区域替换掉的整省分组
      if (this.query.level === 'country') {
        return this.countryGroups
          .map(group => this.priceDatum(this.resolveGroupName(group), group, option.fields))
          .filter(Boolean)
      }
      return this.cityPrices(option.fields)
    },
    // 全国层级生效的数据分组：后端同时返回「内蒙古/河北」和「蒙西/蒙东/冀北/河北南网」时，
    // 用区域分组替换整省分组，避免同一块区域出现两个数据源（区域优先）
    countryGroups() {
      const groups = this.provinceGroups || []
      const splitProvinces = groups
        .map(group => normalizeRegionName(this.rawGroupName(group)))
        .filter(Boolean)
        .map(regionName => (REGION_META[regionName] || {}).province)
        .filter(Boolean)
      if (!splitProvinces.length) return groups
      return groups.filter(group => splitProvinces.indexOf(this.rawGroupName(group)) < 0)
    },

    // 省级下钻的地市条目：把两种返回形态统一成 [{ name: 地市名, ...电价字段, projectList }]
    //   1. 单个省分组 + cityPriceList（本地 mock / 早期后端：地市明细单独放在 cityPriceList）
    //   2. 与全国同构的「地市 → 数据」映射（现网后端：归一化后每个地市一个分组，key 即地市名）
    // 区域下钻（蒙西/蒙东、冀北/河北南网）时只保留属于该区域的地市：
    // 后端已按区域返回时该过滤不改变结果，按省返回时由前端过滤掉其它区域
    provinceCityEntries() {
      const groups = this.provinceGroups || []
      const single = groups.length === 1 ? groups[0] : null
      const useCityPriceList = single && Array.isArray(single.cityPriceList) && single.cityPriceList.length > 0
      const list = useCityPriceList
        ? single.cityPriceList.map(c => Object.assign({ projectList: [] }, c))
        : groups.map(group => Object.assign({}, group, {
          // 地市名取分组 key（与地图 GeoJSON 区域名一致，不能做省名式的短名截断）
          name: group._groupKey || group.provinceName || '',
          // 分组里没有 projectCount：与 cityPriceList 字段对齐，浮层显示项目数
          projectCount: (group.projectList || []).length
        }))
      const region = this.query.regionName
      if (!region) return list
      const province = this.currentProvinceShort
      return list.filter(c => {
        const cityRegion = cityRegionName(province, c.name)
        return !cityRegion || cityRegion === region
      })
    },
    // 当前下钻省份的短名（内蒙古/河北…），用于地区分类映射；全国视图为空
    currentProvinceShort() {
      if (this.query.level !== 'province') return ''
      const hit = PROVINCE_LIST.find(p => p.code === this.query.provinceCode)
      if (hit) return hit.name
      return provinceShortName((this.levels[this.levels.length - 1] || {}).name || '')
    },
    // 地图点位：只按右上角状态筛选 + 右下角补贴属性筛选（均为多选）
    // 不做任何省份/地市归属校验：接口返回的 projectList 全部直接打点。
    // 归属判断依赖后端入参（provinceName 传省名/区域名、status 传运营/在建），
    // 前端再按省份名比对只会误删（拆分区域的 provinceName 是区域名，与省名对不上）
    visiblePoints() {
      // 行业「全不选」：地图照常取数（省份热力/电价着色正常），但不标记任何项目点位；
      // 下钻到省份同样不标点（同一份 points 派生）
      if (this.categoryNone) return []
      return this.points.filter(p => {
        // 状态筛选：点位未带状态时一律展示。
        // 状态维度已由请求入参 status（由 buildFilter 推导）在服务端过滤，
        // 前端再按缺失字段判断会把整批点位误删（曾表现为「有 projectList 但地图无点」）
        const statusOk = !p.status ||
          this.buildFilter.length === 0 ||
          this.buildFilter.includes(p.status)
        return statusOk && this.subsidyFilter.includes(p.categoryName)
      })
    },
    // 区域悬浮浮层数据（交互8）：区域名 → 电价汇总 + 项目数
    // 全国视图按省/区域聚合；省份下钻按市区粒度（cityPriceList）
    // 整省下钻时拆分省份同区域城市合并为一条区域数据（电价取均值、项目数求和）；
    // 已下钻到具体区域时按城市原样展示，与逐城着色保持一致
    provincePriceMap() {
      if (this.query.level === 'province') return this.cityPriceMap()
      const map = {}
      this.countryGroups.forEach(group => {
        // 省名 / 区域名统一归一（区域优先，含别名）
        const name = this.resolveGroupName(group)
        map[name] = Object.assign({ projectCount: (group.projectList || []).length }, group)
      })
      return map
    },
    // 地图当前区域：省级下钻时传省份 code，驱动地图切换为该省地市地图
    mapCode() {
      return this.query.level === 'province' ? (this.query.provinceCode || '') : ''
    },
    // 地图当前业务区域：非拆分省份为空，组件据此再过滤一层地市面
    mapRegion() {
      return this.query.level === 'province' ? (this.query.regionName || '') : ''
    },
    // 当前区域包含的地市名（组件过滤省份 GeoJSON 用）
    regionCityNames() {
      const region = findRegion(this.query.regionName)
      return region ? region.cities : []
    },
    // 电价菜单（左下角）：全国视图提供全部维度（含标杆电价）；
    // 下钻到省后无市区级标杆数据，菜单去掉标杆电价。
    // 与行业筛选无关：不选任何发电行业时菜单同样常驻，只是地图可能着不到色
    priceOptions() {
      return this.query.level === 'country'
        ? PRICE_OPTIONS
        : PRICE_OPTIONS.filter(o => o.id !== 'benchmark')
    }
  },
  watch: {
    // 月份/行业/状态/下钻层级变化 → 全量刷新（单一入口，避免多监听重复触发同一批请求）
    reportKey() {
      this.fetchAll()
    },
    // 排名维度切换 → 只刷新排名，其它报表无需重取
    'query.rankType'() {
      // 层级切换引起的枚举校正不单独发请求（fetchAll 已统一刷新），
      // 否则 fetchRank 的序号晚于同批，会把地图等响应误判为过期丢弃
      if (this._suppressRankFetch) {
        this._suppressRankFetch = false
        return
      }
      this.fetchRank()
    },
    // 运营项目情况能源类型切换（风电/光伏/非标）：只重新请求运营项目情况，不影响其它报表
    operateEnergyType() {
      this.fetchOperateDetail()
    },
    // 层级切换时兜底校正排名维度：当前维度不在新层级枚举内则回退到首项
    // （正常路径已由 drillToProvince / handleMapBack 显式重置，这里只防枚举不匹配）
    'query.level'(level) {
      const options = this.rankOptionsFor(level)
      if (!options.some(t => t.value === this.query.rankType)) {
        this.setRankType(options[0].value)
      }
    }
  },
  created() {
    this.fetchAll()
  },
  mounted() {
    this.measurePageWidth()
    // 窗口缩放 / 侧边栏展开收起：重新测量
    window.addEventListener('resize', this.measurePageWidth)
    // 容器宽度变化（侧边栏折叠动画、split 拖拽等 window resize 覆盖不到的场景）
    if (typeof ResizeObserver !== 'undefined' && this.$el) {
      this._resizeObserver = new ResizeObserver(this.measurePageWidth)
      this._resizeObserver.observe(this.$el)
    }
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.measurePageWidth)
    if (this._resizeObserver) {
      this._resizeObserver.disconnect()
      this._resizeObserver = null
    }
  },
  methods: {
    // 单个项目 → 地图点位
    toPoint(item) {
      const cat = pointCategory(classifyProject(item.natProject, item.compCatalog))
      return Object.assign({}, item, {
        id: item.projectCode,
        name: item.projectName,
        // 经纬度兼容逗号小数（"110,807"→110.807）；无效坐标由地图组件丢弃该点
        lng: toCoordNumber(item.longitude),
        lat: toCoordNumber(item.latitude),
        category: cat.id,
        // 补贴类型名与 station_type 图标 key 一致（无补贴/已补贴/合规清单）
        categoryName: cat.name,
        subsidy: cat.name,
        // 项目状态：真实接口的 projectList 不返回该字段（状态由请求入参 status 在服务端过滤），
        // 这里不做「在建」兜底——兜底会让所有点在只勾选「显示运营」时被前端二次过滤掉
        status: item.status || ''
      })
    },
    // 单个着色项：名称为假、或电价不可解析（字段缺失 / 负数）时返回 null —— 保持白色不入色阶。
    // 真实结算电价可能是小数值（0.0001~0.3655），0 也是有效结算价，只要可解析且 >= 0 就入色阶
    // （visualMap min/max 按数据自适应拉开对比）
    priceDatum(name, obj, fields) {
      if (!name) return null
      const raw = pickPriceValue(obj, fields)
      const num = raw === null ? NaN : Number(raw)
      if (isNaN(num) || num < 0) return null
      return { name, value: num }
    },
    // 省份下钻的逐城着色（地市条目兼容两种返回形态，见 provinceCityEntries）：
    // 已下钻到具体区域（蒙西/蒙东等）→ 地图只画本区域地市，按城市粒度逐城着色；
    // 整省下钻（如从排名进入）→ 拆分省份按业务区域着色（同一区域同色），其它省份逐城着色
    cityPrices(fields) {
      const cities = this.provinceCityEntries
      if (this.query.regionName) {
        return cities.map(c => this.priceDatum(c.name, c, fields)).filter(Boolean)
      }
      // 拆分省份：同区域的城市共用该区域的均价（由该区域下所有城市算出）
      const regionAvg = this.regionAvgMap(cities, fields)
      return cities
        .map(c => {
          const region = cityRegionName(this.currentProvinceShort, c.name)
          if (!region) return this.priceDatum(c.name, c, fields)
          const avg = regionAvg[region]
          return avg === undefined ? null : { name: c.name, value: avg }
        })
        .filter(Boolean)
    },
    // 省份下钻的浮层数据：已下钻到具体区域 → 按城市原样展示（与逐城着色一致）；
    // 整省下钻 → 拆分省份（内蒙古/河北）同区域的城市合并为一条区域数据（电价取均值、项目数求和）
    cityPriceMap() {
      const map = {}
      const cities = this.provinceCityEntries
      if (this.query.regionName) {
        cities.forEach(c => {
          map[c.name] = Object.assign({ projectCount: c.projectCount || 0 }, c)
        })
        return map
      }
      // 按业务区域分组：不属于任何区域的城市原样展示，区域内城市合并成一条
      const buckets = {}
      cities.forEach(c => {
        const region = cityRegionName(this.currentProvinceShort, c.name)
        if (!region) {
          map[c.name] = Object.assign({ projectCount: c.projectCount || 0 }, c)
          return
        }
        if (!buckets[region]) buckets[region] = []
        buckets[region].push(c)
      })
      Object.keys(buckets).forEach(region => {
        const items = buckets[region]
        const merged = Object.assign({ name: region }, this.mergeRegionValues(items))
        // 浮层顶部展示区域名（蒙西/蒙东、冀北/河北南网）
        merged._regionName = region
        items.forEach(c => { map[c.name] = merged })
      })
      return map
    },
    // 动态检测页面宽度：写入 pageWidth 驱动布局切换
    // 只在数值变化时赋值，避免 ResizeObserver 回调反复写同一值
    measurePageWidth() {
      const width = this.$el ? this.$el.clientWidth : 0
      if (width && width !== this.pageWidth) this.pageWidth = width
      // 视口尺寸（未缩放）：驱动 uiScale
      if (window.innerWidth !== this.viewportWidth) this.viewportWidth = window.innerWidth
      if (window.innerHeight !== this.viewportHeight) this.viewportHeight = window.innerHeight
    },
    // 统一请求：单个接口失败不影响其他模块
    async safeRequest(fn, defaultValue) {
      try {
        const res = await fn()
        return res && res.code === 200 ? res.data : defaultValue
      } catch (error) {
        console.error('首页数据请求失败:', error)
        return defaultValue
      }
    },
    // 请求序号：每次发起请求自增，写回数据前校验序号，丢弃已过期（被更新请求取代）的响应。
    // 场景：快速切换月份/行业时，先发的慢响应若后到会覆盖新数据，表现为"刷新了但报表还是旧的"
    nextSeq() {
      this.reqSeq += 1
      return this.reqSeq
    },
    isStale(seq) {
      return seq !== this.reqSeq
    },
    // 项目总览报表：POST queryProjectOverview，入参 = 全局报表参数
    // 项目总览：POST queryProjectOverview，入参 = 全局报表参数（含选中的行业）
    // 指标（建设项目/运营期项目）按选中行业过滤；行业分布由 fetchIndustryStats 单独取全量
    // 行业「全不选」空态：清空各报表数据（原型注4：数据清空，仅保留筛选器可操作）。
    // categoryStats（行业 tabs 计数）不清 —— 它是独立快照，清空后筛选器仍需可点
    clearReportData() {
      this.overview = {}
      this.manageList = []
      this.operateDetail = {}
      this.rankList = []
      this.provinceGroups = []
    },
    async fetchOverview(seq = this.nextSeq()) {
      const data = await this.safeRequest(() => queryProjectOverview(this.reportParams), {})
      if (!this.canWriteBack(seq)) return
      this.overview = data || {}
    },
    // 行业分布（顶部 tabs 计数 + 项目总览饼图）：同一接口但不传行业，
    // 保证切换行业时始终显示全部行业的分布，不被所选行业过滤
    async fetchIndustryStats(seq = this.nextSeq()) {
      const data = await this.safeRequest(() => queryProjectOverview({
        ...this.reportParams,
        // 计数始终按「全部」口径取：全不选时 industry 为空数组，
        // 若跟着传空数组会把 tabs 上的行业数量查没，筛选器就点不回去了
        industry: this.allIndustryNames
      }), {})
      // 全不选时也要写回（见 canWriteBack）：tabs 上的行业数量必须留着，否则点不回去
      if (!this.canWriteBack(seq, { keepWhenNone: true })) return
      if (data && Array.isArray(data.industryNum) && data.industryNum.length) {
        this.categoryStats = data.industryNum
      }
    },
    // 建设/运营管理项目报表：POST queryBuildandOperate，入参 = 全局报表参数
    async fetchManageTrend(seq = this.nextSeq()) {
      const data = await this.safeRequest(() => queryBuildandOperate(this.reportParams), [])
      if (!this.canWriteBack(seq)) return
      this.manageList = Array.isArray(data) ? data : []
    },
    // 地区排名：全国/省内双接口，返回 [{ nameType, value }] 全称数据
    // nameType（山东省）转为地图短名（山东）展示，并从配置字典反查 code 供地图下钻
    async fetchRank(seq = this.nextSeq()) {
      const isCountry = this.query.level === 'country'
      const api = isCountry ? queryNationalRanking : queryRegionRanking
      const data = await this.safeRequest(() => api(this.rankParams), [])
      if (!this.canWriteBack(seq)) return
      const list = Array.isArray(data) ? data : []
      this.rankList = list.map(item => {
        const fullName = item.nameType || ''
        // 拆分区域（蒙西/蒙东、冀北/河北南网）也可能出现在全国排名里：区域名不是省名，
        // findProvince 查不到 code。这里统一成标准区域名（兼容「蒙西电网」之类别名），
        // 区域行不带 code，下钻时由 handleRankClick 用 findRegion 解析
        const region = isCountry ? findRegion(fullName) : null
        const name = region ? region.name : (isCountry ? provinceShortName(fullName) : fullName)
        const province = isCountry && !region ? findProvince(name) : null
        return {
          name,
          value: item.value,
          code: province ? province.code : ''
        }
      })
    },
    // 运营指标取值：field 可能是字段名或候选字段数组，按顺序取第一个「有值」的
    // （后端同一语义命名不统一：利用小时数风电为 usehour、光伏为 useHour；结算电价为 electrovalence；
    //  null / undefined / 空串视为无值，0 是有效值需要保留）
    pickOperateValue(field) {
      const keys = Array.isArray(field) ? field : [field]
      for (let i = 0; i < keys.length; i += 1) {
        const value = this.operateDetail[keys[i]]
        if (value !== null && value !== undefined && value !== '') return value
      }
      return null
    },
    // 运营项目情况：POST queryOperateDetail，入参 = 全局报表参数 + operateType（随风电/光伏/非标切换联动）
    async fetchOperateDetail(seq = this.nextSeq()) {
      const params = Object.assign({}, this.reportParams, {
        operateType: OPERATE_TYPE_MAP[this.operateEnergyType] || '1'
      })
      const data = await this.safeRequest(() => queryOperateDetail(params), {})
      if (!this.canWriteBack(seq)) return
      this.operateDetail = data || {}
    },

    // 全量刷新：一次取数共用同一序号，任一更晚的请求都会让这批结果作废，保证界面与最后一次操作一致
    async fetchAll() {
      const seq = this.nextSeq()
      // 前 5 个请求各自写回自己的 data，这里只做并发编排，不依赖返回值
      // 行业「全不选」同样走这条链路：industry 传空数组，由接口返回空结果集
      await Promise.all([
        this.fetchOverview(seq),
        this.fetchIndustryStats(seq),
        this.fetchManageTrend(seq),
        this.fetchOperateDetail(seq),
        this.fetchRank(seq),
        this.fetchMapDisplay(seq)
      ])
    },
    // 地图展示：POST queryMapDisplay，入参 = 全局报表参数
    // 返回结构兼容三种形态，统一归一化为省份数组 provinceGroups：
    //   1. 数组 [{ provinceName, projectList, ... }]
    //   2. 单对象（省份下钻：{ projectList, cityPriceList, ... }）
    //   3. 省名 → 数据的对象映射（真实接口形态：{ 上海市: {...}, 天津市: {...} }）
    // 行业「全不选」照常写回：省份热力 / 电价着色要正常显示，
    // 只是点位不标（由 visiblePoints 早退回空数组控制）
    async fetchMapDisplay(seq = this.nextSeq()) {
      const data = await this.safeRequest(() => queryMapDisplay(this.reportParams), [])
      // 全不选时同样写回：省份热力 / 电价着色要正常显示，点位由 visiblePoints 早退到空数组
      if (!this.canWriteBack(seq, { keepWhenNone: true })) return
      this.provinceGroups = this.normalizeProvinceGroups(data)
    },
    // 报表响应写回前的统一校验：
    //   1）序号过期（已有更晚的请求发出）→ 丢弃，避免慢响应覆盖新数据；
    //   2）行业「全不选」→ 不写回，报表保持空态：industry=[] 在后端是「全部」语义，
    //      会返回全量数据，照原样写回就等于没有空态。
    //      例外（keepWhenNone）：行业分布要保住 tabs 行业数量、地图要保住省份热力与电价，
    //      这两项始终写回，仅点位不标
    canWriteBack(seq, { keepWhenNone = false } = {}) {
      if (this.isStale(seq)) return false
      return keepWhenNone || !this.categoryNone
    },
    // mapDisplay 返回归一化：数组 / 单对象 / 省名 key 映射 → 省份数组
    normalizeProvinceGroups(data) {
      if (Array.isArray(data)) return data
      if (data && typeof data === 'object') {
        const looksLikeSingleGroup = data.projectList || data.cityPriceList ||
          data.avgSettlementPrice !== undefined || data.avgWindSettlementPrice !== undefined
        if (looksLikeSingleGroup) return [data]
        // key 映射：全国是全国→省/区域，省级下钻是地市→数据（返回结构与全国完全一致）。
        // key 即分组名，必须覆盖内层字段 —— 内层的 provinceName 可能写的是省全称/长地名，
        // 直接用它会把「玉溪市」这类地市分组统统认成「云南省」，地市着色与浮层就都挂不上
        return Object.keys(data).map(key => Object.assign({}, data[key], {
          provinceName: key,
          _groupKey: key
        }))
      }
      return []
    },
    // 行业多选变更：选中全部真实分类时规范化为空数组（= 全部，industry 传空）；
    // 空列表 = 全部取消（空态 none=true：报表数据清空，仅保留筛选器）
    handleCategoryChange(next) {
      const list = Array.isArray(next) ? next : []
      const realIds = (this.categoryTabs || []).filter(t => t.id !== 'all').map(t => t.id)
      const isAll = realIds.length > 0 && realIds.every(id => list.includes(id))
      this.setCategories(isAll ? [] : list, !list.length)
    },
    // 行业选中态统一写入口：只写行业筛选这一个维度。
    // 运营类型（风电/光伏/非标）、排名维度、电价维度都不跟行业联动，
    // 各自保留用户的当前选择，由本批 fetchAll 带上新 industry 统一取数。
    // none：是否为「全不选」空态 —— query.categories 为空数组时既可能是全选
    // （industry 传空取全量）也可能是全不选，二者必须靠该参数区分
    setCategories(list, none = false) {
      this.categoryNone = none
      this.query.categories = list
      // 进入「全不选」立即清空报表，不等接口返回（industry=[] 会被后端当「全部」，
      // 其响应不采用，见各 fetch* 里的 categoryNone 守卫）
      if (none) this.clearReportData()
    },
    // 某层级下的排名维度候选：只由层级决定（全国 4 项 / 省内 3 项），与行业筛选无关。
    // 行业只影响接口入参 industry；某维度在当前行业下没有数据时，该列显示空即可
    rankOptionsFor(level) {
      return level === 'country' ? RANK_TYPES : REGION_RANK_TYPES
    },
    // 运营项目情况卡片右上角能源类型切换（风电/光伏/非标）
    // 类型最少选中一个：点击当前项不取消，不在可选项内的类型忽略
    handleEnergyChange(type) {
      if (type === this.operateEnergyType) return
      if (!this.energyTypeOptions.some(item => item.key === type)) return
      this.operateEnergyType = type
    },
    // 排名维度 tabs 手动切换：只刷新排名，其它报表无需重取
    handleRankTypeChange(value) {
      this.query.rankType = value
    },
    // 排名维度程序化写入（层级切换时重置）：由本批 fetchAll 统一取数，抑制单独请求
    // 仅值真正变化时才置标记，否则 watch 不触发、标记残留会吞掉下一次正常切换
    setRankType(value) {
      if (value === this.query.rankType) return
      this._suppressRankFetch = true
      this.query.rankType = value
    },
    // 点击排名：全国→省/区域；已下钻到拆分省份时，点击区域名可在区域间切换
    handleRankClick(row) {
      if (this.query.level === 'country') {
        // 全国排名里可能出现拆分区域（蒙西/蒙东、冀北/河北南网）：区域名不是省名，
        // findProvince 拿不到 code，早前这里 `!row.code` 直接 return（表现为点了没反应）。
        // 先按区域解析，命中就带着区域名下钻，与地图上点击该区域的行为完全一致
        const region = findRegion(row.name)
        if (region) {
          this.drillToProvince(region.code, region.province, region.name)
          return
        }
        if (!row.code) return
        this.drillToProvince(row.code, row.name)
        return
      }
      // 省内：排名数据按区域返回（蒙西/蒙东、冀北/河北南网）时，点击即切到该区域
      const region = findRegion(row.name)
      if (region && region.code === this.query.provinceCode && region.name !== this.query.regionName) {
        this.drillToProvince(region.code, region.province, region.name)
      }
    },
    drillToProvince(code, name, region = '') {
      // 从全国下钻到省份：排名维度重置为省内首项
      // 省内切换区域（蒙西↔蒙东等）不算重新下钻，保留用户当前维度
      const fromCountry = this.query.level === 'country'
      if (fromCountry) {
        this.setRankType(this.rankOptionsFor('province')[0].value)
      }
      this.query.level = 'province'
      this.query.provinceCode = code
      this.clearMapGroups()
      // 区域下钻：记录业务区域，驱动地图只画该区域地市、接口按区域取数
      this.query.regionName = region || ''
      this.query.cityCode = ''
      // 面包屑：全国 / 省 / 区域（区域层只在拆分省份下钻时出现）
      this.levels = [Object.assign({}, ROOT_LEVEL), { code, name }]
      if (region) this.levels.push({ code: `${code}|${region}`, name: region })
      // 下钻到省：电价维度复位到菜单首项（风电结算电价），与「返回全国」保持一致的默认态。
      // 省内菜单不含标杆电价，沿用旧选择会出现「菜单项消失但地图仍按标杆电价着色」；
      // 省内切区域（蒙西↔蒙东等）不算重新下钻，保留用户当前选择
      if (fromCountry) {
        this.priceType = this.defaultPriceType
      } else if (!this.priceOptions.some(o => o.id === this.priceType)) {
        this.priceType = this.defaultPriceType
      }
    },
    // 地图点击：点的是拆分区域（蒙西/蒙东、冀北/河北南网）→ 下钻到区域；点的是省份 → 下钻到省
    handleRegionClick(payload) {
      const region = findRegion(payload.province)
      if (region) {
        this.drillToProvince(region.code, region.province, region.name)
        return
      }
      const province = findProvince(payload.province)
      if (!province) return
      if (this.query.level === 'country') {
        this.drillToProvince(province.code, province.name)
      }
    },
    // 分组原始名（区域名或省名）→ 地图区域名 / 省短名
    // 优先级：分组级 provinceName，其次项目内 provinceName（长地名），兼容接口两种返回
    rawGroupName(group) {
      const name = (group && group.provinceName) ||
        (((group && group.projectList) || [])[0] || {}).provinceName || ''
      return provinceShortName(name)
    },
    // 分组名归一：拆分区域归一到地图区域名（含别名，如「冀南」→「河北南网」），其它为省短名
    resolveGroupName(group) {
      const short = this.rawGroupName(group)
      return normalizeRegionName(short) || short
    },
    // 城市列表 → 各拆分区域的均价（电价取平均；0 也是有效结算价，仅不可解析/负值不参与）
    // 拆分省份各业务区域的电价均值：{ 区域名: 均值 }，用于整省下钻时同区域同色
    regionAvgMap(cities, fields) {
      const sum = {}
      const count = {};
      (cities || []).forEach(c => {
        const region = cityRegionName(this.currentProvinceShort, c.name)
        if (!region) return
        const raw = pickPriceValue(c, fields)
        const num = raw === null ? NaN : Number(raw)
        if (isNaN(num) || num < 0) return
        sum[region] = (sum[region] || 0) + num
        count[region] = (count[region] || 0) + 1
      })
      const avg = {}
      Object.keys(sum).forEach(r => { avg[r] = sum[r] / count[r] })
      return avg
    },
    // 同区域城市合并：数值字段取平均、项目数求和，其余字段取首个非空值
    mergeRegionValues(items) {
      const keys = new Set()
      items.forEach(item => Object.keys(item).forEach(k => keys.add(k)))
      const merged = {}
      keys.forEach(key => {
        const vals = items.map(i => i[key]).filter(v => v !== undefined && v !== null && v !== '')
        if (!vals.length) return
        const nums = vals.map(v => (typeof v === 'number' ? v : parseFloat(String(v).trim())))
        // 全是可解析数字 → 取均值；否则取首项（字段名、区域名等）
        const allNum = nums.every(n => !isNaN(n))
        merged[key] = allNum ? nums.reduce((a, b) => a + b, 0) / nums.length : vals[0]
      })
      // 项目数按求和（不是平均）
      merged.projectCount = items.reduce((sum, i) => sum + (Number(i.projectCount) || 0), 0)
      return merged
    },
    // 下钻 / 返回时清空地图点位来源：省份 GeoJSON 会先于接口数据落地，
    // 不清空会把上一层的点画到新地图上（错位、跳一下再回来）。
    // 清空后等本批 queryMapDisplay 返回，一次性渲染，全过程无动画
    clearMapGroups() {
      this.provinceGroups = []
    },
    // 地图「返回」：回到全国视图
    handleMapBack() {
      // 返回全国：排名维度重置为全国首项，在 level 变化前写入，
      // 保证本批请求携带正确的 rankingType
      this.setRankType(this.rankOptionsFor('country')[0].value)
      this.query.level = 'country'
      this.query.provinceCode = ''
      this.query.regionName = ''
      this.query.cityCode = ''
      this.levels = [Object.assign({}, ROOT_LEVEL)]
      // 同下钻：先清空地图点位来源，避免省内点位被画到全国图上
      this.clearMapGroups()
      // 返回全国：电价维度同样复位到菜单首项（风电结算电价），不沿用省内选择
      this.priceType = this.defaultPriceType
    },
    // 点位点击：详情卡片由地图组件弹出，此处请求项目详情接口并回传给卡片
    // 入参 { industry, month, projectCode, status }（1在建 2运营 3在建和运营 4未选择）
    async handlePointClick(point) {
      this.pointDetail = null
      this.pointDetailLoading = true
      // 点位自带状态优先；没有状态（真实接口不返回）则沿用当前全局筛选，
      // 「未选择」不能直接下传 4，按「在建+运营」处理，否则可能查不到该项目
      const globalStatus = this.statusParam === '4' ? '3' : this.statusParam
      const detail = await this.safeRequest(() => queryProjectDetail({
        // industry 统一传数组（接口不收字符串）：无行业信息时传空数组 = 全部
        industry: point.industry ? [point.industry] : [],
        month: this.query.month,
        projectCode: point.projectCode,
        status: (point.status && STATUS_PARAM_MAP[point.status]) || globalStatus
      }), null)
      this.pointDetail = detail
      this.pointDetailLoading = false
    },
    // 卡片「更多>>」：跳转打开该项目对应的详情页面（原型交互13）
    handlePointMore({ detail }) {
      this.openProjectPage(detail, {
        toast: '跳转项目详情页：模拟',
        operationalPanel: 'base',
        projectPanel: 'Base'
      })
    },
    // 卡片「详情>>」：跳转运营填报列表页（原型交互17）：只有运营期项目有该页面，
    // 故不传 projectPanel —— 非运营期项目不跳转
    handlePointDetail({ detail }) {
      this.openProjectPage(detail, {
        toast: '跳转运营填报列表页：模拟',
        operationalPanel: 'operational-data'
      })
    },
    // 点位卡片跳转：发电项目（POWER）取 powerGenerationDetail，非标项目取 nonStandardDetail；
    // 运营期项目（status = 2）打开运营侧页面，其余打开项目侧页面（projectPanel 为空则不跳）
    openProjectPage(detail, { toast, operationalPanel, projectPanel }) {
      this.$message.info(toast, { ...detail })
      const power = detail.powerGenerationDetail || {}
      const data = detail.projectType === 'POWER' ? power : (detail.nonStandardDetail || {})
      // 详情接口未返回 id 时不拼该参数，避免拼出 id=undefined 的死链
      const idPart = data.id ? `&id=${data.id}` : ''
      if (Number(data.status) === 2) {
        window.open(
          `${window.location.origin}/operational/project-list?mode=detail&projectCode=${data.projectCode}&panel=${operationalPanel}${idPart}`,
          '_blank'
        )
        return
      }
      if (!projectPanel) return
      window.open(
        `${window.location.origin}/project/project-list?mode=detail&projectCode=${data.projectCode}&pagePanel=${projectPanel}${idPart}`,
        '_blank'
      )
    }
  }
}
</script>

<style lang="scss" scoped>
::v-deep .el-input__inner {
  height: 30px;
  line-height: 30px;
  border-radius: 8px;
  background-color: rgba(96, 105, 127, 0.7);
  color: #fff;
  border-color: none !important;
}

.home-overview {
  display: flex;
  flex-direction: column;
  /* 大屏适配：--ui-scale 由 JS 按 min(视口宽/1920, 视口高/1080) 算出（1~2）。
     用 zoom 而不是 transform: scale —— zoom 真正参与排版，文字按放大后的字号重新渲染（不发虚）；
     图表画布清晰度由组件把同一系数乘进 devicePixelRatio 解决（uiScale.getChartDpr）。
     宽度不用除 scale（zoom 元素的百分比基准已被浏览器按 scale 折算过），
     但高度里的 vh 是按物理视口算的，必须除回去，否则放大后纵向溢出 */
  zoom: var(--ui-scale, 1);
  height: calc((100vh - 84px) / var(--ui-scale, 1));
  background: #f0f2f5;
  box-sizing: border-box;
  overflow: hidden;

  /* 左右浮层尺寸基准：宽度各占页面主体 25%，与工具条/浮层间距共用 12px。
     工具条的左右内缩、浮层宽度、地图内浮动菜单的让位都取自这里，改一处即可联动 */
  --panel-width: 25%;
  --panel-gutter: 12px;
  /* 地图内浮动菜单的左右让位：要同时让开「浮层外边距 + 浮层宽度 + 浮层与地图的间距」，
     即 25% + 12px × 2，随页面宽度百分比缩放 */
  --map-side-inset: calc(var(--panel-width) + var(--panel-gutter) * 2);
  /* 右上角状态筛选的顶部位置：宽屏落在工具条（月份选择器）下方 */
  --map-panel-top: 60px;

  /* 中等宽度（1024~1440）：浮层从 25% 加宽到 28%。
     这类窗口下 25% 只有 270px 左右，「运营项目情况」标题会和右上角操作按钮挤在一起，
     指标也会被省略号吃掉；加宽到 28% 后卡片仍有 ~300px，地图与工具条仍留出可视宽度。
     工具条/地图让位全部由 --panel-width 派生，这里改一处即可联动 */
  &--medium {
    --panel-width: 28%;
  }

  /* 窄面板兜底：卡片标题与右上角操作区放不下时整体换行，不再互相压字 */
  ::v-deep .panel-card__header {
    flex-wrap: wrap;
    height: auto;
    min-height: 40px;
    row-gap: 2px;
  }

  /* 全屏作用于本页根节点（非地图容器）：铺满视口，左右面板与工具栏等功能保持可见 */
  &:fullscreen {
    /* 全屏时高度同样按缩放系数折算，否则 zoom 会把全屏内容放大到超出屏幕 */
    height: calc(100vh / var(--ui-scale, 1));
    padding: 0;
  }

  &__body {
    position: relative;
    flex: 1;
    min-height: 0;
  }

  /* 地图铺满底层 */
  &__map {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  /* 顶部悬浮工具条：位于左右浮层之间，左右两列布局 */
  &__toolbar {
    position: absolute;
    top: var(--panel-gutter);
    /* 让开左右浮层：浮层外边距 + 浮层宽度（25%）+ 间距，跟随浮层宽度自适应 */
    left: calc(var(--panel-width) + var(--panel-gutter) * 2);
    right: calc(var(--panel-width) + var(--panel-gutter) * 2);
    z-index: 11;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    pointer-events: none;

    /* 工具条内的控件可点击，其余区域不拦截地图交互 */
    >* {
      pointer-events: auto;
    }

    /* 左列：行业 tabs，宽度不够时在列内换行，不挤压右侧控件 */
    &-left {
      flex: 1;
      min-width: 0;
    }

    /* 右列：月份选择器，固定右上角不换行 */
    &-right {
      flex-shrink: 0;
      display: flex;
      justify-content: flex-end;
    }
  }

  /* 左右统计面板浮在地图两侧：宽 25%，上下左右各让出 12px（大屏不与页面边缘相贴） */
  &__col {
    position: absolute;
    top: var(--panel-gutter);
    bottom: var(--panel-gutter);
    z-index: 10;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow-y: auto;

    /* 滚动条默认不出现，hover 时显示细滚动条 */
    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: transparent;
      border-radius: 2px;
    }

    &:hover::-webkit-scrollbar-thumb {
      background: rgba(144, 147, 153, 0.4);
    }

    &--left {
      left: var(--panel-gutter);
      width: var(--panel-width);
      border-radius: 12px;
      background-color: rgba(255, 255, 255, 1);
      box-shadow: 0px 0px 16px 0px rgba(0, 0, 0, 0.05);
      font-family: Arial-regular;
      /* 左栏：内容区滚动，底部备注固定不被遮挡 */
      overflow: hidden;
    }

    &--right {
      right: var(--panel-gutter);
      width: var(--panel-width);
      gap: var(--panel-gutter);

      .panel-card {
        border-radius: 12px;
        background-color: rgba(255, 255, 255, 1);
        box-shadow: 0px 0px 16px 0px rgba(0, 0, 0, 0.05);
        font-family: Arial-regular;
      }

      /* 上卡（建设/运营管理项目报表）高度由「自身宽度」驱动：1080P 实测 428 × 314 ≈ 1.37:1。
         只按列高百分比锁（旧的 32.3%）时，带鱼屏/超宽屏栏宽变大而列高不变，
         卡片会被拉成 2:1 的扁条、柱线图挤成一条——改成宽高比后卡片随宽度同步长高。
         max-height 46% 兜住极端宽高比，保证下卡（运营项目情况）仍有充足空间 */
      .panel-card:first-child {
        /* 不支持 aspect-ratio 时的回落：按 1080P 的高度占比 */
        flex: 0 0 32.3%;
        min-height: 262px;
      }

      @supports (aspect-ratio: 1) {
        .panel-card:first-child {
          flex: 0 0 auto;
          aspect-ratio: 1.37;
          max-height: 46%;
        }
      }

      /* 低分辨率（1080P 纵向 720~768）兼容：下卡只保一个可用下限，
         不被压成 0；内容超出由面板自身滚动承载（见底部 .summary-card），不顶出整列 */
      .summary-card {
        min-height: 200px;
      }
    }
  }

  /* 左栏内容滚动区：项目总览 + 地区排名，超出时内部滚动 */
  &__left-scroll {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;

    /* 项目总览高度跟着「内容」自适应：卡片上半部（标题 + 两条指标）是固定量，
       下半部环图区按 1080P 实测 404 × 169 ≈ 2.39:1 锁比例 —— 栏宽变大时环图区同步变高，
       环图按宽度等比放大，卡片高度自然跟着长，不会有「卡片被拉高、环图不跟大」的空白。
       只给卡片一个宽高比是错的：环图尺寸由宽度决定，卡片长高后底部会空一片 */
    > .panel-card:first-child {
      flex: 0 0 auto;
      min-height: 286px;
    }

    > .panel-card:first-child ::v-deep .panel-card__body {
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    /* 环图区（含空态占位）按固定宽高比撑高：组件内联 height:100% 要压掉，
       否则 aspect-ratio 不生效 */
    > .panel-card:first-child ::v-deep .chart-pie,
    > .panel-card:first-child ::v-deep .pie-empty {
      flex: 0 0 auto;
      height: auto !important;
      aspect-ratio: 2.39;
    }

    /* 滚动条默认不出现，hover 时显示细滚动条 */
    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: transparent;
      border-radius: 2px;
    }

    &:hover::-webkit-scrollbar-thumb {
      background: rgba(144, 147, 153, 0.4);
    }
  }

  /* 左栏底部备注：固定显示，不参与滚动、不被内容遮挡 */
  &__note {
    flex-shrink: 0;
    margin: 8px 8px 10px;
    padding: 6px 10px;
    font-size: 12px;
    line-height: 1.5;
    color: rgba(230, 162, 60, 1);
    font-size: 12px;
    text-align: left;
    font-family: PingFangSC-regular;
  }

  /* ==================== 窄屏自适应 ====================
     页面主体宽度不足时（由 JS 动态检测 < NARROW_LAYOUT_WIDTH）：
     取消左右悬浮浮层，主体改为纵向文档流，按「工具条 → 左栏 → 地图 → 右栏」排列，
     整页滚动；图表由各自的 ResizeObserver 跟随容器缩放，报表比例不被挤压变形 */
  &--narrow {
    /* 窄屏地图通栏，浮动菜单只需常规间距，且顶部无工具条遮挡 */
    --map-side-inset: var(--panel-gutter);
    --map-panel-top: var(--panel-gutter);

    .home-overview__body {
      display: flex;
      flex-direction: column;
      gap: var(--panel-gutter);
      overflow-y: auto;
      overflow-x: hidden;
    }

    /* 工具条脱离绝对定位，排在最前 */
    .home-overview__toolbar {
      position: relative;
      top: auto;
      left: auto;
      right: auto;
      order: 1;
      flex-shrink: 0;
    }

    /* 左右浮层：回到文档流，宽度铺满、高度随内容，滚动交给页面主体 */
    .home-overview__col {
      position: relative;
      top: auto;
      right: auto;
      bottom: auto;
      left: auto;
      z-index: auto;
      width: 100%;
      overflow: visible;
      flex-shrink: 0;

      &--left {
        order: 2;
        overflow: visible;
      }

      &--right {
        order: 4;
      }

      /* 浮层内部不再二次滚动，全部由页面主体滚动承载 */
      .home-overview__left-scroll {
        overflow: visible;
      }

      /* 排名列表在整页流里按内容撑开，不继承浮动层的 100% 高度约束 */
      .rank-list {
        height: auto;
      }
    }

    /* 地图脱离铺底，按中间层插入，并给出固定高度：
       避免 flex 拉伸/压缩导致地图比例失真的同时保持可滚动 */
    .home-overview__map {
      position: relative;
      top: auto;
      left: auto;
      right: auto;
      bottom: auto;
      order: 3;
      flex-shrink: 0;
      height: 60vh;
      min-height: 360px;
      max-height: 560px;
      border-radius: 12px;
      overflow: hidden;
    }

    /* 整页纵向排布后不需要额外占位高度，按内容自然撑开 */
    .summary-card {
      min-height: 0;
    }
  }
}

/* 项目情况卡片右上角能源类型切换（el-button-group 分段样式） */
.energy-switch-group {
  display: inline-flex;

  .el-button {
    padding: 5px 12px;
    font-size: 12px;
    font-weight: 600;
  }

  .el-button--primary {
    background: #08f;
    border-color: #08f;
  }
}

/* 运营项目情况：指标列表 + 图表纵向布局，图表自适应占满剩余高度 */
.summary-card {
  ::v-deep .panel-card__body {
    display: flex;
    flex-direction: column;
    /* 矮屏（1080P 及以下）指标 + 图表超出卡片高度时在本模块内滚动，
       不再被 panel-card 的 overflow: hidden 裁切掉图表 */
    overflow-x: hidden;
    overflow-y: auto;

    /* 细滚动条：内容超出时常显（不靠 hover 才出现，否则用户不知道这里还能往下看） */
    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-thumb {
      background: rgba(144, 147, 153, 0.35);
      border-radius: 2px;
    }

    &::-webkit-scrollbar-thumb:hover {
      background: rgba(144, 147, 153, 0.6);
    }
  }

  /* 指标行排布交回 MetricList 的 is-card 规则（flex: 1 1 calc(50% - 8px) + min-width: max-content）：
     默认两列并排，某一项内容放不下半行宽时该项不压缩、整项换到单独一行铺满，
     标签/数值完整显示（原型注2）。这里不再锁死半栏宽做省略号，否则会出现
     「装机… / 上网… / 千瓦…」这种标签被截断、也失去换行占一行的问题。
     代价是长数值会把指标区多撑一行，图表由下方 min-height 兜底（最小值 150px） */

  .hours-chart {
    flex: 1;
    /* 图表最小高度 150px（原型注2「下面表格高度压缩，最小值 150px」）：
       指标区因换行多吃高度时，先压缩图表，压到 150px 仍不够则由上面的 overflow-y: auto 出滚动条 */
    min-height: 150px;
    margin-top: 8px;
    /* 滚动容器内不被压缩到 0，保证图表始终可读 */
    flex-shrink: 0;
  }
}

.panel-block {
  flex-shrink: 0;

  /* 自适应占满剩余高度，内容超出时由内部滚动 */
  &--flex {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  /* 列表换行撑高后，下方图表被压缩时的最小高度（与 .summary-card .hours-chart 保持一致） */
  .chart-bar-line {
    min-height: 160px;
  }
}

/* 项目总览环图空态（行业全不选时无数据）：与排名列表的空态文案保持一致，
   高度跟环图一致（撑满卡片剩余高度），避免面板高度跳动 */
.pie-empty {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #c0c4cc;
  font-size: 13px;
}
</style>
