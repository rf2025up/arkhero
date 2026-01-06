
// 基础过关项到连胜分类代码的映射
// Key: 任务标题 (Task Title) 或包含的关键词
// Value: 连胜分类代码 (Streak Category Code)

export const QC_STREAK_MAPPING: Record<string, { code: string; name: string; subject: string }> = {
    // === 语文 Chinese ===
    '生字听写': { code: 'cn_dictation', name: '生字听写', subject: 'chinese' },
    '听写词语': { code: 'cn_dictation', name: '生字听写', subject: 'chinese' },
    '课文背诵': { code: 'cn_recitation', name: '课文背诵', subject: 'chinese' },
    '朗读课文': { code: 'cn_recitation', name: '课文背诵', subject: 'chinese' }, // 也可以分开
    '默写课文': { code: 'cn_dictation_writing', name: '默写课文', subject: 'chinese' },
    '生字组词': { code: 'cn_vocabulary', name: '生字组词', subject: 'chinese' },

    // === 数学 Math ===
    '口算练习': { code: 'math_calculation', name: '口算练习', subject: 'math' },
    '口算达标': { code: 'math_calculation', name: '口算练习', subject: 'math' },
    '计算练习': { code: 'math_calculation', name: '口算练习', subject: 'math' },
    '错题订正': { code: 'math_mistakes', name: '错题订正', subject: 'math' },
    '应用题': { code: 'math_word_problem', name: '应用题', subject: 'math' },

    // === 英语 English ===
    '单词默写': { code: 'en_dictation', name: '单词默写', subject: 'english' },
    '中英互译': { code: 'en_translation', name: '中英互译', subject: 'english' },
    '句型背诵': { code: 'en_sentences', name: '句型背诵', subject: 'english' },
    'English Recitation': { code: 'en_recitation', name: '英语背诵', subject: 'english' }, // 假设有英文标题
};

export function getStreakCategory(taskTitle: string): { code: string; name: string; subject: string } | null {
    // 1. 精确匹配
    if (QC_STREAK_MAPPING[taskTitle]) {
        return QC_STREAK_MAPPING[taskTitle];
    }

    // 2. 关键词模糊匹配 (可以根据需要调整优先级)
    for (const key in QC_STREAK_MAPPING) {
        if (taskTitle.includes(key)) {
            return QC_STREAK_MAPPING[key];
        }
    }

    return null;
}
