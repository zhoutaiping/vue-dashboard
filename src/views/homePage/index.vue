<template>
  <div class="home-page-container">
    <!-- 顶部统计卡片区域 -->
    <el-row :gutter="16" class="stats-cards">
      <!-- 四张卡结构完全一致（环形图同为占位数据），差异只在标题与下方明细，故按数据渲染 -->
      <el-col v-for="card in statCards" :key="card.title" :xs="24" :sm="12" :lg="6">
        <el-card class="stat-card" shadow="never">
          <div class="stat-header">
            <span class="stat-title">{{ card.title }}</span>
            <i class="el-icon-question header-icon" />
          </div>
          <div class="stat-body">
            <div class="stat-chart">
              <div class="chart-circle">
                <svg width="120" height="120" class="circle-svg">
                  <circle cx="60" cy="60" r="50" stroke="#e5e5e5" stroke-width="10" fill="none" />
                  <!-- dasharray = 周长 2πr（r=50）；dashoffset 78 ≈ 缺 25%，即画 75% 的弧 -->
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    stroke="#67c23a"
                    stroke-width="10"
                    fill="none"
                    stroke-dasharray="314"
                    stroke-dashoffset="78"
                    stroke-linecap="round"
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div class="chart-content">
                  <div class="number">210</div>
                  <div class="arrow">↑</div>
                </div>
              </div>
            </div>
            <div class="stat-info">
              <div v-for="item in card.items" :key="item.label" class="info-item">
                <span class="info-label">{{ item.label }}</span>
                <span class="info-value" :class="item.type">{{ item.text }}</span>
              </div>
              <div class="info-item date">
                <span class="info-label">{{ card.date }}</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 项目列表区域 -->
    <el-card class="project-table-card" shadow="never">
      <div slot="header" class="card-header">
        <span class="header-title">解除许可项目日常情况表</span>
        <div class="header-actions">
          <el-button size="small" @click="handleRefresh">刷新</el-button>
          <el-button size="small" type="primary" @click="handleExport">导出</el-button>
        </div>
      </div>

      <el-table
        :data="projectList"
        style="width: 100%"
        :header-cell-style="{ background: '#fafafa', color: '#333', fontWeight: '500', fontSize: '13px', padding: '12px 0' }"
        :cell-style="{ padding: '12px 0', fontSize: '13px', color: '#666' }"
      >
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="projectCode" label="项目编号" min-width="130" />
        <el-table-column prop="projectName" label="项目名称" min-width="280" show-overflow-tooltip />
        <el-table-column prop="company" label="项目公司" min-width="200" show-overflow-tooltip />
        <el-table-column prop="endDate" label="到期时间" min-width="200" />
        <el-table-column prop="principal" label="本金" min-width="180" />
        <el-table-column label="操作" width="80" align="center" fixed="right">
          <template slot-scope="scope">
            <el-button type="text" size="small" @click="handleDetail(scope.row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <div class="pagination-info">
          <span>Total {{ pagination.total }}</span>
          <el-select v-model="pagination.pageSize" size="small" @change="handleSizeChange">
            <el-option :value="10" label="10/page" />
            <el-option :value="20" label="20/page" />
            <el-option :value="50" label="50/page" />
            <el-option :value="100" label="100/page" />
          </el-select>
        </div>
        <el-pagination
          :current-page="pagination.currentPage"
          :page-size="pagination.pageSize"
          layout="prev, pager, next"
          :total="pagination.total"
          @current-change="handleCurrentChange"
        />
        <div class="pagination-jump">
          <span>Go to</span>
          <el-input-number
            v-model="jumpPage"
            :min="1"
            :max="Math.ceil(pagination.total / pagination.pageSize)"
            size="small"
            controls-position="right"
            @change="handleJumpPage"
          />
        </div>
      </div>
    </el-card>
  </div>
</template>

<script>
export default {
  name: 'HomePage',
  data() {
    return {
      jumpPage: 1,
      // 顶部统计卡（占位数据：等接口就绪后由后端返回，结构不变）
      statCards: [
        {
          title: '未确认投资项目',
          items: [
            { label: '已通知项目数：', text: '210 ↑', type: 'success' },
            { label: '未通知项目：', text: '9 ↑', type: 'danger' }
          ],
          date: '数据更新日期：2025-11-10'
        },
        {
          title: '未确认贷款项目',
          items: [
            { label: '已通知项目数：', text: '210 ↑', type: 'success' },
            { label: '未通知项目数：', text: '9 ↑', type: 'danger' }
          ],
          date: '数据更新日期：近三个月'
        },
        {
          title: '未确认担保项目',
          items: [
            { label: '已通知数量：', text: '210 ↑', type: 'success' },
            { label: '未通知数量：', text: '9 ↑', type: 'danger' }
          ],
          date: '数据更新日期：2025-11-10'
        },
        {
          title: '无投入值录入客户',
          items: [
            { label: '无组长客户数：', text: '9 ↑', type: 'danger' },
            { label: '无投入值人数：', text: '9 ↑', type: 'danger' }
          ],
          date: '数据更新日期：近三个月'
        }
      ],
      projectList: [
        {
          projectCode: 'PPB202504015',
          projectName: '上海市上海市沪闵区100MW分布式光伏发电项目',
          company: '甘肃恒信热力发电有限公司',
          endDate: '2024-09月17日， 2025-03月7日',
          principal: '恒昌银行;小米'
        },
        {
          projectCode: 'PPB202501002',
          projectName: '河南省平顶山市鲁山县8111MW风电项目',
          company: '昆明中电环保水力有限公司',
          endDate: '',
          principal: '中国宁泽证监会'
        },
        {
          projectCode: 'PPB202312011',
          projectName: '天津市天津市滨海新区100MW分布式光伏项目',
          company: '昆明中电环保水力有限公司',
          endDate: '2025-1月',
          principal: '商业银票据和科技'
        },
        {
          projectCode: 'PPB202506022',
          projectName: '上海市上海市金山区中日碳低碳储能场建设项目',
          company: '大连重工五洲输配电有限公司',
          endDate: '2025-2月28月9日',
          principal: '恒昌银行;小栋标识'
        },
        {
          projectCode: 'PPB202507001',
          projectName: '内蒙古自治区乌海市市辖区保障性电池输配电项目',
          company: '大连重工五洲输配电有限公司',
          endDate: '2024-09月17日， 2025-03月7日',
          principal: '恒昌银行;分布式以区'
        },
        {
          projectCode: 'PPB202312011',
          projectName: '青海省果洛市玛沁县太阳能组装铜业等项目',
          company: '云南省输配电影响有限公司等地分公司',
          endDate: '2025-2月28月9日',
          principal: '恒昌银行;地政以区'
        },
        {
          projectCode: 'PPB202504015',
          projectName: '上海市上海市沪闵区100MW分布式光伏发电项目',
          company: '云南省输配电影响有限公司等地分公司',
          endDate: '2025-1月',
          principal: '恒昌银行;小米'
        },
        {
          projectCode: 'PPB202504015',
          projectName: '云南省昆明市西部过分化工生理新材料项目',
          company: '云南省输配电影响有限公司等地分公司',
          endDate: '2025-1月',
          principal: '恒昌银行;分外建设以区'
        }
      ],
      pagination: {
        currentPage: 1,
        pageSize: 10,
        total: 8
      }
    }
  },
  methods: {
    handleRefresh() {
      this.$message.success('刷新成功')
    },
    handleExport() {
      this.$message.success('导出成功')
    },
    handleDetail(row) {
      this.$message.info('查看详情：' + row.projectName)
    },
    handleSizeChange(val) {
      this.pagination.pageSize = val
    },
    handleCurrentChange(val) {
      this.pagination.currentPage = val
    },
    handleJumpPage(val) {
      this.pagination.currentPage = val
    }
  }
}
</script>

<style lang="scss" scoped>
.home-page-container {
  padding: 20px;
  min-height: calc(100vh - 50px);
  background-image: url('./bg.png');

  // 统计卡片区域
  .stats-cards {
    margin-bottom: 20px;

    .stat-card {
      background: #fff;
      border: 1px solid #e8e8e8;
      border-radius: 4px;

      ::v-deep .el-card__body {
        padding: 16px 20px;
      }

      .stat-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;

        .stat-title {
          font-size: 14px;
          color: #333;
          font-weight: 400;
        }

        .header-icon {
          color: #999;
          font-size: 14px;
          cursor: pointer;
        }
      }

      .stat-body {
        display: flex;
        align-items: center;
        gap: 20px;

        .stat-chart {
          flex-shrink: 0;

          .chart-circle {
            width: 120px;
            height: 120px;
            position: relative;

            .circle-svg {
              transform: rotate(0deg);
            }

            .chart-content {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              text-align: center;

              .number {
                font-size: 32px;
                font-weight: bold;
                color: #333;
                line-height: 1;
              }

              .arrow {
                color: #67c23a;
                font-size: 18px;
                margin-top: 2px;
              }
            }
          }
        }

        .stat-info {
          flex: 1;

          .info-item {
            margin-bottom: 8px;
            font-size: 13px;
            line-height: 1.6;

            &.date {
              margin-top: 4px;
              margin-bottom: 0;
              font-size: 12px;
              color: #999;
            }

            .info-label {
              color: #666;
            }

            .info-value {
              font-weight: 500;

              &.success {
                color: #67c23a;
              }

              &.danger {
                color: #f56c6c;
              }
            }
          }
        }
      }
    }
  }

  // 项目列表卡片
  .project-table-card {
    background: #fff;
    border: 1px solid #e8e8e8;
    border-radius: 4px;

    ::v-deep .el-card__header {
      padding: 16px 20px;
      background: #fff;
      border-bottom: 1px solid #e8e8e8;
    }

    ::v-deep .el-card__body {
      padding: 0;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;

      .header-title {
        font-size: 15px;
        font-weight: 500;
        color: #333;
      }

      .header-actions {
        display: flex;
        gap: 8px;
      }
    }

    // 表格样式
    ::v-deep .el-table {
      border: none;

      &::before {
        display: none;
      }

      th {
        background: #fafafa !important;
        border-bottom: 1px solid #e8e8e8;
        font-weight: 500;
      }

      td {
        border-bottom: 1px solid #f0f0f0;
      }

      tr:hover>td {
        background-color: #f5f9ff !important;
      }

      .el-button--text {
        color: #08f;
        padding: 0;
      }
    }

    // 分页样式
    .pagination-wrapper {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 16px 20px;
      gap: 20px;
      border-top: 1px solid #e8e8e8;

      .pagination-info {
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 13px;
        color: #666;

        ::v-deep .el-select {
          width: 100px;

          .el-input__inner {
            height: 28px;
            line-height: 28px;
            font-size: 13px;
          }
        }
      }

      ::v-deep .el-pagination {
        padding: 0;

        .btn-prev,
        .btn-next,
        .el-pager li {
          background: #fff;
          border: 1px solid #d9d9d9;
          font-size: 13px;
          min-width: 28px;
          height: 28px;
          line-height: 28px;
          margin: 0 4px;

          &:hover {
            color: #08f;
            border-color: #08f;
          }

          &.active {
            color: #08f;
            border-color: #08f;
            background-color: #fff;
          }
        }
      }

      .pagination-jump {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: #666;

        ::v-deep .el-input-number {
          width: 60px;

          .el-input__inner {
            height: 28px;
            line-height: 28px;
            font-size: 13px;
            padding: 0 8px;
          }

          .el-input-number__decrease,
          .el-input-number__increase {
            width: 20px;
            font-size: 12px;
          }
        }
      }
    }
  }

  // 响应式设计
  @media (max-width: 1200px) {
    .stats-cards {
      .stat-card {
        .stat-body {
          flex-direction: column;
          align-items: flex-start;
        }
      }
    }
  }

  @media (max-width: 768px) {
    padding: 10px;

    .stats-cards {
      .stat-card {
        margin-bottom: 12px;
      }
    }

    .pagination-wrapper {
      flex-direction: column;
      align-items: flex-start !important;
      gap: 12px;
    }
  }
}
</style>
