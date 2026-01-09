import { PrismaClient } from '@prisma/client';
import process from 'process';

const prisma = new PrismaClient();

async function seedWuZihanData() {
    console.log('🌱 开始为 [吴梓涵] 生成技能与属性数据...');

    // 1. 查找学生
    const student = await prisma.students.findFirst({
        where: { name: '吴梓涵' }
    });

    if (!student) {
        console.error('❌ 未找到学生 [吴梓涵]，请确认数据库中已存在该学生。');
        return;
    }

    const studentId = student.id;
    console.log(`👤 找到学生: ${student.name} (ID: ${studentId})`);

    // 2. 模拟技能经验分配 (总经验 4397 中的一部分来自技能)
    // 维度分: 自主70, 毅力70, 规划60, 思考50, 复盘60 (合计 310)
    const skillsToSeed = [
        // 🟥 内省力 (Reflection) - 合计 60 exp
        { code: 'r_color', exp: 25, level: 2 }, // 三色修补术
        { code: 'r_scan', exp: 15, level: 2 },  // 雷达自检眼
        { code: 'r_diagnosis', exp: 10, level: 2 }, // 试卷体检法
        { code: 'r_detail', exp: 10, level: 1 }, // 细读定身咒

        // 🟦 逻辑力 (Logic) - 合计 50 exp
        { code: 'l_source', exp: 20, level: 2 }, // 母题溯源眼
        { code: 'l_draft', exp: 15, level: 1 },  // 思维草图术
        { code: 'l_struct', exp: 15, level: 2 }, // 结构解牛刀

        // 🟨 自主力 (Autonomy) - 合计 70 exp
        { code: 'a_feynman', exp: 30, level: 2 }, // 费曼传道
        { code: 'a_bloom', exp: 20, level: 1 },   // 语感爆棚手
        { code: 'a_hunt', exp: 20, level: 2 },    // 素材捕捉手

        // 🟩 规划力 (Planning) - 合计 60 exp
        { code: 'p_helm', exp: 20, level: 3 },    // 掌舵规划术
        { code: 'p_scout', exp: 20, level: 2 },   // 前哨侦查兵
        { code: 'p_bag', exp: 20, level: 1 },     // 收纳卫士

        // 🟧 毅力值 (Grit) - 合计 70 exp
        { code: 'g_drill', exp: 40, level: 1 },   // 千锤百炼
        { code: 'g_retry', exp: 15, level: 2 },   // 百折不挠
        { code: 'g_streak', exp: 15, level: 1 },  // 薪火相传
    ];

    console.log('⚔️  正在生成技能进度...');
    // 获取所有技能映射
    const allSkills = await prisma.skills.findMany();
    const skillCodeToId = Object.fromEntries(allSkills.map(s => [s.code, s.id]));

    for (const s of skillsToSeed) {
        const skillId = skillCodeToId[s.code];
        if (!skillId) {
            console.warn(`⚠️  跳过未知技能代码: ${s.code}`);
            continue;
        }

        await prisma.student_skills.upsert({
            where: {
                studentId_skillId: {
                    studentId,
                    skillId: skillId
                }
            },
            update: {
                level: s.level,
                currentExp: s.exp,
                levelUpAt: new Date()
            },
            create: {
                studentId,
                skillId: skillId,
                level: s.level,
                currentExp: s.exp,
                levelUpAt: new Date(),
                unlockedAt: new Date()
            }
        });
    }

    // 3. 更新维度属性 (student_stats)
    console.log('📊 正在更新五维属性记录...');
    await prisma.student_stats.upsert({
        where: { studentId },
        update: {
            autonomy: 70,
            logic: 50,
            reflection: 60,
            planning: 60,
            grit: 70,
            updatedAt: new Date()
        },
        create: {
            studentId,
            autonomy: 70,
            logic: 50,
            reflection: 60,
            planning: 60,
            grit: 70,
            updatedAt: new Date()
        }
    });

    // 4. 确保总经验一致
    await prisma.students.update({
        where: { id: studentId },
        data: { exp: 4397 }
    });

    console.log('✅ [吴梓涵] 的技能与属性数据生成完成！');
    console.log('   - 总经验: 4397');
    console.log('   - 已点亮技能: 15 个');
    console.log('   - 五维分布: 自主70, 思考50, 复盘60, 规划60, 毅力70');
}

seedWuZihanData()
    .catch(e => {
        console.error('❌ 生成失败:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
