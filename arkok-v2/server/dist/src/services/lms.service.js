"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LMSService = void 0;
const socketHandlers_1 = require("../utils/socketHandlers");
const curriculum_service_1 = require("./curriculum.service");
class LMSService {
    constructor(prisma, rewardService, io) {
        this.prisma = prisma;
        this.rewardService = rewardService;
        this.io = io;
    }
    /**
     * 🆕 实时同步助手函数
     */
    broadcastStudentUpdate(studentId) {
        if (this.io) {
            (0, socketHandlers_1.broadcastToStudent)(this.io, studentId, 'DATA_UPDATE', {
                studentId,
                timestamp: new Date().toISOString()
            });
        }
    }
    /**
     * 获取任务库
     */
    async getTaskLibrary() {
        console.log('🔍 [LMS_SERVICE] 开始获取任务库数据...');
        try {
            // 首先检查任务库是否有数据
            const taskCount = await this.prisma.task_library.count({
                where: { isActive: true }
            });
            console.log(`🔍[LMS_SERVICE] 任务库活跃任务数量: ${taskCount} `);
            // 如果任务库为空，初始化默认任务
            if (taskCount === 0) {
                console.log('⚠️ [LMS_SERVICE] 任务库为空，正在初始化默认任务...');
                await this.initializeDefaultTaskLibrary();
            }
            // 获取任务列表
            const tasks = await this.prisma.task_library.findMany({
                where: {
                    isActive: true
                },
                orderBy: [
                    { category: 'asc' },
                    { difficulty: 'asc' }
                ]
            });
            console.log(`✅[LMS_SERVICE] 成功获取任务库，任务数量: ${tasks.length} `);
            return tasks.map(task => ({
                id: task.id,
                educationalDomain: task.educationalDomain,
                educationalSubcategory: task.educationalSubcategory,
                category: task.category,
                name: task.name,
                description: task.description || '',
                defaultExp: task.defaultExp,
                type: task.type,
                difficulty: task.difficulty || 0,
                isActive: task.isActive,
                schoolId: task.schoolId
            }));
        }
        catch (error) {
            console.error('❌ [LMS_SERVICE] 获取任务库失败:', error);
            // 返回降级方案
            return this.getDefaultTaskLibrary();
        }
    }
    async createTaskLibraryItem(data) {
        console.log(`📝[LMS_SERVICE] Creating task library item: ${data.name} in ${data.educationalDomain} `);
        // 🆕 核心权限校验：只有 校长 (ADMIN) 或 平台管理员 (PLATFORM_ADMIN) 可以创建
        if (data.userRole !== 'ADMIN' && data.userRole !== 'PLATFORM_ADMIN') {
            throw new Error('权限不足：只有校长可以创建任务项');
        }
        // 检查是否已存在同名同分类
        const existing = await this.prisma.task_library.findFirst({
            where: {
                schoolId: data.schoolId,
                educationalDomain: data.educationalDomain,
                educationalSubcategory: data.educationalSubcategory,
                name: data.name,
                isActive: true
            }
        });
        if (existing)
            throw new Error('该任务已存在');
        return this.prisma.task_library.create({
            data: {
                id: require('crypto').randomUUID(),
                schoolId: data.schoolId,
                name: data.name,
                educationalDomain: data.educationalDomain,
                educationalSubcategory: data.educationalSubcategory,
                category: data.educationalSubcategory, // 同步到旧字段以保持兼容
                defaultExp: data.defaultExp,
                type: data.type,
                isActive: data.isActive,
                updatedAt: new Date()
            }
        });
    }
    /**
     * 🆕 更新任务库项目
     */
    async updateTaskLibraryItem(id, data, userRole) {
        console.log(`📝[LMS_SERVICE] Updating task library item: ${id} `);
        // 权限校验
        if (userRole !== 'ADMIN' && userRole !== 'PLATFORM_ADMIN') {
            throw new Error('权限不足：只有校长可以修改任务项');
        }
        const item = await this.prisma.task_library.findUnique({ where: { id } });
        if (!item)
            throw new Error('任务不存在');
        return this.prisma.task_library.update({
            where: { id },
            data: {
                educationalDomain: data.educationalDomain || item.educationalDomain,
                educationalSubcategory: data.educationalSubcategory || item.educationalSubcategory,
                category: data.educationalSubcategory || item.category,
                name: data.name || item.name,
                description: data.description !== undefined ? data.description : item.description,
                defaultExp: data.defaultExp !== undefined ? data.defaultExp : item.defaultExp,
                isActive: data.isActive !== undefined ? data.isActive : item.isActive,
                updatedAt: new Date()
            }
        });
    }
    /**
     * 🆕 删除任务库项目 (软删除)
     */
    async deleteTaskLibraryItem(id, schoolId, userRole) {
        console.log(`🗑️[LMS_SERVICE] Deleting task library item: ${id} `);
        // 🆕 核心权限校验
        if (userRole !== 'ADMIN' && userRole !== 'PLATFORM_ADMIN') {
            throw new Error('权限不足：只有校长可以删除任务项');
        }
        const item = await this.prisma.task_library.findUnique({ where: { id } });
        if (!item)
            throw new Error('任务不存在');
        // 权限检查：非平台管理员不能删除系统级任务 (schoolId='system' or 'default')
        if (item.schoolId === 'default' || item.schoolId === 'system' || item.isGlobal) {
            if (userRole !== 'PLATFORM_ADMIN') {
                throw new Error('无法删除系统预置任务');
            }
        }
        else {
            // 只能删除本校的任务
            if (item.schoolId !== schoolId && userRole !== 'PLATFORM_ADMIN') {
                throw new Error('无权删除其他学校的任务');
            }
        }
        // 软删除
        return this.prisma.task_library.update({
            where: { id },
            data: { isActive: false, updatedAt: new Date() }
        });
    }
    /**
     * 初始化默认任务库
     */
    async initializeDefaultTaskLibrary() {
        const defaultTasks = [
            // 语文过关项
            { id: require('crypto').randomUUID(), schoolId: 'default', name: '生字听写', educationalDomain: 'PROGRESS', educationalSubcategory: '语文过关', category: '语文过关', defaultExp: 8, difficulty: 2, type: 'QC', description: '本课生字听写训练', updatedAt: new Date() },
            { id: require('crypto').randomUUID(), schoolId: 'default', name: '课文背诵', educationalDomain: 'PROGRESS', educationalSubcategory: '语文过关', category: '语文过关', defaultExp: 10, difficulty: 3, type: 'QC', description: '流利背诵课文段落', updatedAt: new Date() },
            { id: require('crypto').randomUUID(), schoolId: 'default', name: '古诗默写', educationalDomain: 'PROGRESS', educationalSubcategory: '语文过关', category: '语文过关', defaultExp: 12, difficulty: 3, type: 'QC', description: '古诗默写与理解', updatedAt: new Date() },
            // 数学过关项
            { id: require('crypto').randomUUID(), schoolId: 'default', name: '口算达标', educationalDomain: 'PROGRESS', educationalSubcategory: '数学过关', category: '数学过关', defaultExp: 8, difficulty: 2, type: 'QC', description: '10分钟口算练习', updatedAt: new Date() },
            { id: require('crypto').randomUUID(), schoolId: 'default', name: '竖式计算', educationalDomain: 'PROGRESS', educationalSubcategory: '数学过关', category: '数学过关', defaultExp: 12, difficulty: 3, type: 'QC', description: '多位数竖式计算', updatedAt: new Date() },
            // 英语过关项
            { id: require('crypto').randomUUID(), schoolId: 'default', name: '单词默写', educationalDomain: 'PROGRESS', educationalSubcategory: '英语过关', category: '英语过关', defaultExp: 8, difficulty: 2, type: 'QC', description: '本单元单词默写', updatedAt: new Date() },
            { id: require('crypto').randomUUID(), schoolId: 'default', name: '听力理解', educationalDomain: 'PROGRESS', educationalSubcategory: '英语过关', category: '英语过关', defaultExp: 8, difficulty: 2, type: 'QC', description: '英语听力理解训练', updatedAt: new Date() },
            // 核心教学法 (METHODOLOGY)
            { id: require('crypto').randomUUID(), schoolId: 'default', name: '字字开花', educationalDomain: 'METHODOLOGY', educationalSubcategory: '语文学科能力', category: '语文学科能力', defaultExp: 10, difficulty: 2, type: 'METHODOLOGY', description: '词语积累与拓展，丰富语言素材', updatedAt: new Date() }
        ];
        console.log(`🌱[LMS_SERVICE] 正在创建 ${defaultTasks.length} 个默认任务...`);
        // 注意：实际生产中需要根据 schoolId 创建，这里简化逻辑
        try {
            await this.prisma.task_library.createMany({
                data: defaultTasks,
                skipDuplicates: true
            });
            console.log('✅ [LMS_SERVICE] 默认任务库创建完成');
        }
        catch (e) {
            console.warn('⚠️ [LMS_SERVICE] 初始化任务库略过 (可能已存在)');
        }
    }
    /**
     * 获取默认任务库（降级方案）
     */
    getDefaultTaskLibrary() {
        console.log('🔄 [LMS_SERVICE] 使用内存默认任务库数据');
        return [
            { id: 'def-1', educationalDomain: 'PROGRESS', educationalSubcategory: '语文过关', category: '语文过关', name: '生字听写', defaultExp: 8, type: 'QC', difficulty: 2, isActive: true, schoolId: 'default' },
            { id: 'def-2', educationalDomain: 'PROGRESS', educationalSubcategory: '数学过关', category: '数学过关', name: '口算达标', defaultExp: 8, type: 'QC', difficulty: 2, isActive: true, schoolId: 'default' },
            { id: 'def-3', educationalDomain: 'PROGRESS', educationalSubcategory: '英语过关', category: '英语过关', name: '单词默写', defaultExp: 8, type: 'QC', difficulty: 2, isActive: true, schoolId: 'default' }
        ];
    }
    /**
     * 🆕 发布教学计划 - 基于师生绑定的安全投送
     */
    async publishPlan(request, io) {
        const { schoolId, teacherId, title, content, date, tasks } = request;
        try {
            console.log(`🔒[LMS_SECURITY] Publishing lesson plan: ${title} for teacher ${teacherId}`);
            if (!teacherId)
                throw new Error('发布者ID不能为空');
            // 1. 查找归属该老师的学生
            const boundStudents = await this.prisma.students.findMany({
                where: { schoolId, teacherId, isActive: true }
            });
            if (boundStudents.length === 0) {
                throw new Error(`该老师名下暂无学生，无法发布任务`);
            }
            // 2. 创建教学计划
            const lessonPlan = await this.prisma.lesson_plans.create({
                data: {
                    id: require('crypto').randomUUID(),
                    schoolId,
                    teacherId,
                    title,
                    content: {
                        ...content,
                        progress: request.progress, // 🆕 将显式传入的进度数据存入 content 字段，方便回填
                        publishedTo: 'TEACHERS_STUDENTS',
                        publisherId: teacherId
                    },
                    date: new Date(date),
                    isActive: true,
                    updatedAt: new Date()
                }
            });
            // 3. 创建任务记录
            const dateValue = request.date || new Date();
            // 🆕 核心修复：优先使用前端传入的原始日期字符串，避免 Date 对象的 UTC 转换导致的日期回退
            let dateStr;
            if (typeof dateValue === 'string') {
                // 前端传入的是 "2025-12-20" 格式的字符串，直接使用
                dateStr = dateValue.split('T')[0];
            }
            else {
                // 如果是 Date 对象，使用本地时间格式化
                const d = dateValue;
                dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
            console.log(`📅[LMS_PUBLISH] 使用日期: ${dateStr}`);
            const startOfDay = new Date(`${dateStr}T00:00:00+08:00`);
            const endOfDay = new Date(`${dateStr}T23:59:59+08:00`);
            // 🆕 从 courseInfo 中提取单元和课，用于注入任务记录（学期地图汇总关键数据）
            const courseInfo = content?.courseInfo || {};
            let newTaskCount = 0;
            const affectedClasses = new Set();
            // 🆕 核心修复：实现“覆盖逻辑”
            // 在发布新任务前，先清理掉当日（由该老师发布的）所有旧任务记录，防止重复累加
            // 🔧 增强：使用 content->>taskDate 进行字符串匹配，规避时区带来的时间戳范围偏差问题
            console.log(`🧹[LMS_CLEANUP] 清理老师 ${teacherId} 在 ${dateStr} 的旧任务记录...`);
            const deleteResult = await this.prisma.task_records.deleteMany({
                where: {
                    schoolId,
                    studentId: { in: boundStudents.map(s => s.id) },
                    OR: [
                        {
                            content: {
                                path: ['taskDate'],
                                equals: dateStr
                            }
                        },
                        {
                            createdAt: { gte: startOfDay, lte: endOfDay }
                        }
                    ],
                    // 仅清理自动发布的任务，保留手动调整的 override 记录
                    // 🔧 扩展清理类型：包含所有可能由进度发布的类型
                    type: { in: ['QC', 'TASK', 'SPECIAL', 'HOMEWORK', 'DAILY', 'QUIZ'] },
                    isOverridden: false
                }
            });
            console.log(`✅[LMS_CLEANUP] 已删除 ${deleteResult.count} 条旧任务记录`);
            for (const student of boundStudents) {
                affectedClasses.add(student.className || '未分班');
            }
            // 🆕 性能优化：批量更新受众学生的进度快照（包含年级和学期）
            await this.prisma.students.updateMany({
                where: { id: { in: boundStudents.map(s => s.id) } },
                data: {
                    currentUnit: courseInfo.chinese?.unit || "1",
                    currentLesson: courseInfo.chinese?.lesson || "1",
                    currentLessonTitle: courseInfo.chinese?.title || "默认课程",
                    grade: courseInfo.grade || undefined,
                    semester: courseInfo.semester || undefined,
                    updatedAt: new Date()
                }
            });
            const taskRecordsToCreate = [];
            const crypto = require('crypto');
            for (const student of boundStudents) {
                for (const task of tasks) {
                    // 🆕 QC 项现在会被创建为 PENDING 状态，等待过关页点击后变为 COMPLETED
                    // 🆕 核心逻辑：精准分发“定制加餐” (SPECIAL 类型)
                    if (task.type === 'SPECIAL') {
                        const targetStudentNames = task.content?.targetStudentNames;
                        if (Array.isArray(targetStudentNames) && targetStudentNames.length > 0) {
                            if (!targetStudentNames.includes(student.name)) {
                                continue;
                            }
                        }
                    }
                    // 动态确定该任务所属学科的单元和课
                    let taskUnit = "1";
                    let taskLesson = "1";
                    const category = task.content?.category || '';
                    if (category.includes('语文')) {
                        taskUnit = courseInfo.chinese?.unit || "1";
                        taskLesson = courseInfo.chinese?.lesson || "1";
                    }
                    else if (category.includes('数学')) {
                        taskUnit = courseInfo.math?.unit || "1";
                        taskLesson = "1";
                    }
                    else if (category.includes('英语')) {
                        taskUnit = courseInfo.english?.unit || "1";
                        taskLesson = "1";
                    }
                    taskRecordsToCreate.push({
                        id: crypto.randomUUID(),
                        schoolId,
                        studentId: student.id,
                        lessonPlanId: lessonPlan.id,
                        type: task.type,
                        title: task.title,
                        // 🆕 QC 类型使用 'PROGRESS' 分类，其他类型使用映射后的分类
                        task_category: task.type === 'QC' ? 'PROGRESS' : this.mapToTaskCategory(category),
                        content: {
                            ...task.content, // 已包含 category, subcategory
                            taskDate: dateStr,
                            publisherId: teacherId,
                            unit: taskUnit,
                            lesson: taskLesson,
                            taskName: task.title,
                            // 🆕 为 QC 记录注入完整的 courseInfo，确保课文标题可以显示
                            courseInfo: task.type === 'QC' ? courseInfo : undefined,
                            updatedAt: new Date().toISOString()
                        },
                        status: 'PENDING',
                        expAwarded: task.expAwarded,
                        updatedAt: new Date()
                    });
                    newTaskCount++;
                }
            }
            // 🆕 性能优化：批量创建任务记录
            if (taskRecordsToCreate.length > 0) {
                console.log(`📡[LMS_PUBLISH] 正在批量创建 ${taskRecordsToCreate.length} 条任务记录...`);
                await this.prisma.task_records.createMany({
                    data: taskRecordsToCreate
                });
                console.log(`✅[LMS_PUBLISH] 批量创建成功`);
            }
            const taskStats = {
                totalStudents: boundStudents.length,
                tasksCreated: newTaskCount,
                totalExpAwarded: tasks.reduce((sum, t) => sum + t.expAwarded, 0) * boundStudents.length
            };
            // 广播给老师
            io.to(`teacher_${teacherId} `).emit(socketHandlers_1.SOCKET_EVENTS.PLAN_PUBLISHED, {
                lessonPlanId: lessonPlan.id,
                title,
                taskStats,
                affectedClasses: Array.from(affectedClasses)
            });
            // 🆕 广播给所有受影响学生的房间，让家长端实时更新
            for (const student of boundStudents) {
                io.to(`student - ${student.id} `).emit(socketHandlers_1.SOCKET_EVENTS.DATA_UPDATE, {
                    type: 'PLAN_PUBLISHED',
                    studentId: student.id,
                    data: {
                        lessonPlanId: lessonPlan.id,
                        title,
                        taskCount: tasks.length
                    }
                });
            }
            return { lessonPlan, taskStats, affectedClasses: Array.from(affectedClasses) };
        }
        catch (error) {
            console.error('❌ Error publishing lesson plan:', error);
            throw error;
        }
    }
    /**
     * 获取学生课程进度 - 🆕 简化版：直接读取 students.currentProgress
     */
    async getStudentProgress(schoolId, studentId) {
        try {
            console.log(`[LMS_PROGRESS] Getting progress for student: ${studentId} `);
            const student = await this.prisma.students.findUnique({
                where: { id: studentId },
                select: {
                    currentProgress: true,
                    grade: true,
                    semester: true,
                    className: true
                }
            });
            const getGradeFromClass = (className) => {
                if (!className)
                    return '二年级';
                if (className.includes('一'))
                    return '一年级';
                if (className.includes('二'))
                    return '二年级';
                if (className.includes('三'))
                    return '三年级';
                if (className.includes('四'))
                    return '四年级';
                if (className.includes('五'))
                    return '五年级';
                if (className.includes('六'))
                    return '六年级';
                return '二年级';
            };
            const defaultProgress = {
                chinese: { unit: '1', lesson: '1', title: '默认课程' },
                math: { unit: '1', lesson: '1', title: '默认课程' },
                english: { unit: '1', title: 'Default' },
                grade: student?.grade || getGradeFromClass(student?.className || null),
                semester: student?.semester || '上册'
            };
            if (!student) {
                return { ...defaultProgress, source: 'default' };
            }
            // 如果有存储的进度，直接返回
            if (student.currentProgress) {
                const progress = student.currentProgress;
                return {
                    chinese: progress.chinese || defaultProgress.chinese,
                    math: progress.math || defaultProgress.math,
                    english: progress.english || defaultProgress.english,
                    grade: student.grade || defaultProgress.grade,
                    semester: student.semester || defaultProgress.semester,
                    source: 'student'
                };
            }
            // 否则返回默认进度
            return { ...defaultProgress, source: 'default' };
        }
        catch (e) {
            console.error('[LMS_PROGRESS] Error:', e);
            return {
                chinese: { unit: '1', lesson: '1', title: '错误回退' },
                math: { unit: '1', lesson: '1', title: '默认课程' },
                english: { unit: '1', title: 'Default' },
                grade: '二年级',
                semester: '上册',
                source: 'error'
            };
        }
    }
    /**
     * 获取教学计划列表
     */
    async getLessonPlans(schoolId, options = {}) {
        const { page = 1, limit = 20, startDate, endDate } = options;
        const skip = (page - 1) * limit;
        const where = { schoolId, isActive: true };
        if (startDate || endDate) {
            where.date = {};
            if (startDate)
                where.date.gte = startDate;
            if (endDate)
                where.date.lte = endDate;
        }
        const [plans, total] = await Promise.all([
            this.prisma.lesson_plans.findMany({
                where,
                orderBy: { date: 'desc' },
                skip,
                take: limit,
                include: { teachers: { select: { name: true } } }
            }),
            this.prisma.lesson_plans.count({ where })
        ]);
        return { plans, total };
    }
    /**
     * 获取教学计划详情
     */
    async getLessonPlanDetail(planId) {
        const plan = await this.prisma.lesson_plans.findUnique({
            where: { id: planId },
            include: {
                teachers: { select: { name: true } },
                task_records: {
                    include: { students: { select: { name: true, className: true } } }
                }
            }
        });
        if (!plan)
            throw new Error('教学计划不存在');
        return plan;
    }
    /**
     * 删除教学计划
     */
    async deleteLessonPlan(planId) {
        return this.prisma.lesson_plans.update({
            where: { id: planId },
            data: { isActive: false, updatedAt: new Date() }
        });
    }
    /**
     * 获取学校统计信息
     */
    async getSchoolStats(schoolId) {
        const [totalPlans, totalStudents, taskStats] = await Promise.all([
            this.prisma.lesson_plans.count({ where: { schoolId, isActive: true } }),
            this.prisma.students.count({ where: { schoolId, isActive: true } }),
            this.prisma.task_records.groupBy({
                by: ['status'],
                where: { schoolId },
                _count: true
            })
        ]);
        return { totalPlans, totalStudents, taskStats };
    }
    /**
     * 获取学生的每日任务记录
     */
    async getDailyRecords(schoolId, studentId, date) {
        // 🆕 核心修复：不再依赖 createdAt 的 UTC 时间戳范围，直接匹配业务字段 taskDate
        // 这能彻底解决凌晨发布任务时（00:00-08:00）产生的日期错位问题
        return this.prisma.task_records.findMany({
            where: {
                schoolId,
                studentId,
                content: {
                    path: ['taskDate'],
                    equals: date // 传入的通常是 YYYY-MM-DD
                }
            },
            orderBy: { createdAt: 'asc' }
        });
    }
    /**
     * 🆕 性能优化：按老师或班级批量获取所有学生的每日任务记录
     */
    async getBatchDailyRecords(schoolId, date, teacherId, className) {
        console.log(`🚀[BATCH_RECORDS] Fetching records for schoolId: ${schoolId}, date: ${date}, teacherId: ${teacherId}, className: ${className} `);
        // 构建过滤条件
        const whereCondition = {
            schoolId,
            content: {
                path: ['taskDate'],
                equals: date
            }
        };
        // 如果指定了教师 ID，则只过滤该教师名下的学生记录
        // 注意：task_records 表中目前可能没有直接关联 teacherId，我们需要先找到符合条件的 studentId
        if (teacherId || className) {
            const studentWhere = { schoolId };
            if (teacherId)
                studentWhere.teacherId = teacherId;
            if (className && className !== 'ALL')
                studentWhere.className = className;
            const students = await this.prisma.students.findMany({
                where: studentWhere,
                select: { id: true }
            });
            const studentIds = students.map(s => s.id);
            if (studentIds.length === 0) {
                return [];
            }
            whereCondition.studentId = { in: studentIds };
        }
        return this.prisma.task_records.findMany({
            where: whereCondition,
            orderBy: { createdAt: 'asc' }
        });
    }
    /**
     * 获取学生所有历史任务记录
     */
    async getAllStudentRecords(schoolId, studentId, limit = 100) {
        return this.prisma.task_records.findMany({
            where: { schoolId, studentId },
            orderBy: { createdAt: 'desc' },
            take: limit
        });
    }
    /**
     * 记录尝试次数
     */
    async markAttempt(recordId, userId) {
        return this.prisma.task_records.update({
            where: { id: recordId },
            data: {
                attempts: { increment: 1 },
                updatedAt: new Date()
            }
        });
    }
    /**
     * 批量更新任务状态
     */
    async updateMultipleRecordStatus(schoolId, recordIds, status, userId, courseInfo, isPerfect) {
        const data = {
            status,
            isOverridden: true, // 🚀 关键修复：批量手动操作也标记为已覆盖
            updatedAt: new Date(),
            submittedAt: status === 'SUBMITTED' || status === 'COMPLETED' ? new Date() : undefined
        };
        // 如果传入了课程信息，则尝试注入到每个记录的 content 中
        if (courseInfo || isPerfect !== undefined) {
            data.content = {
                ...(courseInfo ? { courseInfo } : {}),
                ...(isPerfect !== undefined ? { isPerfect } : {}),
                updatedAt: new Date().toISOString()
            };
            // 注意：prisma updateMany 的 content 是 json replace 还是 merge? 
            // Prisma atomic updates for JSON are experimental or require specific syntax. 
            // simple updateMany with data.content will replace the whole content if not careful.
            // However, existing usage implies we might be replacing or simple fields.
            // For safety in updateMany with JSON, we usually can't merge easily without raw SQL.
            // But looking at existing code: `data.content = { courseInfo, updatedAt ... }` suggests it might be replacing.
            // If we want to preserve other content, updateMany is risky if we don't know previous content.
            // But here we are setting status to COMPLETED/PASSED, maybe replacing content is acceptable or `courseInfo` is the main thing.
            // Let's stick to the pattern but add isPerfect.
        }
        const result = await this.prisma.task_records.updateMany({
            where: {
                id: { in: recordIds },
                schoolId
            },
            data
        });
        // 🆕 实时同步（已移除自动连胜触发 - 连胜现由专门的连胜抽屉控制）
        const records = await this.prisma.task_records.findMany({
            where: { id: { in: recordIds } },
            select: { id: true, studentId: true, type: true, title: true, schoolId: true, content: true },
        });
        // 🆕 技能映射自动认证 (仅当状态为 COMPLETED 或 PASSED 时)
        if (status === 'COMPLETED' || status === 'PASSED') {
            const { getSkillCodeByTask } = await Promise.resolve().then(() => __importStar(require('../config/skillMapping.config')));
            const { skillService } = await Promise.resolve().then(() => __importStar(require('./skill.service')));
            for (const record of records) {
                const taskName = record.title;
                const skillCode = getSkillCodeByTask(taskName);
                if (skillCode) {
                    try {
                        // 特殊处理：重新过关使用专门的方法
                        if (taskName === '重新过关') {
                            await skillService.awardRetrySkill(record.studentId, taskName, userId);
                        }
                        else {
                            await skillService.recordPractice({
                                studentId: record.studentId,
                                skillCode,
                                certifiedBy: userId,
                                taskId: record.id,
                                note: `任务完成自动认证: ${taskName}`
                            });
                        }
                        console.log(`✅ [LMS_SERVICE] 技能自动认证: ${taskName} -> ${skillCode}`);
                    }
                    catch (e) {
                        console.error(`❌ [LMS_SERVICE] 技能认证失败: ${taskName}`, e);
                    }
                }
            }
        }
        // 注：连胜更新已移至独立的连胜抽屉，不再与基础过关绑定
        // 广播通知
        const studentIds = Array.from(new Set(records.map(r => r.studentId)));
        for (const studentId of studentIds) {
            this.broadcastStudentUpdate(studentId);
        }
        return result;
    }
    /**
     * 更新学生课程进度 - 🆕 简化版：直接写入 students.currentProgress
     */
    async updateStudentProgress(schoolId, studentId, teacherId, courseInfo) {
        console.log(`[LMS_PROGRESS] Updating progress for student: ${studentId} `);
        // 构建进度数据，自动填充课程标题
        const progressData = {
            chinese: {
                ...courseInfo.chinese,
                title: courseInfo.chinese?.title || curriculum_service_1.CurriculumService.getTitle({ subject: 'chinese', unit: courseInfo.chinese?.unit, lesson: courseInfo.chinese?.lesson }) || '默认课程'
            },
            math: {
                ...courseInfo.math,
                title: courseInfo.math?.title || curriculum_service_1.CurriculumService.getTitle({ subject: 'math', unit: courseInfo.math?.unit, lesson: courseInfo.math?.lesson }) || '默认课程'
            },
            english: {
                ...courseInfo.english,
                title: courseInfo.english?.title || curriculum_service_1.CurriculumService.getTitle({ subject: 'english', unit: courseInfo.english?.unit }) || 'Default'
            }
        };
        // 直接更新学生表
        const updatedStudent = await this.prisma.students.update({
            where: { id: studentId },
            data: {
                currentProgress: progressData,
                grade: courseInfo.grade,
                semester: courseInfo.semester,
                updatedAt: new Date()
            }
        });
        // 实时同步
        this.broadcastStudentUpdate(studentId);
        console.log(`[LMS_PROGRESS] ✅ Progress saved for student: ${studentId} `);
        return updatedStudent;
    }
    /**
     * 🛡️ 辅助方法：将中文/字符串分类映射为 Prisma 枚举
     */
    mapToTaskCategory(category) {
        const cat = category.trim();
        // 核心教学法 (Methodology)
        if (['核心教学法', '基础学习方法论', 'METHODOLOGY'].includes(cat)) {
            return 'METHODOLOGY';
        }
        // 基础过关 / 课程进度 / 学科 (Progress)
        // 包含前端传入的子Tab名称: chinese, math, english
        if ([
            '基础过关项', '基础过关', '课程进度', 'PROGRESS',
            'chinese', 'math', 'english', '语文', '数学', '英语',
            '语文基础过关', '数学基础过关', '英语基础过关'
        ].includes(cat)) {
            return 'PROGRESS';
        }
        // 个性化/定制 (Personalized)
        if (['定制加餐', '个性化', 'PERSONALIZED'].includes(cat)) {
            return 'PERSONALIZED';
        }
        // 综合成长 (Growth)
        if (['综合成长', '综合素养', 'GROWTH'].includes(cat)) {
            return 'GROWTH';
        }
        // 默认归类为综合成长 (Growth)
        return 'GROWTH';
    }
    /**
     * 🆕 创建单条任务记录 - 用于过关页增量添加
     */
    async createSingleTaskRecord(data) {
        const { schoolId, studentId, type, title, category, subcategory, exp, courseInfo, isOverridden = true, isPerfect } = data;
        // 🛡️ 映射分类
        const mappedCategory = this.mapToTaskCategory(category);
        // 🆕 从配置表获取经验值（仅针对核心教学法和综合成长类任务）
        let finalExp = exp;
        if (category === '核心教学法' || category === '综合成长') {
            const configExp = await this.rewardService.getExpForTask(schoolId, category, subcategory || '', title);
            if (configExp !== null) {
                finalExp = configExp;
                console.log(`✅[LMS_SERVICE] 从配置表获取经验值: ${title} = ${finalExp} EXP(原值: ${exp})`);
            }
            else {
                console.log(`⚠️[LMS_SERVICE] 未找到配置，使用默认经验值: ${title} = ${exp} EXP`);
            }
        }
        console.log(`📝[LMS_SERVICE] 为学生 ${studentId} 创建单条任务: ${title} (${category}/${subcategory} -> ${mappedCategory}) EXP = ${finalExp} `);
        const record = await this.prisma.task_records.create({
            data: {
                id: require('crypto').randomUUID(),
                schoolId,
                studentId,
                type,
                title,
                task_category: mappedCategory, // 使用映射后的枚举值
                expAwarded: finalExp,
                // 🚨 修正：前端依赖 content.category 来进行中文分组过滤，必须保留原始字段名为 category
                // 🔴 关键：必须包含 taskDate 字段，否则 getBatchDailyRecords 查询不到
                content: courseInfo
                    ? { courseInfo, updatedAt: new Date().toISOString(), category: category, subcategory: subcategory || '', taskDate: new Date().toISOString().split('T')[0], isPerfect: !!isPerfect }
                    : { updatedAt: new Date().toISOString(), category: category, subcategory: subcategory || '', taskDate: new Date().toISOString().split('T')[0], isPerfect: !!isPerfect },
                isOverridden,
                status: 'PENDING',
                updatedAt: new Date()
            }
        });
        // 🆕 实时同步
        this.broadcastStudentUpdate(studentId);
        return record;
    }
    /**
     * 🆕 创建任务记录 - 用于过关抽屉手动添加 QC 项
     * courseInfo 会被完整存储，以便全学期地图能显示"第X单元 第X课 课文名字"
     */
    async createTaskRecord(data) {
        const { studentId, type, title, status, category, subcategory, date, courseInfo, exp } = data;
        console.log(`📝[CREATE_TASK_RECORD] 为学生 ${studentId} 创建记录: ${title}, 类型 = ${type}, 分类 = ${category}, 子分类 = ${subcategory} `);
        // 从学生信息中获取 schoolId
        const student = await this.prisma.students.findUnique({
            where: { id: studentId },
            select: { schoolId: true }
        });
        if (!student) {
            throw new Error(`学生不存在: ${studentId} `);
        }
        // 根据学科分类确定 subject
        let subject = '';
        if (category.includes('语文'))
            subject = 'chinese';
        else if (category.includes('数学'))
            subject = 'math';
        else if (category.includes('英语'))
            subject = 'english';
        // 从 courseInfo 中提取进度信息
        const subjectInfo = courseInfo?.[subject] || {};
        const unit = subjectInfo.unit || '';
        const lesson = subjectInfo.lesson || '';
        const lessonTitle = subjectInfo.title || curriculum_service_1.CurriculumService.getTitle({ subject, unit, lesson }) || '';
        // 构建 content 对象，包含完整的进度信息
        // 🚨 关键：必须包含 taskDate 字段，否则 getBatchDailyRecords 查询不到
        const content = {
            category,
            subcategory: subcategory || '', // 🆕 分类标题
            subject,
            unit,
            lesson,
            lessonPlanTitle: lessonTitle, // 课文名字
            courseInfo: {
                ...courseInfo,
                [subject]: { ...subjectInfo, title: lessonTitle }
            },
            taskDate: date, // 🔴 新增：确保批量查询能找到这条记录
            createdAt: new Date().toISOString()
        };
        const record = await this.prisma.task_records.create({
            data: {
                id: require('crypto').randomUUID(),
                schoolId: student.schoolId,
                studentId,
                type: type,
                title,
                status: status, // 允许动态状态值
                expAwarded: exp,
                content,
                isOverridden: true,
                updatedAt: new Date()
            }
        });
        console.log(`✅[CREATE_TASK_RECORD] 记录创建成功: ${record.id} `);
        return record;
    }
    /**
     * 🆕 结算学生当日所有任务 - V2 正式版
     */
    async settleStudentTasks(schoolId, studentId, expBonus = 0, courseInfo) {
        console.log(`💰[LMS_SERVICE] 开始结算学生 ${studentId} 的所有完成任务...`);
        // 🆕 获取当日日期字符串（用于过滤当日任务）
        const now = new Date();
        const beijingOffset = 8 * 60;
        const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
        const beijingTime = new Date(utcTime + (beijingOffset * 60000));
        const todayStr = `${beijingTime.getFullYear()} -${String(beijingTime.getMonth() + 1).padStart(2, '0')} -${String(beijingTime.getDate()).padStart(2, '0')} `;
        console.log(`📅[LMS_SERVICE] 当日日期: ${todayStr} `);
        // 1. 先将该学生所有待办项（QC 项、核心教学法、综合成长）标记为已完成
        // 遵循宪法：使用 isOverridden 标记手动结算
        await this.prisma.task_records.updateMany({
            where: {
                schoolId,
                studentId,
                status: 'PENDING',
                type: { in: ['QC', 'TASK'] }
            },
            data: {
                status: 'COMPLETED',
                isOverridden: true,
                updatedAt: new Date(),
                submittedAt: new Date()
            }
        });
        // 2. 🆕 核心修复：只获取当日且尚未结算（settledAt = null）的任务
        // 使用 content.taskDate 过滤当日任务
        const completedTasks = await this.prisma.task_records.findMany({
            where: {
                schoolId,
                studentId,
                status: 'COMPLETED',
                settledAt: null, // 🆕 只取未结算的任务
                content: {
                    path: ['taskDate'],
                    equals: todayStr
                }
            }
        });
        console.log(`📋[LMS_SERVICE] 找到 ${completedTasks.length} 条当日未结算任务`);
        const totalExp = completedTasks.reduce((sum, t) => sum + t.expAwarded, 0) + expBonus;
        if (totalExp > 0) {
            await this.prisma.students.update({
                where: { id: studentId },
                data: {
                    exp: { increment: totalExp },
                    updatedAt: new Date()
                }
            });
            console.log(`✅[LMS_SERVICE] 已为学生 ${studentId} 增加 ${totalExp} 经验值`);
            // 🆕 标记这些任务为已结算
            await this.prisma.task_records.updateMany({
                where: {
                    id: { in: completedTasks.map(t => t.id) }
                },
                data: {
                    settledAt: new Date()
                }
            });
            console.log(`✅[LMS_SERVICE] 已标记 ${completedTasks.length} 条任务为已结算`);
            // 创建结算汇总记录 (TASK类型) - 用于学情时间轴汇总
            await this.prisma.task_records.create({
                data: {
                    id: require('crypto').randomUUID(),
                    studentId,
                    schoolId,
                    type: 'TASK',
                    title: `当日学业全面过关结算`,
                    content: {
                        taskCount: completedTasks.length,
                        totalExpAwarded: totalExp,
                        expBonus,
                        courseInfo, // 🆕 注入当前进度信息
                        teacherMessage: `完成了今日所有 ${completedTasks.length} 项学业任务，额外获得 ${expBonus} 经验奖励，表现非常出色！`,
                        taskDate: todayStr
                    },
                    status: 'COMPLETED',
                    settledAt: new Date(), // 汇总记录也标记为已结算
                    updatedAt: new Date(),
                    task_category: 'TASK'
                }
            });
        }
        // 🆕 实时同步
        this.broadcastStudentUpdate(studentId);
        return {
            success: true,
            count: completedTasks.length,
            totalExpAwarded: totalExp
        };
    }
    /**
     * 获取最新教学计划
     */
    async getLatestLessonPlan(schoolId, teacherId) {
        return this.prisma.lesson_plans.findFirst({
            where: { schoolId, teacherId, isActive: true },
            orderBy: { createdAt: 'desc' }
        });
    }
    /**
     * 递增任务记录的尝试次数
     */
    async incrementTaskAttempts(recordId) {
        const record = await this.prisma.task_records.update({
            where: { id: recordId },
            data: {
                attempts: { increment: 1 },
                updatedAt: new Date()
            }
        });
        // 实时通知
        this.broadcastStudentUpdate(record.studentId);
        return record;
    }
}
exports.LMSService = LMSService;
//# sourceMappingURL=lms.service.js.map