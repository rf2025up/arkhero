"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RewardService = void 0;
class RewardService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * 获取学校的所有奖励配置
     */
    async getRewardConfigs(schoolId) {
        const configs = await this.prisma.reward_configs.findMany({
            where: { schoolId },
            orderBy: [{ module: 'asc' }, { category: 'asc' }, { action: 'asc' }]
        });
        return configs;
    }
    /**
     * 获取默认奖励配置（初始化使用）
     */
    getDefaultConfigs() {
        return [
            // LMS 进度系统
            { module: 'LMS', category: 'QC', action: 'QC_COMPLETE', expReward: 5, pointsReward: 0, description: 'QC 任务完成（生字词听写、课文背诵等）' },
            { module: 'LMS', category: 'PROJECT', action: 'PROJECT_COMPLETE', expReward: 30, pointsReward: 0, description: 'PROJECT 任务完成（阅读理解自主讲解等）' },
            // 勋章系统
            { module: 'BADGE', category: null, action: 'BADGE_AWARD', expReward: 20, pointsReward: 0, description: '勋章颁发（固定 20 exp）' },
            // PK 对决
            { module: 'PK', category: null, action: 'PK_WIN', expReward: 50, pointsReward: 20, description: 'PK 对决获胜' },
            { module: 'PK', category: null, action: 'PK_DRAW', expReward: 25, pointsReward: 10, description: 'PK 对决平局' },
            // 挑战赛
            { module: 'CHALLENGE', category: null, action: 'CHALLENGE_COMPLETE', expReward: 50, pointsReward: 0, description: '挑战赛完成' },
            // 习惯打卡
            { module: 'HABIT', category: null, action: 'HABIT_CHECKIN', expReward: 5, pointsReward: 0, description: '习惯打卡（默认 5 exp，可配置 10-20）' },
            // 个性化辅导
            { module: 'TUTORING', category: null, action: 'TUTORING_COMPLETE', expReward: 50, pointsReward: 20, description: '个性化辅导完成' },
            // 🆕 核心教学法（METHODOLOGY）
            { module: 'METHODOLOGY', category: '基础学习方法论', action: '基础学习方法论', expReward: 5, pointsReward: 0, description: '作业的自主检查、错题的红笔订正等' },
            { module: 'METHODOLOGY', category: '数学思维与解题策略', action: '数学思维与解题策略', expReward: 5, pointsReward: 0, description: '用"分步法"讲解数学题、用"画图法"理解应用题等' },
            { module: 'METHODOLOGY', category: '语文学科能力深化', action: '语文学科能力深化', expReward: 5, pointsReward: 0, description: '课文朗读与背诵、生字词听写等' },
            { module: 'METHODOLOGY', category: '英语应用与输出', action: '英语应用与输出', expReward: 5, pointsReward: 0, description: '单词听写与默写、课文朗读与背诵等' },
            { module: 'METHODOLOGY', category: '阅读深度与分享', action: '阅读深度与分享', expReward: 5, pointsReward: 0, description: '阅读记录卡填写、好词好句摘抄等' },
            { module: 'METHODOLOGY', category: '自主学习与规划', action: '自主学习与规划', expReward: 5, pointsReward: 0, description: '制定学习计划、时间管理练习等' },
            { module: 'METHODOLOGY', category: '课堂互动与深度参与', action: '课堂互动与深度参与', expReward: 5, pointsReward: 0, description: '主动举手发言、小组讨论参与等' },
            { module: 'METHODOLOGY', category: '家庭联结与知识迁移', action: '家庭联结与知识迁移', expReward: 5, pointsReward: 0, description: '与家长分享学习内容、生活中的知识应用等' },
            { module: 'METHODOLOGY', category: '高阶输出与创新', action: '高阶输出与创新', expReward: 5, pointsReward: 0, description: '创意写作、项目展示、知识总结思维导图等' },
            // 🆕 综合成长类（GROWTH）
            { module: 'GROWTH', category: '阅读广度类', action: '阅读广度类', expReward: 5, pointsReward: 0, description: '年级同步阅读、课外阅读30分钟等' },
            { module: 'GROWTH', category: '整理与贡献类', action: '整理与贡献类', expReward: 5, pointsReward: 0, description: '离校前的个人卫生清理、离校前的书包整理等' },
            { module: 'GROWTH', category: '互助与创新类', action: '互助与创新类', expReward: 5, pointsReward: 0, description: '帮助同学、创意表达任务、健康活力任务等' },
            { module: 'GROWTH', category: '家庭联结类', action: '家庭联结类', expReward: 5, pointsReward: 0, description: '与家人共读30分钟、帮家里完成一项力所及的家务等' },
            // 手动任务
            { module: 'MANUAL', category: 'TASK', action: 'TASK_COMPLETE', expReward: 5, pointsReward: 0, description: '手动任务完成（常规任务）' },
            { module: 'MANUAL', category: 'SPECIAL', action: 'SPECIAL_COMPLETE', expReward: 10, pointsReward: 0, description: '特殊任务完成' },
            // 其他操作
            { module: 'OTHER', category: null, action: 'DAILY_TASK', expReward: 10, pointsReward: 0, description: '日常行为（桌面整洁等）' },
        ];
    }
    /**
     * 初始化学校的默认奖励配置
     */
    async initializeDefaultConfigs(schoolId) {
        const defaults = this.getDefaultConfigs();
        const configs = await Promise.all(defaults.map(config => this.prisma.reward_configs.upsert({
            where: {
                schoolId_module_action: {
                    schoolId,
                    module: config.module,
                    action: config.action
                }
            },
            update: {},
            create: {
                schoolId,
                module: config.module,
                category: config.category || null,
                action: config.action,
                expReward: config.expReward,
                pointsReward: config.pointsReward,
                description: config.description,
                isActive: true
            }
        })));
        return configs;
    }
    /**
     * 创建或更新奖励配置
     */
    async upsertRewardConfig(data) {
        const { schoolId, module, action, ...rest } = data;
        const config = await this.prisma.reward_configs.upsert({
            where: {
                schoolId_module_action: {
                    schoolId,
                    module,
                    action
                }
            },
            update: {
                ...rest,
                updatedAt: new Date()
            },
            create: {
                schoolId,
                module,
                action,
                ...rest
            }
        });
        return config;
    }
    /**
     * 更新奖励配置
     */
    async updateRewardConfig(data) {
        const { id, schoolId, ...updateData } = data;
        // 验证配置是否属于该学校
        const existing = await this.prisma.reward_configs.findFirst({
            where: { id, schoolId }
        });
        if (!existing) {
            throw new Error('配置不存在或无权访问');
        }
        const config = await this.prisma.reward_configs.update({
            where: { id },
            data: {
                ...updateData,
                updatedAt: new Date()
            }
        });
        return config;
    }
    /**
     * 批量更新奖励配置
     */
    async batchUpdateRewardConfigs(schoolId, updates) {
        const results = await Promise.all(updates.map(update => this.updateRewardConfig({ id: update.id, schoolId, ...update })));
        return results;
    }
    /**
     * 删除奖励配置
     */
    async deleteRewardConfig(id, schoolId) {
        // 验证配置是否属于该学校
        const existing = await this.prisma.reward_configs.findFirst({
            where: { id, schoolId }
        });
        if (!existing) {
            throw new Error('配置不存在或无权访问');
        }
        await this.prisma.reward_configs.delete({
            where: { id }
        });
    }
    /**
     * 根据模块和动作获取奖励配置
     */
    async getRewardConfig(schoolId, module, action) {
        const config = await this.prisma.reward_configs.findFirst({
            where: {
                schoolId,
                module,
                action,
                isActive: true
            }
        });
        return config;
    }
    /**
     * 根据任务信息获取经验值
     * @param schoolId 学校ID
     * @param category 任务分类（核心教学法、综合成长）
     * @param subcategory 子分类（如"基础学习方法论"）
     * @param title 任务标题
     * @returns 经验值，如果未找到配置则返回null
     */
    async getExpForTask(schoolId, category, subcategory, title) {
        // 根据分类确定模块
        let module;
        if (category === '核心教学法' || category === 'METHODOLOGY') {
            module = 'METHODOLOGY';
        }
        else if (category === '综合成长' || category === 'TASK') {
            module = 'GROWTH';
        }
        else {
            // 其他分类暂不支持
            return null;
        }
        // 使用子分类作为action（如果有的话），否则使用标题
        const action = subcategory || title;
        const config = await this.getRewardConfig(schoolId, module, action);
        return config ? config.expReward : null;
    }
    /**
     * 获取全局经验倍率
     */
    async getExpMultiplier(schoolId) {
        const school = await this.prisma.schools.findUnique({
            where: { id: schoolId },
            select: { settings: true }
        });
        const settings = school?.settings || {};
        return settings.expMultiplier || 1.0;
    }
    /**
     * 更新全局经验倍率
     */
    async updateExpMultiplier(schoolId, multiplier) {
        const school = await this.prisma.schools.findUnique({
            where: { id: schoolId },
            select: { settings: true }
        });
        const settings = school?.settings || {};
        settings.expMultiplier = multiplier;
        await this.prisma.schools.update({
            where: { id: schoolId },
            data: { settings }
        });
    }
}
exports.RewardService = RewardService;
exports.default = RewardService;
//# sourceMappingURL=reward.service.js.map