/**
 * 任务名 - 技能ID 映射表 (后端)
 * 用于在任务完成时自动关联技能修炼
 */
export declare const TASK_SKILL_MAPPING: Record<string, string>;
/**
 * 获取任务对应的技能ID
 */
export declare const getSkillCodeByTaskName: (taskName: string) => string | null;
//# sourceMappingURL=taskSkillMapping.d.ts.map