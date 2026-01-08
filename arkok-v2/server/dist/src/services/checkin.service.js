"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckinService = void 0;
class CheckinService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    /**
     * 批量签到
     */
    async batchCheckin(params) {
        const { studentIds, schoolId, checkedBy } = params;
        // 获取今天日期（北京时间）
        const today = new Date();
        today.setHours(today.getHours() + 8);
        const checkinDate = today.toISOString().split('T')[0];
        const success = [];
        const failed = [];
        for (const studentId of studentIds) {
            try {
                // 检查今天是否已签到
                const existing = await this.prisma.student_checkins.findUnique({
                    where: {
                        studentId_checkinDate: {
                            studentId,
                            checkinDate
                        }
                    }
                });
                if (existing) {
                    failed.push({
                        studentId,
                        success: false,
                        message: '今日已签到'
                    });
                    continue;
                }
                // 创建签到记录
                await this.prisma.student_checkins.create({
                    data: {
                        studentId,
                        schoolId,
                        checkinDate,
                        checkedBy
                    }
                });
                success.push({
                    studentId,
                    success: true
                });
            }
            catch (error) {
                console.error(`Checkin failed for student ${studentId}:`, error);
                failed.push({
                    studentId,
                    success: false,
                    message: '签到失败'
                });
            }
        }
        return { success, failed, date: checkinDate };
    }
    /**
     * 获取学生本月签到天数
     */
    async getMonthlyCheckinCount(studentId) {
        // 获取本月第一天和最后一天（北京时间）
        const now = new Date();
        now.setHours(now.getHours() + 8);
        const year = now.getFullYear();
        const month = now.getMonth();
        const firstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const lastDay = `${year}-${String(month + 1).padStart(2, '0')}-31`;
        const count = await this.prisma.student_checkins.count({
            where: {
                studentId,
                checkinDate: {
                    gte: firstDay,
                    lte: lastDay
                }
            }
        });
        return count;
    }
    /**
     * 获取学生本月签到日期列表（用于日历展示）
     */
    async getMonthlyCheckinDates(studentId, year, month) {
        // 获取指定月份或当前月份（北京时间）
        const now = new Date();
        now.setHours(now.getHours() + 8);
        const targetYear = year || now.getFullYear();
        const targetMonth = month !== undefined ? month : now.getMonth();
        const firstDay = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-01`;
        const lastDay = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-31`;
        const checkins = await this.prisma.student_checkins.findMany({
            where: {
                studentId,
                checkinDate: {
                    gte: firstDay,
                    lte: lastDay
                }
            },
            select: { checkinDate: true },
            orderBy: { checkinDate: 'asc' }
        });
        return checkins.map(c => c.checkinDate);
    }
    /**
     * 获取学生今日是否已签到
     */
    async isTodayCheckedIn(studentId) {
        const today = new Date();
        today.setHours(today.getHours() + 8);
        const checkinDate = today.toISOString().split('T')[0];
        const checkin = await this.prisma.student_checkins.findUnique({
            where: {
                studentId_checkinDate: {
                    studentId,
                    checkinDate
                }
            }
        });
        return !!checkin;
    }
}
exports.CheckinService = CheckinService;
exports.default = CheckinService;
//# sourceMappingURL=checkin.service.js.map