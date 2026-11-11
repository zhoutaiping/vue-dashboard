const Mock = require('mockjs')
const { param2Obj } = require('./utils')

const user = require('./user')
const role = require('./role')
const article = require('./article')
const search = require('./remote-search')
const homeOverview = require('./homeOverview')
const menuManage = require('./menuManage')
const tracker = require('./tracker')

const mocks = [
  ...user,
  ...role,
  ...article,
  ...search,
  ...homeOverview,
  ...menuManage,
  ...tracker
]

// for front mock
// please use it cautiously, it will redefine XMLHttpRequest,
// which will cause many of your third-party libraries to be invalidated(like progress event).
function mockXHR() {
  // mock patch
  // https://github.com/nuysoft/Mock/issues/300
  Mock.XHR.prototype.proxy_send = Mock.XHR.prototype.send
  Mock.XHR.prototype.send = function() {
    if (this.custom.xhr) {
      this.custom.xhr.withCredentials = this.withCredentials || false

      if (this.responseType) {
        this.custom.xhr.responseType = this.responseType
      }
    }
    this.proxy_send(...arguments)
  }

  function XHR2ExpressReqWrap(respond, raw) {
    return function(options) {
      let result = null
      if (respond instanceof Function) {
        const { body, type, url } = options
        // https://expressjs.com/en/4x/api.html#req
        result = respond({
          method: type,
          body: body ? JSON.parse(body) : {},
          query: param2Obj(url)
        })
      } else {
        result = respond
      }
      // raw 为 true 时原样返回，避免真实 DTO 中的 @/view/... 被 Mock.js 当模板解析
      return raw ? result : Mock.mock(result)
    }
  }

  for (const i of mocks) {
    Mock.mock(new RegExp(i.url), i.type || 'get', XHR2ExpressReqWrap(i.response, i.raw))
  }
}

module.exports = {
  mocks,
  mockXHR
}
