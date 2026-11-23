<template>
  <div class="project-card-list">
    <div v-if="title || $slots.extra" class="project-card-list__header">
      <span class="project-card-list__title">{{ title }}</span>
      <span class="project-card-list__extra">
        <slot name="extra" />
      </span>
    </div>

    <div class="project-card-list__body">
      <div
        v-for="(item, index) in items"
        :key="item[fieldMap.id] || index"
        class="project-card"
        @click="handleClick(item)"
      >
        <div class="project-card__header">
          <span class="project-card__name" :title="item[fieldMap.name]">{{ item[fieldMap.name] }}</span>
          <el-tag v-if="item[fieldMap.tag]" :type="tagType(item)" size="mini">
            {{ item[fieldMap.tag] }}
          </el-tag>
        </div>
        <div class="project-card__fields">
          <div v-for="field in fields" :key="field.field" class="project-card__field">
            <span class="project-card__label">{{ field.label }}：</span>
            <span class="project-card__value">
              {{ item[field.field] }}<em v-if="field.unit">{{ field.unit }}</em>
            </span>
          </div>
        </div>
      </div>

      <div v-if="!items.length" class="project-card-list__empty">
        暂无数据
      </div>
    </div>

    <div v-if="showMore" class="project-card-list__more">
      <el-button type="text" size="mini" @click="handleMore">
        更多>>
      </el-button>
    </div>
  </div>
</template>

<script>
/** 通用项目卡片列表（纯展示）；展示字段由 fields 配置 */
export default {
  name: 'ProjectCardList',
  props: {
    items: { type: Array, default: () => [] },
    title: { type: String, default: '' },
    fields: { type: Array, default: () => [] },
    fieldMap: {
      type: Object,
      default: () => ({ id: 'id', name: 'name', tag: 'status' })
    },
    tagTypeMap: { type: Object, default: () => ({}) },
    showMore: { type: Boolean, default: false }
  },
  methods: {
    tagType(item) {
      const status = item[this.fieldMap.tag]
      return this.tagTypeMap[status] || 'info'
    },
    handleClick(item) {
      this.$emit('item-click', item)
    },
    handleMore() {
      this.$emit('more')
    }
  }
}
</script>

<style lang="scss" scoped>
.project-card-list {
  display: flex;
  flex-direction: column;
  height: 100%;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 8px;
    border-bottom: 1px solid #f0f2f5;
  }

  &__title {
    font-size: 14px;
    font-weight: 600;
    color: #303133;
  }

  &__body {
    flex: 1;
    overflow-y: auto;
    padding-top: 8px;
  }

  &__empty {
    text-align: center;
    color: #c0c4cc;
    font-size: 13px;
    padding: 20px 0;
  }

  &__more {
    text-align: right;
    padding-top: 6px;
  }
}

.project-card {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 8px 10px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #0088ff;
    box-shadow: 0 2px 8px rgba(64, 158, 255, 0.15);
  }

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 6px;
  }

  &__name {
    font-size: 13px;
    font-weight: 600;
    color: #303133;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__fields {
    display: flex;
    flex-wrap: wrap;
  }

  &__field {
    width: 50%;
    font-size: 12px;
    line-height: 1.8;
    color: #606266;
  }

  &__label {
    color: #909399;
  }

  &__value {
    color: #303133;

    em {
      font-style: normal;
      color: #909399;
      margin-left: 2px;
    }
  }
}
</style>
