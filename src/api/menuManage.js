import axios from 'axios'
import { getToken } from '@/utils/auth'

/**
 * 菜单管理接口层
 * 响应结构与后端一致：{ code: 0, msg: 'success', data: ... }（兼容 code === 200）
 */
const service = axios.create({
  baseURL: process.env.VUE_APP_BASE_API,
  timeout: 10000
})

service.interceptors.request.use(config => {
  const token = getToken()
  if (token) {
    config.headers['X-Token'] = token
  }
  return config
})

function postRequest(url, data) {
  return service.post(url, data).then(res => res.data)
}

// 菜单树列表：data 为数组，父级带 childList
export function qryMenuList(data) {
  return postRequest('/menu/qryMenuList', data)
}

// 保存菜单：menuId 为空 = 新增，否则编辑
export function saveMenu(data) {
  return postRequest('/menu/saveMenu', data)
}

// 删除菜单
export function deleteMenu(data) {
  return postRequest('/menu/deleteMenu', data)
}

// 同级排序：direction = up / down
export function sortMenu(data) {
  return postRequest('/menu/sortMenu', data)
}
