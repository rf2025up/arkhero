import { PrismaClient } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';
export interface StudentQuery {
    schoolId: string;
    className?: string;
    search?: string;
    page?: number;
    limit?: number;
    teacherId?: string;
    scope?: 'MY_STUDENTS' | 'ALL_SCHOOL' | 'SPECIFIC_TEACHER';
    userRole?: 'ADMIN' | 'TEACHER';
    requesterId?: string;
}
export interface AddScoreRequest {
    studentIds: string[];
    points: number;
    exp: number;
    reason: string;
    schoolId: string;
    metadata?: Record<string, any>;
}
export interface CreateStudentRequest {
    name: string;
    className?: string;
    schoolId: string;
    teacherId: string;
}
export interface UpdateStudentRequest {
    id: string;
    schoolId: string;
    name?: string;
    className?: string;
    avatar?: string;
    score?: number;
    exp?: number;
    grade?: string;
    semester?: string;
}
export interface StudentListResponse {
    students: any[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
export interface ScoreUpdateEvent {
    type: 'SCORE_UPDATE';
    data: {
        studentIds: string[];
        points: number;
        exp: number;
        reason: string;
        timestamp: string;
        updatedBy: string;
        metadata?: Record<string, any>;
    };
}
export declare class StudentService {
    private prisma;
    private io;
    constructor(prisma: PrismaClient, io: SocketIOServer);
    /**
     * 🆕 获取学生列表 - 基于师生绑定的重构版本
     */
    getStudents(query: StudentQuery): Promise<StudentListResponse>;
    /**
     * 根据ID获取单个学生
     */
    getStudentById(id: string, schoolId: string): Promise<any>;
    /**
     * 获取学生完整档案（聚合所有相关数据）
     */
    getStudentProfile(studentId: string, schoolId: string, userRole?: 'ADMIN' | 'TEACHER', userId?: string): Promise<any>;
    /**
     * 构建时间轴数据
     */
    private buildTimelineData;
    /**
    /**
     * 🆕 获取任务分类标签
     */
    private getTaskCategoryLabel;
    /**
     * 获取任务类型标签 (保留旧方法兼容性)
     */
    private getTaskTypeLabel;
    /**
     * 🆕 计算五维雷达图数据 (移植自 ParentService)
     * 维度：自主力、规划力、复盘力、思考力、坚持力
     */
    private calculateRadarStats;
    /**
     * 🆕 计算详细连胜数据 (按科目和任务类型)
     */
    private calculateDetailedStreaks;
    createStudent(studentData: CreateStudentRequest): Promise<{
        id: string;
        schoolId: string;
        name: string;
        createdAt: Date;
        updatedAt: Date;
        isActive: boolean;
        deletedAt: Date | null;
        teacherId: string | null;
        className: string | null;
        level: number;
        points: number;
        exp: number;
        avatarUrl: string | null;
        teamId: string | null;
        currentLesson: string | null;
        currentLessonTitle: string | null;
        currentUnit: string | null;
        currentInviteCode: string | null;
        inviteCodeExpiresAt: Date | null;
        grade: string | null;
        semester: string | null;
        currentProgress: import("@prisma/client/runtime/library").JsonValue | null;
    }>;
    /**
     * 更新学生信息
     */
    updateStudent(data: UpdateStudentRequest): Promise<any>;
    /**
     * 删除学生（软删除，进入回收站）
     */
    deleteStudent(id: string, schoolId: string): Promise<void>;
    /**
     * 获取回收站中的学生（删除不满 30 天）
     */
    getTrashBinStudents(schoolId: string): Promise<any[]>;
    /**
     * 恢复被删除的学生
     */
    restoreStudent(id: string, schoolId: string): Promise<any>;
    /**
     * 批量添加积分/经验
     */
    addScore(data: AddScoreRequest, updatedBy: string): Promise<any[]>;
    /**
     * 获取学生排行榜
     */
    getLeaderboard(schoolId: string, limit?: number): Promise<any[]>;
    /**
     * 获取班级统计
     */
    getClassStats(schoolId: string): Promise<any>;
    /**
     * 获取班级列表（用于班级切换）
     * 🆕 修改：返回按老师分组的班级信息，支持多老师显示
     */
    getClasses(schoolId: string): Promise<any[]>;
    /**
     * 🆕 师生关系转移 - 从"转班"升级为"抢人"
     * 将学生划归到指定老师名下
     */
    transferStudents(studentIds: string[], targetTeacherId: string, schoolId: string, updatedBy: string): Promise<any[]>;
    /**
     * 获取指定等级升级所需的经验值（方案B：递增式升级）
     *
     * 设计原则：
     * - 1-5级：快速入门，建立信心
     * - 6-15级：稳步成长，一学期可达
     * - 16-30级：挑战区，需要持续努力
     * - 31-50级：精英区，长期坚持
     * - 51+级：传奇区，完整两年服务
     *
     * 预测（日均80exp）：
     * - 一学期(110天): 可达 20-25 级
     * - 一学年(220天): 可达 35-45 级
     * - 完整两年(440天): 可达 55-65 级
     */
    private getExpRequiredForLevel;
    /**
     * 根据总经验计算等级（递增式升级）
     */
    private calculateLevel;
    /**
     * 获取等级进度信息（用于前端展示进度条）
     */
    getLevelProgress(totalExp: number): {
        level: number;
        currentLevelExp: number;
        expForNextLevel: number;
        totalExpForCurrentLevel: number;
        progressPercent: number;
    };
    /**
     * 广播到指定学校的房间
     */
    private broadcastToSchool;
    /**
     * 🆕 计算阅读统计数据
     */
    private calculateReadingStats;
    /**
     * 🆕 获取学校经验倍率
     */
    private getExpMultiplier;
}
export default StudentService;
//# sourceMappingURL=student.service.d.ts.map