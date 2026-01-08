import { PrismaClient } from '@prisma/client';
export interface SchoolStats {
    totalStudents: number;
    totalPoints: number;
    totalExp: number;
    avgPoints: number;
    avgExp: number;
}
export interface TopStudent {
    id: string;
    name: string;
    className: string;
    level: number;
    points: number;
    exp: number;
    avatarUrl?: string;
    teamId?: string;
}
export interface PKMatch {
    id: string;
    topic: string;
    status: string;
    playerA: {
        id: string;
        name: string;
        className: string;
        avatarUrl?: string;
    };
    playerB: {
        id: string;
        name: string;
        className: string;
        avatarUrl?: string;
    };
    createdAt: string;
    student_a: string;
    student_b: string;
    winner_id?: string;
}
export interface Challenge {
    id: string;
    title: string;
    type: string;
    expAwarded: number;
    student: {
        id: string;
        name: string;
        className: string;
        avatarUrl?: string;
    };
    submittedAt: string;
    status: string;
}
export interface ClassStats {
    className: string;
    studentCount: number;
    totalPoints: number;
    totalExp: number;
    avgPoints: number;
    avgExp: number;
}
export interface DashboardData {
    schoolStats: SchoolStats;
    topStudents: TopStudent[];
    ongoingPKs: PKMatch[];
    activePKs: PKMatch[];
    recentChallenges: Challenge[];
    classRanking: ClassStats[];
}
export interface BigscreenStudent {
    id: string;
    name: string;
    avatarUrl?: string;
    level: number;
    levelTitle: string;
    exp: number;
    expProgress: number;
    expForNextLevel: number;
    points: number;
    rank: number;
    perfectStreak: number;
}
export interface PKResult {
    id: string;
    winner: {
        id: string;
        name: string;
        avatarUrl?: string;
        score: number;
    };
    loser: {
        id: string;
        name: string;
        avatarUrl?: string;
        score: number;
    };
    topic: string;
    finishedAt: string;
    rewardPoints: number;
    rewardExp: number;
}
export interface ChallengeResult {
    id: string;
    studentName: string;
    title: string;
    success: boolean;
    expAwarded: number;
    finishedAt: string;
}
export interface ActivityItem {
    id: string;
    type: 'task' | 'habit' | 'badge' | 'challenge' | 'pk' | 'progress' | 'methodology' | 'growth' | 'personalized' | 'special';
    studentName: string;
    content: string;
    expAwarded: number;
    timestamp: string;
}
export interface BadgeItem {
    id: string;
    badgeName: string;
    badgeIcon: string;
    badgeDescription: string;
    studentName: string;
    earnedAt: string;
}
export interface BigscreenData {
    schoolName: string;
    taskCompletionRate: number;
    students: BigscreenStudent[];
    pkResults: PKResult[];
    challengeResults: ChallengeResult[];
    activities: ActivityItem[];
    recentBadges: BadgeItem[];
    recentSkillUps: any[];
    publicBounties: {
        title: string;
        points: number;
        exp: number;
    }[];
}
export default class DashboardService {
    private prisma;
    constructor(prisma: PrismaClient);
    /**
     * 获取第一个活跃的学校 ID (用于兜底)
     */
    getFirstActiveSchoolId(): Promise<string | undefined>;
    /**
     * 获取大屏专用数据
     */
    getBigscreenData(schoolId: string): Promise<BigscreenData>;
    /**
     * 获取综合仪表盘数据 (管理后台用)
     */
    getDashboardData(schoolId: string): Promise<DashboardData>;
}
//# sourceMappingURL=dashboard.service.d.ts.map