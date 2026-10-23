---
name: bmapgl-vue2
description: 当在 Vue 2.6（Options API）+ Element UI 项目中使用百度地图 JavaScript GL（BMapGL）时触发。覆盖 AK 异步加载、el-dialog 内坐标偏移、marker 拖拽与地图 click 冲突、InfoWindow 悬浮卡片、图层开关、全屏 resize、电子围栏多边形绘制等已知踩坑规范。
---

# BMapGL + Vue 2 封装规范

本技能固化本项目在 Vue 2.6 + Element UI 2.13 中使用百度地图 GL（BMapGL）的踩坑经验。在新增或修改任何地图相关代码（地图初始化、打点、围栏、悬浮卡片、全屏）前加载本技能，避免重复踩坑。

## 何时使用
- 在 `el-dialog` / `el-drawer` 内嵌入 BMapGL 地图
- 实现地图打点、marker 拖拽、电子围栏（多边形/矩形）绘制
- 地图 hover/click 交互、`InfoWindow` 悬浮卡片
- 地图全屏、图层显隐、点位自适应缩放

## 核心规则（必须遵守）
1. 地图初始化必须走统一的异步加载入口，禁止在各组件内直接 `new BMapGL.Map`，避免重复注入脚本。
2. 地图若放在 `el-dialog` 内，点击事件坐标会发生 CSS `transform` 偏移，必须用 `clientX/clientY + getBoundingClientRect` 还原，不能依赖地图事件 `pixel` 直接换算经纬度。
3. marker 的 `click` 会冒泡到地图 `click`，在地图 click 处理（如反查省份下钻）前用 `_pointClicked` 标志位拦截，避免误下钻。
4. 前端禁止硬编码可用 AK。AK 应走环境变量 / 构建注入，并在百度控制台配置 Referer 白名单。
5. 全屏切换后必须 `map.checkResize()` 并 `window.dispatchEvent(new Event('resize'))` 让 echarts 自适应。
6. 关闭楼宇遮挡：`map.setDisplayOptions({ building: false })`。

## 详细踩坑与代码模板
见 `references/pitfalls.md`，包含：AK 异步加载器、dialog 坐标还原、marker 拖拽补发、InfoWindow DOM 事件绑定、围栏矩形绘制、省份反查下钻、自适应 setViewport。

## 复用建议
优先复用 `src/components/Dashboard/MapViewer.vue`（已封装打点 / 悬浮 / 图层 / 全屏），新增字段走其 props（`fieldMap` / `layers` / `hoverFields`），不要重复造轮子。涉及业务围栏时参考 `src/components/Breadcrumb/gpsLocalDialog.vue` 的 `saveFence` 校验逻辑。
