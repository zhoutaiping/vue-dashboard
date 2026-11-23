<template>
  <div class="menu-manage">
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
        <el-button
          size="small"
          class="menu-manage__ghost-btn"
          icon="el-icon-edit-outline"
          @click="handleFixMenuCode"
        >
          修复编码
        </el-button>
      </div>
      <span class="menu-manage__count">共 {{ totalCount }} 项</span>
    </div>

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
      @expand-change="syncExpandState"
    >
      <el-table-column
        prop="name"
        label="菜单名称"
        width="220"
        class-name="menu-name-cell"
        label-class-name="menu-name-cell"
      >
        <template slot-scope="{ row }">
          <span class="menu-name" :title="row.name">{{ row.name }}</span>
        </template>
      </el-table-column>

      <el-table-column label="图标" width="70" align="center">
        <template slot-scope="{ row }">
          <Icon v-if="iconExists(row.icon)" :name="row.icon" class="menu-svg-icon" />
          <i v-else-if="row.icon" :class="legacyIconClass(row.icon)" class="menu-icon" />
          <span v-else class="menu-icon--empty">--</span>
        </template>
      </el-table-column>

      <el-table-column prop="code" label="权限编码" min-width="150">
        <template slot-scope="{ row }">
          <span class="cell-ellipsis" :title="row.code">{{ row.code }}</span>
        </template>
      </el-table-column>

      <el-table-column prop="menuCode" label="前端菜单编码" min-width="250">
        <template slot-scope="{ row }">
          <span class="cell-ellipsis" :title="row.menuCode">{{ row.menuCode }}</span>
        </template>
      </el-table-column>

      <el-table-column label="菜单类型" width="90" align="center">
        <template slot-scope="{ row }">
          <el-tag size="mini" effect="plain" :type="meantypeTag(row)">{{ meantypeText(row) }}</el-tag>
        </template>
      </el-table-column>

      <el-table-column label="是否显示" width="90" align="center">
        <template slot-scope="{ row }">
          {{ sidebarShowText(row) }}
        </template>
      </el-table-column>

      <el-table-column label="是否缓存" width="90" align="center">
        <template slot-scope="{ row }">
          {{ cacheFlagText(row) }}
        </template>
      </el-table-column>

      <el-table-column prop="url" label="路由地址（URL）" min-width="280" class-name="menu-url-cell">
        <template slot-scope="{ row }">
          <span class="menu-url">{{ row.url || '--' }}</span>
        </template>
      </el-table-column>

      <el-table-column label="排序操作" width="186" align="center">
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

      <el-table-column label="操作" width="196" align="center">
        <template slot-scope="{ row }">
          <el-button type="text" size="mini" class="link-btn" @click.stop="handleEdit(row)">编辑</el-button>
          <el-button type="text" size="mini" class="link-btn link-btn--add" @click.stop="handleAddChild(row)">新增下级</el-button>
          <el-button type="text" size="mini" class="link-btn link-btn--danger" @click.stop="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

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
import { fixMenuCodeByUrl as runMenuCodeFix } from '@/api/menuDataFix'
import { iconExists as hasIcon, legacyIconClass as legacyIcon } from '@/icons/menuIcons'
import MenuFormDrawer from './components/MenuFormDrawer'

export default {
  name: 'MenuManage',
  components: { MenuFormDrawer },
  data() {
    return {
      loading: false,
      keyword: '',
      rawList: [],
      totalCount: 0,
      expandAll: false,
      parentCount: 0,
      expandedCount: 0,
      batchSyncing: false,
      tableHeight: 560,
      expandedOnce: false,
      drawerVisible: false,
      drawerMode: 'add', // add 新增顶级 / addChild 新增下级 / edit 编辑
      editingRow: null,
      drawerPid: 0
    }
  },
  computed: {
    tableData() {
      return this.filterTree(this.rawList, this.keyword)
    }
  },
  watch: {
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
    handleFixMenuCode() {
      const onError = e => this.$message.error(`修复失败：${(e && e.message) || '请求异常'}`)
      this.$confirm(
        '将遍历菜单树，把目录 / 页面菜单中 url 有值的节点：menuCode 改为原 url 值，url 改为 @/view + 原 url。已修复过的节点会自动跳过。',
        '批量修复 menuCode / url',
        {
          confirmButtonText: '执行修复',
          cancelButtonText: '仅预演',
          distinguishCancelAndClose: true,
          type: 'warning'
        }
      ).then(
        () => this.fixMenuCodeByUrl({ dryRun: false }),
        action => {
          if (action === 'cancel') return this.fixMenuCodeByUrl({ dryRun: true })
        }
      ).catch(onError)
    },
    async fixMenuCodeByUrl(options) {
      let result
      try {
        result = await runMenuCodeFix(options || {})
      } catch (e) {
        this.$message.error(`修复失败：${(e && e.message) || '请求异常'}`)
        return null
      }
      const dryRun = !!(options && options.dryRun)
      if (dryRun) console.log('[menuCode 预演]', result.details)
      const prefix = dryRun ? '预演' : '修复'
      const summary = dryRun
        ? `遍历 ${result.total} 个节点，命中 ${result.matched} 条，未提交任何修改`
        : `遍历 ${result.total} 个节点，命中 ${result.matched} 条，已更新 ${result.updated} 条`
      const reason = result.failures.length
        ? `；失败 ${result.failures.length} 条，首个原因：${result.failures[0].msg}`
        : ''
      if (result.failures.length) {
        this.$message.warning(`${prefix}完成：${summary}${reason}`)
      } else {
        this.$message.success(`${prefix}完成：${summary}`)
      }
      if (!dryRun && result.updated) this.fetchList()
      return result
    },
    isOk(res) {
      return !!res && (res.code === 200 || res.code === 0)
    },
    iconExists(name) {
      return hasIcon(name)
    },
    legacyIconClass(name) {
      return legacyIcon(name)
    },
    menutypeOf(row) {
      return (row && (row.meantype || row.menutype)) || 'menu'
    },
    meantypeText(row) {
      if (this.menutypeOf(row) === 'button') return '按钮'
      return (row.children || []).length && row.children.some(i => i.meantype === 'menu') ? '目录' : '菜单'
    },
    meantypeTag(row) {
      if (this.menutypeOf(row) === 'button') return 'warning'
      return ''
    },
    flagText(row, field, zeroText, oneText) {
      if (this.menutypeOf(row) === 'button') return '--'
      const value = row[field]
      if (value === 0 || value === '0') return zeroText
      if (value === 1 || value === '1') return oneText
      return '--'
    },
    sidebarShowText(row) {
      return this.flagText(row, 'sidebarShow', '显示', '不显示')
    },
    cacheFlagText(row) {
      return this.flagText(row, 'cacheFlag', '缓存', '不缓存')
    },
    isLocked(row) {
      return row.regular === 0 || row.regular === '0'
    },
    updateTableHeight() {
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
        this.updateTableHeight()
        if (!this.expandedOnce) {
          this.expandedOnce = true
          this.expandFirstParent()
        }
        this.restoreExpandState()
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
    expandFirstParent() {
      if (this.expandAll || this.keyword || !this.$refs.table) return
      const first = this.tableData.find(item => (item.children || []).length)
      if (first) this.$refs.table.toggleRowExpansion(first, true)
    },
    rowKeyValue(row, rowKey) {
      if (typeof rowKey === 'function') return rowKey(row)
      return row[rowKey || 'id']
    },
    collectParents() {
      const parents = []
      const stack = (this.tableData || []).slice()
      while (stack.length) {
        const row = stack.pop()
        if (!row) continue
        const children = row.children || []
        if (children.length) parents.push(row)
        for (let i = 0; i < children.length; i += 1) stack.push(children[i])
      }
      return parents
    },
    refreshExpandState() {
      const table = this.$refs.table
      const treeData = (table && table.store && table.store.states && table.store.states.treeData) || {}
      const keys = Object.keys(treeData)
      let parentCount = 0
      let expandedCount = 0
      for (let i = 0; i < keys.length; i += 1) {
        const node = treeData[keys[i]]
        if (node && node.children && node.children.length) {
          parentCount += 1
          if (node.expanded) expandedCount += 1
        }
      }
      this.parentCount = parentCount
      this.expandedCount = expandedCount
      this.expandAll = parentCount > 0 && expandedCount === parentCount
    },
    applyExpandAll() {
      const table = this.$refs.table
      if (!table) return
      const store = table.store
      const states = store && store.states
      const treeData = (states && states.treeData) || {}
      const expand = !!this.expandAll
      const parents = this.collectParents()
      let written = 0

      this.batchSyncing = true
      for (let i = 0; i < parents.length; i += 1) {
        const key = this.rowKeyValue(parents[i], states && states.rowKey)
        const node = treeData[key]
        if (node && 'expanded' in node) {
          if (node.expanded !== expand) node.expanded = expand
          written += 1
        }
      }
      if (written !== parents.length && table.toggleRowExpansion) {
        for (let i = 0; i < parents.length; i += 1) {
          table.toggleRowExpansion(parents[i], expand)
        }
      }
      this.batchSyncing = false

      if (store && store.updateTableScrollY) store.updateTableScrollY()
      this.parentCount = parents.length
      this.expandedCount = expand ? parents.length : 0
    },
    syncExpandState(row, expanded) {
      if (this.batchSyncing) return
      if (typeof expanded !== 'boolean') {
        this.refreshExpandState()
        return
      }
      if (expanded) this.expandedCount += 1
      else this.expandedCount -= 1
      if (this.expandedCount < 0) this.expandedCount = 0
      if (this.expandedCount > this.parentCount) this.expandedCount = this.parentCount
      this.expandAll = this.parentCount > 0 && this.expandedCount === this.parentCount
    },
    restoreExpandState() {
      this.$nextTick(() => {
        this.$nextTick(() => {
          if (this.expandAll) this.applyExpandAll()
          this.refreshExpandState()
        })
      })
    },
    toggleExpandAll() {
      this.expandAll = !this.expandAll
      this.$nextTick(this.applyExpandAll)
    },
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
      const res = await moveMenu({ id: row.id, direction: String(direction).toUpperCase() })
      if (!this.isOk(res)) {
        this.$message.error((res && res.msg) || '排序失败')
        return
      }
      this.$message.success('排序成功')
      this.fetchList()
    },
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

  &__ghost-btn {
    margin-left: 0;
  }

  &__count {
    font-size: 12px;
    color: #909399;
  }
}

$menu-expand-width: 20px;
$menu-expand-gap: 3px;

::v-deep .menu-name-cell .cell {
  display: flex;
  align-items: center;
}

::v-deep .menu-name-cell .el-table__expand-icon,
::v-deep .menu-name-cell .el-table__placeholder {
  margin-right: $menu-expand-gap;
}

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

.menu-svg-icon {
  width: 16px;
  height: 16px;
  color: #0088ff;
  vertical-align: middle;
}

.menu-icon {
  font-size: 16px;
  color: #0088ff;
}

.menu-icon--empty {
  font-size: 16px;
  color: #c0c4cc;
}

.menu-url {
  color: #606266;
  font-size: 12px;
}

.cell-ellipsis {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

::v-deep .menu-url-cell .cell {
  white-space: normal;
  word-break: break-all;
  line-height: 1.5;
}

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

