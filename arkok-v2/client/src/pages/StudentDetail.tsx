import React, { useState, useEffect } from 'react';
import {
  Trophy, Medal, Swords, Check,
  Bot, Flame, Plus, ChevronRight, ChevronDown,
  Camera, Printer, AlertCircle, Calendar, Settings2,
  BookOpen, Filter, Circle, Sparkles, ArrowLeft, X, Share2, Award
} from 'lucide-react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/ProtectedRoute';
import { API } from '../services/api.service';
import apiService from '../services/api.service';
import { toast } from 'sonner';
import InviteCardModal from '../components/InviteCardModal';
import ParentBindingList from '../components/ParentBindingList';
import ReadingStatsCard from '../components/ReadingStatsCard';  // 🆕 阅读统计组件
import CheckinCalendarModal from '../components/CheckinCalendarModal';  // 🆕 签到日历弹窗

// 本周数据过滤工具函数（周一到周日）
const filterThisWeek = <T extends { created_at?: string; date?: string; createdAt?: string; awardedAt?: string }>(items: T[]): T[] => {
  const now = new Date();
  const currentDay = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  const monday = new Date(now);

  // 计算本周一的日期
  if (currentDay === 0) {
    // 如果是周日，本周一是前6天
    monday.setDate(now.getDate() - 6);
  } else {
    // 否则本周一是本周的第1天
    monday.setDate(now.getDate() - (currentDay - 1));
  }

  // 设置周一开始时间为 00:00:00
  monday.setHours(0, 0, 0, 0);

  // 计算本周日的日期（周一 + 6天）
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  // 设置周日结束时间为 23:59:59
  sunday.setHours(23, 59, 59, 999);

  return items.filter(item => {
    const dateToCheck = item.created_at || item.createdAt || item.date || item.awardedAt;
    if (!dateToCheck) return false;

    const itemDate = new Date(dateToCheck);
    return itemDate >= monday && itemDate <= sunday;
  });
};

// --- 模拟数据类型定义 ---
interface TimelineTask {
  id: string; // 🚀 修正为 string 以支持 UUID
  name: string;
  status: 'pending' | 'passed'; // pending=未过, passed=已过
  attempts: number;
  date?: string;
}

interface TimelineLesson {
  id: number;
  unit: number;
  lesson: number;
  title: string;
  status: 'done' | 'pending' | 'locked';
  tasks: TimelineTask[];
}

// V2 API 数据类型定义
interface TaskRecord {
  id: string;
  title: string;
  type: string;
  status: string;
  expAwarded: number;
  createdAt: string;
  content?: {
    attempts?: number;
    [key: string]: unknown;
  };
  lessonPlan?: Record<string, unknown>;
}

interface StudentProfile {
  student: {
    id: string;
    name: string;
    className: string;
    level: number;
    points: number;
    exp: number;
    totalExp: number;
    avatarUrl?: string;
    createdAt: string;
    progress?: {
      chinese?: { unit: string; lesson?: string; title: string };
      math?: { unit: string; lesson?: string; title: string };
      english?: { unit: string; title: string };
      source: string;
      updatedAt: string;
    };
    teachers?: {
      name: string;
    };
  };
  task_records: TaskRecord[];
  pkRecords: Array<{
    id: string;
    topic: string;
    opponent: {
      id: string;
      name: string;
      className: string;
    };
    isWinner: boolean;
    createdAt: string;
    playerA: any;
    playerB: any;
    isPlayerA: boolean;
  }>;
  pkStats: {
    totalMatches: number;
    wins: number;
    losses: number;
    draws: number;
    winRate: string;
  };
  taskStats: {
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    totalExp: number;
    qcTasks: number;
    specialTasks: number;
    challengeTasks: number;
  };
  timelineData: any[];
  habitStats: Array<{
    habit: {
      id: string;
      name: string;
      icon?: string;
      expReward: number;
    };
    stats: {
      totalCheckIns: number;
      currentStreak: number;
      checkedToday: boolean;
    };
  }>;
  semesterMap: Array<{
    unit: string;
    lesson: string;
    title: string;
    tasks: Array<{
      id: string;
      title: string;
      status: string;
      exp: number;
      attempts: number;
    }>;
  }>;
  summary: {
    joinDate: string;
    totalActiveDays: number;
    lastActiveDate: string;
  };
  badges: Array<{
    id: string;
    name: string;
    icon: string;
    category: string;
    awardedAt: string;
  }>;
}

interface SkillStats {
  reflection: number; // 红色：内省
  logic: number;      // 蓝色：逻辑
  autonomy: number;   // 黄色：自主
  planning: number;   // 绿色：规划
  grit: number;       // 橙色：毅力
  streak: number;
}

interface Skill {
  code: string;
  name: string;
  level: number;
  exp: number;
  unlockedAt: string;
}

const StudentDetail: React.FC = () => {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // 获取从上个页面传入的预加载数据 (如有)
  const initialStudentData = (location.state as any)?.studentData;

  // --- 1. 状态管理 ---
  const [activeTab, setActiveTab] = useState<'growth' | 'academic' | 'mistakes'>('academic');

  // 过关地图状态
  const [timelineSubject, setTimelineSubject] = useState<'chinese' | 'math' | 'english'>('chinese');
  const [showPendingOnly, setShowPendingOnly] = useState(false);
  const [expandedLessons, setExpandedLessons] = useState<Record<number, boolean>>({});

  // 习惯统计分页状态
  const [habitPage, setHabitPage] = useState(0);

  // 🆕 任务达人分页状态 (每页10条)
  const [taskPage, setTaskPage] = useState(0);

  // --- 2. 数据状态 ---
  const [isLoading, setIsLoading] = useState(!initialStudentData); // 如果没有预加载数据，则显示初始 Loading
  const [error, setError] = useState<string | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(initialStudentData ? {
    student: initialStudentData,
    task_records: [],
    pkRecords: [],
    pkStats: { totalMatches: 0, wins: 0, losses: 0, draws: 0, winRate: '0%' },
    taskStats: { totalTasks: 0, completedTasks: 0, pendingTasks: 0, totalExp: 0, qcTasks: 0, specialTasks: 0, challengeTasks: 0 },
    timelineData: [],
    habitStats: [],
    semesterMap: [],
    badges: [],
    summary: { joinDate: '', totalActiveDays: 0, lastActiveDate: '' }
  } : null);

  const [isDataFetching, setIsDataFetching] = useState(false); // 独立标记后端聚合数据是否正在加载

  // AI提示词生成器相关状态
  const [isGeneratingPrompt, setIsGeneratingPrompt] = useState(false);
  const [promptSuccess, setPromptSuccess] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [availableWeeks, setAvailableWeeks] = useState<any[]>([]);

  const [studentBadges, setStudentBadges] = useState<string[]>(['阅读之星', '运动达人', '助人为乐', '数学小能手', '语文之星']);

  // 邀请卡弹窗状态
  const [showInviteModal, setShowInviteModal] = useState(false);

  // 🆕 错题本状态
  const [mistakes, setMistakes] = useState<any[]>([]);
  const [mistakeSubject, setMistakeSubject] = useState<'chinese' | 'math' | 'english'>('math');
  const [showAddMistakeModal, setShowAddMistakeModal] = useState(false);
  const [newMistake, setNewMistake] = useState({ page: '', question: '', errorCause: '', unit: '1', lesson: '1', workbookType: '53天天练' });

  // 🆕 本月签到天数
  const [monthlyCheckinCount, setMonthlyCheckinCount] = useState<number>(0);
  // 🆕 签到日历弹窗状态
  const [showCheckinCalendar, setShowCheckinCalendar] = useState(false);

  // 🆕 五维技能属性
  const [skillStats, setSkillStats] = useState<SkillStats | null>(null);
  // 🆕 已解锁技能列表
  const [unlockedSkills, setUnlockedSkills] = useState<Skill[]>([]);
  const [skillPage, setSkillPage] = useState(0); // 🆕 技能分页
  // 🆕 连胜记录列表
  const [streakRecords, setStreakRecords] = useState<Array<{ category: string; categoryLabel: string; currentStreak: number; maxStreak: number }>>([]);
  const [streakPage, setStreakPage] = useState(0); // 🆕 连胜分页

  // --- 3. 派生状态 (SSOT) ---
  const student = studentProfile?.student;
  const studentName = student?.name || '未知学生';

  // A. 派生任务记录
  const allTaskRecords = React.useMemo(() => studentProfile?.task_records || [], [studentProfile]);

  const taskRecords = React.useMemo(() => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return allTaskRecords.filter(r => {
      const rDate = (r.content as any)?.taskDate || new Date(r.createdAt).toISOString().split('T')[0];
      return rDate === dateStr;
    });
  }, [allTaskRecords]);

  // B. 派生挑战记录 - 只包含真正的挑战类型
  const studentChallenges = React.useMemo(() => {
    const filtered = allTaskRecords.filter(record =>
      record.type === 'CHALLENGE' &&
      (record as any).task_category === 'CHALLENGE'  // 严格匹配，排除PK和BADGE
    );
    // 只显示本周挑战
    return filterThisWeek(filtered).map((record, index) => ({
      id: index,
      title: record.title,
      result: record.status === 'COMPLETED' ? 'success' :
        (record.status === 'PENDING' || record.status === 'SUBMITTED' || record.status === 'JOINED') ? 'in_progress' : ('fail' as 'success' | 'fail' | 'in_progress'),
      date: new Date(record.createdAt).toLocaleDateString('zh-CN'),
      rewardPoints: record.expAwarded || 0,
      rewardExp: Math.floor(record.expAwarded / 2) || 0,
      createdAt: record.createdAt // 传递给 filter 识别
    }));
  }, [allTaskRecords]);

  // C. 派生 PK 记录
  const studentPKRecords = React.useMemo(() => {
    if (!studentProfile?.pkRecords) return [];
    // 只显示本周 PK
    return filterThisWeek(studentProfile.pkRecords).map((pk: any, index: number) => ({
      id: index + 1,
      result: (pk.isWinner ? 'win' : 'lose') as 'win' | 'lose',
      topic: pk.topic || '对战',
      opponent: (pk.isPlayerA ? pk.playerB?.name : pk.playerA?.name) || '对手',
      date: new Date(pk.createdAt).toLocaleDateString('zh-CN')
    }));
  }, [studentProfile]);

  // D. 派生习惯打卡统计
  const habitStats = React.useMemo(() => {
    const stats: Record<string, number> = {};
    studentProfile?.habitStats?.forEach(h => {
      if (h.stats.totalCheckIns > 0) {
        stats[h.habit.name] = h.stats.totalCheckIns;
      }
    });
    return stats;
  }, [studentProfile]);

  // --- 4. 数据获取 ---
  const fetchStudentProfile = React.useCallback(async () => {
    if (!studentId) return;

    console.log('[DEBUG] fetchStudentProfile started');
    setIsDataFetching(true);
    setError(null);

    try {
      const response = await API.get(`/students/${studentId}/profile`);
      if (response.success) {
        const profile = response.data as StudentProfile;
        setStudentProfile(profile);
      } else {
        // 使用 functional update 或判断初始数据来决定是否静默失败
        if (!initialStudentData) {
          setError(response.message || '获取学生数据失败');
        }
      }
    } catch (err: any) {
      console.error('[DEBUG] 获取学生数据失败:', err);

      if (!initialStudentData) {
        setError('网络错误，请稍后重试');
      }

      // 兜底逻辑使用 prev 处理
      setStudentProfile(prev => ({
        student: prev?.student || {
          id: studentId,
          name: '学生加载中...',
          className: '',
          level: 1,
          points: 0,
          exp: 0,
          totalExp: 100,
          createdAt: new Date().toISOString()
        },
        task_records: [],
        pkRecords: [],
        pkStats: { totalMatches: 0, wins: 0, losses: 0, draws: 0, winRate: '0%' },
        taskStats: { totalTasks: 0, completedTasks: 0, pendingTasks: 0, totalExp: 0, qcTasks: 0, specialTasks: 0, challengeTasks: 0 },
        timelineData: [],
        habitStats: [],
        semesterMap: [],
        badges: [],
        summary: { joinDate: '', totalActiveDays: 0, lastActiveDate: '' }
      }));
    } finally {
      setIsDataFetching(false);
      setIsLoading(false);
    }
  }, [studentId, initialStudentData]); // 关键修复：移除 studentProfile 依赖，加入 initialStudentData

  // --- 5. 初始加载 ---
  useEffect(() => {
    fetchStudentProfile();
  }, [fetchStudentProfile]);

  // 🆕 获取本月签到天数
  useEffect(() => {
    const fetchCheckinCount = async () => {
      if (!studentId) return;
      try {
        const res = await apiService.get(`/checkins/student/${studentId}/monthly`);
        if (res.success) {
          setMonthlyCheckinCount((res.data as any)?.count || 0);
        }
      } catch (error) {
        console.error('Failed to fetch checkin count:', error);
      }
    };
    fetchCheckinCount();
  }, [studentId]);

  // 🆕 获取五维技能属性
  useEffect(() => {
    if (studentId) {
      apiService.get(`/skill/student/${studentId}/stats`).then(res => {
        if (res.success) setSkillStats(res.data as SkillStats);
      }).catch(err => console.error('Failed to fetch skill stats', err));

      apiService.get(`/skill/student/${studentId}/skills`).then(res => {
        if (res.success) {
          // 只展示有等级或经验的技能
          const skills = (res.data as any[]).filter(s => s.level > 0 || s.currentExp > 0).map(s => ({
            code: s.skill?.code || s.code,
            name: s.skill?.name || s.name,
            level: s.level,
            exp: s.currentExp,
            unlockedAt: s.unlockedAt
          }));
          setUnlockedSkills(skills);
        }
      }).catch(err => console.error('Failed to fetch skills', err));

      // 🆕 获取连胜记录
      apiService.get(`/streaks/student/${studentId}`).then(res => {
        if (res.success && res.data) {
          // 🆕 显示所有连胜项目 (包括数据为 0 的)
          setStreakRecords(res.data as any[]);
        }
      }).catch(err => console.error('Failed to fetch streak records', err));
    }
  }, [studentId]);

  // --- 5. 交互处理 ---
  const toggleLessonExpand = (id: number) => {
    setExpandedLessons(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // 🚀 实时任务状态更新
  const handlePassTask = async (lessonId: number, taskRecordId: string) => {
    try {
      // 1. 🆕 优先记录尝试/辅导次数 (X1, X2...)
      await apiService.patch(`/lms/records/${taskRecordId}/attempt`, {});

      // 2. 调用API更新任务状态为已过关
      const response = await apiService.patch(`/lms/records/${taskRecordId}/status`, {
        status: 'COMPLETED',
        courseInfo: studentProfile?.student.progress
      });

      if (response.success) {
        // SSOT: 刷新数据
        await fetchStudentProfile();
        if (navigator.vibrate) navigator.vibrate(50);
      } else {
        alert(`更新失败: ${response.message}`);
      }
    } catch (error) {
      console.error('[StudentDetail] 更新任务状态异常:', error);
      alert('操作失败，请重试');
    }
  };

  // 🆕 一键补过整个课程
  const handlePassLesson = async (lessonId: number, lesson: any) => {
    try {
      const incompleteTasks = lesson.tasks.filter((task: any) => task.status !== 'passed' && task.status !== 'COMPLETED');

      if (incompleteTasks.length === 0) {
        alert('该课程的所有任务已完成！');
        return;
      }

      const confirmed = window.confirm(`确定要补过「${lesson.title}」的 ${incompleteTasks.length} 个未完成任务吗？`);
      if (!confirmed) return;

      const taskIds = incompleteTasks.map((task: any) => task.id.toString());
      const response = await apiService.patch('/lms/records/batch/status', {
        recordIds: taskIds,
        status: 'COMPLETED',
        courseInfo: studentProfile?.student.progress
      });

      if (response.success) {
        // SSOT: 刷新数据
        await fetchStudentProfile();
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        alert(`✅ 成功补过 ${incompleteTasks.length} 个任务！`);
      } else {
        alert(`批量补过失败: ${response.message}`);
      }
    } catch (error) {
      console.error('[StudentDetail] 批量补过异常:', error);
      alert('批量补过失败，请重试');
    }
  };

  // --- AI提示词生成器处理函数 ---
  const getWeekRange = (weekOffset: number = 0) => {
    const now = new Date();
    const currentDay = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const monday = new Date(now);

    // 计算本周一的日期
    if (currentDay === 0) {
      // 如果是周日，本周一是昨天
      monday.setDate(now.getDate() - 6 - (weekOffset * 7));
    } else {
      // 否则本周一是本周的第1天
      monday.setDate(now.getDate() - (currentDay - 1) - (weekOffset * 7));
    }

    // 设置周一开始时间为 00:00:00
    monday.setHours(0, 0, 0, 0);

    // 计算本周日的日期
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    // 设置周日结束时间为 23:59:59
    sunday.setHours(23, 59, 59, 999);

    return {
      startDate: monday.toISOString(),
      endDate: sunday.toISOString()
    };
  };

  const handleCopyWeeklyPrompt = async () => {
    console.log('[FIX] handleCopyWeeklyPrompt called');

    if (!studentProfile?.student?.id) {
      console.error('[FIX] No student profile ID found');
      return;
    }

    try {
      setIsGeneratingPrompt(true);
      setPromptSuccess(false);

      // 计算本周日期范围
      const { startDate, endDate } = getWeekRange(0);

      console.log('[FIX] Fetching prompt data', {
        studentId: studentProfile.student.id,
        startDate,
        endDate
      });

      // 调用后端API获取统计数据和AI提示词
      const response = await fetch('/api/reports/student-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          studentId: studentProfile.student.id,
          startDate,
          endDate
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('[FIX] API response received', result);

      if (!result.success || !result.data?.prompt) {
        throw new Error('Failed to generate prompt');
      }

      // 复制到剪贴板
      await navigator.clipboard.writeText(result.data.prompt.text);

      console.log('[FIX] Prompt copied to clipboard successfully');
      setPromptSuccess(true);

      // 3秒后隐藏成功提示
      setTimeout(() => {
        setPromptSuccess(false);
      }, 3000);

    } catch (error) {
      console.error('[FIX] Error generating prompt:', error);

      // 显示错误提示
      alert('生成提示词失败，请稍后重试');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  // 🆕 错题本处理函数
  const fetchMistakes = async () => {
    if (!studentProfile?.student?.id) return;
    try {
      const res = await apiService.get(`/mistakes/${studentProfile.student.id}`);
      if (res.success) setMistakes((res.data as any[]) || []);
    } catch (e) {
      console.error('获取错题列表失败:', e);
    }
  };

  const handleAddMistake = async () => {
    if (!studentProfile?.student?.id || !newMistake.page || !newMistake.question) return;
    try {
      const progress = (studentProfile.student as any).progress?.[mistakeSubject] || {};
      const res = await apiService.post('/mistakes', {
        studentId: studentProfile.student.id,
        schoolId: (studentProfile.student as any).schoolId,
        subject: mistakeSubject,
        unit: newMistake.unit,
        lesson: newMistake.lesson,
        workbookPage: newMistake.page,
        questionNo: newMistake.question,
        errorCause: newMistake.errorCause,
        workbookType: newMistake.workbookType
      });
      if (res.success) {
        setMistakes(prev => [res.data, ...prev]);
        setNewMistake({ page: '', question: '', errorCause: '', unit: '1', lesson: '1', workbookType: '53天天练' });
        setShowAddMistakeModal(false);
      }
    } catch (e) {
      console.error('添加错题失败:', e);
    }
  };

  const handleRetryMistake = async (id: string) => {
    try {
      const res = await apiService.patch(`/mistakes/${id}/retry`, {});
      if (res.success) {
        setMistakes(prev => prev.map(m => m.id === id ? { ...m, retryCount: (m.retryCount || 0) + 1 } : m));
      }
    } catch (e) {
      console.error('记录重做失败:', e);
    }
  };

  const handleMasterMistake = async (id: string) => {
    try {
      const res = await apiService.patch(`/mistakes/${id}/master`, {});
      if (res.success) {
        setMistakes(prev => prev.map(m => m.id === id ? { ...m, status: 'RESOLVED' } : m));
      }
    } catch (e) {
      console.error('标记掌握失败:', e);
    }
  };

  // 加载错题列表
  useEffect(() => {
    if (activeTab === 'mistakes' && studentProfile?.student?.id) {
      fetchMistakes();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, studentProfile?.student?.id]);

  const handleHistoryPrompt = async (weekNumber: number, startDate: string, endDate: string) => {
    console.log('[FIX] handleHistoryPrompt called', { weekNumber, startDate, endDate });

    if (!studentProfile?.student?.id) {
      console.error('[FIX] No student profile ID found');
      return;
    }

    try {
      setIsGeneratingPrompt(true);

      // 调用后端API获取历史数据
      const response = await fetch('/api/reports/student-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          studentId: studentProfile.student.id,
          startDate,
          endDate
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success || !result.data?.prompt) {
        throw new Error('Failed to generate prompt');
      }

      // 复制到剪贴板
      await navigator.clipboard.writeText(result.data.prompt.text);

      alert(`第${weekNumber}周提示词已复制到剪贴板！`);
      setShowHistoryModal(false);

    } catch (error) {
      console.error('[FIX] Error generating history prompt:', error);
      alert('生成历史提示词失败，请稍后重试');
    } finally {
      setIsGeneratingPrompt(false);
    }
  };

  const loadAvailableWeeks = async () => {
    try {
      console.log('[FIX] Loading available weeks');

      const response = await fetch('/api/reports/week-calendar', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success && result.data?.weeks) {
        setAvailableWeeks(result.data.weeks);
        console.log('[FIX] Available weeks loaded', result.data.weeks);
      }

    } catch (error) {
      console.error('[FIX] Error loading available weeks:', error);
    }
  };

  // 当历史记录模态框打开时，加载可用周数
  React.useEffect(() => {
    if (showHistoryModal) {
      loadAvailableWeeks();
    }
  }, [showHistoryModal]);

  // --- 6. 数据处理 ---
  const growthData = {
    badges: studentBadges,
    habits: habitStats,
    pkRecords: studentPKRecords
  };

  // 🚀 动态数据 - 使用实时任务记录数据
  const academicData = {
    aiComment: `通过对${studentName}的学情分析，该生整体学习态度端正，知识点掌握较为扎实。建议继续保持良好的学习习惯，同时在薄弱环节加强练习。`,
    // 🆕 按标题去重，避免重复显示（如两个"口算计时"）
    pendingTasks: (() => {
      const filtered = taskRecords.filter(record => record.type.toUpperCase() === 'QC' && record.status === 'COMPLETED');
      const latestByTitle = new Map<string, typeof filtered[0]>();
      filtered.forEach(record => {
        const existing = latestByTitle.get(record.title);
        if (!existing || new Date(record.createdAt) > new Date(existing.createdAt)) {
          latestByTitle.set(record.title, record);
        }
      });
      return Array.from(latestByTitle.values()).map(record => ({
        id: record.id,
        title: record.title,
        attempts: record.content?.attempts || 0
      }));
    })(),
    // 🚀 基于学生课程进度生成动态学期地图
    // 数据源：课程标题来自 student.progress，过关项目来自 QC 任务记录
    // 🚀 基于学生课程进度生成动态学习地图 (分科目数据推导 - 2025新版)
    semesterMap: (() => {
      // 1. 根据当前选中的科目确定数据源
      const progress = studentProfile?.student?.progress;
      const currentSubjectInfo = progress ? (progress as any)[timelineSubject] : null;

      // 2. 根据科目设定基础网格数量 (不再写死 40，动态适配新教材)
      // 默认提供一个基础数量，后续根据记录中发现的最大索引进行微调
      let gridCount = 45;
      if (timelineSubject === 'chinese') gridCount = 40;
      else if (timelineSubject === 'english') gridCount = 35;

      // 3. 🆕 过滤当前科目的记录（优先使用 category，兼容关键词匹配）
      const relevantRecords = allTaskRecords.filter(record => {
        const type = record.type.toUpperCase();
        const status = record.status.toUpperCase();
        if (status !== 'COMPLETED') return false;
        if (!['QC', 'TASK', 'METHODOLOGY', 'SPECIAL'].includes(type)) return false;

        const content = (record.content || {}) as any;
        const category = content.category || '';
        const title = record.title || '';

        // 🆕 优先使用 category 字段匹配科目
        if (timelineSubject === 'chinese') {
          return category.includes('语文') || category.includes('Chinese') ||
            title.includes('生字') || title.includes('课文') || title.includes('听写');
        }
        if (timelineSubject === 'math') {
          return category.includes('数学') || category.includes('Math') ||
            title.includes('口算') || title.includes('计算') || title.includes('分步');
        }
        if (timelineSubject === 'english') {
          return category.includes('英语') || category.includes('English') ||
            title.includes('单词') || title.includes('Unit') || title.includes('背诵');
        }
        return false;
      });

      const grid = Array.from({ length: gridCount }, (_, i) => ({
        id: i,
        status: 'pending' as 'pending' | 'done',
        type: 'NONE' as 'NONE' | 'QC' | 'METHODOLOGY' | 'SPECIAL',
        isRepassed: false,
        achievements: [] as { name: string; date: string; type: string }[]
      }));

      relevantRecords.forEach(record => {
        const content = (record.content || {}) as any;
        const taskType = record.type.toUpperCase() as 'QC' | 'METHODOLOGY' | 'SPECIAL';

        let u: string | undefined;
        let l: string | undefined;

        if (content.unit) {
          u = content.unit;
          l = content.lesson || '1';
        } else {
          u = record.title?.match(/第(\d+)单元/)?.[1];
          l = record.title?.match(/第(\d+)课/)?.[1] || '1';
        }

        if (u) {
          const unitIdx = parseInt(u) - 1;
          const lessonNum = parseInt(l || '1');
          // 2025新教材均匀分布逻辑：每单元分配 5 个格子进行可视化
          const gridIdx = unitIdx * 5 + (lessonNum % 5);

          if (gridIdx >= 0 && gridIdx < gridCount) {
            const cell = grid[gridIdx];
            cell.status = 'done';

            // 🆕 补过逻辑：如果这是该任务的补充记录，或者辅导次数 > 0，则标记为补过
            const attempts = (content.attempts || 0) as number;
            if (attempts > 0) {
              cell.isRepassed = true;
            }

            const typePriority = { 'QC': 3, 'METHODOLOGY': 2, 'SPECIAL': 1, 'NONE': 0 };
            if (typePriority[taskType] > typePriority[cell.type]) {
              cell.type = taskType;
            }

            cell.achievements.push({
              name: record.title,
              date: new Date(record.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }),
              type: taskType
            });
          }
        }
      });

      return grid;
    })(),

    // 🚀 旧版时间轴逻辑 (保留以驱动下方列表展示)
    // 🆕 修复：只显示当前课程进度相关的过关项，切换下一课时显示下一课流水
    timeline: (() => {
      const timeline = {
        chinese: [] as TimelineLesson[],
        math: [] as TimelineLesson[],
        english: [] as TimelineLesson[]
      };

      const progress = studentProfile?.student?.progress;
      const qcRecords = allTaskRecords.filter(r => r.type.toUpperCase() === 'QC' && r.status === 'COMPLETED');

      // 🆕 新增：根据科目和当前进度过滤任务
      const filterBySubjectAndProgress = (subjectKey: string) => {
        const subjectProgress = progress?.[subjectKey as keyof typeof progress] as any;
        if (!subjectProgress) return [];

        const currentUnit = subjectProgress.unit || '1';
        const currentLesson = subjectProgress.lesson || '1';
        const currentTitle = subjectProgress.title || '';

        const filtered = qcRecords.filter(record => {
          const content = (record.content || {}) as any;
          const category = content.category || '';
          const recordUnit = content.unit || '';
          const recordLesson = content.lesson || '';
          const recordTitle = record.title || '';

          // 1. 首先按科目过滤
          let isSubjectMatch = false;
          if (subjectKey === 'chinese') isSubjectMatch = category.includes('语文') || recordTitle.includes('生字') || recordTitle.includes('听写') || recordTitle.includes('课文');
          if (subjectKey === 'math') isSubjectMatch = category.includes('数学') || recordTitle.includes('口算') || recordTitle.includes('计算') || recordTitle.includes('分步');
          if (subjectKey === 'english') isSubjectMatch = category.includes('英语') || recordTitle.includes('单词') || recordTitle.includes('Unit');
          if (!isSubjectMatch) return false;

          // 2. 🆕 按当前进度过滤（只显示当前课程的过关项）
          // 如果记录有单元/课程信息，则匹配当前进度
          if (recordUnit && recordUnit !== currentUnit) return false;
          if (recordLesson && recordLesson !== currentLesson) return false;

          // 3. 如果记录没有单元/课程信息，则检查 taskDate 是否在最近 7 天内
          const taskDate = content.taskDate;
          if (!recordUnit && !recordLesson && taskDate) {
            const recordDate = new Date(taskDate);
            const now = new Date();
            const diffDays = (now.getTime() - recordDate.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays > 7) return false;
          }

          return true;
        });

        // 按标题去重，保留最新的
        const latestByTitle = new Map<string, typeof filtered[0]>();
        filtered.forEach(record => {
          const existing = latestByTitle.get(record.title);
          if (!existing || new Date(record.createdAt) > new Date(existing.createdAt)) latestByTitle.set(record.title, record);
        });
        return Array.from(latestByTitle.values());
      };

      if (progress?.chinese) {
        const records = filterBySubjectAndProgress('chinese');
        timeline.chinese.push({ id: 1, unit: parseInt((progress.chinese as any).unit) || 1, lesson: parseInt((progress.chinese as any).lesson || '1') || 1, title: (progress.chinese as any).title || '未命名课程', status: records.length > 0 ? 'done' : 'pending', tasks: records.map(r => ({ id: r.id, name: r.title, status: 'passed' as const, attempts: (r.content as any)?.attempts || 0, date: new Date(r.createdAt).toLocaleDateString() })) });
      }
      if (progress?.math) {
        const records = filterBySubjectAndProgress('math');
        timeline.math.push({ id: 2, unit: parseInt((progress.math as any).unit) || 1, lesson: parseInt((progress.math as any).lesson || '1') || 1, title: (progress.math as any).title || '未命名课程', status: records.length > 0 ? 'done' : 'pending', tasks: records.map(r => ({ id: r.id, name: r.title, status: 'passed' as const, attempts: (r.content as any)?.attempts || 0, date: new Date(r.createdAt).toLocaleDateString() })) });
      }
      if (progress?.english) {
        const records = filterBySubjectAndProgress('english');
        timeline.english.push({ id: 3, unit: parseInt((progress.english as any).unit) || 1, lesson: 1, title: (progress.english as any).title || '未命名课程', status: records.length > 0 ? 'done' : 'pending', tasks: records.map(r => ({ id: r.id, name: r.title, status: 'passed' as const, attempts: (r.content as any)?.attempts || 0, date: new Date(r.createdAt).toLocaleDateString() })) });
      }

      return timeline;
    })()
  };

  // 🚀 基于任务记录的过程任务数据 - 只包含核心教法、综合成长、个性加餐
  // 🆕 需要排除的系统操作标题（这些不是学习任务，不应显示）
  const SYSTEM_OPERATION_TITLES = [
    '移入班级', '移出班级',
    '手动加分', '手动扣分',
    '老师手动调整进度', '进度修正',
    '积分奖励', '积分扣除'
  ];

  const processTasks = allTaskRecords
    .filter(record => {
      const taskType = record.type.toUpperCase();
      const taskStatus = record.status.toUpperCase();
      // 🆕 核心优化：仅展示“已达成”(COMPLETED)记录，隐藏“进行中”(PENDING)
      // 同时过滤掉系统自动生成的各类操作记录
      // 且排除勋章记录 (已由独立面板展示)
      return (taskType === 'TASK' || taskType === 'METHODOLOGY' || taskType === 'SPECIAL' || taskType === 'SKILL') &&
        taskStatus === 'COMPLETED' &&
        !SYSTEM_OPERATION_TITLES.includes(record.title) &&
        (record as any).task_category !== 'BADGE';
    })
    .map(record => {
      const taskType = record.type.toUpperCase();
      let category = '综合成长';
      if (taskType === 'METHODOLOGY') category = '核心教法';
      else if (taskType === 'SPECIAL') category = '个性加餐';
      else if (taskType === 'SKILL') category = '技能点亮';

      // 提取教师备注/理由
      let teacherNote = '';
      if (record.content) {
        const content = typeof record.content === 'string' ? JSON.parse(record.content) : record.content;
        teacherNote = content.teacherMessage || content.reason || content.notes || '';
      }

      return {
        id: record.id,
        name: record.title,
        category,
        rawType: taskType, // 保留原始类型用于配色
        default_exp: record.expAwarded,
        status: record.status.toUpperCase() === 'COMPLETED' ? 'completed' : 'pending',
        created_at: record.createdAt,
        teacherNote
      };
    });


  const thisWeekProcessTasks = filterThisWeek(processTasks); // 过滤本周数据


  const studentPersonalizedTasks: any[] = [];

  const mistakeData = {
    recent: [1, 2, 3, 4, 5]
  };

  // 雷达图组件
  const RadarChart = () => (
    <div className="w-[100px] h-[100px] relative flex items-center justify-center">
      <div className="absolute inset-0 rounded-full border border-dashed border-gray-300 opacity-50"></div>
      <div className="absolute inset-4 rounded-full border border-dashed border-gray-300 opacity-50"></div>
      <div className="w-[60px] h-[60px] bg-purple-500/20 border-2 border-purple-500 transform rotate-45 skew-x-12 rounded-lg"></div>
    </div>
  );

  console.log('[DEBUG] Render check - error:', error, 'isLoading:', isLoading, 'studentProfile:', studentProfile);

  if (error && !studentProfile) {
    console.log('[DEBUG] Rendering error state with error:', error);
    return (
      <div className="min-h-screen bg-[#F2F4F7] text-[#1E293B] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  // 移除全屏 Loading 遮罩，改为 Header 优先渲染
  if (isLoading && !studentProfile) {
    return (
      <div className="min-h-screen bg-[#F2F4F7] text-[#1E293B] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-500">初始化学生信息...</p>
        </div>
      </div>
    );
  }

  console.log('[DEBUG] Rendering main component content - studentProfile.student.name:', studentProfile?.student?.name);

  return (
    <ProtectedRoute>
      {/* 🆕 整页渐变背景 */}
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-pink-50 to-purple-50 text-[#1E293B] font-sans">

        {/* === 1. 顶部 Header (渐变玻璃拟态风格) === */}
        <div className="bg-gradient-to-br from-orange-100/80 via-pink-100/60 to-purple-100/80 backdrop-blur-sm px-5 pt-12 pb-6 relative z-10 shadow-lg shadow-orange-100/50">
          {/* 背景装饰 */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-orange-200/40 to-pink-200/40 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-gradient-to-br from-purple-200/40 to-blue-200/40 rounded-full blur-2xl"></div>
          </div>

          <button
            onClick={() => navigate('/')}
            className="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-slate-500 hover:bg-white shadow-sm"
          >
            <ArrowLeft size={18} />
          </button>

          {/* 右上角：签到天数 + 分享按钮 */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {/* 🆕 本月签到天数 - 点击打开日历 */}
            <button
              onClick={() => setShowCheckinCalendar(true)}
              className="bg-white/80 backdrop-blur-sm text-green-600 px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1 shadow-sm hover:bg-white active:scale-95 transition-all"
            >
              <Calendar size={12} />
              {monthlyCheckinCount}天
            </button>
            <button
              onClick={() => setShowInviteModal(true)}
              className="w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center text-orange-500 hover:bg-white shadow-sm"
              title="邀请家长"
            >
              <Share2 size={16} />
            </button>
          </div>

          <div className="flex items-center gap-5 relative z-10 mt-2">
            {/* A. 左侧：头像 & 等级 */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-orange-400 via-pink-400 to-purple-400 shadow-lg shadow-orange-200/50">
                <img
                  src="/avatar.jpg"
                  className="w-full h-full rounded-full bg-white border-3 border-white object-cover"
                  alt={studentName}
                  draggable="false"
                  onContextMenu={(e) => e.preventDefault()}
                  onError={(e) => { e.currentTarget.src = '/avatar.jpg'; }}
                />
              </div>
              {/* 等级胶囊 (悬浮在头像下方) */}
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-amber-400 text-amber-900 text-[10px] font-black px-3 py-1 rounded-full border-2 border-white shadow-md whitespace-nowrap">
                Lv.{student.level || 1}
              </div>
            </div>

            {/* B. 右侧：信息 & 数据 */}
            <div className="flex-1 flex flex-col justify-center gap-2">
              {/* 姓名行 */}
              <div className="flex items-baseline gap-2">
                <h1 className="text-2xl font-black text-slate-800">{studentName}</h1>
                <span className="text-[9px] text-slate-500 font-extrabold bg-white/40 backdrop-blur-md px-1 py-0.5 rounded-md border border-white/50 shadow-sm leading-none flex items-center h-[16px]">
                  {studentProfile.student.teachers?.name || studentProfile.student.className || '导师'}的班级
                </span>
              </div>

              {/* 数据行 (积分 & 经验 并排) */}
              <div className="flex items-center gap-4">
                {/* 积分 */}
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-orange-500 font-mono">{student.points || 0}</span>
                  <span className="text-xs text-orange-400 font-bold">积分</span>
                </div>
                {/* 分隔线 */}
                <div className="w-px h-6 bg-slate-300/50"></div>
                {/* 经验 */}
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-blue-500 font-mono">{student.exp || 0}</span>
                  <span className="text-xs text-blue-400 font-bold">经验</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* === 2. Tab 导航 (V1原版样式) === */}
        <div className="sticky top-0 z-20 bg-white border-b border-slate-100 px-2 shadow-sm">
          <div className="flex justify-around items-center">
            {/* 激活状态 */}
            <button
              onClick={() => setActiveTab('growth')}
              className={`relative py-3.5 px-4 text-sm font-bold transition-colors ${activeTab === 'growth' ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              🚀 成长激励
              {/* 底部指示条 */}
              {activeTab === 'growth' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-1 bg-orange-500 rounded-t-full"></div>
              )}
            </button>

            <button
              onClick={() => setActiveTab('academic')}
              className={`relative py-3.5 px-4 text-sm font-bold transition-colors ${activeTab === 'academic' ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              📚 学业攻克
              {activeTab === 'academic' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-1 bg-orange-500 rounded-t-full"></div>
              )}
            </button>

            <button
              onClick={() => setActiveTab('mistakes')}
              className={`relative py-3.5 px-4 text-sm font-bold transition-colors ${activeTab === 'mistakes' ? 'text-slate-800' : 'text-slate-400 hover:text-slate-600'
                }`}
            >
              ❌ 错题管理
              {activeTab === 'mistakes' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-1 bg-orange-500 rounded-t-full"></div>
              )}
            </button>
          </div>
        </div>

        {/* === 3. 内容滚动区 (V1原版样式) === */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">

          {/* --- TAB 1: 成长激励 (Growth) --- */}
          {activeTab === 'growth' && (
            <div className="space-y-3 animate-in slide-in-from-right-4 fade-in duration-300">

              {/* 加载状态 */}
              {isLoading && (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 text-center">
                  <div className="text-sm text-gray-500">加载中...</div>
                </div>
              )}

              {/* 🆕 五维内功 (紧凑版) */}
              {skillStats && (() => {
                // 将累积分数转换为等级 (每5点升1级，最高Lv.5)
                const toLevel = (score: number) => Math.min(5, Math.floor(score / 5) + 1);
                return (
                  <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                      <Sparkles className="w-4 h-4 text-purple-500" /> 五维内功
                    </h3>
                    <div className="grid grid-cols-5 gap-2">
                      <div className="flex flex-col items-center p-2 bg-red-50 rounded-xl border border-red-100">
                        <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-black mb-1">内</div>
                        <div className="text-[10px] font-bold text-red-600">Lv.{toLevel(skillStats.reflection)}</div>
                      </div>
                      <div className="flex flex-col items-center p-2 bg-blue-50 rounded-xl border border-blue-100">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-black mb-1">逻</div>
                        <div className="text-[10px] font-bold text-blue-600">Lv.{toLevel(skillStats.logic)}</div>
                      </div>
                      <div className="flex flex-col items-center p-2 bg-yellow-50 rounded-xl border border-yellow-100">
                        <div className="w-8 h-8 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center font-black mb-1">自</div>
                        <div className="text-[10px] font-bold text-yellow-600">Lv.{toLevel(skillStats.autonomy)}</div>
                      </div>
                      <div className="flex flex-col items-center p-2 bg-green-50 rounded-xl border border-green-100">
                        <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center font-black mb-1">规</div>
                        <div className="text-[10px] font-bold text-green-600">Lv.{toLevel(skillStats.planning)}</div>
                      </div>
                      <div className="flex flex-col items-center p-2 bg-orange-50 rounded-xl border border-orange-100">
                        <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-black mb-1">毅</div>
                        <div className="text-[10px] font-bold text-orange-600">Lv.{toLevel(skillStats.grit)}</div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 🆕 连胜记录 - 始终显示 */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                  <span className="text-lg">🔥</span> 连胜纪录
                  <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full ml-auto">
                    共 {streakRecords.length} 项
                  </span>
                </h3>

                {/* 连胜分页控制 (仅当连胜数 > 9 时显示) */}
                {streakRecords.length > 9 && (
                  <div className="flex justify-between items-center mb-3 px-1">
                    <button
                      onClick={() => setStreakPage(Math.max(0, streakPage - 1))}
                      disabled={streakPage === 0}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${streakPage === 0
                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        : 'bg-orange-100 text-orange-600 hover:bg-orange-200 active:scale-95'
                        }`}
                    >
                      ←
                    </button>

                    <span className="text-xs text-gray-500 font-medium">
                      第 {streakPage + 1} 页
                    </span>

                    <button
                      onClick={() => setStreakPage(streakPage + 1)}
                      disabled={(streakPage + 1) * 9 >= streakRecords.length}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${(streakPage + 1) * 9 >= streakRecords.length
                        ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        : 'bg-orange-100 text-orange-600 hover:bg-orange-200 active:scale-95'
                        }`}
                    >
                      →
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2">
                  {streakRecords
                    .slice(streakPage * 9, (streakPage + 1) * 9)
                    .map(record => (
                      <div key={record.category} className="flex flex-col items-center justify-center p-2 bg-gradient-to-b from-orange-50 to-amber-50 rounded-xl border border-orange-100 relative overflow-hidden h-24">
                        <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-orange-500 to-red-500 mb-0.5 leading-none">
                          {record.currentStreak}
                        </div>
                        <div className="text-[11px] font-bold text-slate-700 truncate w-full text-center px-1">
                          {record.categoryLabel}
                        </div>
                        <div className="text-[9px] text-slate-400 mt-0.5 scale-90">
                          最高 {record.maxStreak}
                        </div>
                      </div>
                    ))}
                </div>

                {/* 页面指示器 */}
                {streakRecords.length > 9 && (
                  <div className="flex justify-center items-center gap-1.5 mt-3">
                    {Array.from({
                      length: Math.ceil(streakRecords.length / 9)
                    }).map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setStreakPage(index)}
                        className={`w-2 h-2 rounded-full transition-colors ${index === streakPage
                          ? 'bg-orange-500'
                          : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* 🆕 已点亮技能名牌 - 始终显示 */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                  <Medal className="w-4 h-4 text-emerald-500" /> 已点亮技能
                  <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full ml-auto">
                    共 {unlockedSkills.length} 个
                  </span>
                </h3>

                {unlockedSkills.length > 0 ? (
                  <>
                    {/* 分页控制 (仅当技能数 > 6 时显示) */}
                    {unlockedSkills.length > 6 && (
                      <div className="flex justify-between items-center mb-3 px-1">
                        <button
                          onClick={() => setSkillPage(Math.max(0, skillPage - 1))}
                          disabled={skillPage === 0}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${skillPage === 0
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200 active:scale-95'
                            }`}
                        >
                          ←
                        </button>

                        <span className="text-xs text-gray-500 font-medium">
                          第 {skillPage + 1} 页
                        </span>

                        <button
                          onClick={() => setSkillPage(skillPage + 1)}
                          disabled={(skillPage + 1) * 6 >= unlockedSkills.length}
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${(skillPage + 1) * 6 >= unlockedSkills.length
                            ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                            : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200 active:scale-95'
                            }`}
                        >
                          →
                        </button>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      {unlockedSkills
                        .slice(skillPage * 6, (skillPage + 1) * 6)
                        .map(skill => (
                          <div key={skill.code} className="flex items-center gap-3 p-3 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group">
                            {/* 装饰背景字 */}
                            <div className="absolute -right-2 -bottom-4 text-4xl text-slate-100 font-black opacity-50 z-0 pointer-events-none select-none italic">
                              {skill.name.slice(0, 2)}
                            </div>

                            <div className="w-10 h-10 rounded-lg bg-white border border-slate-100 shadow-sm flex items-center justify-center text-xl z-10 shrink-0">
                              {/* 根据名称简单映射Emoji，或默认 */}
                              {skill.name.includes('禅') ? '🧘' :
                                skill.name.includes('炼') ? '🔥' :
                                  skill.name.includes('薪') ? '🕯️' :
                                    skill.name.includes('水') ? '💧' :
                                      skill.name.includes('内') ? '🧠' : '✨'}
                            </div>
                            <div className="z-10 min-w-0">
                              <div className="text-sm font-black text-slate-700 truncate">{skill.name}</div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-bold">Lv.{skill.level}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{skill.exp} EXP</span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* 页面指示器 */}
                    {unlockedSkills.length > 6 && (
                      <div className="flex justify-center items-center gap-1.5 mt-3">
                        {Array.from({
                          length: Math.ceil(unlockedSkills.length / 6)
                        }).map((_, index) => (
                          <button
                            key={index}
                            onClick={() => setSkillPage(index)}
                            className={`w-2 h-2 rounded-full transition-colors ${index === skillPage
                              ? 'bg-emerald-500'
                              : 'bg-gray-200 hover:bg-gray-300'
                              }`}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  /* 空状态提示 */
                  <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                    <Medal className="w-10 h-10 mb-2 opacity-50" />
                    <p className="text-sm font-medium">暂无已点亮技能</p>
                    <p className="text-xs mt-1">完成任务可解锁新技能</p>
                  </div>
                )}
              </div>

              {/* 所获勋章 */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Medal className="w-4 h-4 text-amber-500" /> 成就勋章
                  </h3>
                  <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500 font-black">
                    {studentProfile?.badges?.length || 0} 枚
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {(studentProfile?.badges || []).length > 0 ? (
                    studentProfile?.badges.map((badge, index) => (
                      <div key={`${badge.id}-${index}`} className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform group">
                        <div className="w-12 h-12 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-center text-2xl shadow-sm group-hover:bg-amber-100 transition-colors">
                          {badge.icon}
                        </div>
                        <span className="text-[10px] font-black text-slate-600 truncate w-full text-center">
                          {badge.name}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-4 text-center py-6">
                      <div className="text-3xl grayscale opacity-20 mb-2">🏅</div>
                      <p className="text-[10px] font-bold text-slate-300">还没有获得勋章哦，加油！</p>
                    </div>
                  )}
                </div>
              </div>

              {/* 习惯统计 */}
              <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
                <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" /> 习惯统计
                </h3>

                {/* 习惯统计内容 */}
                {Object.keys(growthData.habits).length > 0 ? (
                  <>
                    {/* 分页控制 - V1原版样式 */}
                    <div className="flex justify-between items-center mb-3 px-1">
                      <button
                        onClick={() => setHabitPage(Math.max(0, habitPage - 1))}
                        disabled={habitPage === 0}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${habitPage === 0
                          ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                          : 'bg-blue-100 text-blue-600 hover:bg-blue-200 active:scale-95'
                          }`}
                      >
                        ←
                      </button>

                      <span className="text-xs text-gray-500 font-medium">
                        第 {habitPage + 1} 页
                      </span>

                      <button
                        onClick={() => setHabitPage(habitPage + 1)}
                        disabled={(habitPage + 1) * 9 >= Object.entries(growthData.habits).length}
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${(habitPage + 1) * 9 >= Object.entries(growthData.habits).length
                          ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                          : 'bg-blue-100 text-blue-600 hover:bg-blue-200 active:scale-95'
                          }`}
                      >
                        →
                      </button>
                    </div>

                    {/* 习惯网格 - 每页9个，3x3布局 - V1原版样式 */}
                    <div className="grid grid-cols-3 gap-2">
                      {Object.entries(growthData.habits)
                        .sort(([, a], [, b]) => b - a) // 按次数从高到低排序
                        .slice(habitPage * 9, (habitPage + 1) * 9)
                        .map(([name, count]) => (
                          <div key={name} className="border border-gray-100 rounded-xl p-2 flex flex-col items-center">
                            <span className="text-xs text-gray-500 mb-1">{name}</span>
                            <span className={`text-lg font-bold ${count > 0 ? 'text-blue-600' : 'text-gray-300'}`}>
                              {count}
                            </span>
                          </div>
                        ))}
                    </div>

                    {/* 页面指示器 - V1原版样式 */}
                    <div className="flex justify-center items-center gap-1.5 mt-3">
                      {Array.from({
                        length: Math.ceil(Object.entries(growthData.habits).length / 9)
                      }).map((_, index) => (
                        <button
                          key={index}
                          onClick={() => setHabitPage(index)}
                          className={`w-2 h-2 rounded-full transition-colors ${index === habitPage
                            ? 'bg-blue-500'
                            : 'bg-gray-200 hover:bg-gray-300'
                            }`}
                        />
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-4 text-gray-400 text-xs">
                    暂无习惯数据
                  </div>
                )}
              </div>

              {/* 🆕 阅读成长统计 */}
              {studentId && <ReadingStatsCard studentId={studentId} />}

              {/* 任务达人面板 - V1原版样式 */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Bot className="w-4 h-4 text-blue-500" /> 任务达人
                </h3>
                <div className="space-y-2">
                  {thisWeekProcessTasks.length > 0 ? (
                    thisWeekProcessTasks
                      .slice(taskPage * 10, (taskPage + 1) * 10)
                      .map(task => {
                        // 根据任务类型定义配色方案
                        let bgColor = 'bg-blue-50';
                        let tagColor = 'bg-blue-100 text-blue-600';
                        let iconColor = 'bg-blue-200 text-blue-700';

                        if (task.rawType === 'SPECIAL') {
                          bgColor = 'bg-amber-50';
                          tagColor = 'bg-amber-100 text-amber-600';
                          iconColor = 'bg-amber-200 text-amber-700';
                        } else if (task.rawType === 'SKILL') {
                          bgColor = 'bg-amber-50';
                          tagColor = 'bg-amber-100 text-amber-600';
                          iconColor = 'bg-amber-200 text-amber-700';
                        } else if (task.rawType === 'DAILY') {
                          bgColor = 'bg-green-50';
                          tagColor = 'bg-green-100 text-green-600';
                          iconColor = 'bg-green-200 text-green-700';
                        } else if (task.name.includes('挑战') || task.name.includes('PK')) {
                          bgColor = 'bg-purple-50';
                          tagColor = 'bg-purple-100 text-purple-600';
                          iconColor = 'bg-purple-200 text-purple-700';
                        }

                        return (
                          <div key={task.id} className={`flex items-center gap-3 p-3 ${bgColor} rounded-xl transition-all hover:scale-[1.02]`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${task.status === 'completed' ? (task.rawType === 'SPECIAL' || task.rawType === 'SKILL' ? 'bg-amber-400 text-white' : 'bg-green-400 text-white') : iconColor
                              }`}>
                              {task.status === 'completed' ? (task.rawType === 'SPECIAL' ? '⭐' : task.rawType === 'SKILL' ? '✨' : '✓') :
                                task.status === 'in_progress' ? '...' : '○'}
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-bold text-slate-800">{task.name}</div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className={`px-1.5 py-0.5 ${tagColor} rounded-full text-[10px] font-black leading-none uppercase tracking-tighter`}>
                                  {task.category}
                                </span>
                                {task.teacherNote && (
                                  <span className="text-[10px] text-slate-400 font-bold truncate max-w-[120px]">
                                    💬 {task.teacherNote}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className={`text-[10px] font-black ${task.status === 'completed' ? 'text-green-600' : 'text-slate-400'}`}>
                                {task.status === 'completed' ? '已达成' : '进行中'}
                              </div>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <div className="text-center py-4 text-slate-400 text-xs">
                      暂无任务记录
                    </div>
                  )}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between items-center">
                  <span className="text-xs text-slate-500 font-medium">
                    本周任务进度
                  </span>
                  <span className="text-xs font-bold text-blue-600">
                    {thisWeekProcessTasks.filter(t => t.status === 'completed').length}/{thisWeekProcessTasks.length} 已完成
                  </span>
                </div>
                {/* 🆕 任务达人分页导航 */}
                {thisWeekProcessTasks.length > 10 && (
                  <div className="flex justify-center items-center gap-3 mt-3">
                    <button
                      onClick={() => setTaskPage(Math.max(0, taskPage - 1))}
                      disabled={taskPage === 0}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${taskPage === 0 ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-blue-100 text-blue-600 hover:bg-blue-200 active:scale-95'}`}
                    >←</button>
                    <span className="text-xs text-gray-500 font-medium">
                      第 {taskPage + 1} / {Math.ceil(thisWeekProcessTasks.length / 10)} 页
                    </span>
                    <button
                      onClick={() => setTaskPage(taskPage + 1)}
                      disabled={(taskPage + 1) * 10 >= thisWeekProcessTasks.length}
                      className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${(taskPage + 1) * 10 >= thisWeekProcessTasks.length ? 'bg-gray-100 text-gray-300 cursor-not-allowed' : 'bg-blue-100 text-blue-600 hover:bg-blue-200 active:scale-95'}`}
                    >→</button>
                  </div>
                )}
              </div>

              {/* PK对决记录 - V1原版样式 */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Swords className="w-4 h-4 text-red-500" /> PK对决记录
                </h3>
                <div className="space-y-2">
                  {growthData.pkRecords.length > 0 ? (
                    growthData.pkRecords.map((pk, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-red-50 rounded-xl">
                        <div className={`w-8 h-8 rounded-full ${pk.result === 'win' ? 'bg-green-200 text-green-700' :
                          'bg-gray-200 text-gray-700'
                          } flex items-center justify-center font-bold text-xs`}>
                          {pk.result === 'win' ? '胜' : '败'}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-slate-800">{pk.topic}</div>
                          <div className="text-xs text-slate-400">vs {pk.opponent}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-400">{pk.date}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-slate-400 text-xs">
                      暂无PK对决记录
                    </div>
                  )}
                </div>
              </div>

              {/* 挑战记录 - V1原版样式 */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-purple-500" /> 挑战记录
                </h3>
                <div className="space-y-2">
                  {studentChallenges.length > 0 ? (
                    studentChallenges.map((challenge, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-3 bg-purple-50 rounded-xl">
                        <div className={`w-8 h-8 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center font-bold text-xs`}>
                          {challenge.result === 'success' ? '成' :
                            challenge.result === 'fail' ? '败' : '进'}
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-bold text-slate-800">{challenge.title}</div>
                          <div className="text-xs text-slate-400">
                            {(challenge.rewardPoints > 0 || challenge.rewardExp > 0) && (
                              <>
                                获得 {challenge.rewardPoints > 0 && <span className="text-orange-600">+{challenge.rewardPoints}积分</span>}
                                {challenge.rewardPoints > 0 && challenge.rewardExp > 0 && ' '}
                                {challenge.rewardExp > 0 && <span className="text-blue-600">+{challenge.rewardExp}经验</span>}
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-slate-400 text-xs">
                      暂无挑战记录
                    </div>
                  )}
                </div>
              </div>

              {/* 家长绑定列表 */}
              {studentId && (
                <ParentBindingList
                  studentId={studentId}
                  studentName={studentName}
                />
              )}

            </div>
          )}

          {/* --- TAB 2: 学业攻克 (Academic) - V1原版样式 --- */}
          {activeTab === 'academic' && (
            <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300 pb-16">

              {/* 0. AI提示词生成器 - 新增功能 */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 shadow-sm border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5">
                    <Bot size={14} className="text-blue-500" />
                    本周学情总结
                  </h3>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleCopyWeeklyPrompt}
                    disabled={isGeneratingPrompt || !studentId}
                    className={`flex-1 ${promptSuccess ? 'bg-green-500' : 'bg-blue-600'} hover:opacity-90 active:scale-95 text-white py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-200/50 transition-all`}
                  >
                    {isGeneratingPrompt ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-3 w-3 border-2 border-white/30 border-t-white"></div>
                        <span>生成中...</span>
                      </div>
                    ) : promptSuccess ? (
                      <Check size={14} />
                    ) : (
                      <BookOpen size={14} />
                    )}
                    {promptSuccess ? '总结已复制' : '复制本周总结'}
                  </button>

                  <button
                    onClick={() => setShowHistoryModal(true)}
                    className="bg-white border text-blue-600 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 hover:bg-blue-50 active:scale-95 transition-all border-blue-100"
                  >
                    <Calendar size={12} />
                    历史周
                  </button>
                </div>
              </div>


              {/* 🆕 已删除：今日教学计划面板（放在个人详情页不合适） */}

              {/* E. 全学期过关地图 (Timeline) - V1原版样式 */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-3 px-1">
                  <h3 className="font-bold text-gray-700">全学期过关地图</h3>
                  <div className="flex bg-white p-0.5 rounded-lg border border-gray-200 shadow-sm">
                    {(['chinese', 'math', 'english'] as const).map(sub => (
                      <button
                        key={sub}
                        onClick={() => setTimelineSubject(sub)}
                        className={`px-3 py-1 text-[10px] rounded-md font-black transition-all ${timelineSubject === sub ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        {sub === 'chinese' ? '语文' : sub === 'math' ? '数学' : '英语'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Growing Map Grid - 🆕 2025新版分科目动态色系地图 */}
                <div className="bg-white p-5 rounded-3xl border border-slate-100 mb-6 shadow-sm">
                  <div className="grid grid-cols-7 gap-1.5">
                    {academicData.semesterMap.map((cell: any) => {
                      // 🚀 动态色系方案 (语/数/英 差异化)
                      // 🆕 修复：一次过关=深色，补过=淡色
                      const colors: Record<string, any> = {
                        chinese: {
                          done: 'bg-orange-500 border-orange-400 shadow-md shadow-orange-100 scale-105 z-10',       // 一次过关：深色
                          repassed: 'bg-orange-200 border-orange-200 scale-100',                                     // 补过：淡色
                          pending: 'bg-orange-50/50 border-orange-100/30 text-orange-200'
                        },
                        math: {
                          done: 'bg-blue-500 border-blue-400 shadow-md shadow-blue-100 scale-105 z-10',
                          repassed: 'bg-blue-200 border-blue-200 scale-100',
                          pending: 'bg-blue-50/50 border-blue-100/30 text-blue-200'
                        },
                        english: {
                          done: 'bg-green-500 border-green-400 shadow-md shadow-green-100 scale-105 z-10',
                          repassed: 'bg-green-200 border-green-200 scale-100',
                          pending: 'bg-green-50/50 border-green-100/30 text-green-200'
                        }
                      };

                      const subjectColors = colors[timelineSubject] || colors.math;

                      // 🆕 核心逻辑：补过(isRepassed=true)用淡色，一次过关用深色
                      let cellClass = '';
                      if (cell.status === 'done') {
                        cellClass = cell.isRepassed ? subjectColors.repassed : subjectColors.done;
                      } else {
                        cellClass = subjectColors.pending;
                      }

                      const borderStyle = 'border';

                      return (
                        <div
                          key={cell.id}
                          className={`group relative aspect-square rounded-lg flex items-center justify-center transition-all ${cellClass} ${borderStyle}`}
                        >
                          {cell.status === 'done' ? (
                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse shadow-sm" />
                          ) : (
                            <span className="text-[9px] font-black opacity-40">{cell.id + 1}</span>
                          )}

                          {/* Tooltip on Hover */}
                          {cell.status === 'done' && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-50">
                              <div className="bg-slate-800 text-white rounded-xl p-3 shadow-xl whitespace-nowrap min-w-[120px]">
                                <div className="text-[10px] font-black opacity-60 mb-1 leading-none uppercase">ID: {cell.id + 1} 达成详情</div>
                                <div className="space-y-1">
                                  {cell.achievements.map((ach: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center gap-4 text-xs">
                                      <div className="flex items-center gap-1.5">
                                        <div className={`w-1.5 h-1.5 rounded-full bg-white opacity-80`} />
                                        <span className="font-bold">{ach.name}</span>
                                      </div>
                                      <span className="text-[10px] opacity-60">{ach.date}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-800"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Timeline List - V1原版样式 (改为辅助展示) */}
              <div className="flex items-center gap-2 mb-4 px-1">
                <BookOpen size={14} className="text-slate-400" />
                <span className="text-xs font-black text-slate-500 uppercase tracking-wider">最近过关流水</span>
              </div>

              <div className="relative pl-6 space-y-6">
                <div className="absolute left-[11px] top-2 bottom-0 w-0.5 bg-slate-200/60 rounded-full"></div>

                {academicData.timeline[timelineSubject as keyof typeof academicData.timeline]
                  .filter((l: TimelineLesson) => !showPendingOnly || l.status === 'pending')
                  .map((lesson: TimelineLesson) => {
                    const isExpanded = expandedLessons[lesson.id] || (lesson.status === 'pending');
                    const isDone = lesson.status === 'done';

                    return (
                      <div key={lesson.id} className="relative z-10 scale-in-center">
                        <div className={`absolute -left-[21px] top-4 w-4 h-4 rounded-full border-4 box-content shadow-sm transition-all duration-300 ${isDone ? 'bg-green-500 border-green-100' : 'bg-orange-500 border-orange-100 animate-pulse'}`}></div>

                        <div className={`bg-white rounded-2xl shadow-sm overflow-hidden transition-all border border-slate-100 ${!isDone ? 'ring-1 ring-orange-100' : ''}`}>
                          <div
                            className={`p-3.5 flex justify-between items-center cursor-pointer active:bg-slate-50 transition-colors ${!isDone ? 'bg-orange-50/30' : ''}`}
                            onClick={() => toggleLessonExpand(lesson.id)}
                          >
                            <div className="flex-1">
                              <div className={`text-[10px] font-black mb-1 leading-none ${isDone ? 'text-slate-400' : 'text-orange-600 uppercase'}`}>
                                U{lesson.unit} L{lesson.lesson} {isDone ? '已过关' : '· 过关中'}
                              </div>
                              <div className={`font-black text-sm ${isDone ? 'text-slate-600' : 'text-slate-800'}`}>{lesson.title}</div>
                            </div>
                            <div className="flex items-center gap-2">
                              {!isDone && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handlePassLesson(lesson.id, lesson);
                                  }}
                                  className="px-2.5 py-1.5 bg-green-500 text-white text-[10px] font-black rounded-xl hover:bg-green-600 active:scale-95 transition-all shadow-sm"
                                >
                                  补过
                                </button>
                              )}
                              <ChevronDown className={`w-4 h-4 text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="px-3 pb-3 border-t border-slate-50 animate-in fade-in slide-in-from-top-2 duration-300">
                              <div className="pt-3 space-y-2">
                                {lesson.tasks.map((task: TimelineTask) => {
                                  const isTaskDone = task.status === 'passed';
                                  return (
                                    <div key={task.id} className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${isTaskDone ? 'bg-green-50/50 border-green-100' : 'bg-slate-50/50 border-slate-100'}`}>
                                      <div className="flex items-center gap-2.5">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shadow-sm ${isTaskDone ? 'bg-green-500 text-white' : 'bg-white text-slate-300 border border-slate-200'}`}>
                                          {isTaskDone ? '✓' : '○'}
                                        </div>
                                        <span className={`text-xs font-bold ${isTaskDone ? 'text-green-700' : 'text-slate-600'}`}>{task.name}</span>
                                      </div>
                                      {/* 🆕 只展示状态，不需要点击功能 */}
                                      {task.attempts > 0 && (
                                        <span className="text-[10px] text-orange-600 font-black bg-orange-50 px-1.5 py-0.5 rounded-md border border-orange-100">
                                          X{task.attempts}
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* --- TAB 3: 错题本 (Mistakes) - 轻量级设计 --- */}
          {activeTab === 'mistakes' && (
            <div className="space-y-4 animate-in slide-in-from-right-4 fade-in duration-300">
              {/* 科目切换 Tab */}
              <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-gray-100 shadow-sm">
                {[
                  { key: 'chinese', label: '语文', color: 'orange' },
                  { key: 'math', label: '数学', color: 'blue' },
                  { key: 'english', label: '英语', color: 'purple' }
                ].map(sub => (
                  <button
                    key={sub.key}
                    onClick={() => setMistakeSubject(sub.key as 'chinese' | 'math' | 'english')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mistakeSubject === sub.key
                      ? `bg-${sub.color}-500 text-white shadow-md`
                      : 'text-slate-500 hover:bg-slate-50'
                      }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              {/* 添加错题按钮 */}
              <button
                onClick={() => setShowAddMistakeModal(true)}
                className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white p-4 rounded-2xl shadow-lg shadow-red-100 flex items-center justify-center gap-3 active:scale-95 transition-transform"
              >
                <Plus size={20} />
                <span className="font-bold">添加错题</span>
              </button>

              {/* 错题列表（按课程节点分组） */}
              <div className="space-y-3">
                {mistakes.filter(m => m.subject === mistakeSubject).length === 0 ? (
                  <div className="bg-white p-8 rounded-xl border border-gray-100 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <AlertCircle className="text-gray-300" size={28} />
                    </div>
                    <div className="text-gray-400 text-sm">暂无错题记录</div>
                  </div>
                ) : (
                  // 按课程节点分组
                  Object.entries(
                    mistakes
                      .filter(m => m.subject === mistakeSubject)
                      .reduce((acc, m) => {
                        const key = `第${m.unit || '?'}单元 第${m.lesson || '?'}课`;
                        if (!acc[key]) acc[key] = [];
                        acc[key].push(m);
                        return acc;
                      }, {} as Record<string, any[]>)
                  ).map(([lessonKey, lessonMistakes]: [string, any[]]) => (
                    <div key={lessonKey} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                        <span className="text-xs font-bold text-gray-600">{lessonKey}</span>
                        <span className="ml-2 text-xs text-gray-400">({lessonMistakes.length}道)</span>
                      </div>
                      <div className="divide-y divide-gray-50">
                        {lessonMistakes.map(m => (
                          <div key={m.id} className="px-4 py-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                                <span className="text-red-500 font-bold text-sm">P{m.workbookPage}</span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-800">第{m.questionNo}题</span>
                                  {m.errorCause && (
                                    <span className="text-[10px] px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded border border-amber-100">
                                      {m.errorCause}
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-gray-400 mt-0.5">
                                  错{m.wrongCount}次 · 重做{m.retryCount}次
                                  {m.status === 'RESOLVED' && <span className="text-green-500 ml-1">✓ 已掌握</span>}
                                </div>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleRetryMistake(m.id)}
                                className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 active:scale-95 transition-all"
                              >
                                +重做
                              </button>
                              <button
                                onClick={() => handleMasterMistake(m.id)}
                                className="text-xs text-green-600 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100 hover:bg-green-100 active:scale-95 transition-all"
                              >
                                ✓掌握
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 添加错题弹窗 */}
          {showAddMistakeModal && (
            <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 animate-in fade-in duration-200">
              <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 pb-24 animate-in slide-in-from-bottom duration-300 max-h-[85vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-800">添加错题</h3>
                  <button onClick={() => setShowAddMistakeModal(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={20} />
                  </button>
                </div>
                {/* 🆕 进度选择器 */}
                <div className="mb-4">
                  <label className="block text-xs text-gray-500 mb-2">课程节点</label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <select
                        value={newMistake.unit}
                        onChange={e => setNewMistake({ ...newMistake, unit: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:border-amber-300 focus:ring-2 focus:ring-amber-100 outline-none"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(u => (
                          <option key={u} value={String(u)}>第{u}单元</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <select
                        value={newMistake.lesson}
                        onChange={e => setNewMistake({ ...newMistake, lesson: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:border-amber-300 focus:ring-2 focus:ring-amber-100 outline-none"
                      >
                        {Array.from({ length: 30 }, (_, i) => i + 1).map(l => (
                          <option key={l} value={String(l)}>第{l}课</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* 🆕 作业类别选择器 */}
                <div className="mb-4">
                  <label className="block text-xs text-gray-500 mb-2">作业类别</label>
                  <div className="flex gap-2 flex-wrap">
                    {['能陪', '53天天练', '试卷', '练习单'].map(type => (
                      <button
                        key={type}
                        onClick={() => setNewMistake({ ...newMistake, workbookType: type })}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${newMistake.workbookType === type
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-amber-200'
                          }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">页码</label>
                      <input
                        type="number"
                        value={newMistake.page}
                        onChange={e => setNewMistake({ ...newMistake, page: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-300 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                        placeholder="48"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1.5">题号</label>
                      <input
                        type="number"
                        value={newMistake.question}
                        onChange={e => setNewMistake({ ...newMistake, question: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-red-300 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                        placeholder="3"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1.5">错因标签</label>
                    <div className="flex flex-wrap gap-2">
                      {(mistakeSubject === 'chinese'
                        ? ['字词混淆', '拼音错误', '笔画错误', '阅读理解', '审题不清', '粗心大意']
                        : mistakeSubject === 'english'
                          ? ['拼写错误', '语法错误', '时态混淆', '单词遗忘', '审题不清', '粗心大意']
                          : ['审题不清', '计算失误', '概念混淆', '粗心大意', '知识盲区']
                      ).map(cause => (
                        <button
                          key={cause}
                          onClick={() => setNewMistake({ ...newMistake, errorCause: cause })}
                          className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${newMistake.errorCause === cause
                            ? 'bg-red-500 text-white border-red-500'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-red-200'
                            }`}
                        >
                          {cause}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={handleAddMistake}
                    className="w-full bg-gradient-to-r from-red-500 to-rose-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-red-100 active:scale-95 transition-transform"
                  >
                    确认添加
                  </button>
                </div>
              </div>
            </div>
          )}


        </div>

        {/* 历史记录模态框 */}
        {showHistoryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 animate-in zoom-in-95 duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">历史周提示词</h3>
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableWeeks.length > 0 ? (
                  availableWeeks.map((week) => (
                    <div
                      key={week.weekNumber}
                      className={`flex items-center justify-between p-3 rounded-lg border ${week.isCurrentWeek
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-white border-gray-200 hover:bg-gray-50'
                        } transition-colors`}
                    >
                      <div className="flex-1">
                        <div className="font-medium text-gray-800">
                          {week.label}
                          {week.isCurrentWeek && (
                            <span className="ml-2 text-xs text-blue-600 font-medium bg-blue-100 px-2 py-1 rounded">当前周</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(week.startDate).toLocaleDateString('zh-CN')} - {new Date(week.endDate).toLocaleDateString('zh-CN')}
                        </div>
                      </div>
                      <button
                        onClick={() => handleHistoryPrompt(
                          week.weekNumber,
                          week.startDate,
                          week.endDate
                        )}
                        disabled={isGeneratingPrompt}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-all duration-200 active:scale-95"
                      >
                        {isGeneratingPrompt ? '生成中...' : '复制'}
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p>加载历史周数据中...</p>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setShowHistoryModal(false)}
                  className="w-full py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 邀请卡弹窗 */}
        {student && (
          <InviteCardModal
            isOpen={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            student={{
              id: student.id || studentId || '',
              name: student.name || '未知学生',
              className: student.className,
              avatarUrl: undefined
            }}
          />
        )}

        {/* 🆕 签到日历弹窗 */}
        {studentId && (
          <CheckinCalendarModal
            studentId={studentId}
            isOpen={showCheckinCalendar}
            onClose={() => setShowCheckinCalendar(false)}
          />
        )}
      </div>
    </ProtectedRoute >
  );
};

export default StudentDetail;