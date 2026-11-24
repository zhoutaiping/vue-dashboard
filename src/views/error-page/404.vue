<template>
  <div class="page-404">
    <div class="page-404__inner">
      <div class="page-404__code">404</div>
      <div class="page-404__title">页面不存在</div>
      <div class="page-404__desc">你访问的页面不存在或已被移除</div>
      <a class="page-404__home" href="/">返回首页</a>
    </div>
  </div>
</template>

<script>
export default {
  name: 'Page404'
}
</script>

<style scoped>
.page-404 {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.page-404__inner {
  text-align: center;
  padding: 40px 20px;
}

.page-404__code {
  font-size: 160px;
  font-weight: 700;
  line-height: 1;
  color: #1482f0;
  letter-spacing: 4px;
}

.page-404__title {
  margin-top: 20px;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.page-404__desc {
  margin-top: 12px;
  font-size: 14px;
  color: #909399;
}

.page-404__home {
  display: inline-block;
  margin-top: 32px;
  padding: 10px 28px;
  border-radius: 4px;
  background: #1482f0;
  color: #fff;
  font-size: 14px;
  text-decoration: none;
}

.page-404__home:hover {
  background: #0d6fd0;
}

@media (max-width: 600px) {
  .page-404__code {
    font-size: 100px;
  }
}
</style>
