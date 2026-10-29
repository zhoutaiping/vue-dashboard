<template>
  <div class="panel-card">
    <div v-if="hasHeader" class="panel-card__header">
      <div class="panel-card__left">
        <slot name="header">
          <span class="panel-card__title">
            <el-image :src="titleIcon" style="width: 14px; height: 14px" />
            {{ title }}
          </span>
          <span v-if="subTitle" class="panel-card__subtitle">{{ subTitle }}</span>
        </slot>
      </div>
      <div class="panel-card__extra">
        <slot name="extra" />
      </div>
    </div>
    <div class="panel-card__body" :style="bodyStyle">
      <slot />
    </div>
  </div>
</template>

<script>
import titleIcon from '../card-title-icon.svg'

/**
 * 通用面板容器（纯展示，不请求数据）
 * 后期迁移只需保证外部传入 title/插槽内容即可复用
 */
export default {
  name: 'PanelCard',
  props: {
    title: { type: String, default: '' },
    subTitle: { type: String, default: '' },
    bodyStyle: { type: Object, default: () => ({}) }
  },
  data() {
    return {
      titleIcon
    }
  },
  computed: {
    hasHeader() {
      return !!(this.title || this.subTitle || this.$slots.header || this.$slots.extra)
    }
  }
}
</script>

<style lang="scss" scoped>
.panel-card {
  background: #fff;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    height: 40px;
    border-radius: 12px 12px 0px 0px;
    background-color: rgba(250,250,250,1);
  }

  &__left {
    display: flex;
    align-items: center;
    min-width: 0;
  }

  &__title {
    display: inline-flex;
    align-items: center;
    font-size: 15px;
    font-weight: 600;
    color: #303133;
    white-space: nowrap;
    gap: 12px;
  }

  /* 区域后缀，与标题连成 "项目总览(全国)" 样式 */
  &__subtitle {
    font-size: 15px;
    font-weight: 600;
    color: #303133;
    white-space: nowrap;

    &::before {
      content: '(';
    }

    &::after {
      content: ')';
    }
  }

  &__body {
    flex: 1;
    padding: 12px;
    min-height: 0;
    /* 内容高度受限时由插槽内部（如列表）自行滚动 */
    overflow: hidden auto;
  }
}
</style>
