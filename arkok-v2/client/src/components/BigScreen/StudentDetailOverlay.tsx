import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    X, Trophy, Star, Zap, BookOpen, Clock, Activity,
    Medal, Target, Flame, Swords, ChevronLeft, ChevronRight
} from 'lucide-react';
import { apiService } from '../../services/api.service';

interface StudentDetailOverlayProps {
    studentId: string;
    schoolId: string;
    onClose: () => void;
}

const SKILL_LEVEL_TITLES: Record<string, string[]> = {
    // 内省力
    'r_color': ['纠错学徒', '订正能手', '治愈大师'],
    'r_scan': ['扫雷兵', '质检员', '免检金牌'],
    'r_diagnosis': ['查病单', '诊疗师', '神医圣手'],
    'r_diary': ['记录者', '内省者', '觉悟者'],
    'r_gap': ['提问生', '补漏匠', '无缺公子'],
    'r_detail': ['圈词人', '审题王', '火眼金睛'],
    // 逻辑力
    'l_source': ['寻源者', '破题手', '通透宗师'],
    'l_draft': ['草稿新手', '绘图师', '推演专家'],
    'l_struct': ['拆书匠', '架构师', '全知视界'],
    'l_compare': ['辨字员', '明眼人', '鉴别大师'],
    'l_model': ['模具工', '建模师', '举一反三'],
    'l_connect': ['织网蛛', '筑桥师', '体系构建者'],
    // 自主力
    'a_feynman': ['小助教', '讲坛新秀', '传道教授'],
    'a_bloom': ['采花童', '词汇库', '博学文曲'],
    'a_hunt': ['拾贝者', '收藏家', '生活智者'],
    'a_ask': ['好奇宝宝', '探究员', '真理追求者'],
    'a_help': ['热心肠', '及时雨', '侠之大者'],
    'a_life': ['应用生', '精算师', '实干家'],
    // 规划力
    'p_helm': ['水手', '大副', '传奇船长'],
    'p_scout': ['探路者', '先锋官', '预知未来'],
    'p_bag': ['整理员', '管家', '井井有条'],
    'p_tomato': ['守时者', '效率达人', '时间领主'],
    'p_priority': ['排序员', '执行官', '运筹帷幄'],
    // 毅力值
    'g_zen': ['静心', '入定', '金刚不坏'],
    'g_streak': ['点火者', '持炬人', '永恒之火'],
    'g_retry': ['挑战者', '破壁人', '逆境战神'],
    'g_drill': ['苦修僧', '基本功王', '肌肉记忆'],
    'g_accum': ['积水潭', '汇川河', '汪洋海'],
};

const DIMENSION_COLOR_MAP: Record<string, any> = {
    grit: { text: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30' },
    logic: { text: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
    autonomy: { text: 'text-purple-400', bg: 'bg-purple-500/20', border: 'border-purple-500/30' },
    planning: { text: 'text-cyan-400', bg: 'bg-cyan-500/20', border: 'border-cyan-500/30' },
    reflection: { text: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
};

export const StudentDetailOverlay: React.FC<StudentDetailOverlayProps> = ({ studentId, schoolId, onClose }) => {
    const [data, setData] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);
    const [streakOffset, setStreakOffset] = React.useState(0);
    const [skillOffset, setSkillOffset] = React.useState(0);

    React.useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                // 🆕 使用公开 API，不需要认证，schoolId 由父组件传入
                const res = await apiService.get(`/students/${studentId}/public-profile?schoolId=${schoolId}`);
                if (res.success) {
                    const finalData = res.data as any; // 🆕 强制转为 any 以修复 lint 报错

                    // 模拟陈浩然的数据，用于展示 6 本书和进度条
                    if (finalData.student?.name === '陈浩然') {
                        finalData.readingStats = {
                            totalBooks: 6,
                            books: [
                                { name: '史记 (青少版)', current: 120, total: 280, progress: 42 },
                                { name: '神奇的物理', current: 85, total: 150, progress: 56 },
                                { name: '不一样的数学', current: 253, total: 300, progress: 84 },
                                { name: '森林报 (春)', current: 45, total: 120, progress: 37 },
                                { name: '西游记', current: 180, total: 600, progress: 30 },
                                { name: '哈利波特', current: 320, total: 450, progress: 71 }
                            ]
                        };
                        // 同时也模拟几枚勋章，使用新生成的路径
                        if (!finalData.badges?.length) {
                            finalData.badges = [
                                { name: '阅读之星', icon: '/badges/honor_badge_gold.png' },
                                { name: '坚持不懈', icon: '/badges/honor_badge_silver.png' },
                                { name: '逻辑天才', icon: '/badges/honor_badge_bronze.png' },
                                { name: '全勤先锋', icon: '/badges/honor_badge_gold.png' }
                            ];
                        }
                    }
                    setData(finalData);
                }
            } catch (error) {
                console.error('Failed to fetch student profile:', error);
            } finally {
                setLoading(false);
                setStreakOffset(0);
                setSkillOffset(0);
            }
        };
        fetchData();
    }, [studentId, schoolId]);

    const {
        student = {},
        readingStats = { totalBooks: 0, books: [] },
        unlockedSkills = [],
        badges = [],
        timelineData: rawTimeline = [],
        pkStats = { winRate: 0 }
    } = data || {};

    const isEmoji = (str: string) => {
        if (!str) return false;
        try {
            return /\p{Emoji}/u.test(str) && str.length <= 4;
        } catch (e) {
            return false;
        }
    };

    // 🆕 拍平后端按日期分组的时间轴数据
    const timelineData = React.useMemo(() => {
        if (!rawTimeline) return [];
        // 如果是后端返回的分组格式 [{ date, items }], 则拍平
        if (Array.isArray(rawTimeline) && rawTimeline.length > 0 && (rawTimeline[0] as any).items) {
            return rawTimeline.flatMap((group: any) => group.items).sort((a: any, b: any) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );
        }
        return Array.isArray(rawTimeline) ? rawTimeline : [];
    }, [rawTimeline]);

    const allStreaks = React.useMemo(() => {
        if (!data?.streakStats) return [];
        if (Array.isArray(data.streakStats.allStreaks)) return data.streakStats.allStreaks;

        return Object.entries(data.streakStats).flatMap(([subject, items]: any) => {
            if (!Array.isArray(items)) return [];
            return items.map((item: any) => ({
                subject,
                label: item.label,
                count: item.count
            }));
        }).sort((a: any, b: any) => b.count - a.count);
    }, [data?.streakStats]);

    const visibleStreaks = allStreaks.slice(streakOffset, streakOffset + 3);

    const scoreToLevel = (score: number): number => {
        if (score >= 80) return 5;
        if (score >= 60) return 4;
        if (score >= 40) return 3;
        if (score >= 20) return 2;
        return 1;
    };

    const renderRadarChart = () => {
        if (!data?.radarStats?.dimensions) return null;
        const dims = data.radarStats.dimensions;
        const size = 260;
        const center = size / 2;
        const radius = 90;
        const angleStep = (Math.PI * 2) / 5;

        const points = dims.map((d: any, i: number) => {
            const angle = i * angleStep - Math.PI / 2;
            const r = (d.value / 100) * radius;
            return {
                x: center + r * Math.cos(angle),
                y: center + r * Math.sin(angle)
            };
        });

        const pathData = points.map((p: any, i: number) => (i === 0 ? 'M' : 'L') + `${p.x},${p.y}`).join(' ') + ' Z';

        return (
            <div className="relative w-[260px] h-[260px] mx-auto overflow-visible">
                {dims.map((d: any, i: number) => {
                    const angle = i * angleStep - Math.PI / 2;
                    const labelRadius = radius + 30;
                    const x = center + labelRadius * Math.cos(angle);
                    const y = center + labelRadius * Math.sin(angle);
                    const color = DIMENSION_COLOR_MAP[d.key] || DIMENSION_COLOR_MAP['grit']; // 🆕 使用 d.key 作为 Key

                    return (
                        <div
                            key={i}
                            className="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center w-16"
                            style={{ left: x, top: y }}
                        >
                            <span className={`text-[1.8vh] font-bold ${color.text} whitespace-nowrap`}>
                                {d.name} <span className="text-[1.4vh] opacity-70">Lv.{scoreToLevel(d.value)}</span>
                            </span>
                            <span className="text-[1.6vh] text-white/60 font-medium">{d.value}分</span>
                        </div>
                    );
                })}

                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
                    {[0.2, 0.4, 0.6, 0.8, 1].map((scale, idx) => (
                        <polygon
                            key={idx}
                            points={dims.map((_: any, i: number) => {
                                const angle = i * angleStep - Math.PI / 2;
                                const r = radius * scale;
                                return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
                            }).join(' ')}
                            fill="none"
                            stroke="rgba(255,255,255,0.1)"
                            strokeWidth="1"
                            strokeDasharray={scale === 1 ? "0" : "4,4"}
                        />
                    ))}

                    <motion.path
                        d={pathData}
                        fill="url(#radarGradient)"
                        stroke="#3b82f6"
                        strokeWidth="3"
                        strokeLinejoin="round"
                        initial={{ opacity: 0, pathLength: 0 }}
                        animate={{ opacity: 1, pathLength: 1 }}
                        transition={{ duration: 1.5, ease: "easeOut" }}
                    />

                    <defs>
                        <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                            <stop offset="0%" stopColor="rgba(59, 130, 246, 0.6)" />
                            <stop offset="100%" stopColor="rgba(59, 130, 246, 0.1)" />
                        </radialGradient>
                    </defs>

                    {points.map((p: any, i: number) => (
                        <circle key={i} cx={p.x} cy={p.y} r="4" fill="#3b82f6" stroke="white" strokeWidth="2" />
                    ))}
                </svg>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm pointer-events-auto">
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full"
                />
            </div>
        );
    }

    if (!data) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/95 backdrop-blur-xl pointer-events-auto"
            >
                <div className="text-center">
                    <div className="text-red-500 text-2xl mb-4">⚠️ 获取数据失败</div>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                    >
                        关闭
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-[2vh] bg-slate-900/95 backdrop-blur-xl"
        >
            <button
                onClick={onClose}
                className="absolute top-[2vh] right-[2vh] p-2 text-white/50 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors z-50 pointer-events-auto"
            >
                <X size={32} />
            </button>

            <div className="w-full h-full grid grid-cols-12 gap-[2vh] max-w-[1920px] mx-auto pointer-events-auto">

                {/* 左侧栏：个人信息 + 雷达图 */}
                <div className="col-span-3 flex flex-col gap-[2vh]">
                    <div className="glass-card rounded-[2vh] p-[3vh] flex flex-col items-center relative overflow-hidden flex-shrink-0">
                        <div className="absolute top-0 left-0 w-full h-[12vh] bg-gradient-to-b from-blue-500/20 to-transparent" />
                        <div className="relative z-10 w-[14vh] h-[14vh] rounded-full p-1 border-4 border-blue-400/30 shadow-[0_0_30px_rgba(59,130,246,0.3)] mb-[2vh]">
                            <img src={student.avatarUrl || '/avatar.jpg'} className="w-full h-full rounded-full object-cover" />
                            <div className="absolute -bottom-2 -right-2 bg-yellow-500 text-black font-black px-3 py-1 rounded-full text-[1.6vh] border-4 border-slate-900">
                                Lv.{student.level}
                            </div>
                        </div>
                        <h2 className="text-[3vh] font-bold text-white mb-1">{student.name}</h2>
                        <p className="text-[1.6vh] mb-[2vh]">
                            <span className="text-yellow-400 font-bold">Lv.{student.level}</span>
                            <span className="text-yellow-400/80 ml-2">{student.levelTitle || '初窥门径'}</span>
                        </p>
                        <div className="w-full mb-[2vh]">
                            <div className="flex justify-between text-[1.2vh] mb-1">
                                <span className="text-slate-400">下一级进度</span>
                                <span className="text-blue-400">{student.expProgress}% (还需 {student.nextLevelExp || 0} 经验)</span>
                            </div>
                            <div className="h-[0.8vh] bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"
                                    style={{ width: `${student.expProgress || 0}%` }}
                                />
                            </div>
                        </div>
                        <div className="w-full grid grid-cols-2 gap-4">
                            <div className="bg-white/5 rounded-xl p-3 text-center">
                                <div className="text-blue-400 font-bold text-[2.2vh]">{student.points}</div>
                                <div className="text-slate-500 text-[1.2vh]">积分</div>
                            </div>
                            <div className="bg-white/5 rounded-xl p-3 text-center">
                                <div className="text-yellow-400 font-bold text-[2.2vh]">{student.exp}</div>
                                <div className="text-slate-500 text-[1.2vh]">总经验</div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card rounded-[2vh] p-[2vh] flex-1 min-h-0 flex flex-col items-center justify-center">
                        <h3 className="text-[2vh] font-bold text-white mb-[2vh] flex items-center gap-2 self-start">
                            <Activity className="text-blue-400" size={20} /> 五维内功
                        </h3>
                        <div className="flex-1 w-full min-h-0 flex items-center justify-center">
                            {renderRadarChart()}
                        </div>
                    </div>
                </div>

                {/* 中间栏：主要数据 */}
                <div className="col-span-5 flex flex-col gap-[2vh] min-h-0">
                    {/* 顶部荣誉勋章墙 */}
                    <div className="glass-card rounded-[2vh] p-[2vh] h-[15vh] shrink-0 border border-orange-500/10 bg-gradient-to-r from-orange-500/5 to-transparent relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Trophy size={60} className="text-orange-400" />
                        </div>
                        <div className="flex items-center gap-[2vh] h-full">
                            <div className="flex flex-col items-center justify-center border-r border-white/5 pr-[3vh] shrink-0">
                                <Medal className="text-orange-400 w-10 h-10 mb-1" />
                                <div className="text-orange-400 font-bold text-[1.4vh]">荣誉勋章</div>
                                <div className="text-slate-500 text-[1vh] uppercase tracking-[0.2em]">Honor Badges</div>
                            </div>

                            <div className="flex-1 flex items-center gap-[2.5vh] overflow-x-auto no-scrollbar py-2">
                                {badges?.length > 0 ? (
                                    badges.map((b: any, idx: number) => (
                                        <motion.div
                                            key={idx}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.1 }}
                                            className="flex flex-col items-center gap-1 shrink-0 group/badge"
                                        >
                                            <div className="w-[6vh] h-[6vh] rounded-full bg-yellow-500/10 p-1 border border-yellow-500/20 flex items-center justify-center overflow-hidden shrink-0 transition-transform group-hover/badge:scale-110">
                                                <div className="text-[3.5vh] filter drop-shadow-[0_0_8px_rgba(234,179,8,0.4)] select-none">
                                                    🏆
                                                </div>
                                            </div>
                                            <div className="text-slate-200 text-[1.2vh] font-bold whitespace-nowrap text-center mt-1">{b.name}</div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="flex items-center gap-4 text-slate-500 text-[1.4vh]">
                                        <div className="w-12 h-12 rounded-full border border-dashed border-white/10 flex items-center justify-center text-xl opacity-20">?</div>
                                        <span>还未获得勋章，加油努力吧！</span>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col items-end justify-center pl-[3vh] border-l border-white/5 shrink-0">
                                <div className="text-white font-black text-[3vh] leading-none mb-1">{badges?.length || 0}</div>
                                <div className="text-slate-500 text-[1.2vh]">获得总量</div>
                            </div>
                        </div>
                    </div>

                    {/* 技能面板 */}
                    <div className="glass-card rounded-[2vh] p-[2vh] flex-[1.9] flex flex-col min-h-0 overflow-hidden">
                        <div className="flex items-center justify-between mb-[2vh]">
                            <h3 className="text-[2.2vh] font-bold text-white flex items-center gap-2">
                                <Zap className="text-yellow-400" size={20} /> 点亮技能
                                <span className="text-white/30 text-[1.4vh] ml-1 font-normal">({unlockedSkills.length})</span>
                            </h3>
                            {unlockedSkills.length > 9 && (
                                <div className="flex gap-2 mr-2">
                                    <button
                                        onClick={() => setSkillOffset(prev => Math.max(0, prev - 9))}
                                        disabled={skillOffset === 0}
                                        className="p-1 hover:bg-white/10 rounded disabled:opacity-30 text-white"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button
                                        onClick={() => setSkillOffset(prev => Math.min((unlockedSkills.length - 1) - ((unlockedSkills.length - 1) % 9), prev + 9))}
                                        disabled={skillOffset + 9 >= unlockedSkills.length}
                                        className="p-1 hover:bg-white/10 rounded disabled:opacity-30 text-white"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 grid grid-cols-3 gap-4 content-start">
                            {unlockedSkills?.slice(skillOffset, skillOffset + 9).map((skill: any, idx: number) => {
                                const levelTitles = SKILL_LEVEL_TITLES[skill.code] || [];
                                const currentTitle = levelTitles[Math.min(skill.level - 1, 2)] || '';
                                return (
                                    <motion.div
                                        key={idx}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="bg-white/5 rounded-2xl px-[1.2vh] py-[0.8vh] border border-white/5 flex items-center gap-[1.2vh] hover:bg-white/10 transition-all hover:scale-105 group"
                                    >
                                        <div className="w-[4.5vh] h-[4.5vh] rounded-xl bg-slate-800 flex items-center justify-center text-[2.2vh] border border-white/10 shrink-0 shadow-inner group-hover:border-yellow-500/50 transition-colors">
                                            {skill.icon || '⚡'}
                                        </div>
                                        <div className="min-w-0 flex-1 flex flex-col justify-center items-start gap-1">
                                            <div className="text-slate-100 font-bold text-[2vh] leading-tight">{skill.name}</div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-yellow-500 text-[1.2vh] font-black bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20 whitespace-nowrap">
                                                    Lv.{skill.level}
                                                </div>
                                                <div className="text-yellow-400 text-[1.2vh] font-medium whitespace-nowrap">{currentTitle}</div>
                                            </div>
                                        </div>
                                    </motion.div>
                                );
                            })}
                            {!unlockedSkills?.length && (
                                <div className="col-span-3 text-center text-slate-500 py-10 flex flex-col items-center justify-center h-full">
                                    <div className="text-4xl mb-2 opacity-30">🔐</div>
                                    <div className="text-[1.6vh]">暂无解锁技能</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 阅读进展 */}
                    <div className="glass-card rounded-[2vh] p-[2vh] flex-[1.1] min-h-0 flex flex-col border border-emerald-500/10 bg-emerald-500/5">
                        <h3 className="text-[2.2vh] font-bold text-white mb-[1.5vh] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BookOpen className="text-emerald-400" size={24} /> 阅读进展
                            </div>
                            <span className="text-slate-500 text-[1.4vh] font-normal">{readingStats?.totalBooks || (readingStats?.books?.length || 0)} 本书</span>
                        </h3>
                        <div className="flex-1 overflow-y-auto no-scrollbar grid grid-cols-2 gap-[1.5vh] content-start">
                            {readingStats?.books?.slice(0, 4).map((book: any, idx: number) => (
                                <div key={idx} className="bg-white/5 rounded-xl p-[2vh] border border-white/5 flex flex-col justify-between hover:bg-emerald-500/10 transition-colors">
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="text-slate-200 font-bold text-[1.8vh] truncate pr-2">{book.name}</div>
                                        <div className="text-slate-500 text-[1.2vh] whitespace-nowrap font-mono">{book.current}/{book.total}页</div>
                                    </div>
                                    <div className="w-full">
                                        <div className="h-[0.8vh] bg-slate-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full"
                                                style={{ width: `${book.progress}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {(!readingStats?.books || readingStats.books.length === 0) && (
                                <div className="col-span-2 text-center text-slate-500 py-8 text-[1.6vh]">暂无阅读数据</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* 右侧栏：连胜 + 战绩 + 足迹 */}
                <div className="col-span-4 flex flex-col gap-[2vh] min-h-0">
                    {/* 连胜看板 */}
                    <div className="glass-card rounded-[2vh] p-[2vh] flex-[2] flex flex-col min-h-0 overflow-hidden">
                        <div className="flex items-center justify-between mb-[1.5vh]">
                            <h3 className="text-[2vh] font-bold text-white flex items-center gap-2">
                                <Flame className="text-red-500" size={20} /> 连胜看板
                                <span className="text-white/30 text-[1.2vh] ml-1 font-normal">({allStreaks.length})</span>
                            </h3>
                            {allStreaks.length > 3 && (
                                <div className="flex gap-2 mr-[5vh]">
                                    <button
                                        onClick={() => setStreakOffset(prev => Math.max(0, prev - 3))}
                                        disabled={streakOffset === 0}
                                        className="p-1 hover:bg-white/10 rounded disabled:opacity-30 text-white transition-colors"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <button
                                        onClick={() => setStreakOffset(prev => Math.min((allStreaks.length - 1) - ((allStreaks.length - 1) % 3), prev + 3))}
                                        disabled={streakOffset + 3 >= allStreaks.length}
                                        className="p-1 hover:bg-white/10 rounded disabled:opacity-30 text-white transition-colors"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="flex-1 grid grid-cols-3 gap-3">
                            {visibleStreaks.map((s: any, idx: number) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-white/5 rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-1 hover:bg-white/10 transition-all hover:scale-105 group relative overflow-hidden py-[1.2vh]"
                                >
                                    <div className="absolute top-1 left-1 bg-red-500/10 text-red-400 text-[0.9vh] px-1.5 py-0.5 rounded-full border border-red-500/20 font-mono scale-90 origin-top-left">
                                        #{s.subject}
                                    </div>
                                    <div className="w-[3.5vh] h-[3.5vh] rounded-xl bg-red-500/10 flex items-center justify-center border border-red-500/20 shrink-0">
                                        <Flame size={18} className="text-red-400" />
                                    </div>
                                    <div className="text-slate-200 text-[1.6vh] font-bold text-center px-1 truncate w-full">{s.label}</div>
                                    <div className="text-red-400 font-black text-[2.6vh] italic leading-none">x{s.count}</div>
                                </motion.div>
                            ))}
                            {allStreaks.length === 0 && (
                                <div className="col-span-3 text-center text-slate-500 py-6 flex flex-col items-center justify-center h-full">
                                    <div className="text-[1.4vh]">暂无连胜</div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* PK战绩 */}
                    <div className="glass-card rounded-[2vh] p-[2vh] flex-[2] shrink-0 flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between mb-[1.5vh]">
                            <h3 className="text-[2vh] font-bold text-white flex items-center gap-2">
                                <Swords className="text-red-400" size={20} /> PK战绩
                            </h3>
                            <div className="flex items-center gap-2 bg-yellow-500/10 px-3 py-1 rounded-full border border-yellow-500/20">
                                <Trophy size={14} className="text-yellow-500" />
                                <span className="text-yellow-500 font-black text-[1.6vh] italic">{pkStats?.wins || 0}胜 {pkStats?.losses || 0}负</span>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar space-y-2">
                            {data.pkRecords?.slice(0, 5).map((pk: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between bg-white/5 rounded-lg p-2 border border-white/5 hover:bg-white/10 transition-colors">
                                    <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <span className={`w-2 h-2 rounded-full shrink-0 ${pk.isWinner ? 'bg-green-500' : pk.winnerId === null ? 'bg-yellow-500' : 'bg-red-500'}`} />
                                        <span className="text-slate-300 text-[1.8vh] truncate">
                                            vs <span className="text-white font-bold">{pk.opponent?.name || '神秘对手'}</span>
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <span className="text-slate-500 text-[1.4vh]">{pk.topic || '通用'}</span>
                                        <span className="text-slate-600 text-[1.2vh] font-mono ml-2 uppercase">
                                            {pk.isWinner ? '胜' : pk.winnerId === null ? '平' : '败'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {(!data.pkRecords || data.pkRecords.length === 0) && (
                                <div className="text-center text-slate-500 py-4 text-[1.4vh]">暂无PK记录</div>
                            )}
                        </div>
                    </div>

                    {/* 成长足迹 */}
                    <div className="glass-card rounded-[2vh] p-[2vh] flex-[4] flex flex-col min-h-0 bg-blue-500/5 border-blue-500/10 overflow-hidden">
                        <h3 className="text-[2.2vh] font-bold text-white mb-[2vh] flex items-center gap-2">
                            <Activity className="text-blue-400" size={24} /> 成长足迹
                        </h3>
                        <div className="flex-1 overflow-y-auto no-scrollbar">
                            <div className="relative border-l-2 border-slate-800 ml-2 py-2">
                                {timelineData?.map((item: any, idx: number) => (
                                    <div key={idx} className="relative pl-[4vh] py-1.5 hover:bg-white/5 group transition-colors rounded-lg">
                                        <div className="absolute left-[-0.6vh] top-1/2 -translate-y-1/2 w-[1.2vh] h-[1.2vh] rounded-full bg-slate-800 border-2 border-blue-500/60 z-10 group-hover:border-blue-400 transition-colors" />
                                        <div className="flex items-center gap-2 pr-2">
                                            <span className="text-blue-300 font-bold text-[1.6vh] shrink-0">{item.title}</span>
                                            <span className="text-white/10 shrink-0">·</span>
                                            <span className="text-slate-400 text-[1.6vh] flex-1 truncate">{item.description}</span>
                                            <div className="flex items-center gap-3 shrink-0">
                                                {item.exp > 0 && <span className="text-yellow-500 font-bold text-[1.5vh]">+{item.exp} 经验</span>}
                                                <span className="text-slate-600 font-mono text-[1.2vh]">{new Date(item.date).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {(!timelineData || timelineData.length === 0) && (
                                    <div className="text-center text-slate-500 py-10 text-[1.6vh]">暂无成长轨迹</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default StudentDetailOverlay;
