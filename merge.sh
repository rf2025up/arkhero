#!/bin/bash
# 代码合并脚本 - 保留本地UI优化 + 获取远程架构升级
# 作者: Claude
# 日期: 2026-01-09

set -e  # 遇到错误立即退出

echo "========================================="
echo "🚀 开始合并代码"
echo "========================================="

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Step 1: 检查状态
echo -e "${YELLOW}📋 Step 1: 检查当前状态${NC}"
git status --short
echo ""

# Step 2: 提交本地修改
echo -e "${YELLOW}📦 Step 2: 提交本地修改${NC}"
git add arkok-v2/client/src/pages/ExperienceAccounts.tsx || true
git add arkok-v2/client/src/pages/EmpowermentHub.tsx || true
git add arkok-v2/server/src/app.ts || true
git add entrypoint.sh || true
git add arkok-v2/client/public/新手村向导.html || true
git add arkok-v2/client/src/components/FiveDimensionGuide.tsx || true

git commit -m "feat: 保留本地UI优化和DevBox配置

- 页面左上角添加新手村向导按钮
- 调整构建路径为 ../../client/dist
- 添加 DevBox entrypoint.sh 启动脚本
- 保留本地新手村向导.html版本
" || echo "没有需要提交的本地修改"

echo -e "${GREEN}✅ 本地修改已提交${NC}"
echo ""

# Step 3: 拉取远程代码
echo -e "${YELLOW}📥 Step 3: 拉取远程代码${NC}"
git fetch origin main
echo -e "${GREEN}✅ 远程代码已获取${NC}"
echo ""

# Step 4: 创建合并提交
echo -e "${YELLOW}🔀 Step 4: 合并远程代码${NC}"
if git merge origin/main --no-rebase; then
    echo -e "${GREEN}✅ 自动合并成功！${NC}"
else
    echo -e "${RED}❌ 检测到冲突，需要手动解决${NC}"
    echo ""
    echo "冲突文件："
    git status --short | grep "^UU"
    echo ""
    echo "请按以下步骤解决冲突："
    echo "1. 编辑冲突文件，查找 <<<<<<<, =======, >>>>>>> 标记"
    echo "2. 选择要保留的代码（参考 MERGE_PLAN.md）"
    echo "3. 删除冲突标记"
    echo "4. 运行: git add <冲突文件>"
    echo "5. 运行: git commit"
    echo ""
    exit 1
fi
echo ""

# Step 5: 检查是否有未合并的路径
if git status --porcelain | grep -q "^UU"; then
    echo -e "${RED}❌ 存在未解决的冲突${NC}"
    git status --short | grep "^UU"
    exit 1
fi

echo -e "${GREEN}=========================================${NC}"
echo -e "${GREEN}🎉 代码合并完成！${NC}"
echo -e "${GREEN}=========================================${NC}"
echo ""
echo "下一步："
echo "1. 测试应用功能：npm run dev 或 docker-compose up"
echo "2. 检查大屏显示是否正常"
echo "3. 检查新手村向导按钮是否显示"
echo "4. 如果一切正常，推送到远程：git push origin main"
echo ""
echo "如有问题，回滚到备份分支："
echo "git reset --hard backup-before-merge-$(date +%Y%m%d)"
