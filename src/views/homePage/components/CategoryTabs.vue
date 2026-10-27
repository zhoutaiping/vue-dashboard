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
 * 多选模式（multiple）：与"全部"项双向联动——点"全部"全选、可逐个取消、允许全部取消（清空态）
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
    // 置灰规则（多选模式）："全部"未全选时置灰；已全选时其余行业置灰
    // 置灰项仍可点击：点置灰"全部"→重新全选；点置灰行业→取消该项（"全部"随之置灰）
    isMuted(item) {
      if (!this.multiple) return false
      return item.value === this.allValue ? !this.isAllSelected : this.isAllSelected
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
        // 点"全部"：全选所有分类；已全选则不重复触发
        if (this.isAllSelected) return
        next = this.realItems.map(i => i.value)
      } else if (this.isAllSelected) {
        // 全选状态下点击具体行业：切换为仅选中该行业，其余取消（原型交互）
        next = [item.value]
      } else if (this.selectedList.includes(item.value)) {
        // 再次点击取消选中；允许全部取消（原型注4：全部取消时页面数据清空，仅保留筛选器）
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
      color: #fff;
      background-color: rgba(0,136,255,1);
      color: rgba(255,255,255,1);
    }

    &.is-active:hover {
      color: #fff;
      background-color: rgba(0,136,255,1);
      color: rgba(255,255,255,1);
    }

    /* 置灰态：全部未全选时的"全部"，或已全选时的各行业 */
    &.is-muted {
      background-color: rgba(96,105,127,0.7);
      color: rgba(255,255,255,1);

      &:hover {
        background-color: rgba(0,136,255,1);
        color: rgba(255,255,255,1);
      }
    }
  }

  &__count {
    margin-left: 2px;
    font-size: 12px;
  }
}
</style>
