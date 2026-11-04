<template>
  <div class="menu-manage">
    <!-- 工具栏：搜索 / 新增 / 全部展开收起 -->
    <div class="menu-manage__toolbar">
      <div class="menu-manage__toolbar-left">
        <el-input
          v-model="keyword"
          size="small"
          clearable
          placeholder="请输入菜单名称 / 权限编码 / 前端菜单编码"
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

    <!-- 树形菜单表格：row-key=id + tree-props children 构成层级，展开箭头在第一列 -->
    <el-table
      ref="table"
      v-loading="loading"
      :data="tableData"
      row-key="id"
      :tree-props="{ children: 'children' }"
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

      <el-table-column prop="code" label="权限编码" min-width="150" show-overflow-tooltip />

      <el-table-column prop="menuCode" label="前端菜单编码" min-width="250" show-overflow-tooltip />

      <el-table-column label="菜单类型" width="90" align="center">
        <template slot-scope="{ row }">
          <el-tag size="mini" effect="plain" :type="meantypeTag(row)">{{ meantypeText(row) }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column prop="url" label="路由地址（URL）" min-width="280" class-name="menu-url-cell">
        <template slot-scope="{ row }">
          <span class="menu-url">{{ row.url || '--' }}</span>
        </template>
      </el-table-column>

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

    <!-- 新增 / 编辑抽屉：表单独立组件，保存成功后刷新列表 -->
    <menu-form-drawer
      :visible.sync="drawerVisible"
      :mode="drawerMode"
      :row="editingRow"
      :pid="drawerPid"
      :tree="rawList"
      @saved="fetchList"
    />
  </div>
</template>

<script>
import { qryMenuList, deleteMenu, moveMenu } from '@/api/menuManage'
import MenuFormDrawer from './components/MenuFormDrawer'

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
  components: { MenuFormDrawer },
  data() {
    return {
      loading: false,
      keyword: '',
      // 接口原始树（不随搜索变化），排序/编辑/删除都以它为准
      rawList: [],
      totalCount: 0,
      // 全部展开状态（配合 applyExpandAll 逐行同步）
      expandAll: false,
      tableHeight: 560,
      expandedOnce: false,
      // 新增 / 编辑抽屉状态（表单逻辑在 MenuFormDrawer 组件内）
      drawerVisible: false,
      drawerMode: 'add', // add 新增顶级 / addChild 新增下级 / edit 编辑
      editingRow: null,
      drawerPid: 0
    }
  },
  computed: {
    // 搜索过滤：命中节点保留全部子级，未命中但有命中子级的只保留命中的分支
    tableData() {
      return this.filterTree(this.rawList, this.keyword)
    }
  },
  watch: {
    // 搜索时自动展开命中分支，并让按钮状态与实际展开保持一致；清空后按用户选择恢复
    keyword(val) {
      if (val) this.expandAll = true
      this.$nextTick(this.applyExpandAll)
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
    // 后端成功码：0（本项目约定）/ 200（历史接口）
    isOk(res) {
      return !!res && (res.code === 1 || res.code === 200)
    },
    iconClass(icon) {
      if (!icon) return ''
      return ICON_MAP[icon] || 'el-icon-menu'
    },
    // 真实接口字段是 meantype（文档/报错文案误写成 menutype），这里兼容两种写法
    menutypeOf(row) {
      return (row && (row.meantype || row.menutype)) || 'menu'
    },
    // meantype 只有 menu / button；menu 再按是否有子级区分目录与页面菜单
    meantypeText(row) {
      if (this.menutypeOf(row) === 'button') return '按钮'
      return (row.children || []).length ? '目录' : '菜单'
    },
    meantypeTag(row) {
      if (this.menutypeOf(row) === 'button') return 'warning'
      return (row.children || []).length ? '' : 'success'
    },
    // regular：0 锁定不可移动；接口可能返回 null / 缺省，此时视为可移动
    isLocked(row) {
      return row.regular === 0 || row.regular === '0'
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
        } else {
          // 数据刷新后 el-table 会重置展开态，按当前状态恢复
          this.applyExpandAll()
        }
      })
    },
    countTree(list) {
      return (list || []).reduce((sum, item) => sum + 1 + this.countTree(item.children), 0)
    },
    filterTree(list, keyword) {
      const kw = String(keyword || '').trim().toLowerCase()
      if (!kw) return list || []
      const result = []
      ;(list || []).forEach(node => {
        const hit = [node.name, node.code, node.menuCode, node.url].some(val => String(val || '').toLowerCase().indexOf(kw) > -1)
        const children = hit ? (node.children || []) : this.filterTree(node.children, keyword)
        if (hit || children.length) {
          result.push(Object.assign({}, node, { children }))
        }
      })
      return result
    },
    // 首屏展开第一个有子级的目录，避免整页全是折叠行
    expandFirstParent() {
      if (this.expandAll || this.keyword || !this.$refs.table) return
      const first = this.tableData.find(item => (item.children || []).length)
      if (first) this.$refs.table.toggleRowExpansion(first, true)
    },
    /**
     * 逐行同步展开状态（全部展开 / 全部收起）
     * 不用 default-expand-all：它只在表格初始化/重建时生效，
     * 数据刷新、搜索过滤后都会失效，导致「全部收起」点了没反应
     *
     * 先走官方 toggleRowExpansion，再回写 store.states.treeData[id].expanded 兜底：
     * 展开态在 element-ui 里就是这个字段，任何 2.x 版本都生效，
     * 避免个别版本/封装下 toggleRowExpansion 不落库导致收起没反应
     */
    applyExpandAll() {
      const table = this.$refs.table
      if (!table || !table.store) return
      const expand = !!this.expandAll
      const treeData = (table.store.states && table.store.states.treeData) || {}

      const walk = list => (list || []).forEach(row => {
        if ((row.children || []).length) {
          table.toggleRowExpansion(row, expand)
          const node = treeData[row.id]
          if (node && node.expanded !== expand) node.expanded = expand
        }
        walk(row.children)
      })
      walk(this.tableData)

      if (table.store.updateTableScrollY) table.store.updateTableScrollY()
    },
    toggleExpandAll() {
      this.expandAll = !this.expandAll
      this.$nextTick(this.applyExpandAll)
    },
    // 同级列表（排序按钮的禁用判断依赖它）
    siblingsOf(row) {
      const find = (list, pid) => {
        if (!Number(pid)) return list
        for (let i = 0; i < (list || []).length; i += 1) {
          const node = list[i]
          if (node.id === Number(pid)) return node.children || []
          const hit = find(node.children, pid)
          if (hit) return hit
        }
        return null
      }
      return find(this.rawList, row.pid) || []
    },
    siblingIndex(row) {
      return this.siblingsOf(row).findIndex(item => item.id === row.id)
    },
    // 首/尾或锁定（regular=0）都不可移动
    isFirstSibling(row) {
      return this.isLocked(row) || this.siblingIndex(row) <= 0
    },
    isLastSibling(row) {
      const list = this.siblingsOf(row)
      return this.isLocked(row) || this.siblingIndex(row) >= list.length - 1
    },
    findNode(list, id) {
      for (let i = 0; i < (list || []).length; i += 1) {
        const node = list[i]
        if (node.id === Number(id)) return node
        const hit = this.findNode(node.children, id)
        if (hit) return hit
      }
      return null
    },
    async handleMove(row, direction) {
      if (this.isLocked(row)) {
        this.$message.warning('该菜单已锁定，不可移动')
        return
      }
      // 接口约定 direction 为 UP / DOWN
      const res = await moveMenu({ id: row.id, direction: String(direction).toUpperCase() })
      if (!this.isOk(res)) {
        this.$message.error((res && res.msg) || '排序失败')
        return
      }
      this.$message.success('排序成功')
      this.fetchList()
    },
    // 打开抽屉：表单细节（详情回填 / 自动编码 / 校验）都在 MenuFormDrawer 内处理
    handleAddTop() {
      this.drawerMode = 'add'
      this.editingRow = null
      this.drawerPid = 0
      this.drawerVisible = true
    },
    handleAddChild(row) {
      this.drawerMode = 'addChild'
      this.editingRow = null
      this.drawerPid = row.id
      this.drawerVisible = true
    },
    handleEdit(row) {
      this.drawerMode = 'edit'
      this.editingRow = row
      this.drawerPid = 0
      this.drawerVisible = true
    },
    handleDelete(row) {
      // 接口语义：删除节点时其全部子节点一并删除
      const childCount = this.countTree(row.children)
      const that = this
      const tip = childCount > 0 ? `，其下 ${childCount} 个子节点也将一并删除` : ''
      this.$confirm(`确认删除菜单「${row.name}」吗？${tip}`, '提示', {
        type: 'warning',
        confirmButtonText: '确定',
        cancelButtonText: '取消'
      })
        .then(() => that.doDelete(row))
        .catch(() => {})
    },
    async doDelete(row) {
      const res = await deleteMenu(row.id)
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

</style>

