import { Router, Request, Response } from 'express';
import { CategoryStreakService } from '../services/category-streak.service';
import { PrismaClient } from '@prisma/client';

export class StreakRoutes {
    private router: Router;
    private streakService: CategoryStreakService;
    private prisma: PrismaClient; // 🆕 用于创建 task_record

    constructor(prisma: PrismaClient) {
        this.router = Router();
        this.prisma = prisma; // 🆕 保存 prisma 实例
        this.streakService = new CategoryStreakService(prisma);
        this.initRoutes();
    }

    private initRoutes() {
        // 更新连胜
        this.router.post('/update', async (req: Request, res: Response) => {
            try {
                const { studentId, category, isPerfect, categoryLabel } = req.body;

                if (!studentId || !category || typeof isPerfect !== 'boolean') {
                    return res.status(400).json({
                        success: false,
                        error: '缺少必要参数: studentId, category, isPerfect'
                    });
                }

                const result = await this.streakService.updateStreak(studentId, category, isPerfect);

                // 🆕 如果连胜增加，创建 task_record 以便家长端时间轴显示
                if (isPerfect && result.currentStreak > 0) {
                    // 获取学生信息以确定 schoolId
                    const student = await this.prisma.students.findUnique({
                        where: { id: studentId },
                        select: { schoolId: true, teacherId: true }
                    });

                    if (student) {
                        // 获取分类名称
                        const categoryItem = await this.prisma.streak_category_items.findFirst({
                            where: { code: category, schoolId: student.schoolId }
                        });

                        const label = categoryLabel || categoryItem?.name || category;

                        // 🆕 识别科目
                        let subject = '综合';
                        if (category.startsWith('cn_')) subject = '语文';
                        else if (category.startsWith('math_')) subject = '数学';
                        else if (category.startsWith('en_')) subject = '英语';

                        // 🆕 获取本周的日期范围（周一到周日）
                        const now = new Date();
                        const dayOfWeek = now.getDay();
                        const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // 周日是0，所以要-6
                        const weekStart = new Date(now);
                        weekStart.setDate(now.getDate() + mondayOffset);
                        weekStart.setHours(0, 0, 0, 0);
                        const weekEnd = new Date(weekStart);
                        weekEnd.setDate(weekStart.getDate() + 6);
                        weekEnd.setHours(23, 59, 59, 999);

                        // 🆕 查找本周是否已有连胜荣耀记录
                        const existingRecord = await this.prisma.task_records.findFirst({
                            where: {
                                studentId,
                                title: '连胜荣耀',
                                createdAt: { gte: weekStart, lte: weekEnd }
                            }
                        });

                        // 🆕 构建新的连胜项目
                        const newItem = {
                            category,
                            label,
                            subject,
                            currentStreak: result.currentStreak,
                            maxStreak: result.maxStreak,
                            updatedAt: new Date().toISOString()
                        };

                        if (existingRecord) {
                            // 🆕 更新现有记录：合并 items 数组
                            const existingContent = (existingRecord.content as any) || {};
                            const items: any[] = existingContent.items || [];

                            // 查找是否已有该项目
                            const existingIndex = items.findIndex(i => i.category === category);
                            if (existingIndex >= 0) {
                                // 更新已有项目
                                items[existingIndex] = newItem;
                            } else {
                                // 添加新项目
                                items.push(newItem);
                            }

                            await this.prisma.task_records.update({
                                where: { id: existingRecord.id },
                                data: {
                                    content: {
                                        isStreak: true,
                                        items,
                                        updatedAt: new Date().toISOString()
                                    },
                                    updatedAt: new Date()
                                }
                            });
                        } else {
                            // 创建新的本周连胜记录
                            await this.prisma.task_records.create({
                                data: {
                                    studentId,
                                    schoolId: student.schoolId,
                                    type: 'DAILY',
                                    task_category: 'GROWTH',
                                    title: '连胜荣耀',
                                    status: 'COMPLETED',
                                    expAwarded: 0,
                                    content: {
                                        isStreak: true,
                                        items: [newItem],
                                        createdAt: new Date().toISOString()
                                    }
                                }
                            });
                        }
                    }
                }

                res.json({ success: true, data: result });
            } catch (error: any) {
                console.error('[StreakRoutes] Update error:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // 获取学生某类别连胜
        this.router.get('/student/:studentId/:category', async (req: Request, res: Response) => {
            try {
                const { studentId, category } = req.params;
                const result = await this.streakService.getStreak(studentId, category);
                res.json({ success: true, data: result });
            } catch (error: any) {
                console.error('[StreakRoutes] Get streak error:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // 获取学生所有连胜
        this.router.get('/student/:studentId', async (req: Request, res: Response) => {
            try {
                const { studentId } = req.params;
                const result = await this.streakService.getAllStreaks(studentId);
                res.json({ success: true, data: result });
            } catch (error: any) {
                console.error('[StreakRoutes] Get all streaks error:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // 获取特定分类排行榜
        this.router.get('/leaderboard/:category', async (req: Request, res: Response) => {
            try {
                const { category } = req.params;
                const limit = parseInt(req.query.limit as string) || 10;
                const result = await this.streakService.getLeaderboard(category, limit);
                res.json({ success: true, data: result });
            } catch (error: any) {
                console.error('[StreakRoutes] Leaderboard error:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // 🆕 获取按学科聚合的排行榜 (风云榜)
        this.router.get('/leaderboard/subject/:subject', async (req: Request, res: Response) => {
            try {
                const { subject } = req.params;
                const schoolId = req.query.schoolId as string;
                if (!schoolId) {
                    return res.status(400).json({ success: false, error: '缺少 schoolId' });
                }
                const limit = parseInt(req.query.limit as string) || 10;
                const result = await this.streakService.getSubjectLeaderboard(schoolId, subject, limit);
                res.json({ success: true, data: result });
            } catch (error: any) {
                console.error('[StreakRoutes] Subject Leaderboard error:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // 🆕 获取所有连胜分类（含默认+自定义）
        this.router.get('/categories', async (req: Request, res: Response) => {
            try {
                const schoolId = req.query.schoolId as string;
                if (!schoolId) {
                    return res.status(400).json({ success: false, error: '缺少 schoolId' });
                }

                // 获取数据库中的所有分类（已在 seed 中初始化）
                const items = await this.streakService.getCategories(schoolId);

                // 按学科分组，不使用硬编码的默认值，完全依赖数据库
                const grouped = {
                    chinese: items.filter((i: any) => i.subject === 'chinese'),
                    math: items.filter((i: any) => i.subject === 'math'),
                    english: items.filter((i: any) => i.subject === 'english'),
                    other: items.filter((i: any) => !['chinese', 'math', 'english'].includes(i.subject))
                };

                res.json({ success: true, data: grouped });
            } catch (error: any) {
                console.error('[StreakRoutes] Get categories error:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // 🆕 添加自定义连胜分类
        this.router.post('/categories', async (req: Request, res: Response) => {
            try {
                const { schoolId, subject, name } = req.body;
                if (!schoolId || !subject || !name) {
                    return res.status(400).json({ success: false, error: '缺少必要参数' });
                }

                // 生成唯一code
                const code = `custom_${subject}_${Date.now()}`;
                const result = await this.streakService.addCategory(schoolId, subject, name, code);
                res.json({ success: true, data: result });
            } catch (error: any) {
                console.error('[StreakRoutes] Add category error:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });

        // 🆕 删除自定义连胜分类
        this.router.delete('/categories/:id', async (req: Request, res: Response) => {
            try {
                const { id } = req.params;
                await this.streakService.deleteCategory(id);
                res.json({ success: true });
            } catch (error: any) {
                console.error('[StreakRoutes] Delete category error:', error);
                res.status(500).json({ success: false, error: error.message });
            }
        });
    }

    public getRouter(): Router {
        return this.router;
    }
}
