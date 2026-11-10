import axios from 'axios'
import { getToken } from '@/utils/auth'

// 公共服务请求封装，对齐目标项目 src/util/fetch.js 的 post/put/get 调用方式。
// 不复用业务 @/utils/request：那个实例的响应拦截器强制 code === 20000 且会弹 Message，
// 埋点等「失败也不该影响业务」的请求必须走独立实例。
const service = axios.create({
  baseURL: process.env.VUE_APP_BASE_API, // url = base url + request url
  timeout: 10000
})

service.interceptors.request.use(config => {
  const token = getToken()
  if (token) config.headers['X-Token'] = token
  return config
})

// 统一发起请求；返回的 Promise 上挂 cancel()，业务侧可按需取消
function request(req) {
  const { url, method, data, params, config, responseType, responseWithHeaders } = req
  const source = axios.CancelToken.source()
  const axiosConfig = Object.assign({
    url,
    method,
    data,
    params,
    cancelToken: source.token
  }, config || {})

  if (responseType) axiosConfig.responseType = responseType

  const requestPromise = service.request(axiosConfig).then(
    res => (responseWithHeaders ? res : res.data),
    err => Promise.reject(err)
  )
  requestPromise.cancel = message => source.cancel(message || '主动取消请求')
  return requestPromise
}

export default {
  /**
   * POST 请求
   * @param {string} url 请求地址
   * @param {Object} data 请求体
   * @param {Object} params URL 参数
   * @param {Object} config axios 配置（headers 等）
   * @param {string|null} responseType 响应类型
   * @param {boolean} responseWithHeaders 是否返回完整 response（含 headers）
   * @returns {Promise} 附带 cancel() 的请求 Promise
   */
  post(url, data, params, config, responseType = null, responseWithHeaders = false) {
    return request({ url, method: 'POST', data, params, config, responseType, responseWithHeaders })
  },
  put(url, data, params, config) {
    return request({ url, method: 'PUT', data, params, config })
  },
  get(url, params, config) {
    return request({ url, method: 'GET', params, config })
  },
  del(url, params, config) {
    return request({ url, method: 'DELETE', params, config })
  }
}

export { request }
