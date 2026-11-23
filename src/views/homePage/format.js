/** 金额展示：整数加千分位，小数原样保留；非纯数字原样返回，由调用方决定占位 */
export function formatAmount(value) {
  if (value === null || value === undefined || value === '') return value
  const matched = /^(-?)(\d+)(\.\d+)?$/.exec(String(value).trim())
  if (!matched) return value
  return `${matched[1]}${matched[2].replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${matched[3] || ''}`
}
