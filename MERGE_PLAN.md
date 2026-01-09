# 代码合并计划 - 2026-01-09

## 📊 版本对比总结

### 远程新增功能（必须保留）
1. **架构升级**
   - `levelConfig.ts` - 新的等级配置系统
   - `skillMapping.config.ts` - 任务-技能映射配置（180行）

2. **荣誉勋章系统**
   - 荣誉勋章图片（gold/silver/bronze）
   - `reward.routes.ts` 新增荣誉勋章路由

3. **文档完善**
   - 新手村向导.html - 新增第七章
   - 五维修炼.md - 新增第二十章

### 本地特有修改（需要保留）
1. **页面UI风格**
   - ExperienceAccounts.tsx - 左上角新手村向导按钮
   - EmpowermentHub.tsx - 左上角新手村向导按钮
   - 本地新手村向导.html - 你的版本

2. **大屏UI优化**
   - DataDashboard.tsx - hover效果、样式调整
   - levelTitle字段处理（必填 vs 可选）

3. **构建配置**
   - app.ts - clientPath调整
   - entrypoint.sh - DevBox启动脚本

## 🎯 合并策略

### 方案：保留远程架构 + 保留本地UI

#### 冲突文件1: DataDashboard.tsx
**冲突点：**
- 本地：`levelTitle: string` (必填)
- 远程：`levelTitle?: string` (可选)
- UI样式：hover效果不同

**解决方案：**
```typescript
// 使用远程的可选类型（兼容性更好）
levelTitle?: string;

// 但保留本地的UI样式
hover:bg-white/5 rounded-[2vh] p-[1vh] transition-colors
```

#### 冲突文件2: dashboard.service.ts
**冲突点：**
- 本地：硬编码等级计算
- 远程：使用levelConfig.ts

**解决方案：**
```typescript
// 使用远程的新架构（更灵活）
const { getLevelInfo } = require('../config/levelConfig');
const info = getLevelInfo(exp, multiplier);

// 但确保levelTitle始终有值（向后兼容）
levelTitle: info.title || '初窥门径'
```

#### 重复添加问题: ExperienceAccounts.tsx & EmpowermentHub.tsx
**问题：** 本地和远程都添加了新手村向导按钮

**解决方案：**
- 保留本地版本（你的风格）
- 检查远程HTML，如果远程也添加了，则需要选择一个

#### 文件冲突: 新手村向导.html
**问题：** 本地和远程是不同版本

**解决方案：**
- 使用远程版本（包含第七章等新内容）
- 如果本地有特殊样式，手动合并到远程版本

## 📝 具体操作步骤

### Step 1: 提交本地修改
```bash
git add arkok-v2/client/src/pages/ExperienceAccounts.tsx
git add arkok-v2/client/src/pages/EmpowermentHub.tsx
git add arkok-v2/server/src/app.ts
git add entrypoint.sh
git add arkok-v2/client/public/新手村向导.html
git commit -m "feat: 保留本地UI优化和DevBox配置"
```

### Step 2: 合并远程代码
```bash
git pull origin main --no-rebase
```

### Step 3: 解决冲突

#### 3.1 DataDashboard.tsx
```bash
# 选择远程的levelTitle类型，保留本地的UI样式
```

#### 3.2 dashboard.service.ts
```bash
# 使用远程的新架构，确保向后兼容
```

### Step 4: 提交合并结果
```bash
git add .
git commit -m "merge: 合并远程更新，保留本地UI优化"

git push origin main
```

## ⚠️ 注意事项

1. **测试重点：**
   - 大屏显示是否正常
   - 等级计算是否正确
   - 新手村向导按钮是否显示

2. **回滚方案：**
   - 如果有问题，回滚到备份分支
   - `git reset --hard backup-before-merge-20260109`

3. **验证清单：**
   - [ ] 大屏等级显示正常
   - [ ] 经验值计算正确
   - [ ] 新手村向导按钮可见
   - [ ] 荣誉勋章功能可用
   - [ ] 任务映射配置生效

## 📞 如果遇到问题

1. 查看冲突标记：`git status`
2. 查看具体差异：`git diff HEAD`
3. 中止合并：`git merge --abort`
4. 恢复备份：`git reset --hard backup-before-merge-20260109`
