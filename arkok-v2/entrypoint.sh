#!/bin/bash
set -e

# ArkOK V2 - DevBox 应用启动脚本
# 此脚本在生产环境中启动应用

echo "🚀 启动 ArkOK V2 应用..."

# 设置工作目录
cd /app/server

# 设置 Node.js 生产环境
export NODE_ENV=production

# 检查必需的环境变量
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  警告: DATABASE_URL 环境变量未设置"
  echo "    请在 DevBox 应用管理中配置数据库连接字符串"
fi

# 检查端口配置
export PORT=${PORT:-3000}
echo "📌 应用端口: $PORT"

# 生成 Prisma 客户端
echo "🔧 生成 Prisma 客户端..."
npx prisma generate

# 运行数据库迁移（生产环境安全模式）
echo "🗄️  执行数据库迁移..."
npx prisma migrate deploy || {
  echo "⚠️  数据库迁移失败，尝试继续启动..."
  echo "    如果遇到数据库相关错误，请检查 DATABASE_URL 配置"
}

# 启动应用
echo "▶️  启动 Node.js 服务器..."
exec node dist/src/index.js
