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
  activePKs: PKMatch[]; // 兼容旧版本
  recentChallenges: Challenge[];
  classRanking: ClassStats[];
}

// 大屏专用数据接口
export interface BigscreenStudent {
  id: string;
  name: string;
  avatarUrl?: string;
  level: number;
  exp: number;
  expProgress: number;      // 当前等级进度 0-100
  expForNextLevel: number;  // 下一级所需经验
  points: number;
  rank: number;
  perfectStreak: number; // 🆕 连胜火焰
}

// 辅助函数：计算等级进度
function calculateLevelProgress(exp: number) {
  const level = Math.floor(Math.sqrt(exp / 100)) + 1;
  const currentLevelExp = 100 * Math.pow(level - 1, 2);
  const nextLevelExp = 100 * Math.pow(level, 2);
  const expForNextLevel = nextLevelExp - currentLevelExp;
  const expProgress = Math.min(100, Math.max(0, Math.floor(((exp - currentLevelExp) / expForNextLevel) * 100)));

  return {
    level,
    expProgress,
    expForNextLevel
  };
}

// ... existing interfaces ...

// 大屏相关接口定义
export interface PKResult {
  id: string;
  winner: { id: string; name: string; avatarUrl?: string; score: number };
  loser: { id: string; name: string; avatarUrl?: string; score: number };
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
  recentSkillUps: any[]; // Define properly if needed, but 'any' works for now
  publicBounties: { title: string; points: number; exp: number }[];
}

export default class DashboardService {
  constructor(private prisma: PrismaClient) { }

  /**
   * 获取第一个活跃的学校 ID (用于兜底)
   */
  async getFirstActiveSchoolId(): Promise<string | undefined> {
    const school = await this.prisma.schools.findFirst({
      where: { isActive: true },
      select: { id: true }
    });
    return school?.id;
  }

  /**
   * 获取大屏专用数据
   */
  async getBigscreenData(schoolId: string): Promise<BigscreenData> {
    console.log('📺 [BIGSCREEN] Fetching data for school:', schoolId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today; // Alias for clarity

    const [allStudentsResult, completedPKsResult, completedChallengesResult, activeBountiesResult, recentBadgesResult, recentTasksResult, todayTasksCountResult, habitLogsResult, recentSkillUpsResult] = await Promise.allSettled([
      // 1. 获取所有学生
      this.prisma.students.findMany({
        where: { schoolId, isActive: true },
        orderBy: [
          { level: 'desc' },
          { exp: 'desc' }
        ],
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          exp: true,
          points: true,
          level: true,
          student_stats: { select: { perfectStreak: true } } // 🆕 获取连胜数据
        },
      }),
      // 2. 获取今日已完成的 PK
      this.prisma.pk_matches.findMany({
        where: {
          schoolId,
          status: 'COMPLETED',
          updatedAt: { gte: todayStart },
        },
        include: { playerA: { select: { id: true, name: true, avatarUrl: true } }, playerB: { select: { id: true, name: true, avatarUrl: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 10,
      }),
      // 3. 今日已完成的挑战记录（个人判定）
      this.prisma.challenge_participants.findMany({
        where: {
          challenges: { schoolId },
          completedAt: { gte: todayStart },
          result: { not: null }
        },
        include: { students: { select: { name: true } }, challenges: { select: { title: true, rewardExp: true, rewardPoints: true } } },
        orderBy: { completedAt: 'desc' },
        take: 10,
      }),
      // 4. 获取当前选课中的“公开悬赏”（CLASS 类型的 ACTIVE 挑战）
      this.prisma.challenges.findMany({
        where: {
          schoolId,
          type: 'CLASS',
          status: 'ACTIVE'
        },
        orderBy: { startDate: 'desc' },
        take: 5
      }),
      // 5. 最近获得的勋章
      this.prisma.student_badges.findMany({
        where: { students: { schoolId } },
        include: { students: { select: { name: true } }, badges: { select: { id: true, name: true, icon: true, description: true } } },
        orderBy: { awardedAt: 'desc' },
        take: 15,
      }),
      // 6. 最近任务完成（实时动态）- 过滤特定类型
      this.prisma.task_records.findMany({
        where: {
          schoolId,
          status: 'COMPLETED',
          updatedAt: { gte: today },
          task_category: {
            in: ['HABIT', 'BADGE', 'CHALLENGE', 'PK', 'PROGRESS', 'METHODOLOGY', 'GROWTH', 'PERSONALIZED', 'SPECIAL', 'TASK']
          },
          NOT: {
            title: { in: ['手动加分', '移入班级'] }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        include: {
          students: { select: { name: true } }
        }
      }),
      // 7. 今日任务总数（用于计算完成率）
      this.prisma.task_records.count({
        where: {
          schoolId,
          createdAt: { gte: today }
        }
      }),
      // 8. 今日习惯打卡记录
      this.prisma.habit_logs.findMany({
        where: {
          schoolId,
          checkedAt: { gte: today }
        },
        include: {
          students: { select: { name: true } },
          habits: { select: { name: true } }
        },
        orderBy: { checkedAt: 'desc' },
        take: 20
      }),
      // 9. 最近技能升级
      this.prisma.student_skills.findMany({
        where: {
          students: { schoolId },
          level: { gt: 0 }
        },
        orderBy: { levelUpAt: 'desc' },
        take: 10,
        include: {
          students: { select: { name: true } },
          skill: { select: { code: true, name: true, levelData: true } }
        }
      })
    ]);

    // 处理学生数据
    const studentsData = allStudentsResult.status === 'fulfilled' ? allStudentsResult.value : [];

    // 1. 先计算所有人的真实等级与进度
    let students: BigscreenStudent[] = studentsData.map((s) => {
      const progress = calculateLevelProgress(s.exp);
      return {
        id: s.id,
        name: s.name,
        avatarUrl: s.avatarUrl || undefined,
        level: progress.level,
        exp: s.exp,
        expProgress: progress.expProgress,
        expForNextLevel: progress.expForNextLevel,
        points: s.points,
        rank: 0, // 稍后计算
        perfectStreak: s.student_stats?.perfectStreak || 0 // 🆕 映射连胜数据
      };
    });

    // 2. 根据计算出的真实等级 (Level) 优先，其次经验 (Exp) 进行内存排序
    students.sort((a, b) => {
      if (b.level !== a.level) return b.level - a.level;
      if (b.exp !== a.exp) return b.exp - a.exp;
      return b.points - a.points;
    });

    // 3. 重新分配基于真实等级的排名
    students = students.map((s, index) => ({
      ...s,
      rank: index + 1
    }));

    // 处理 PK 结果
    const pksData = completedPKsResult.status === 'fulfilled' ? completedPKsResult.value : [];
    const pkResults: PKResult[] = pksData.map(pk => {
      const isAWinner = pk.winnerId === pk.studentA;
      const metadata = (pk.metadata as any) || {};
      return {
        id: pk.id,
        winner: {
          id: isAWinner ? pk.studentA : pk.studentB,
          name: isAWinner ? (pk as any).playerA?.name : (pk as any).playerB?.name,
          avatarUrl: isAWinner ? (pk as any).playerA?.avatarUrl : (pk as any).playerB?.avatarUrl,
          score: metadata.scoreA || 0
        },
        loser: {
          id: isAWinner ? pk.studentB : pk.studentA,
          name: isAWinner ? (pk as any).playerB?.name : (pk as any).playerA?.name,
          avatarUrl: isAWinner ? (pk as any).playerB?.avatarUrl : (pk as any).playerA?.avatarUrl,
          score: metadata.scoreB || 0
        },
        topic: pk.topic || 'PK对决',
        finishedAt: pk.updatedAt.toISOString(),
        rewardPoints: metadata.rewardPoints || 100,
        rewardExp: metadata.rewardExp || 50
      };
    });

    // 处理挑战结果
    const challengesData = completedChallengesResult.status === 'fulfilled' ? completedChallengesResult.value : [];
    const challengeResults: ChallengeResult[] = challengesData.map(c => ({
      id: c.id,
      studentName: (c as any).students?.name || '未知',
      title: (c as any).challenges?.title || '未知挑战',
      success: c.result === 'COMPLETED',
      expAwarded: (c as any).challenges?.rewardExp || 0,
      finishedAt: c.completedAt ? c.completedAt.toISOString() : c.joinedAt.toISOString()
    }));

    // 处理实时动态
    const tasksData = recentTasksResult.status === 'fulfilled' ? recentTasksResult.value : [];

    // 获取习惯打卡数据
    const habitLogsData = habitLogsResult.status === 'fulfilled' ? habitLogsResult.value : [];

    // 将 task_records 转换为 activities，带上类型标签
    const taskActivities: ActivityItem[] = tasksData.map(t => {
      const categoryMap: Record<string, string> = {
        'HABIT': 'habit', 'BADGE': 'badge', 'CHALLENGE': 'challenge', 'PK': 'pk',
        'PROGRESS': 'progress', 'METHODOLOGY': 'methodology', 'GROWTH': 'growth',
        'PERSONALIZED': 'personalized', 'SPECIAL': 'special', 'TASK': 'growth'
      };

      const contentObj = (t.content as any) || {};
      let title = t.title;

      // 🆕 智能标签推导：根据任务标题和内容动态判断类别
      const getSmartLabel = (taskTitle: string, taskCategory: string, content: any): string => {
        const normalizedTitle = taskTitle.toLowerCase();

        // 习惯类
        if (normalizedTitle.includes('全勤') || normalizedTitle.includes('打卡') || normalizedTitle.includes('连续')) {
          return '【好习惯】';
        }
        // PK/竞技类
        if (normalizedTitle.includes('pk') || normalizedTitle.includes('对决') || normalizedTitle.includes('pk获胜')) {
          return '【竞技场】';
        }
        // 挑战类
        if (normalizedTitle.includes('挑战') || taskCategory === 'CHALLENGE') {
          return '【巅峰挑战】';
        }
        // 勋章类
        if (normalizedTitle.includes('勋章') || taskCategory === 'BADGE') {
          return '【成就勋章】';
        }
        // 语文类
        if (normalizedTitle.includes('生字') || normalizedTitle.includes('课文') || normalizedTitle.includes('背诵') ||
          normalizedTitle.includes('听写') || normalizedTitle.includes('古诗') || normalizedTitle.includes('阅读')) {
          return '【语文基础】';
        }
        // 数学类
        if (normalizedTitle.includes('口算') || normalizedTitle.includes('竖式') || normalizedTitle.includes('计算') ||
          normalizedTitle.includes('分步') || normalizedTitle.includes('数学')) {
          return '【数学基础】';
        }
        // 英语类
        if (normalizedTitle.includes('单词') || normalizedTitle.includes('unit') || normalizedTitle.includes('英语') ||
          normalizedTitle.includes('默写') && (content.category?.includes('英语') || normalizedTitle.includes('词'))) {
          return '【英语基础】';
        }
        // 方法论类
        if (normalizedTitle.includes('笔法') || normalizedTitle.includes('三色') || normalizedTitle.includes('解题') ||
          taskCategory === 'METHODOLOGY') {
          return '【核心教学法】';
        }
        // 书写/专注类
        if (normalizedTitle.includes('书写') || normalizedTitle.includes('工整') || normalizedTitle.includes('专注')) {
          return '【学习习惯】';
        }
        // 计划类
        if (normalizedTitle.includes('计划') || normalizedTitle.includes('规划')) {
          return '【自主规划】';
        }
        // 特殊奖励
        if (taskCategory === 'SPECIAL') {
          return '【特殊奖励】';
        }
        // 默认按 task_category 返回
        const fallbackMap: Record<string, string> = {
          'METHODOLOGY': '【核心教学法】',
          'GROWTH': '【综合成长】',
          'TASK': '【综合成长】',
          'PROGRESS': '【学业过关】',
          'PERSONALIZED': '【个性化加餐】'
        };
        return fallbackMap[taskCategory] || '【学习动态】';
      };

      let label = getSmartLabel(title, t.task_category, contentObj);

      // 🆕 连胜详情解析
      if (contentObj.isStreak && Array.isArray(contentObj.items) && contentObj.items.length > 0) {
        // 取最新的连胜项目
        const latestStreak = [...contentObj.items].sort((a, b) =>
          new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
        )[0];

        if (latestStreak) {
          label = `【连胜荣耀】`;
          title = `${latestStreak.subject || ''} ${latestStreak.label} ${latestStreak.currentStreak}连胜`;
        }
      }

      return {
        id: t.id,
        type: (categoryMap[t.task_category] || 'task') as any,
        studentName: (t as any).students?.name || '未知',
        content: label + title,
        expAwarded: t.expAwarded || 0,
        timestamp: t.updatedAt.toISOString()
      };
    });

    // 将习惯打卡记录转换为 activities
    const habitActivities: ActivityItem[] = habitLogsData.map((h: any) => ({
      id: h.id,
      type: 'habit' as any,
      studentName: h.students?.name || '未知',
      content: `【习惯打卡】${h.habits?.name || '打卡'} (连续${h.streakDays}天)`,
      expAwarded: 10,
      timestamp: h.checkedAt.toISOString()
    }));

    // 获取阅读日志数据
    const readingLogs = await this.prisma.reading_logs.findMany({
      where: { schoolId, recordedAt: { gte: today } },
      include: { students: { select: { name: true } }, books: { select: { bookName: true } } },
      orderBy: { recordedAt: 'desc' },
      take: 20
    });

    // 将阅读日志转换为 activities
    const readingActivities: ActivityItem[] = readingLogs.map((r: any) => ({
      id: r.id,
      type: 'progress' as any,
      studentName: r.students?.name || '未知',
      content: `【阅读记录】《${r.books?.bookName || '书籍'}》 ${r.duration}分钟`,
      expAwarded: Math.floor(r.duration / 5) * 5,
      timestamp: r.recordedAt.toISOString()
    }));

    // 合并并按时间排序
    const activities: ActivityItem[] = [...taskActivities, ...habitActivities, ...readingActivities]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 20);

    // 处理勋章数据
    const badgesData = recentBadgesResult.status === 'fulfilled' ? recentBadgesResult.value : [];
    const recentBadgesList: BadgeItem[] = badgesData.map(b => ({
      id: b.id,
      badgeName: (b as any).badges?.name || '勋章',
      badgeIcon: (b as any).badges?.icon || '🏅',
      badgeDescription: (b as any).badges?.description || '在相应领域表现优异，获得此项荣誉。继续加油！',
      studentName: (b as any).students?.name || '未知',
      earnedAt: b.awardedAt.toISOString()
    }));

    // 计算任务完成率
    const totalTasksToday = todayTasksCountResult.status === 'fulfilled' ? todayTasksCountResult.value : 0;
    const completedTasksToday = tasksData.length;
    const taskCompletionRate = totalTasksToday > 0 ? Math.round((completedTasksToday / totalTasksToday) * 100) : 0;

    // 处理技能升级数据
    const skillUpsData = recentSkillUpsResult.status === 'fulfilled' ? recentSkillUpsResult.value : [];

    // 格式化技能升级数据
    const recentSkillUps = skillUpsData.map((s: any) => {
      const levelData = (s.skill?.levelData as any[]) || [];
      const levelInfo = levelData.find((l: any) => l.lvl === s.level);
      return {
        studentName: s.students?.name || '未知',
        skillCode: s.skill?.code || '',
        skillName: s.skill?.name || '未知技能',
        level: s.level,
        levelTitle: levelInfo?.title || '未知境界',
        timestamp: (s.levelUpAt || s.updatedAt || new Date()).toISOString()
      };
    });

    // 4. 处理公开悬赏
    const bountiesData = activeBountiesResult.status === 'fulfilled' ? activeBountiesResult.value : [];
    const publicBounties = bountiesData.map(b => ({
      title: b.title,
      points: b.rewardPoints,
      exp: b.rewardExp
    }));

    // 组装最终结果
    const result: BigscreenData = {
      schoolName: '星途成长方舟', // Placeholder or fetch from DB
      taskCompletionRate,
      students: students.slice(0, 50),
      pkResults,
      challengeResults,
      activities: activities.slice(0, 15),
      recentBadges: recentBadgesList,
      recentSkillUps,
      publicBounties
    };
    return result;
  }

  /**
   * 获取综合仪表盘数据 (管理后台用)
   */
  async getDashboardData(schoolId: string): Promise<DashboardData> {
    const [students, ongoingPKs, activeParticipants] = await Promise.all([
      // 1. 获取所有学生
      this.prisma.students.findMany({
        where: { schoolId, isActive: true },
        select: {
          id: true,
          name: true,
          className: true,
          level: true,
          points: true,
          exp: true,
          avatarUrl: true,
          teamId: true
        }
      }),
      // 2. 进行中的 PK
      this.prisma.pk_matches.findMany({
        where: { schoolId, status: { not: 'COMPLETED' } },
        include: {
          playerA: { select: { id: true, name: true, className: true, avatarUrl: true } },
          playerB: { select: { id: true, name: true, className: true, avatarUrl: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      // 3. 活跃的挑战参与
      this.prisma.challenge_participants.findMany({
        where: { challenges: { schoolId } },
        include: {
          students: { select: { id: true, name: true, avatarUrl: true, className: true } },
          challenges: { select: { title: true, type: true, rewardExp: true } }
        },
        orderBy: { joinedAt: 'desc' },
        take: 10
      })
    ]);

    // 计算学校统计
    const schoolStats: SchoolStats = {
      totalStudents: students.length,
      totalPoints: students.reduce((sum, s) => sum + s.points, 0),
      totalExp: students.reduce((sum, s) => sum + s.exp, 0),
      avgPoints: students.length > 0 ? Math.floor(students.reduce((sum, s) => sum + s.points, 0) / students.length) : 0,
      avgExp: students.length > 0 ? Math.floor(students.reduce((sum, s) => sum + s.exp, 0) / students.length) : 0
    };

    // 计算 Top 5 学生
    const topStudents: TopStudent[] = [...students]
      .sort((a, b) => b.exp - a.exp)
      .slice(0, 5)
      .map(s => ({
        id: s.id,
        name: s.name,
        className: s.className || '未分配',
        level: s.level,
        points: s.points,
        exp: s.exp,
        avatarUrl: s.avatarUrl || undefined,
        teamId: s.teamId || undefined
      }));

    // 计算班级排名
    const classMap = new Map<string, { className: string; count: number; totalPoints: number; totalExp: number }>();
    students.forEach(s => {
      const className = s.className || '未分配';
      const current = classMap.get(className) || { className, count: 0, totalPoints: 0, totalExp: 0 };
      current.count++;
      current.totalPoints += s.points;
      current.totalExp += s.exp;
      classMap.set(className, current);
    });

    const classRanking: ClassStats[] = Array.from(classMap.values())
      .map(c => ({
        className: c.className,
        studentCount: c.count,
        totalPoints: c.totalPoints,
        totalExp: c.totalExp,
        avgPoints: Math.floor(c.totalPoints / c.count),
        avgExp: Math.floor(c.totalExp / c.count)
      }))
      .sort((a, b) => b.avgExp - a.avgExp);

    // 格式化 PK 数据
    const ongoingPKsFormatted = ongoingPKs.map((pk: any) => ({
      id: pk.id,
      topic: pk.topic,
      status: pk.status,
      createdAt: pk.createdAt.toISOString(),
      student_a: pk.playerA.id,
      student_b: pk.playerB.id,
      playerA: {
        id: pk.playerA.id,
        name: pk.playerA.name,
        className: pk.playerA.className || '',
        avatarUrl: pk.playerA.avatarUrl || undefined
      },
      playerB: {
        id: pk.playerB.id,
        name: pk.playerB.name,
        className: pk.playerB.className || '',
        avatarUrl: pk.playerB.avatarUrl || undefined
      }
    }));

    // 格式化挑战数据
    const recentChallengesFormatted: Challenge[] = activeParticipants.map(p => ({
      id: p.id,
      title: p.challenges.title,
      type: p.challenges.type,
      expAwarded: p.challenges.rewardExp,
      student: {
        id: p.students.id,
        name: p.students.name,
        className: p.students.className || '',
        avatarUrl: p.students.avatarUrl || undefined
      },
      status: p.status,
      submittedAt: p.joinedAt.toISOString()
    }));

    return {
      schoolStats,
      topStudents,
      ongoingPKs: ongoingPKsFormatted,
      activePKs: ongoingPKsFormatted,
      recentChallenges: recentChallengesFormatted,
      classRanking
    };
  }
}
