
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 必须与前端配置一致 (client/src/config/taskCategories.ts)
const STREAK_CATEGORIES_CONFIG = {
    chinese: [
        { name: '校内作业', code: 'cn_homework' },
        { name: '课文背诵', code: 'cn_recitation' },
        { name: '生字组词', code: 'cn_vocabulary' },
        { name: '默写课文', code: 'cn_dictation_writing' },
        { name: '听写词语', code: 'cn_dictation' },
        { name: '朗读课文', code: 'cn_reading' }
    ],
    math: [
        { name: '校内作业', code: 'math_homework' },
        { name: '口算练习', code: 'math_calculation' },
        { name: '计算练习', code: 'math_calculation_2' },
        { name: '应用题', code: 'math_word_problem' },
        { name: '错题订正', code: 'math_mistakes' }
    ],
    english: [
        { name: '校内作业', code: 'en_homework' },
        { name: '单词默写', code: 'en_dictation' },
        { name: '中英互译', code: 'en_translation' },
        { name: '句型背诵', code: 'en_sentences' },
        { name: '课文背诵', code: 'en_recitation' }
    ]
};

async function seedResetAndGenerate() {
    try {
        const student = await prisma.students.findFirst({
            where: { name: '龙卓豫' }
        });

        if (!student) {
            console.error('未找到学生：龙卓豫');
            return;
        }

        console.log('找到学生:', student.name, student.schoolId);

        // 1. 清理该学生的所有连胜记录
        await prisma.category_streaks.deleteMany({
            where: { studentId: student.id }
        });
        console.log('旧连胜记录已清理');

        // 2. 清理该学校的所有连胜分类定义 (关键：防止重复)
        // 注意：这将重置该学校所有班级的连胜分类，但在开发环境下是可以接受的
        await prisma.streak_category_items.deleteMany({
            where: { schoolId: student.schoolId }
        });
        console.log('旧分类定义已清理');

        // 3. 重新插入分类定义
        const allCategories = [
            ...STREAK_CATEGORIES_CONFIG.chinese.map(c => ({ ...c, subject: 'chinese' })),
            ...STREAK_CATEGORIES_CONFIG.math.map(c => ({ ...c, subject: 'math' })),
            ...STREAK_CATEGORIES_CONFIG.english.map(c => ({ ...c, subject: 'english' }))
        ];

        // 为了保持顺序，我们使用 create 而不是 upsert（因为已经 deleteMany 了）
        // 也可以使用 Promise.all，但为了保证插入顺序（可能影响默认排序 id），最好串行
        let count = 0;
        for (const cat of allCategories) {
            await prisma.streak_category_items.create({
                data: {
                    schoolId: student.schoolId,
                    subject: cat.subject,
                    code: cat.code,
                    name: cat.name,
                    isDefault: true
                }
            });
            count++;
        }
        console.log(`重新创建了 ${count} 个分类定义`);

        // 4. 生成演示数据 (12条)
        const demoItems = [
            // 语文
            { code: 'cn_homework', streak: 45 },
            { code: 'cn_recitation', streak: 12 },
            { code: 'cn_dictation', streak: 8 },
            { code: 'cn_vocabulary', streak: 5 },
            // 数学
            { code: 'math_homework', streak: 50 },
            { code: 'math_calculation', streak: 20 },
            { code: 'math_mistakes', streak: 15 },
            { code: 'math_word_problem', streak: 3 },
            // 英语
            { code: 'en_homework', streak: 40 },
            { code: 'en_dictation', streak: 25 },
            { code: 'en_recitation', streak: 10 },
            { code: 'en_sentences', streak: 6 },
        ];

        for (const item of demoItems) {
            await prisma.category_streaks.create({
                data: {
                    studentId: student.id,
                    category: item.code,
                    currentStreak: item.streak,
                    maxStreak: item.streak + 5
                }
            });
        }

        console.log(`✅ 成功生成 12 条连胜数据`);

    } catch (e) {
        console.error('❌ Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

seedResetAndGenerate();
