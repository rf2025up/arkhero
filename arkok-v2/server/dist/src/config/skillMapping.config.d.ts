/**
 * 五维内功映射系统 - 任务-技能映射配置
 * 平衡修订版 v1.1 (2026-01-08)
 *
 * 核心调整策略：
 * 1. 削减费曼（De-Feynman）：从10→5
 * 2. 规划力前置（Planning First）
 * 3. 细化毅力（Refining Grit）
 */
export declare const TASK_SKILL_MAPPING: Record<string, string>;
export declare const STREAK_MILESTONES: number[];
export declare const SKILL_TO_DIMENSION: Record<string, string>;
/**
 * 根据任务名称获取对应的技能代码
 */
export declare function getSkillCodeByTask(taskName: string): string | null;
/**
 * 检查连胜是否达到里程碑
 */
export declare function isStreakMilestone(streakCount: number): boolean;
//# sourceMappingURL=skillMapping.config.d.ts.map