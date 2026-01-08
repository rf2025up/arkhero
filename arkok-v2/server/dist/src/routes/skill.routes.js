"use strict";
/**
 * 五维内功修炼系统 - API 路由
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkillRoutes = void 0;
const express_1 = require("express");
const skill_service_1 = require("../services/skill.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
class SkillRoutes {
    constructor(authService) {
        this.authService = authService;
        this.router = (0, express_1.Router)();
        this.initializeRoutes();
    }
    initializeRoutes() {
        // 应用认证中间件
        // 注意：某些公开接口可能不需要认证，但在当前系统中，通常都需要
        // 如果有公开接口，可以把它放在 authenticateToken 之前
        // 1. 获取技能库列表 (可能公开，或需登录)
        // 暂定需登录
        this.router.get('/library', (0, auth_middleware_1.authenticateToken)(this.authService), async (req, res) => {
            try {
                const skills = await skill_service_1.skillService.getSkillLibrary();
                res.json({ success: true, data: skills });
            }
            catch (error) {
                console.error('[Get Skill Library Error]', error.message);
                res.status(400).json({ error: error.message });
            }
        });
        // 2. 获取学生五维属性
        this.router.get('/student/:studentId/stats', (0, auth_middleware_1.authenticateToken)(this.authService), async (req, res) => {
            try {
                const { studentId } = req.params;
                const stats = await skill_service_1.skillService.getStudentStats(studentId);
                res.json({ success: true, data: stats });
            }
            catch (error) {
                console.error('[Get Student Stats Error]', error.message);
                res.status(400).json({ error: error.message });
            }
        });
        // 3. 获取学生技能列表及进度
        this.router.get('/student/:studentId/skills', (0, auth_middleware_1.authenticateToken)(this.authService), async (req, res) => {
            try {
                const { studentId } = req.params;
                const skills = await skill_service_1.skillService.getStudentSkills(studentId);
                res.json({ success: true, data: skills });
            }
            catch (error) {
                console.error('[Get Student Skills Error]', error.message);
                res.status(400).json({ error: error.message });
            }
        });
        // 4. 教师认证技能（单个）- 需教师权限
        this.router.post('/certify', (0, auth_middleware_1.authenticateToken)(this.authService), auth_middleware_1.requireTeacher, async (req, res) => {
            try {
                const { studentId, skillCode, taskId, note } = req.body;
                const teacherId = req.user?.id || req.user?.userId;
                if (!studentId || !skillCode) {
                    return res.status(400).json({ error: '缺少必填参数' });
                }
                const result = await skill_service_1.skillService.recordPractice({
                    studentId,
                    skillCode,
                    certifiedBy: teacherId,
                    taskId,
                    note
                });
                res.json(result);
            }
            catch (error) {
                console.error('[Certify Skill Error]', error.message);
                res.status(400).json({ error: error.message });
            }
        });
        // 5. 教师批量认证技能 - 需教师权限
        this.router.post('/batch-certify', (0, auth_middleware_1.authenticateToken)(this.authService), auth_middleware_1.requireTeacher, async (req, res) => {
            try {
                const { studentId, skillCodes, taskId } = req.body;
                const teacherId = req.user?.id || req.user?.userId;
                if (!studentId || !skillCodes || !Array.isArray(skillCodes)) {
                    return res.status(400).json({ error: '缺少必填参数' });
                }
                const results = await skill_service_1.skillService.batchCertify({
                    studentId,
                    skillCodes,
                    certifiedBy: teacherId,
                    taskId
                });
                res.json({ success: true, results });
            }
            catch (error) {
                console.error('[Batch Certify Error]', error.message);
                res.status(400).json({ error: error.message });
            }
        });
    }
    getRoutes() {
        return this.router;
    }
}
exports.SkillRoutes = SkillRoutes;
exports.default = SkillRoutes;
//# sourceMappingURL=skill.routes.js.map