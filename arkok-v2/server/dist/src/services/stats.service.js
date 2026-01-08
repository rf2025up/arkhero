"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.statsService = exports.StatsService = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const prisma = prisma_1.default;
class StatsService {
    /**
     * Get student stats or create if not exists
     */
    async getStudentStats(studentId) {
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
exports.StatsService = StatsService;
exports.statsService = new StatsService();
//# sourceMappingURL=stats.service.js.map