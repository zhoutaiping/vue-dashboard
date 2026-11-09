<template>
  <!-- 新增 / 编辑抽屉：表单逻辑独立成组件，父页面只负责列表与开合。
       element-ui 的 Drawer 用 wrapper-closable 控制点击遮罩是否关闭，
       close-on-click-modal 是 Dialog 的属性、在 Drawer 上无效，不能用来防止误关 -->
  <el-drawer
    :visible.sync="drawerVisible"
    direction="rtl"
    size="560px"
    :show-close="false"
    :wrapper-closable="false"
    append-to-body
    custom-class="menu-manage-drawer"
  >
    <div slot="title" class="drawer-header">
      <span class="drawer-header__title">{{ dialogTitle }}</span>
      <span class="drawer-header__actions">
        <el-button size="mini" type="primary" :loading="saving" @click="handleSubmit">保存</el-button>
        <el-button size="mini" @click="drawerVisible = false">取消</el-button>
      </span>
    </div>

    <el-form
      ref="form"
      :model="form"
      :rules="formRules"
      label-position="top"
      size="small"
      class="drawer-form"
    >
      <el-row :gutter="16">
        <!-- 菜单类型：目录 / 页面菜单（均提交 menu）、按钮（button） -->
        <el-col :span="12">
          <el-form-item label="菜单类型" prop="meantype">
            <el-select v-model="form.meantype" placeholder="请选择" style="width: 100%">
              <el-option label="目录" value="directory" />
              <el-option label="菜单" value="menu" />
              <el-option label="按钮" value="button" />
            </el-select>
          </el-form-item>
        </el-col>

        <!-- 权限编码：新增时由 generate-code 自动生成，editable 为 false 时只读 -->
        <el-col :span="12">
          <el-form-item label="权限编码" prop="code">
            <el-input
              v-model="form.code"
              :disabled="!codeEditable"
              maxlength="30"
              placeholder="自动生成"
            />
          </el-form-item>
        </el-col>

        <!-- 上级菜单：下拉树，数据来自 tree 接口 -->
        <el-col :span="12">
          <el-form-item label="上级菜单" prop="pid">
            <el-cascader
              v-model="form.pid"
              :options="cascaderOptions"
              :props="cascaderProps"
              :show-all-levels="false"
              placeholder="请选择"
              style="width: 100%"
            />
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item :label="isButtonType ? '按钮名称' : '菜单名称'" prop="name">
            <el-input v-model="form.name" maxlength="10" placeholder="请输入（10字以内）" />
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="前端菜单编码" prop="menuCode">
            <el-input v-model="form.menuCode" maxlength="80" placeholder="按钮类型可不填" />
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="权限描述">
            <el-input v-model="form.description" maxlength="50" placeholder="请输入" />
          </el-form-item>
        </el-col>

        <el-col v-if="!isButtonType" :span="12">
          <el-form-item label="菜单图标">
            <!-- 下拉展示 svg 图标 + 名称，选中后输入框只显示图标名（:label） -->
            <el-select
              v-model="form.icon"
              filterable
              clearable
              placeholder="请选择图标"
              style="width: 100%"
            >
              <el-option
                v-for="name in iconOptions"
                :key="name"
                :label="name"
                :value="name"
              >
                <span class="menu-icon-option">
                  <Icon v-if="iconExists(name)" :name="name" class="menu-icon-option__svg" />
                  <i v-else :class="legacyIconClass(name)" class="menu-icon-option__legacy" />
                  <span class="menu-icon-option__name">{{ name }}</span>
                </span>
              </el-option>
            </el-select>
          </el-form-item>
        </el-col>

        <el-col v-if="!isButtonType" :span="12">
          <el-form-item label="显示排序">
            <el-input-number v-model="form.orderNum" :min="1" :max="9999" :controls="false" style="width: 100%" />
          </el-form-item>
        </el-col>

        <el-col v-if="!isButtonType" :span="24">
          <el-form-item label="路由地址">
            <el-input v-model="form.url" maxlength="200" placeholder="如 views/GanSu/Home/index.vue" />
          </el-form-item>
        </el-col>

        <!-- 仅目录 / 页面菜单：sidebarShow 是否在左侧栏显示（0 显示，1 不显示） -->
        <el-col v-if="!isButtonType" :span="12">
          <el-form-item label="是否显示" prop="sidebarShow">
            <el-select v-model="form.sidebarShow" placeholder="请选择" style="width: 100%">
              <el-option label="显示" :value="0" />
              <el-option label="不显示" :value="1" />
            </el-select>
          </el-form-item>
        </el-col>

        <!-- 仅目录 / 页面菜单：cacheFlag 是否缓存（0 缓存，1 不缓存） -->
        <el-col v-if="!isButtonType" :span="12">
          <el-form-item label="是否缓存" prop="cacheFlag">
            <el-select v-model="form.cacheFlag" placeholder="请选择" style="width: 100%">
              <el-option label="缓存" :value="0" />
              <el-option label="不缓存" :value="1" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
  </el-drawer>
</template>

<script>
import { getMenuInfo, saveMenu, updateMenu, generateMenuCode } from '@/api/menuManage'
import { menuIconNames, iconExists as hasIcon, legacyIconClass as legacyIcon } from '@/icons/menuIcons'

// 上级菜单“根目录”的哨兵值：element-ui 的 cascader 把 0 当作空值，无法回显
const ROOT_PID = -1

export default {
  name: 'MenuFormDrawer',
  props: {
    // 开合状态（.sync）
    visible: { type: Boolean, default: false },
    // add 新增顶级 / addChild 新增下级 / edit 编辑
    mode: { type: String, default: 'add' },
    // 编辑时的行数据（列表行即可，详情接口会在打开后回填）
    row: { type: Object, default: null },
    // 新增时的上级菜单 id（0 = 顶级）
    pid: { type: Number, default: 0 },
    // 菜单树（用于上级菜单下拉与层级计算），由父页面传入
    tree: { type: Array, default: () => [] }
  },
  data() {
    return {
      saving: false,
      form: this.emptyForm(),
      // 权限编码是否可编辑（取 generate-code 的 editable）
      codeEditable: true,
      // 编码请求序号：只采用最后一次响应，避免快速切换类型时的竞态
      codeSeq: 0,
      // 上一次生成编码的参数指纹：相同参数不重复请求（避免一次打开触发多次 generate-code）
      lastCodeKey: '',
      // 上级菜单级联选择：任意层级可选，v-model 直接存节点值
      // 使用 cascader 默认字段（value / label / children），与 cascaderOptions 保持一致
      cascaderProps: {
        checkStrictly: true,
        emitPath: false
      }
    }
  },
  computed: {
    drawerVisible: {
      get() {
        return this.visible
      },
      set(val) {
        this.$emit('update:visible', val)
      }
    },
    dialogTitle() {
      return this.mode === 'edit' ? '编辑' : '新增'
    },
    // 按钮类型：字段更少，标签切换成“按钮名称”
    isButtonType() {
      return this.menutypeOf(this.form) === 'button'
    },
    // 图标下拉选项来自 src/icons 下的 svg 文件；历史数据的旧值也补一项以便编辑回显
    iconOptions() {
      const list = menuIconNames.slice()
      if (this.form.icon && list.indexOf(this.form.icon) === -1) list.unshift(this.form.icon)
      return list
    },
    // 编辑时禁止把上级选到自己或自己的后代，避免形成环
    editingExcludedIds() {
      if (this.mode !== 'edit' || !this.row) return []
      const ids = []
      const collect = node => {
        ids.push(node.id)
        ;(node.children || []).forEach(collect)
      }
      const node = this.findNode(this.tree, this.row.id)
      if (node) collect(node)
      return ids
    },
    // 上级菜单树：根目录与一级菜单平铺在同一列，下级再依次向右展开
    cascaderOptions() {
      const exclude = this.editingExcludedIds
      const map = list => (list || [])
        .filter(node => exclude.indexOf(node.id) === -1)
        .map(node => {
          const children = map(node.children)
          const option = { value: node.id, label: node.name }
          if (children.length) option.children = children
          return option
        })
      return [{ value: ROOT_PID, label: '根目录' }, ...map(this.tree)]
    },
    // 校验规则：code / name / meantype 必填；目录与菜单还要求选择显示、缓存标志
    formRules() {
      const isBtn = this.isButtonType
      const rules = {
        meantype: [{ required: true, message: '请选择菜单类型', trigger: 'change' }],
        code: [{ required: true, message: isBtn ? '请输入按钮编码' : '请输入权限编码', trigger: 'blur' }],
        name: [{ required: true, message: isBtn ? '请输入按钮名称' : '请输入菜单名称', trigger: 'blur' }]
      }
      if (!isBtn) {
        rules.sidebarShow = [{ required: true, message: '请选择是否显示', trigger: 'change' }]
        rules.cacheFlag = [{ required: true, message: '请选择是否缓存', trigger: 'change' }]
      }
      return rules
    }
  },
  watch: {
    // 每次打开都重新初始化表单（详情回填 / 默认值 + 自动编码）
    visible(val) {
      if (val) this.init()
    },
    // 切换菜单类型会改变可见字段与校验规则，新增时还要重新生成权限编码
    'form.meantype'() {
      this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate())
      this.refreshCode()
    },
    // 上级菜单变化会影响层级与编码前缀
    'form.pid'() {
      this.refreshCode()
    }
  },
  methods: {
    iconExists(name) {
      return hasIcon(name)
    },
    // 历史 iconfont 值不是 svg symbol，下拉里用近似的 Element 图标兜底
    legacyIconClass(name) {
      return legacyIcon(name)
    },
    emptyForm() {
      return {
        id: '',
        pid: ROOT_PID,
        parentCode: '0',
        code: '',
        name: '',
        menuCode: '',
        description: '',
        // 展示值：directory 目录 / menu 菜单 / button 按钮，提交时统一映射为 menu|button
        meantype: 'directory',
        icon: '',
        url: '',
        level0: 1,
        orderNum: 99,
        // 接口 int32：sidebarShow 0 显示 / 1 不显示，cacheFlag 0 缓存 / 1 不缓存
        // 新增留空，强制用户选择；按钮类型不提交这两个字段
        sidebarShow: '',
        cacheFlag: '',
        regular: 1
      }
    },
    // 标志位兼容后端返回 0/1 数字或字符串；缺省返回 fallback（新增为 '' 强制选择，编辑为 0）
    flagOf(value, fallback) {
      if (value === 0 || value === 1 || value === '0' || value === '1') return Number(value)
      return fallback === undefined ? '' : fallback
    },
    // 真实接口字段是 meantype（文档/报错文案误写成 menutype），这里兼容两种写法
    menutypeOf(row) {
      return (row && (row.meantype || row.menutype)) || 'menu'
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
    // 后端成功码：0（本项目约定）/ 200（历史接口）
    isOk(res) {
      return !!res && (res.code === 0 || res.code === 200)
    },
    // 菜单层级：一级目录为 1，其余按父节点 +1（与后端 level0 计算口径一致）
    levelOf(pid) {
      if (!Number(pid)) return 1
      const node = this.findNode(this.tree, pid)
      return node ? Number(node.level0 || node.level || 1) + 1 : 1
    },
    // 打开抽屉时初始化：编辑走详情回填，新增落默认值并自动生成编码
    async init() {
      this.codeEditable = true
      this.codeSeq += 1 // 使上一轮未完成的编码请求失效
      this.lastCodeKey = '' // 每次打开都重新生成一次编码

      if (this.mode === 'edit' && this.row) {
        const row = this.row
        // 先用列表数据占位，再用详情接口回填，避免抽屉出现空白闪烁
        this.form = Object.assign(this.emptyForm(), {
          id: row.id,
          pid: Number(row.pid) || ROOT_PID,
          code: row.code || '',
          name: row.name || '',
          menuCode: row.menuCode || '',
          description: row.description || '',
          meantype: this.menutypeOf(row) === 'button' ? 'button' : ((row.children || []).length ? 'directory' : 'menu'),
          icon: row.icon || '',
          url: row.url || '',
          level0: Number(row.level0) || 1,
          orderNum: Number(row.orderNum) || 1,
          sidebarShow: this.flagOf(row.sidebarShow, 0),
          cacheFlag: this.flagOf(row.cacheFlag, 0)
        })
        this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate())

        // GET /system/menu/info?id= 以服务端详情为准
        const res = await getMenuInfo(row.id)
        if (!this.isOk(res) || !res.data) {
          this.$message.error((res && res.msg) || '菜单详情加载失败')
          this.drawerVisible = false
          return
        }
        const detail = res.data
        this.form = Object.assign(this.emptyForm(), {
          id: detail.id,
          pid: Number(detail.pid) || ROOT_PID,
          parentCode: detail.parentCode || '0',
          code: detail.code || '',
          name: detail.name || '',
          menuCode: detail.menuCode || '',
          description: detail.description || '',
          meantype: this.menutypeOf(detail) === 'button' ? 'button' : ((detail.children || []).length ? 'directory' : 'menu'),
          icon: detail.icon || '',
          url: detail.url || '',
          level0: Number(detail.level0) || 1,
          orderNum: Number(detail.orderNum) || 1,
          // 详情接口为准：0/1 都要正确回显（0 不能被 || 吞掉）
          sidebarShow: this.flagOf(detail.sidebarShow, 0),
          cacheFlag: this.flagOf(detail.cacheFlag, 0),
          regular: Number(detail.regular) === 0 ? 0 : 1
        })
        this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate())
        return
      }

      // 新增（顶级 / 下级）：先落默认值，权限编码由 generate-code 生成
      this.form = Object.assign(this.emptyForm(), { pid: Number(this.pid) || ROOT_PID })
      this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate())
      this.refreshCode()
    },
    /**
     * 新增时自动生成权限编码：POST /system/menu/generate-code
     * body 只有文档里的 4 个字段：{ pid, level0, meantype, codePrefix? }
     * 上级菜单 + 菜单类型变化都会重新取一次建议值（相同参数不重复请求）
     */
    async refreshCode() {
      if (this.mode === 'edit') return
      const pid = this.form.pid === ROOT_PID ? 0 : Number(this.form.pid) || 0
      const meantype = this.menutypeOf(this.form) === 'button' ? 'button' : 'menu'
      const key = `${pid}|${meantype}`
      if (key === this.lastCodeKey) return
      this.lastCodeKey = key

      this.codeSeq += 1
      const seq = this.codeSeq
      const res = await generateMenuCode({
        pid,
        level0: this.levelOf(pid),
        meantype
      })
      // 只采纳最后一次请求的结果
      if (seq !== this.codeSeq) return
      if (!this.isOk(res)) {
        // 生成失败时保留手工填写能力，并提示后端返回的原因
        this.codeEditable = true
        this.$message.warning((res && res.msg) || '权限编码生成失败，请手动填写')
        return
      }
      if (!res.data) return
      this.form.code = res.data.code
      this.form.level0 = Number(res.data.level0) || this.form.level0
      this.codeEditable = res.data.editable !== false
    },
    handleSubmit() {
      this.$refs.form.validate(async valid => {
        if (!valid) return
        this.saving = true
        const pid = this.form.pid === ROOT_PID ? 0 : Number(this.form.pid) || 0
        // 目录/页面菜单都提交 menu，按钮提交 button；该字段必填，永远不给空值
        const meantype = this.menutypeOf(this.form) === 'button' ? 'button' : 'menu'
        // 严格按文档的 MenuSaveDTO 提交：parentCode / level0 由后端自动维护与计算，这里不再重复传
        const payload = {
          code: String(this.form.code || '').trim(),
          description: this.form.description || '',
          icon: this.isButtonType ? '' : this.form.icon || '',
          meantype,
          menuCode: this.form.menuCode || '',
          name: String(this.form.name || '').trim(),
          orderNum: Number(this.form.orderNum) || 1,
          pid,
          url: this.isButtonType ? '' : this.form.url || ''
        }
        // 目录 / 页面菜单才提交这两个 int32 标志位；按钮类型不需要
        if (!this.isButtonType) {
          payload.sidebarShow = Number(this.form.sidebarShow)
          payload.cacheFlag = Number(this.form.cacheFlag)
        }
        const isEdit = this.mode === 'edit'
        const res = isEdit ? await updateMenu(this.form.id, payload) : await saveMenu(payload)
        this.saving = false
        if (!this.isOk(res)) {
          this.$message.error((res && res.msg) || '保存失败')
          return
        }
        this.drawerVisible = false
        this.$message.success(isEdit ? '修改成功' : '新增成功')
        this.$emit('saved')
      })
    }
  }
}
</script>

<!-- 抽屉 append-to-body 后脱离组件作用域，样式放在非 scoped 块中 -->
<style lang="scss">
.menu-manage-drawer {
  .el-drawer__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0;
    padding: 14px 20px;
    border-bottom: 1px solid #ebeef5;
    color: #303133;
  }

  .el-drawer__body {
    padding: 20px;
    overflow-y: auto;
  }

  .drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;

    &__title {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }

    &__actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }

  // 标签置于控件上方（与截图一致）
  .drawer-form .el-form-item {
    margin-bottom: 18px;
  }

  .drawer-form .el-form-item__label {
    padding-bottom: 4px;
    line-height: 20px;
    color: #606266;
  }
}

/* 图标下拉选项：面板 append-to-body，样式放全局 */
.menu-icon-option {
  display: flex;
  align-items: center;
  gap: 8px;

  &__svg {
    width: 16px;
    height: 16px;
    flex: 0 0 16px;
    color: #0088ff;
  }

  &__legacy {
    width: 16px;
    height: 16px;
    flex: 0 0 16px;
    font-size: 16px;
    line-height: 1;
    color: #0088ff;
  }

  &__name {
    color: #606266;
  }
}
</style>
