import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';
import prisma from './utils/prisma';
import { PrismaClient } from '@prisma/client';
import path from 'path';

// Services
import AuthService from './services/auth.service';
import StudentService from './services/student.service';
import { LMSService } from './services/lms.service';
import SocketService from './services/socket.service';
import HabitService from './services/habit.service';
import CheckinService from './services/checkin.service'; // Added
import ChallengeService from './services/challenge.service';
import PKMatchService from './services/pkmatch.service';
import BadgeService from './services/badge.service';
import { ReportService } from './services/report.service';
import SchoolService from './services/school.service';
import DashboardService from './services/dashboard.service';
import { PersonalizedTutoringService } from './services/personalized-tutoring.service';
import PlatformService from './services/platform.service';
import { RewardService } from './services/reward.service';
import { skillService } from './services/skill.service';
import { ReadingService } from './services/reading.service';
import { ParentService } from './services/parent.service';

// Routes
import AuthRoutes from './routes/auth.routes';
import StudentRoutes from './routes/student.routes';
import HabitRoutes from './routes/habit.routes';
import ChallengeRoutes from './routes/challenge.routes';
import PKMatchRoutes from './routes/pkmatch.routes';
import BadgeRoutes from './routes/badge.routes';
import { LMSRoutes } from './routes/lms.routes';
import { ReportRoutes } from './routes/report.routes';
import { UserRoutes } from './routes/user.routes';
import { MistakesRoutes } from './routes/mistakes.routes';
import { RecordsRoutes } from './routes/records.routes';
import SchoolRoutes from './routes/school.routes';
import DashboardRoutes from './routes/dashboard.routes';
import { PersonalizedTutoringRoutes } from './routes/personalized-tutoring.routes';
import { healthRoutes } from './routes/health.routes';
import { ParentRoutes } from './routes/parent.routes';
import CheckinRoutes from './routes/checkin.routes';
import PlatformRoutes from './routes/platform.routes';
import rewardRoutes from './routes/reward.routes';
import ReadingRoutes from './routes/reading.routes';  // 🆕 阅读计划路由
import SkillRoutes from './routes/skill.routes';  // 🆕 五维内功技能路由
import { StreakRoutes } from './routes/streak.routes';  // 🆕 连胜系统路由

// Middleware & Utils
import { errorHandler } from './middleware/errorHandler';
import { setupSocketHandlers } from './utils/socketHandlers';

// 加载环境变量
dotenv.config();

export class App {
  public app: express.Application;
  public server: any;
  public io: SocketIOServer;
  public prisma: PrismaClient;

  // Services
  public authService: AuthService;
  public studentService: StudentService;
  public socketService: SocketService;
  public habitService: HabitService;
  public checkinService: CheckinService;
  public challengeService: ChallengeService;
  public pkMatchService: PKMatchService;
  public badgeService: BadgeService;
  public lmsService: LMSService;
  public reportService: ReportService;
  public schoolService: SchoolService;
  public dashboardService: DashboardService;
  public tutoringService: PersonalizedTutoringService;
  public platformService: PlatformService;
  public rewardService: RewardService;
  public readingService: ReadingService;
  public parentService: ParentService;
  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.prisma = prisma;
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: "*",
        methods: ["GET", "POST", "PATCH"],
        credentials: true
      }
    });

    // 注入 IO 到 SkillService
    skillService.setSocket(this.io);

    // 1. 初始化所有单例服务
    this.authService = new AuthService(this.prisma);
    this.studentService = new StudentService(this.prisma, this.io);
    this.socketService = new SocketService(this.io, this.authService);
    this.habitService = new HabitService(this.prisma, this.io);
    this.checkinService = new CheckinService(this.prisma);
    this.challengeService = new ChallengeService(this.prisma, this.io);
    this.pkMatchService = new PKMatchService(this.prisma, this.io);
    this.badgeService = new BadgeService(this.prisma, this.io);
    this.rewardService = new RewardService(this.prisma);
    this.lmsService = new LMSService(this.prisma, this.rewardService, this.io);
    this.reportService = new ReportService(this.prisma);
    this.schoolService = new SchoolService(this.prisma);
    this.dashboardService = new DashboardService(this.prisma);
    this.tutoringService = new PersonalizedTutoringService(this.prisma);
    this.readingService = new ReadingService(this.prisma);
    this.parentService = new ParentService(this.prisma);
    this.platformService = new PlatformService(this.prisma);

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
    this.initializeSocketIO();
  }

  private initializeMiddlewares(): void {
    this.app.use(cors({
      origin: "*",
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true
    }));
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  private initializeRoutes(): void {
    // 兼容性设置
    this.app.set('io', this.io);
    this.app.set('prisma', this.prisma);
    this.app.set('authService', this.authService);

    // 挂载路由类
    this.app.use('/health', healthRoutes);

    this.app.use('/api/auth', new AuthRoutes(this.authService).getRoutes());
    this.app.use('/api/students', new StudentRoutes(this.studentService, this.authService).getRoutes());
    this.app.use('/api/habits', new HabitRoutes(this.habitService, this.authService).getRoutes());
    this.app.use('/api/challenges', new ChallengeRoutes(this.challengeService, this.authService).getRoutes());
    this.app.use('/api/pkmatches', new PKMatchRoutes(this.pkMatchService, this.authService).getRoutes());
    this.app.use('/api/badges', new BadgeRoutes(this.badgeService, this.authService).getRoutes());
    this.app.use('/api/users', new UserRoutes(this.authService, this.prisma).getRoutes());
    this.app.use('/api/reports', new ReportRoutes(this.reportService, this.authService, this.prisma).getRoutes());
    this.app.use('/api/lms', new LMSRoutes(this.lmsService, this.authService, this.prisma).getRoutes());
    this.app.use('/api/mistakes', new MistakesRoutes(this.authService, this.prisma).getRoutes());
    this.app.use('/api/records', new RecordsRoutes(this.lmsService, this.authService).getRoutes());

    // 边缘路由类化挂载
    this.app.use('/api/schools', new SchoolRoutes(this.schoolService, this.authService).getRoutes());
    this.app.use('/api/dashboard', new DashboardRoutes(this.dashboardService, this.authService).getRoutes());
    this.app.use('/api/platform', new PlatformRoutes(this.platformService, this.authService).getRoutes());
    this.app.use('/api/personalized-tutoring', new PersonalizedTutoringRoutes(this.tutoringService, this.authService).getRoutes());

    // 家长端路由
    this.app.use('/api/parent', new ParentRoutes(this.parentService).getRoutes());

    // 积分经验配置路由
    this.app.use('/api/reward', rewardRoutes);

    // 签到路由
    this.app.use('/api/checkins', new CheckinRoutes(this.checkinService, this.authService).getRoutes());

    // 🆕 阅读计划路由
    this.app.use('/api/reading', new ReadingRoutes(this.readingService, this.authService).getRoutes());

    // 🆕 五维内功技能路由
    this.app.use('/api/skill', new SkillRoutes(this.authService).getRoutes());

    // 🆕 连胜系统路由
    this.app.use('/api/streaks', new StreakRoutes(this.prisma).getRouter());

    // 静态文件与前端路由
    const clientPath = path.resolve(__dirname, '../../client/dist');
    this.app.use(express.static(clientPath));
    this.app.get('/debug-mobile', (req, res) => res.sendFile(path.join(__dirname, '../debug-mobile.html')));
    this.app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/socket.io/') || req.path === '/health') return next();
      res.sendFile(path.join(clientPath, 'index.html'));
    });

    this.app.use('/api/*', (req, res) => {
      res.status(404).json({ success: false, message: 'API endpoint not found', path: req.originalUrl, method: req.method });
    });
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  private initializeSocketIO(): void {
    this.socketService.initializeAuthentication();
    this.socketService.initializeConnectionHandlers();
    setupSocketHandlers(this.io);
    console.log('🔌 Socket.io 服务已初始化');
  }

  public async start(port: number = 3000): Promise<void> {
    try {
      await this.prisma.$connect();
      console.log('✅ Database connected successfully');
      this.server.listen(port, '0.0.0.0', () => {
        console.log(`🚀 ArkOK V2 Server running on port ${port}`);
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }

  /**
   * 停止服务（用于安全退出）
   */
  public async stop(): Promise<void> {
    try {
      if (this.server) {
        (this.server as any).close();
      }
      await this.prisma.$disconnect();
      console.log('✅ Server and database disconnected');
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
    }
  }
}

export default App;