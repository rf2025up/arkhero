import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import AuthService from '../services/auth.service';
/**
 * 错题管理路由 (V5.0 - 轻量级设计)
 * 只记录页码+题号，支持错因标签
 */
export declare class MistakesRoutes {
    private authService;
    private router;
    private prisma;
    constructor(authService: AuthService, prisma: PrismaClient);
    private initializeRoutes;
    getRoutes(): Router;
}
//# sourceMappingURL=mistakes.routes.d.ts.map