#!/bin/bash

# DevBox 部署脚本
# 每次从 GitHub 拉取代码后运行此脚本

echo "🚀 开始部署..."

# 1. 拉取最新代码
echo "📥 拉取最新代码..."
git pull origin main

# 2. 安装/更新依赖
echo "📦 安装依赖..."
cd client && npm install
cd ../server && npm install
cd ..

# 3. 复制环境变量（如果不存在）
if [ ! -f "server/.env" ]; then
    echo "⚠️  警告: server/.env 文件不存在，请手动创建"
fi

if [ ! -f "client/.env" ]; then
    echo "⚠️  警告: client/.env 文件不存在，请手动创建"
fi

# 4. 重启服务（根据 DevBox 环境调整）
echo "🔄 重启服务..."

# 停止现有进程
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "ts-node" 2>/dev/null || true

# 等待进程完全停止
sleep 2

# 启动后端
echo "🔧 启动后端服务..."
cd server
NODE_ENV=development npx ts-node src/index.ts &
cd ..

# 等待后端启动
sleep 3

# 启动前端
echo "🎨 启动前端服务..."
cd client
npm run dev &
cd ..

echo "✅ 部署完成！"
echo "📌 前端: http://localhost:5173"
echo "📌 后端: http://localhost:3001"
