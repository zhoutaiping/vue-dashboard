<template>
  <div class="menu-manage">
    <!-- 工具栏：搜索 / 新增 / 全部展开收起 / 数据修复 -->
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
        <!-- 一次性数据修复：仅点击按钮才触发，进入页面不执行 -->
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

    <!-- 树形菜单表格：row-key=id + tree-props children 构成层级，展开箭头在第一列
         刻意不用 fixed 列：element-ui 每多一个固定列就会额外渲染一份完整行 DOM，
         Vue2 + webpack3 老项目在大表格上会慢数倍 -->
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

      <!-- 原生 title 代替 show-overflow-tooltip：大表格少渲染上千个 ElTooltip 组件 -->
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
      // 接口原始树（不随搜索变化），排序/编辑/删除都以它为准
      rawList: [],
      totalCount: 0,
      // 全部展开状态（配合 applyExpandAll 批量同步）
      expandAll: false,
      // 父级总数 / 已展开数：expand-change 用计数增量维护，避免每次都遍历整棵树
      parentCount: 0,
      expandedCount: 0,
      // 批量操作期间屏蔽事件回写
      batchSyncing: false,
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
    // 点击「修复编码」才触发：确认框区分「仅预演」与「执行修复」，关闭则什么都不做
    handleFixMenuCode() {
      // 兜底：即便修复函数本身抛错（迁移后方法缺失 / this 丢失），也给出提示而不是静默
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
          // 用 then 的第二个参数接收取消，把「取消」和「业务异常」分开；
          // 否则 .catch 会把修复过程中的异常当成取消吞掉，表现就是点了没反应、接口一个都不发。
          // distinguishCancelAndClose 下点 X 是 'close'，什么都不做。
          if (action === 'cancel') return this.fixMenuCodeByUrl({ dryRun: true })
        }
      ).catch(onError)
    },
    /**
     * 批量修复 menuCode / url：只处理目录与页面菜单中 url 有值且未修复过的节点
     */
    async fixMenuCodeByUrl(options) {
      let result
      try {
        result = await runMenuCodeFix(options || {})
      } catch (e) {
        // 迁移后接口不通 / 字段不兼容时给出明确提示，避免静默失败
        this.$message.error(`修复失败：${(e && e.message) || '请求异常'}`)
        return null
      }
      const dryRun = !!(options && options.dryRun)
      if (dryRun) console.log('[menuCode 预演]', result.details)
      const prefix = dryRun ? '预演' : '修复'
      const summary = dryRun
        ? `遍历 ${result.total} 个节点，命中 ${result.matched} 条，未提交任何修改`
        : `遍历 ${result.total} 个节点，命中 ${result.matched} 条，已更新 ${result.updated} 条`
      // 把第一条失败原因带出来：tree 成功码 / 数据结构不匹配时，能直接从提示定位
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
    // 后端成功码：0（本项目约定）/ 200（历史接口）
    isOk(res) {
      return !!res && (res.code === 200 || res.code === 0)
    },
    iconExists(name) {
      return hasIcon(name)
    },
    // 历史 iconfont 值：用近似的 Element 图标兜底展示
    legacyIconClass(name) {
      return legacyIcon(name)
    },
    // 真实接口字段是 meantype（文档/报错文案误写成 menutype），这里兼容两种写法
    menutypeOf(row) {
      return (row && (row.meantype || row.menutype)) || 'menu'
    },
    // meantype 只有 menu / button；menu 再按是否有子级区分目录与页面菜单
    meantypeText(row) {
      if (this.menutypeOf(row) === 'button') return '按钮'
      return (row.children || []).length && row.children.some(i => i.meantype === 'menu') ? '目录' : '菜单'
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
    // 首屏展开第一个有子级的目录，避免整页全是折叠行
    expandFirstParent() {
      if (this.expandAll || this.keyword || !this.$refs.table) return
      const first = this.tableData.find(item => (item.children || []).length)
      if (first) this.$refs.table.toggleRowExpansion(first, true)
    },
    // 兼容 row-key 为字符串或函数（老项目里两种都有）
    rowKeyValue(row, rowKey) {
      if (typeof rowKey === 'function') return rowKey(row)
      return row[rowKey || 'id']
    },
    // 收集当前表格里的父级节点：只遍历一次，不用递归函数调用开销
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
    // 数据刷新 / 搜索过滤后重算一次计数（整棵树只扫一次）
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
    /**
     * 批量展开 / 收起
     * 不逐行调 toggleRowExpansion：那会每行触发一次渲染、一次 updateTableScrollY
     * 和一次 expand-change，节点多时接近 O(N^2)，老项目上明显卡顿。
     * element-ui 树表的展开态就是 store.states.treeData[key].expanded，
     * 在同一个同步循环里批量赋值，Vue 只会合并成一次渲染。
     */
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
          // 状态未变的节点不赋值，省掉无意义的响应式通知
          if (node.expanded !== expand) node.expanded = expand
          written += 1
        }
      }
      // 老版本 element-ui 若没有 treeData.expanded，退回官方 API
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
    // 单行展开/收起：O(1) 增量维护，不扫整棵树
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
    // 表格重建 / 数据刷新后恢复展开态：双 nextTick 等新表格挂载完成
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

/* 原生 title 的省略号样式（替代 show-overflow-tooltip） */
.cell-ellipsis {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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

