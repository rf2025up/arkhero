"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParentRoutes = void 0;
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const JWT_SECRET = process.env.JWT_SECRET || 'arkok-family-secret';
const TEACHER_JWT_SECRET = process.env.JWT_SECRET || 'arkok-v2-secret';
class ParentRoutes {
    constructor(parentService) {
        this.router = (0, express_1.Router)();
        this.parentService = parentService;
        this.initializeRoutes();
    }
    initializeRoutes() {
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
    authenticateTeacher(req, res, next) {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: '请先登录' });
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, TEACHER_JWT_SECRET);
            req.user = decoded;
            next();
        }
        catch (error) {
            return res.status(401).json({ error: '登录已过期，请重新登录' });
        }
    }
    authenticateParent(req, res, next) {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ error: '请先登录' });
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
            if (decoded.type !== 'parent') {
                return res.status(403).json({ error: '无效的访问令牌' });
            }
            req.parent = decoded;
            next();
        }
        catch (error) {
            return res.status(401).json({ error: '登录已过期，请重新登录' });
        }
    }
    // ==================== 路由处理函数 ====================
    async login(req, res) {
        try {
            const { phone, password, schoolId } = req.body;
            if (!phone || !schoolId) {
                return res.status(400).json({ error: '请输入手机号' });
            }
            const result = await this.parentService.login(phone, password || '0000', schoolId);
            res.json(result);
        }
        catch (error) {
            console.error('[Parent Login Error]', error.message);
            res.status(401).json({ error: error.message });
        }
    }
    async bindByInviteCode(req, res) {
        try {
            const { phone, inviteCode, schoolId, studentName, name, identity } = req.body;
            if (!phone || !inviteCode || !schoolId || !studentName) {
                return res.status(400).json({ error: '请提供手机号、学生姓名和邀请码' });
            }
            const result = await this.parentService.bindByInviteCode(phone, inviteCode, schoolId, studentName, name, identity);
            res.json(result);
        }
        catch (error) {
            console.error('[Parent Bind Error]', error.message);
            res.status(400).json({ error: error.message });
        }
    }
    async getTodayTimeline(req, res) {
        try {
            const { studentId } = req.params;
            const parentId = req.parent.id;
            const result = await this.parentService.getTodayTimeline(studentId, parentId);
            res.json(result);
        }
        catch (error) {
            console.error('[Timeline Error]', error.message);
            res.status(403).json({ error: error.message });
        }
    }
    async getHistoryTimeline(req, res) {
        try {
            const { studentId } = req.params;
            const { page = '1', limit = '10' } = req.query;
            const parentId = req.parent.id;
            const result = await this.parentService.getHistoryTimeline(studentId, parentId, parseInt(page), parseInt(limit));
            res.json(result);
        }
        catch (error) {
            console.error('[History Error]', error.message);
            res.status(403).json({ error: error.message });
        }
    }
    async like(req, res) {
        try {
            const { studentId } = req.body;
            const parentId = req.parent.id;
            const result = await this.parentService.likeToday(studentId, parentId);
            res.json(result);
        }
        catch (error) {
            console.error('[Like Error]', error.message);
            res.status(400).json({ error: error.message });
        }
    }
    async comment(req, res) {
        try {
            const { studentId, comment } = req.body;
            const parentId = req.parent.id;
            if (!comment || comment.trim().length === 0) {
                return res.status(400).json({ error: '留言内容不能为空' });
            }
            const result = await this.parentService.sendComment(studentId, parentId, comment);
            res.json(result);
        }
        catch (error) {
            console.error('[Comment Error]', error.message);
            res.status(400).json({ error: error.message });
        }
    }
    async getGrowthProfile(req, res) {
        try {
            const { studentId } = req.params;
            const parentId = req.parent.id;
            const result = await this.parentService.getGrowthProfile(studentId, parentId);
            res.json(result);
        }
        catch (error) {
            console.error('[Growth Profile Error]', error.message);
            res.status(403).json({ error: error.message });
        }
    }
    async saveWeeklyPlan(req, res) {
        try {
            const { studentId } = req.params;
            const parentId = req.parent.id;
            const planData = req.body;
            // 验证访问权限
            await this.parentService.verifyParentAccess(parentId, studentId);
            // 保存周计划
            const result = await this.parentService.saveWeeklyPlan(studentId, planData);
            res.json(result);
        }
        catch (error) {
            console.error('[Save Weekly Plan Error]', error.message);
            res.status(400).json({ error: error.message });
        }
    }
    async getWeeklyPlan(req, res) {
        try {
            const { studentId } = req.params;
            const parentId = req.parent.id;
            // 验证访问权限
            await this.parentService.verifyParentAccess(parentId, studentId);
            const result = await this.parentService.getWeeklyPlan(studentId);
            res.json(result);
        }
        catch (error) {
            console.error('[Get Weekly Plan Error]', error.message);
            res.status(400).json({ error: error.message });
        }
    }
    async getCurrentWeekPlan(req, res) {
        try {
            const { studentId } = req.params;
            const result = await this.parentService.getCurrentWeekPlan(studentId);
            res.json({ success: true, data: result });
        }
        catch (error) {
            console.error('[Get Current Week Plan Error]', error.message);
            res.status(400).json({ error: error.message });
        }
    }
    async completeWeeklyPlanItem(req, res) {
        try {
            const { itemId } = req.params;
            const result = await this.parentService.completeWeeklyPlanItem(itemId);
            res.json(result);
        }
        catch (error) {
            console.error('[Complete Weekly Plan Item Error]', error.message);
            res.status(400).json({ error: error.message });
        }
    }
    async generateInviteCode(req, res) {
        try {
            const { studentId } = req.body;
            if (!studentId) {
                return res.status(400).json({ error: '请提供学生ID' });
            }
            const requesterId = req.user?.userId;
            const userRole = req.user?.role;
            const result = await this.parentService.generateInviteCode(studentId, requesterId, userRole);
            res.json(result);
        }
        catch (error) {
            console.error('[Invite Generate Error]', error.message);
            res.status(400).json({ error: error.message });
        }
    }
    async getStudentParents(req, res) {
        try {
            const { studentId } = req.params;
            const result = await this.parentService.getStudentParents(studentId);
            res.json(result);
        }
        catch (error) {
            console.error('[Get Parents Error]', error.message);
            res.status(400).json({ error: error.message });
        }
    }
    async unbindParent(req, res) {
        try {
            const { bindingId } = req.params;
            const result = await this.parentService.unbindParent(bindingId);
            res.json(result);
        }
        catch (error) {
            console.error('[Unbind Parent Error]', error.message);
            res.status(400).json({ error: error.message });
        }
    }
    async getTeacherFeedbacks(req, res) {
        try {
            const schoolId = req.user?.schoolId;
            const { unreadOnly } = req.query;
            if (!schoolId) {
                return res.status(400).json({ error: '无法获取学校信息' });
            }
            const result = await this.parentService.getTeacherFeedbacks(schoolId, unreadOnly === 'true');
            res.json(result);
        }
        catch (error) {
            console.error('[Get Feedbacks Error]', error.message);
            res.status(400).json({ error: error.message });
        }
    }
    async markFeedbackRead(req, res) {
        try {
            const { id } = req.params;
            const result = await this.parentService.markFeedbackRead(id);
            res.json(result);
        }
        catch (error) {
            console.error('[Mark Read Error]', error.message);
            res.status(400).json({ error: error.message });
        }
    }
    async markAllFeedbacksRead(req, res) {
        try {
            const schoolId = req.user?.schoolId;
            if (!schoolId) {
                return res.status(400).json({ error: '无法获取学校信息' });
            }
            const result = await this.parentService.markAllFeedbacksRead(schoolId);
            res.json(result);
        }
        catch (error) {
            console.error('[Mark All Read Error]', error.message);
            res.status(400).json({ error: error.message });
        }
    }
    async getStudentStreaks(req, res) {
        try {
            const { studentId } = req.params;
            const parentId = req.parent.id;
            await this.parentService.verifyParentAccess(parentId, studentId);
            const result = await this.parentService.getStudentStreaks(studentId);
            res.json({ success: true, data: result });
        }
        catch (error) {
            console.error('[Get Streaks Error]', error.message);
            res.status(403).json({ error: error.message });
        }
    }
    getRoutes() {
        return this.router;
    }
}
exports.ParentRoutes = ParentRoutes;
//# sourceMappingURL=parent.routes.js.map