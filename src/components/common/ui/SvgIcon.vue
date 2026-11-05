<template>
  <svg :class="svgClass" aria-hidden="true" v-on="$listeners">
    <use :xlink:href="iconName" />
  </svg>
</template>

<script>
/**
 * 与目标项目 src/components/common/ui/SvgIcon 用法一致：<Icon :name="xxx" />
 * 图标来自 svg-sprite-loader 注入的 #icon-[name] symbol
 */
export default {
  name: 'SvgIcon',
  props: {
    name: {
      type: String,
      default: ''
    },
    className: {
      type: String,
      default: ''
    }
  },
  computed: {
    iconName() {
      return `#icon-${this.name}`
    },
    svgClass() {
      return this.className ? `svg-icon ${this.className}` : 'svg-icon'
    }
  }
}
</script>

<style scoped>
.svg-icon {
  width: 1em;
  height: 1em;
  vertical-align: -0.15em;
  fill: currentColor;
  overflow: hidden;
}
</style>
