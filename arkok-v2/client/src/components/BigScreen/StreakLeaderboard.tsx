import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Shield, Zap, Star, Award, TrendingUp, BookOpen, Calculator, Languages, Flame } from 'lucide-react';
import { API } from '../../services/api.service';

interface LeaderboardItem {
    rank: number;
    student: {
        id: string;
        name: string;
        className: string;
        avatarUrl: string;
    };
    currentStreak: number;
    maxStreak: number;
    category: string;
    categoryName?: string;
}

const StreakLeaderboard: React.FC<{ schoolId: string }> = ({ schoolId }) => {
    const [chineseData, setChineseData] = useState<LeaderboardItem[]>([]);
    const [mathData, setMathData] = useState<LeaderboardItem[]>([]);
    const [englishData, setEnglishData] = useState<LeaderboardItem[]>([]);
    const [loading, setLoading] = useState(true);

    const subjects = [
        { key: 'chinese', label: '语文连胜', icon: BookOpen, color: 'from-orange-500 to-red-600', data: chineseData },
        { key: 'math', label: '数学连胜', icon: Calculator, color: 'from-blue-500 to-cyan-600', data: mathData },
        { key: 'english', label: '英语连胜', icon: Languages, color: 'from-purple-500 to-indigo-600', data: englishData },
    ];

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);
                const [cn, mt, en] = await Promise.all([
                    API.students.getSubjectLeaderboard(schoolId, 'chinese', 50),
                    API.students.getSubjectLeaderboard(schoolId, 'math', 50),
                    API.students.getSubjectLeaderboard(schoolId, 'english', 50),
                ]);

                if (cn.success) setChineseData(cn.data);
                if (mt.success) setMathData(mt.data);
                if (en.success) setEnglishData(en.data);
            } catch (error) {
                console.error('Failed to fetch streak leaderboards:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
        const interval = setInterval(fetchData, 60000); // 每分钟刷新一次
        return () => clearInterval(interval);
    }, [schoolId]);

    const getRankBadge = (rank: number) => {
        switch (rank) {
            case 1: return <div className="bg-yellow-400 text-black rounded-lg px-2 py-0.5 text-[10px] font-black shadow-[0_0_10px_#facc15]">TOP 1</div>;
            case 2: return <div className="bg-slate-300 text-black rounded-lg px-2 py-0.5 text-[10px] font-black shadow-[0_0_10px_#cbd5e1]">TOP 2</div>;
            case 3: return <div className="bg-orange-400 text-black rounded-lg px-2 py-0.5 text-[10px] font-black shadow-[0_0_10px_#fb923c]">TOP 3</div>;
            default: return <div className="text-slate-500 text-[10px] font-black">#{rank}</div>;
        }
    };

    return (
        <div className="w-full h-full p-8 flex flex-col pt-[10vh]">
            {/* 全局动画定义 */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes scroll-vertical {
                    0% { transform: translateY(0); }
                    100% { transform: translateY(-50%); }
                }
                .auto-scroll-container {
                    animation: scroll-vertical 30s linear infinite;
                }
                .auto-scroll-container:hover {
                    animation-play-state: paused;
                }
            `}} />

            <div className="flex items-end justify-between mb-8 px-4">
                <div>
                    <h1 className="text-5xl font-black italic tracking-tighter bg-gradient-to-r from-white via-white to-slate-500 bg-clip-text text-transparent">
                        连胜风云榜
                    </h1>
                    <p className="text-slate-500 font-bold uppercase tracking-[0.3em] text-xs mt-2 flex items-center gap-2">
                        <TrendingUp size={14} className="text-cyan-400 animate-pulse" />
                        全校巅峰实时排行
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
                {subjects.map((subject, sIdx) => {
                    const needsScroll = subject.data.length > 8;
                    const displayData = needsScroll ? [...subject.data, ...subject.data] : subject.data;

                    return (
                        <motion.div
                            key={subject.key}
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{ delay: sIdx * 0.1 }}
                            className="flex flex-col bg-slate-800/40 backdrop-blur-3xl rounded-[32px] border border-white/10 overflow-hidden shadow-2xl group"
                        >
                            {/* 表头 - 极简缩小 */}
                            <div className={`py-3 px-5 flex-shrink-0 bg-gradient-to-br ${subject.color} relative overflow-hidden flex items-center justify-between`}>
                                <div className="absolute -right-2 -top-1 opacity-10 transform rotate-12">
                                    <subject.icon size={60} />
                                </div>
                                <div className="relative z-10 flex items-center gap-2">
                                    <div className="p-1.5 bg-white/20 backdrop-blur-md rounded-lg border border-white/20">
                                        <subject.icon size={14} className="text-white" />
                                    </div>
                                    <h2 className="text-lg font-black text-white tracking-tight">{subject.label}</h2>
                                </div>
                                <div className="relative z-10 text-white/50 text-xs font-black italic">
                                    {subject.data.length} 条数据
                                </div>
                            </div>

                            {/* 榜单内容 - 极简单行 */}
                            <div className="flex-1 p-3 overflow-hidden">
                                {loading ? (
                                    <div className="space-y-1">
                                        {Array(8).fill(0).map((_, i) => (
                                            <div key={i} className="h-10 bg-white/5 rounded-xl animate-pulse" />
                                        ))}
                                    </div>
                                ) : subject.data.length > 0 ? (
                                    <div className={`relative h-full ${needsScroll ? 'overflow-hidden' : 'overflow-y-auto scrollbar-hide'}`}>
                                        <div className={`space-y-1 ${needsScroll ? 'auto-scroll-container' : ''}`}
                                            style={needsScroll ? { animationDuration: `${subject.data.length * 2}s` } : {}}>
                                            {displayData.map((item, index) => (
                                                <div
                                                    key={`${item.student.id}-${index}`}
                                                    className="flex items-center gap-3 p-2 bg-white/5 hover:bg-white/[0.08] transition-colors rounded-xl border border-white/[0.03] group/item"
                                                >
                                                    <div className="w-6 flex justify-center scale-90 origin-left flex-shrink-0">
                                                        {getRankBadge(item.rank)}
                                                    </div>

                                                    <div className="relative flex-shrink-0">
                                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border border-white/10 overflow-hidden">
                                                            {item.student.avatarUrl ? (
                                                                <img
                                                                    src={item.student.avatarUrl}
                                                                    className="w-full h-full object-cover"
                                                                    alt={item.student.name}
                                                                />
                                                            ) : (
                                                                <span className="text-white font-bold text-xs">{item.student.name.charAt(0)}</span>
                                                            )}
                                                        </div>
                                                        {item.rank === 1 && (
                                                            <div className="absolute -top-1 -right-1 text-yellow-500 drop-shadow-[0_0_3px_rgba(234,179,8,0.5)]">
                                                                <Trophy size={10} fill="currentColor" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 flex items-center gap-2 min-w-0">
                                                        <span className="text-sm font-black truncate text-white">{item.student.name}</span>
                                                        <span className="text-[11px] text-cyan-400 font-bold truncate">
                                                            {item.categoryName || '连胜'}
                                                        </span>
                                                        <div className="text-[11px] text-yellow-400 font-black italic ml-auto flex items-center gap-0.5">
                                                            <span>X{item.currentStreak}</span>
                                                            <Flame size={12} fill="currentColor" className="text-orange-500" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center opacity-20 py-8">
                                        <Shield size={32} className="mb-1" />
                                        <div className="text-[10px] font-black uppercase text-center">暂无连胜</div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    );
                })}
            </div>
        </div>
    );
};

export default StreakLeaderboard;
