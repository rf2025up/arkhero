"use strict";
/**
 * 学生等级称号系统配置
 * 基于总经验值的等级划分
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.STREAK_MILESTONE_EXP = exports.EXP_MULTIPLIER = exports.MAX_LEVEL = exports.LEVEL_CONFIG = void 0;
exports.calculateLevelFromExp = calculateLevelFromExp;
exports.getLevelTitle = getLevelTitle;
exports.getLevelInfo = getLevelInfo;
exports.getStreakMilestoneExp = getStreakMilestoneExp;
// 等级定义（累计经验阈值）
// 基于每天 100-150 exp，一学年约 200 天 = 20000-30000 exp
exports.LEVEL_CONFIG = [
    { level: 1, title: '初窥门径', expRequired: 0, expToNext: 500 }, // 初始
    { level: 2, title: '略有小成', expRequired: 500, expToNext: 1000 }, // ~1周
    { level: 3, title: '驾轻就熟', expRequired: 1500, expToNext: 1500 }, // ~2周
    { level: 4, title: '融会贯通', expRequired: 3000, expToNext: 2000 }, // ~1个月
    { level: 5, title: '炉火纯青', expRequired: 5000, expToNext: 2500 }, // ~1.5个月
    { level: 6, title: '出类拔萃', expRequired: 7500, expToNext: 3000 }, // ~2个月 (期中)
    { level: 7, title: '神乎其技', expRequired: 10500, expToNext: 3500 }, // ~3个月
    { level: 8, title: '登峰造极', expRequired: 14000, expToNext: 4000 }, // ~4个月 (学期末)
    { level: 9, title: '返璞归真', expRequired: 18000, expToNext: 5000 }, // ~5个月
    { level: 10, title: '一代宗师', expRequired: 23000, expToNext: null }, // 满级 (学年末)
];
// 最大等级
exports.MAX_LEVEL = 10;
/**
 * 根据总经验值计算等级
 */
function calculateLevelFromExp(totalExp) {
    for (let i = exports.LEVEL_CONFIG.length - 1; i >= 0; i--) {
        if (totalExp >= exports.LEVEL_CONFIG[i].expRequired) {
            return exports.LEVEL_CONFIG[i].level;
        }
    }
    return 1;
}
/**
 * 获取等级称号
 */
function getLevelTitle(level) {
    const config = exports.LEVEL_CONFIG.find(l => l.level === level);
    return config?.title || '初窥门径';
}
/**
 * 全局经验倍率（用于动态调整升级速度）
 * 1.0 = 正常速度
 * 0.5 = 升级变快（经验值翻倍计算）
 * 1.5 = 升级变慢（经验值打折计算）
 *
 * 调整说明：
 * - 如果发现学生升级太快，增加此值（如 1.2）
 * - 如果发现学生升级太慢，降低此值（如 0.8）
 */
exports.EXP_MULTIPLIER = 1.0;
/**
 * 获取等级详细信息（用于前端显示进度条）
 * @param totalExp 学生的原始总经验值
 * @param multiplier 全局经验倍率 (默认使用配置常量)
 */
function getLevelInfo(totalExp, multiplier = exports.EXP_MULTIPLIER) {
    // 应用全局倍率：经验值 / 倍率 = 调整后经验
    // 倍率 > 1 时升级变慢，倍率 < 1 时升级变快
    const adjustedExp = Math.floor(totalExp / multiplier);
    const level = calculateLevelFromExp(adjustedExp);
    const config = exports.LEVEL_CONFIG.find(l => l.level === level);
    const nextConfig = exports.LEVEL_CONFIG.find(l => l.level === level + 1);
    const currentLevelExp = config.expRequired;
    const nextLevelExp = nextConfig?.expRequired || currentLevelExp;
    const expInCurrentLevel = adjustedExp - currentLevelExp;
    const expNeededForNext = nextLevelExp - currentLevelExp;
    const progress = nextConfig
        ? Math.min(100, Math.floor((expInCurrentLevel / expNeededForNext) * 100))
        : 100; // 满级
    return {
        level,
        title: config.title,
        totalExp, // 返回原始经验值（显示用）
        adjustedExp, // 返回调整后经验值（调试用）
        currentLevelExp: Math.floor(currentLevelExp * multiplier), // 显示用
        nextLevelExp: nextConfig ? Math.floor(nextLevelExp * multiplier) : null,
        expInCurrentLevel,
        expNeededForNext: nextConfig ? Math.floor(expNeededForNext * multiplier) : 0,
        progress,
        isMaxLevel: !nextConfig,
        multiplier
    };
}
/**
 * g_streak 连胜里程碑经验奖励（差异化）
 */
exports.STREAK_MILESTONE_EXP = {
    3: 10, // 3次连胜 +10 exp
    7: 30, // 7次连胜 +30 exp
    14: 60, // 14次连胜 +60 exp
    21: 100, // 21次连胜 +100 exp
    30: 150, // 30次连胜 +150 exp
    50: 250, // 50次连胜 +250 exp
    100: 500, // 100次连胜 +500 exp
};
/**
 * 获取连胜里程碑奖励经验值
 */
function getStreakMilestoneExp(streakCount) {
    return exports.STREAK_MILESTONE_EXP[streakCount] || null;
}
//# sourceMappingURL=levelConfig.js.map