
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedStreaks() {
    try {
        // 1. 查找学生 '龙卓豫'
        const student = await prisma.students.findFirst({
            where: { name: '龙卓豫' }
        });

        if (!student) {
            console.error('未找到学生：龙卓豫');
            return;
        }

        console.log('找到学生:', student.name, student.id, 'SchoolId:', student.schoolId);

        // 2. 清理旧连胜数据
        await prisma.category_streaks.deleteMany({
            where: { studentId: student.id }
        });
        console.log('旧数据清理完毕');

        // 3. 定义 7 个模拟连胜项目 (严格对应基础过关项)
        // 依据 server/src/utils/streakMapping.ts
        const streaks = [
            // 语文
            { category: 'cn_dictation', name: '生字听写', subject: 'chinese', currentStreak: 8, maxStreak: 12 },
            { category: 'cn_recitation', name: '课文背诵', subject: 'chinese', currentStreak: 5, maxStreak: 7 },
            { category: 'cn_dictation_writing', name: '默写课文', subject: 'chinese', currentStreak: 3, maxStreak: 5 },
            // 数学
            { category: 'math_calculation', name: '口算练习', subject: 'math', currentStreak: 15, maxStreak: 20 },
            { category: 'math_mistakes', name: '错题订正', subject: 'math', currentStreak: 2, maxStreak: 10 },
            // 英语
            { category: 'en_dictation', name: '单词默写', subject: 'english', currentStreak: 30, maxStreak: 30 },
            { category: 'en_recitation', name: '英语背诵', subject: 'english', currentStreak: 4, maxStreak: 6 }
        ];

        // 4. 定义连胜项显示名称 (更新 streak_category_items)
        for (const item of streaks) {
            console.log('正在处理分类:', item.name);
            // 确保分类定义存在
            await prisma.streak_category_items.upsert({
                where: {
                    schoolId_code: {
                        schoolId: student.schoolId,
                        code: item.category
                    }
                },
                update: {
                    name: item.name,
                    subject: item.subject
                },
                create: {
                    schoolId: student.schoolId,
                    subject: item.subject,
                    code: item.category,
                    name: item.name,
                    isDefault: true
                }
            });

            // 插入连胜记录
            await prisma.category_streaks.create({
                data: {
                    studentId: student.id,
                    category: item.category,
                    currentStreak: item.currentStreak,
                    maxStreak: item.maxStreak
                }
            });
        }

        console.log(`✅ 成功为 ${student.name} 模拟了 7 条 (严格对齐版) 连胜数据`);
    } catch (e) {
        console.error('❌ 执行出错:', e);
    } finally {
        await prisma.$disconnect();
    }
}

seedStreaks();
