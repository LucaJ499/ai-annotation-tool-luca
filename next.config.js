/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'standalone', // 关闭 standalone 模式，避免宝塔面板找不到 .next 构建产物
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
}

module.exports = nextConfig
