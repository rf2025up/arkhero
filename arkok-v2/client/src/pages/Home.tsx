import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useClass } from '../context/ClassContext';
import { Check, CheckSquare, ListChecks, BookOpen, AlertCircle, User, UserPlus, Trophy, Medal, Swords, Flag, ChevronDown, Users, Calendar, Bell, Plus, Sparkles, Smartphone } from 'lucide-react';
import { Student, StudentListResponse, ScoreUpdateEvent } from '../types/student';
import ActionSheet from '../components/ActionSheet';
import { AddStudentModal } from '../components/AddStudentModal';
import MessageCenter from '../components/MessageCenter';
import apiService from '../services/api.service';

const Home = () => {
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const { viewMode, switchViewMode, selectedTeacherId, managedTeacherName, currentClass, availableClasses, switchClass, isProxyMode } = useClass();

  // --- 状态管理 ---
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [scoringStudent, setScoringStudent] = useState<Student | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  // 🆕 最近7条积分操作历史
  const [scoreHistory, setScoreHistory] = useState<Array<{
    id: string;
    points: number;
    exp: number;
    reason?: string;
    reasonType?: string;
    operatorName?: string;
    operatedAt: string;
  }>>([]);

  // --- 加载和错误状态 ---
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 新增学生功能状态
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 班级切换抽屉状态
  const [isClassDrawerOpen, setIsClassDrawerOpen] = useState(false);

  // 竞态条件控制
  const abortControllerRef = useRef<AbortController | null>(null);

  // --- 核心交互状态 ---
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggered = useRef(false);
  const touchStartPos = useRef<{ x: number, y: number } | null>(null);
  const visibleStudents = students.sort((a, b) => (b.exp || 0) - (a.exp || 0));

  // 基于师生绑定的数据获取函数
  const fetchStudents = async (forceRefresh = false) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    const hasExistingData = students.length > 0;

    // 如果没有现有数据，显示加载中
    if (!hasExistingData) {
      setIsLoading(true);
    }
    setError(null);

    try {
      const params = new URLSearchParams();
      if (viewMode === 'MY_STUDENTS' && user?.id) {
        params.set('scope', 'MY_STUDENTS');
        params.set('teacherId', user.id);
        params.set('userRole', user.role || 'TEACHER');
      } else if (viewMode === 'ALL_SCHOOL') {
        params.set('scope', 'ALL_SCHOOL');
        params.set('userRole', user?.role || 'TEACHER');
        params.set('schoolId', user?.schoolId || '');
      } else if (viewMode === 'SPECIFIC_CLASS' && selectedTeacherId) {
        params.set('scope', 'SPECIFIC_TEACHER');
        params.set('teacherId', selectedTeacherId);
        params.set('userRole', user?.role || 'TEACHER');
        if (user?.id) params.set('requesterId', user.id);
      }

      if (currentClass !== 'ALL' && currentClass !== '' && (viewMode === 'ALL_SCHOOL' || viewMode === 'SPECIFIC_CLASS')) {
        params.set('className', currentClass);
      }

      const url = `/students?${params.toString()}`;

      // 🚀 第一阶段：尝试获取缓存数据 (SWR)
      // 如果不是强制刷新，且我们想要秒开体验
      const studentRes = await apiService.get<any>(url, {}, { useCache: !forceRefresh });

      const processStudents = (data: any) => {
        let final: any[] = [];
        if (Array.isArray(data?.data)) final = data.data;
        else if (data?.data?.students) final = data.data.students;
        else if (Array.isArray(data)) final = data;

        return final.map((s: any) => ({
          ...s,
          avatarUrl: s.avatarUrl || '/avatar.jpg'
        }));
      };

      if (studentRes.success || (studentRes as any)._fromCache) {
        const list = processStudents(studentRes);
        setStudents(list);

        // 如果是从缓存返回的，我们已经在 UI 上渲染了旧数据
        // 接下来我们静默地从网络刷新，除非 forceRefresh 已经包含了网络请求
        if ((studentRes as any)._fromCache) {
          setIsLoading(false); // 命中缓存立即停止 loading
          console.log('[SWR] ⚡ Rendering cached data, refreshing in background...');

          // 静默刷新
          apiService.get<any>(url, {}, { useCache: false }).then(freshRes => {
            if (freshRes.success && !abortController.signal.aborted) {
              setStudents(processStudents(freshRes));
              console.log('[SWR] ✅ Background refresh complete');
            }
          });
        }
      } else {
        if (!abortController.signal.aborted) {
          setError('获取学生数据失败');
        }
      }
    } catch (err) {
      if (!abortController.signal.aborted) {
        setError('获取学生数据失败');
      }
    } finally {
      // 如果没有命过缓存（即不是 _fromCache 情况下的立即停止），则在这里停止
      if (!abortController.signal.aborted) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [viewMode, selectedTeacherId, currentClass, token]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleAddStudent = async (studentData: { name: string; className: string }) => {
    try {
      if (!user?.id) return;
      await apiService.students.create({
        name: studentData.name,
        className: studentData.className,
        schoolId: user.schoolId,
        teacherId: user.id
      });
      apiService.invalidateCache('/students');
      setIsModalOpen(false);
      await fetchStudents(true); // 强制从服务器获取最新
    } catch (error) {
      console.error(error);
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const handleTouchStart = (e: React.TouchEvent, student: Student) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    isLongPressTriggered.current = false;

    longPressTimer.current = setTimeout(async () => {
      if (!isMultiSelectMode) {
        isLongPressTriggered.current = true;
        setScoringStudent(student);
        setIsSheetOpen(true);
        if (navigator.vibrate) navigator.vibrate(50);

        // 🆕 获取该学生最近7条积分操作历史
        try {
          const res = await apiService.get(`/students/${student.id}/score-history?limit=7`);
          if (res.success && res.data) {
            setScoreHistory(res.data as any);
          } else {
            setScoreHistory([]);
          }
        } catch (err) {
          console.error('[Home] 获取积分历史失败:', err);
          setScoreHistory([]);
        }
      }
    }, 600);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartPos.current) return;
    const touch = e.touches[0];
    const moveX = Math.abs(touch.clientX - touchStartPos.current.x);
    const moveY = Math.abs(touch.clientY - touchStartPos.current.y);
    if (moveX > 10 || moveY > 10) {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      touchStartPos.current = null;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, student: Student) => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    if (!touchStartPos.current || isLongPressTriggered.current) return;
    if (isMultiSelectMode) {
      toggleSelection(student.id);
      return;
    }
    navigate(`/student/${student.id}`, { state: { studentData: student } });
  };

  const handleBatchScoreClick = () => {
    if (selectedIds.size > 0) setIsSheetOpen(true);
  };

  const toggleMultiSelectMode = () => {
    if (isMultiSelectMode) {
      setIsMultiSelectMode(false);
      setSelectedIds(new Set());
    } else {
      setIsMultiSelectMode(true);
      if (navigator.vibrate) navigator.vibrate(50);
    }
  };

  const handleConfirmScore = async (points: number, reason: string, exp?: number, reasonType?: string) => {
    if (!token) return;
    let idsToUpdate = scoringStudent ? [scoringStudent.id] : Array.from(selectedIds);
    try {
      const data = await apiService.post('/students/score', {
        studentIds: idsToUpdate,
        points: points,
        exp: exp || 0,
        reason: reason,
        reasonType: reasonType || null  // 🆕 传入减分理由类型
      });
      if (data.success) {
        apiService.invalidateCache('/students');
        setToastMsg('更新成功');
        setTimeout(() => setToastMsg(null), 1500);
        await fetchStudents(true);
      }
    } catch (error) {
      console.error(error);
    }
    setIsSheetOpen(false);
    setScoringStudent(null);
  };

  const handleTransferStudents = async (studentIds: string[], targetTeacherId: string) => {
    if (!user?.id) return;
    try {
      const actualId = targetTeacherId === 'current' ? user.id : targetTeacherId;
      const data = await apiService.students.transfer({
        studentIds: studentIds,
        targetTeacherId: actualId
      });
      if (data.success) {
        apiService.invalidateCache('/students');
        setToastMsg('已移入班级');
        setTimeout(() => setToastMsg(null), 2000);
        setSelectedIds(new Set());
        setIsMultiSelectMode(false);

        // 🆕 自动切换到"我的班级"视图，确保用户立即看到转入的学生
        if (viewMode !== 'MY_STUDENTS') {
          console.log('[TRANSFER] Auto-switching to MY_STUDENTS view after successful transfer');
          switchViewMode('MY_STUDENTS');
          // Note: switchViewMode will trigger useEffect which calls fetchStudents()
        } else {
          await fetchStudents(true);
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleBatchCheckin = async (studentIds: string[]) => {
    if (!user?.schoolId) return;
    try {
      const data = await apiService.post('/checkins/batch', {
        studentIds,
        schoolId: user.schoolId
      });
      if (data.success) {
        apiService.invalidateCache('/students');
        setToastMsg('签到成功');
        setTimeout(() => setToastMsg(null), 2000);
        setSelectedIds(new Set());
        setIsMultiSelectMode(false);
        await fetchStudents(true);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#F5F7FA] pb-24">
      {/* 头部区域 */}
      <header className="relative pt-14 pb-24 px-6">
        {/* 背景层 - 位于卡片之下 */}
        <div
          className="absolute inset-0 rounded-b-[40px] z-0 overflow-hidden shadow-lg shadow-orange-900/10"
          style={{ background: isProxyMode ? 'linear-gradient(135deg, #475569 0%, #1e293b 100%)' : 'linear-gradient(160deg, #FF8C00 0%, #FF5500 100%)' }}
        >
          <div className="absolute -top-1/2 -left-1/5 w-[200%] h-[200%] pointer-events-none opacity-60"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 60%)' }}
          />
        </div>

        {/* 内容层 - 位于卡片之上 */}
        <div className="relative z-20 flex justify-between items-center mb-6">
          <button
            onClick={() => setIsClassDrawerOpen(true)}
            className="flex flex-col items-start bg-white/20 px-4 py-2 rounded-2xl backdrop-blur-md active:bg-white/30 transition-colors border border-white/10"
          >
            <div className="flex items-center gap-2">
              <span className="font-black text-lg text-white tracking-tight">
                {viewMode === 'MY_STUDENTS' ? '我的班级' :
                  viewMode === 'ALL_SCHOOL' ? '全校大名单' :
                    `${managedTeacherName || '代管理'} 的班级`}
              </span>
              <ChevronDown size={14} className="text-white/80" />
            </div>
          </button>
          <MessageCenter variant="header" />
        </div>
      </header>

      {/* 悬浮快捷岛 */}
      <div className="px-5 -mt-16 relative z-10">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl p-4 flex justify-between items-center shadow-xl shadow-orange-100/30 border border-white/80">
          {[
            { id: 'habit', icon: Check, label: '习惯', route: '/habits' },
            { id: 'medal', icon: Medal, label: '勋章', route: '/badges' },
            { id: 'match', icon: Swords, label: 'PK对决', route: '/pk' },
            { id: 'flag', icon: Flag, label: '挑战', route: '/challenges' }
          ].map((item) => (
            <button key={item.id} onClick={() => navigate(item.route)} className="flex-1 flex flex-col items-center gap-2 active:scale-95 transition-transform">
              <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center shadow-sm">
                <item.icon size={22} />
              </div>
              <span className="text-[11px] font-bold text-gray-500">{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 学生列表区域 */}
      <div className="px-5 pt-6 pb-28">
        {/* 校长专属：品牌赋能入口 */}
        {user?.role === 'ADMIN' && (
          <div
            onClick={() => navigate('/empowerment')}
            className="mb-8 p-6 rounded-[32px] bg-gradient-to-r from-orange-500 to-rose-500 text-white shadow-xl shadow-orange-200 relative overflow-hidden group active:scale-[0.98] transition-all cursor-pointer"
          >
            <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:scale-110 transition-transform">
              <Sparkles size={120} />
            </div>
            <div className="relative z-10 text-left">
              <div className="flex items-center gap-3 mb-3">
                <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm shadow-sm ring-1 ring-white/20">
                  <Smartphone size={24} className="text-white" />
                </div>
                <h3 className="text-2xl font-black italic tracking-tight">校长赋能中心</h3>
              </div>
              <p className="text-sm opacity-90 leading-relaxed font-bold pl-1">
                全学期过关地图、家长端动态预览、口碑裂变引擎...<br />
                让机构的专业服务"清晰可见"。
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="font-bold text-gray-800 text-sm">学生名册</h3>
          <button
            onClick={toggleMultiSelectMode}
            className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors ${isMultiSelectMode
              ? 'bg-orange-500 text-white'
              : 'text-orange-500 bg-orange-50 active:bg-orange-100'
              }`}
          >
            <CheckSquare size={12} className="inline mr-1" />
            {isMultiSelectMode ? '取消' : '批量管理'}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {visibleStudents.map((student) => (
            <div
              key={student.id}
              onClick={() => {
                if (!isMultiSelectMode) navigate(`/student/${student.id}`, { state: { studentData: student } });
                else toggleSelection(student.id);
              }}
              onTouchStart={(e) => handleTouchStart(e, student)}
              onTouchMove={handleTouchMove}
              onTouchEnd={(e) => {
                handleTouchEnd(e, student);
                e.preventDefault();
              }}
              className={`flex flex-col items-center p-2 rounded-xl transition-all duration-200 cursor-pointer select-none ${selectedIds.has(student.id) ? 'bg-orange-50 scale-95 ring-2 ring-primary' : 'active:scale-95 hover:bg-gray-50'}`}
            >
              <div className="relative">
                <img
                  src={student.avatarUrl || '/avatar.jpg'}
                  alt={student.name}
                  draggable="false"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (!isMultiSelectMode) {
                      setScoringStudent(student);
                      setIsSheetOpen(true);
                    }
                  }}
                  className={`w-14 h-14 rounded-full object-cover border-2 transition-all ${selectedIds.has(student.id) ? 'border-primary opacity-100' : 'border-gray-100'}`}
                />
                {/* 等级胶囊 (悬浮在头像下方) */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-gradient-to-r from-yellow-400 to-amber-400 text-amber-900 text-[8px] font-black px-2 py-0.5 rounded-full border border-white shadow-sm whitespace-nowrap">
                  Lv.{student.level || 1}
                </div>
                {isMultiSelectMode && (
                  <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full border-2 border-white flex items-center justify-center shadow-sm transition-colors ${selectedIds.has(student.id) ? 'bg-primary' : 'bg-gray-200'}`}>
                    {selectedIds.has(student.id) && <Check size={12} className="text-white" strokeWidth={3} />}
                  </div>
                )}
              </div>
              <span className={`mt-3 text-xs font-bold truncate w-full text-center ${selectedIds.has(student.id) ? 'text-primary' : 'text-gray-700'}`}>{student.name}</span>
              <span className="text-[10px] text-gray-400 font-medium">{student.points} 积分</span>
            </div>
          ))}
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex flex-col items-center p-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 hover:bg-blue-50/30 transition-all group h-[116px] justify-center"
          >
            <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-sm text-slate-300 group-hover:text-blue-500 transition-all">
              <Plus size={24} />
            </div>
            <span className="mt-2 text-xs font-bold text-slate-400 group-hover:text-blue-600">新增学生</span>
          </button>
        </div>
      </div>

      {isMultiSelectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-24 left-0 right-0 px-4 z-30 animate-in slide-in-from-bottom-10">
          <div className="flex gap-3">
            <button onClick={() => handleBatchCheckin(Array.from(selectedIds))} className="flex-1 bg-green-500 text-white font-bold py-4 rounded-2xl shadow-2xl flex items-center justify-center space-x-2 active:scale-95 transition-transform">
              <Calendar size={20} />
              <span>签到 ({selectedIds.size})</span>
            </button>
            <button onClick={handleBatchScoreClick} className="flex-1 bg-gray-900 text-white font-bold py-4 rounded-2xl shadow-2xl flex items-center justify-center space-x-2 active:scale-95 transition-transform">
              <CheckSquare size={20} />
              <span>评分 ({selectedIds.size})</span>
            </button>
          </div>
        </div>
      )}

      <ActionSheet
        isOpen={isSheetOpen}
        onClose={() => { setIsSheetOpen(false); setScoringStudent(null); setScoreHistory([]); }}
        selectedStudents={scoringStudent ? [scoringStudent] : visibleStudents.filter(s => selectedIds.has(s.id))}
        onConfirm={handleConfirmScore}
        onTransfer={user?.role === 'TEACHER' ? handleTransferStudents : undefined}
        onCheckin={user?.role === 'TEACHER' ? handleBatchCheckin : undefined}
        scoreHistory={scoreHistory}
      />

      {toastMsg && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-6 py-3 rounded-xl shadow-lg text-sm z-[70] font-bold">
          {toastMsg}
        </div>
      )}

      <AddStudentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleAddStudent} />

      {isClassDrawerOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-[55]" onClick={() => setIsClassDrawerOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-[60] bg-white rounded-t-3xl p-5 pb-8 max-h-[60vh] overflow-y-auto animate-in slide-in-from-bottom shadow-2xl">
            <div className="flex justify-center mb-4"><div className="w-12 h-1 bg-gray-300 rounded-full"></div></div>
            <h3 className="text-lg font-bold text-gray-800 mb-4">选择班级</h3>
            <div className="space-y-2">
              <button
                onClick={() => {
                  switchViewMode('MY_STUDENTS');
                  const myClass = availableClasses.find(cls => cls.teacherId === user?.id);
                  if (myClass) switchClass(myClass.name);
                  else if (user?.name) switchClass(`${user.name}的班级`);
                  setIsClassDrawerOpen(false);
                }}
                className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors ${viewMode === 'MY_STUDENTS' ? 'bg-blue-100 border-2 border-blue-500 text-blue-700' : 'bg-gray-50'}`}
              >
                <div className="flex items-center gap-3"><User size={20} /><div className="font-medium">{user?.name}的班级</div></div>
                {viewMode === 'MY_STUDENTS' && <Check size={20} className="text-blue-600" />}
              </button>
              <button
                onClick={() => { switchViewMode('ALL_SCHOOL'); switchClass('ALL'); setIsClassDrawerOpen(false); }}
                className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors ${viewMode === 'ALL_SCHOOL' ? 'bg-orange-100 border-2 border-orange-500 text-orange-700' : 'bg-gray-50'}`}
              >
                <div className="flex items-center gap-3"><Users size={20} /><div className="font-medium">全校大名单</div></div>
                {viewMode === 'ALL_SCHOOL' && <Check size={20} className="text-orange-600" />}
              </button>
              {availableClasses.filter(cls => cls.teacherId && cls.teacherId !== user?.id && cls.teacherId !== 'ALL').map((cls, index) => (
                <button
                  key={index}
                  onClick={() => { switchViewMode('SPECIFIC_CLASS', cls.teacherId, cls.teacherName, false); setIsClassDrawerOpen(false); }}
                  className={`w-full flex items-center justify-between p-4 rounded-xl transition-colors ${viewMode === 'SPECIFIC_CLASS' && selectedTeacherId === cls.teacherId ? 'bg-purple-100 border-2 border-purple-500 text-purple-700' : 'bg-gray-50'}`}
                >
                  <div className="flex items-center gap-3"><User size={20} /><div className="font-medium">{cls.teacherName}的班级</div></div>
                  {viewMode === 'SPECIFIC_CLASS' && selectedTeacherId === cls.teacherId && <Check size={20} className="text-purple-600" />}
                </button>
              ))}
            </div>
            <button onClick={() => setIsClassDrawerOpen(false)} className="w-full mt-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl">取消</button>
          </div>
        </>
      )}
    </div>
  );
};

export default Home;
