import { Router, Request, Response, NextFunction } from 'express';
import { ParentService } from '../services/parent.service';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'arkok-family-secret';
const TEACHER_JWT_SECRET = process.env.JWT_SECRET || 'arkok-v2-secret';

export class ParentRoutes {
    private router: Router;
    private parentService: ParentService;

    constructor(parentService: ParentService) {
        this.router = Router();
        this.parentService = parentService;
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        // ==================== 认证相关（无需Token） ====================

        // 家长登录
        this.router.post('/auth/login', this.login.bind(this));

        // 通过邀请码绑定孩子
        this.router.post('/auth/bind', this.bindByInviteCode.bind(this));

        // ==================== 时间轴相关 ====================

        // 获取今日动态
        this.router.get('/timeline/:studentId/today', this.authenticateParent, this.getTodayTimeline.bind(this));

        // 获取历史动态
        this.router.get('/timeline/:studentId/history', this.authenticateParent, this.getHistoryTimeline.bind(this));

        // ==================== 反馈相关 ====================

        // 点赞
        this.router.post('/feedback/like', this.authenticateParent, this.like.bind(this));

        // 留言
        this.router.post('/feedback/comment', this.authenticateParent, this.comment.bind(this));

        // ==================== 成长档案 ====================

        // 获取成长档案数据
        this.router.get('/growth/:studentId', this.authenticateParent, this.getGrowthProfile.bind(this));

        // 🆕 获取连胜记录
        this.router.get('/streaks/:studentId', this.authenticateParent, this.getStudentStreaks.bind(this));

        // ==================== 周计划相关 ====================

        // 保存周计划
        this.router.post('/weekly-plan/:studentId', this.authenticateParent, this.saveWeeklyPlan.bind(this));

        // 获取周计划
        this.router.get('/weekly-plan/:studentId', this.authenticateParent, this.getWeeklyPlan.bind(this));

        // ==================== 教师端辅助接口 ====================

        // 获取学生当前周计划（教师端调用）
        this.router.get('/weekly-plan/:studentId/current', this.authenticateTeacher, this.getCurrentWeekPlan.bind(this));

        // 完成周计划项目（教师端调用）
        this.router.patch('/weekly-plan-item/:itemId/complete', this.authenticateTeacher, this.completeWeeklyPlanItem.bind(this));

        // 生成邀请码（教师端调用）
        this.router.post('/invite/generate', this.authenticateTeacher, this.generateInviteCode.bind(this));

        // 获取学生的家长列表（教师端调用）
        this.router.get('/students/:studentId/parents', this.authenticateTeacher, this.getStudentParents.bind(this));

        // 解除家长绑定（教师端调用）
        this.router.delete('/bindings/:bindingId', this.authenticateTeacher, this.unbindParent.bind(this));

        // 获取家校反馈列表（教师端调用）
        this.router.get('/feedbacks', this.authenticateTeacher, this.getTeacherFeedbacks.bind(this));

        // 标记反馈已读
        this.router.post('/feedbacks/:id/read', this.authenticateTeacher, this.markFeedbackRead.bind(this));

        // 全部标记已读
        this.router.post('/feedbacks/read-all', this.authenticateTeacher, this.markAllFeedbacksRead.bind(this));
    }

    // ==================== 中间件 ====================

    private authenticateTeacher(req: Request, res: Response, next: NextFunction) {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: '请先登录' });
        }

        try {
            const decoded = jwt.verify(token, TEACHER_JWT_SECRET) as any;
            (req as any).user = decoded;
            next();
        } catch (error) {
            return res.status(401).json({ error: '登录已过期，请重新登录' });
        }
    }

    private authenticateParent(req: Request, res: Response, next: NextFunction) {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: '请先登录' });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET) as any;
            if (decoded.type !== 'parent') {
                return res.status(403).json({ error: '无效的访问令牌' });
            }
            (req as any).parent = decoded;
            next();
        } catch (error) {
            return res.status(401).json({ error: '登录已过期，请重新登录' });
        }
    }

    // ==================== 路由处理函数 ====================

    private async login(req: Request, res: Response) {
        try {
            const { phone, password, schoolId } = req.body;

            if (!phone || !schoolId) {
                return res.status(400).json({ error: '请输入手机号' });
            }

            const result = await this.parentService.login(phone, password || '0000', schoolId);
            res.json(result);
        } catch (error: any) {
            console.error('[Parent Login Error]', error.message);
            res.status(401).json({ error: error.message });
        }
    }

    private async bindByInviteCode(req: Request, res: Response) {
        try {
            const { phone, inviteCode, schoolId, studentName, name, identity } = req.body;

            if (!phone || !inviteCode || !schoolId || !studentName) {
                return res.status(400).json({ error: '请提供手机号、学生姓名和邀请码' });
            }

            const result = await this.parentService.bindByInviteCode(
                phone,
                inviteCode,
                schoolId,
                studentName,
                name,
                identity
            );
            res.json(result);
        } catch (error: any) {
            console.error('[Parent Bind Error]', error.message);
            res.status(400).json({ error: error.message });
        }
    }

    private async getTodayTimeline(req: Request, res: Response) {
        try {
            const { studentId } = req.params;
            const parentId = (req as any).parent.id;

            const result = await this.parentService.getTodayTimeline(studentId, parentId);
            res.json(result);
        } catch (error: any) {
            console.error('[Timeline Error]', error.message);
            res.status(403).json({ error: error.message });
        }
    }

    private async getHistoryTimeline(req: Request, res: Response) {
        try {
            const { studentId } = req.params;
            const { page = '1', limit = '10' } = req.query;
            const parentId = (req as any).parent.id;

            const result = await this.parentService.getHistoryTimeline(
                studentId,
                parentId,
                parseInt(page as string),
                parseInt(limit as string)
            );
            res.json(result);
        } catch (error: any) {
            console.error('[History Error]', error.message);
            res.status(403).json({ error: error.message });
        }
    }

    private async like(req: Request, res: Response) {
        try {
            const { studentId } = req.body;
            const parentId = (req as any).parent.id;

            const result = await this.parentService.likeToday(studentId, parentId);
            res.json(result);
        } catch (error: any) {
            console.error('[Like Error]', error.message);
            res.status(400).json({ error: error.message });
        }
    }

    private async comment(req: Request, res: Response) {
        try {
            const { studentId, comment } = req.body;
            const parentId = (req as any).parent.id;

            if (!comment || comment.trim().length === 0) {
                return res.status(400).json({ error: '留言内容不能为空' });
            }

            const result = await this.parentService.sendComment(studentId, parentId, comment);
            res.json(result);
        } catch (error: any) {
            console.error('[Comment Error]', error.message);
            res.status(400).json({ error: error.message });
        }
    }

    private async getGrowthProfile(req: Request, res: Response) {
        try {
            const { studentId } = req.params;
            const parentId = (req as any).parent.id;

            const result = await this.parentService.getGrowthProfile(studentId, parentId);
            res.json(result);
        } catch (error: any) {
            console.error('[Growth Profile Error]', error.message);
            res.status(403).json({ error: error.message });
        }
    }

    private async saveWeeklyPlan(req: Request, res: Response) {
        try {
            const { studentId } = req.params;
            const parentId = (req as any).parent.id;
            const planData = req.body;

            // 验证访问权限
            await this.parentService.verifyParentAccess(parentId, studentId);

            // 保存周计划
            const result = await this.parentService.saveWeeklyPlan(studentId, planData);
            res.json(result);
        } catch (error: any) {
            console.error('[Save Weekly Plan Error]', error.message);
            res.status(400).json({ error: error.message });
        }
    }

    private async getWeeklyPlan(req: Request, res: Response) {
        try {
            const { studentId } = req.params;
            const parentId = (req as any).parent.id;

            // 验证访问权限
            await this.parentService.verifyParentAccess(parentId, studentId);

            const result = await this.parentService.getWeeklyPlan(studentId);
            res.json(result);
        } catch (error: any) {
            console.error('[Get Weekly Plan Error]', error.message);
            res.status(400).json({ error: error.message });
        }
    }

    private async getCurrentWeekPlan(req: Request, res: Response) {
        try {
            const { studentId } = req.params;
            const result = await this.parentService.getCurrentWeekPlan(studentId);
            res.json({ success: true, data: result });
        } catch (error: any) {
            console.error('[Get Current Week Plan Error]', error.message);
            res.status(400).json({ error: error.message });
        }
    }

    private async completeWeeklyPlanItem(req: Request, res: Response) {
        try {
            const { itemId } = req.params;
            const result = await this.parentService.completeWeeklyPlanItem(itemId);
            res.json(result);
        } catch (error: any) {
            console.error('[Complete Weekly Plan Item Error]', error.message);
            res.status(400).json({ error: error.message });
        }
    }

    private async generateInviteCode(req: Request, res: Response) {
        try {
            const { studentId } = req.body;

            if (!studentId) {
                return res.status(400).json({ error: '请提供学生ID' });
            }

            const requesterId = (req as any).user?.userId;
            const userRole = (req as any).user?.role;

            const result = await this.parentService.generateInviteCode(studentId, requesterId, userRole);
            res.json(result);
        } catch (error: any) {
            console.error('[Invite Generate Error]', error.message);
            res.status(400).json({ error: error.message });
        }
    }

    private async getStudentParents(req: Request, res: Response) {
        try {
            const { studentId } = req.params;
            const result = await this.parentService.getStudentParents(studentId);
            res.json(result);
        } catch (error: any) {
            console.error('[Get Parents Error]', error.message);
            res.status(400).json({ error: error.message });
        }
    }

    private async unbindParent(req: Request, res: Response) {
        try {
            const { bindingId } = req.params;
            const result = await this.parentService.unbindParent(bindingId);
            res.json(result);
        } catch (error: any) {
            console.error('[Unbind Parent Error]', error.message);
            res.status(400).json({ error: error.message });
        }
    }

    private async getTeacherFeedbacks(req: Request, res: Response) {
        try {
            const schoolId = (req as any).user?.schoolId;
            const { unreadOnly } = req.query;

            if (!schoolId) {
                return res.status(400).json({ error: '无法获取学校信息' });
            }

            const result = await this.parentService.getTeacherFeedbacks(schoolId, unreadOnly === 'true');
            res.json(result);
        } catch (error: any) {
            console.error('[Get Feedbacks Error]', error.message);
            res.status(400).json({ error: error.message });
        }
    }

    private async markFeedbackRead(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const result = await this.parentService.markFeedbackRead(id);
            res.json(result);
        } catch (error: any) {
            console.error('[Mark Read Error]', error.message);
            res.status(400).json({ error: error.message });
        }
    }

    private async markAllFeedbacksRead(req: Request, res: Response) {
        try {
            const schoolId = (req as any).user?.schoolId;

            if (!schoolId) {
                return res.status(400).json({ error: '无法获取学校信息' });
            }

            const result = await this.parentService.markAllFeedbacksRead(schoolId);
            res.json(result);
        } catch (error: any) {
            console.error('[Mark All Read Error]', error.message);
            res.status(400).json({ error: error.message });
        }
    }

    private async getStudentStreaks(req: Request, res: Response) {
        try {
            const { studentId } = req.params;
            const parentId = (req as any).parent.id;

            await this.parentService.verifyParentAccess(parentId, studentId);

            const result = await this.parentService.getStudentStreaks(studentId);
            res.json({ success: true, data: result });
        } catch (error: any) {
            console.error('[Get Streaks Error]', error.message);
            res.status(403).json({ error: error.message });
        }
    }

    public getRoutes(): Router {
        return this.router;
    }
}
