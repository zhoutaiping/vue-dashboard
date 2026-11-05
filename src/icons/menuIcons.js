/**
 * 菜单图标下拉数据源
 *
 * 自动扫描 src/icons/common（目标项目的图标目录，本次新增的 mock 图标也在这里）
 * 以及 src/icons/svg（本项目既有图标），新增 svg 后下拉自动多出该项，无需改代码。
 *
 * 用法：
 *   import { menuIconNames, iconExists } from '@/icons/menuIcons'
 */
const commonReq = require.context('./common', false, /\.svg$/)
const svgReq = require.context('./svg', false, /\.svg$/)

function namesOf(ctx) {
  return ctx.keys().map(key => key.replace(/^\.\//, '').replace(/\.svg$/, ''))
}

const registry = {}
const menuIconNames = []

function collect(name) {
  if (name && !Object.prototype.hasOwnProperty.call(registry, name)) {
    registry[name] = true
    menuIconNames.push(name)
  }
}

namesOf(commonReq).forEach(collect)
namesOf(svgReq).forEach(collect)
menuIconNames.sort()

// 列表列 / 下拉选项用它判断图标是否真实存在，避免渲染空的 <svg>
export function iconExists(name) {
  return !!name && Object.prototype.hasOwnProperty.call(registry, String(name))
}

// 迁移前接口里存的是项目自定义 iconfont 名，不是 svg symbol；
// 保留近似映射，让历史数据在列表与下拉里仍能显示图标，而不是只剩 "--"。
const LEGACY_ICON_MAP = {
  'icon-shouye': 'el-icon-s-home',
  'icon-hangqingkanban': 'el-icon-data-line',
  'icon-shujuyuce': 'el-icon-trend-charts',
  'icon-xianhuofupan': 'el-icon-refresh',
  'icon-gongkaishuju': 'el-icon-folder-opened',
  'icon-zhongchangqi': 'el-icon-s-data',
  'icon-siyoushuju': 'el-icon-lock',
  'icon-ziliaoku': 'el-icon-notebook-2'
}

// 仅对不在 svg 注册表里的历史值使用
export function legacyIconClass(name) {
  if (!name) return ''
  return LEGACY_ICON_MAP[String(name)] || 'el-icon-menu'
}

export { menuIconNames }
export default menuIconNames
