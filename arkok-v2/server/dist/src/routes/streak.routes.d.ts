import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
export declare class StreakRoutes {
    private router;
    private streakService;
    private prisma;
    constructor(prisma: PrismaClient);
    private initRoutes;
    getRouter(): Router;
}
//# sourceMappingURL=streak.routes.d.ts.map