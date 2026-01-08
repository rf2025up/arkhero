import { PrismaClient } from '@prisma/client';
export interface CheckinResult {
    studentId: string;
    success: boolean;
    message?: string;
}
export declare class CheckinService {
    private prisma;
    constructor(prisma: PrismaClient);
    /**
     * 批量签到
     */
    batchCheckin(params: {
        studentIds: string[];
        schoolId: string;
        checkedBy: string;
    }): Promise<{
        success: CheckinResult[];
        failed: CheckinResult[];
        date: string;
    }>;
    /**
     * 获取学生本月签到天数
     */
    getMonthlyCheckinCount(studentId: string): Promise<number>;
    /**
     * 获取学生本月签到日期列表（用于日历展示）
     */
    getMonthlyCheckinDates(studentId: string, year?: number, month?: number): Promise<string[]>;
    /**
     * 获取学生今日是否已签到
     */
    isTodayCheckedIn(studentId: string): Promise<boolean>;
}
export default CheckinService;
//# sourceMappingURL=checkin.service.d.ts.map