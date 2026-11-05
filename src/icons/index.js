import Vue from 'vue'
import SvgIcon from '@/components/SvgIcon'// svg component
import Icon from '@/components/common/ui/SvgIcon'

// register globally
Vue.component('svg-icon', SvgIcon)
// 与目标项目一致：<Icon :name="xxx" />，菜单图标下拉与列表列都用它
Vue.component('Icon', Icon)

const requireAll = requireContext => requireContext.keys().map(requireContext)
// 本项目既有图标
requireAll(require.context('./svg', false, /\.svg$/))
// 目标项目图标目录（本次新增的 mock 图标）
requireAll(require.context('./common', false, /\.svg$/))
