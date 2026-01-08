"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryStreakService = exports.STREAK_CATEGORIES = void 0;
const streakMapping_1 = require("../utils/streakMapping");
// 任务分类代码常量
exports.STREAK_CATEGORIES = {
    // 语文
    CN_HOMEWORK: 'cn_homework',
    CN_DICTATION: 'cn_dictation',
    CN_RECITATION: 'cn_recitation',
    CN_DICTATION_WRITING: 'cn_dictation_writing',
    CN_COMPREHENSION: 'cn_comprehension',
    // 数学
    MATH_HOMEWORK: 'math_homework',
    MATH_CALCULATION: 'math_calculation',
    MATH_WORKBOOK: 'math_workbook',
    // 英语
    EN_HOMEWORK: 'en_homework',
    EN_LISTENING: 'en_listening',
    EN_VOCABULARY: 'en_vocabulary',
};
class CategoryStreakService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * 🆕 根据任务标题自动更新连胜
     * 包含全链路同步：自动创建不存在的分类定义
     */
    async updateStreakByTask(studentId, taskTitle, schoolId) {
        // 1. 解析任务标题 -> 连胜分类
        const streakCat = (0, streakMapping_1.getStreakCategory)(taskTitle);
        if (!streakCat) {
            // 如果不在基础映射中，检查是否有自定义的精确匹配
            // 这里我们暂时跳过，只支持“依照基础过关项”的规则
            return null;
        }
        // 2. 确保分类定义存在 (自动同步新内容)
        await this.prisma.streak_category_items.upsert({
            where: { schoolId_code: { schoolId, code: streakCat.code } },
            update: {}, // 存在则不更新
            create: {
                schoolId,
                code: streakCat.code,
                name: streakCat.name,
                subject: streakCat.subject,
                isDefault: true
            }
        });
        // 3. 更新连胜 (+1)
        return this.updateStreak(studentId, streakCat.code, true);
    }
    /**
     * 更新某类别的连胜
     * @param studentId 学生ID
     * @param category 任务类别代码
     * @param isPerfect 是否完美完成（true=连胜+1，false=重置）
     */
    async updateStreak(studentId, category, isPerfect) {
        const existing = await this.prisma.category_streaks.findUnique({
            where: { studentId_category: { studentId, category } }
        });
        if (isPerfect) {
            const newStreak = (existing?.currentStreak || 0) + 1;
            const newMax = Math.max(newStreak, existing?.maxStreak || 0);
            const result = await this.prisma.category_streaks.upsert({
                where: { studentId_category: { studentId, category } },
                update: { currentStreak: newStreak, maxStreak: newMax },
                create: { studentId, category, currentStreak: newStreak, maxStreak: newMax }
            });
            return { currentStreak: result.currentStreak, maxStreak: result.maxStreak };
        }
        else {
            // 重置连胜
            if (existing && existing.currentStreak > 0) {
                await this.prisma.category_streaks.update({
                    where: { studentId_category: { studentId, category } },
                    data: { currentStreak: 0 }
                });
            }
            return { currentStreak: 0, maxStreak: existing?.maxStreak || 0 };
        }
    }
    /**
     * 获取学生某类别的连胜数据
     */
    async getStreak(studentId, category) {
        const streak = await this.prisma.category_streaks.findUnique({
            where: { studentId_category: { studentId, category } }
        });
        return {
            currentStreak: streak?.currentStreak || 0,
            maxStreak: streak?.maxStreak || 0
        };
    }
    /**
     * 获取学生所有类别的连胜数据
     */
    /**
     * 获取学生所有类别的连胜数据 (带中文标签)
     */
    async getAllStreaks(studentId) {
        // 1. 获取学生所在学校
        const student = await this.prisma.students.findUnique({
            where: { id: studentId },
            select: { schoolId: true }
        });
        if (!student)
            return [];
        // 2. 获取该学校的所有连胜分类定义
        const categoryItems = await this.prisma.streak_category_items.findMany({
            where: { schoolId: student.schoolId }
        });
        // 建立 code -> name 映射
        const categoryMap = new Map();
        categoryItems.forEach(item => {
            categoryMap.set(item.code, item.name);
        });
        // 3. 获取连胜记录
        const streaks = await this.prisma.category_streaks.findMany({
            where: { studentId }
        });
        // 创建连胜记录映射
        const streakMap = new Map(streaks.map(s => [s.category, s]));
        // 4. 合并所有分类 (确保即使没有连胜也能显示所有项目)
        // 🆕 按学科顺序排序：语 -> 数 -> 英 -> 其他
        const subjectOrder = { 'chinese': 1, 'math': 2, 'english': 3, 'other': 4 };
        const result = categoryItems.map(item => {
            const streak = streakMap.get(item.code);
            return {
                category: item.code,
                categoryLabel: item.name,
                currentStreak: streak?.currentStreak || 0,
                maxStreak: streak?.maxStreak || 0,
                subject: item.subject || 'other'
            };
        });
        // 排序：先按学科，再按默认顺序(id)
        return result.sort((a, b) => {
            const orderA = subjectOrder[a.subject] || 99;
            const orderB = subjectOrder[b.subject] || 99;
            return orderA - orderB;
        });
    }
    /**
     * 获取某类别的排行榜
     * @param category 任务类别
     * @param limit 返回数量
     */
    async getLeaderboard(category, limit = 10) {
        const leaderboard = await this.prisma.category_streaks.findMany({
            where: { category, currentStreak: { gt: 0 } },
            orderBy: { currentStreak: 'desc' },
            take: limit,
            include: {
                student: {
                    select: { id: true, name: true, className: true, avatarUrl: true }
                }
            }
        });
        return leaderboard.map((item, index) => ({
            rank: index + 1,
            student: item.student,
            currentStreak: item.currentStreak,
            maxStreak: item.maxStreak
        }));
    }
    /**
     * 获取按学科聚合的排行榜
     * @param schoolId 学校ID
     * @param subject 学科 (chinese, math, english)
     * @param limit 返回数量
     */
    async getSubjectLeaderboard(schoolId, subject, limit = 10) {
        // 1. 获取该学科的所有分类 code (来自配置)
        const categoryItems = await this.prisma.streak_category_items.findMany({
            where: { schoolId, subject },
            select: { code: true }
        });
        const configuredCodes = categoryItems.map(c => c.code);
        // 2. 定义学科对应的前缀
        const subjectPrefixes = {
            'chinese': 'cn_',
            'math': 'math_',
            'english': 'en_'
        };
        const prefix = subjectPrefixes[subject];
        // 3. 聚合每个学生在该学科下的最高连胜
        // 我们包含：1. 明确配置的 code；2. 符合学科前缀的 code
        const streaks = await this.prisma.category_streaks.findMany({
            where: {
                OR: [
                    { category: { in: configuredCodes } },
                    ...(prefix ? [{ category: { startsWith: prefix } }] : [])
                ],
                currentStreak: { gt: 0 },
                student: { schoolId }
            },
            include: {
                student: {
                    select: { id: true, name: true, className: true, avatarUrl: true }
                }
            }
        });
        // 3. 内存中按学生 ID 分组并取最大值
        const studentBestMap = new Map();
        streaks.forEach(s => {
            const existing = studentBestMap.get(s.studentId);
            if (!existing || s.currentStreak > existing.currentStreak) {
                studentBestMap.set(s.studentId, {
                    student: s.student,
                    currentStreak: s.currentStreak,
                    maxStreak: s.maxStreak, // 这里的 maxStreak 是该分类的 max，也算合理
                    category: s.category
                });
            }
        });
        // 4. 获取涉及到的所有分类名称
        const categoryCodes = Array.from(studentBestMap.values()).map(item => item.category);
        const resolvedCategories = await this.prisma.streak_category_items.findMany({
            where: { schoolId, code: { in: categoryCodes } },
            select: { code: true, name: true }
        });
        const categoryNameMap = new Map(resolvedCategories.map(item => [item.code, item.name]));
        // 5. 排序并取 Top N，并注入分类名称
        const result = Array.from(studentBestMap.values())
            .sort((a, b) => b.currentStreak - a.currentStreak)
            .slice(0, limit)
            .map((item, index) => {
            // 如果数据库没找到名称（比如是旧的硬编码项），可以尝试简单的 fallback
            let categoryName = categoryNameMap.get(item.category) || item.category;
            // 常见的硬编码项 fallback
            const fallbackMap = {
                'cn_dictation': '字词听写',
                'cn_recitation': '课文背诵',
                'cn_reading': '课文朗读',
                'cn_word_combo': '生字组词',
                'cn_homework': '语文作业',
                'math_calculation': '口算练习',
                'math_vertical': '竖式计算',
                'math_word_problem': '应用题',
                'math_correction': '错题订正',
                'en_dictation': '单词默写',
                'en_translation': '中英互译',
                'en_sentences': '句型背诵',
                'en_recitation': '英语背诵'
            };
            if (categoryName === item.category && fallbackMap[item.category]) {
                categoryName = fallbackMap[item.category];
            }
            return {
                rank: index + 1,
                ...item,
                categoryName
            };
        });
        return result;
    }
    // 🆕 获取学校的自定义连胜分类
    async getCategories(schoolId) {
        return this.prisma.streak_category_items.findMany({
            where: { schoolId },
            orderBy: { createdAt: 'asc' }
        });
    }
    // 🆕 添加自定义连胜分类
    async addCategory(schoolId, subject, name, code) {
        return this.prisma.streak_category_items.create({
            data: { schoolId, subject, name, code, isDefault: false }
        });
    }
    // 🆕 删除自定义连胜分类
    async deleteCategory(id) {
        return this.prisma.streak_category_items.delete({
            where: { id }
        });
    }
}
exports.CategoryStreakService = CategoryStreakService;
//# sourceMappingURL=category-streak.service.js.map