// 埋点接口 mock：仅用于 dev，避免路由守卫 / 登录埋点请求 404 后刷 console 错误
const success = () => {
  return { code: 200, msg: 'success', data: {}}
}

module.exports = [
  { url: '/pm2/api/projectService/behavior/batch', type: 'post', response: success },
  { url: '/pm2/api/userService/behavior/batch', type: 'post', response: success }
]
