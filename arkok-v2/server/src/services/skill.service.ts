/**
 * 五维内功修炼系统 - 技能服务
 * 处理技能修炼记录、五维属性增益、成就解锁等核心逻辑
 */

import _prisma from '../utils/prisma';
import { isStreakMilestone } from '../config/skillMapping.config';
const prisma = _prisma as any;  // 绕过 IDE 类型缓存问题

// 五维属性映射
const ATTRIBUTE_GAIN_MAP: Record<string, number> = {
    reflection: 5,  // 内省力
    logic: 5,       // 逻辑力
    autonomy: 5,    // 自主力
    planning: 5,    // 规划力
    grit: 5         // 毅力值
};

class SkillService {
    private io: any;

    setSocket(io: any) {
        this.io = io;
    }

    /**
     * 获取技能库列表
     */
    async getSkillLibrary() {
        return prisma.skills.findMany({
            where: { isActive: true },
            orderBy: [{ category: 'asc' }, { code: 'asc' }]
        });
    }

    /**
     * 获取学生五维属性
     */
    async getStudentStats(studentId: string) {
        let stats = await prisma.student_stats.findUnique({
            where: { studentId }
        });

        // 如果不存在则创建初始记录
        if (!stats) {
            stats = await prisma.student_stats.create({
                data: { studentId }
            });
        }

        return stats;
    }

    /**
     * 获取学生技能列表及进度
     */
    async getStudentSkills(studentId: string) {
        // 获取所有技能定义
        const allSkills = await prisma.skills.findMany({
            where: { isActive: true },
            orderBy: [{ category: 'asc' }, { code: 'asc' }]
        });

        // 获取学生已解锁/进度中的技能
        const studentSkills = await prisma.student_skills.findMany({
            where: { studentId }
        });

        const skillMap = new Map(studentSkills.map(s => [s.skillId, s]));

        // 合并返回
        return allSkills.map(skill => {
            const progress = skillMap.get(skill.id) as any;
            const levelData = skill.levelData as any[];

            return {
                id: skill.id,
                code: skill.code,
                name: skill.name,
                category: skill.category,
                attribute: skill.attribute,
                currentExp: progress?.currentExp ?? 0,
                level: progress?.level ?? 0,
                levelTitle: this.getLevelTitle(levelData, progress?.level ?? 0),
                nextLevelExp: this.getNextLevelExp(levelData, progress?.level ?? 0),
                unlockedAt: progress?.unlockedAt ?? null
            };
        });
    }

    /**
     * 记录一次技能修炼（教师认证触发）
     */
    async recordPractice(params: {
        studentId: string;
        skillCode: string;
        expGained?: number;
        certifiedBy: string;
        taskId?: string;
        note?: string;
    }) {
        const { studentId, skillCode, expGained = 1, certifiedBy, taskId, note } = params;

        // 查找技能
        const skill = await prisma.skills.findUnique({
            where: { code: skillCode }
        });
        if (!skill) throw new Error(`技能不存在: ${skillCode}`);

        // 记录修炼
        await prisma.skill_practices.create({
            data: {
                studentId,
                skillId: skill.id,
                expGained,
                certifiedBy,
                taskId,
                note
            }
        });

        // 更新/创建学生技能进度
        let studentSkill = await prisma.student_skills.findUnique({
            where: { studentId_skillId: { studentId, skillId: skill.id } }
        });

        const newExp = (studentSkill?.currentExp || 0) + expGained;
        const levelData = skill.levelData as any[];
        const newLevel = this.calculateLevel(levelData, newExp);
        const oldLevel = studentSkill?.level || 0;

        if (studentSkill) {
            studentSkill = await prisma.student_skills.update({
                where: { id: studentSkill.id },
                data: {
                    currentExp: newExp,
                    level: newLevel,
                    levelUpAt: newLevel > oldLevel ? new Date() : studentSkill.levelUpAt,
                    unlockedAt: oldLevel === 0 && newLevel >= 1 ? new Date() : studentSkill.unlockedAt
                }
            });
        } else {
            studentSkill = await prisma.student_skills.create({
                data: {
                    studentId,
                    skillId: skill.id,
                    currentExp: newExp,
                    level: newLevel,
                    levelUpAt: newLevel >= 1 ? new Date() : null,
                    unlockedAt: newLevel >= 1 ? new Date() : null
                }
            });
        }

        // 增加五维属性
        await this.addAttributeExp(studentId, skill.attribute, expGained);

        // 检查是否升级，发送大屏通知
        if (newLevel > oldLevel && newLevel >= 1) {
            const student = await prisma.students.findUnique({
                where: { id: studentId },
                select: { name: true, schoolId: true }
            });

            const levelTitle = this.getLevelTitle(levelData, newLevel);

            // 大屏通知
            if (this.io) {
                this.io.emit('skill_levelup', {
                    studentId,
                    studentName: student?.name,
                    className: (student as any)?.className || '', // Prisma type might need include className or explicit select
                    skillCode: skill.code,
                    skillName: skill.name,
                    level: newLevel,
                    levelTitle,
                    expGained
                });
            }
            console.log(`🎖️ 技能升级通知: ${student?.name} 解锁 [${skill.name}·${levelTitle}]`);

            // 6. 写入 task_records (为成长长河)
            try {
                await prisma.task_records.create({
                    data: {
                        schoolId: student?.schoolId || '',
                        studentId,
                        type: 'SKILL',
                        task_category: 'SKILL',
                        title: `点亮技能：${skill.name} · ${levelTitle}`,
                        content: {
                            skillCode: skill.code,
                            level: newLevel,
                            expGained,
                            skillName: skill.name,
                            levelTitle
                        },
                        status: 'COMPLETED',
                        expAwarded: 0, // 已经在 addExp 加上了，这里仅记录
                        isOverridden: false
                    }
                });
                console.log(`✅ 技能成长记录已生成`);
            } catch (err) {
                console.error('❌ 生成技能成长记录失败:', err);
            }
        }

        return {
            success: true,
            skill: skill.name,
            expGained,
            newExp,
            newLevel,
            levelUp: newLevel > oldLevel
        };
    }

    /**
     * 增加五维属性经验
     */
    async addAttributeExp(studentId: string, attribute: string, exp: number) {
        // 确保 stats 记录存在
        await this.getStudentStats(studentId);

        const updateData: any = {};
        updateData[attribute] = { increment: exp };

        await prisma.student_stats.update({
            where: { studentId },
            data: updateData
        });
    }

    /**
     * 更新连胜记录
     */
    async updateStreak(studentId: string, increment: boolean = true) {
        const stats = await this.getStudentStats(studentId);

        if (increment) {
            const newStreak = stats.streak + 1;
            await prisma.student_stats.update({
                where: { studentId },
                data: {
                    streak: newStreak,
                    maxStreak: Math.max(newStreak, stats.maxStreak)
                }
            });

            // 🆕 连胜里程碑奖励 g_streak (薪火相传)
            if (isStreakMilestone(newStreak)) {
                console.log(`🔥 [SKILL_SERVICE] 连胜${newStreak}天里程碑达成，奖励 g_streak`);
                await this.recordPractice({
                    studentId,
                    skillCode: 'g_streak',
                    certifiedBy: 'SYSTEM',
                    note: `连胜${newStreak}天里程碑奖励`
                });
            }
        } else {
            // 中断连胜
            await prisma.student_stats.update({
                where: { studentId },
                data: { streak: 0 }
            });
        }
    }

    /**
     * 🆕 重新过关成功奖励 g_retry (百折不挠)
     */
    async awardRetrySkill(studentId: string, taskName: string, certifiedBy: string) {
        console.log(`💪 [SKILL_SERVICE] 重新过关成功，奖励 g_retry: ${taskName}`);
        await this.recordPractice({
            studentId,
            skillCode: 'g_retry',
            certifiedBy,
            note: `重新过关成功: ${taskName}`
        });
    }

    /**
     * 批量认证技能（教师端过关页使用）
     */
    async batchCertify(params: {
        studentId: string;
        skillCodes: string[];
        certifiedBy: string;
        taskId?: string;
    }) {
        const results = [];
        for (const skillCode of params.skillCodes) {
            try {
                const result = await this.recordPractice({
                    studentId: params.studentId,
                    skillCode,
                    certifiedBy: params.certifiedBy,
                    taskId: params.taskId
                });
                results.push(result);
            } catch (e: any) {
                results.push({ success: false, skill: skillCode, error: e.message });
            }
        }
        return results;
    }

    // ========== 辅助方法 ==========

    private calculateLevel(levelData: any[], currentExp: number): number {
        let level = 0;
        for (const l of levelData) {
            if (currentExp >= l.exp) {
                level = l.lvl;
            } else {
                break;
            }
        }
        return level;
    }

    private getLevelTitle(levelData: any[], level: number): string {
        if (level === 0) return '未解锁';
        const found = levelData.find(l => l.lvl === level);
        return found?.title || `Lv${level}`;
    }

    private getNextLevelExp(levelData: any[], currentLevel: number): number | null {
        const nextLevel = levelData.find(l => l.lvl === currentLevel + 1);
        return nextLevel?.exp || null;
    }
}

export const skillService = new SkillService();
