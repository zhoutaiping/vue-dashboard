import router from './router'
import { getToken, getAccessToken } from '@/util/auth'
import tracker from '@/util/tracker'
import * as authUtils from '@/util/auth'
import { getButtonPermissions, setButtonPermissions } from '@/util/publicData'
import {
  getUserInfo,
  newToLogin,
  paymentRequest_getUserInfo,
  checkHomePage
} from '@/api/login'
import { getUserFunctions } from '@/api/manage/roleFunc'
import Notify from '@/plugins/notify'
import store from '@/store'
import { resolveTrackerMenuFields } from '@/util/menu-tracker'

function canTo(to, from, next) {
  next && next()
  if (!to.query && to.path === from.path) {
    location.reload()
  }
}

const noteMsg = {
  noPermission: '您当前没有任何权限，请联系管理员～',
  noPermissionOrToken: '您当前没有任何权限或者token已失效, 请重新登陆~',
  noToken: 'token失效,请重新登陆~'
}

function jumpTo(msg = noteMsg.noPermission, path) {
  Notify.init(msg, {}, function() {
    if (path) {
      window.location.href = `/login?full_path=${path}`
      return
    }
    window.top.location.href = 'login'
  })
}
// 导航守卫里 replace 重定向 / 登录并发 push 会产生这类竞争错误，都是无害的
function isIgnorableNavError(error) {
  if (!error) return false
  return ['NavigationCancelled', 'NavigationDuplicated', 'NavigationRedundant', 'NavigationRedirected'].indexOf(error.name) > -1
}

function createDone(next) {
  let called = false
  return (...args) => {
    if (called) return
    called = true
    try {
      const result = next(...args)
      if (result && typeof result.catch === 'function') {
        result.catch(error => {
          if (isIgnorableNavError(error)) return
          console.error(error)
        })
      }
      return result
    } catch (error) {
      if (isIgnorableNavError(error)) return
      throw error
    }
  }
}

// 这类竞争错误走全局 unhandledrejection，无法在 next() 返回值上 catch
window.addEventListener('unhandledrejection', event => {
  if (isIgnorableNavError(event && event.reason)) event.preventDefault()
})

if (localStorage.getItem('reloadCount') == null) {
  localStorage.setItem('reloadCount', 0)
}

function intervalPermission() {
  let reloadCount = 0
  const delayReload = setInterval(() => {
    reloadCount++
    if (reloadCount > 20) {
      clearInterval(delayReload)
    }
    const buttonPermissions = localStorage.getItem('buttonPermissions')
    if (buttonPermissions && JSON.parse(buttonPermissions).length) {
      location.reload()
      clearInterval(delayReload)
    }
  }, 1000)
}
// 菜单 cacheFlag → 路由 meta.cache：$route.meta 来自路由记录，只改菜单数据不会反映到 $route
function normalizeCacheKey(value) {
  return String(value === undefined || value === null ? '' : value)
    .trim().replace(/[?#].*$/, '').replace(/^\/+/, '').replace(/\/+$/, '').toLowerCase()
}
function lastCacheSegment(value) {
  const parts = normalizeCacheKey(value).split('/')
  return parts[parts.length - 1] || ''
}
function flattenCachePages(menus) {
  const pages = []
  const walk = list => {
    (Array.isArray(list) ? list : []).forEach(node => {
      if (!node) return
      if ((node.meantype || node.menutype) === 'menu' && String(node.menuCode || '').trim()) {
        const meta = node.meta || {}
        pages.push({
          path: normalizeCacheKey(node.menuCode || node.path),
          name: normalizeCacheKey(node.name || meta.title),
          cache: typeof meta.cache === 'boolean' ? meta.cache : Number(node.cacheFlag) === 0
        })
      }
      walk(node.children)
    })
  }
  walk(menus)
  return pages
}
function findCachePage(pages, route) {
  const keys = [
    normalizeCacheKey(route.menuCode || route.path),
    normalizeCacheKey(route.name),
    normalizeCacheKey(route.meta && route.meta.title)
  ].filter((key, index, all) => key && all.indexOf(key) === index)
  for (let i = 0; i < keys.length; i += 1) {
    const hit = pages.find(page => page.path === keys[i] || page.name === keys[i])
    if (hit) return hit
  }
  // 菜单 menuCode 带多级目录、静态路由只有末段时按末段兜底
  for (let i = 0; i < keys.length; i += 1) {
    const segment = lastCacheSegment(keys[i])
    if (!segment) continue
    const hit = pages.find(page => lastCacheSegment(page.path) === segment)
    if (hit) return hit
  }
  return null
}
function syncRouteCacheMeta(routes, menus) {
  const pages = flattenCachePages(menus)
  const walk = list => {
    (Array.isArray(list) ? list : []).forEach(route => {
      if (!route) return
      if (route.meta) {
        const hit = findCachePage(pages, route)
        if (hit) route.meta.cache = hit.cache
      }
      walk(route.children)
    })
  }
  walk(routes)
}

let once = true
router.beforeEach(async(to, from, next) => {
  const done = createDone(next)
  syncRouteCacheMeta(router.options.routes, store.getters.currentMenus)
  // 第一次进入清除pm2所有缓存
  if (once && (to.query.uaaToken || to.query.appToken)) {
    once = false
  }
  /*
    to: 路由即将跳到哪
    from: 从哪个路由出来
    next(): 不破坏路由跳转，按照之前的路由正常跳转
    next('/path'): 破坏原来的跳转，跳到新的路由/——————
  */
  if (to && to.query) {
    if (to.query.account) {
      authUtils.setUserAccount(to.query.account)
    }
    const {
      parent = '',
      paymentRequestId = '',
      id = '',
      version = '',
      nodeName = '',
      taskId = '',
      costname = '',
      status = '',
      type = '',
      cur = '',
      processId = '',
      projectId = '',
      planId = '',
      projectCode = '',
      flag = '',
      mode = '',
      approvalType = '',
      isPageState = '', // 付款状态
      timeQuantum = '',
      jobType = '',
      timeYear = '',
      timeMonth = ''
    } = to.query || {}
    if (paymentRequestId || taskId || costname || parent) {
      localStorage.setItem('parent', parent)
    }
    if (parent !== 'rhzl') {
      localStorage.setItem(
        'approvalKey',
        JSON.stringify({
          id: paymentRequestId || id || '',
          taskId: taskId || '',
          mode: mode || '',
          cur: cur || '',
          version: version || '',
          nodeName: nodeName || '',
          timeQuantum: timeQuantum || undefined,
          costname: costname || '',
          status: status || '',
          isPageState: isPageState || '',
          projectId: projectId || '',
          planId: planId || '',
          type: type || '',
          processId: processId || '',
          projectCode: projectCode || '',
          flag: flag || '',
          approvalType: approvalType || '',
          jobType: jobType || '',
          timeYear: timeYear || '',
          timeMonth: timeMonth || ''
        })
      )
    }
  }

  if (to.query.appToken) {
    authUtils.setAccessToken(to.query.appToken)
  }
  if (to.query.uaaToken) {
    localStorage.setItem('uaalLoginSearch', window.location.search)
    let uaaToken = null
    uaaToken = JSON.parse(JSON.stringify(to.query.uaaToken))
    if (Array.isArray(uaaToken)) uaaToken = uaaToken[uaaToken.length - 1]
    const account = to.query.account
    authUtils.setOldToken(uaaToken)
    authUtils.setToken(uaaToken)
    authUtils.setUserAccount(account)
    localStorage.setItem('version', to.query.version || '')
    localStorage.setItem('uaaToken', uaaToken)
    authUtils.setRefreshToken(uaaToken)
    newToLogin({
      uaaToken: uaaToken,
      account: account
    }).then(
      res => {
        const { msg, message, code, status } = res
        if (Number(status) === 1) {
          tracker.sendTracker({
            actionDescription: '自动登录',
            actionType: '登录',
            behaviorType: '页面',
            dataSource: 'PC',
            firstLevelMenu: '登录页',
            projectCode: '',
            requestBody: '登录成功',
            screenName: '',
            secondLevelMenu: '登录页'
          })
          localStorage.setItem('version', res.data.version)
          localStorage.setItem('uaaToken', res.data.pm2Token)
          localStorage.setItem('pm1Token', res.data.pm1Token)
          localStorage.setItem('pm2Token', res.data.pm2Token)
          localStorage.setItem('carToken', res.data.carToken || '')
          localStorage.setItem('uaaTokenLong', res.data.uaaToken)
          localStorage.setItem('loginName', account)
          authUtils.setOldToken(res.data.pm2Token)
          authUtils.setToken(res.data.pm2Token)
          authUtils.setRefreshToken(res.data.pm2Token)
          authUtils.setUaaTokenLong(res.data.uaaToken)
          getUserInfo().then(
            result => {
              if (result && result.userExtInfo) {
                localStorage.setItem(
                  'url',
                  location.href.replace(
                    location.origin,
                    'http://localhost:8080'
                  )
                )
              }
              if (result.userExtInfo.userId) {
                authUtils.setUserId(result.userExtInfo.userId)
              }
              if (result.userExtInfo.staffType) {
                authUtils.setUserStaffType(result.userExtInfo.staffType)
              }
              if (result && result.userInfo) {
                authUtils.setName(result.userInfo.name)
              }
              getUserFunctions().then(
                async response => {
                  if (store.getters.currentMenus.length === 0) {
                    try {
                      await store.dispatch('menu/fetchCurrentMenu')
                      syncRouteCacheMeta(router.options.routes, store.getters.currentMenus)
                    } catch (error) {
                      console.warn('[menu] 当前菜单加载失败，保留静态路由', error)
                    }
                  }

                  if (response.data && response.data.length) {
                    const auth = response.data
                      .filter(_ => _.isOn !== 0)
                      .map(_ => _.code)
                    localStorage.setItem(
                      'buttonPermissions',
                      JSON.stringify(auth)
                    )

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

                    setButtonPermissions(auth)

                    await paymentRequest_getUserInfo().then(res => {
                      if (res && res.data) {
                        localStorage.setItem(
                          'userinfo',
                          JSON.stringify(res.data)
                        )
                        localStorage.setItem('rolelevel', res.data.rolelevel)
                        localStorage.setItem(
                          'roleList',
                          res.data.roleList || ''
                        )
                        localStorage.setItem(
                          'paymentType',
                          res.data.paymentType
                        )
                      }
                    })

                    let link = await getHomePage()
                    if (to.query.pm1 && to.path !== link) {
                      link = to.path
                    }

                    const goDone = link ? () => {
                      if (link === to.path) return done()
                      done({ path: link })
                    } : done
                    goRouter(to, from, goDone)
                  } else {
                    jumpTo(noteMsg.noPermission)
                  }
                },
                () => {
                  jumpTo(noteMsg.noPermissionOrToken)
                }
              )
            },
            () => {
              jumpTo(noteMsg.noPermissionOrToken)
            }
          )
        } else {
          const _status = Number(status || code)

          if ([501].includes(_status)) {
            window.location.href = `/login?type=unFollowed&code=${status}&full_path=${
              to.query.pm1 ? to.path : null
            }`
            return
          }
          jumpTo(
            `${msg || message} ${transformMsg(_status)}`,
            to.query.pm1 ? to.path : null
          )
        }
      },
      () => {
        jumpTo(noteMsg.noPermissionOrToken)
      }
    )
  } else {
    if (to.name === 'login') {
      done()
    } else {
      // 本次导航是否首次注册了动态路由：注册后当前 to 是用旧路由表解析的，
      // 必须 replace 重定向一次让 vue-router 用新路由表解析，否则要手动点第二次才能进页面
      const hadRoutes = store.state.menu && store.state.menu.routesAdded
      if (store.getters.currentMenus.length === 0) {
        try {
          await store.dispatch('menu/fetchCurrentMenu')
          syncRouteCacheMeta(router.options.routes, store.getters.currentMenus)
        } catch (error) {
          console.warn('[menu] 当前菜单加载失败，保留静态路由', error)
        }
      }
      const addedNow = !hadRoutes && store.state.menu && store.state.menu.routesAdded

      if (
        getButtonPermissions().length === 0 &&
        localStorage.getItem('buttonPermissions')
      ) {
        setButtonPermissions(localStorage.getItem('buttonPermissions'))
      }

      if (addedNow) {
        // 动态路由注册后当前 to 用旧 matcher 解析，直接 next 会落到 404；
        // 用 next(false) 取消当前导航，再在守卫外 replace，避免 vue-router 的 NavigationRedirected 未捕获异常
        done(false)
        router.replace(to.fullPath).catch(() => {})
        return
      }
      goRouter(to, from, done)

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
    }
  }
})

// 全局后置守卫：捕获「进入页面」动作（to 为即将进入的页面）
router.afterEach(to => {})

function transformMsg(status) {
  if ([501, 502].includes(status)) return '，请联系管理员处理!'
  if (status === 510) {
    return '，请扫码关注公众号后登陆! '
  }
  if (status === 511) {
    return '，请重新扫码登陆! '
  }
  if (status === 512) {
    return '，请到公众号完善用户信息! '
  }
  return ''
}

function goRouter(to, from, next) {
  // 正常token 逻辑
  if (getAccessToken() !== null && getToken() !== null) {
    const buttonPermissions = getButtonPermissions()
    if (buttonPermissions && buttonPermissions.length) {
      canTo(to, from, next)
    } else {
      const permissions = localStorage.getItem('buttonPermissions')
      if (permissions && JSON.parse(permissions).length) {
        setButtonPermissions(JSON.parse(permissions))
        canTo(to, from, next)
      } else {
        // 无权限，轮询等待登录接口成功，获取 buttonPermissions
        if (Number(localStorage.getItem('reloadCount')) < 20) {
          localStorage.setItem(
            'reloadCount',
            Number(localStorage.getItem('reloadCount')) + 1
          )
          intervalPermission()
        } else {
          localStorage.setItem('reloadCount', 0)
        }
      }
    }
  } else {
    if (localStorage.getItem('uaaToken')) {
      canTo(to, from, next)
    } else {
      next('/login')
    }
  }
}

async function getHomePage() {
  try {
    const record = await checkHomePage()
    localStorage.setItem('HomePageStatus', `${record.data}` || 0)
    const buttonPermissions = getButtonPermissions() || []

    if (buttonPermissions.includes('RAA4') || localStorage.getItem('roleList').includes('超级管理员')) {
      return '/home/homePage'
    } else if ((Number(record.data) > 0 && buttonPermissions.includes('RAA1')) || localStorage.getItem('roleList').includes('超级管理员')) {
      return '/home/dashboard'
    }

    return '/todos/list'
  } catch (error) {
    localStorage.setItem('HomePageStatus', '0')
    return '/todos/list'
  }
}

router.afterEach(() => {})
