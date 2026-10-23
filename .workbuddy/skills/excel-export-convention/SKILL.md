---
name: excel-export-convention
description: 在本项目中新增或修改 Excel 导入导出功能时触发。规定 xlsx + 自研 vendor/Export2Excel.js 的导出范式（表头/字段双数组、懒加载、合并单元格、空值处理）与 UploadExcel 导入契约，避免首屏体积膨胀与导出脏数据。
---

# Excel 导入导出规范

本项目 Excel 能力**不依赖第三方封装**：导出是自研的 `src/vendor/Export2Excel.js`（基于 `xlsx` + `file-saver`），导入是 `src/components/UploadExcel/index.vue`。
新增导出/导入一律照抄现有范式，不要引入 `xlsx-style`、`exceljs` 之类新依赖。

## 何时使用

- 列表页加「导出 Excel」按钮
- 需要多级表头 / 合并单元格 / 自定义列宽 / xlsx-csv-txt 切换
- 需要上传 Excel 解析成表格数据
- 导出慢、导出内容缺列、中文乱码、下载文件打不开

## 复用优先级

1. `src/views/excel/export-excel.vue` —— 基础导出（文件名 / 自动列宽 / 文件类型）
2. `src/views/excel/merge-header.vue` —— 多级表头 + 合并单元格
3. `src/views/excel/select-excel.vue` —— 勾选行导出
4. `src/views/excel/upload-excel.vue` + `src/components/UploadExcel` —— 导入解析

## 铁律

1. **必须懒加载**：`import('@/vendor/Export2Excel').then(excel => ...)`。静态 import 会把 xlsx（~800KB）打进首屏 chunk。
2. **表头与字段双数组**：`tHeader`（展示名）+ `filterVal`（字段名），顺序必须一一对应。不要用对象 key 遍历，列顺序会随后端字段变动。
3. **数据统一过 `formatJson`**：时间戳字段用 `parseTime`；`null` / `undefined` 导出前转 `''`，否则 Excel 里出现字符串 "null"。
4. **`downloadLoading` 必须复位**：写在 `then` 里也要保证异常路径不卡住按钮（`.finally` 或 `catch` 里复位）。
5. **导出全量而非当前页**：若列表分页，导出前用同一套 `query` 拉全量（`page: 1, limit: 0` 或后端专用导出接口），不能直接导 `this.list`。
6. **多级表头靠占位**：`multiHeader` 中被合并的列写空字符串，`merges` 用 `['A1:A2', 'B1:D1']` 这类 Excel 范围字符串；`header` 长度必须与 `data` 每行一致。
7. **`src/vendor/Export2Excel.js` 是三方代码**（顶部 `/* eslint-disable */`）：不要格式化、不要重构、不要在此文件里加业务逻辑。
8. **导入只做解析，不做校验**：`UploadExcel` 的 `onSuccess({ header, results })` 只负责把表转成对象数组，必填/格式校验放在页面层。

## 骨架

```js
handleDownload() {
  this.downloadLoading = true
  import('@/vendor/Export2Excel').then(excel => {
    const tHeader = ['Id', '标题', '作者', '阅读量', '时间']
    const filterVal = ['id', 'title', 'author', 'pageviews', 'display_time']
    const data = this.formatJson(filterVal, this.list)
    excel.export_json_to_excel({
      header: tHeader,
      data,
      filename: this.filename || 'excel-list',
      autoWidth: this.autoWidth,
      bookType: this.bookType // xlsx | csv | txt
    })
    this.downloadLoading = false
  }).catch(() => { this.downloadLoading = false })
}
```

## API 备忘

`Export2Excel` 只导出两个函数：

- `export_json_to_excel({ multiHeader = [], header, data, filename = 'excel-list', merges = [], autoWidth = true, bookType = 'xlsx' })`
- `export_table_to_excel(id)` —— 直接抓取页面 `table` DOM（含 colspan/rowspan），样式不可控，仅在需要 1:1 还原页面表格时用

## 详细模板与坑

见 `references/templates.md`：多级表头完整示例、勾选行导出、导入解析、空值与日期处理、大文件性能。

## 安全提醒

`package.json` 锁的是 `xlsx: 0.14.1`，该版本存在已公开的原型污染与 ReDoS 问题（影响 <0.19.3 / <0.20.2 的版本）。当前只在前端做本地导入解析，风险可控；**若要解析外部上传文件，应先评估升级到 0.20.x 以上**（SheetJS 已不在 npm 发布新版，需换 CDN/tarball 源），并在升级后回归 `src/views/excel/*` 四个示例页。
