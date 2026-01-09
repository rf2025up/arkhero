#!/bin/bash
set -e

echo "🚀 启动 ArkOK V2 应用..."

# 检测环境并设置工作目录
if [ -d "/app/server" ]; then
  cd /app/server
  echo "🐳 容器环境"
elif [ -d "arkok-v2/server" ]; then
  cd arkok-v2/server
  echo "💻 本地环境"
else
  echo "❌ 错误：找不到 server 目录"
  exit 1
fi

# 设置生产环境
export NODE_ENV=production
export PORT=${PORT:-3000}

# 数据库迁移（幂等操作）
echo "🗄️  同步数据库结构..."
npx prisma migrate deploy || echo "⚠️  迁移失败，继续启动"

# 启动应用
echo "▶️  启动服务器（端口：$PORT）..."
exec node dist/src/index.js
