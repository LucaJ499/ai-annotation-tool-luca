# AI知识问答效果评测标注工具 - 技术方案

## 1. 架构设计

### 1.1 系统架构图

```mermaid
graph TD
    A[用户浏览器] --> B[Next.js 前端应用]
    B --> C[Next.js API Routes]
    C --> D[Prisma ORM]
    D --> E[(PostgreSQL/SQLite)]
    
    subgraph "前端层"
        B
    end
    
    subgraph "服务端层"
        C
        D
    end
    
    subgraph "数据层"
        E
    end
```

### 1.2 架构说明

本系统采用 **Next.js 全栈架构**，前端与服务端共用一套代码库：

- **前端层**：React 组件 + Tailwind CSS 样式
- **服务端层**：Next.js API Routes 处理业务逻辑，Prisma ORM 操作数据库
- **数据层**：支持 PostgreSQL（生产环境）或 SQLite（开发环境）

---

## 2. 技术选型

| 层级 | 技术栈 | 版本 | 说明 |
|------|--------|------|------|
| 前端框架 | Next.js | 14.2.0 | React 全栈框架，支持 App Router |
| UI 库 | React | 18.2.0 | 组件化开发 |
| 样式 | Tailwind CSS | 3.4.0 | 原子化 CSS 框架 |
| 图标 | Lucide React | 0.363.0 | 现代化图标库 |
| ORM | Prisma | 5.12.0 | 类型安全的数据库操作 |
| 数据库 | PostgreSQL/SQLite | - | 生产/开发环境 |
| Excel 解析 | xlsx | 0.18.5 | 客户端解析 Excel 文件 |
| Markdown | react-markdown | 9.0.1 | AI 输出内容渲染 |
| 语言 | TypeScript | 5.4.0 | 类型安全 |

### 2.1 初始化工具

- **vite-init**：项目使用 Next.js 官方脚手架创建

---

## 3. 路由定义

| 路由 | 用途 | 访问控制 |
|------|------|----------|
| `/access` | 访问口令输入页 | 公开访问 |
| `/` | 首页（批次列表） | 需验证 |
| `/batches/new` | 新建批次页 | 需验证 |
| `/batches/[id]` | 批次详情页 | 需验证 |
| `/batches/[id]/analytics` | 数据看板页 | 需验证 |
| `/annotate/[batchId]` | 标注页面 | 需验证 |
| `/api/access/verify` | 验证访问口令 | 公开访问 |
| `/api/access/check` | 检查访问状态 | 公开访问 |
| `/api/access/clear` | 清除访问凭证 | 公开访问 |
| `/api/batches` | 批次 CRUD 接口 | 需验证 |
| `/api/batches/[id]` | 单个批次操作 | 需验证 |
| `/api/batches/[id]/analytics` | 批次统计接口 | 需验证 |
| `/api/batches/[id]/export` | 导出 CSV 接口 | 需验证 |
| `/api/next-sample` | 获取下一条样本 | 需验证 |
| `/api/annotations` | 提交标注结果 | 需验证 |

---

## 4. 数据模型设计

### 4.1 ER 图

```mermaid
erDiagram
    BATCH ||--o{ SAMPLE : contains
    BATCH ||--o{ ANNOTATION : has
    SAMPLE ||--o| ANNOTATION : has
    
    BATCH {
        string id PK
        string name
        datetime createdAt
        datetime updatedAt
        int totalCount
        int completedCount
        string annotators
        string status
    }
    
    SAMPLE {
        string id PK
        string batchId FK
        int sequence
        string systemInternalId
        string inputInput
        string inputExpectClassfiy
        string inputStep
        string inputObject
        string inputStatus
        string outputActualOutput
        string nodeZhiShangRAGRerank
        string nodeScriptUncA
        string nodeScriptHbh1
        string nodeScriptTezR
        string nodeScriptORfz
        string assignedTo
        string status
    }
    
    ANNOTATION {
        string id PK
        string sampleId FK
        string batchId FK
        string isClearIntent
        string intentClassificationAccurate
        string hasKnowledge
        string knowledgeTitle
        string recallAccuracy
        string replyQuality
        string unavailableReasons
        string remark
        string actionSuggestionRelevant
        string guessQuestionsOk
        string annotator
        datetime annotatedAt
    }
```

### 4.2 数据表定义

**Batch（批次表）**
```sql
CREATE TABLE batches (
    id TEXT PRIMARY KEY DEFAULT (uuid()),
    name TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    totalCount INTEGER DEFAULT 0,
    completedCount INTEGER DEFAULT 0,
    annotators TEXT NOT NULL,  -- JSON 数组
    status TEXT DEFAULT 'pending'  -- pending, in_progress, completed
);
```

**Sample（样本表）**
```sql
CREATE TABLE samples (
    id TEXT PRIMARY KEY DEFAULT (uuid()),
    batchId TEXT NOT NULL,
    sequence INTEGER NOT NULL,
    systemInternalId TEXT,
    inputInput TEXT,
    inputExpectClassfiy TEXT,
    inputStep TEXT,
    inputObject TEXT,
    inputStatus TEXT,
    outputActualOutput TEXT,
    nodeZhiShangRAGRerank TEXT,
    nodeScriptUncA TEXT,
    nodeScriptHbh1 TEXT,
    nodeScriptTezR TEXT,
    nodeScriptORfz TEXT,
    assignedTo TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY (batchId) REFERENCES batches(id) ON DELETE CASCADE
);

CREATE INDEX idx_samples_batchId ON samples(batchId);
CREATE INDEX idx_samples_assignedTo ON samples(assignedTo);
CREATE INDEX idx_samples_status ON samples(status);
```

**Annotation（标注表）**
```sql
CREATE TABLE annotations (
    id TEXT PRIMARY KEY DEFAULT (uuid()),
    sampleId TEXT UNIQUE NOT NULL,
    batchId TEXT NOT NULL,
    isClearIntent TEXT,
    intentClassificationAccurate TEXT,
    hasKnowledge TEXT,
    knowledgeTitle TEXT,
    recallAccuracy TEXT,
    replyQuality TEXT,
    unavailableReasons TEXT,  -- JSON 数组
    remark TEXT,
    actionSuggestionRelevant TEXT,
    guessQuestionsOk TEXT,
    annotator TEXT NOT NULL,
    annotatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sampleId) REFERENCES samples(id) ON DELETE CASCADE,
    FOREIGN KEY (batchId) REFERENCES batches(id) ON DELETE CASCADE
);

CREATE INDEX idx_annotations_batchId ON annotations(batchId);
CREATE INDEX idx_annotations_annotator ON annotations(annotator);
```

---

## 5. 核心 API 设计

### 5.1 创建批次

```
POST /api/batches
```

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| name | string | 是 | 批次名称 |
| annotators | string[] | 是 | 标注人列表 |
| samples | object[] | 是 | Excel 解析后的样本数据 |

**响应：**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "批次名称",
    "annotators": ["标注人1", "标注人2"],
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### 5.2 获取下一条样本

```
GET /api/next-sample?batchId={id}&annotator={name}&currentSequence={n}&direction=next
```

**响应：**
```json
{
  "success": true,
  "data": {
    "sample": { /* 样本详情 */ },
    "progress": {
      "current": 1,
      "total": 100,
      "completed": 0
    }
  }
}
```

### 5.3 提交标注

```
POST /api/annotations
```

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| sampleId | string | 是 | 样本ID |
| batchId | string | 是 | 批次ID |
| annotator | string | 是 | 标注人 |
| isClearIntent | string | 是 | 意图清晰度 |
| intentClassificationAccurate | string | 是 | 分类准确性 |
| hasKnowledge | string | 是 | 是否有知识 |
| knowledgeTitle | string | 否 | 知识标题 |
| recallAccuracy | string | 是 | 召回准确性 |
| replyQuality | string | 是 | 回复质量 |
| unavailableReasons | string[] | 否 | 不可用原因 |
| remark | string | 否 | 备注 |
| actionSuggestionRelevant | string | 是 | 行动建议相关性 |
| guessQuestionsOk | string | 是 | 猜你想问合理性 |

### 5.4 获取统计数据

```
GET /api/batches/{id}/analytics
```

**响应：**
```json
{
  "success": true,
  "data": {
    "batch": { /* 批次信息 */ },
    "mainMetric": {
      "aiReplyWeighted": { "value": 85, "numerator": 85, "denominator": 100, "noData": false },
      "aiReplyBasic": { "value": 90, "numerator": 90, "denominator": 100, "noData": false }
    },
    "processMetrics": {
      "clearIntent": { /* 意图清晰率 */ },
      "intentAccurate": { /* 分类准确率 */ },
      "knowledgeCoverage": { /* 知识覆盖率 */ },
      "recallAccuracy": { /* 召回准确率 */ }
    },
    "distributions": {
      "clearIntent": { "是": 80, "否": 20 },
      "replyQuality": { "完全可用": 70, "部分可用": 20, "完全不可用": 10 }
      /* ... */
    }
  }
}
```

---

## 6. 访问控制机制

### 6.1 安全架构

```mermaid
graph LR
    A[用户请求] --> B{Middleware检查}
    B -->|公开路径| C[放行]
    B -->|受保护路径| D{Cookie验证}
    D -->|已验证| C
    D -->|未验证| E[重定向到/access]
    E --> F[输入口令]
    F --> G[API验证]
    G -->|正确| H[设置Cookie]
    G -->|错误| I[拒绝访问]
```

### 6.2 实现细节

**中间件（middleware.ts）**：
- 拦截所有请求，检查 `site_access_granted` Cookie
- 公开路径：`/access`, `/api/access/*`
- Cookie 有效期：7天
- 安全设置：httpOnly, SameSite=Lax, Secure（生产环境）

**环境变量**：
```bash
ACCESS_KEY=your-secret-access-key
```

---

## 7. 内部集成建议

### 7.1 部署方案

#### 方案 A：独立部署（推荐）

将本工具作为独立应用部署，通过以下方式与公司内部系统集成：

1. **单点登录（SSO）集成**
   - 替换现有访问控制中间件，对接公司统一认证系统
   - 支持 OAuth2.0 / OIDC / LDAP 等协议

2. **数据同步**
   - 通过 API 接口将评测数据同步到数据仓库
   - 支持定时任务导出数据到 BI 系统

3. **消息通知**
   - 集成企业微信/钉钉/飞书机器人
   - 标注任务分配、完成时发送通知

#### 方案 B：嵌入现有系统

将本工具作为微前端模块嵌入现有内部系统：

1. **微前端改造**
   - 使用 qiankun / module-federation 等方案
   - 保持现有路由和状态管理

2. **统一登录态**
   - 复用现有系统的登录态
   - 移除独立访问控制

3. **样式适配**
   - 调整 UI 风格与现有系统一致
   - 支持主题切换

### 7.2 数据库选型建议

| 场景 | 推荐方案 | 说明 |
|------|----------|------|
| 小规模试用 | SQLite | 零配置，适合快速验证 |
| 正式生产 | PostgreSQL | 高并发、数据安全、备份恢复 |
| 企业集成 | 现有数据库 | 复用公司统一数据库资源 |

### 7.3 扩展开发建议

**短期优化**：
- [ ] 字段映射配置 UI：支持不同数据源的字段映射
- [ ] 批量标注：相同类型问题批量应用标注结果
- [ ] 快捷键支持：提升标注效率

**中期规划**：
- [ ] 标注审核流程：支持一审、二审机制
- [ ] 多人标注一致性分析：计算 IAA（标注者间一致性）
- [ ] 细粒度权限控制：角色权限管理

**长期演进**：
- [ ] 智能辅助标注：基于历史标注数据推荐标注结果
- [ ] 自动质检：自动检测异常标注数据
- [ ] 多维度对比分析：支持不同批次、不同时间段的对比

### 7.4 运维监控

**日志记录**：
- 所有 API 请求记录（用户、时间、操作、结果）
- 标注操作审计日志
- 错误日志集中收集

**监控指标**：
- 系统可用性
- API 响应时间
- 数据库连接池状态
- 标注任务完成率

**备份策略**：
- 数据库定时备份
- 标注结果定期导出归档

---

## 8. 项目结构

```
ai-annotation-tool/
├── app/                          # Next.js App Router
│   ├── access/                   # 访问验证页面
│   │   ├── page.tsx
│   │   └── AccessContent.tsx
│   ├── annotate/[batchId]/       # 标注页面
│   │   ├── page.tsx
│   │   └── AnnotateContent.tsx
│   ├── api/                      # API Routes
│   │   ├── access/               # 访问控制接口
│   │   ├── annotations/          # 标注提交接口
│   │   ├── batches/              # 批次管理接口
│   │   └── next-sample/          # 样本获取接口
│   ├── batches/                  # 批次页面
│   │   ├── [id]/
│   │   │   ├── page.tsx
│   │   │   └── analytics/        # 数据看板
│   │   └── new/                  # 新建批次
│   ├── components/               # 公共组件
│   ├── globals.css               # 全局样式
│   ├── layout.tsx                # 根布局
│   └── page.tsx                  # 首页
├── lib/                          # 工具库
│   ├── constants.ts              # 常量定义
│   ├── prisma.ts                 # Prisma 客户端
│   └── formatters/               # 数据格式化
│       ├── actionSuggestion.ts
│       ├── aiOutput.ts
│       ├── knowledgeRecall.ts
│       └── suggestedQuestions.ts
├── prisma/
│   └── schema.prisma             # 数据库模型
├── middleware.ts                 # 访问控制中间件
└── package.json
```

---

## 9. 环境配置

### 9.1 环境变量

```bash
# 数据库配置（开发环境使用 SQLite）
DATABASE_URL="file:/path/to/dev.db"

# 生产环境使用 PostgreSQL
# DATABASE_URL="postgresql://user:password@host:port/dbname"

# 访问口令（必须设置）
ACCESS_KEY=your-secret-access-key
```

### 9.2 启动命令

```bash
# 安装依赖
npm install

# 初始化数据库
npx prisma generate
npx prisma db push

# 开发模式
npm run dev

# 生产构建
npm run build
npm start
```
