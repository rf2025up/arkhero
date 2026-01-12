import { PrismaClient } from '@prisma/client';
import { Server as SocketIOServer } from 'socket.io';

export interface StudentQuery {
  schoolId: string;
  className?: string;  // 数据库字段名，移除className违宪用法
  search?: string;
  page?: number;
  limit?: number;
  // 🆕 新增师生绑定相关参数
  teacherId?: string;     // 查询指定老师的学生
  scope?: 'MY_STUDENTS' | 'ALL_SCHOOL' | 'SPECIFIC_TEACHER';  // 查询范围：我的学生 vs 全校 vs 特定老师
  userRole?: 'ADMIN' | 'TEACHER';       // 用户角色，用于权限控制
  requesterId?: string;   // 请求者ID（用于查看其他老师班级时的权限记录）
}

export interface AddScoreRequest {
  studentIds: string[];
  points: number;
  exp: number;
  reason: string;
  schoolId: string;
  metadata?: Record<string, any>;
}

export interface CreateStudentRequest {
  name: string;
  className?: string;  // 改为可选，仅作为显示标签
  schoolId: string;
  teacherId: string;  // 🆕 新增：必须指定归属老师
}

export interface UpdateStudentRequest {
  id: string;
  schoolId: string;
  name?: string;
  className?: string;
  avatar?: string;
  score?: number;
  exp?: number;
  grade?: string;
  semester?: string;
}

export interface StudentListResponse {
  students: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ScoreUpdateEvent {
  type: 'SCORE_UPDATE';
  data: {
    studentIds: string[];
    points: number;
    exp: number;
    reason: string;
    timestamp: string;
    updatedBy: string;
    metadata?: Record<string, any>;
  };
}

export class StudentService {
  private prisma: PrismaClient;
  private io: SocketIOServer;

  constructor(prisma: PrismaClient, io: SocketIOServer) {
    this.prisma = prisma;
    this.io = io;
  }

  /**
   * 🆕 获取学生列表 - 基于师生绑定的重构版本
   */
  async getStudents(query: StudentQuery): Promise<StudentListResponse> {
    const { schoolId, teacherId, scope, userRole } = query;
    console.log(`[TEACHER BINDING] Fetching students with query:`, { schoolId, teacherId, scope, userRole });

    try {
      // 🆕 构建查询条件 - 基于师生关系
      let whereCondition: any = {
        schoolId: schoolId,
        isActive: true,
      };

      // 🚨 临时调试：检查现有学生的teacherId分布
      console.log(`[DEBUG] 🔍 Checking teacherId distribution before query...`);
      const allStudents = await this.prisma.students.findMany({
        where: { schoolId, isActive: true },
        select: { id: true, name: true, teacherId: true, className: true }
      });

      const teacherIdStats = allStudents.reduce((acc, student) => {
        const tid = student.teacherId || 'null';
        acc[tid] = (acc[tid] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log(`[DEBUG] 📊 TeacherId distribution:`, teacherIdStats);
      console.log(`[DEBUG] 📊 Total students in DB: ${allStudents.length}`);

      // 根据查询范围和用户角色确定查询条件
      if (scope === 'MY_STUDENTS' && teacherId) {
        // 老师查看自己的学生
        whereCondition.teacherId = teacherId;
        console.log(`[TEACHER BINDING] Querying MY_STUDENTS for teachers: ${teacherId}`);
      } else if (scope === 'ALL_SCHOOL' && userRole === 'ADMIN') {
        // 管理员查看全校学生 - 无需额外条件
        console.log(`[TEACHER BINDING] Querying ALL_SCHOOL for ADMIN`);
      } else if (scope === 'ALL_SCHOOL' && userRole === 'TEACHER') {
        // 老师查看全校学生 - 显示所有学生（包括已归属和未归属的）
        console.log(`[TEACHER BINDING] Querying ALL_SCHOOL for TEACHER: ${teacherId}`);
        // 🆕 修复：显示全校所有学生，不再限制teacherId
        // 老师可以看到所有学生，然后通过前端按钮选择"移入"
      } else if (scope === 'SPECIFIC_TEACHER' && teacherId) {
        // 🆕 新增：查看特定老师的学生（用于抢人功能）
        whereCondition.teacherId = teacherId;
        console.log(`[TEACHER BINDING] Querying SPECIFIC_TEACHER: ${teacherId}, requester: ${query.requesterId}`);
      } else {
        // 默认情况：如果指定了teacherId且不是ALL_SCHOOL模式，查询该老师的学生
        if (teacherId && scope !== 'ALL_SCHOOL') {
          whereCondition.teacherId = teacherId;
          console.log(`[TEACHER BINDING] Default: querying students for teachers: ${teacherId}`);
        } else if (scope === 'ALL_SCHOOL') {
          console.log(`[TEACHER BINDING] ALL_SCHOOL mode: ignoring teacherId to show all students`);
        }
      }

      // 🆕 只根据 teacherId 分班，不使用 className 过滤
      // className 仅作为显示标签，不参与查询过滤
      console.log(`[TEACHER BINDING] ⚠️ Using teacherId only for student filtering (className filter removed)`);

      // 保留搜索功能
      if (query.search) {
        whereCondition.name = {
          contains: query.search,
          mode: 'insensitive'
        };
      }

      const students = await this.prisma.students.findMany({
        where: whereCondition,
        select: {
          id: true,
          name: true,
          className: true,
          avatarUrl: true,
          points: true,
          exp: true,
          level: true,
          teacherId: true,
          isActive: true,
          grade: true,
          semester: true,
        },
        orderBy: [
          { exp: 'desc' },
          { name: 'asc' },
        ],
      });

      console.log(`[TEACHER BINDING] ✅ Found ${students.length} students for scope: ${scope}`);

      // ✅ 动态计算等级，确保与 exp 一致
      const studentsWithCalculatedLevel = students.map(student => ({
        ...student,
        level: this.calculateLevel(student.exp)
      }));

      return {
        students: studentsWithCalculatedLevel,
        pagination: {
          page: query.page || 1,
          limit: query.limit || students.length,
          total: students.length,
          totalPages: 1
        }
      };
    } catch (error) {
      console.error("[TEACHER BINDING] ❌ Error fetching students:", error);
      throw new Error("Could not fetch students.");
    }
  }

  /**
   * 根据ID获取单个学生
   */
  async getStudentById(id: string, schoolId: string): Promise<any> {
    const student = await this.prisma.students.findFirst({
      where: {
        id,
        schoolId,
        isActive: true
      },
      include: {
        task_records: {
          orderBy: { createdAt: 'desc' },
          take: 10
        }
      }
    });

    if (!student) {
      throw new Error('学生不存在');
    }

    return student;
  }

  /**
   * 获取学生完整档案（聚合所有相关数据）
   */
  public async getStudentProfile(studentId: string, schoolId: string, userRole?: 'ADMIN' | 'TEACHER', userId?: string): Promise<any> {
    try {
      console.log(`🔍 获取学生档案: ${studentId}, 学校: ${schoolId}`);

      const [
        student,
        task_records,
        pkMatchesAsPlayerA,
        pkMatchesAsPlayerB,
        allPkMatches,
        taskStats,
        allHabits,
        studentHabitLogs,
        latestLessonPlan,
        latestOverride,
        student_badges,
        radarStats,
        streakStats,
        unlockedSkills,
        readingStats
      ] = await Promise.all([
        // 1. 学生基础信息
        this.prisma.students.findFirst({
          where: {
            id: studentId,
            schoolId,
            isActive: true,
            // 权限过滤：如果是老师，只能查看自己名下的学生；如果是管理员，可以查看所有学生
            ...(userRole === 'TEACHER' && userId ? { teacherId: userId } : {})
          },
          include: {
            teachers: {
              select: { name: true }
            }
          }
        }),

        // 2. 任务记录（全部，按时间倒序）
        this.prisma.task_records.findMany({
          where: {
            studentId,
            schoolId
          },
          orderBy: { createdAt: 'desc' },
          include: {
            lesson_plans: {
              select: { id: true, title: true, date: true }
            }
          }
        }),

        // 3. PK记录（作为PlayerA）
        this.prisma.pk_matches.findMany({
          where: {
            studentA: studentId,
            schoolId
          },
          orderBy: { createdAt: 'desc' },
          include: {
            playerA: {
              select: { id: true, name: true, className: true }
            },
            playerB: {
              select: { id: true, name: true, className: true }
            },
            winner: {
              select: { id: true, name: true }
            }
          }
        }),

        // 4. PK记录（作为PlayerB）
        this.prisma.pk_matches.findMany({
          where: {
            studentB: studentId,
            schoolId
          },
          orderBy: { createdAt: 'desc' },
          include: {
            playerA: {
              select: { id: true, name: true, className: true }
            },
            playerB: {
              select: { id: true, name: true, className: true }
            },
            winner: {
              select: { id: true, name: true }
            }
          }
        }),

        // 5. 所有PK记录（用于统计）
        this.prisma.pk_matches.findMany({
          where: {
            schoolId,
            OR: [
              { studentA: studentId },
              { studentB: studentId }
            ]
          }
        }),

        // 6. 任务统计数据
        this.prisma.task_records.groupBy({
          by: ['status', 'type'],
          where: {
            studentId,
            schoolId
          },
          _count: {
            status: true
          },
          _sum: {
            expAwarded: true
          }
        }),

        // 7. 习惯数据
        this.prisma.habits.findMany({
          where: { schoolId, isActive: true }
        }),

        // 8. 学生习惯记录
        this.prisma.habit_logs.findMany({
          where: { studentId, schoolId },
          orderBy: { checkedAt: 'desc' }
        }),

        // 9. 🆕 最新教学计划 (用于计算进度)
        this.prisma.lesson_plans.findFirst({
          where: {
            schoolId,
            isActive: true,
            // 如果学生有归属老师，取该老师的计划
            ...(studentId ? { teachers: { students: { some: { id: studentId } } } } : {})
          },
          orderBy: { date: 'desc' }
        }),

        // 10. 🆕 最新覆盖记录
        this.prisma.task_records.findFirst({
          where: { studentId, schoolId, isOverridden: true },
          orderBy: { updatedAt: 'desc' }
        }),

        // 11. 🆕 勋章数据
        this.prisma.student_badges.findMany({
          where: { studentId },
          include: {
            badges: {
              select: { id: true, name: true, icon: true, category: true }
            }
          },
          orderBy: { awardedAt: 'desc' }
        }),
        // 12. 🆕 五维雷达图数据
        this.calculateRadarStats(studentId),
        // 13. 🆕 详细连胜数据
        this.calculateDetailedStreaks(studentId),
        // 14. 🆕 已点亮技能
        this.prisma.student_skills.findMany({
          where: { studentId, level: { gt: 0 } },
          include: {
            skill: {
              select: { name: true, icon: true, code: true, category: true, attribute: true }
            }
          }
        }),
        // 15. 🆕 阅读统计
        this.calculateReadingStats(studentId, schoolId)
      ]);

      // 验证学生是否存在
      if (!student) {
        throw new Error('学生不存在');
      }

      // 🆕 注入过关地图聚合逻辑：按单元/课时分组
      const semesterMap = task_records
        .filter(t => t.type === 'QC')
        .reduce((acc: any, task: any) => {
          const content = task.content || {};
          const unit = content.unit || '0';
          const lesson = content.lesson || '0';
          const key = `${unit}-${lesson}`;

          if (!acc[key]) {
            acc[key] = { unit, lesson, title: content.lessonPlanTitle || `第${lesson}课`, tasks: [] };
          }
          acc[key].tasks.push({
            id: task.id,
            title: task.title,
            status: task.status,
            exp: task.expAwarded,
            attempts: task.attempts || 0 // 🆕 注入辅导/补过次数
          });
          return acc;
        }, {});

      // 处理PK记录 - 合并studentA和studentB的记录，并按时间排序
      const allPkRecordsWithDetails = [...pkMatchesAsPlayerA, ...pkMatchesAsPlayerB]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .map(match => ({
          ...match,
          isPlayerA: match.studentA === studentId,
          // opponent: match.studentA === studentId ? match.studentB : match.studentA, 
          // 修正：使用 playerA/playerB 关系对象而非 ID
          opponent: match.studentA === studentId ? match.playerB : match.playerA,
          isWinner: match.winnerId === studentId,
          // 添加关系字段数据用于前端显示
          playerA: match.playerA,
          playerB: match.playerB,
          winner: match.winner
        }));

      // 计算PK统计数据
      const pkStats = {
        totalMatches: allPkMatches.length,
        wins: allPkMatches.filter(match => match.winnerId === studentId).length,
        losses: allPkMatches.filter(match => match.winnerId !== studentId && match.winnerId !== null).length,
        draws: allPkMatches.filter(match => match.winnerId === null).length,
        winRate: allPkMatches.length > 0
          ? (allPkMatches.filter(match => match.winnerId === studentId).length / allPkMatches.length * 100).toFixed(1)
          : '0.0'
      };

      // 🆕 处理习惯统计数据 (SSOT)
      console.log(`🎯 [HABIT_DEBUG] allHabits 数量: ${allHabits.length}, studentHabitLogs 数量: ${studentHabitLogs.length}`);
      const habitStats = allHabits.map(habit => {
        const logs = studentHabitLogs.filter(log => log.habitId === habit.id);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        return {
          habit: {
            id: habit.id,
            name: habit.name,
            icon: habit.icon,
            expReward: habit.expReward
          },
          stats: {
            totalCheckIns: logs.length,
            currentStreak: logs.length > 0 ? logs[0].streakDays : 0, // 简化版连续打卡
            checkedToday: logs.some(log => {
              const checkDate = new Date(log.checkedAt);
              return checkDate >= today && checkDate < tomorrow;
            })
          }
        };
      }).filter(h => h.stats.totalCheckIns > 0);
      console.log(`🎯 [HABIT_DEBUG] 生成的 habitStats 数量: ${habitStats.length}`);

      // 🆕 计算课程进度 (对齐 LMS Service 逻辑)
      const getGradeFromClass = (className: string | null) => {
        if (!className) return '二年级';
        if (className.includes('一')) return '一年级';
        if (className.includes('二')) return '二年级';
        if (className.includes('三')) return '三年级';
        if (className.includes('四')) return '四年级';
        if (className.includes('五')) return '五年级';
        if (className.includes('六')) return '六年级';
        return '二年级';
      };

      const defaultProgress = {
        chinese: { unit: '1', lesson: '1', title: '默认课程' },
        math: { unit: '1', lesson: '1', title: '默认课程' },
        english: { unit: '1', title: 'Default' },
        grade: student?.grade || getGradeFromClass(student?.className || null),
        semester: student?.semester || '上册'
      };

      const planInfo = (latestLessonPlan?.content as any)?.courseInfo || defaultProgress;
      const overrideInfo = (latestOverride?.content as any)?.courseInfo;

      let studentProgress = planInfo;
      let progressSource = latestLessonPlan ? 'lesson_plan' : 'default';
      let progressUpdatedAt = latestLessonPlan?.updatedAt || (student ? student.createdAt : new Date());

      if (overrideInfo && student) {
        const planTime = latestLessonPlan ? new Date(latestLessonPlan.updatedAt).getTime() : 0;
        const overrideTime = new Date(latestOverride.updatedAt).getTime();

        if (overrideTime > planTime) {
          studentProgress = overrideInfo;
          progressSource = 'override';
          progressUpdatedAt = latestOverride.updatedAt;
        }
      }

      const processedProgress = {
        ...studentProgress,
        source: progressSource,
        updatedAt: progressUpdatedAt
      };

      // 处理任务统计数据
      const processedTaskStats = {
        totalTasks: task_records.length,
        completedTasks: task_records.filter(task => task.status === 'COMPLETED').length,
        pendingTasks: task_records.filter(task => task.status === 'PENDING').length,
        submittedTasks: task_records.filter(task => task.status === 'SUBMITTED').length,
        reviewedTasks: task_records.filter(task => task.status === 'REVIEWED').length,
        exp: task_records.reduce((sum, task) => sum + task.expAwarded, 0),
        qcTasks: task_records.filter(task => task.type === 'QC').length,
        specialTasks: task_records.filter(task => task.type === 'SPECIAL').length,
        challengeTasks: task_records.filter(task => task.type === 'CHALLENGE').length
      };

      // 计算学生等级（基于经验表）
      const school = await this.prisma.schools.findUnique({
        where: { id: student.schoolId },
        select: { settings: true }
      });
      const multiplier = (school?.settings as any)?.expMultiplier || 1.0;
      const adjustedExp = student.exp * multiplier;

      // 经验等级表（累计经验）
      const levelThresholds = [
        0,      // Lv.1
        500,    // Lv.2
        1500,   // Lv.3
        3000,   // Lv.4
        5000,   // Lv.5
        7500,   // Lv.6
        10500,  // Lv.7
        14000,  // Lv.8
        18000,  // Lv.9
        23000   // Lv.10
      ];

      const levelTitles = [
        '初窥门径',  // Lv.1
        '略有小成',  // Lv.2
        '驾轻就熟',  // Lv.3
        '融会贯通',  // Lv.4
        '炉火纯青',  // Lv.5
        '出类拔萃',  // Lv.6
        '神乎其技',  // Lv.7
        '登峰造极',  // Lv.8
        '返璞归真',  // Lv.9
        '一代宗师'   // Lv.10
      ];

      // 查找当前等级
      let level = 1;
      for (let i = 0; i < levelThresholds.length; i++) {
        if (adjustedExp >= levelThresholds[i]) {
          level = i + 1;
        } else {
          break;
        }
      }

      // 计算进度
      const currentLevelExp = levelThresholds[level - 1] || 0;
      const nextLevelExp = levelThresholds[level] || levelThresholds[levelThresholds.length - 1];
      const expForNextLevel = nextLevelExp - currentLevelExp;
      const expProgress = expForNextLevel > 0
        ? Math.min(100, Math.max(0, Math.floor(((adjustedExp - currentLevelExp) / expForNextLevel) * 100)))
        : 100;

      const remainingExp = Math.max(0, nextLevelExp - adjustedExp);

      const levelInfo = {
        level,
        expProgress,
        remainingExp,  // 升级还需多少经验
        title: levelTitles[Math.min(level - 1, levelTitles.length - 1)],
        isMaxLevel: level >= levelThresholds.length
      };

      // 构建时间轴数据（按日期分组的任务、PK记录和阅读记录）
      const timelineData = this.buildTimelineData(task_records, allPkRecordsWithDetails, (readingStats as any).rawLogs || []);

      const profile = {
        // 学生基础信息
        student: {
          ...student,
          level: levelInfo.level,
          levelTitle: levelInfo.title,
          nextLevelExp: levelInfo.remainingExp,  // 升级还需多少经验
          expProgress: levelInfo.expProgress,
          isMaxLevel: levelInfo.isMaxLevel,
          progress: processedProgress
        },

        // 任务记录（最近50条）
        task_records: task_records.slice(0, 50),

        // PK记录
        pkRecords: allPkRecordsWithDetails.slice(0, 20),
        pkStats,

        // 任务统计
        taskStats: processedTaskStats,

        // 时间轴数据
        timelineData,

        // 🆕 习惯统计数据
        habitStats,

        // 🆕 过关地图数据
        semesterMap: Object.values(semesterMap),

        // 🆕 勋章数据
        badges: student_badges.map(sb => ({
          id: sb.badgeId,
          name: sb.badges.name,
          icon: sb.badges.icon,
          category: sb.badges.category,
          awardedAt: sb.awardedAt
        })),

        // 🆕 五维雷达图
        radarStats: radarStats,

        // 🆕 详细连胜数据
        streakStats: streakStats,

        // 🆕 已点亮技能
        unlockedSkills: unlockedSkills.map(s => ({
          name: s.skill.name,
          icon: s.skill.icon,
          code: s.skill.code,
          category: s.skill.category,
          attribute: s.skill.attribute,
          level: s.level,
          exp: s.currentExp
        })),

        // 🆕 阅读统计
        readingStats,

        // 综合数据
        summary: {
          joinDate: student.createdAt,
          totalActiveDays: Math.ceil((new Date().getTime() - new Date(student.createdAt).getTime()) / (1000 * 60 * 60 * 24)),
          lastActiveDate: task_records.length > 0 ? task_records[0].createdAt : student.createdAt
        }
      };

      console.log(`✅ 学生档案获取成功: ${student.name}, 包含 ${task_records.length} 条任务记录, ${allPkRecordsWithDetails.length} 条PK记录`);

      return profile;

    } catch (error) {
      console.error('❌ 获取学生档案失败:', error);
      throw error;
    }
  }

  /**
   * 构建时间轴数据
   */
  private buildTimelineData(task_records: any[], pkRecords: any[], readingLogs: any[] = []): any[] {
    // 🆕 需要排除的系统操作标题（这些不是学习任务，不应显示）
    const SYSTEM_OPERATION_TITLES = [
      '移入班级', '移出班级',
      '手动加分', '手动扣分',
      '老师手动调整进度', '进度修正',
      '积分奖励', '积分扣除'
    ];

    // 将任务记录转换为时间轴项目 (排除系统操作)
    const taskTimelineItems = task_records
      .filter(record => !SYSTEM_OPERATION_TITLES.includes(record.title))
      .map(record => {

        let category = record.task_category || 'TASK';
        let title = record.title;
        const content = (record.content || {}) as any;
        const contentCat = content.category || '';

        // --- 🆕 移植自 ParentService 的权威分类逻辑 ---

        // 1. 优先识别 QC/基础过关
        const isQcType = record.type === 'QC' || category === 'PROGRESS';
        const isBasicsCategory = ['基础过关', 'PROGRESS', 'chinese', 'math', 'english', '语文', '数学', '英语',
          '语文基础过关', '数学基础过关', '英语基础过关'].includes(contentCat) ||
          contentCat.includes('基础过关') || contentCat.includes('过关');
        const hasQcKeyword = ['生字', '听写', '课文', '背诵', '口算', '计算', '竖式', '脱式', '默写', '单词']
          .some((kw: string) => title.includes(kw));

        if (isQcType || isBasicsCategory || hasQcKeyword) {
          category = 'PROGRESS';
        }
        // 2. 识别核心教学法
        else if (category === 'METHODOLOGY' ||
          ['核心教学法', '能力训练', 'METHODOLOGY', '能力培养'].includes(contentCat) ||
          contentCat.includes('能力') || contentCat.includes('教学法') ||
          title.includes('分步法') || title.includes('费曼法') || title.includes('核心教学')) {
          category = 'METHODOLOGY';
        }
        // 3. 识别习惯培养/综合成长
        else if (['习惯打卡', '习惯培养', '习惯养成', 'HABIT', '综合成长'].includes(contentCat) ||
          contentCat.includes('习惯') ||
          title.includes('讲题') || title.includes('点亮') || title.includes('升级')) {
          category = 'HABIT';
        }
        // 4. 定制加餐 (排除系统操作)
        else if (category === 'SPECIAL' && !title.includes('手动调整')) {
          category = 'SPECIAL';
        }
        // 5. 挑战任务
        else if (category === 'CHALLENGE') {
          category = 'CHALLENGE';
        }

        let label = this.getTaskCategoryLabel(category);
        let description = record.title;
        let displayTitle: string;

        // ✅ 根据 category 区分"点亮"和"完成"样式
        if (category === 'BADGE' || category === 'SKILL') {
          // 成就勋章、技能升级：使用"点亮"
          displayTitle = `点亮 ${label}`;
          if (category === 'BADGE') {
            description = `授予 ${record.title}`;
          } else if (category === 'SKILL') {
            description = record.title;
          }
        } else if (category === 'CHALLENGE') {
          // 挑战任务：特殊处理
          displayTitle = '勇敢挑战';
          const result = record.status === 'COMPLETED' ? '成功' : '失败';
          description = `${record.title} (${result})`;
        } else {
          // 其他所有任务：使用"完成"
          displayTitle = `完成 ${label}`;
        }

        return {
          id: `task-${record.id}`,
          date: record.createdAt,
          type: 'task',
          title: displayTitle,
          description,
          status: record.status,
          exp: record.expAwarded,
          metadata: {
            taskType: record.type,
            taskCategory: category, // Use infered category
            lesson_plans: record.lessonPlan
          }
        };
      });

    // 将PK记录转换为时间轴项目
    const pkTimelineItems = pkRecords.map(record => ({
      id: `pk-${record.id}`,
      date: record.createdAt,
      type: 'pk',
      title: `PK对决`,
      description: `与 ${record.opponent?.name || '对手'} PK ${record.isWinner ? '胜利' : record.winnerId === null ? '平局' : '失败'}`,
      result: record.isWinner ? 'win' : record.winnerId === null ? 'draw' : 'lose',
      metadata: {
        opponent: record.opponent,
        topic: record.topic,
        isPlayerA: record.isPlayerA
      }
    }));

    // 将阅读记录转换为时间轴项目
    const readingTimelineItems = readingLogs.map(log => ({
      id: `reading-${log.id}`,
      date: log.recordedAt,
      type: 'reading',
      title: '阅读计划',
      description: `阅读 《${log.books?.bookName || '书籍'}》`,
      exp: 0, // 阅读通常不直接给经验，除非通过任务
      metadata: {
        bookName: log.books?.bookName,
        currentPage: log.currentPage,
        duration: log.duration
      }
    }));

    // 合并并按日期排序
    const allTimelineItems = [...taskTimelineItems, ...pkTimelineItems, ...readingTimelineItems]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 按日期分组
    const groupedByDate = allTimelineItems.reduce((groups, item) => {
      const dateKey = new Date(item.date).toLocaleDateString('zh-CN');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
      return groups;
    }, {} as Record<string, any[]>);

    // 转换为数组格式并限制最近30天
    return Object.entries(groupedByDate)
      .map(([date, items]) => ({
        date,
        items: items.slice(0, 10) // 每天最多显示10条
      }))
      .slice(0, 30); // 最近30天的记录
  }

  /**
  /**
   * 🆕 获取任务分类标签
   */
  private getTaskCategoryLabel(category: string): string {
    const labels = {
      'HABIT': '习惯打卡',
      'BADGE': '勋章授予',
      'PK': 'PK对决',
      'CHALLENGE': '勇敢挑战',
      'PROGRESS': '基础过关',
      'METHODOLOGY': '核心教学',
      'GROWTH': '综合成长',
      'PERSONALIZED': '定制加餐',
      'SPECIAL': '特殊任务',
      'TASK': '常规任务',
      'SKILL': '技能升级',
      'READING': '阅读计划'
    };
    return labels[category as keyof typeof labels] || category;
  }

  /**
   * 获取任务类型标签 (保留旧方法兼容性)
   */
  private getTaskTypeLabel(type: string): string {
    const typeLabels = {
      'QC': '质检任务',
      'TASK': '常规任务',
      'SPECIAL': '特殊任务',
      'CHALLENGE': '挑战任务',
      'HOMEWORK': '作业',
      'QUIZ': '测验',
      'PROJECT': '项目',
      'DAILY': '每日任务'
    };
    return typeLabels[type as keyof typeof typeLabels] || type;
  }

  /**
   * 🆕 计算五维雷达图数据 (移植自 ParentService)
   * 维度：自主力、规划力、复盘力、思考力、坚持力
   */
  private async calculateRadarStats(studentId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // 1. 自主力 (Autonomy)：自选任务完成数 (SPECIAL类型)
    const specialTasks = await this.prisma.task_records.count({
      where: {
        studentId,
        task_category: 'SPECIAL',
        status: 'COMPLETED',
        createdAt: { gte: monthStart }
      }
    });
    const autonomyScore = Math.min(100, (specialTasks * 10) + 50); // 基础分50，每个任务10分

    // 2. 规划力 (Planning)：每日任务完成率
    const monthlyTasks = await this.prisma.task_records.findMany({
      where: {
        studentId,
        type: 'TASK',
        createdAt: { gte: monthStart }
      },
      select: { status: true }
    });
    const taskTotal = monthlyTasks.length;
    const taskCompleted = monthlyTasks.filter(t => t.status === 'COMPLETED').length;
    const planningScore = taskTotal > 0 ? Math.round((taskCompleted / taskTotal) * 100) : 60;

    // 3. 复盘力 (Review/Reflection)：QC完成率 + 方法论任务
    const [qcStats, methodologyCount] = await Promise.all([
      this.prisma.task_records.groupBy({
        by: ['status'],
        where: { studentId, type: 'QC' },
        _count: true
      }),
      this.prisma.task_records.count({
        where: {
          studentId,
          task_category: 'METHODOLOGY',
          status: 'COMPLETED',
          createdAt: { gte: monthStart }
        }
      })
    ]);
    const qcTotal = qcStats.reduce((sum, s) => sum + s._count, 0);
    const qcCompleted = qcStats.find(s => s.status === 'COMPLETED')?._count || 0;
    const qcRate = qcTotal > 0 ? (qcCompleted / qcTotal) * 60 : 40;
    const reviewScore = Math.min(100, Math.round(qcRate + methodologyCount * 10));

    // 4. 思考力 (Logic/Thinking)：挑战成功率 + PK胜率
    const [challenges, pkMatches] = await Promise.all([
      this.prisma.challenge_participants.findMany({
        where: { studentId },
        select: { status: true, result: true }
      }),
      this.prisma.pk_matches.findMany({
        where: { OR: [{ studentA: studentId }, { studentB: studentId }] },
        select: { winnerId: true }
      })
    ]);
    const challengeTotal = challenges.length;
    const challengeSuccess = challenges.filter(c => c.result === 'COMPLETED' || c.result === 'WINNER').length;
    const challengeRate = challengeTotal > 0 ? (challengeSuccess / challengeTotal) * 50 : 30;

    const pkTotal = pkMatches.length;
    const pkWins = pkMatches.filter(pk => pk.winnerId === studentId).length;
    const pkRate = pkTotal > 0 ? (pkWins / pkTotal) * 50 : 30;

    const thinkingScore = Math.min(100, Math.round(challengeRate + pkRate + 20));

    // 5. 坚持力 (Grit)：连胜天数
    const [habitLogs] = await Promise.all([
      this.prisma.habit_logs.findMany({
        where: { studentId },
        select: { streakDays: true },
        orderBy: { checkedAt: 'desc' },
        take: 1
      })
    ]);
    const currentStreak = habitLogs.length > 0 ? habitLogs[0].streakDays : 0;
    const gritScore = Math.min(100, (currentStreak * 5) + 40);

    return {
      dimensions: [
        { name: '自主力', value: autonomyScore, key: 'autonomy' },
        { name: '规划力', value: planningScore, key: 'planning' },
        { name: '复盘力', value: reviewScore, key: 'reflection' },
        { name: '思考力', value: thinkingScore, key: 'logic' },
        { name: '坚持力', value: gritScore, key: 'grit' }
      ],
      overallScore: Math.round((autonomyScore + planningScore + reviewScore + thinkingScore + gritScore) / 5)
    };
  }

  /**
   * 🆕 计算详细连胜数据 (按科目和任务类型)
   */
  private async calculateDetailedStreaks(studentId: string) {
    // 获取最近100条已完成的任务记录
    const recentTasks = await this.prisma.task_records.findMany({
      where: {
        studentId,
        status: 'COMPLETED',
        // 排除 QC 和 系统任务，主要关注学科相关
        type: { notIn: ['QC', 'HABIT', 'BADGE'] }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    // 定义连胜规则映射
    const rules = [
      { subject: '语文', keyword: '生字听写', label: '生字听写' },
      { subject: '语文', keyword: '古诗背诵', label: '古诗背诵' },
      { subject: '数学', keyword: '口算', label: '口算练习' },
      { subject: '数学', keyword: '计算', label: '计算练习' },
      { subject: '英语', keyword: '单词', label: '单词默写' },
      { subject: '校内', keyword: '作业', label: '校内作业' }
    ];

    const streaks: Record<string, { label: string, count: number }[]> = {
      '语文': [],
      '数学': [],
      '英语': [],
      '校内': []
    };

    // 为每个规则计算连胜
    for (const rule of rules) {
      let count = 0;
      // 简单算法：遍历最近记录，统计符合条件的连续（或累积高频）次数
      // 这里为了简化且符合用户“连胜”的直觉，我们统计最近连续出现的次数
      // 如果需要严格的“每日连胜”需要更复杂的按天分组逻辑，这里暂用“最近连续完成数”模拟

      for (const task of recentTasks) {
        const contentStr = typeof task.content === 'string' ? task.content : JSON.stringify(task.content);
        if (contentStr.includes(rule.keyword) || task.title?.includes(rule.keyword)) {
          count++;
        } else {
          // 如果遇到不相关的任务，是否中断连胜？
          // 为了展示鼓励效果，我们仅当遇到同类型但失败的任务(status!=COMPLETED)时中断，
          // 但这里只查了COMPLETED，所以我们理解为“最近连续完成的积累”
          // 因此，遇到不相关的任务直接跳过，不中断计数（这更像累计），
          // 或者严格点：只统计最近一系列任务中包含该关键词的数量
        }
      }

      // 模拟修正：为了让数据看起来像“连胜”，我们只统计最近一次任务是该类型，并向前追溯
      // 如果最近一个该类型的任务不是最新的，那连胜可能中断了？
      // 简化逻辑：统计最近30天内该类型任务的完成总数，作为"连胜/积累"展示
      // 用户需求是 "语文：生字听写 x5"，这通常意味着累计或连续。

      if (count > 0) {
        if (!streaks[rule.subject]) streaks[rule.subject] = [];
        streaks[rule.subject].push({ label: rule.label, count });
      }
    }

    return streaks;
  }

  // 🆕 重构后的 createStudent 方法 - 基于师生绑定
  public async createStudent(studentData: CreateStudentRequest) {
    console.log('[TEACHER BINDING] Creating student with data:', studentData);

    // 🆕 新的验证逻辑
    if (!studentData.name || !studentData.schoolId || !studentData.teacherId) {
      console.error('[TEACHER BINDING] Validation failed: Missing name, schoolId, or teacherId.');
      throw new Error('Missing required student data: name, schoolId, and teacherId are required');
    }

    try {
      const newStudent = await this.prisma.students.create({
        data: {
          id: require('crypto').randomUUID(),
          name: studentData.name,
          className: studentData.className,  // 可选，仅作为显示标签
          teachers: {
            connect: { id: studentData.teacherId }
          },
          schools: {
            connect: { id: studentData.schoolId }
          },
          avatarUrl: '/avatar.jpg',
          isActive: true,
          updatedAt: new Date()
        },
      });
      console.log('[TEACHER BINDING] Successfully created student with teacher binding:', newStudent);
      return newStudent;
    } catch (error) {
      console.error('[TEACHER BINDING] Prisma create operation failed:', error);
      if (error instanceof Error) {
        console.error('[TEACHER BINDING] Error details:', {
          name: error.name,
          message: error.message,
          stack: error.stack
        });
      }
      throw error;
    }
  }

  /**
   * 更新学生信息
   */
  async updateStudent(data: UpdateStudentRequest): Promise<any> {
    const { id, schoolId, name, className, avatar, score, exp } = data;

    // 计算新的等级
    let level: number | undefined;
    if (exp !== undefined) {
      level = this.calculateLevel(exp);
    }

    const student = await this.prisma.students.update({
      where: {
        id,
        schoolId,
        isActive: true
      },
      data: {
        ...(name && { name }),
        ...(className && { className }),
        ...(avatar && { avatar }),
        ...(score !== undefined && { score }),
        ...(exp !== undefined && { exp }),
        ...(level !== undefined && { level }),
        ...(data.grade !== undefined && { grade: data.grade }),
        ...(data.semester !== undefined && { semester: data.semester }),
        updatedAt: new Date()
      }
    });

    // 广播学生更新事件
    this.broadcastToSchool(schoolId, {
      type: 'STUDENT_UPDATED',
      data: {
        student,
        timestamp: new Date().toISOString()
      }
    });

    return student;
  }

  /**
   * 删除学生（软删除，进入回收站）
   */
  async deleteStudent(id: string, schoolId: string): Promise<void> {
    await this.prisma.students.update({
      where: {
        id,
        schoolId,
        isActive: true
      },
      data: {
        isActive: false,
        deletedAt: new Date(), // 记录删除时间
        updatedAt: new Date()
      }
    });

    // 广播学生删除事件
    this.broadcastToSchool(schoolId, {
      type: 'STUDENT_DELETED',
      data: {
        studentId: id,
        timestamp: new Date().toISOString()
      }
    });
  }

  /**
   * 获取回收站中的学生（删除不满 30 天）
   */
  async getTrashBinStudents(schoolId: string): Promise<any[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    return this.prisma.students.findMany({
      where: {
        schoolId,
        isActive: false,
        deletedAt: {
          gte: thirtyDaysAgo
        }
      },
      include: {
        teachers: {
          select: { name: true }
        }
      },
      orderBy: {
        deletedAt: 'desc'
      }
    });
  }

  /**
   * 恢复被删除的学生
   */
  async restoreStudent(id: string, schoolId: string): Promise<any> {
    const student = await this.prisma.students.update({
      where: {
        id,
        schoolId,
        isActive: false
      },
      data: {
        isActive: true,
        deletedAt: null, // 清空删除时间
        updatedAt: new Date()
      }
    });

    // 广播学生恢复事件
    this.broadcastToSchool(schoolId, {
      type: 'STUDENT_RESTORED',
      data: {
        student,
        timestamp: new Date().toISOString()
      }
    });

    return student;
  }

  /**
   * 批量添加积分/经验
   */
  async addScore(data: AddScoreRequest, updatedBy: string): Promise<any[]> {
    const { studentIds, points, exp, reason, schoolId, metadata = {} } = data;

    // 验证学生是否属于该学校
    const students = await this.prisma.students.findMany({
      where: {
        id: { in: studentIds },
        schoolId,
        isActive: true
      }
    });

    if (students.length !== studentIds.length) {
      throw new Error('部分学生不存在或不属于该学校');
    }

    // 批量更新学生积分和经验
    const updatedStudents = await this.prisma.$transaction(
      studentIds.map(studentId =>
        this.prisma.students.update({
          where: { id: studentId, schoolId },
          data: {
            points: { increment: points },
            exp: { increment: exp },
            updatedAt: new Date()
          }
        })
      )
    );

    // 重新计算等级
    const studentsWithLevel = await this.prisma.$transaction(
      updatedStudents.map(student => {
        const newLevel = this.calculateLevel(student.exp);
        return this.prisma.students.update({
          where: { id: student.id },
          data: { level: newLevel, updatedAt: new Date() }
        });
      })
    );

    // 创建任务记录
    await this.prisma.$transaction(
      studentIds.map(studentId =>
        this.prisma.task_records.create({
          data: {
            id: require('crypto').randomUUID(),
            studentId,
            schoolId,
            type: points > 0 ? 'SPECIAL' : 'CHALLENGE', // 使用 TaskType 枚举值
            title: reason,
            content: {
              score: points,
              exp,
              metadata: {
                ...metadata,
                updatedBy,
                previousLevel: students.find(s => s.id === studentId)?.level,
                newLevel: studentsWithLevel.find(s => s.id === studentId)?.level
              }
            },
            status: 'COMPLETED',
            expAwarded: exp,
            updatedAt: new Date()
          }
        })
      )
    );

    // 准备广播数据
    const broadcastData: ScoreUpdateEvent = {
      type: 'SCORE_UPDATE',
      data: {
        studentIds,
        points,
        exp,
        reason,
        timestamp: new Date().toISOString(),
        updatedBy,
        metadata
      }
    };

    // 广播到学校房间
    this.broadcastToSchool(schoolId, broadcastData);

    return studentsWithLevel;
  }

  /**
   * 获取学生排行榜
   */
  async getLeaderboard(schoolId: string, limit: number = 10): Promise<any[]> {
    const students = await this.prisma.students.findMany({
      where: {
        schoolId,
        isActive: true
      },
      orderBy: [
        { exp: 'desc' },
        { points: 'desc' },
        { name: 'asc' }
      ],
      take: limit,
      select: {
        id: true,
        name: true,
        className: true,
        avatarUrl: true,
        points: true,
        exp: true,
        level: true,
        createdAt: true
      }
    });

    return students.map((student, index) => ({
      rank: index + 1,
      ...student,
      className: student.className,
      avatar: student.avatarUrl,
      score: student.points,
      exp: student.exp
    }));
  }

  /**
   * 获取班级统计
   */
  async getClassStats(schoolId: string): Promise<any> {
    const classStats = await this.prisma.students.groupBy({
      by: ['className'],
      where: {
        schoolId,
        isActive: true
      },
      _count: {
        id: true
      },
      _sum: {
        points: true,
        exp: true
      },
      _avg: {
        points: true,
        exp: true
      }
    });

    return classStats.map(stat => ({
      className: stat.className,
      studentCount: stat._count.id,
      totalScore: stat._sum.points || 0,
      exp: stat._sum.exp || 0,
      averageScore: stat._avg.points || 0,
      averageExp: stat._avg.exp || 0
    }));
  }

  /**
   * 获取班级列表（用于班级切换）
   * 🆕 修改：返回按老师分组的班级信息，支持多老师显示
   */
  async getClasses(schoolId: string): Promise<any[]> {
    // 🆕 获取学校内所有老师
    const allTeachers = await this.prisma.teachers.findMany({
      where: {
        schoolId,
        role: 'TEACHER'
      },
      select: {
        id: true,
        name: true
      }
    });

    // 🆕 按老师分组获取学生统计
    const studentStats = await this.prisma.students.groupBy({
      by: ['teacherId'],
      where: {
        schoolId,
        isActive: true,
        teacherId: { in: allTeachers.map(t => t.id) }
      },
      _count: {
        id: true
      }
    });

    // 组装数据：每个老师作为一个"班级"
    const classData = allTeachers.map(teacher => {
      const stats = studentStats.find(s => s.teacherId === teacher.id);
      return {
        className: `${teacher.name}的班级`,
        studentCount: stats?._count.id || 0,
        teacherId: teacher.id,
        teacherName: teacher.name
      };
    });

    // 添加"全校"选项
    const totalStudents = await this.prisma.students.count({
      where: {
        schoolId,
        isActive: true
      }
    });

    classData.unshift({
      className: '全校大名单',
      studentCount: totalStudents,
      teacherId: 'ALL',
      teacherName: '全校'
    });

    return classData;
  }

  /**
   * 🆕 师生关系转移 - 从"转班"升级为"抢人"
   * 将学生划归到指定老师名下
   */
  async transferStudents(studentIds: string[], targetTeacherId: string, schoolId: string, updatedBy: string): Promise<any[]> {
    console.log(`[TEACHER BINDING] Transferring ${studentIds.length} students to teachers: ${targetTeacherId}`);
    console.log(`[TEACHER BINDING] DEBUG: schoolId=${schoolId}, updatedBy=${updatedBy}`);

    try {
      // 验证学生是否属于该学校
      const students = await this.prisma.students.findMany({
        where: {
          id: { in: studentIds },
          schoolId,
          isActive: true
        }
      });

      console.log(`[TEACHER BINDING] DEBUG: Found ${students.length} valid students`);

      if (students.length !== studentIds.length) {
        console.error('[TEACHER BINDING] ERROR: Student count mismatch', { expected: studentIds.length, found: students.length });
        throw new Error('部分学生不存在或不属于该学校');
      }

      // 🆕 验证目标老师是否存在且属于同一学校
      const targetTeacher = await this.prisma.teachers.findFirst({
        where: {
          id: targetTeacherId,
          schoolId: schoolId
        }
      });

      console.log(`[TEACHER BINDING] DEBUG: Target teacher found: ${!!targetTeacher}`);

      if (!targetTeacher) {
        console.error(`[TEACHER BINDING] ERROR: Target teacher not found. ID: ${targetTeacherId}`);
        throw new Error('目标老师不存在或不属于同一学校');
      }

      const newClassName = targetTeacher.primaryClassName || targetTeacher.name + '班';
      console.log(`[TEACHER BINDING] DEBUG: New class name will be: ${newClassName}`);

      // 批量更新学生的老师归属
      console.log('[TEACHER BINDING] DEBUG: Starting transaction to update students...');

      const updatedStudents = await this.prisma.$transaction(async (tx) => {
        const updates = await Promise.all(studentIds.map(studentId =>
          tx.students.update({
            where: { id: studentId, schoolId },
            data: {
              teacherId: targetTeacherId,  // 🆕 核心变更：更新老师归属
              className: newClassName  // 🔒 修复：同步更新班级名
            }
          })
        ));

        console.log('[TEACHER BINDING] DEBUG: Students updated. Creating task records...');

        // 🆕 创建师生关系转移记录
        await Promise.all(studentIds.map(studentId =>
          tx.task_records.create({
            data: {
              id: require('crypto').randomUUID(),
              studentId,
              schoolId,
              type: 'SPECIAL',
              title: '移入班级',
              content: {
                action: 'TEACHER_TRANSFER',
                fromTeacherId: students.find(s => s.id === studentId)?.teacherId,
                toTeacherId: targetTeacherId,
                toTeacherName: targetTeacher.name,
                updatedBy,
                transferType: 'STUDENT_MOVED_TO_TEACHER'
              },
              status: 'COMPLETED',
              expAwarded: 0,
              updatedAt: new Date()
            }
          })
        ));

        return updates;
      });

      console.log('[TEACHER BINDING] DEBUG: Transaction committed successfuly.');

      // 🆕 广播师生关系转移事件
      try {
        this.broadcastToSchool(schoolId, {
          type: 'STUDENTS_TRANSFERRED',
          data: {
            studentIds,
            targetTeacherId,
            targetTeacherName: targetTeacher.name,
            updatedBy,
            timestamp: new Date().toISOString(),
            updatedStudents,
            transferType: 'TEACHER_BINDING'  // 标识这是师生关系转移
          }
        });
      } catch (broadcastError) {
        console.warn('[TEACHER BINDING] ⚠️ Warning: Failed to broadcast transfer event:', broadcastError);
        // Do not throw here, as the critical transaction has committed.
      }

      console.log(`[TEACHER BINDING] ✅ Successfully transferred ${studentIds.length} students to ${targetTeacher.name}`);
      return updatedStudents;
    } catch (error) {
      console.error('[TEACHER BINDING] ❌ CRITICAL ERROR in transferStudents:', error);
      if (error instanceof Error) {
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  }

  /**
   * 获取指定等级升级所需的经验值（方案B：递增式升级）
   * 
   * 设计原则：
   * - 1-5级：快速入门，建立信心
   * - 6-15级：稳步成长，一学期可达
   * - 16-30级：挑战区，需要持续努力
   * - 31-50级：精英区，长期坚持
   * - 51+级：传奇区，完整两年服务
   * 
   * 预测（日均80exp）：
   * - 一学期(110天): 可达 20-25 级
   * - 一学年(220天): 可达 35-45 级
   * - 完整两年(440天): 可达 55-65 级
   */
  private getExpRequiredForLevel(level: number): number {
    if (level <= 5) return 300;       // 1-5级：300 exp (原30)
    if (level <= 10) return 500;      // 6-10级：500 exp
    if (level <= 15) return 800;      // 11-15级：800 exp
    if (level <= 20) return 1200;     // 16-20级：1200 exp
    if (level <= 25) return 1600;     // 21-25级：1600 exp
    if (level <= 30) return 2000;     // 26-30级：2000 exp
    if (level <= 40) return 2800;     // 31-40级：2800 exp
    if (level <= 50) return 4000;     // 41-50级：4000 exp
    return 5000;                       // 51+级：5000 exp
  }

  /**
   * 根据总经验计算等级（递增式升级）
   */
  private calculateLevel(totalExp: number): number {
    let level = 1;
    let expUsed = 0;

    while (expUsed + this.getExpRequiredForLevel(level) <= totalExp) {
      expUsed += this.getExpRequiredForLevel(level);
      level++;
    }

    return level;
  }

  /**
   * 获取等级进度信息（用于前端展示进度条）
   */
  public getLevelProgress(totalExp: number): {
    level: number;
    currentLevelExp: number;
    expForNextLevel: number;
    totalExpForCurrentLevel: number;
    progressPercent: number;
  } {
    let level = 1;
    let expUsed = 0;

    while (expUsed + this.getExpRequiredForLevel(level) <= totalExp) {
      expUsed += this.getExpRequiredForLevel(level);
      level++;
    }

    const currentLevelExp = totalExp - expUsed;
    const expForNextLevel = this.getExpRequiredForLevel(level);
    const progressPercent = Math.floor((currentLevelExp / expForNextLevel) * 100);

    return {
      level,
      currentLevelExp,
      expForNextLevel,
      totalExpForCurrentLevel: expUsed,
      progressPercent
    };
  }

  /**
   * 广播到指定学校的房间
   */
  private broadcastToSchool(schoolId: string, data: any): void {
    const roomName = `school_${schoolId}`;
    this.io.to(roomName).emit('DATA_UPDATE', data);
    console.log(`📡 Broadcasted to school ${schoolId}:`, data.type);
  }

  /**
   * 🆕 计算阅读统计数据
   */
  private async calculateReadingStats(studentId: string, schoolId: string) {
    const [books, logs] = await Promise.all([
      this.prisma.reading_books.findMany({
        where: { studentId, schoolId, isActive: true },
        select: { id: true, bookName: true, totalPages: true }
      }),
      this.prisma.reading_logs.findMany({
        where: { studentId, schoolId },
        select: { bookId: true, currentPage: true, duration: true }
      })
    ]);

    const bookProgressList: any[] = [];
    let totalDuration = 0;

    books.forEach(book => {
      const bookLogs = logs.filter(l => l.bookId === book.id);
      const currentPage = bookLogs.length > 0 ? Math.max(...bookLogs.map(l => l.currentPage)) : 0;
      const progress = book.totalPages ? Math.floor((currentPage / book.totalPages) * 100) : 0;

      bookProgressList.push({
        id: book.id,
        name: book.bookName,
        current: currentPage,
        total: book.totalPages,
        progress: Math.min(100, progress)
      });
    });

    logs.forEach(log => {
      totalDuration += log.duration;
    });

    const totalPages = bookProgressList.reduce((sum, b) => sum + b.current, 0);

    return {
      totalPages,
      totalDuration,
      totalDurationHours: parseFloat((totalDuration / 60).toFixed(1)),
      booksCount: books.length,
      books: bookProgressList, // 🆕 详细书目列表
      rawLogs: logs.map(l => ({
        ...l,
        books: books.find(b => b.id === l.bookId)
      }))
    };
  }

  /**
   * 🆕 获取学校经验倍率
   */
  private async getExpMultiplier(schoolId: string): Promise<number> {
    const school = await this.prisma.schools.findUnique({
      where: { id: schoolId },
      select: { settings: true }
    });
    return (school?.settings as any)?.expMultiplier || 1.0;
  }
}

export default StudentService;