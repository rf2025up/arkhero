import { PrismaClient } from '@prisma/client';
/**
 * 阅读计划服务
 * 管理学生的阅读书籍和阅读记录
 */
export declare class ReadingService {
    private prisma;
    constructor(prisma: PrismaClient);
    /**
     * 获取学生的阅读书籍列表（含最新进度）
     */
    getStudentBooks(studentId: string, schoolId: string): Promise<{
        id: string;
        bookName: string;
        totalPages: number;
        currentPage: number;
        lastReadAt: Date;
        createdAt: Date;
    }[]>;
    /**
     * 新增书籍
     */
    addBook(data: {
        studentId: string;
        schoolId: string;
        bookName: string;
        totalPages?: number;
    }): Promise<{
        id: string;
        schoolId: string;
        createdAt: Date;
        isActive: boolean;
        studentId: string;
        bookName: string;
        totalPages: number | null;
    }>;
    /**
     * 删除书籍（软删除）
     */
    deleteBook(bookId: string, schoolId: string): Promise<void>;
    /**
     * 记录阅读进度
     */
    addReadingLog(data: {
        bookId: string;
        studentId: string;
        schoolId: string;
        currentPage: number;
        duration: number;
        recordedBy?: string;
    }): Promise<{
        id: string;
        bookName: string;
        totalPages: number;
        currentPage: number;
        duration: number;
        recordedAt: Date;
    }>;
    /**
     * 获取学生阅读统计
     */
    getStudentReadingStats(studentId: string, schoolId: string): Promise<{
        totalPages: number;
        totalDuration: number;
        totalDurationHours: number;
        booksCount: number;
        books: {
            progress: number;
            bookName: string;
            totalPages: number | null;
            currentPage: number;
            id: string;
        }[];
    }>;
    /**
     * 获取学生今日阅读记录（用于家长端公告）
     */
    getTodayReadingLogs(studentId: string, schoolId: string): Promise<{
        id: string;
        bookName: string;
        totalPages: number;
        currentPage: number;
        duration: number;
        recordedAt: Date;
    }[]>;
    /**
     * 获取学生最近选择的书籍（用于默认显示）
     */
    getLastSelectedBook(studentId: string, schoolId: string): Promise<{
        bookId: string;
        bookName: string;
        totalPages: number;
        currentPage: number;
    }>;
}
//# sourceMappingURL=reading.service.d.ts.map