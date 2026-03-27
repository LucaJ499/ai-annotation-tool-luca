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

### 2. 初始化数据库

```bash
npx prisma generate
npx prisma db push
```

### 3. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000

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

### 3. 导出结果

1. 进入批次详情页
2. 点击"导出 CSV"
3. 下载包含原始字段和标注字段的结果文件

## 项目结构

```
ai-annotation-tool/
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   ├── batches/           # 批次页面
│   ├── annotate/          # 标注页面
│   ├── page.tsx           # 首页（批次列表）
│   └── layout.tsx         # 根布局
├── lib/                   # 工具函数
│   ├── prisma.ts          # Prisma客户端
│   ├── constants.ts       # 常量定义
│   └── formatters/        # 格式化函数
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

## 注意事项

1. **无登录系统**：通过选择标注人身份来区分，不强制认证
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
- [ ] 统计分析看板
- [ ] 多人标注一致性分析
