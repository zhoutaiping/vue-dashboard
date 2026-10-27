<template>
  <div class="metric-list" :class="[`is-col-${columns}`, `is-${variant}`]">
    <div v-for="(item, index) in normalizedItems" :key="index" class="metric-item">
      <div v-if="showIcon && item.icon" class="metric-item__icon">
        <img :src="item.icon" alt="">
        <!-- <i v-else :class="item.icon" /> -->
      </div>
      <div class="metric-item__main">
        <div class="metric-item__label">
          {{ item.label }}
        </div>
        <div class="metric-item__value" :style="{ color: item.color || valueColor }">
          <span class="metric-item__number">{{ item.text }}</span>
          <i v-if="item.trend" class="metric-item__trend" />
          <span v-if="item.unit" class="metric-item__unit">{{ item.unit }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * 通用指标列表（纯展示）
 * 字段名可通过 fieldMap 自定义，后端字段改名无需改组件
 * variant：
 *  - default：紧凑纯文字（label 上 / value 下）
 *  - stat：横向大指标块（圆形图标 + label + 蓝色大数值），用于卡片顶部概览
 *  - card：带边框小卡片（图标 + label + 蓝色数值），用于指标网格
 */
export default {
  name: 'MetricList',
  props: {
    items: { type: Array, default: () => [] },
    // 字段映射：{ label, value, unit, color, icon, trend }
    fieldMap: {
      type: Object,
      default: () => ({ label: 'label', value: 'value', unit: 'unit', color: 'color', icon: 'icon', trend: 'trend' })
    },
    columns: { type: Number, default: 2 },
    valueColor: { type: String, default: '#303133' },
    // 展示形态：default / stat / card
    variant: { type: String, default: 'default' },
    // 自定义数值格式化
    formatter: { type: Function, default: null }
  },
  computed: {
    showIcon() {
      return this.variant !== 'default'
    },
    normalizedItems() {
      return this.items.map(item => {
        const raw = item[this.fieldMap.value]
        const value = this.formatter ? this.formatter(raw, item) : raw
        return {
          label: item[this.fieldMap.label],
          text: value === undefined || value === null ? '--' : value,
          unit: item[this.fieldMap.unit] || '',
          color: item[this.fieldMap.color] || '',
          icon: item[this.fieldMap.icon] || '',
          trend: item[this.fieldMap.trend] || ''
        }
      })
    }
  },
  methods: {
    //
  }
}
</script>

<style lang="scss" scoped>
.metric-list {
  display: flex;
  flex-wrap: wrap;

  &.is-col-1 .metric-item { width: 100%; }
  &.is-col-2 .metric-item { width: 50%; }
  &.is-col-3 .metric-item { width: 33.33%; }
  &.is-col-4 .metric-item { width: 25%; }
}

.metric-item {
  padding: 6px 4px;
  box-sizing: border-box;

  /* 文本区：占满剩余宽度，允许内部换行 */
  &__main {
    flex: 1;
    min-width: 0;
    display: flex;
    gap: 12px;
    align-items: center;
  }

  &__label {
    min-height: 20px;
    line-height: 20px;
    font-weight: bolder;
    color: rgba(48,49,51,1);
    font-size: 14px;
    word-break: break-all;
  }

  &__value {
    font-weight: bolder;
    line-height: 24px;
    color: rgba(0,136,255,1);
    word-break: break-all;
  }

  &__unit {
    font-size: 12px;
    font-weight: bold;
    margin-left: 3px;
    color: inherit;
  }

  /* 趋势箭头：数值同色、稍小，紧跟数值 */
  &__trend {
    display: inline-flex;
    align-items: center;
    margin-left: 4px;
    font-size: 14px;
    font-style: normal;
  }
}

/* 顶部概览大指标块：图标 + label 上 / 蓝色大数值下（两行排布） */
.metric-list.is-stat {
  gap: 12px;
  .metric-item {
    display: flex;
    align-items: center;
    padding: 8px;
    border-radius: 12px;
    background-color: rgba(242, 243, 245, 1);
    flex: 1;
    min-width: 0;
  }

  .metric-item__icon {
    width: 46px;
    height: 46px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-right: 10px;

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
  }

  /* label 在上、value 在下，label 不折行 */
  .metric-item__main {
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
  }

  .metric-item__label {
    white-space: nowrap;
  }

  .metric-item__value {
    font-size: 22px;
    font-weight: 700;
    line-height: 26px;
  }
}

/* 紧凑纯文字：label 上 / value 下 */
.metric-list.is-default .metric-item__main {
  flex-direction: column;
  align-items: flex-start;
  gap: 0;
}

/* 指标小卡片网格：带边框圆角 */
.metric-list.is-card {
  margin: -4px;

  .metric-item {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    /* 默认两列并排；内容放不下（超出半行宽）时禁止压缩，整项换到单独一行铺满 */
    flex: 1 1 calc(50% - 8px);
    min-width: max-content;
    margin: 4px;
    padding: 8px;
    border-radius: 8px;
    background-color: rgba(250,250,250,1);
    border: 1px solid rgba(242,243,245,1);
    height: 40px;
  }

  .metric-item__icon {
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    margin-right: 6px;

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }
  }

  /* 图标 + label + value 同行，间距紧凑 */
  .metric-item__main {
    gap: 6px;
  }

  .metric-item__label {
    color: rgba(48,49,51,1);
    font-size: 14px;
    font-weight: 400;
    white-space: nowrap;
  }

  .metric-item__value {
    font-size: 18px;
    font-weight: bold;
  }

  .metric-item__unit {
    font-size: 12px;
    color: #303133;
  }
}
</style>
