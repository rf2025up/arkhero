import { PrismaClient } from '@prisma/client';
export declare const STREAK_CATEGORIES: {
    readonly CN_HOMEWORK: "cn_homework";
    readonly CN_DICTATION: "cn_dictation";
    readonly CN_RECITATION: "cn_recitation";
    readonly CN_DICTATION_WRITING: "cn_dictation_writing";
    readonly CN_COMPREHENSION: "cn_comprehension";
    readonly MATH_HOMEWORK: "math_homework";
    readonly MATH_CALCULATION: "math_calculation";
    readonly MATH_WORKBOOK: "math_workbook";
    readonly EN_HOMEWORK: "en_homework";
    readonly EN_LISTENING: "en_listening";
    readonly EN_VOCABULARY: "en_vocabulary";
};
export type StreakCategory = typeof STREAK_CATEGORIES[keyof typeof STREAK_CATEGORIES];
export declare class CategoryStreakService {
    private prisma;
    constructor(prisma: PrismaClient);
    /**
     * 🆕 根据任务标题自动更新连胜
     * 包含全链路同步：自动创建不存在的分类定义
     */
    updateStreakByTask(studentId: string, taskTitle: string, schoolId: string): Promise<{
        currentStreak: number;
        maxStreak: number;
    }>;
    /**
     * 更新某类别的连胜
     * @param studentId 学生ID
     * @param category 任务类别代码
     * @param isPerfect 是否完美完成（true=连胜+1，false=重置）
     */
    updateStreak(studentId: string, category: string, isPerfect: boolean): Promise<{
        currentStreak: number;
        maxStreak: number;
    }>;
    /**
     * 获取学生某类别的连胜数据
     */
    getStreak(studentId: string, category: string): Promise<{
        currentStreak: number;
        maxStreak: number;
    }>;
    /**
     * 获取学生所有类别的连胜数据
     */
    /**
     * 获取学生所有类别的连胜数据 (带中文标签)
     */
    getAllStreaks(studentId: string): Promise<{
        category: string;
        categoryLabel: string;
        currentStreak: number;
        maxStreak: number;
        subject: string;
    }[]>;
    /**
     * 获取某类别的排行榜
     * @param category 任务类别
     * @param limit 返回数量
     */
    getLeaderboard(category: string, limit?: number): Promise<{
        rank: number;
        student: {
            id: string;
            name: string;
            className: string;
            avatarUrl: string;
        };
        currentStreak: number;
        maxStreak: number;
    }[]>;
    /**
     * 获取按学科聚合的排行榜
     * @param schoolId 学校ID
     * @param subject 学科 (chinese, math, english)
     * @param limit 返回数量
     */
    getSubjectLeaderboard(schoolId: string, subject: string, limit?: number): Promise<any[]>;
    getCategories(schoolId: string): Promise<{
        id: string;
        schoolId: string;
        name: string;
        createdAt: Date;
        subject: string;
        code: string;
        isDefault: boolean;
    }[]>;
    addCategory(schoolId: string, subject: string, name: string, code: string): Promise<{
        id: string;
        schoolId: string;
        name: string;
        createdAt: Date;
        subject: string;
        code: string;
        isDefault: boolean;
    }>;
    deleteCategory(id: string): Promise<{
        id: string;
        schoolId: string;
        name: string;
        createdAt: Date;
        subject: string;
        code: string;
        isDefault: boolean;
    }>;
}
//# sourceMappingURL=category-streak.service.d.ts.map