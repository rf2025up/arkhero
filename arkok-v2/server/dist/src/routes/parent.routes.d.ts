import { Router } from 'express';
import { ParentService } from '../services/parent.service';
export declare class ParentRoutes {
    private router;
    private parentService;
    constructor(parentService: ParentService);
    private initializeRoutes;
    private authenticateTeacher;
    private authenticateParent;
    private login;
    private bindByInviteCode;
    private getTodayTimeline;
    private getHistoryTimeline;
    private like;
    private comment;
    private getGrowthProfile;
    private saveWeeklyPlan;
    private getWeeklyPlan;
    private getCurrentWeekPlan;
    private completeWeeklyPlanItem;
    private generateInviteCode;
    private getStudentParents;
    private unbindParent;
    private getTeacherFeedbacks;
    private markFeedbackRead;
    private markAllFeedbacksRead;
    private getStudentStreaks;
    getRoutes(): Router;
}
//# sourceMappingURL=parent.routes.d.ts.map