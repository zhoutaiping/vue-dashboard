<template>
  <div class="category-tabs">
    <div
      v-for="item in normalizedItems"
      :key="item.value"
      class="category-tabs__item"
      :class="{ 'is-active': isActive(item) && !isMuted(item), 'is-muted': isMuted(item) }"
      :style="activeStyle(item)"
      @click="handleClick(item)"
    >
      <span class="category-tabs__label">{{ item.label }}</span>
      <span v-if="item.count !== null && item.count !== undefined" class="category-tabs__count">
        ({{ item.count }})
      </span>
    </div>
  </div>
</template>

<script>
/**
 * 通用分类 Tab（纯展示，支持 v-model 单选 / 多选）
 * 字段名通过 fieldMap 自定义：{ label, value, count }
 * 多选模式（multiple）：与"全部"项双向联动——点"全部"在全选 / 全不选之间切换、
 * 点已选中的行业取消该项（全选态下直接对该项生效、"全部"随之回落）、
 * 支持全不选（空数组 = 空态，由页面侧决定数据与取数）
 */
export default {
  name: 'CategoryTabs',
  props: {
    // 单选：String/Number；多选（multiple）：Array
    value: { type: [String, Number, Array], default: '' },
    items: { type: Array, default: () => [] },
    fieldMap: {
      type: Object,
      default: () => ({ label: 'name', value: 'id', count: 'count' })
    },
    activeColor: { type: String, default: '#0088ff' },
    // 多选模式开关
    multiple: { type: Boolean, default: false },
    // 多选模式下"全部"项对应的 value（需与 items 中该项一致）
    allValue: { type: [String, Number], default: 'all' }
  },
  computed: {
    normalizedItems() {
      return this.items.map(item => ({
        label: item[this.fieldMap.label],
        value: item[this.fieldMap.value],
        count: item[this.fieldMap.count],
        raw: item
      }))
    },
    // 多选模式下已选分类集合
    selectedList() {
      return Array.isArray(this.value) ? this.value : []
    },
    // 除"全部"外的真实分类项
    realItems() {
      return this.normalizedItems.filter(item => item.value !== this.allValue)
    },
    // 是否全选（即"全部"项的选中态）
    isAllSelected() {
      return this.realItems.length > 0 && this.realItems.every(item => this.selectedList.includes(item.value))
    }
  },
  methods: {
    isActive(item) {
      if (!this.multiple) return item.value === this.value
      return item.value === this.allValue ? this.isAllSelected : this.selectedList.includes(item.value)
    },
    // 置灰规则（多选模式）：只有"全部"在「未全选」时置灰。
    // 全选时不再把各行业置灰 —— 要求「全部 + 每个行业」同时点亮，否则会出现
    // 「明明全选了，却只有『全部』是蓝色、5 个行业全是灰的」这种看起来像没选中的状态；
    // 取消任意一个行业即视为未全选，"全部"自动回落为灰色
    isMuted(item) {
      if (!this.multiple) return false
      return item.value === this.allValue && !this.isAllSelected
    },
    handleClick(item) {
      if (!this.multiple) {
        if (item.value === this.value) return
        this.$emit('input', item.value)
        this.$emit('change', item.value, item.raw)
        return
      }
      let next
      if (item.value === this.allValue) {
        // 点"全部"：未全选 → 全选；已全选 → 全不选（空态，页面数据清空、筛选器保留可点）
        next = this.isAllSelected ? [] : this.realItems.map(i => i.value)
      } else if (this.selectedList.includes(item.value)) {
        // 点已选中的行业 → 取消该项（全选态下同样生效，取消任意一项后"全部"自动回落为未选中）。
        // 允许取消最后一项：得到空数组即全不选，由页面侧清空数据
        next = this.selectedList.filter(v => v !== item.value)
      } else {
        next = this.selectedList.concat(item.value)
      }
      this.$emit('input', next)
      this.$emit('change', next, item.raw)
    },
    activeStyle(item) {
      if (!this.isActive(item) || this.isMuted(item)) return {}
      return {
        background: this.activeColor,
        borderColor: this.activeColor,
        color: '#fff'
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;

  &__item {
    padding: 4px 12px;
    font-size: 13px;
    border-radius: 8px;
    background-color: rgba(96,105,127,0.7);
    color: rgba(255,255,255,1);
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;

    &:hover {
      color: rgba(255,255,255,1);
    }

    &.is-active:hover {
      color: #fff;
      background-color: rgba(0,136,255,1);
    }
    /* is-muted 由模板下发（「全部」未全选时的置灰态），当前与基础态同色，
       保留该类以便后续需要区分底色时直接补样式 */
  }

  &__count {
    margin-left: 2px;
    font-size: 12px;
  }
}
</style>
