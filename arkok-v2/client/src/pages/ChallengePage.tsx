import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ChevronLeft, Plus, Trophy, Target, Users, Zap, Crown, Star, Sparkles, ArrowRight, X, Swords, CheckCircle2, UserCheck, Award, Loader2, Search, Calendar, MessageSquare, Clock, XCircle, ArrowLeft } from 'lucide-react'
import { apiService } from '../services/api.service'
import { useAuth } from '../context/AuthContext'
// 移除已删除的 MessageCenter 导入

interface Challenge {
  id: string
  title: string
  description: string
  type: 'PERSONAL' | 'GROUP' | 'CLASS'
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED'
  startDate: string
  endDate?: string
  rewardPoints: number
  rewardExp: number
  maxParticipants: number
  participantCount: number
  teachers: {
    name: string
  }
}

interface Student {
  id: string
  name: string
  className: string
  avatarUrl: string
}

interface Participant {
  id: string
  studentId: string
  challengeId: string
  status: string
  result?: 'COMPLETED' | 'FAILED'
  students: {
    id: string
    name: string
    avatarUrl: string
  }
}

const ChallengePage: React.FC = () => {
  const navigate = useNavigate()
  const { user: userInfo } = useAuth()

  // 状态管理
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)

  const [showCreateModal, setShowCreateModal] = useState(false)
  // 🆕 移除旧的结算模态框状态，现在卡片内直接判定
  const [participants, setParticipants] = useState<Participant[]>([])

  const [createLoading, setCreateLoading] = useState(false)

  // 表单状态
  const [newChallenge, setNewChallenge] = useState({
    title: '',
    description: '',
    type: 'PERSONAL' as 'PERSONAL' | 'CLASS',
    rewardPoints: 100,
    rewardExp: 50,
    studentIds: [] as string[]
  })
  const [publishMode, setPublishMode] = useState<'PERSONAL' | 'PUBLIC'>('PERSONAL')
  // 🆕 公开悬赏应战人选择
  const [selectedChallengerId, setSelectedChallengerId] = useState<string>('')
  const [showChallengerDropdown, setShowChallengerDropdown] = useState(false)

  // 学生选择下拉框 ref (用于点击外部关闭)
  const studentDropdownRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭学生选择下拉
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (studentDropdownRef.current && !studentDropdownRef.current.contains(event.target as Node)) {
        setShowCreateModal(false);
      }
    };
    if (showCreateModal) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCreateModal]);

  // 初始数据加载
  const fetchData = async (forceRefresh = false) => {
    const hasData = challenges.length > 0 || students.length > 0;
    if (!hasData) setLoading(true);

    try {
      const challengeUrl = `/challenges?schoolId=${userInfo?.schoolId}`;
      const studentUrl = `/students?schoolId=${userInfo?.schoolId}&limit=100`;

      // 🚀 SWR 第一阶段
      const [challengesRes, studentsRes] = await Promise.all([
        apiService.get<any>(challengeUrl, {}, { useCache: !forceRefresh }),
        apiService.get<any>(studentUrl, {}, { useCache: !forceRefresh })
      ]);

      const processData = (cRes: any, sRes: any) => {
        if (cRes.success || (cRes as any)._fromCache) {
          const cData = Array.isArray(cRes.data || cRes) ? cRes.data || cRes : (cRes.data as any)?.challenges || [];
          setChallenges(cData as Challenge[]);
        }
        if (sRes.success || (sRes as any)._fromCache) {
          const studentList = Array.isArray(sRes.data || sRes) ? sRes.data || sRes : (sRes.data as any)?.students || [];
          setStudents(studentList.map((s: any) => ({
            ...s,
            avatarUrl: s.avatarUrl || s.avatar_url || '/avatar.jpg'
          })));
        }
      };

      processData(challengesRes, studentsRes);

      // SWR 静默刷新
      const isFromCache = (challengesRes as any)._fromCache || (studentsRes as any)._fromCache;
      if (isFromCache) {
        setLoading(false);
        console.log('[SWR] ⚡ ChallengePage rendered from cache, revalidating...');
        Promise.all([
          apiService.get<any>(challengeUrl, {}, { useCache: false }),
          apiService.get<any>(studentUrl, {}, { useCache: false })
        ]).then(([fc, fs]) => {
          processData(fc, fs);
          console.log('[SWR] ✅ ChallengePage revalidated');
        });
      }

    } catch (error) {
      console.error('Fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // 🆕 loadParticipants 已移除 - 每个卡片自己加载参与者

  // 创建挑战
  const handleCreateChallenge = async () => {
    console.log('[DEBUG CHALLENGE] Start creation process', newChallenge);

    if (!newChallenge.title.trim() || !newChallenge.description.trim()) {
      console.warn('[DEBUG CHALLENGE] Validation failed: missing title or description');
      toast.error('请填写完整的挑战信息');
      return;
    }

    if (publishMode === 'PERSONAL' && newChallenge.studentIds.length === 0) {
      console.warn('[DEBUG CHALLENGE] Validation failed: no students selected for personal challenge');
      toast.error('请选择参与挑战的学生');
      return;
    }

    // 公开悬赏不需要预先选择应战人，发布后在卡片上添加

    setCreateLoading(true);
    try {
      console.log('[DEBUG CHALLENGE] Calling POST /challenges', {
        ...newChallenge,
        schoolId: userInfo?.schoolId,
        creatorId: userInfo?.userId || userInfo?.id
      });

      // 1. 创建挑战本身
      const res = await apiService.post('/challenges', {
        ...newChallenge,
        type: publishMode === 'PUBLIC' ? 'CLASS' : 'PERSONAL',
        schoolId: userInfo?.schoolId,
        creatorId: userInfo?.userId || userInfo?.id,
        status: 'ACTIVE' // 直接开启
      });

      console.log('[DEBUG CHALLENGE] API Response:', res);

      if (res.success) {
        const challengeId = (res.data as any).id;
        console.log('[DEBUG CHALLENGE] Challenge created successfully, ID:', challengeId);

        // 2. 如果是个人挑战且指定了学生，批量添加参与者
        if (publishMode === 'PERSONAL' && newChallenge.studentIds.length > 0) {
          await Promise.all(
            newChallenge.studentIds.map(studentId =>
              apiService.post('/challenges/join', {
                challengeId,
                studentId,
                schoolId: userInfo?.schoolId
              })
            )
          );
        }

        // 🆕 公开悬赏模式不需要预先添加应战人，待发布后在卡片上选择

        toast.success('挑战发布成功！');
        apiService.invalidateCache('/challenges');
        setShowCreateModal(false);
        fetchData(true);
        setNewChallenge({ title: '', description: '', type: 'PERSONAL', rewardPoints: 100, rewardExp: 50, studentIds: [] });
        setSelectedChallengerId(''); // 🆕 重置应战人选择
      }
    } catch (error) {
      toast.error('发布失败');
    } finally {
      setCreateLoading(false);
    }
  };

  // 🆕 直接判定单个学生结果（不需要确认模态框）
  const handleQuickSettle = async (challengeId: string, studentId: string, result: 'COMPLETED' | 'FAILED') => {
    try {
      const res = await apiService.post('/challenges/participant/batch', {
        challengeId,
        schoolId: userInfo?.schoolId,
        updates: [{ studentId, result }]
      })

      if (res.success) {
        toast.success(result === 'COMPLETED' ? '🎉 挑战成功！' : '挑战结束')
        apiService.invalidateCache('/challenges');
        // 刷新数据
        fetchData(true)
        // 更新本地参与者状态
        setParticipants(prev => prev.map(p =>
          p.studentId === studentId ? { ...p, result } : p
        ))
      }
    } catch (error) {
      toast.error('判定失败')
    }
  }

  // 🆕 取消公开悬赏（直接将挑战状态设为 COMPLETED，从大屏消失）
  const handleCancelBounty = async (challengeId: string) => {
    try {
      const res = await apiService.put(`/challenges/${challengeId}`, {
        schoolId: userInfo?.schoolId,
        status: 'COMPLETED'
      });
      if (res.success) {
        toast.success('悬赏已取消');
        apiService.invalidateCache('/challenges');
        fetchData(true);
      }
    } catch (error) {
      toast.error('取消失败');
    }
  };

  // 🆕 添加应战人到公开悬赏
  const handleAddChallenger = async (challengeId: string, studentId: string) => {
    try {
      const res = await apiService.post('/challenges/join', {
        challengeId,
        studentId,
        schoolId: userInfo?.schoolId
      });
      if (res.success) {
        toast.success('应战人已添加');
        apiService.invalidateCache('/challenges');
        fetchData(true);
      }
    } catch (error) {
      toast.error('添加失败');
    }
  };

  // 🆕 紧凑型挑战卡片 - 直接显示参与者和成功/失败按钮
  // 🆕 iOS 极简风格挑战卡片 - 横向高密度布局
  // 子组件：挑战参与者判定列表 (高密度 iOS 风格) + 公开悬赏扩展
  const ChallengeParticipants: React.FC<{ challengeId: string, rewardExp: number, isPublicBounty?: boolean }> = ({ challengeId, rewardExp, isPublicBounty = false }) => {
    const [cardParticipants, setCardParticipants] = useState<Participant[]>([]);
    const [loadingP, setLoadingP] = useState(false);
    const [showAddChallenger, setShowAddChallenger] = useState(false);

    useEffect(() => {
      const load = async () => {
        setLoadingP(true);
        try {
          const res = await apiService.get(`/challenges/${challengeId}/participants?schoolId=${userInfo?.schoolId}`);
          if (res.success) {
            setCardParticipants((res.data as any[]).map((p: any) => ({
              ...p,
              students: {
                ...p.students,
                avatarUrl: p.students?.avatarUrl || p.students?.avatar_url || '/avatar.jpg'
              }
            })));
          }
        } catch (e) {
          console.error(e);
        } finally {
          setLoadingP(false);
        }
      };
      load();
    }, [challengeId]);

    if (loadingP) return <div className="text-[10px] font-bold text-slate-300 py-2 text-center">读取选手中...</div>;


    // 🆕 公开悬赏模式：无应战人时显示添加按钮和取消按钮
    if (isPublicBounty && cardParticipants.length === 0) {
      return (
        <div className="space-y-2">
          {/* 添加应战人下拉 */}
          <div className="relative">
            <button
              onClick={() => setShowAddChallenger(!showAddChallenger)}
              className="w-full bg-cyan-50 text-cyan-600 rounded-lg p-2 text-[10px] font-bold flex items-center justify-center gap-1"
            >
              <Swords size={12} /> 选择应战人
            </button>
            {showAddChallenger && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg border shadow-lg z-20 max-h-[150px] overflow-y-auto">
                {students.map(s => (
                  <div
                    key={s.id}
                    onClick={() => {
                      handleAddChallenger(challengeId, s.id);
                      setShowAddChallenger(false);
                    }}
                    className="p-2 text-[10px] font-bold text-slate-700 hover:bg-cyan-50 cursor-pointer border-b last:border-b-0"
                  >
                    {s.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* 取消悬赏按钮 */}
          <button
            onClick={() => handleCancelBounty(challengeId)}
            className="w-full bg-slate-100 text-slate-400 rounded-lg p-2 text-[10px] font-bold"
          >
            取消悬赏
          </button>
        </div>
      );
    }

    // 个人挑战无选手
    if (cardParticipants.length === 0) return <div className="text-[10px] font-bold text-slate-300 py-2 text-center">暂无选手</div>;

    return (
      <div className="space-y-2">
        {cardParticipants.map(p => {
          const hasResult = p.result === 'COMPLETED' || p.result === 'FAILED';
          return (
            <div key={p.id} className="flex items-center justify-between bg-[#F8F9FB] rounded-xl p-2.5">
              <div className="flex items-center gap-2">
                <img src={p.students.avatarUrl} className="w-7 h-7 rounded-full object-cover" />
                <span className="text-[11px] font-bold text-slate-700">{p.students.name}</span>
              </div>

              {hasResult ? (
                <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${p.result === 'COMPLETED' ? 'text-green-500 bg-green-50' : 'text-slate-300 bg-slate-100'}`}>
                  {p.result === 'COMPLETED' ? '成功' : '未达成'}
                </span>
              ) : (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleQuickSettle(challengeId, p.studentId, 'COMPLETED')}
                    className="h-7 px-4 bg-slate-800 text-white rounded-lg text-[10px] font-bold active:scale-95"
                  >
                    成功
                  </button>
                  <button
                    onClick={() => handleQuickSettle(challengeId, p.studentId, 'FAILED')}
                    className="h-7 px-4 bg-slate-100 text-slate-400 rounded-lg text-[10px] font-bold active:scale-95"
                  >
                    失败
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen w-full bg-[#F5F7FA]">
      {/* 顶部背景 */}
      <div
        className="h-40 absolute top-0 left-0 w-full z-0 rounded-b-3xl"
        style={{ background: 'linear-gradient(135deg, #FF9A5E 0%, #FF502E 100%)' }}
      ></div>

      {/* 导航栏 */}
      <header className="relative z-10 flex justify-between items-center px-5 pt-12 pb-4 text-white">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 flex items-center justify-center opacity-90 active:scale-95"
        >
          <X size={24} />
        </button>
        <h1 className="text-lg font-bold">挑战任务</h1>
        <button
          onClick={() => navigate('/habits')}
          className="w-10 h-10 flex items-center justify-center opacity-90 active:scale-95"
        >
          <ArrowRight size={24} />
        </button>
      </header>

      <main className="p-4 space-y-4 relative z-10">
        {/* 发布挑战卡片 - 表单始终显示 */}
        <section className="bg-white rounded-[20px] p-5 shadow-sm border border-slate-50">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setPublishMode('PERSONAL')}
                className={`relative pb-1 text-sm font-bold transition-all ${publishMode === 'PERSONAL' ? 'text-slate-800' : 'text-slate-300'}`}
              >
                发布个人挑战
                {publishMode === 'PERSONAL' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-full" />}
              </button>
              <button
                onClick={() => setPublishMode('PUBLIC')}
                className={`relative pb-1 text-sm font-bold transition-all ${publishMode === 'PUBLIC' ? 'text-slate-800' : 'text-slate-300'}`}
              >
                公开悬赏区
                {publishMode === 'PUBLIC' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-1 bg-orange-500 rounded-full" />}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <input
              type="text"
              placeholder="挑战名称 (例如：每日朗读打卡)"
              value={newChallenge.title}
              onChange={e => setNewChallenge({ ...newChallenge, title: e.target.value })}
              className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:ring-1 focus:ring-orange-200"
            />
            <textarea
              placeholder="具体要求..."
              value={newChallenge.description}
              onChange={(e) => setNewChallenge({ ...newChallenge, description: e.target.value })}
              rows={2}
              className="w-full bg-slate-50 border-none rounded-xl p-3 text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:ring-1 focus:ring-orange-200 resize-none"
            />

            {/* 学生选择 - 仅在个人挑战下显示 */}
            {publishMode === 'PERSONAL' && (
              <div className="relative" ref={studentDropdownRef}>
                <div
                  onClick={() => setShowCreateModal(!showCreateModal)}
                  className="w-full bg-orange-50 text-orange-600 rounded-xl p-3 flex items-center justify-between border border-orange-100 cursor-pointer active:scale-[0.99] transition-all"
                >
                  <span className="font-bold text-sm">
                    {newChallenge.studentIds.length > 0 ? `已选 ${newChallenge.studentIds.length} 位学生` : '选择参与学生'}
                  </span>
                  <Plus size={18} strokeWidth={2.5} className={`opacity-60 transition-transform ${showCreateModal ? 'rotate-45' : ''}`} />
                </div>

                {showCreateModal && (
                  <div className="mt-2 bg-white rounded-2xl border border-slate-100 shadow-lg overflow-hidden animate-in slide-in-from-top-2">
                    <div className="flex items-center justify-between p-3 border-b border-slate-50">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                        <span className="text-sm font-bold text-slate-800">学生列表</span>
                      </div>
                      <button
                        onClick={() => {
                          if (newChallenge.studentIds.length === students.length) {
                            setNewChallenge({ ...newChallenge, studentIds: [] });
                          } else {
                            setNewChallenge({ ...newChallenge, studentIds: students.map(s => s.id) });
                          }
                        }}
                        className="text-[10px] font-bold text-orange-500"
                      >
                        {newChallenge.studentIds.length === students.length ? '取消全选' : '一键全选'}
                      </button>
                    </div>
                    <div className="max-h-[180px] overflow-y-auto">
                      {students.map(s => {
                        const isSelected = newChallenge.studentIds.includes(s.id);
                        return (
                          <div
                            key={s.id}
                            onClick={() => {
                              const ids = isSelected
                                ? newChallenge.studentIds.filter(id => id !== s.id)
                                : [...newChallenge.studentIds, s.id];
                              setNewChallenge({ ...newChallenge, studentIds: ids });
                            }}
                            className="flex items-center justify-between p-3 border-b border-slate-50 last:border-b-0 cursor-pointer hover:bg-slate-50 transition-colors"
                          >
                            <span className="text-sm font-bold text-slate-700">{s.name}</span>
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'border-orange-500 bg-orange-500' : 'border-slate-200'}`}>
                              {isSelected && <CheckCircle2 size={12} className="text-white" strokeWidth={3} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 公开悬赏模式 - 发布后在卡片上选择应战人，此处不再选择 */}

            {/* 奖励设置 - 紧凑单行 */}
            <div className="flex items-center gap-3 text-[10px]">
              <div className="flex items-center gap-1 bg-slate-50 rounded-md px-2 py-1">
                <Star size={10} className="text-amber-400 fill-amber-400" />
                <span className="text-slate-400 font-bold">经验</span>
                <input
                  type="number"
                  value={newChallenge.rewardExp}
                  onChange={(e) => setNewChallenge({ ...newChallenge, rewardExp: parseInt(e.target.value) || 0 })}
                  className="w-10 bg-transparent border-none text-[11px] font-bold text-slate-700 text-right focus:ring-0 outline-none"
                />
              </div>
              <div className="flex items-center gap-1 bg-slate-50 rounded-md px-2 py-1">
                <Trophy size={10} className="text-orange-500" />
                <span className="text-slate-400 font-bold">积分</span>
                <input
                  type="number"
                  value={newChallenge.rewardPoints}
                  onChange={(e) => setNewChallenge({ ...newChallenge, rewardPoints: parseInt(e.target.value) || 0 })}
                  className="w-10 bg-transparent border-none text-[11px] font-bold text-slate-700 text-right focus:ring-0 outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleCreateChallenge}
              disabled={createLoading || !newChallenge.title.trim() || (publishMode === 'PERSONAL' && newChallenge.studentIds.length === 0)}
              className="w-full h-11 bg-gradient-to-r from-[#FF9A5E] to-[#FF502E] text-white rounded-[44px] text-sm font-bold shadow-lg shadow-orange-200 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {createLoading ? '发布中...' : publishMode === 'PUBLIC' ? '发布公开悬赏' : '发布挑战'}
            </button>
          </div>
        </section>

        <div className="space-y-1.5">
          {/* 🆕 根据 publishMode 过滤挑战列表：公开悬赏区只显示 CLASS，个人挑战只显示 PERSONAL */}
          {challenges
            .filter(c => publishMode === 'PUBLIC' ? c.type === 'CLASS' : c.type === 'PERSONAL')
            .map(c => (
              <div key={c.id} className="bg-white rounded-lg p-2.5 shadow-sm border border-slate-50 flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-md bg-orange-50 flex items-center justify-center text-orange-600 text-[9px] font-bold">
                      {c.type === 'CLASS' ? '班' : '个'}
                    </div>
                    <div>
                      <h3 className="text-[11px] font-bold text-slate-800">{c.title}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {c.description && (
                      <span className="text-[9px] text-slate-400 max-w-[120px] truncate">{c.description}</span>
                    )}
                    {c.status === 'COMPLETED' && (
                      <span className="text-[8px] font-bold text-slate-300 bg-slate-50 px-1 py-0.5 rounded">已结束</span>
                    )}
                  </div>
                </div>

                {/* 判定列表 (紧凑型) */}
                {c.status !== 'COMPLETED' && (
                  <ChallengeParticipants challengeId={c.id} rewardExp={c.rewardExp} isPublicBounty={c.type === 'CLASS'} />
                )}
              </div>
            ))}

          {challenges.length === 0 && !loading && (
            <div className="py-16 text-center text-slate-300">
              <Target size={40} className="mx-auto mb-2 opacity-20" />
              <p className="text-xs font-bold">暂无活动中的挑战</p>
            </div>
          )}
        </div>
      </main>

      {/* 挑战发布模态框已移除，改为内联展开表单 */}
    </div>
  )
}


export default ChallengePage
