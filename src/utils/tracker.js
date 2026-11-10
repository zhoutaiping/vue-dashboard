import fetch from './fetch'
import constants from './trackerConstant.json'

// 日志埋点公共文件，对齐目标项目 src/util/tracker.js
// trackerConstant.json 中只放接口地址与数据源；行为枚举（actionType / behaviorType 等）
// 由调用方按业务传入，便于各页面自定义。

function currentAccount() {
  try {
    return localStorage.getItem('userAccount') || ''
  } catch (e) {
    return ''
  }
}

class Tracker {
  constructor() {
    this.defaultParams = {
      page: 1,
      pageSize: 20,
      dataSource: constants.dataSource || 'PC',
      userAccount: currentAccount(),
      projectCode: '',
      requestBody: '',
      screenName: '',
      actionDescription: '',
      firstLevelMenu: '',
      secondLevelMenu: '',
      actionType: ''
    }
  }

  // 项目行为埋点
  sendTracker(params) {
    return this.sendTo(constants.behaviorBatchUrl, params)
  }

  // 用户行为埋点（独立接口）
  send(params) {
    return this.sendTo(constants.userBehaviorBatchUrl, params)
  }

  // 异步发送但不阻塞业务：返回 Promise 供业务侧按需 await，失败静默降级
  sendTo(url, params) {
    // userAccount 每次取实时值，避免先构造实例、后登录导致账号一直是空
    const payload = Object.assign({}, this.defaultParams, params || {}, {
      userAccount: currentAccount() || this.defaultParams.userAccount
    })
    const sendPromise = async() => {
      try {
        const response = await fetch.post(url, payload)
        if (process.env.NODE_ENV === 'development') {
          console.log('[埋点成功]', payload.actionDescription, response)
        }
        return response
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('[埋点失败]', payload.actionDescription, (error && error.message) || error)
        }
        return null
      }
    }
    return sendPromise()
  }
}

export default new Tracker()
export { Tracker }
