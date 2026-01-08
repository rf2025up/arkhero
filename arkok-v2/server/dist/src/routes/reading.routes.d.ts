import { Router } from 'express';
import { ReadingService } from '../services/reading.service';
import { AuthService } from '../services/auth.service';
/**
 * 阅读计划路由
 */
export declare class ReadingRoutes {
    private readingService;
    private authService;
    private router;
    constructor(readingService: ReadingService, authService: AuthService);
    private initializeRoutes;
    /**
     * 获取学生的阅读书籍列表
     */
    private getStudentBooks;
    /**
     * 新增书籍
     */
    private addBook;
    /**
     * 删除书籍
     */
    private deleteBook;
    /**
     * 记录阅读进度
     */
    private addReadingLog;
    /**
     * 获取学生阅读统计
     */
    private getReadingStats;
    /**
     * 获取最近选择的书籍
     */
    private getLastSelectedBook;
    getRoutes(): Router;
}
export default ReadingRoutes;
//# sourceMappingURL=reading.routes.d.ts.map