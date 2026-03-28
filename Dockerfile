FROM node:20-alpine AS base

# 1. 安装依赖
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# 2. 编译项目
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# 生成 Prisma Client 并构建 Next.js
RUN npx prisma generate
RUN npm run build

# 3. 生产环境运行
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV PORT 3000

# 复制 Next.js standalone 输出
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000

# 启动命令
CMD ["node", "server.js"]
