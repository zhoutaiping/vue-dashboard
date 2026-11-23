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
/** 通用分类 Tab（纯展示，支持单选/多选及“全部”联动） */
export default {
  name: 'CategoryTabs',
  props: {
    value: { type: [String, Number, Array], default: '' },
    items: { type: Array, default: () => [] },
    fieldMap: {
      type: Object,
      default: () => ({ label: 'name', value: 'id', count: 'count' })
    },
    activeColor: { type: String, default: '#0088ff' },
    multiple: { type: Boolean, default: false },
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
    selectedList() {
      return Array.isArray(this.value) ? this.value : []
    },
    realItems() {
      return this.normalizedItems.filter(item => item.value !== this.allValue)
    },
    isAllSelected() {
      return this.realItems.length > 0 && this.realItems.every(item => this.selectedList.includes(item.value))
    }
  },
  methods: {
    isActive(item) {
      if (!this.multiple) return item.value === this.value
      return item.value === this.allValue ? this.isAllSelected : this.selectedList.includes(item.value)
    },
    // 仅“全部”在未全选时置灰
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
      // “全部”在全选/全不选间切换；允许取消到最后一项
      let next
      if (item.value === this.allValue) {
        next = this.isAllSelected ? [] : this.realItems.map(i => i.value)
      } else if (this.selectedList.includes(item.value)) {
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

    &.is-muted {
      background-color: rgba(96,105,127,0.7);
      color: rgba(255,255,255,1);

      &:hover {
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
