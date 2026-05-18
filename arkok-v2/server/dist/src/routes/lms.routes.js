"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LMSRoutes = void 0;
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const skill_service_1 = require("../services/skill.service");
const taskSkillMapping_1 = require("../utils/taskSkillMapping");
/**
 * 学习管理系统 (LMS) 路由
 */
class LMSRoutes {
    constructor(lmsService, authService, prisma) {
        this.lmsService = lmsService;
        this.authService = authService;
        this.prisma = prisma;
        this.router = (0, express_1.Router)();
        this.initializeRoutes();
    }
    initializeRoutes() {
        // 🔍 调试日志：记录所有进入 LMS 路由的请求
        this.router.use((req, res, next) => {
            console.log(`🔵 [LMS_ROUTES] ${req.method} ${req.path} - Body:`, JSON.stringify(req.body).slice(0, 200));
            next();
        });
        // 应用认证中间件到所有路由
        this.router.use((0, auth_middleware_1.authenticateToken)(this.authService));
        // 临时处理 mistakes 端点
        this.router.get('/mistakes', async (req, res) => {
            try {
                res.json({
                    success: true,
                    data: [],
                    message: '错题数据获取成功'
                });
            }
            catch (error) {
                console.error('获取错题数据失败:', error);
                res.status(500).json({
                    success: false,
                    message: '获取错题数据失败'
                });
            }
        });
        // 临时处理 records 端点
        this.router.get('/records', async (req, res) => {
            try {
                res.json({
                    success: true,
                    data: [],
                    message: '记录数据获取成功'
                });
            }
            catch (error) {
                console.error('获取记录数据失败:', error);
                res.status(500).json({
                    success: false,
                    message: '获取记录数据失败'
                });
            }
        });
        // 🆕 创建任务记录
        this.router.post('/records', async (req, res) => {
            try {
                const { studentId, type, title, status, category, subcategory, date, courseInfo, exp } = req.body;
                console.log(`🆕 [POST /records] 创建记录: ${title} for student ${studentId}, type=${type}, category=${category}, subcategory=${subcategory}`);
                if (!studentId || !title) {
                    return res.status(400).json({ success: false, message: '缺少必填字段: studentId 或 title' });
                }
                const record = await this.lmsService.createTaskRecord({
                    studentId,
                    type: type || 'QC',
                    title,
                    status: status || 'COMPLETED',
                    category: category || '基础过关',
                    subcategory: subcategory || '', // 🆕 分类标题
                    date: date || new Date().toISOString().split('T')[0],
                    courseInfo,
                    exp: exp || 5
                });
                res.json({ success: true, data: record, message: '记录创建成功' });
            }
            catch (error) {
                console.error('❌ [POST /records] 创建记录失败:', error);
                res.status(500).json({ success: false, message: '创建记录失败', error: error.message });
            }
        });
        // 🆕 记录尝试次数递增
        this.router.patch('/records/:id/attempt', async (req, res) => {
            try {
                const { id } = req.params;
                const result = await this.lmsService.incrementTaskAttempts(id);
                res.json({ success: true, data: result, message: '尝试次数已更新' });
            }
            catch (error) {
                console.error('❌ 更新记录尝试失败:', error);
                res.status(500).json({ success: false, message: '更新记录尝试次数失败' });
            }
        });
        // 🆕 任务库管理：创建新任务 (支持 4 大类 + 子标题)
        this.router.post('/task-library', async (req, res) => {
            try {
                const { name, educationalDomain, educationalSubcategory, defaultExp, type } = req.body;
                const user = req.user;
                // 验证必填项
                if (!name || !educationalDomain || !educationalSubcategory) {
                    return res.status(400).json({
                        success: false,
                        message: '缺少必填字段: name, educationalDomain 或 educationalSubcategory'
                    });
                }
                const task = await this.lmsService.createTaskLibraryItem({
                    schoolId: user.schoolId || 'default',
                    name,
                    educationalDomain,
                    educationalSubcategory,
                    defaultExp: defaultExp || 5,
                    type: type || 'TASK',
                    isActive: true,
                    userRole: user.role
                });
                res.json({ success: true, data: task, message: '任务创建成功' });
            }
            catch (error) {
                console.error('❌ Error in POST /api/lms/task-library:', error);
                res.status(500).json({ success: false, message: '创建任务库项目失败', error: error.message });
            }
        });
        // 🆕 任务库管理：修改任务 (PUT)
        this.router.put('/task-library/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const data = req.body;
                const user = req.user;
                const updated = await this.lmsService.updateTaskLibraryItem(id, data, user.role);
                res.json({ success: true, data: updated, message: '任务更新成功' });
            }
            catch (error) {
                console.error('❌ Error in PUT /api/lms/task-library/:id:', error);
                res.status(500).json({ success: false, message: '更新任务失败', error: error.message });
            }
        });
        // 🆕 任务库管理：删除任务
        this.router.delete('/task-library/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const user = req.user;
                await this.lmsService.deleteTaskLibraryItem(id, user.schoolId, user.role);
                res.json({ success: true, message: '任务删除成功' });
            }
            catch (error) {
                console.error('❌ Error in DELETE /api/lms/task-library/:id:', error);
                res.status(500).json({ success: false, message: '删除任务失败', error: error.message });
            }
        });
        // 任务库获取
        this.router.get('/task-library', async (req, res) => {
            try {
                const tasks = await this.lmsService.getTaskLibrary();
                res.json({ success: true, data: tasks, message: 'Task library retrieved successfully' });
            }
            catch (error) {
                console.error('❌ Error in GET /api/lms/task-library:', error);
                res.status(500).json({ success: false, message: 'Failed to get task library', error: error.message });
            }
        });
        // 🆕 发布教学计划
        this.router.post('/publish', async (req, res) => {
            try {
                const io = req.app.get('io');
                const { courseInfo, qcTasks, normalTasks, specialTasks, progress } = req.body;
                const user = req.user;
                const publisherId = user.userId;
                if (user.role === 'ADMIN') {
                    return res.status(403).json({
                        success: false,
                        message: '校长无权限发布备课内容，请切换到具体老师班级',
                        code: 'ADMIN_PUBLISH_FORBIDDEN'
                    });
                }
                if (!courseInfo || !courseInfo.title) {
                    return res.status(400).json({ success: false, message: 'Course info and title are required' });
                }
                const publishRequest = {
                    schoolId: user.schoolId,
                    teacherId: publisherId,
                    title: courseInfo.title,
                    content: {
                        courseInfo,
                        qcTasks,
                        normalTasks,
                        specialTasks,
                        publisherId,
                        securityScope: 'TEACHERS_STUDENTS',
                        publishedAt: new Date().toISOString()
                    },
                    date: courseInfo.date || new Date().toLocaleDateString('en-CA'),
                    progress,
                    tasks: []
                };
                // 构建任务数据 (保持与旧版本一致的解析逻辑)
                if (qcTasks)
                    publishRequest.tasks.push(...qcTasks.map((t) => ({ type: 'QC', title: t.taskName, content: { category: t.category, difficulty: t.difficulty }, expAwarded: t.defaultExp || 5 })));
                if (normalTasks) {
                    console.log('🔍 [DEBUG] normalTasks 原始数据:', normalTasks.slice(0, 2).map((t) => ({ taskName: t.taskName, category: t.category, subcategory: t.subcategory })));
                    publishRequest.tasks.push(...normalTasks.map((t) => ({ type: 'TASK', title: t.taskName, content: { category: t.category, subcategory: t.subcategory || '', taskId: t.taskId }, expAwarded: t.defaultExp || 10 })));
                    console.log('🔍 [DEBUG] 构建后 tasks:', publishRequest.tasks.slice(-2).map((t) => ({ title: t.title, content: t.content })));
                }
                if (specialTasks)
                    publishRequest.tasks.push(...specialTasks.map((t) => ({ type: 'SPECIAL', title: t.taskName, content: { category: t.category, description: t.description, targetStudentNames: t.targetStudentNames }, expAwarded: t.defaultExp || 15 })));
                const result = await this.lmsService.publishPlan(publishRequest, io);
                res.json({ success: true, message: 'Lesson plan published successfully', data: result });
            }
            catch (error) {
                console.error('❌ Error in POST /api/lms/publish:', error);
                const errorMessage = error.message;
                // ✅ 特殊处理：老师没有学生的情况
                if (errorMessage.includes('该老师名下暂无学生')) {
                    return res.status(400).json({
                        success: false,
                        message: '发布失败：您名下暂无学生',
                        code: 'NO_STUDENTS_ASSIGNED',
                        hint: '请先在"班级首页"中添加或转入学生，然后再发布备课内容'
                    });
                }
                res.status(500).json({ success: false, message: 'Failed to publish lesson plan', error: errorMessage });
            }
        });
        // 计划列表
        this.router.get('/plans', async (req, res) => {
            try {
                const { schoolId } = req.query;
                const page = parseInt(req.query.page) || 1;
                const limit = parseInt(req.query.limit) || 20;
                const startDate = req.query.startDate ? new Date(req.query.startDate) : undefined;
                const endDate = req.query.endDate ? new Date(req.query.endDate) : undefined;
                if (!schoolId)
                    return res.status(400).json({ success: false, message: 'schoolId is required' });
                const result = await this.lmsService.getLessonPlans(schoolId, { page, limit, startDate, endDate });
                res.json({ success: true, data: result, pagination: { page, limit, total: result.total, pages: Math.ceil(result.total / limit) } });
            }
            catch (error) {
                console.error('❌ Error in GET /api/lms/plans:', error);
                res.status(500).json({ success: false, message: 'Failed to get lesson plans', error: error.message });
            }
        });
        // 计划详情
        this.router.get('/plans/:planId', async (req, res) => {
            try {
                const result = await this.lmsService.getLessonPlanDetail(req.params.planId);
                res.json({ success: true, data: result });
            }
            catch (error) {
                console.error('❌ Error in GET /api/lms/plans/:planId:', error);
                res.status(500).json({ success: false, message: 'Failed to get lesson plan detail', error: error.message });
            }
        });
        // 删除计划
        this.router.delete('/plans/:planId', async (req, res) => {
            try {
                await this.lmsService.deleteLessonPlan(req.params.planId);
                res.json({ success: true, message: 'Lesson plan deleted successfully' });
            }
            catch (error) {
                console.error('❌ Error in DELETE /api/lms/plans/:planId:', error);
                res.status(500).json({ success: false, message: 'Failed to delete lesson plan', error: error.message });
            }
        });
        // 核心更新：状态更新路由 (已修正：使用共享 prisma)
        this.router.patch('/records/:recordId/status', async (req, res) => {
            try {
                const { recordId } = req.params;
                const { status, courseInfo } = req.body;
                const user = req.user;
                console.log(`🎯 [LMS_ROUTE] 状态更新请求: ID=${recordId}, Status=${status}`);
                if (!['PENDING', 'SUBMITTED', 'REVIEWED', 'COMPLETED'].includes(status)) {
                    return res.status(400).json({ success: false, message: 'Invalid status' });
                }
                const oldRecord = await this.prisma.task_records.findUnique({
                    where: { id: recordId },
                    select: { content: true }
                });
                const currentContent = oldRecord?.content || {};
                const result = await this.prisma.task_records.update({
                    where: { id: recordId },
                    data: {
                        status,
                        isOverridden: true,
                        content: courseInfo ? {
                            ...currentContent,
                            courseInfo: courseInfo,
                            updatedAt: new Date().toISOString()
                        } : currentContent,
                        updatedAt: new Date(),
                        submittedAt: (status === 'SUBMITTED' || status === 'COMPLETED') ? new Date() : null
                    }
                });
                // 🆕 技能联动 (Skill Integration)
                if ((status === 'COMPLETED' || status === 'PASSED') && result) {
                    const skillCode = (0, taskSkillMapping_1.getSkillCodeByTaskName)(result.title);
                    if (skillCode) {
                        console.log(`✨ [AUTO_CERTIFY] 任务 "${result.title}" 触发技能自动认证: ${skillCode}`);
                        // 异步执行，不阻塞响应
                        skill_service_1.skillService.recordPractice({
                            studentId: result.studentId,
                            skillCode: skillCode,
                            expGained: 1,
                            certifiedBy: user.userId || user.id,
                            taskId: recordId,
                            note: '过关页任务自动认证'
                        }).catch(err => console.error('❌ [AUTO_CERTIFY_ERROR]', err));
                    }
                }
                res.json({ success: true, data: result, message: 'Status updated successfully' });
            }
            catch (error) {
                console.error('❌ Error in Status Update:', error);
                res.status(500).json({ success: false, message: 'Failed to update status', error: error.message });
            }
        });
        // 批量获取每日记录 (过关页核心数据源)
        this.router.get('/batch-daily-records', async (req, res) => {
            try {
                const { date, teacherId, className } = req.query;
                const user = req.user;
                if (!date)
                    return res.status(400).json({ success: false, message: 'date is required' });
                const result = await this.lmsService.getBatchDailyRecords(user.schoolId, date, teacherId, className);
                res.json({ success: true, data: result });
            }
            catch (error) {
                console.error('❌ Error in GET /api/lms/batch-daily-records:', error);
                res.status(500).json({ success: false, message: 'Failed to batch get records', error: error.message });
            }
        });
        // 备课回填
        this.router.get('/latest-lesson-plan', async (req, res) => {
            try {
                const user = req.user;
                const latestLessonPlan = await this.lmsService.getLatestLessonPlan(user.schoolId, user.userId);
                if (latestLessonPlan) {
                    res.json({
                        success: true,
                        data: {
                            id: latestLessonPlan.id,
                            date: latestLessonPlan.date,
                            content: latestLessonPlan.content,
                            courseInfo: latestLessonPlan.content.courseInfo,
                            updatedAt: latestLessonPlan.updatedAt.toISOString()
                        }
                    });
                }
                else {
                    res.json({ success: true, data: null, message: 'No lesson plan found' });
                }
            }
            catch (error) {
                res.status(500).json({ success: false, message: 'Failed to get latest lesson plan', error: error.message });
            }
        });
        // 学生进度
        this.router.get('/student-progress', async (req, res) => {
            try {
                const { studentId } = req.query;
                const user = req.user;
                const progress = await this.lmsService.getStudentProgress(user.schoolId, studentId);
                res.json({ success: true, data: progress });
            }
            catch (error) {
                res.status(500).json({ success: false, message: 'Failed to get student progress', error: error.message });
            }
        });
    }
    getRoutes() {
        return this.router;
    }
}
exports.LMSRoutes = LMSRoutes;
//# sourceMappingURL=lms.routes.js.map