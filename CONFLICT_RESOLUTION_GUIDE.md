# 冲突解决详细指南

## 冲突文件 1: arkok-v2/client/src/components/BigScreen/DataDashboard.tsx

### 🔍 冲突位置 1: levelTitle 字段定义

**本地版本 (HEAD):**
```typescript
levelTitle: string;     // 等级名称（如：融会贯通）
```

**远程版本 (origin/main):**
```typescript
levelTitle?: string;  // 🆕 等级称号
```

**✅ 推荐解决方案:**
```typescript
levelTitle?: string;  // 🆕 等级称号（兼容性更好，允许空值）
```

**原因：**
- 使用可选类型 `?` 更灵活，兼容新旧数据
- 远程的新架构（levelConfig.ts）已经处理了默认值逻辑

---

### 🔍 冲突位置 2: 冠军面板 hover 样式

**本地版本 (HEAD):**
```tsx
<div
  className="mb-[2vh] text-center shrink-0 cursor-pointer hover:bg-white/5 rounded-[2vh] p-[1vh] transition-colors"
  onClick={() => setSelectedStudentId(data.students[0].id)}
>
```

**远程版本 (origin/main):**
```tsx
<div
  className="mb-[2vh] text-center shrink-0 cursor-pointer hover:scale-105 transition-transform"
  onClick={() => setSelectedStudentId(data?.students?.[0]?.id)}
>
```

**✅ 推荐解决方案（保留本地样式）：**
```tsx
<div
  className="mb-[2vh] text-center shrink-0 cursor-pointer hover:bg-white/5 rounded-[2vh] p-[1vh] transition-colors"
  onClick={() => setSelectedStudentId(data?.students?.[0]?.id)}
>
```

**修改点：**
1. 保留本地的 `hover:bg-white/5`（更柔和的背景高亮）
2. 保留本地的 `rounded-[2vh] p-[1vh]`（更好的内边距）
3. 使用远程的可选链 `data?.students?.[0]?.id`（更安全）

---

### 🔍 冲突位置 3: Lv. 标签样式

**本地版本 (HEAD):**
```tsx
<span className="lv-tag-gold">Lv.{data.students[0].level}</span>
```

**远程版本 (origin/main):**
```tsx
<span className="lv-tag-gold text-[1.2vh] px-2 py-0.5">Lv.{data?.students?.[0]?.level}</span>
```

**✅ 推荐解决方案（使用远程样式）：**
```tsx
<span className="lv-tag-gold text-[1.2vh] px-2 py-0.5">Lv.{data?.students?.[0]?.level}</span>
```

**原因：**
- 远程的样式更精细，有明确的字号和内边距控制
- 可选链 `?.` 更安全

---

## 冲突文件 2: arkok-v2/server/src/services/dashboard.service.ts

### 🔍 冲突位置 1: levelTitle 字段定义

**本地版本 (HEAD):**
```typescript
levelTitle: string;      // 等级名称（如：融会贯通）
```

**远程版本 (origin/main):**
```typescript
levelTitle?: string;  // 🆕 等级称号
```

**✅ 推荐解决方案:**
```typescript
levelTitle?: string;  // 🆕 等级称号
```

---

### 🔍 冲突位置 2: calculateLevelProgress 函数

**本地版本 (HEAD):**
```typescript
// 辅助函数：计算等级进度（基于经验等级表）
function calculateLevelProgress(exp: number) {
  // 经验等级表（累计经验）
  const levelThresholds = [
    0,      // Lv.1
    500,    // Lv.2
    1500,   // Lv.3
    3000,   // Lv.4
    5000,   // Lv.5
    7500,   // Lv.6
    10500,  // Lv.7
    14000,  // Lv.8
    18000,  // Lv.9
    23000   // Lv.10
  ];

  // 等级称号
  const levelTitles = [
    '初窥门径',  // Lv.1
    '略有小成',  // Lv.2
    '驾轻就熟',  // Lv.3
    '融会贯通',  // Lv.4
    '炉火纯青',  // Lv.5
    '出类拔萃',  // Lv.6
    '神乎其技',  // Lv.7
    '登峰造极',  // Lv.8
    '返璞归真',  // Lv.9
    '一代宗师'   // Lv.10
  ];

  // 计算等级和进度...
  return {
    level,
    levelTitle,
    expProgress,
    expForNextLevel
  };
}
```

**远程版本 (origin/main):**
```typescript
// 辅助函数：计算等级进度（使用新的等级配置）
function calculateLevelProgress(exp: number, multiplier: number = 1.0) {
  const { getLevelInfo } = require('../config/levelConfig');
  const info = getLevelInfo(exp, multiplier);

  return {
    level: info.level,
    levelTitle: info.title,
    expProgress: info.progress,
    expForNextLevel: info.expNeededForNext,
    isMaxLevel: info.isMaxLevel
  };
}
```

**✅ 推荐解决方案（使用远程新架构）：**
```typescript
// 辅助函数：计算等级进度（使用新的等级配置）
function calculateLevelProgress(exp: number, multiplier: number = 1.0) {
  const { getLevelInfo } = require('../config/levelConfig');
  const info = getLevelInfo(exp, multiplier);

  return {
    level: info.level,
    levelTitle: info.title || '初窥门径',  // 🆕 确保始终有默认值
    expProgress: info.progress,
    expForNextLevel: info.expNeededForNext,
    isMaxLevel: info.isMaxLevel
  };
}
```

**原因：**
1. 远程使用配置文件 `levelConfig.ts`，更灵活、可维护
2. 支持 `multiplier` 参数，可以调整经验倍率
3. 添加了 `|| '初窥门径'` 确保向后兼容

---

## 🔧 实际操作步骤

### 方法 1: 手动编辑（推荐，理解更深入）

1. **打开冲突文件:**
   ```bash
   nano arkok-v2/client/src/components/BigScreen/DataDashboard.tsx
   # 或使用你喜欢的编辑器
   ```

2. **查找冲突标记:**
   ```bash
   # 搜索 <<<<<<< 标记
   ```

3. **按照上述指南选择代码:**
   - 删除 `<<<<<<< HEAD` 到 `=======` 之间的本地版本
   - 删除 `=======` 到 `>>>>>>> origin/main` 之间的远程版本
   - 保留推荐解决方案的代码
   - 删除所有冲突标记

4. **保存并标记已解决:**
   ```bash
   git add arkok-v2/client/src/components/BigScreen/DataDashboard.tsx
   git add arkok-v2/server/src/services/dashboard.service.ts
   ```

---

### 方法 2: 使用合并工具（更直观）

```bash
# 使用 VSCode 的合并工具
code --wait arkok-v2/client/src/components/BigScreen/DataDashboard.tsx

# 或使用 meld
meld arkok-v2/client/src/components/BigScreen/DataDashboard.tsx
```

---

### 方法 3: 使用 git 命令快速选择

```bash
# 对于 DataDashboard.tsx，主要保留本地UI样式
git checkout --ours arkok-v2/client/src/components/BigScreen/DataDashboard.tsx
# 然后手动修改 levelTitle 为可选类型

# 对于 dashboard.service.ts，使用远程的新架构
git checkout --theirs arkok-v2/server/src/services/dashboard.service.ts
# 然后手动添加默认值保护
```

---

## ✅ 验证清单

解决冲突后，请检查：

- [ ] 删除所有 `<<<<<<<`, `=======`, `>>>>>>>` 标记
- [ ] 文件可以正常编译：`npm run build`
- [ ] 大屏等级显示正常
- [ ] 经验值计算正确
- [ ] 没有TypeScript类型错误

---

## 🆘 如果出错了

### 中止合并
```bash
git merge --abort
git reset --hard backup-before-merge-20260109
```

### 重新开始
```bash
# 回到合并前
git reset --hard HEAD~1

# 重新执行合并脚本
./merge.sh
```
