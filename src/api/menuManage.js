import axios from 'axios'
import { getToken } from '@/utils/auth'

/**
 * 菜单管理接口层（路径与《菜单与功能权限管理》接口文档一致）
 * 响应结构：{ code: 0, msg: 'success', data: ... }（兼容 code === 200）
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

function getRequest(url, params) {
  return service.get(url, { params }).then(res => res.data)
}

function postRequest(url, data, params) {
  return service.post(url, data, params ? { params } : undefined).then(res => res.data)
}

/**
 * 菜单管理树形列表
 * GET /system/menu/tree?keyword=
 * data 为树形数组，节点自带 children
 */
export function qryMenuList(params) {
  return getRequest('/system/menu/tree', params || {})
}

/**
 * 查询菜单-按钮详情
 * GET /system/menu/info?id=
 */
export function getMenuInfo(id) {
  return getRequest('/system/menu/info', { id })
}

/**
 * 新增：目录、菜单、按钮
 * POST /system/menu/save
 */
export function saveMenu(data) {
  return postRequest('/system/menu/save', data)
}

/**
 * 编辑：目录、菜单、按钮（id 走 query，其余字段走 body）
 * POST /system/menu/update?id=
 */
export function updateMenu(id, data) {
  return postRequest('/system/menu/update', data, { id })
}

/**
 * 删除当前节点及其全部子节点（逻辑删除）
 * POST /system/menu/delete
 */
export function deleteMenu(id) {
  return postRequest('/system/menu/delete', { id })
}

/**
 * 同层级菜单上移 / 下移：direction = UP | DOWN
 * POST /system/menu/move
 */
export function moveMenu(data) {
  return postRequest('/system/menu/move', data)
}

/**
 * 生成菜单权限编码建议
 * POST /system/menu/generate-code
 * body: { codePrefix?, level0, menutype, pid }
 */
export function generateMenuCode(data) {
  return postRequest('/system/menu/generate-code', data)
}
