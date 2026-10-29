<template>
  <div class="rank-list">
    <div v-if="tabs && tabs.length" class="rank-list__tabs">
      <span
        v-for="tab in tabs"
        :key="tab.value"
        class="rank-list__tab"
        :class="{ 'is-active': tab.value === activeTab }"
        @click="handleTabClick(tab)"
      >
        {{ tab.label }}
      </span>
    </div>

    <div class="rank-list__body">
      <div
        v-for="(item, index) in visibleItems"
        :key="item.key || index"
        class="rank-item"
        @click="handleRowClick(item)"
      >
        <!-- 序号徽章：01红 / 02橙 / 03黄 / 其余浅蓝灰 -->
        <span class="rank-item__index" :class="rankClass(index)">{{ String(index + 1).padStart(2, '0') }}</span>

        <div class="rank-item__content">
          <div class="rank-item__top">
            <span class="rank-item__name" :title="item.name">{{ item.name }}</span>
            <span class="rank-item__value" :class="rankClass(index)">{{ item.text }}</span>
          </div>
          <div class="rank-item__bar">
            <i
              class="rank-item__bar-inner"
              :class="rankClass(index)"
              :style="[{ width: item.percent + '%' }, barColor ? { background: barColor } : {}]"
            />
          </div>
        </div>
      </div>

      <div v-if="!visibleItems.length" class="rank-list__empty">
        暂无数据
      </div>
    </div>
  </div>
</template>

<script>
/**
 * 通用排名列表（纯展示）
 * 字段名通过 fieldMap 自定义：{ name, value, code }
 * 排名维度（建设个数/达标率/...）由外部 tabs 传入，组件不写死业务
 * 样式：序号徽章 + 名称/数值 + 整行进度条；前三名红/橙/黄，其余蓝
 */
export default {
  name: 'RankList',
  props: {
    items: { type: Array, default: () => [] },
    tabs: { type: Array, default: () => [] },
    activeTab: { type: [String, Number], default: '' },
    fieldMap: {
      type: Object,
      default: () => ({ name: 'name', value: 'value', code: 'code' })
    },
    // 条形颜色，传入则覆盖默认渐变（一般不传，用内置名次配色）
    barColor: { type: String, default: '' },
    max: { type: Number, default: 0 },
    formatter: { type: Function, default: null }
  },
  computed: {
    maxValue() {
      if (this.max > 0) return this.max
      return this.items.reduce((max, item) => {
        const val = Number(item[this.fieldMap.value]) || 0
        return val > max ? val : max
      }, 0)
    },
    visibleItems() {
      return this.items.map((item, index) => {
        const raw = item[this.fieldMap.value]
        const value = Number(raw) || 0
        const percent = this.maxValue > 0 ? Math.round((value / this.maxValue) * 100) : 0
        return {
          key: item[this.fieldMap.code] || index,
          name: item[this.fieldMap.name],
          value,
          text: this.formatter ? this.formatter(raw, item) : raw,
          percent,
          raw: item
        }
      })
    }
  },
  methods: {
    // 名次修饰类：前三名 is-rank-1/2/3，其余走默认样式
    rankClass(index) {
      return index < 3 ? `is-rank-${index + 1}` : ''
    },
    handleTabClick(tab) {
      if (tab.value === this.activeTab) return
      this.$emit('update:activeTab', tab.value)
      this.$emit('tab-change', tab.value)
    },
    handleRowClick(item) {
      this.$emit('row-click', item.raw, item)
    }
  }
}
</script>

<style lang="scss" scoped>
/* 前三名配色：徽章描边 / 数值 / 进度条三处共用，改这里三处同步生效 */
$rank-1: #e63c3c;
$rank-2: #f57f24;
$rank-3: #f2c320;

.rank-list {
  display: flex;
  flex-direction: column;
  height: 100%;

  &__tabs {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    padding-bottom: 8px;
    border-bottom: 1px solid #f0f2f5;
  }

  /* 按钮式 tab：选中蓝底白字 */
  &__tab {
    font-size: 12px;
    color: #606266;
    cursor: pointer;
    padding: 2px 12px;
    border-radius: 12px;
    background: #f5f7fa;
    transition: all 0.2s;

    &:hover {
      color: #08f;
    }

    &.is-active {
      color: #fff;
      font-weight: 600;
      background: #08f;
    }
  }

  /* 列表区：高度超出时内部滚动（min-height:0 是 flex 子项收缩的必要条件） */
  &__body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    margin-top: 8px;
    padding: 8px;
    border-radius: 8px;

    /* 滚动条默认不展示，鼠标移入列表时显示细滚动条 */
    scrollbar-width: thin;
    scrollbar-color: transparent transparent;

    &:hover {
      scrollbar-color: rgba(144, 147, 153, 0.4) transparent;
    }

    &::-webkit-scrollbar {
      width: 4px;
    }

    &::-webkit-scrollbar-track {
      background: transparent;
    }

    &::-webkit-scrollbar-thumb {
      background: transparent;
      border-radius: 2px;
    }

    &:hover::-webkit-scrollbar-thumb {
      background: rgba(144, 147, 153, 0.4);
    }
  }

  &__empty {
    text-align: center;
    color: #c0c4cc;
    font-size: 13px;
    padding: 20px 0;
  }
}

/* 单行排名：徽章 + (名称/数值 + 整行进度条) */
.rank-item {
  display: flex;
  align-items: flex-start;
  padding: 7px 8px;
  border-radius: 8px;
  cursor: pointer;

  &:hover {
    background: #eef4ff;
  }
}

.rank-item__index {
  width: 30px;
  height: 30px;
  line-height: 30px;
  text-align: center;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  font-style: italic;
  flex-shrink: 0;
  margin-right: 10px;
  background: #e9f0fa;
  color: #7d97bd;
  border-top: 3px solid rgba(192, 196, 204, 1);

  &.is-rank-1 {
    border-radius: 4px;
    background: linear-gradient(180deg, rgba(255, 64, 66, 0.4) 0%, rgba(255, 64, 66, 0.1) 97%);
    border-top: 3px solid $rank-1;
    color: $rank-1;
  }

  &.is-rank-2 {
    border-radius: 4px;
    background: linear-gradient(180deg, rgba(255, 108, 0, 0.4) 0%, rgba(255, 108, 0, 0.1) 100%);
    border-top: 3px solid $rank-2;
    color: $rank-2;
  }

  &.is-rank-3 {
    border-radius: 4px;
    background: linear-gradient(180deg, rgba(255, 209, 86, 0.4) 0%, rgba(255, 209, 86, 0.1) 100%);
    /* 徽章比数值色略深（#f0c020 vs $rank-3）：黄色在浅底描边上需要更实一点 */
    border-top: 3px solid #f0c020;
    color: #f0c020;
  }
}

.rank-item__content {
  flex: 1;
  min-width: 0;
}

.rank-item__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.rank-item__name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  font-weight: 600;
  font-style: italic;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rank-item__value {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: 700;
  font-style: italic;
  color: #303133;

  &.is-rank-1 {
    color: $rank-1;
  }

  &.is-rank-2 {
    color: $rank-2;
  }

  &.is-rank-3 {
    color: $rank-3;
  }
}

.rank-item__bar {
  height: 8px;
  background: #e9edf4;
  border-radius: 4px;
  overflow: hidden;
  margin-top: 6px;
}

.rank-item__bar-inner {
  display: block;
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s;
  background: linear-gradient(90deg, #9cc3ff, #2f7bf5);

  &.is-rank-1 {
    background: linear-gradient(90deg, #ff9c8f, $rank-1);
  }

  &.is-rank-2 {
    background: linear-gradient(90deg, #ffbe7a, $rank-2);
  }

  &.is-rank-3 {
    background: linear-gradient(90deg, #ffe38f, $rank-3);
  }
}
</style>
