/**
 * 五维内功修炼系统 - 技能服务
 * 处理技能修炼记录、五维属性增益、成就解锁等核心逻辑
 */
declare class SkillService {
    private io;
    setSocket(io: any): void;
    /**
     * 获取技能库列表
     */
    getSkillLibrary(): Promise<any>;
    /**
     * 获取学生五维属性
     */
    getStudentStats(studentId: string): Promise<any>;
    /**
     * 获取学生技能列表及进度
     */
    getStudentSkills(studentId: string): Promise<any>;
    /**
     * 记录一次技能修炼（教师认证触发）
     */
    recordPractice(params: {
        studentId: string;
        skillCode: string;
        expGained?: number;
        certifiedBy: string;
        taskId?: string;
        note?: string;
    }): Promise<{
        success: boolean;
        skill: any;
        expGained: number;
        newExp: any;
        newLevel: number;
        levelUp: boolean;
    }>;
    /**
     * 增加五维属性经验
     */
    addAttributeExp(studentId: string, attribute: string, exp: number): Promise<void>;
    /**
     * 更新连胜记录
     */
    updateStreak(studentId: string, increment?: boolean): Promise<void>;
    /**
     * 🆕 重新过关成功奖励 g_retry (百折不挠)
     */
    awardRetrySkill(studentId: string, taskName: string, certifiedBy: string): Promise<void>;
    /**
     * 批量认证技能（教师端过关页使用）
     */
    batchCertify(params: {
        studentId: string;
        skillCodes: string[];
        certifiedBy: string;
        taskId?: string;
    }): Promise<any[]>;
    private calculateLevel;
    private getLevelTitle;
    private getNextLevelExp;
}
export declare const skillService: SkillService;
export {};
//# sourceMappingURL=skill.service.d.ts.map