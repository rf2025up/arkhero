import { Router, Request, Response } from 'express';
import { LMSService } from '../services/lms.service';
import AuthService from '../services/auth.service';
import { authenticateToken } from '../middleware/auth.middleware';
import CurriculumService from '../services/curriculum.service';

/**
 * 任务记录路由 (V5.0) - 复用 LMSService 逻辑
 */
export class RecordsRoutes {
  private router: Router;

  constructor(
    private lmsService: LMSService,
    private authService: AuthService
  ) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    // 应用认证中间件
    this.router.use(authenticateToken(this.authService));

    // 获取所有记录 (临时返回空)
    this.router.get('/', async (req, res) => {
      res.json({ success: true, data: [], message: '记录数据获取成功' });
    });

    // 🆕 创建单条任务记录 (增量添加)
    this.router.post('/', async (req, res) => {
      try {
        const { studentId, title, category, subcategory, exp, type = 'QC', courseInfo } = req.body;
        const user = (req as any).user;

        console.log(`🆕 [RECORDS] POST / - title=${title}, category=${category}, subcategory=${subcategory}, hasCourseInfo=${!!courseInfo}`);

        if (!studentId || !title || !category) {
          return res.status(400).json({ success: false, message: '缺失必要字段' });
        }

        const record = await this.lmsService.createSingleTaskRecord({
          schoolId: user.schoolId,
          studentId,
          type: type as any,
          title,
          category,
          subcategory: subcategory || '',  // 🆕 传递分类标题
          exp,
          courseInfo,  // 🆕 传递课程进度信息
          isOverridden: true
        });

        res.status(201).json({ success: true, data: record, message: '任务创建成功' });
      } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // 处理记录状态更新
    this.router.patch('/:recordId/status', async (req, res) => {
      try {
        const { recordId } = req.params;
        const { status, isPerfect } = req.body; // 🆕 获取完美标记
        const user = (req as any).user;

        const result = await this.lmsService.updateMultipleRecordStatus(
          user.schoolId,
          [recordId],
          status,
          user.userId,
          undefined, // courseInfo
          isPerfect  // 🆕 传递完美标记
        );

        res.json({ success: result.count > 0, data: result });
      } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // 🆕 老师手动覆盖学生进度 (最高权限)
    this.router.post('/progress-override', async (req, res) => {
      try {
        const { studentId, schoolId, teacherId, courseInfo } = req.body;
        console.log(`🚀 [RECORDS] progress-override - studentId=${studentId}, teacherId=${teacherId}`);

        if (!studentId || !schoolId || !teacherId || !courseInfo) {
          return res.status(400).json({ success: false, message: '缺失必要字段: studentId, schoolId, teacherId 或 courseInfo' });
        }

        const record = await this.lmsService.updateStudentProgress(schoolId, studentId, teacherId, courseInfo);

        res.status(201).json({ success: true, data: record, message: '学生进度已成功修正' });
      } catch (error: any) {
        console.error('❌ [RECORDS] progress-override 失败:', error);
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // 一键过关 (核心结算逻辑)
    this.router.patch('/student/:studentId/pass-all', async (req, res) => {
      try {
        const { studentId } = req.params;
        const { expBonus = 0, courseInfo } = req.body;
        const user = (req as any).user;

        const result = await this.lmsService.settleStudentTasks(user.schoolId, studentId, expBonus, courseInfo);

        res.json({
          success: true,
          message: `学生结算成功，获得 ${result.totalExpAwarded} 经验值`,
          data: result
        });
      } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
      }
    });

    // 🆕 获取学期大纲图谱 (用于前端渲染全学期底图)
    this.router.get('/curriculum/syllabus', async (req, res) => {
      try {
        const { subject, version, grade, semester } = req.query;
        const syllabus = CurriculumService.getSyllabus({
          subject: subject as string,
          version: version as string,
          grade: grade as string,
          semester: semester as string
        });
        res.json({ success: true, data: syllabus });
      } catch (error: any) {
        res.status(500).json({ success: false, message: error.message });
      }
    });
  }

  public getRoutes(): Router {
    return this.router;
  }
}