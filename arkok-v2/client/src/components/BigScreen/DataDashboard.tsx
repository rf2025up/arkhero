import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Swords, Target, CheckCircle2, XCircle, Award, Rocket, Zap, TrendingUp, Star, Layout } from 'lucide-react';
import { apiService } from '../../services/api.service';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import ScaleContainer from './ScaleContainer';
import StudentDetailOverlay from './StudentDetailOverlay';

// 🆕 从 localStorage 获取用户信息（数据隔离关键）
const getUserInfo = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            return JSON.parse(userStr);
        } catch {
            return null;
        }
    }
    return null;
};

// --- 类型定义 ---
interface Student {
    id: string;
    name: string;
    avatarUrl?: string;
    level: number;
    levelTitle: string;     // 等级名称（如：融会贯通）
    exp: number;
    expProgress: number;
    expForNextLevel: number;
    points: number;
    rank: number;
    perfectStreak: number; // 🆕 连胜火焰数据
}

interface PKResult {
    id: string;
    winner: { id: string; name: string; avatarUrl?: string; score: number };
    loser: { id: string; name: string; avatarUrl?: string; score: number };
    topic: string;
    finishedAt: string;
    rewardPoints?: number;
    rewardExp?: number;
}

interface ChallengeResult {
    id: string;
    studentName: string;
    title: string;
    success: boolean;
    expAwarded: number;
    finishedAt: string;
}

interface ActivityItem {
    id: string;
    type: 'habit' | 'badge' | 'challenge' | 'pk' | 'progress' | 'methodology' | 'growth' | 'personalized' | 'special' | 'task';
    studentName: string;
    content: string;
    expAwarded: number;
    timestamp: string;
}

interface BadgeItem {
    id: string;
    badgeName: string;
    badgeIcon: string;
    badgeDescription: string;
    studentName: string;
    earnedAt: string;
}

interface BigscreenData {
    schoolName?: string;
    taskCompletionRate: number;
    students: Student[];
    pkResults: PKResult[];
    challengeResults: ChallengeResult[];
    activities: ActivityItem[];
    publicBounties?: { title: string, points: number, exp: number }[];
    recentBadges: BadgeItem[];
    recentSkillUps?: {
        studentName: string;
        skillCode: string;
        skillName: string;
        level: number;
        levelTitle: string;
    }[];
}

// --- CSS 样式 ---
const styles = `
  /* 基础玻璃态 */
  .glass-card {
    background: rgba(30, 41, 59, 0.6);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  }

  /* PK 区域新样式 */
  .pk-bg-glow {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: 
        radial-gradient(circle at 10% 20%, rgba(255, 94, 87, 0.15) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 40%);
    z-index: 0;
    pointer-events: none;
  }
  
  .vs-logo {
    font-size: 64px;
    font-weight: 900;
    font-style: italic;
    background: linear-gradient(135deg, #FF5E57 0%, #FFFFFF 50%, #3B82F6 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    opacity: 0.9;
    letter-spacing: -4px;
    text-shadow: 0 10px 30px rgba(0,0,0,0.5);
    line-height: 1;
  }

  .btn-match {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.2);
    color: #fff;
    padding: 8px 24px;
    border-radius: 20px;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .dot-blink {
    width: 6px; height: 6px; background: #4ADE80; border-radius: 50%;
    animation: blink 2s infinite;
  }
  @keyframes blink { 0% {opacity: 1;} 50% {opacity: 0.3;} 100% {opacity: 1;} }

  /* 悬赏任务卡片新样式 */
  .task-card {
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.03) 0%, rgba(255, 255, 255, 0.01) 100%);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 12px;
    padding: 16px 20px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    transition: all 0.3s;
    position: relative;
    overflow: hidden;
  }
  .task-card::before {
    content: '';
    position: absolute;
    left: 0; top: 0; bottom: 0;
    width: 3px;
    background: #94A3B8;
    opacity: 0.5;
  }
  .task-card.gold::before { background: #FFD700; opacity: 1; box-shadow: 2px 0 10px rgba(255, 215, 0, 0.3); }
  .task-card.gold { 
    background: linear-gradient(90deg, rgba(255, 215, 0, 0.05) 0%, rgba(0,0,0,0) 100%); 
    border-color: rgba(255, 215, 0, 0.1); 
  }
  
  .task-icon-box {
    width: 36px; height: 36px;
    border-radius: 8px;
    background: rgba(0,0,0,0.3);
    display: flex; align-items: center; justify-content: center;
    font-size: 16px;
    border: 1px solid rgba(255,255,255,0.1);
    margin-right: 12px;
  }
  
  .reward-tag {
    font-family: 'DIN Alternate', sans-serif;
    font-size: 13px;
    padding: 4px 10px;
    border-radius: 6px;
    font-weight: 600;
    display: flex; align-items: center; gap: 4px;
    white-space: nowrap;
  }
  .reward-gold {
    background: rgba(255, 215, 0, 0.1);
    color: #FFD700;
    border: 1px solid rgba(255, 215, 0, 0.2);
    box-shadow: 0 0 10px rgba(255, 215, 0, 0.1);
  }
  .reward-exp {
    background: rgba(59, 130, 246, 0.1);
    color: #60A5FA;
    border: 1px solid rgba(59, 130, 246, 0.2);
  }

  /* 现有 helper */
  .text-glow-gold { text-shadow: 0 0 12px rgba(253, 224, 71, 0.6); }
  .lv-tag-gold {
    background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    color: #0f172a;
    padding: 1px 3px;
    border-radius: 2px;
    font-size: 8px;
    font-weight: 900;
  }
`;

// 内容限制
const LIMITS = {
    VISIBLE_STUDENTS: 8,
    ACTIVITIES: 12,
    BOUNTIES: 3, // 显示3条
};

const DataDashboard: React.FC = () => {
    // ... [Previous hooks and logic remain unchanged] ...
    const [data, setData] = useState<BigscreenData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [scrollIndex, setScrollIndex] = useState(0);
    const [pkIndex, setPkIndex] = useState(0);
    const [recentAchievements, setRecentAchievements] = useState<any[]>([]);
    const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

    useEffect(() => {
        const socket = io();
        socket.on('connect', () => console.log('✅ BigScreen Socket Connected'));
        socket.on('skill_levelup', (data) => {
            console.log('🎉 Achievement:', data);
            setRecentAchievements(prev => [data, ...prev].slice(0, 3));
        });
        return () => { socket.disconnect(); };
    }, []);

    const [searchParams] = useSearchParams();
    const urlSchoolId = searchParams.get('schoolId');

    // 🆕 优先使用用户登录信息的 schoolId，URL 参数作为兜底
    const userInfo = getUserInfo();
    const schoolId = userInfo?.schoolId || urlSchoolId;

    const fetchData = useCallback(async () => {
        if (!schoolId) {
            console.warn('[DataDashboard] No schoolId available, skipping fetch');
            setIsLoading(false);
            return;
        }
        try {
            const url = `/dashboard/bigscreen?schoolId=${schoolId}`;
            const response = await apiService.get<BigscreenData>(url);
            if (response.success && response.data) setData(response.data);
        } catch (err) {
            console.error('[DataDashboard] Error:', err);
        } finally {
            setIsLoading(false);
        }
    }, [schoolId]);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 15000);
        return () => clearInterval(interval);
    }, [fetchData]);

    useEffect(() => {
        if (data?.recentSkillUps) {
            setRecentAchievements(data.recentSkillUps.slice(0, 4));
        }
    }, [data]);

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // 循环展示学生
    useEffect(() => {
        if (!data || data.students.length <= LIMITS.VISIBLE_STUDENTS) return;
        const timer = setInterval(() => {
            setScrollIndex(prev => {
                const maxIndex = Math.max(0, data.students.length - LIMITS.VISIBLE_STUDENTS);
                return prev >= maxIndex ? 0 : prev + 5;
            });
        }, 4000);
        return () => clearInterval(timer);
    }, [data]);

    // PK
    useEffect(() => {
        if (!data || data.pkResults.length <= 1) return;
        const timer = setInterval(() => {
            setPkIndex(prev => (prev + 1) % data.pkResults.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [data]);

    if (isLoading && !data) {
        return (
            <div className="h-screen w-screen flex items-center justify-center" style={{ background: '#0F172A' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    const currentPK = data?.pkResults[pkIndex];

    return (
        <>
        <div className="w-screen h-screen overflow-hidden text-white flex flex-col p-[1.5vh] px-[1vw] pt-[7.5vh] gap-[1.5vh]"
            style={{
                backgroundColor: '#0F172A',
                backgroundImage: `
          radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%),
          radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%),
          radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%)
        `,
                fontFamily: "'SF Pro Display', system-ui, sans-serif"
            }}>
            <style>{styles}</style>

            <main className="flex-1 grid grid-cols-12 gap-[1.5vw] min-h-0">

                {/* 左侧：等级天梯 */}
                <div className="col-span-3 glass-card rounded-[2vh] p-[2vh] flex flex-col min-h-0">
                    <div className="flex justify-between items-center mb-[1vh]">
                        <h2 className="text-[2vh] font-bold flex items-center gap-2 text-glow-gold">
                            <Trophy className="text-yellow-400 w-[2.5vh] h-[2.5vh]" /> 等级天梯
                        </h2>
                        <span className="text-[1.2vh] bg-white/10 px-3 py-1 rounded text-slate-300">
                            共 {data?.students.length || 0} 人
                        </span>
                    </div>

                    <div className="flex-1 flex flex-col min-h-0">
                        {/* 冠军面板 */}
                        {data?.students[0] && (
                            <div
                                className="mb-[2vh] text-center shrink-0 cursor-pointer hover:bg-white/5 rounded-[2vh] p-[1vh] transition-colors"
                                onClick={() => setSelectedStudentId(data.students[0].id)}
                            >
                                <div className="relative inline-block mb-[1vh]">
                                    <div className="absolute -top-[2vh] left-1/2 -translate-x-1/2 z-20">
                                        <span className="text-[4vh]">👑</span>
                                    </div>
                                    <div className="w-[10vh] h-[10vh] rounded-full border-4 border-yellow-500/50 p-1 bg-slate-900 shadow-[0_0_25px_rgba(234,179,8,0.3)] relative">
                                        <img
                                            src={data.students[0].avatarUrl || "/avatar.jpg"}
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                        {/* 🆕 冠军连胜火焰 - 更大更显眼 */}

                                    </div>
                                    <div className="absolute -bottom-1 right-0 bg-yellow-500 text-slate-900 text-[1.2vh] font-black w-[2.5vh] h-[2.5vh] rounded-full flex items-center justify-center border-2 border-slate-900">
                                        01
                                    </div>
                                </div>
                                <h3 className="text-[2vh] font-bold tracking-wide text-white flex items-center justify-center gap-2">
                                    {data.students[0].name}
                                    <span className="lv-tag-gold">Lv.{data.students[0].level}</span>
                                </h3>
                                <div className="mt-[1vh] px-4">
                                    <div className="flex justify-between text-[1.2vh] mb-1">
                                        <span className="text-slate-400 font-bold">等级经验值</span>
                                        <span className="text-blue-400 font-mono">{data.students[0].expProgress}%</span>
                                    </div>
                                    <div className="h-[0.8vh] bg-slate-800 rounded-full overflow-hidden border border-white/5">
                                        <div className="h-full bg-blue-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                                            style={{ width: `${data.students[0].expProgress}%` }} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 列表 */}
                        <div className="flex-1 overflow-hidden relative">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={scrollIndex}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    transition={{ duration: 0.5 }}
                                    className="space-y-[1vh] absolute inset-0 overflow-y-auto no-scrollbar"
                                >
                                    {(() => {
                                        const restStudents = data?.students.slice(1) || [];
                                        const displayCount = window.innerHeight < 800 ? 5 : 6; // 稍微调整显示数量
                                        const startIdx = scrollIndex % Math.max(1, restStudents.length);
                                        const displayStudents = [];
                                        for (let i = 0; i < Math.min(displayCount, restStudents.length); i++) {
                                            displayStudents.push(restStudents[(startIdx + i) % restStudents.length]);
                                        }
                                        return displayStudents.map((student) => (
                                            <div
                                                key={student.id}
                                                className="flex items-center gap-[1vw] p-[1vh] rounded-xl bg-white/5 border border-white/5 cursor-pointer hover:bg-white/10 transition-colors"
                                                onClick={() => setSelectedStudentId(student.id)}
                                            >
                                                <div className="font-mono text-[1.8vh] font-bold text-slate-500 w-[2vw] text-center">
                                                    {String(student.rank).padStart(2, '0')}
                                                </div>
                                                <div className="w-[5vh] h-[5vh] rounded-full border border-white/10 shrink-0 relative">
                                                    <img src={student.avatarUrl || "/avatar.jpg"} className="w-full h-full rounded-full object-cover" />
                                                    {/* 🆕 列表项连胜火焰 */}

                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center mb-0.5">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-bold text-[1.6vh] text-slate-100">{student.name}</span>
                                                            <span className="lv-tag-gold">Lv.{student.level}</span>
                                                        </div>
                                                        <span className="text-[1.4vh] font-mono font-bold text-cyan-400">
                                                            积分 {student.points.toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="h-[0.6vh] bg-slate-800 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${student.expProgress}%` }} />
                                                    </div>
                                                </div>
                                            </div>
                                        ));
                                    })()}
                                </motion.div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

                {/* 中间区：PK 与 悬赏 */}
                <div className="col-span-6 flex flex-col gap-[2vh] min-h-0">

                    {/* 1. 巅峰对决 (PK) - 恢复旧 UI 适配流式布局 */}
                    <div className="flex-[4] glass-card rounded-[2vh] relative overflow-hidden flex flex-col justify-center">
                        <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 to-blue-600/20 z-0" />
                        <div className="relative z-10 w-full h-full flex flex-col p-[2vh]">
                            <div className="flex justify-between items-center mb-[1vh] shrink-0">
                                <div className="text-[2vh] font-bold text-red-400 uppercase flex items-center gap-2">
                                    <Swords className="w-[2.5vh] h-[2.5vh]" /> 巅峰对决
                                </div>
                                <div className="text-[1.4vh] font-mono text-slate-400">今日 {data?.pkResults.length || 0} 场</div>
                            </div>

                            <div className="flex-1 flex items-center justify-center w-full">
                                {!currentPK ? (
                                    <div className="text-slate-500 text-[2vh]">暂无 PK 记录</div>
                                ) : (
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={pkIndex}
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className="flex items-center justify-between w-full px-[4vw] mt-[2vh]"
                                        >
                                            <div className="flex flex-col items-center flex-1">
                                                <div className="relative">
                                                    <div className="absolute -top-[3vh] left-1/2 -translate-x-1/2 text-yellow-400 drop-shadow-lg animate-bounce z-20">
                                                        <span className="text-[3vh]">👑</span>
                                                    </div>
                                                    <div className="w-[10vh] h-[10vh] rounded-full border-4 border-yellow-500 shadow-[0_0_30px_rgba(234,179,8,0.5)] overflow-hidden">
                                                        <img src={currentPK.winner.avatarUrl || '/avatar.jpg'} className="w-full h-full object-cover" />
                                                    </div>
                                                </div>
                                                <div className="mt-[1vh] text-[2.5vh] font-bold text-white text-center whitespace-nowrap">{currentPK.winner.name}</div>
                                            </div>

                                            <div className="flex flex-col items-center gap-[1vh] mx-[2vw] shrink-0">
                                                <div className="text-[6vh] font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-blue-500 italic pr-2 leading-none">VS</div>
                                                <div className="text-[1.5vh] font-bold text-slate-400">{currentPK.topic}</div>
                                                <div className="flex items-center gap-[1vw] bg-white/10 px-[1.5vw] py-[0.8vh] rounded-full mt-[1vh] border border-white/10 whitespace-nowrap">
                                                    <span className="text-yellow-400 font-bold text-[1.4vh]">+{currentPK.rewardPoints || 100} 积分</span>
                                                    <span className="w-px h-[1.5vh] bg-white/20"></span>
                                                    <span className="text-blue-400 font-bold text-[1.4vh]">+{currentPK.rewardExp || 50} 经验</span>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-center flex-1">
                                                <div className="w-[10vh] h-[10vh] rounded-full border-4 border-slate-600 grayscale brightness-50 overflow-hidden">
                                                    <img src={currentPK.loser.avatarUrl || '/avatar.jpg'} className="w-full h-full object-cover" />
                                                </div>
                                                <div className="mt-[1vh] text-[2.5vh] font-bold text-slate-500 text-center whitespace-nowrap">{currentPK.loser.name}</div>
                                            </div>
                                        </motion.div>
                                    </AnimatePresence>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 2. 本周悬赏 (Bounty) - 使用新 UI 适配流式布局 */}
                    <div className="flex-[6] glass-card rounded-[2vh] p-[2vh] flex flex-col min-h-0">
                        <div className="flex justify-center items-center mb-[1.5vh] text-yellow-500 font-bold text-[2.2vh]">
                            <div className="flex items-center gap-2">
                                <Target className="w-[3vh] h-[3vh]" /> 本周悬赏令
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden relative">
                            {(data?.publicBounties || []).length === 0 ? (
                                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
                                    <div className="text-[4vh] mb-[1vh] opacity-50">🎯</div>
                                    <div className="text-[1.8vh]">暂无全班悬赏任务</div>
                                </div>
                            ) : (
                                <div className="absolute inset-0 overflow-y-auto pr-2 custom-scrollbar space-y-[2vh] py-[1vh]"> {/* 增加间距 */}
                                    {data?.publicBounties.slice(0, LIMITS.BOUNTIES).map((bounty, idx) => (
                                        <div key={idx} className={`task-card ${idx === 0 ? 'gold' : ''} p-[2vh]`}> {/* 增加卡片内边距 */}
                                            <div className="flex items-center">
                                                <div className="task-icon-box w-[5vh] h-[5vh] text-[2.5vh] text-blue-200 mr-[1.5vw]">
                                                    {idx === 0 ? '🏆' : '🧩'}
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <div className="text-[2vh] font-bold text-white tracking-wide">
                                                        {bounty.title}
                                                    </div>
                                                    {idx === 0 && (
                                                        <div className="flex items-center gap-2 text-[1.4vh] text-slate-400">
                                                            <div className="w-[6vw] h-[0.6vh] bg-white/10 rounded-full overflow-hidden">
                                                                <div className="h-full bg-yellow-500 w-[20%]"></div>
                                                            </div>
                                                            <span>进行中</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex gap-[0.5vw]">
                                                {bounty.points > 0 && (
                                                    <div className="reward-tag reward-gold text-[1.6vh] py-[0.8vh] px-[1.2vh]">
                                                        ⚡ +{bounty.points} 积分
                                                    </div>
                                                )}
                                                {bounty.exp > 0 && (
                                                    <div className="reward-tag reward-exp text-[1.6vh] py-[0.8vh] px-[1.2vh]">
                                                        ⬆ +{bounty.exp} 经验
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* 右侧：实时动态 */}
                <div className="col-span-3 flex flex-col gap-[2vh] min-h-0">
                    {/* 实时动态 - 新版极简风格 */}
                    <div className="flex-[6] glass-card rounded-[2vh] p-[1.5vh] flex flex-col min-h-0 border-t border-cyan-500/30 bg-gradient-to-br from-slate-900/80 to-slate-800/50">
                        <div className="flex justify-between items-center mb-[1.5vh]">
                            <h2 className="text-[2vh] font-bold flex items-center gap-2 text-yellow-400">
                                <Zap className="w-[2.2vh] h-[2.2vh]" /> 实时动态
                            </h2>
                        </div>
                        <div className="flex-1 overflow-hidden relative">
                            <div className="absolute inset-0 overflow-y-auto pr-2 custom-scrollbar space-y-[1.2vh]">
                                {(data?.activities || [])
                                    .filter(a => ['habit', 'methodology', 'growth', 'progress', 'challenge'].includes(a.type))
                                    .slice(0, LIMITS.ACTIVITIES)
                                    .map(activity => {
                                        // 根据类型生成动态文案
                                        let actionText = '完成';
                                        let suffix = '';

                                        if (activity.type === 'methodology' || activity.content?.includes('点亮')) {
                                            actionText = '点亮';
                                            suffix = ' 成就';
                                        } else if (activity.type === 'challenge' || activity.content?.includes('PK') || activity.content?.includes('获胜')) {
                                            actionText = '在';
                                            suffix = '获胜';
                                        }

                                        // 提取标签内容（如【英语单词默写】）
                                        const labelMatch = activity.content?.match(/【[^】]+】/);
                                        const label = labelMatch ? labelMatch[0] : activity.content;

                                        return (
                                            <div key={activity.id} className="flex items-center gap-[0.8vh] py-[1vh] px-[0.5vw] rounded-xl hover:bg-white/5 transition-colors">
                                                {/* 蓝色圆点指示器 */}
                                                <div className="w-[1.2vh] h-[1.2vh] rounded-full bg-cyan-400 shrink-0 shadow-lg shadow-cyan-400/50" />

                                                {/* 内容 - 紧凑布局 */}
                                                <div className="flex-1 text-[1.6vh] text-slate-200 flex items-center">
                                                    <span className="font-bold text-white shrink-0">{activity.studentName}</span>
                                                    <span className="text-slate-400 mx-[0.5vh] shrink-0">{actionText}</span>
                                                    <span className="text-cyan-300 font-bold truncate">{label}</span>
                                                    {suffix && <span className="text-slate-400 shrink-0">{suffix}</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>
                    </div>

                    {/* 成就 */}
                    <div className="flex-[4] glass-card rounded-[2vh] p-[1.5vh] flex flex-col min-h-0 border-t border-yellow-500/30 bg-gradient-to-br from-yellow-900/20 to-transparent">
                        <div className="flex justify-between items-center mb-[1vh]">
                            <h2 className="text-[1.6vh] font-bold flex items-center gap-2 text-yellow-500/80">
                                <Award className="w-[2vh] h-[2vh]" /> 成就解锁
                            </h2>
                            <span className="text-[0.9vh] text-slate-500 font-black tracking-widest uppercase italic">LATEST</span>
                        </div>
                        <div className="flex-1 overflow-hidden relative">
                            <AnimatePresence>
                                <div className="absolute inset-0 space-y-[0.8vh]">
                                    {recentAchievements.map((ach) => (
                                        <motion.div
                                            key={`${ach.studentId}-${ach.skillCode}`}
                                            layout
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -20 }}
                                            className="bg-gradient-to-r from-yellow-500/15 to-orange-500/15 border border-yellow-500/20 p-[0.8vh] rounded-xl flex items-center gap-[0.5vw]"
                                        >
                                            <div className="w-[2.8vh] h-[2.8vh] rounded-full bg-slate-900 border border-yellow-500/50 flex items-center justify-center text-[1.4vh] text-yellow-500 font-bold shrink-0">
                                                {ach.skillName?.[0]}
                                            </div>
                                            <div className="min-w-0 flex-1 flex items-center justify-between">
                                                <div className="flex items-center gap-2 min-w-0">
                                                    <span className="text-[1.4vh] font-bold text-yellow-200 shrink-0 w-[7vh] tracking-tight">{ach.studentName}</span>
                                                    <span className="text-[1.2vh] text-yellow-500/80 truncate">点亮 {ach.skillName} · {ach.levelTitle}</span>
                                                </div>
                                                <span className="text-[1vh] bg-yellow-500 text-black px-1.5 rounded font-black shrink-0 ml-2">Lv.{ach.level}</span>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </AnimatePresence>
                        </div>
                    </div>
                </div>

            </main>

            <footer className="h-[20vh] shrink-0 glass-card rounded-[2.5vh] overflow-hidden relative flex">
                <div className="w-[8vh] h-full flex flex-col items-center justify-center gap-[1vh] bg-slate-900/50 border-r border-white/10 z-20">
                    <Award className="w-[3vh] h-[3vh] text-yellow-400 mb-[0.5vh]" />
                    <div className="flex flex-col items-center text-yellow-400 font-bold text-[1.4vh] leading-tight gap-0.5">
                        <span>勋</span><span>章</span><span>墙</span>
                    </div>
                </div>
                <div className="flex-1 relative overflow-hidden flex items-center bg-slate-900/30">
                    {data?.recentBadges && data.recentBadges.length > 0 ? (
                        <motion.div
                            className="flex gap-[2vw] px-[2vw]"
                            animate={{ x: ['0%', '-50%'] }}
                            transition={{ duration: 120, repeat: Infinity, ease: 'linear' }}
                        >
                            {[...data.recentBadges, ...data.recentBadges].map((badge, i) => (
                                <div key={`${badge.id}-${i}`} className="w-[42vh] h-[16vh] flex-shrink-0 bg-slate-800/80 border border-yellow-500/30 rounded-2xl p-[1.5vh] flex gap-[2vh] items-center shadow-xl group hover:border-yellow-500/60 transition-colors">
                                    <div className="flex flex-col items-center gap-[1vh] shrink-0 w-[10vh]">
                                        <div className="w-[9vh] h-[9vh] rounded-full border-2 border-yellow-400/50 p-1 bg-slate-900 shadow-lg group-hover:scale-105 transition-transform">
                                            <img src="/avatar.jpg" className="w-full h-full rounded-full object-cover" />
                                        </div>
                                        <div className="text-slate-200 text-[1.5vh] font-bold text-center truncate w-full px-1">{badge.studentName}</div>
                                    </div>
                                    <div className="flex-1 min-w-0 flex flex-col h-full py-[0.5vh]">
                                        <div className="text-yellow-400 font-bold text-[2vh] truncate mb-[1vh]">{badge.badgeName}</div>
                                        <div className="text-slate-400 text-[1.4vh] leading-relaxed line-clamp-3 flex-1">
                                            {badge.badgeDescription || '在相应领域表现优异，获得此项荣誉。继续加油！'}
                                        </div>
                                        <div className="text-slate-600 text-[1.2vh] text-right mt-[0.5vh] font-mono">
                                            {new Date(badge.earnedAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </motion.div>
                    ) : (
                        <div className="w-full text-center text-slate-500 text-[2vh]">暂无勋章记录</div>
                    )}
                </div>
            </footer>
        </div>

        {/* 🆕 学生详情弹窗 - 直接从API获取数据 */}
        {selectedStudentId && (
            <StudentDetailOverlay
                studentId={selectedStudentId}
                schoolId={schoolId || ''}
                onClose={() => setSelectedStudentId(null)}
            />
        )}
    </>
    );
};

export default DataDashboard;
