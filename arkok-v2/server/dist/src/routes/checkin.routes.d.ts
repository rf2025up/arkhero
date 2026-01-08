import { Router } from 'express';
import { AuthService } from '../services/auth.service';
import CheckinService from '../services/checkin.service';
export declare class CheckinRoutes {
    private checkinService;
    private authService;
    private router;
    constructor(checkinService: CheckinService, authService: AuthService);
    private initializeRoutes;
    /**
     * 批量签到
     */
    private batchCheckin;
    /**
     * 获取学生本月签到天数
     */
    private getMonthlyCheckinCount;
    /**
     * 检查学生今日是否已签到
     */
    private isTodayCheckedIn;
    /**
     * 🆕 获取学生本月签到日期列表
     */
    private getMonthlyCheckinDates;
    getRoutes(): Router;
}
export default CheckinRoutes;
//# sourceMappingURL=checkin.routes.d.ts.map