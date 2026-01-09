"use strict";
/**
 * 五维内功映射系统 - 任务-技能映射配置
 * 平衡修订版 v1.1 (2026-01-08)
 *
 * 核心调整策略：
 * 1. 削减费曼（De-Feynman）：从10→5
 * 2. 规划力前置（Planning First）
 * 3. 细化毅力（Refining Grit）
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SKILL_TO_DIMENSION = exports.STREAK_MILESTONES = exports.TASK_SKILL_MAPPING = void 0;
exports.getSkillCodeByTask = getSkillCodeByTask;
exports.isStreakMilestone = isStreakMilestone;
// 任务名称 → 技能代码映射
exports.TASK_SKILL_MAPPING = {
    // ==================== 基础学习方法论 ====================
    '用"三色笔法"整理作业': 'r_color',
    '错题的红笔订正': 'r_color',
    '作业的自主检查': 'r_scan',
    '试卷体检法': 'r_diagnosis',
    '自评当日作业质量': 'r_diary',
    '错题的摘抄与归因': 'r_gap',
    '记录并解决盲区问题': 'r_gap',
    '总结单元错因': 'r_gap', // 🆕 单元错因总结 → 盲区探照灯
    '填写错题记录单': 'r_gap', // 🆕 错题记录 → 盲区探照灯
    '书写工整': 'r_detail',
    // ==================== 数学思维与解题策略 ====================
    '错题归类与规律发现': 'l_source',
    '用"画图法"理解应用题': 'l_draft',
    '用"分步法"讲解数学题': 'l_struct',
    '草稿纸规范使用': 'l_draft',
    '一题多解练习': 'l_model',
    '整理易混淆点对比表': 'l_compare',
    '总结解题模型与套路': 'l_model',
    '圈画审题关键词': 'r_detail',
    '口算限时挑战': 'g_drill',
    // ==================== 语文学科能力深化 ====================
    '课文朗读与背诵': 'g_accum',
    '生字词听写': 'a_bloom',
    '阅读理解策略练习': 'l_compare',
    '作文提纲与修改': 'p_helm',
    // ==================== 英语应用与输出 ====================
    '单词听写与默写': 'g_drill',
    '课文朗读与背诵(英语)': 'a_bloom',
    '口语对话练习': 'a_feynman',
    '听力理解训练': 'g_zen',
    // ==================== 阅读深度与分享 ====================
    '阅读记录卡填写': 'r_diary',
    '好词好句摘抄': 'a_hunt',
    '读后感分享': 'l_connect',
    '阅读推荐': 'a_feynman',
    '课外阅读30分钟': 'g_accum',
    // ==================== 自主学习与规划 ====================
    '制定学习计划': 'p_helm',
    '时间管理练习': 'p_tomato',
    '目标设定与回顾': 'p_helm',
    '自主预习': 'p_scout',
    '有效预习并打卡': 'p_scout',
    '任务优先级排序': 'p_priority',
    '离校前的书包整理': 'p_bag',
    // ==================== 课堂互动与深度参与 ====================
    '主动举手发言': 'g_retry',
    '小组讨论参与': 'l_connect',
    '提出有价值的问题': 'a_ask',
    '帮助同学讲解': 'a_feynman',
    // ==================== 家庭联结与知识迁移 ====================
    '与家长分享学习内容': 'a_feynman',
    '生活中的知识应用': 'a_life',
    '家校沟通反馈': 'r_diary',
    '家庭作业展示': 'g_accum',
    // ==================== 高阶输出与创新 ====================
    '创意写作': 'l_struct',
    '项目展示': 'p_scout',
    '知识总结思维导图': 'l_connect',
    '跨学科应用': 'l_model',
    // ==================== 综合成长 (GROWTH) ====================
    '年级同步阅读': 'g_accum',
    '填写阅读记录单': 'r_diary',
    '阅读成语故事': 'a_hunt',
    '字字开花': 'a_hunt', // 词语积累任务 → 素材捕捉手
    '离校前个人卫生清理': 'p_bag',
    '集体贡献任务': 'a_help',
    '帮助维护用餐秩序': 'a_help',
    '为图书角推荐书籍': 'a_hunt',
    '帮助同学': 'a_help',
    '创意表达任务': 'a_life',
    '健康活力任务': 'g_zen',
    '完成专注力训练': 'g_zen',
    '与家人共读30分钟': 'a_help',
    '帮家里完成家务': 'a_life',
    // ==================== 学业过关 (QC) ====================
    // 语文
    '生字听写': 'g_drill',
    '课文背诵': 'g_drill',
    '古诗默写': 'g_drill',
    '生字组词': 'a_bloom',
    '朗读课文': 'g_accum',
    '默写课文': 'g_drill',
    '听写词语': 'g_drill',
    '重新过关': 'g_retry', // 🆕 新增
    // 数学
    '口算达标': 'g_drill',
    '口算练习': 'g_drill',
    '竖式计算': 'l_draft',
    '计算练习': 'g_drill',
    '应用题': 'l_source',
    '错题订正': 'r_color',
    // 英语
    '单词默写': 'g_drill',
    '听力理解': 'g_zen',
    '中英互译': 'l_compare',
    '句型背诵': 'g_drill',
};
// 连胜里程碑配置（达到这些天数时奖励 g_streak）
exports.STREAK_MILESTONES = [3, 7, 14, 21, 30, 50, 100];
// 技能代码到维度的映射（用于快速查询）
exports.SKILL_TO_DIMENSION = {
    // 内省力 (reflection)
    'r_color': 'reflection',
    'r_scan': 'reflection',
    'r_diagnosis': 'reflection',
    'r_diary': 'reflection',
    'r_gap': 'reflection',
    'r_detail': 'reflection',
    // 逻辑力 (logic)
    'l_source': 'logic',
    'l_draft': 'logic',
    'l_struct': 'logic',
    'l_compare': 'logic',
    'l_model': 'logic',
    'l_connect': 'logic',
    // 自主力 (autonomy)
    'a_feynman': 'autonomy',
    'a_bloom': 'autonomy',
    'a_hunt': 'autonomy',
    'a_ask': 'autonomy',
    'a_help': 'autonomy',
    'a_life': 'autonomy',
    // 规划力 (planning)
    'p_helm': 'planning',
    'p_scout': 'planning',
    'p_bag': 'planning',
    'p_tomato': 'planning',
    'p_priority': 'planning',
    // 毅力值 (grit)
    'g_zen': 'grit',
    'g_streak': 'grit',
    'g_retry': 'grit',
    'g_drill': 'grit',
    'g_accum': 'grit',
};
/**
 * 根据任务名称获取对应的技能代码
 */
function getSkillCodeByTask(taskName) {
    return exports.TASK_SKILL_MAPPING[taskName] || null;
}
/**
 * 检查连胜是否达到里程碑
 */
function isStreakMilestone(streakCount) {
    return exports.STREAK_MILESTONES.includes(streakCount);
}
//# sourceMappingURL=skillMapping.config.js.map