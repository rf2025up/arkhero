/**
 * 演示学生数据种子脚本
 * 为"乐学优能金潇校区"创建10个真实学生数据
 * 包含: 任务记录、PK、挑战、勋章、习惯、技能、连胜等
 */

const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// 目标学校配置
const TARGET_SCHOOL_NAME = '乐学优能金潇校区';

// 10个真实学生数据
const STUDENTS = [
    { name: '李明轩', className: '三年级1班', grade: '三年级', avatarUrl: null },
    { name: '张雨萱', className: '三年级1班', grade: '三年级', avatarUrl: null },
    { name: '王子涵', className: '三年级2班', grade: '三年级', avatarUrl: null },
    { name: '刘思琪', className: '四年级1班', grade: '四年级', avatarUrl: null },
    { name: '陈浩然', className: '四年级1班', grade: '四年级', avatarUrl: null },
    { name: '杨紫萱', className: '四年级2班', grade: '四年级', avatarUrl: null },
    { name: '赵子墨', className: '五年级1班', grade: '五年级', avatarUrl: null },
    { name: '周雨晴', className: '五年级1班', grade: '五年级', avatarUrl: null },
    { name: '吴梓涵', className: '五年级2班', grade: '五年级', avatarUrl: null },
    { name: '郑思远', className: '六年级1班', grade: '六年级', avatarUrl: null },
];

// 任务标题模板
const TASK_TITLES = {
    QC: ['生字听写', '课文背诵', '口算练习', '单词默写', '古诗默写', '竖式计算'],
    METHODOLOGY: ['用"分步法"解题', '用"三色笔法"整理笔记', '用"费曼法"自主讲解', '制定学习计划'],
    TASK: ['书写工整', '课堂专注', '作业按时完成', '积极举手发言'],
    HABIT: ['晨读打卡', '阅读30分钟', '整理书包', '预习新课'],
    SPECIAL: ['挑战PK获胜', '挑战赛冠军', '连续7天全勤'],
};

// 勋章模板
const BADGES = [
    { name: '速度之星', category: '学习', icon: '⚡' },
    { name: '专注达人', category: '习惯', icon: '🎯' },
    { name: '阅读小能手', category: '阅读', icon: '📚' },
    { name: '计算小天才', category: '数学', icon: '🧮' },
    { name: '勤奋之星', category: '综合', icon: '⭐' },
];

// 技能模板
const SKILLS = [
    { code: 'reading', name: '阅读力', icon: '📖' },
    { code: 'math', name: '计算力', icon: '🔢' },
    { code: 'focus', name: '专注力', icon: '🎯' },
    { code: 'expression', name: '表达力', icon: '💬' },
    { code: 'self_management', name: '自主力', icon: '🗓️' },
];

// 连胜分类
const STREAK_CATEGORIES = [
    { code: 'cn_dictation', name: '生字听写', subject: 'chinese' },
    { code: 'cn_recitation', name: '课文背诵', subject: 'chinese' },
    { code: 'math_calculation', name: '口算练习', subject: 'math' },
    { code: 'en_dictation', name: '单词默写', subject: 'english' },
];

// 习惯模板
const HABITS = [
    { name: '晨读打卡', description: '每日早读15分钟', icon: '📖', expReward: 10 },
    { name: '阅读30分钟', description: '每日课外阅读', icon: '📚', expReward: 15 },
    { name: '整理书包', description: '睡前整理书包', icon: '🎒', expReward: 5 },
];

// 挑战模板
const CHALLENGES = [
    { title: '30秒背诵挑战', description: '30秒内背诵指定段落', rewardExp: 50, rewardPoints: 20 },
    { title: '口算大王', description: '5分钟内完成50道口算', rewardExp: 60, rewardPoints: 30 },
    { title: '连续7天全勤', description: '连续7天完成所有任务', rewardExp: 100, rewardPoints: 50 },
];

function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysBack) {
    const date = new Date();
    date.setDate(date.getDate() - randomInt(0, daysBack));
    date.setHours(randomInt(8, 18), randomInt(0, 59), 0, 0);
    return date;
}

async function main() {
    console.log('🚀 演示学生数据种子脚本启动...');

    // 动态搜索学校ID
    const targetSchool = await prisma.schools.findFirst({
        where: { name: TARGET_SCHOOL_NAME }
    });

    if (!targetSchool) {
        console.error(`❌ 未找到名称为 "${TARGET_SCHOOL_NAME}" 的学校，请手动确认数据库内容`);
        return;
    }

    const SCHOOL_ID = targetSchool.id;
    console.log(`✅ 已确认校区: ${targetSchool.name} (ID: ${SCHOOL_ID})`);

    // 1. 获取学校的一个老师
    const teacher = await prisma.teachers.findFirst({
        where: { schoolId: SCHOOL_ID },
        select: { id: true, name: true }
    });

    if (!teacher) {
        console.error('❌ 未找到该学校的老师，请先创建老师账号');
        return;
    }
    console.log(`👩‍🏫 使用老师: ${teacher.name}`);

    // 2. 确保勋章存在
    for (const badge of BADGES) {
        await prisma.badges.upsert({
            where: { schoolId_name: { schoolId: SCHOOL_ID, name: badge.name } },
            create: {
                id: crypto.randomUUID(),
                schoolId: SCHOOL_ID,
                name: badge.name,
                category: badge.category,
                icon: badge.icon,
                description: `${badge.name}勋章`,
            },
            update: {}
        });
    }
    console.log(`🏅 勋章数据已准备`);

    // 3. 确保习惯存在
    for (const habit of HABITS) {
        await prisma.habits.upsert({
            where: { schoolId_name: { schoolId: SCHOOL_ID, name: habit.name } },
            create: {
                id: crypto.randomUUID(),
                schoolId: SCHOOL_ID,
                name: habit.name,
                description: habit.description,
                icon: habit.icon,
                expReward: habit.expReward,
            },
            update: {}
        });
    }
    console.log(`✅ 习惯数据已准备`);

    // 4. 确保连胜分类存在
    for (const cat of STREAK_CATEGORIES) {
        await prisma.streak_category_items.upsert({
            where: { schoolId_code: { schoolId: SCHOOL_ID, code: cat.code } },
            create: {
                id: crypto.randomUUID(),
                schoolId: SCHOOL_ID,
                code: cat.code,
                name: cat.name,
                subject: cat.subject,
                isDefault: true
            },
            update: {}
        });
    }
    console.log(`🔥 连胜分类已准备`);

    // 5. 确保技能存在
    for (const skill of SKILLS) {
        await prisma.student_skills.upsert({
            where: { schoolId_code: { schoolId: SCHOOL_ID, code: skill.code } },
            create: {
                id: crypto.randomUUID(),
                schoolId: SCHOOL_ID,
                code: skill.code,
                name: skill.name,
                icon: skill.icon
            },
            update: {}
        }).catch(() => { }); // 忽略已存在错误
    }
    console.log(`🎯 技能数据已准备`);

    // 6. 创建挑战
    let challengeIds = [];
    for (const ch of CHALLENGES) {
        const existing = await prisma.challenges.findFirst({
            where: { schoolId: SCHOOL_ID, title: ch.title }
        });
        if (existing) {
            challengeIds.push(existing.id);
        } else {
            const newCh = await prisma.challenges.create({
                data: {
                    id: crypto.randomUUID(),
                    schoolId: SCHOOL_ID,
                    creatorId: teacher.id,
                    title: ch.title,
                    description: ch.description,
                    rewardExp: ch.rewardExp,
                    rewardPoints: ch.rewardPoints,
                    status: 'ACTIVE',
                    type: 'PERSONAL',
                    startDate: randomDate(30),
                }
            });
            challengeIds.push(newCh.id);
        }
    }
    console.log(`🏆 挑战数据已准备`);

    // 7. 创建学生
    const createdStudents = [];
    for (const s of STUDENTS) {
        const existing = await prisma.students.findFirst({
            where: { schoolId: SCHOOL_ID, name: s.name }
        });

        if (existing) {
            console.log(`⏭️ 学生 ${s.name} 已存在，跳过创建，但会补充数据`);
            createdStudents.push(existing);
        } else {
            const exp = randomInt(500, 5000);
            const points = randomInt(100, 1000);
            const student = await prisma.students.create({
                data: {
                    id: crypto.randomUUID(),
                    schoolId: SCHOOL_ID,
                    teacherId: teacher.id,
                    name: s.name,
                    className: s.className,
                    grade: s.grade,
                    exp,
                    points,
                    createdAt: randomDate(90),
                }
            });
            console.log(`✅ 创建学生: ${s.name} (Lv.${Math.floor(Math.sqrt(exp) / 10) + 1})`);
            createdStudents.push(student);
        }
    }

    // 8. 为每个学生创建丰富数据
    for (const student of createdStudents) {
        console.log(`\n📝 为 ${student.name} 创建记录...`);

        // 8.1 任务记录 (15-25条)
        const taskCount = randomInt(15, 25);
        for (let i = 0; i < taskCount; i++) {
            // 使用正确的 TaskType 枚举: QC, TASK, SPECIAL, DAILY, PROJECT
            const types = ['QC', 'TASK', 'SPECIAL', 'DAILY', 'PROJECT'];
            const type = types[randomInt(0, types.length - 1)];
            const allTitles = [...TASK_TITLES.QC, ...TASK_TITLES.METHODOLOGY, ...TASK_TITLES.TASK, ...TASK_TITLES.SPECIAL];
            const title = allTitles[randomInt(0, allTitles.length - 1)];

            // 映射 task_category
            const categoryMap = { QC: 'PROGRESS', PROJECT: 'PROGRESS', TASK: 'TASK', SPECIAL: 'SPECIAL', DAILY: 'TASK' };

            await prisma.task_records.create({
                data: {
                    id: crypto.randomUUID(),
                    schoolId: SCHOOL_ID,
                    studentId: student.id,
                    type,
                    task_category: categoryMap[type] || 'TASK',
                    status: 'COMPLETED',
                    title,
                    expAwarded: randomInt(5, 20),
                    createdAt: randomDate(30),
                }
            });
        }
        console.log(`  📋 创建 ${taskCount} 条任务记录`);

        // 8.2 PK 记录 (2-5场)
        const pkCount = randomInt(2, 5);
        const otherStudents = createdStudents.filter(s => s.id !== student.id);
        for (let i = 0; i < pkCount && otherStudents.length > 0; i++) {
            const opponent = otherStudents[randomInt(0, otherStudents.length - 1)];
            const isWinner = Math.random() > 0.4;
            const isDraw = !isWinner && Math.random() > 0.7;

            await prisma.pk_matches.create({
                data: {
                    id: crypto.randomUUID(),
                    schoolId: SCHOOL_ID,
                    studentA: student.id,
                    studentB: opponent.id,
                    winnerId: isDraw ? null : (isWinner ? student.id : opponent.id),
                    topic: ['口算PK', '背诵PK', '听写PK', '阅读PK'][randomInt(0, 3)],
                    status: 'COMPLETED',
                    metadata: { expReward: 50, pointsReward: 20 },
                    createdAt: randomDate(30),
                }
            });
        }
        console.log(`  ⚔️ 创建 ${pkCount} 场PK记录`);

        // 8.3 挑战参与 (1-2个)
        const participateCount = randomInt(1, 2);
        for (let i = 0; i < participateCount && i < challengeIds.length; i++) {
            const challengeId = challengeIds[i];
            const existing = await prisma.challenge_participants.findUnique({
                where: { challengeId_studentId: { challengeId, studentId: student.id } }
            });
            if (!existing) {
                await prisma.challenge_participants.create({
                    data: {
                        id: crypto.randomUUID(),
                        challengeId,
                        studentId: student.id,
                        status: 'JOINED',
                        result: Math.random() > 0.5 ? 'COMPLETED' : null,
                        completedAt: Math.random() > 0.3 ? randomDate(15) : null,
                    }
                });
            }
        }
        console.log(`  🏆 参与 ${participateCount} 个挑战`);

        // 8.4 勋章颁发 (1-3个)
        const badgeList = await prisma.badges.findMany({ where: { schoolId: SCHOOL_ID } });
        const badgeCount = randomInt(1, Math.min(3, badgeList.length));
        for (let i = 0; i < badgeCount; i++) {
            const badge = badgeList[i];
            const existing = await prisma.student_badges.findFirst({
                where: { studentId: student.id, badgeId: badge.id }
            });
            if (!existing) {
                await prisma.student_badges.create({
                    data: {
                        id: crypto.randomUUID(),
                        studentId: student.id,
                        badgeId: badge.id,
                        awardedAt: randomDate(30),
                    }
                });
            }
        }
        console.log(`  🏅 颁发 ${badgeCount} 个勋章`);

        // 8.5 习惯打卡 (5-15次)
        const habitList = await prisma.habits.findMany({ where: { schoolId: SCHOOL_ID } });
        const logCount = randomInt(5, 15);
        for (let i = 0; i < logCount && habitList.length > 0; i++) {
            const habit = habitList[randomInt(0, habitList.length - 1)];
            await prisma.habit_logs.create({
                data: {
                    id: crypto.randomUUID(),
                    schoolId: SCHOOL_ID,
                    habitId: habit.id,
                    studentId: student.id,
                    streakDays: randomInt(1, 10),
                    checkedAt: randomDate(30),
                }
            });
        }
        console.log(`  ✨ 创建 ${logCount} 条习惯打卡`);

        // 8.6 连胜记录 (2-4个分类)
        const streakCount = randomInt(2, 4);
        for (let i = 0; i < streakCount && i < STREAK_CATEGORIES.length; i++) {
            const cat = STREAK_CATEGORIES[i];
            const currentStreak = randomInt(1, 15);
            const maxStreak = Math.max(currentStreak, randomInt(currentStreak, 20));

            await prisma.category_streaks.upsert({
                where: { studentId_category: { studentId: student.id, category: cat.code } },
                create: {
                    id: crypto.randomUUID(),
                    studentId: student.id,
                    category: cat.code,
                    currentStreak,
                    maxStreak,
                },
                update: { currentStreak, maxStreak }
            });
        }
        console.log(`  🔥 创建 ${streakCount} 个连胜记录`);
    }

    console.log('\n✅ 演示学生数据创建完成!');
    console.log(`📊 共创建 ${createdStudents.length} 个学生及其完整数据`);
}

main()
    .catch(e => {
        console.error('❌ 创建失败:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
