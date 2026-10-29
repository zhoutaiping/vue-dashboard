/**
 * 金额展示：整数部分加千分位，小数部分原样保留（不四舍五入、不补位、不加千分位）。
 * 只处理纯数字（含负号与小数）的数值或数字字符串；空值、带单位、科学计数法等原样返回，
 * 由调用方决定占位显示（如 MetricList 的 '--'、tooltip 的 '-'）。
 * 收入、电价等金额类指标统一走这里，保证指标卡与图表 tooltip 口径一致。
 */
export function formatAmount(value) {
  if (value === null || value === undefined || value === '') return value
  const matched = /^(-?)(\d+)(\.\d+)?$/.exec(String(value).trim())
  if (!matched) return value
  return `${matched[1]}${matched[2].replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${matched[3] || ''}`
}
