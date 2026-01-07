import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Share2, Trophy, CheckCircle, Swords, Flame, Award, Compass, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';


const API_BASE = '/api/parent';

interface RadarDimension {
    name: string;
    value: number;
    icon: string;
    key?: string; // e.g., 'autonomy', 'planning'
}

interface Skill {
    code: string;
    name: string;
    attribute: string;
    category: string;
    icon: string | null;
    level: number;
    currentExp: number;
    levelTitle: string;
    unlockedAt: string;
}

interface GrowthData {
    student: {
        id: string;
        name: string;
        className?: string;
        level: number;
        exp: number;
        points: number;
        stats?: {
            perfectStreak: number;
            maxPerfectStreak: number;
        };
    };
    radarData: {
        dimensions: RadarDimension[];
        overallScore: number;
    };
    heatmapData: {
        month: string;
        days: { date: string; level: number; count: number }[];
        totalActiveDays: number;
    };
    trendData: {
        period: string;
        data: { date: string; exp: number; cumulative: number }[];
        totalExp: number;
    };
    summary: {
        joinDate: string;
        daysSinceJoin: number;
        totalTasks: number;
        totalQC: number;
        totalPK: number;
        totalHabits: number;
        totalBadges: number;
    };
    unlockedSkills?: Skill[];
}

// 五维颜色映射
const DIMENSION_COLORS: Record<string, { bg: string; text: string; gradient: string }> = {
    'autonomy': { bg: 'bg-yellow-100', text: 'text-yellow-600', gradient: 'from-yellow-400 to-amber-500' }, // 自主力 (黄)
    'planning': { bg: 'bg-green-100', text: 'text-green-600', gradient: 'from-emerald-400 to-green-500' },   // 规划力 (绿)
    'reflection': { bg: 'bg-red-100', text: 'text-red-600', gradient: 'from-rose-400 to-red-500' },       // 内省力/复盘力 (红)
    'logic': { bg: 'bg-blue-100', text: 'text-blue-600', gradient: 'from-sky-400 to-blue-500' },         // 逻辑力 (蓝)
    'grit': { bg: 'bg-orange-100', text: 'text-orange-600', gradient: 'from-orange-400 to-orange-600' }  // 坚持力 (橙)
};

// 属性字段映射 (后端 attribute -> frontend key)
const ATTRIBUTE_MAP: Record<string, string> = {
    'autonomy': 'autonomy',
    'planning': 'planning',
    'reflection': 'reflection',
    'logic': 'logic',
    'grit': 'grit',
    'review': 'reflection', // 兼容
    'thinking': 'logic'     // 兼容
};

const GrowthProfile: React.FC = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const navigate = useNavigate();
    const [data, setData] = useState<GrowthData | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedDimension, setSelectedDimension] = useState<string | null>(null);
    // 🆕 连胜数据
    const [streakRecords, setStreakRecords] = useState<Array<{ category: string; categoryLabel: string; currentStreak: number; maxStreak: number }>>([]);
    const [streakPage, setStreakPage] = useState(0);
    const [skillPage, setSkillPage] = useState(0); // 🆕 技能分页状态

    // 切换维度时重置页码
    useEffect(() => {
        setSkillPage(0);
    }, [selectedDimension]);

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('parent_token');
            if (!token || !studentId) return;

            try {
                const res = await fetch(`${API_BASE}/growth/${studentId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error);

                // 增强 dimensions，添加 key 以便映射颜色
                if (result.radarData?.dimensions) {
                    const dims = result.radarData.dimensions;
                    // 按顺序手动映射 key (假设后端返回顺序固定，或者通过 name 匹配)
                    // 顺序: 自主, 规划, 复盘, 思考, 坚持
                    if (dims[0]) dims[0].key = 'autonomy';
                    if (dims[1]) dims[1].key = 'planning';
                    if (dims[2]) dims[2].key = 'reflection';
                    if (dims[3]) dims[3].key = 'logic';
                    if (dims[4]) dims[4].key = 'grit';
                }

                setData(result);

                // 🆕 获取连胜数据
                const streakRes = await fetch(`${API_BASE}/streaks/${studentId}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const streakResult = await streakRes.json();
                if (streakResult.success) {
                    setStreakRecords(streakResult.data);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [studentId]);

    const renderRadarChart = () => {
        if (!data?.radarData?.dimensions) return null;
        const dims = data.radarData.dimensions;
        const size = 200;
        const center = size / 2;
        const radius = 70;
        const angleStep = (Math.PI * 2) / 5;

        // 计算顶点
        const points = dims.map((d, i) => {
            const angle = i * angleStep - Math.PI / 2;
            const r = (d.value / 100) * radius;
            return {
                x: center + r * Math.cos(angle),
                y: center + r * Math.sin(angle),
                raw: d
            };
        });

        const pathData = points.map((p, i) => (i === 0 ? 'M' : 'L') + `${p.x},${p.y}`).join(' ') + ' Z';

        return (
            <div className="relative w-[200px] h-[200px] mx-auto my-4">
                {/* 维度图标定位 */}
                {dims.map((d, i) => {
                    const angle = i * angleStep - Math.PI / 2;
                    const x = center + (radius + 25) * Math.cos(angle);
                    const y = center + (radius + 25) * Math.sin(angle);
                    const color = DIMENSION_COLORS[d.key || 'grit'];

                    return (
                        <motion.button
                            key={i}
                            initial={{ opacity: 0, scale: 0 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.1 }}
                            className={`absolute w-8 h-8 -ml-4 -mt-4 rounded-full flex items-center justify-center text-sm shadow-sm z-20 transition-transform active:scale-95 ${selectedDimension === d.key ? 'ring-2 ring-offset-2 ring-orange-400 scale-110' : ''
                                } ${color.bg} ${color.text}`}
                            style={{ left: x, top: y }}
                            onClick={() => setSelectedDimension(selectedDimension === d.key ? null : d.key!)}
                        >
                            {d.icon}
                        </motion.button>
                    );
                })}

                <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
                    {/* 背景网格 */}
                    {[0.2, 0.4, 0.6, 0.8, 1].map((scale, idx) => (
                        <polygon
                            key={idx}
                            points={dims.map((_, i) => {
                                const angle = i * angleStep - Math.PI / 2;
                                const r = radius * scale;
                                return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
                            }).join(' ')}
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="1"
                            strokeDasharray={scale === 1 ? "0" : "2,2"}
                        />
                    ))}

                    {/* 数据区域 */}
                    <motion.path
                        d={pathData}
                        fill="url(#radarGradient)"
                        stroke="#f97316"
                        strokeWidth="2"
                        strokeLinejoin="round"
                        initial={{ opacity: 0, pathLength: 0 }}
                        animate={{ opacity: 1, pathLength: 1 }}
                        transition={{ duration: 1, ease: "easeOut" }}
                    />

                    <defs>
                        <radialGradient id="radarGradient" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                            <stop offset="0%" stopColor="rgba(249, 115, 22, 0.6)" />
                            <stop offset="100%" stopColor="rgba(249, 115, 22, 0.1)" />
                        </radialGradient>
                    </defs>

                    {/* 顶点圆点 */}
                    {points.map((p, i) => (
                        <circle key={i} cx={p.x} cy={p.y} r="3" fill="#f97316" stroke="white" strokeWidth="1.5" />
                    ))}
                </svg>
            </div>
        );
    };


    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400">数据加载中...</div>;

    // 过滤技能显示
    const filteredSkills = selectedDimension
        ? data?.unlockedSkills?.filter(s => ATTRIBUTE_MAP[s.attribute] === selectedDimension)
        : data?.unlockedSkills;

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* 顶部全屏背景 - 暖色调 */}
            <div className="absolute top-0 left-0 w-full h-[280px] bg-gradient-to-br from-orange-400 via-red-500 to-pink-600 rounded-b-[40px] z-0 shadow-xl" />

            {/* 导航栏 */}
            <div className="relative z-10 pt-6 px-4 flex justify-between items-center text-white">
                <button onClick={() => navigate(-1)} className="p-2 bg-white/10 rounded-full backdrop-blur-md active:scale-95 transition">
                    <ChevronLeft size={20} />
                </button>
                <div className="text-base font-bold">成长档案</div>
                <button className="p-2 bg-white/10 rounded-full backdrop-blur-md active:scale-95 transition">
                    <Share2 size={18} />
                </button>
            </div>

            {/* 学生信息卡 */}
            <div className="relative z-10 px-6 mt-4 flex items-center gap-4 text-white">
                <div className="relative">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-14 h-14 rounded-full border-2 border-white/40 shadow-lg bg-orange-100 flex items-center justify-center text-xl font-bold text-orange-600 relative z-10"
                    >
                        {data?.student?.name?.charAt(0)}
                    </motion.div>

                </div>
                <div>
                    <h1 className="text-xl font-bold tracking-tight">{data?.student?.name}</h1>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-white/80">
                        <span className="bg-black/10 px-2 py-0.5 rounded-full backdrop-blur-sm border border-white/10">Lv.{data?.student?.level} 初露锋芒</span>
                        <span>加入第 {data?.summary?.daysSinceJoin} 天</span>
                    </div>
                </div>
            </div>

            {/* 五维能力雷达卡片 - 紧凑版 */}
            <div className="relative z-10 px-4 mt-6">
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/95 backdrop-blur-xl rounded-[24px] p-5 shadow-xl border border-white/50"
                >
                    <div className="flex justify-between items-center mb-1">
                        <div>
                            <h2 className="text-base font-black text-slate-800">五维能力画像</h2>
                            <p className="text-[10px] text-slate-400">点击维度图标筛选技能</p>
                        </div>
                        <div className="text-right">
                            <div className="text-xl font-black text-orange-500">{data?.radarData?.overallScore}</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">综合评分</div>
                        </div>
                    </div>

                    {renderRadarChart()}

                    {/* 维度数值展示 */}
                    <div className="grid grid-cols-5 divide-x divide-slate-100 mt-2 pt-3 border-t border-slate-50">
                        {data?.radarData?.dimensions.map((d, i) => (
                            <div key={i} className="text-center group cursor-pointer" onClick={() => setSelectedDimension(d.key || null)}>
                                <div className={`text-[10px] font-bold mb-0.5 group-hover:text-orange-500 transition-colors ${selectedDimension === d.key ? 'text-orange-500' : 'text-slate-400'}`}>
                                    {d.name}
                                </div>
                                <div className="text-xs font-black text-slate-800">{d.value}</div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
            {/* 🆕 连胜纪录面板 (兼容V5宪法) - 始终显示 */}
            <div className="relative z-10 px-4 mt-4">
                <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15 }}
                    className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100"
                >
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                        <Flame className="w-5 h-5 text-orange-500 fill-orange-500" />
                        <span>连胜纪录</span>
                        <span className="text-[10px] text-slate-400 bg-slate-50 px-2 py-0.5 rounded-full ml-auto">
                            共 {streakRecords.length} 项
                        </span>
                    </h3>

                    {/* 连胜分页控制 */}
                    {streakRecords.length > 9 && (
                        <div className="flex justify-between items-center mb-3 px-1">
                            <button
                                onClick={() => setStreakPage(Math.max(0, streakPage - 1))}
                                disabled={streakPage === 0}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all active:scale-95 ${streakPage === 0
                                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                    : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
                                    }`}
                            >
                                ←
                            </button>
                            <span className="text-xs text-gray-500 font-medium">第 {streakPage + 1} 页</span>
                            <button
                                onClick={() => setStreakPage(streakPage + 1)}
                                disabled={(streakPage + 1) * 9 >= streakRecords.length}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all active:scale-95 ${(streakPage + 1) * 9 >= streakRecords.length
                                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                    : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
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
                                <div key={record.category} className="flex flex-col items-center justify-center p-2 bg-gradient-to-b from-orange-50 to-amber-50 rounded-xl border border-orange-100 relative overflow-hidden h-24 hover:scale-[1.02] transition-transform duration-200">
                                    <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-br from-orange-500 to-red-500 mb-0.5 leading-none">
                                        {record.currentStreak}
                                    </div>
                                    <div className="text-[10px] font-bold text-slate-700 truncate w-full text-center px-1">
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
                            {Array.from({ length: Math.ceil(streakRecords.length / 9) }).map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setStreakPage(index)}
                                    className={`w-1.5 h-1.5 rounded-full transition-colors ${index === streakPage ? 'bg-orange-500' : 'bg-gray-200'}`}
                                />
                            ))}
                        </div>
                    )}
                </motion.div>
            </div>



            {/* 技能成就列表 - 卡片式网格布局 (3列) */}
            <div className="px-4 mt-6">
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                        <Award className="w-5 h-5 text-amber-500" />
                        {selectedDimension ? `${data?.radarData?.dimensions.find(d => d.key === selectedDimension)?.name}技能` : '已点亮技能'}
                    </h3>
                    <span className="text-xs font-bold text-slate-400 bg-white px-2.5 py-1 rounded-full border border-slate-100 shadow-sm">{filteredSkills?.length || 0} 个</span>
                </div>

                {/* 技能分页控制 */}
                {filteredSkills && filteredSkills.length > 9 && (
                    <div className="flex justify-end items-center mb-3 px-1 gap-2">
                        <button
                            onClick={() => setSkillPage(Math.max(0, skillPage - 1))}
                            disabled={skillPage === 0}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all active:scale-95 ${skillPage === 0
                                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                : 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                                }`}
                        >
                            ←
                        </button>
                        <span className="text-[10px] text-gray-500 font-medium">
                            {skillPage + 1}/{Math.ceil(filteredSkills.length / 9)}
                        </span>
                        <button
                            onClick={() => setSkillPage(skillPage + 1)}
                            disabled={(skillPage + 1) * 9 >= filteredSkills.length}
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all active:scale-95 ${(skillPage + 1) * 9 >= filteredSkills.length
                                ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                                : 'bg-amber-100 text-amber-600 hover:bg-amber-200'
                                }`}
                        >
                            →
                        </button>
                    </div>
                )}

                <div className="min-h-[100px]">
                    <motion.div
                        layout
                        className="grid grid-cols-3 gap-2"
                    >
                        <AnimatePresence mode='popLayout'>
                            {filteredSkills && filteredSkills.length > 0 ? (
                                filteredSkills.slice(skillPage * 9, (skillPage + 1) * 9).map((skill) => {
                                    const attrKey = ATTRIBUTE_MAP[skill.attribute] || 'grit';

                                    // 动态样式映射
                                    const theme = {
                                        bg: '',
                                        text: '',
                                        glow: ''
                                    };

                                    // 根据属性映射颜色
                                    switch (attrKey) {
                                        case 'reflection': // 复盘 - 红色
                                            theme.bg = 'bg-red-50';
                                            theme.text = 'text-red-500';
                                            theme.glow = 'bg-red-500';
                                            break;
                                        case 'logic': // 思考 - 蓝色
                                            theme.bg = 'bg-blue-50';
                                            theme.text = 'text-blue-500';
                                            theme.glow = 'bg-blue-500';
                                            break;
                                        case 'planning': // 规划 - 绿色
                                            theme.bg = 'bg-emerald-50';
                                            theme.text = 'text-emerald-500';
                                            theme.glow = 'bg-emerald-500';
                                            break;
                                        case 'autonomy': // 自主 - 黄色
                                            theme.bg = 'bg-yellow-50';
                                            theme.text = 'text-yellow-600';
                                            theme.glow = 'bg-amber-400';
                                            break;
                                        default: // 坚持/肌肉 - 橙色
                                            theme.bg = 'bg-orange-50';
                                            theme.text = 'text-orange-500';
                                            theme.glow = 'bg-orange-500';
                                    }

                                    // 金色传说逻辑 (L3以上)
                                    const isGold = skill.level >= 3;

                                    return (
                                        <motion.div
                                            key={skill.code}
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            className={`
                                                relative overflow-hidden
                                                bg-white rounded-[20px] p-4
                                                flex flex-col justify-between h-[150px]
                                                border transition-all duration-300
                                                active:scale-95
                                                ${isGold ? 'border-orange-200/60 shadow-orange-100' : 'border-slate-50 shadow-sm'}
                                            `}
                                            style={isGold ? {
                                                background: 'linear-gradient(180deg, #FFFFFF 40%, #FFFDF5 100%)',
                                                boxShadow: '0 8px 16px -4px rgba(245, 158, 11, 0.1)'
                                            } : {
                                                boxShadow: '0 4px 6px rgba(0,0,0,0.02)'
                                            }}
                                        >
                                            {/* 氛围光斑 */}
                                            <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full blur-[40px] opacity-20 pointer-events-none ${theme.glow}`} />

                                            {/* 顶部: L标 + 胶囊 */}
                                            <div className="flex justify-between items-start z-10">
                                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shadow-inner
                                                    ${isGold
                                                        ? 'bg-gradient-to-br from-amber-300 to-orange-400 text-white'
                                                        : 'bg-slate-100 text-slate-400'
                                                    }`}
                                                >
                                                    L{skill.level}
                                                </div>
                                                <span className={`text-[9px] px-2 py-1 rounded-full font-bold ${theme.bg} ${theme.text}`}>
                                                    {data?.radarData?.dimensions.find(d => d.key === attrKey)?.name}
                                                </span>
                                            </div>

                                            {/* 中部: 技能名 */}
                                            <h4 className="font-bold text-slate-800 text-sm leading-tight mt-2 z-10 line-clamp-2">
                                                {skill.name}
                                            </h4>

                                            {/* 底部: 日期 + 称号 */}
                                            <div className="flex justify-between items-end mt-auto z-10">
                                                <span className="text-[9px] text-slate-300 font-medium">
                                                    {new Date(skill.unlockedAt).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                                                </span>
                                                <span className={`text-[10px] font-bold ${theme.text}`}>
                                                    {skill.levelTitle}
                                                </span>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="col-span-3 flex flex-col items-center justify-center py-8 text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200"
                                >
                                    <span className="text-2xl mb-2 grayscale opacity-50">🌱</span>
                                    <span className="text-xs">该维度暂无点亮技能</span>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </div>

            {/* 成长数据网格 */}
            <div className="px-4 mt-6 pb-8">
                <h3 className="font-bold text-slate-800 mb-3 px-1 text-sm">数据概览</h3>
                <div className="grid grid-cols-4 gap-2">
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-1">
                        <div className="w-8 h-8 rounded-full bg-green-50 text-green-500 flex items-center justify-center">
                            <CheckCircle size={16} />
                        </div>
                        <div className="text-center">
                            <div className="text-sm font-black text-slate-800">{data?.summary?.totalTasks}</div>
                            <div className="text-[9px] text-slate-400">任务</div>
                        </div>
                    </div>
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-1">
                        <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center">
                            <Trophy size={16} />
                        </div>
                        <div className="text-center">
                            <div className="text-sm font-black text-slate-800">{data?.summary?.totalQC}</div>
                            <div className="text-[9px] text-slate-400">过关</div>
                        </div>
                    </div>
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-1">
                        <div className="w-8 h-8 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                            <Swords size={16} />
                        </div>
                        <div className="text-center">
                            <div className="text-sm font-black text-slate-800">{data?.summary?.totalPK}</div>
                            <div className="text-[9px] text-slate-400">对决</div>
                        </div>
                    </div>
                    <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-1">
                        <div className="w-8 h-8 rounded-full bg-yellow-50 text-yellow-500 flex items-center justify-center">
                            <Award size={16} />
                        </div>
                        <div className="text-center">
                            <div className="text-sm font-black text-slate-800">{data?.summary?.totalBadges}</div>
                            <div className="text-[9px] text-slate-400">勋章</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GrowthProfile;
