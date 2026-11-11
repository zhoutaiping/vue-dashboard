import router from './router'
import store from './store'
import { Message } from 'element-ui'
import NProgress from 'nprogress' // progress bar
import 'nprogress/nprogress.css' // progress bar style
import { getToken } from '@/utils/auth' // get token from cookie
import getPageTitle from '@/utils/get-page-title'
import tracker from '@/utils/tracker'
import { resolveTrackerMenuFields } from '@/utils/menu-tracker'

NProgress.configure({ showSpinner: false }) // NProgress Configuration

const whiteList = ['/login', '/auth-redirect'] // no redirect whitelist

router.beforeEach(async(to, from, next) => {
  // start progress bar
  NProgress.start()

  // set page title
  document.title = getPageTitle(to.meta.title)

  // determine whether the user has logged in
  const hasToken = getToken()

  if (hasToken) {
    if (to.path === '/login') {
      // if is logged in, redirect to the home page
      next({ path: '/' })
      NProgress.done() // hack: https://github.com/PanJiaChen/vue-element-admin/pull/2939
    } else {
      // determine whether the user has obtained his permission roles through getInfo
      const hasRoles = store.getters.roles && store.getters.roles.length > 0
      if (hasRoles) {
        next()
      } else {
        try {
          // get user info
          // note: roles must be a object array! such as: ['admin'] or ,['developer','editor']
          const { roles } = await store.dispatch('user/getInfo')

          // 登录加载页面时请求当前人员菜单权限接口并存入 store
          // 取数失败不阻断登录：本阶段仍使用静态路由，避免接口异常导致白屏
          try {
            await store.dispatch('menu/fetchCurrentMenu')
          } catch (error) {
            console.warn('[menu] 当前菜单加载失败，保留静态路由', error)
          }

          // generate accessible routes map based on roles
          const accessRoutes = await store.dispatch('permission/generateRoutes', roles)

          // dynamically add accessible routes
          router.addRoutes(accessRoutes)

          // hack method to ensure that addRoutes is complete
          // set the replace: true, so the navigation will not leave a history record
          next({ ...to, replace: true })
        } catch (error) {
          // remove token and go to login page to re-login
          await store.dispatch('user/resetToken')
          Message.error(error || 'Has Error')
          next(`/login?redirect=${to.path}`)
          NProgress.done()
        }
      }
    }
  } else {
    /* has no token*/

    if (whiteList.indexOf(to.path) !== -1) {
      // in the free login whitelist, go directly
      next()
    } else {
      // other pages that do not have permission to access are redirected to the login page.
      next(`/login?redirect=${to.path}`)
      NProgress.done()
    }
  }
})

// 路由守卫埋点：仅 meta.tracker 为 true 的页面上报「进入」
// addRoutes 后 next({ ...to, replace: true }) 会让 afterEach 再走一次，做短时去重
let lastTracked = null
router.afterEach(to => {
  // finish progress bar
  NProgress.done()
  if (!to.meta || !to.meta.tracker) return
  const key = to.fullPath || to.path
  const now = Date.now()
  if (lastTracked && lastTracked.key === key && now - lastTracked.time < 500) return
  lastTracked = { key: key, time: now }
  // 页面标题、一级 / 二级菜单名称统一优先取登录时格式化后的接口菜单数据，未命中才回退静态路由 meta
  const menuFields = resolveTrackerMenuFields(store.getters.currentMenus, to) || {
    firstLevelMenu: to.meta.firstLevelMenu || '',
    secondLevelMenu: to.meta.title || to.name || ''
  }
  const title = menuFields.secondLevelMenu || to.meta.title || to.name || ''
  tracker.sendTracker({
    actionDescription: `进入${title}`,
    actionType: '进入',
    behaviorType: '页面',
    dataSource: 'PC',
    firstLevelMenu: `${menuFields.firstLevelMenu || ''}`,
    projectCode: '',
    requestBody: '',
    screenName: '',
    secondLevelMenu: `${menuFields.secondLevelMenu || ''}`
  })
})
