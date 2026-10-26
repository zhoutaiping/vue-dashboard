# 模板与坑

来源：`src/views/excel/{export-excel,merge-header,select-excel,upload-excel}.vue`、`src/components/UploadExcel/index.vue`。

## 1. 基础导出（带可选项）

```js
import { fetchList } from '@/api/article'
import { parseTime } from '@/utils'

handleDownload() {
  this.downloadLoading = true
  import('@/vendor/Export2Excel').then(excel => {
    const tHeader = ['Id', 'Title', 'Author', 'Readings', 'Date']
    const filterVal = ['id', 'title', 'author', 'pageviews', 'display_time']
    const data = this.formatJson(filterVal, this.list)
    excel.export_json_to_excel({
      header: tHeader,
      data,
      filename: this.filename,   // 空则用默认 excel-list
      autoWidth: this.autoWidth, // 中文按 length*2 估宽
      bookType: this.bookType    // xlsx | csv | txt
    })
    this.downloadLoading = false
  }).catch(() => { this.downloadLoading = false })
}

formatJson(filterVal, jsonData) {
  return jsonData.map(v => filterVal.map(j => {
    if (j === 'timestamp') return parseTime(v[j])
    const val = v[j]
    return val === null || val === undefined ? '' : val
  }))
}
```

`bookType: 'txt'` 时仍需 `header`，导出的是一行一行的 TSV 文本，别指望能用 Excel 的列宽。

## 2. 多级表头 + 合并单元格

关键是 `multiHeader` 里被合并的列**必须留空字符串占位**，长度与 `header` 一致；`merges` 按 Excel 单元格范围写：

```js
const multiHeader = [['Id', 'Main Information', '', '', 'Date']]
const header = ['', 'Title', 'Author', 'Readings', '']
const filterVal = ['id', 'title', 'author', 'pageviews', 'display_time']
const data = this.formatJson(filterVal, this.list)
const merges = ['A1:A2', 'B1:D1', 'E1:E2']

excel.export_json_to_excel({ multiHeader, header, merges, data })
```

范围算错的典型表现：Excel 打开提示「文件已损坏」或表头错位一格。改动列时三处（`multiHeader` / `header` / `merges`）必须同步改。

## 3. 勾选行导出

```js
handleSelectionChange(val) { this.multipleSelection = val }

handleDownload() {
  if (!this.multipleSelection.length) {
    this.$message.warning('请先勾选要导出的行')
    return
  }
  import('@/vendor/Export2Excel').then(excel => {
    excel.export_json_to_excel({
      header: ['Id', 'Title', 'Author'],
      data: this.formatJson(['id', 'title', 'author'], this.multipleSelection)
    })
  })
}
```

## 4. 导入解析

```vue
<upload-excel-component :on-success="handleSuccess" :before-upload="beforeUpload" />
```

```js
beforeUpload(file) {
  const isLt1M = file.size / 1024 / 1024 < 1
  if (!isLt1M) this.$message.warning('文件不能超过 1MB')
  return isLt1M
},
handleSuccess({ results, header }) {
  this.tableData = results   // [{ 中文列名: 值 }]
  this.tableHeader = header  // ['姓名', '手机号', ...]
}
```

- `header` 是**中文列名数组**，`results` 的 key 也是中文列名，字段映射要在页面层自己转成后端字段。
- `UploadExcel` 只读第一个 sheet，多 sheet 需要自己扩展。
- 日期列会被 xlsx 转成 Excel 序列号（如 `45231`），需要 `XLSX.SSF.parse_date_code` 或后端兜底。

## 5. 常见坑

| 现象 | 原因 | 处理 |
|---|---|---|
| 导出文件打不开 / 提示损坏 | `merges` 范围非法，或 `header` 与数据列数不一致 | 逐列核对 `multiHeader` / `header` / `merges` |
| 单元格里出现 "null" / "undefined" | 直接导原始对象 | `formatJson` 里统一转 `''` |
| 导出时间是数字 | 后端给的是时间戳 | `parseTime(v[j])` |
| 首屏体积暴涨 | 静态 import 了 Export2Excel | 改 `import()` 懒加载 |
| 中文列宽过窄 | `autoWidth: true` 按 `length*2` 估宽 | 手写 `!cols` 或导完让用户自己拉 |
| 大数据量卡死浏览器 | 前端一次性写 10 万行 | >1 万行走后端导出接口，前端只要下载链接 |
| 导出的是当前页 | 直接导 `this.list` | 按当前 `query` 拉全量后再导 |
