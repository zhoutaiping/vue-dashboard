---
name: home-dashboard-convention
description: 当为本项目构建数据大屏/驾驶舱页面（如首页总览 HomeOverview）时触发。规定"容器统一取数 + 子组件纯渲染 + fieldMap 字段映射配置化 + mock 先行 + 下钻状态提升"的开发约定，保证组件低耦合、可整体迁移。
---

# 首页大屏 / 驾驶舱开发约定

本技能固化 `src/views/homePage/overview` 建立的大屏开发范式。新建任何驾驶舱式页面前加载，保证组件低耦合、后端字段变更不影响展示组件。

## 何时使用
- 新增带地图 / 图表 / 排名的统计大屏页
- 拆分大屏组件，要求低耦合、字段可自定义、便于迁移
- 设计下钻（全国 → 省 → 市）与多面板联动

## 必须遵守的范式
1. **单一取数容器**：页面容器组件负责所有接口请求，子组件只接收 props、抛出事件（props down, events up），绝不自行发请求。
2. **字段映射配置化**：每个展示组件暴露 `fieldMap`（如 `{ name, value, code }`）或 `fields` 数组；后端字段改名只改 `config.js`，组件不动。见 `references/component-contract.md`。
3. **接口契约统一**：后端以 `{ code: 200, msg, data }` 为成功；api 层集中到 `src/api/homeOverview.js` 一个文件，迁移只换该文件。见 `references/api-contract.md`。
4. **mock 先行**：接口未就绪时在 `mock/homeOverview.js` 造数据并注册到 `mock/index.js`，dev 下由 mock-server 命中。
5. **下钻状态提升**：层级（level/provinceCode/cityCode）、分类、月份等查询条件提升到容器 `data.query`，各面板 `watch` 它重新请求。
6. **通用组件复用**：复用 `src/components/Dashboard/` 下的纯展示组件（PanelCard / MetricList / ChartPie / ChartBarLine / RankList / CategoryTabs / LevelTabs / MapViewer / ProjectCardList），新增展示字段走其 props，不要重复造轮子。

## 目录约定
```
src/views/homePage/overview/
  config.js          ← 字段映射/分类/配色/展示字段配置中心
  index.vue          ← 容器（唯一取数，状态提升）
src/components/Dashboard/   ← 通用纯展示组件（无业务请求）
src/api/homeOverview.js     ← 接口层（唯一发请求处）
mock/homeOverview.js        ← mock 数据（注册到 mock/index.js）
```

## 详细契约
- `references/component-contract.md`：通用组件 props 字段契约表
- `references/api-contract.md`：接口清单与 data 结构
