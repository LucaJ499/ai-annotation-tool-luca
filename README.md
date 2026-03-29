# AI知识问答效果评测标注工具

搬家助手AI能力人工评测工具，用于多人协同标注AI问答效果。

## 功能特性

- **批次管理**：创建标注批次，上传Excel数据
- **自动分配**：平均分配样本给各标注人
- **单条标注**：一次只看一条，优化连续标注效率
- **格式化展示**：
  - 知识召回结果自动解析为卡片展示
  - AI输出自动解析Markdown和引用角标
- **标注字段**：
  - 知识库内是否有知识
  - 知识召回是否准确
  - AI回复质量（完全可用/部分可用/完全不可用）
  - 不可用原因（多选）
  - 备注
- **进度追踪**：实时查看各标注人进度
- **结果导出**：导出为CSV格式
- **数据看板**：批次级统计指标和分布图
- **访问控制**：统一访问口令保护

## 技术栈

- Next.js 14 + React + TypeScript
- Tailwind CSS
- Prisma + SQLite
- xlsx (Excel解析)

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

创建 `.env.local` 文件（或修改已有文件）：

```bash
# 数据库配置
DATABASE_URL="file:/tmp/ai-annotation-tool.db"

# 访问口令配置（必须设置，否则无法访问网站）
ACCESS_KEY=ebp-annotation-banjia-2026
```

**重要说明**：
- `ACCESS_KEY` 是网站的统一访问口令
- 用户首次访问时需要输入此口令
- 验证通过后，7天内无需再次输入
- **生产环境必须修改默认口令**

### 3. 初始化数据库

```bash
npx prisma generate
npx prisma db push
```

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

首次访问时会跳转到访问口令输入页面，输入正确的 `ACCESS_KEY` 后即可使用。

## 访问口令说明

### 工作原理

1. **首次访问**：用户访问任意页面时，会自动跳转到 `/access` 访问口令输入页
2. **口令验证**：用户输入口令后，后端校验是否正确
3. **验证通过**：设置 httpOnly Cookie，有效期 7 天
4. **后续访问**：在 Cookie 有效期内，可直接访问所有页面
5. **过期后**：Cookie 过期后，再次访问会要求重新输入口令

### 环境变量配置

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `ACCESS_KEY` | 统一访问口令 | `xxxx` |

### 本地开发

本地开发时，在 `.env.local` 中设置：
```bash
ACCESS_KEY=ebp-annotation-banjia-2026
```

### 线上部署

部署到 Vercel 等云平台时，需要在平台后台设置环境变量：

**Vercel 设置步骤**：
1. 进入项目 Dashboard
2. 点击 Settings → Environment Variables
3. 添加变量：
   - Name: `ACCESS_KEY`
   - Value: 你的访问口令
4. 重新部署项目

**建议**：生产环境请修改默认口令，使用更复杂的随机字符串。

## Excel 字段要求

上传的Excel文件需要包含以下列：

| 列名 | 业务含义 |
|------|----------|
| `__system_internal_id__` | 用户提问ID |
| `input_input` | 用户输入 |
| `input_expect_classfiy` | 预期意图分类 |
| `input_step` | 搬家阶段 |
| `input_complete` | 搬家对象是否完成搬家 |
| `input_object` | 系统推荐搬家对象 |
| `output_actual_output` | AI最终输出（评测对象） |
| `node_ZhiShangRAGRerank_zIOZ_output` | 知识召回结果（评测对象） |
| `node_Script_uncA_output` | 行动建议内容（评测对象） |
| `node_Script_hBH1_output` | 猜你想问内容（评测对象） |

## 使用流程

### 1. 创建批次

1. 点击"新建批次"
2. 输入批次名称
3. 添加标注人（至少1人）
4. 上传Excel文件
5. 点击"创建批次"

### 2. 开始标注

1. 在批次详情页选择标注人
2. 点击"开始标注"
3. 查看左侧样本信息
4. 在右侧填写标注
5. 点击"保存并下一条"继续

### 3. 查看数据

1. 在批次列表页点击"数据"按钮
2. 查看批次级统计指标：
   - AI回复加权可用率（核心指标）
   - 意图清晰率、搬家意图分类准确率
   - 知识覆盖率、知识召回准确率
3. 查看各项分布图

### 4. 导出结果

1. 进入批次详情页
2. 点击"导出 CSV"
3. 下载包含原始字段和标注字段的结果文件

## 项目结构

```
ai-annotation-tool/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   └── access/        # 访问口令校验接口
│   ├── batches/           # 批次页面
│   ├── annotate/          # 标注页面
│   ├── access/            # 访问口令输入页
│   ├── page.tsx           # 首页（批次列表）
│   └── layout.tsx         # 根布局
├── lib/                   # 工具函数
│   ├── prisma.ts          # Prisma客户端
│   ├── constants.ts       # 常量定义
│   └── formatters/        # 格式化函数
├── middleware.ts          # 访问控制中间件
├── prisma/
│   └── schema.prisma      # 数据库Schema
└── package.json
```

## 数据模型

### Batch（批次）
- id, name, createdAt, annotators, totalCount, completedCount

### Sample（样本）
- 原始Excel字段
- assignedTo（分配给哪位标注人）
- status（pending/annotated）

### Annotation（标注结果）
- hasKnowledge, knowledgeTitle, recallAccuracy, replyQuality
- unavailableReasons, remark
- annotator, annotatedAt

## 访问控制说明

### 保护范围
- 全站所有页面（除 `/access` 和 `/api/access/verify`）
- 所有 API 接口（通过中间件统一拦截）

### 安全特性
- 口令存储在服务端环境变量，不暴露给前端
- 使用 httpOnly Cookie，防止 XSS 攻击
- Cookie 设置 SameSite=Lax，防止 CSRF
- 生产环境自动启用 Secure 标志

### 注意事项
1. **口令保密**：不要将访问口令泄露给无关人员
2. **定期更换**：建议定期更换访问口令
3. **环境变量**：生产环境务必修改默认口令
4. **Cookie 有效期**：7天后需要重新验证

## 注意事项

1. **访问控制**：网站受统一访问口令保护，首次访问需要输入口令
2. **数据存储**：使用SQLite文件数据库，数据保存在 `prisma/dev.db`
3. **浏览器兼容**：建议使用Chrome、Edge等现代浏览器
4. **Excel格式**：支持 .xlsx 和 .xls 格式

## 开发命令

```bash
# 开发模式
npm run dev

# 构建
npm run build

# 生产启动
npm start

# 数据库管理
npx prisma studio    # 打开数据库管理界面
npx prisma db push   # 推送schema变更
```

## 后续可扩展功能

- [ ] 字段映射配置UI
- [ ] 批量应用到后续N条
- [ ] 快捷键支持
- [ ] 标注审核流程
- [x] 统计分析看板
- [ ] 多人标注一致性分析
- [ ] 更细粒度的权限控制
