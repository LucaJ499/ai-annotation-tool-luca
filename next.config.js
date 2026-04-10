/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // 开启独立部署模式，极大缩小 Docker 镜像体积，适合字节内部部署
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client'],
  },
}

module.exports = nextConfig
