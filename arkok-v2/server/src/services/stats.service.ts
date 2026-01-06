
import _prisma from '../utils/prisma';
const prisma = _prisma as any;

export class StatsService {
    /**
     * Get student stats or create if not exists
     */
    async getStudentStats(studentId: string) {
        let stats = await prisma.student_stats.findUnique({
            where: { studentId }
        });

        if (!stats) {
            stats = await prisma.student_stats.create({
                data: { studentId }
            });
        }
        return stats;
    }


}

export const statsService = new StatsService();
