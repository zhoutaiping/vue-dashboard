import { getCurrentMenu } from '@/api/menu'

/**
 * 当前登录人员菜单权限状态。
 * menus 只保存目录 / 页面菜单（按钮节点已在接口层过滤），并带格式化后的 meta。
 * 不参与路由生成与侧栏渲染，后续接入动态菜单时统一从这里取数。
 */
const state = {
  menus: [],
  loaded: false
}

const mutations = {
  SET_MENUS: (state, menus) => {
    state.menus = Array.isArray(menus) ? menus : []
  },
  SET_LOADED: (state, loaded) => {
    state.loaded = !!loaded
  },
  RESET_MENU: state => {
    state.menus = []
    state.loaded = false
  }
}

const actions = {
  // 登录加载页面时由路由守卫调用；已加载则复用缓存，force 用于菜单变更后手动刷新
  // 取数失败直接向上抛异常，由路由守卫统一降级处理，不在 store 里缓存错误
  async fetchCurrentMenu({ commit, state: menuState }, options) {
    const opt = options || {}
    if (menuState.loaded && !opt.force) return menuState.menus
    const menus = await getCurrentMenu()
    commit('SET_MENUS', menus)
    commit('SET_LOADED', true)
    return menuState.menus
  },

  refreshCurrentMenu({ dispatch }) {
    return dispatch('fetchCurrentMenu', { force: true })
  },

  // 退出登录 / token 失效时清空，下次登录重新拉取
  resetCurrentMenu({ commit }) {
    commit('RESET_MENU')
  }
}

export default {
  namespaced: true,
  state,
  mutations,
  actions
}
