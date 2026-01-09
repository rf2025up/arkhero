/**
 * 学生等级称号系统配置
 * 基于总经验值的等级划分
 */
export declare const LEVEL_CONFIG: readonly [{
    readonly level: 1;
    readonly title: "初窥门径";
    readonly expRequired: 0;
    readonly expToNext: 500;
}, {
    readonly level: 2;
    readonly title: "略有小成";
    readonly expRequired: 500;
    readonly expToNext: 1000;
}, {
    readonly level: 3;
    readonly title: "驾轻就熟";
    readonly expRequired: 1500;
    readonly expToNext: 1500;
}, {
    readonly level: 4;
    readonly title: "融会贯通";
    readonly expRequired: 3000;
    readonly expToNext: 2000;
}, {
    readonly level: 5;
    readonly title: "炉火纯青";
    readonly expRequired: 5000;
    readonly expToNext: 2500;
}, {
    readonly level: 6;
    readonly title: "出类拔萃";
    readonly expRequired: 7500;
    readonly expToNext: 3000;
}, {
    readonly level: 7;
    readonly title: "神乎其技";
    readonly expRequired: 10500;
    readonly expToNext: 3500;
}, {
    readonly level: 8;
    readonly title: "登峰造极";
    readonly expRequired: 14000;
    readonly expToNext: 4000;
}, {
    readonly level: 9;
    readonly title: "返璞归真";
    readonly expRequired: 18000;
    readonly expToNext: 5000;
}, {
    readonly level: 10;
    readonly title: "一代宗师";
    readonly expRequired: 23000;
    readonly expToNext: any;
}];
export declare const MAX_LEVEL = 10;
/**
 * 根据总经验值计算等级
 */
export declare function calculateLevelFromExp(totalExp: number): number;
/**
 * 获取等级称号
 */
export declare function getLevelTitle(level: number): string;
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
export declare const EXP_MULTIPLIER = 1;
/**
 * 获取等级详细信息（用于前端显示进度条）
 * @param totalExp 学生的原始总经验值
 * @param multiplier 全局经验倍率 (默认使用配置常量)
 */
export declare function getLevelInfo(totalExp: number, multiplier?: number): {
    level: number;
    title: "初窥门径" | "略有小成" | "驾轻就熟" | "融会贯通" | "炉火纯青" | "出类拔萃" | "神乎其技" | "登峰造极" | "返璞归真" | "一代宗师";
    totalExp: number;
    adjustedExp: number;
    currentLevelExp: number;
    nextLevelExp: number;
    expInCurrentLevel: number;
    expNeededForNext: number;
    progress: number;
    isMaxLevel: boolean;
    multiplier: number;
};
/**
 * g_streak 连胜里程碑经验奖励（差异化）
 */
export declare const STREAK_MILESTONE_EXP: Record<number, number>;
/**
 * 获取连胜里程碑奖励经验值
 */
export declare function getStreakMilestoneExp(streakCount: number): number | null;
//# sourceMappingURL=levelConfig.d.ts.map