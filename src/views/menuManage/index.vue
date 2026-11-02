<template>
  <div class="menu-manage">
    <!-- 工具栏：搜索 / 新增 / 全部展开收起 -->
    <div class="menu-manage__toolbar">
      <div class="menu-manage__toolbar-left">
        <el-input
          v-model="keyword"
          size="small"
          clearable
          placeholder="请输入菜单名称 / 编码 / 权限标识"
          prefix-icon="el-icon-search"
          class="menu-manage__search"
        />
        <el-button size="small" type="primary" icon="el-icon-plus" @click="handleAddTop">新增</el-button>
        <el-button size="small" class="menu-manage__ghost-btn" @click="toggleExpandAll">
          {{ expandAll ? '全部收起' : '全部展开' }}
        </el-button>
      </div>
      <span class="menu-manage__count">共 {{ totalCount }} 项</span>
    </div>

    <!-- 树形菜单表格：row-key + childList 构成层级，展开箭头在第一列 -->
    <el-table
      ref="table"
      :key="tableKey"
      v-loading="loading"
      :data="tableData"
      row-key="menuId"
      :tree-props="{ children: 'childList' }"
      :default-expand-all="expandAll || !!keyword"
      :height="tableHeight"
      class="menu-manage__table"
      element-loading-text="加载中..."
      border
      size="mini"
    >
      <el-table-column
        prop="name"
        label="菜单名称"
        width="220"
        fixed="left"
        class-name="menu-name-cell"
        label-class-name="menu-name-cell"
      >
        <template slot-scope="{ row }">
          <span class="menu-name" :title="row.name">{{ row.name }}</span>
        </template>
      </el-table-column>

      <el-table-column label="图标" width="70" align="center">
        <template slot-scope="{ row }">
          <i v-if="iconClass(row.icon)" :class="iconClass(row.icon)" class="menu-icon" />
          <span v-else class="menu-icon--empty">--</span>
        </template>
      </el-table-column>

      <el-table-column prop="menuCode" label="权限标识" min-width="240" show-overflow-tooltip />

      <el-table-column prop="menuId" label="菜单编码" width="100" align="center" />

      <el-table-column label="是否显示" width="90" align="center">
        <template slot-scope="{ row }">
          <span :class="['menu-status', String(row.isOn) === '1' ? 'is-on' : 'is-off']">
            {{ String(row.isOn) === '1' ? '显示' : '隐藏' }}
          </span>
        </template>
      </el-table-column>

      <el-table-column prop="url" label="路由地址（URL）" min-width="280" class-name="menu-url-cell">
        <template slot-scope="{ row }">
          <span class="menu-url">{{ row.url || '--' }}</span>
        </template>
      </el-table-column>

      <el-table-column prop="modifyTime" label="更新时间" width="170" align="center" />

      <el-table-column label="排序操作" width="186" align="center" fixed="right">
        <template slot-scope="{ row }">
          <div class="sort-btns">
            <el-button
              size="mini"
              class="sort-btn"
              :disabled="isFirstSibling(row)"
              @click.stop="handleMove(row, 'up')"
            >
              <i class="el-icon-caret-top" /> 上移
            </el-button>
            <el-button
              size="mini"
              class="sort-btn"
              :disabled="isLastSibling(row)"
              @click.stop="handleMove(row, 'down')"
            >
              <i class="el-icon-caret-bottom" /> 下移
            </el-button>
          </div>
        </template>
      </el-table-column>

      <el-table-column label="操作" width="196" align="center" fixed="right">
        <template slot-scope="{ row }">
          <el-button type="text" size="mini" class="link-btn" @click.stop="handleEdit(row)">编辑</el-button>
          <el-button type="text" size="mini" class="link-btn link-btn--add" @click.stop="handleAddChild(row)">新增下级</el-button>
          <el-button type="text" size="mini" class="link-btn link-btn--danger" @click.stop="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增 / 编辑弹窗 -->
    <el-dialog
      :visible.sync="dialogVisible"
      :title="dialogTitle"
      width="640px"
      append-to-body
      custom-class="menu-manage-dialog"
      :close-on-click-modal="false"
    >
      <el-form ref="form" :model="form" :rules="rules" label-width="96px" size="small">
        <el-row :gutter="12">
          <el-col :span="24">
            <el-form-item label="上级菜单">
              <span class="parent-text">{{ parentName }}</span>
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="菜单类型">
              <el-radio-group v-model="form.type">
                <el-radio :label="0">目录</el-radio>
                <el-radio :label="1">菜单</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="菜单名称" prop="name">
              <el-input v-model="form.name" maxlength="30" placeholder="请输入菜单名称" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="菜单编码">
              <el-input v-model="form.menuId" disabled placeholder="保存后自动生成" />
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="权限标识" prop="menuCode">
              <el-input v-model="form.menuCode" maxlength="80" placeholder="如 GanSu/MarketDashboard" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="图标">
              <el-input v-model="form.icon" placeholder="如 icon-shouye">
                <i v-if="iconClass(form.icon)" slot="suffix" :class="iconClass(form.icon)" class="icon-preview" />
              </el-input>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="排序号">
              <el-input-number v-model="form.orderNum" :min="1" :max="9999" controls-position="right" style="width: 100%" />
            </el-form-item>
          </el-col>

          <el-col :span="24">
            <el-form-item label="路由地址">
              <el-input v-model="form.url" maxlength="200" placeholder="如 views/GanSu/Home/index.vue" />
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="是否显示">
              <el-radio-group v-model="form.isOn">
                <el-radio label="1">显示</el-radio>
                <el-radio label="0">隐藏</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="是否缓存">
              <el-radio-group v-model="form.keepAlive">
                <el-radio label="1">缓存</el-radio>
                <el-radio label="0">不缓存</el-radio>
              </el-radio-group>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <div slot="footer">
        <el-button size="small" @click="dialogVisible = false">取 消</el-button>
        <el-button size="small" type="primary" :loading="saving" @click="handleSubmit">确 定</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import { qryMenuList, saveMenu, deleteMenu, sortMenu } from '@/api/menuManage'

// 接口返回的是项目自定义 iconfont 名，这里映射成视觉近似的 Element 图标；
// 以后接入真实图标库时，只需把这里换成 <svg-icon :icon-class="row.icon">
const ICON_MAP = {
  'icon-shouye': 'el-icon-s-home',
  'icon-hangqingkanban': 'el-icon-data-line',
  'icon-shujuyuce': 'el-icon-trend-charts',
  'icon-xianhuofupan': 'el-icon-refresh',
  'icon-gongkaishuju': 'el-icon-folder-opened',
  'icon-zhongchangqi': 'el-icon-s-data',
  'icon-siyoushuju': 'el-icon-lock',
  'icon-ziliaoku': 'el-icon-notebook-2'
}

export default {
  name: 'MenuManage',
  data() {
    return {
      loading: false,
      saving: false,
      keyword: '',
      // 接口原始树（不随搜索变化），排序/编辑/删除都以它为准
      rawList: [],
      totalCount: 0,
      // 全部展开状态：切换时重建表格（default-expand-all 只在初始化生效）
      expandAll: false,
      tableKey: 0,
      tableHeight: 560,
      expandedOnce: false,
      dialogVisible: false,
      // add 新增顶级 / addChild 新增下级 / edit 编辑
      dialogMode: 'add',
      parentName: '顶级菜单',
      form: this.emptyForm(),
      rules: {
        name: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
        menuCode: [{ required: true, message: '请输入权限标识', trigger: 'blur' }]
      }
    }
  },
  computed: {
    // 搜索过滤：命中节点保留全部子级，未命中但有命中子级的只保留命中的分支
    tableData() {
      return this.filterTree(this.rawList, this.keyword)
    },
    dialogTitle() {
      if (this.dialogMode === 'edit') return '编辑菜单'
      if (this.dialogMode === 'addChild') return '新增下级菜单'
      return '新增菜单'
    }
  },
  watch: {
    // 过滤后行对象重建，逐行维护的展开状态会错位，直接重建表格（搜索时默认全展开）
    keyword() {
      this.tableKey += 1
    }
  },
  mounted() {
    window.addEventListener('resize', this.updateTableHeight)
    this.$nextTick(() => {
      this.updateTableHeight()
      this.fetchList()
    })
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.updateTableHeight)
  },
  methods: {
    emptyForm() {
      return {
        menuId: '',
        parentId: '0',
        name: '',
        menuCode: '',
        icon: '',
        url: '',
        type: 0,
        isOn: '1',
        keepAlive: '1',
        orderNum: 99
      }
    },
    // 后端成功码：0（本项目约定）/ 200（历史接口）
    isOk(res) {
      return !!res && (res.code === 0 || res.code === 200)
    },
    iconClass(icon) {
      if (!icon) return ''
      return ICON_MAP[icon] || 'el-icon-menu'
    },
    updateTableHeight() {
      // 视口 - 顶栏(50) - tags-view(34) - 页面内边距(32) - 工具栏(44) - 余量(12)
      this.tableHeight = Math.max(320, window.innerHeight - 172)
    },
    async fetchList() {
      this.loading = true
      const res = await qryMenuList({})
      this.loading = false
      if (!this.isOk(res)) {
        this.rawList = []
        this.totalCount = 0
        this.$message.error((res && res.msg) || '菜单列表加载失败')
        return
      }
      this.rawList = Array.isArray(res.data) ? res.data : []
      this.totalCount = this.countTree(this.rawList)
      this.$nextTick(() => {
        // 首次进入时 Layout 可能还在调整高度，渲染完成后再校正一次表格高度
        this.updateTableHeight()
        if (!this.expandedOnce) {
          this.expandedOnce = true
          this.expandFirstParent()
        }
      })
    },
    countTree(list) {
      return (list || []).reduce((sum, item) => sum + 1 + this.countTree(item.childList), 0)
    },
    filterTree(list, keyword) {
      const kw = String(keyword || '').trim().toLowerCase()
      if (!kw) return list || []
      const result = []
      ;(list || []).forEach(node => {
        const hit = [node.name, node.menuId, node.menuCode, node.url].some(val => String(val || '').toLowerCase().indexOf(kw) > -1)
        const children = hit ? (node.childList || []) : this.filterTree(node.childList, keyword)
        if (hit || children.length) {
          result.push(Object.assign({}, node, { childList: children }))
        }
      })
      return result
    },
    // 首屏展开第一个有子级的目录，避免整页全是折叠行
    expandFirstParent() {
      if (this.expandAll || this.keyword || !this.$refs.table) return
      const first = this.tableData.find(item => (item.childList || []).length)
      if (first) this.$refs.table.toggleRowExpansion(first, true)
    },
    toggleExpandAll() {
      this.expandAll = !this.expandAll
      this.tableKey += 1
    },
    // 同级列表（排序按钮的禁用判断依赖它）
    siblingsOf(row) {
      const find = (list, parentId) => {
        if (parentId === '0') return list
        for (let i = 0; i < (list || []).length; i += 1) {
          const node = list[i]
          if (node.menuId === parentId) return node.childList || []
          const hit = find(node.childList, parentId)
          if (hit) return hit
        }
        return null
      }
      return find(this.rawList, row.parentId) || []
    },
    siblingIndex(row) {
      return this.siblingsOf(row).findIndex(item => item.menuId === row.menuId)
    },
    isFirstSibling(row) {
      return this.siblingIndex(row) <= 0
    },
    isLastSibling(row) {
      const list = this.siblingsOf(row)
      return this.siblingIndex(row) >= list.length - 1
    },
    findNode(list, menuId) {
      for (let i = 0; i < (list || []).length; i += 1) {
        const node = list[i]
        if (node.menuId === menuId) return node
        const hit = this.findNode(node.childList, menuId)
        if (hit) return hit
      }
      return null
    },
    async handleMove(row, direction) {
      const res = await sortMenu({ menuId: row.menuId, direction })
      if (!this.isOk(res)) {
        this.$message.error((res && res.msg) || '排序失败')
        return
      }
      this.$message.success('排序成功')
      this.fetchList()
    },
    handleAddTop() {
      this.openDialog({ mode: 'add', parentId: '0', parentName: '顶级菜单' })
    },
    handleAddChild(row) {
      this.openDialog({ mode: 'addChild', parentId: row.menuId, parentName: row.name })
    },
    handleEdit(row) {
      const parent = row.parentId === '0' ? null : this.findNode(this.rawList, row.parentId)
      this.openDialog({
        mode: 'edit',
        parentId: row.parentId || '0',
        parentName: parent ? parent.name : '顶级菜单',
        row
      })
    },
    openDialog({ mode = 'add', parentId, parentName, row }) {
      this.dialogMode = mode
      this.parentName = parentName || '顶级菜单'
      if (mode === 'edit' && row) {
        this.form = {
          menuId: row.menuId,
          parentId: row.parentId || '0',
          name: row.name || '',
          menuCode: row.menuCode || '',
          icon: row.icon || '',
          url: row.url || '',
          type: Number(row.type) || 0,
          isOn: String(row.isOn) === '0' ? '0' : '1',
          keepAlive: String(row.keepAlive) === '0' ? '0' : '1',
          orderNum: Number(row.orderNum) || 1
        }
      } else {
        this.form = Object.assign(this.emptyForm(), { parentId: parentId || '0' })
      }
      this.dialogVisible = true
      this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate())
    },
    handleSubmit() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        this.saving = true
        const res = await saveMenu(Object.assign({}, this.form))
        this.saving = false
        if (!this.isOk(res)) {
          this.$message.error((res && res.msg) || '保存失败')
          return
        }
        this.dialogVisible = false
        this.$message.success(this.dialogMode === 'edit' ? '修改成功' : '新增成功')
        this.fetchList()
      })
    },
    handleDelete(row) {
      if ((row.childList || []).length) {
        this.$message.warning('存在下级菜单，请先删除下级菜单')
        return
      }
      this.$confirm(`确认删除菜单「${row.name}」吗？`, '提示', {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      })
        .then(() => this.doDelete(row))
        .catch(() => {})
    },
    async doDelete(row) {
      const res = await deleteMenu({ menuId: row.menuId })
      if (!this.isOk(res)) {
        this.$message.error((res && res.msg) || '删除失败')
        return
      }
      this.$message.success('删除成功')
      this.fetchList()
    }
  }
}
</script>

<style lang="scss" scoped>
// 主题跟随系统（vue-element-admin 默认浅色：白底 + 主色 #0088ff），
// 不再单独铺深蓝，保持与后台其它页面一致
.menu-manage {
  box-sizing: border-box;
  min-height: calc(100vh - 84px);
  padding: 16px;

  &__toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }

  &__toolbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__search {
    width: 280px;
  }

  // 「全部展开/收起」：使用系统次要按钮样式，无需额外定制
  &__ghost-btn {
    margin-left: 0;
  }

  &__count {
    font-size: 12px;
    color: #909399;
  }
}

/* 树形缩进相关尺寸：Element 展开箭头 20px 宽 + 3px 右间距 */
$menu-expand-width: 20px;
$menu-expand-gap: 3px;

/* 名称列单元格改为 flex：缩进占位、展开箭头、名称依次排列，
   flex 会忽略节点间的空白文本，避免箭头行比叶子行多出一段空格 */
::v-deep .menu-name-cell .cell {
  display: flex;
  align-items: center;
}

/* 展开箭头与 Element 自带占位的右间距保持一致 */
::v-deep .menu-name-cell .el-table__expand-icon,
::v-deep .menu-name-cell .el-table__placeholder {
  margin-right: $menu-expand-gap;
}

/* Element 只给 level>0 的叶子行渲染 .el-table__placeholder；
   顶层叶子（cell 内没有缩进和箭头，名称即第一个子元素）用 CSS 补等宽间距 */
::v-deep .menu-name-cell .cell > .menu-name:first-child {
  margin-left: $menu-expand-width + $menu-expand-gap;
}

.menu-name {
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
  color: #303133;
}

.menu-icon {
  font-size: 16px;
  color: #0088ff;

  &--empty {
    color: #c0c4cc;
  }
}

.menu-status {
  font-size: 12px;

  &.is-on {
    color: #67c23a;
  }

  &.is-off {
    color: #f56c6c;
  }
}

.menu-url {
  color: #606266;
  font-size: 12px;
}

/* URL 列：超长地址换行显示（不再用省略号 + tooltip），横向可滚动时也不被截断 */
::v-deep .menu-url-cell .cell {
  white-space: normal;
  word-break: break-all;
  line-height: 1.5;
}

/* 排序：上下两个小按钮，竖排 */
.sort-btns {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 2px;
}

.sort-btn {
  width: 52px;
  height: 18px;
  padding: 0;
  font-size: 11px;
  line-height: 16px;
  border-radius: 2px;
  // 主色 plain 风格，与系统蓝 #0088ff 一致
  background: #ecf5ff;
  border: 1px solid #b3d8ff;
  color: #0088ff;

  i {
    font-size: 10px;
  }

  & + .sort-btn {
    margin-left: 0;
  }

  &:hover:not(.is-disabled) {
    background: #0088ff;
    border-color: #0088ff;
    color: #fff;
  }

  &.is-disabled {
    opacity: 0.4;
  }
}

/* 行内文字按钮：编辑蓝 / 新增绿 / 删除红（Element 语义色，与系统一致） */
.link-btn {
  padding: 0 4px;
  color: #0088ff;

  &:hover {
    color: #3399ff;
  }

  &--add {
    color: #30b08f;

    &:hover {
      color: #45c79e;
    }
  }

  &--danger {
    color: #f56c6c;

    &:hover {
      color: #f78989;
    }
  }
}

.icon-preview {
  font-size: 14px;
  color: #0088ff;
  line-height: 30px;
  margin-right: 6px;
}

.parent-text {
  color: #303133;
}
</style>

<!-- 弹窗使用系统默认浅色外观（append-to-body 已脱离组件作用域），无需额外样式 -->

