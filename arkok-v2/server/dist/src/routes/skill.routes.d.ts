/**
 * 五维内功修炼系统 - API 路由
 */
import { Router } from 'express';
import AuthService from '../services/auth.service';
export declare class SkillRoutes {
    private authService;
    private router;
    constructor(authService: AuthService);
    private initializeRoutes;
    getRoutes(): Router;
}
export default SkillRoutes;
//# sourceMappingURL=skill.routes.d.ts.map