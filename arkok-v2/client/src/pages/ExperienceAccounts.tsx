import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Crown,
    Heart,
    ShieldCheck,
    ArrowRight,
    Sparkles,
    Smartphone,
    Layout,
    GraduationCap,
    Zap,
    Map as MapIcon,
    Share2,
    CheckCircle2,
    Trophy,
    ArrowLeft,
    Target,
    MessageCircle,
    Clock,
    Gamepad2,
    Layers,
    TrendingUp,
    Frown,
    EyeOff,
    BarChart2,
    ClipboardCheck,
    Flame,
    Swords,
    Search,
    BookOpen,
    X,
    ChevronDown
} from 'lucide-react';
import { motion } from 'framer-motion';

// --- 演示数据 ---
const MOCK_MAP_DATA = [
    { subject: '语文', modules: [85, 70, 95, 40, 60, 30, 0, 0], color: 'bg-orange-500' },
    { subject: '数学', modules: [90, 85, 50, 80, 45, 20, 0, 0], color: 'bg-blue-500' },
    { subject: '英语', modules: [100, 90, 80, 70, 60, 50, 40, 20], color: 'bg-green-500' },
];

const MOCK_TIMELINE = [
    { time: '16:30', title: '【数学】备考加餐', desc: '课程：第3单元 混合运算', category: '核心教学法', type: 'TASK', icon: '📝' },
    { time: '17:15', title: '【习惯】作业规范全A', desc: '获得奖励 10 经验', category: '综合成长', type: 'HABIT', icon: '🌱' },
    { time: '18:00', title: '获得「专注小达人」勋章', desc: '今日专注时长突破 60 分钟', category: '荣誉勋章', type: 'BADGE', icon: '🏅' },
];

const ExperienceAccounts = () => {
    const navigate = useNavigate();
    const [activeDemo, setActiveDemo] = useState<string | null>(null);

    // 模拟提示
    const showToast = (msg: string) => {
        const toast = document.createElement('div');
        toast.className = 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/90 backdrop-blur-md text-white px-8 py-4 rounded-3xl shadow-2xl z-[100] font-black text-sm animate-bounce border border-white/10';
        toast.innerText = msg;
        document.body.appendChild(toast);
        setTimeout(() => { if (toast.parentNode) toast.parentNode.removeChild(toast) }, 2000);
    };

    return (
        <div className="min-h-screen bg-[#FFF8F4] text-[#2D2D2F] font-sans selection:bg-orange-100 selection:text-orange-600 pb-20 overflow-x-hidden">
            {/* 左上角新手村向导按钮 */}
            <div className="fixed top-6 left-6 z-[100]">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => window.open('/新手村向导.html', '_blank')}
                    className="flex items-center gap-2 bg-gradient-to-r from-orange-500 to-rose-500 px-6 py-3 rounded-2xl shadow-2xl shadow-orange-300/70 border-2 border-white/50 text-white font-black text-sm"
                >
                    <BookOpen size={18} />
                    <span>新手村向导</span>
                </motion.button>
            </div>

            {/* 全功能说明书入口 */}
            <div className="fixed top-6 right-6 z-[100]">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                        window.open('/系统功能说明书.html', '_blank');
                    }}
                    className="flex items-center gap-2 bg-white/80 backdrop-blur-xl px-6 py-3 rounded-2xl shadow-2xl border border-white/50 text-orange-500 font-black text-sm group transition-all hover:bg-orange-500 hover:text-white"
                >
                    <BookOpen size={18} className="group-hover:rotate-12 transition-transform" />
                    <span>全功能说明书</span>
                </motion.button>
            </div>

            {/* 动态背景 */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-100px] right-[-150px] w-[600px] h-[600px] bg-[#FFD194] rounded-full blur-[120px] opacity-30 animate-pulse" />
                <div className="absolute bottom-[-100px] left-[-100px] w-[500px] h-[500px] bg-[#FF9966] rounded-full blur-[120px] opacity-30 animate-pulse delay-700" />
            </div>


            <div className="relative z-10 max-w-[1000px] mx-auto px-6">

                {/* Hero Section */}
                <section className="text-center pt-16 pb-16">
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl md:text-6xl font-black mb-6 bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent leading-tight tracking-tight"
                    >
                        连接学生自驱力与家长信任力<br />打造"看得见"的专业教育服务
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-lg text-slate-500 max-w-2xl mx-auto font-medium"
                    >
                        从"催骂吼"的对抗场，到"比学赶超"的竞技场。<br />
                        星途与伴，专为中国托管教育场景设计的行为塑造与服务外化系统。
                    </motion.p>

                    {/* 痛点卡片 */}
                    <div className="grid md:grid-cols-4 gap-6 mt-16 text-left">
                        {[
                            { icon: Frown, title: '班级氛围差', desc: '孩子被动学习，老师靠吼靠催，师生关系紧张，充满对抗情绪。', color: 'bg-red-50 text-red-500' },
                            { icon: EyeOff, title: '家长看不见', desc: '服务过程无形，家长只看结果，机构的用心和专业无法被感知。', color: 'bg-orange-50 text-orange-500' },
                            { icon: BarChart2, title: '管理无数据', desc: '校长两眼一抹黑，换个老师就像换个机构，教学质量无法标准化。', color: 'bg-blue-50 text-blue-500' },
                            { icon: Zap, title: '续费没底气', desc: '家长问"孩子进步在哪"，老师只能靠感觉说话，续费全凭运气。', color: 'bg-purple-50 text-purple-500' },
                        ].map((p, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 + i * 0.1 }}
                                className="bg-white/60 backdrop-blur-md p-6 rounded-3xl border border-orange-100/50"
                            >
                                <div className={`w-10 h-10 rounded-xl ${p.color} flex items-center justify-center mb-4`}>
                                    <p.icon size={20} />
                                </div>
                                <h4 className="font-black mb-2 text-slate-800">{p.title}</h4>
                                <p className="text-sm text-slate-400 font-medium leading-relaxed">{p.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* 篇章一：前言与深度价值描述 */}
                <section className="mb-16">
                    <div className="inline-flex items-center gap-2 bg-orange-500/10 text-orange-500 px-6 py-2 rounded-full text-xs font-black tracking-widest border border-orange-500/20 mb-8">
                        第一篇章：行为塑造与游戏化引擎
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8 leading-tight">
                        从“要我学”到“我要学”<br />
                        <span className="bg-gradient-to-r from-orange-500 to-rose-500 bg-clip-text text-transparent">用即时反馈重塑学习自驱力</span>
                    </h2>
                    <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-4xl">
                        托管教育长期面临“催骂吼”的对抗情绪。我们通过游戏化引擎，将枯燥的作业行为转化为<b className="text-slate-800">积分、经验值与竞技勋章</b>。利用“最近发展区”原理，收束分散的注意力，建立强大的班级凝聚力，让老师从“监管者”转型为“引导师”。
                    </p>
                </section>

                <div className="grid lg:grid-cols-2 gap-8 mb-12">
                    {/* 1.1 教室荣誉中控 */}
                    <section className="relative overflow-hidden rounded-[48px] bg-slate-900 p-8 md:p-12 border border-slate-800 shadow-2xl group flex flex-col justify-between">
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-orange-500/20 text-orange-400 rounded-2xl border border-orange-500/30">
                                    <Layout size={24} />
                                </div>
                                <h3 className="text-2xl font-black text-white">星际战斗模式</h3>
                            </div>
                            <p className="text-slate-400 font-medium leading-relaxed mb-8">
                                口算、单词一键开启竞技对战，营造“比学赶超”的班风。在对决中内化知识，将枯燥练习转化为对胜利的渴望。
                            </p>

                            {/* 数据预览态 */}
                            <div className="bg-white/5 rounded-3xl p-6 border border-white/5 space-y-4">
                                <div className="flex justify-between items-center text-[10px] font-black tracking-widest text-orange-400/60 uppercase">
                                    <span>天梯实时动态</span>
                                    <span className="animate-pulse">● 运行中</span>
                                </div>
                                <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: '85%' }} className="h-full bg-orange-500" />
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400"><Trophy size={16} /></div>
                                    <span className="text-xs text-slate-300 font-bold">陈浩然 连胜 x17 火苗燃烧中!</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 1.2 连胜风云榜 */}
                    <section className="relative overflow-hidden rounded-[48px] bg-gradient-to-br from-slate-900 via-slate-900 to-orange-900/20 p-8 md:p-12 border border-slate-800 shadow-2xl flex flex-col justify-between">
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-rose-500/20 text-rose-400 rounded-2xl border border-rose-500/30">
                                    <TrendingUp size={24} />
                                </div>
                                <h3 className="text-2xl font-black text-white">连胜风云榜</h3>
                            </div>
                            <p className="text-slate-400 font-medium leading-relaxed mb-8">
                                利用“损失厌恶”心理，保住连胜火苗是顶级自驱。这种专注力的提升，是任何被动管教都无法达到的。
                            </p>

                            <div className="bg-slate-900 rounded-3xl p-6 border border-rose-500/20 flex items-center justify-center relative overflow-hidden h-32">
                                <div className="text-center group-hover:scale-110 transition-transform">
                                    <div className="text-4xl font-black text-orange-400 italic mb-1">x10</div>
                                    <div className="text-[10px] font-black tracking-[4px] text-orange-400/60 uppercase">火苗连击中!</div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="bg-[#1e1a4d] rounded-[40px] p-8 mb-32 border border-white/5 shadow-inner">
                    <div className="grid md:grid-cols-3 gap-6">
                        {[
                            {
                                title: '实时排行榜',
                                desc: '不再是期末才发奖状，每一分钟的努力都能让排名实时变动。',
                                icon: Trophy
                            },
                            {
                                title: '实时动态流',
                                desc: '“张同学点亮了[思维链]技能” 全班即刻可见，满足炫耀心与成就感。',
                                icon: Zap
                            },
                            {
                                title: '悬赏任务副本',
                                desc: '每周发布高积分“悬赏令”，引导全班共同攻克教学难点。',
                                icon: Crown
                            }
                        ].map((card, i) => (
                            <div key={i} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-6 group hover:border-[#f97316]/50 transition-all duration-500">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 text-[#f97316]">
                                        <card.icon size={28} strokeWidth={1.5} />
                                    </div>
                                    <h4 className="font-black text-xl text-[#f97316] tracking-tight">{card.title}</h4>
                                </div>
                                <p className="text-sm text-[#9b96c4] font-medium leading-relaxed">
                                    {card.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 篇章二：前言与深度价值描述 */}
                <section className="mb-16">
                    <div className="inline-flex items-center gap-2 bg-blue-500/10 text-blue-500 px-6 py-2 rounded-full text-sm font-black tracking-widest border border-blue-500/20 mb-8">
                        第二篇章：服务标准化与核心教学法
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8 leading-tight">
                        把“不可见的辛苦”<br />
                        <span className="bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">转化为“看得见的产品”</span>
                    </h2>
                    <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-4xl">
                        托管的核心痛点是“交付不透明”与“人员依赖”。我们将教学动作标准化为<b className="text-slate-800">服务产品</b>，通过备课系统将思维链、三色笔等专业教学法深度植入。实现去个人化依赖，并将每日成果转化为<b className="text-slate-800">数字化教学资产</b>，即便老师流动，教学质量依然稳固。
                    </p>
                </section>

                <div className="grid lg:grid-cols-2 gap-8 mb-32">
                    {/* 2.1 备课过关系统: 服务产品化 */}
                    <section className="bg-white rounded-[64px] p-8 md:p-12 border border-slate-100 shadow-xl shadow-blue-50/50 flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl -translate-y-16 translate-x-16" />
                        <div>
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-3 bg-blue-50 text-blue-500 rounded-2xl border border-blue-100 group-hover:scale-110 transition-transform">
                                    <ClipboardCheck size={26} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800">标准化备课系统</h3>
                            </div>
                            <div className="space-y-6 mb-8">
                                <div className="bg-blue-50/50 p-6 rounded-[32px] border border-blue-100/50 relative">
                                    <div className="absolute top-4 right-4 text-blue-200"><Zap size={20} /></div>
                                    <h4 className="text-base font-black text-blue-700 mb-2">服务产品化</h4>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                        将教学动作标准化为 <b className="text-slate-700">Checklist（检查清单）</b>。解决了“换个老师就像换个机构”的问题。
                                    </p>
                                </div>
                                <div className="bg-purple-50/50 p-6 rounded-[32px] border border-purple-100/50 relative">
                                    <div className="absolute top-4 right-4 text-purple-200"><Sparkles size={20} /></div>
                                    <h4 className="text-base font-black text-purple-700 mb-2">高度自由 · 灵活定制</h4>
                                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                        根据机构自身特色<b className="text-slate-700">灵活新增、删除内容</b>。预制 <b className="text-purple-600">9大类核心教学法</b> 和 <b className="text-purple-600">综合成长任务库</b>，开箱即用。
                                    </p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { name: '思维链解题', icon: '🧠' },
                                        { name: '三色笔纠错', icon: '🖍️' },
                                        { name: '字词开花', icon: '🌸' },
                                        { name: '专注力训练', icon: '🎯' },
                                    ].map((v, i) => (
                                        <div key={i} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center gap-3 hover:bg-white hover:shadow-md transition-all">
                                            <span className="text-xl">{v.icon}</span>
                                            <span className="text-xs font-black text-slate-600">{v.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="bg-slate-900 rounded-[32px] p-6 text-white relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheck size={60} /></div>
                            <h4 className="text-[10px] font-black text-blue-400 mb-2 tracking-widest uppercase">交付风控价值</h4>
                            <p className="text-xs font-medium leading-relaxed opacity-80">
                                强制植入差异化竞争力，保证每一位老师都能交付高质量的专业服务。
                            </p>
                        </div>
                    </section>

                    {/* 2.2 全学期地图: 数据资产化 */}
                    <section className="bg-white rounded-[64px] p-8 md:p-12 border border-slate-100 shadow-xl shadow-emerald-50/50 flex flex-col justify-between relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50/50 rounded-full blur-3xl -translate-y-16 translate-x-16" />
                        <div>
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 group-hover:scale-110 transition-transform">
                                    <MapIcon size={26} />
                                </div>
                                <h3 className="text-2xl font-black text-slate-800">全学期过关地图</h3>
                            </div>
                            <div className="bg-emerald-50/50 p-6 rounded-[32px] border border-emerald-100/50 mb-8 relative">
                                <div className="absolute top-4 right-4 text-emerald-200"><Layout size={20} /></div>
                                <h4 className="text-base font-black text-emerald-700 mb-2">资产数字化</h4>
                                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                                    记录每一课掌握情况。将每日作业整合为完整的成长路径，薄弱点一目了然。
                                </p>
                            </div>

                            {/* 矩阵点亮展示 */}
                            <div className="space-y-8 px-2">
                                {MOCK_MAP_DATA.slice(0, 2).map((subject, idx) => (
                                    <div key={idx}>
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-2 h-2 rounded-full ${subject.color}`} />
                                                <span className="text-xs font-black text-slate-700">{subject.subject} 进度</span>
                                            </div>
                                            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">已点亮 6 课</span>
                                        </div>
                                        <div className="grid grid-cols-8 gap-2">
                                            {subject.modules.map((m, i) => (
                                                <motion.div
                                                    key={i}
                                                    whileHover={{ scale: 1.2, zIndex: 10 }}
                                                    className={`aspect-square rounded-md shadow-sm transition-all duration-500 ${m > 0 ? subject.color : 'bg-slate-100'
                                                        } ${m > 0 && m < 80 ? 'opacity-40 animate-pulse' : ''}`}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="mt-10 p-5 bg-slate-50 rounded-[32px] border border-slate-100">
                            <p className="text-[11px] text-slate-400 font-medium italic leading-relaxed">
                                告别纸质表格的混乱与丢失，打造机构不可带走的“数字化教学资产”。
                            </p>
                        </div>
                    </section>
                </div>

                {/* 篇章三：前言与深度价值描述 */}
                <section className="mb-16">
                    <div className="inline-flex items-center gap-2 bg-rose-500/10 text-rose-500 px-6 py-2 rounded-full text-sm font-black tracking-widest border border-rose-500/20 mb-8">
                        第三篇章：深度外化与裂变传播
                    </div>
                    <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8 leading-tight">
                        让每一次教育服务<br />
                        <span className="bg-gradient-to-r from-rose-500 to-orange-500 bg-clip-text text-transparent">产生自动增长的“口碑回响”</span>
                    </h2>
                    <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-4xl">
                        托管不应是家长的“信息黑盒”。通过<b className="text-slate-800">查快递式</b>的成长实时外化，让家长对专业度产生极高感知。同时利用“损失厌恶”心理与“晒娃”需求，将挑战复活机制转化为<b className="text-slate-800">口碑自动化驱动引擎</b>。
                    </p>
                </section>

                <div className="space-y-24 mb-32">
                    {/* 3.1 服务外化：查快递式成长同步 */}
                    <section className="bg-white rounded-[64px] p-8 md:p-16 border border-slate-100 shadow-2xl shadow-slate-100/50 flex flex-col lg:flex-row items-center gap-16 overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-1/2 h-full bg-slate-50/50 skew-x-12 translate-x-32 z-0" />

                        <div className="lg:w-1/2 relative z-10">
                            <div className="inline-flex items-center gap-2 bg-orange-50 text-orange-500 px-4 py-1.5 rounded-full text-xs font-black mb-8">
                                <Search size={14} /> 核心服务：查快递式同步
                            </div>
                            <h3 className="text-4xl font-black text-slate-900 mb-6 tracking-tight leading-tight">
                                像“查快递”一样看成长
                            </h3>
                            <p className="text-lg text-slate-500 mb-12 leading-relaxed">
                                托管服务的核心痛点是“信息差”。我们打破黑盒，将服务像“物流节点”一样可视化。
                                让家长随时随地掌握孩子的每一步进展。
                            </p>

                            <div className="space-y-8">
                                {[
                                    { icon: CheckCircle2, color: 'rose', title: '全学期数据留痕', desc: '每一课的生字、错题、掌握情况自动汇总。从微观表现到宏观趋势，数据资产全生命周期保存，即便是新老师也能一秒上手。' },
                                    { icon: Sparkles, color: 'orange', title: '可视化教学法', desc: '家长能清晰看到孩子完成了“思维链训练”、“画图法解应用题”等高价值任务，而不仅是“写完作业”，深度外化机构教学厚度。' },
                                    { icon: Heart, color: 'amber', title: '给家长的“定心丸”', desc: '当家长看到连“坐姿端正”、“光盘行动”都有记录时，他们买单的不仅是纯粹的看管，而是“专业化、有规划的习惯成长”。' },
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-4 group">
                                        <div className={`size-10 rounded-full bg-${item.color}-50 flex items-center justify-center text-${item.color}-500 shrink-0 group-hover:bg-${item.color}-500 group-hover:text-white transition-all`}>
                                            <item.icon size={22} />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-bold text-slate-900 mb-1">{item.title}</h4>
                                            <p className="text-sm text-slate-500 leading-relaxed font-medium">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 手机模型展示区 */}
                        <div className="lg:w-1/2 flex justify-center relative z-10">
                            <div className="absolute inset-0 bg-orange-100/30 blur-[100px] rounded-full scale-75" />
                            <div className="w-[300px] h-[620px] bg-white rounded-[48px] border-[10px] border-slate-900 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] relative overflow-hidden flex flex-col shrink-0">
                                <div className="bg-slate-900 h-6 w-32 absolute top-0 left-1/2 -translate-x-1/2 rounded-b-2xl z-30" />

                                {/* 手机头部 */}
                                <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-4 pt-8 text-white shrink-0">
                                    <div className="flex justify-between items-center mb-1.5">
                                        <div className="text-base font-black flex items-baseline gap-2">
                                            2025年12月28日 <span className="text-[10px] font-normal opacity-80">周日</span>
                                        </div>
                                        <div className="bg-white/20 backdrop-blur-md rounded-xl px-2 py-1.5 text-center min-w-[55px]">
                                            <div className="text-[7px] opacity-80 mb-0.5">今日积分</div>
                                            <div className="text-base font-black leading-none">+10</div>
                                        </div>
                                    </div>
                                    <div className="text-[9px] font-bold flex items-center gap-1 opacity-90">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> 今日状态：平静
                                    </div>
                                </div>

                                <div className="p-3 flex-1 bg-slate-50/50 space-y-2.5 overflow-hidden">
                                    <div className="flex items-center gap-2 mb-1.5 px-1 py-1 bg-white/40 rounded-full border border-white/60 shadow-sm">
                                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] border-2 border-white">
                                            <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                        </div>
                                        <span className="text-[11px] font-black text-slate-800">📍 今日导学</span>
                                        <span className="ml-auto text-[8px] bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full font-bold">12项待办</span>
                                    </div>

                                    <div className="bg-white rounded-[20px] p-3 shadow-sm border border-slate-100/50">
                                        <h4 className="text-[10px] font-black text-slate-800 mb-2">今日能力培养目标</h4>
                                        <div className="space-y-1.5">
                                            <div className="bg-[#fffafa] rounded-lg p-2 border border-red-50/50">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-[9px] font-bold text-red-500 border-l-2 border-red-500 pl-1.5">基础过关</span>
                                                    <div className="flex gap-1">
                                                        <div className="w-0.5 h-0.5 rounded-full bg-blue-200" />
                                                        <div className="w-0.5 h-0.5 rounded-full bg-blue-200" />
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-1 text-[8px] text-slate-500">
                                                    <div>生字词听写</div>
                                                    <div>课文朗读</div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="bg-[#fafffb] rounded-lg p-2">
                                                    <span className="text-[9px] font-bold text-green-600 border-l-2 border-green-600 pl-1.5">习惯培养</span>
                                                </div>
                                                <div className="bg-[#fafafe] rounded-lg p-2">
                                                    <span className="text-[9px] font-bold text-blue-600 border-l-2 border-blue-600 pl-1.5">能力训练</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 基础过关卡片 */}
                                    <div className="bg-white rounded-[24px] p-4 border border-slate-100 shadow-sm relative overflow-hidden">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <div className="w-4 h-4 rounded-full bg-[#10b981] flex items-center justify-center text-white"><CheckCircle2 size={8} strokeWidth={4} /></div>
                                            <span className="text-[10px] font-black text-slate-800">✅ 基础过关</span>
                                            <span className="text-[8px] text-slate-400 ml-auto">14:42</span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                                                <div className="flex items-center gap-2 text-[9px] font-bold text-slate-700">
                                                    <div className="w-4 h-4 rounded-full bg-[#10b981] flex items-center justify-center text-white"><CheckCircle2 size={10} strokeWidth={4} /></div>
                                                    生字词听写
                                                </div>
                                                <span className="text-[8px] bg-orange-50 text-orange-500 px-1 py-0.5 rounded font-black">x1</span>
                                            </div>
                                            <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                                                <div className="flex items-center gap-2 text-[9px] font-bold text-slate-700">
                                                    <div className="w-4 h-4 rounded-full bg-[#10b981] flex items-center justify-center text-white"><CheckCircle2 size={10} strokeWidth={4} /></div>
                                                    古诗默写
                                                </div>
                                                <span className="text-[8px] bg-orange-50 text-orange-500 px-1 py-0.5 rounded font-black">x1</span>
                                            </div>
                                        </div>
                                        <div className="mt-3 flex justify-between items-center bg-[#f0f9f1]/80 px-3 py-2 rounded-lg border border-emerald-50">
                                            <span className="text-[8px] text-slate-400 font-bold">已完成 2/2</span>
                                            <span className="text-[10px] font-black text-[#10b981]">+10 经验</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-[55px] bg-white border-t border-slate-50 flex justify-around items-center px-4 shrink-0">
                                    <div className="flex flex-col items-center gap-0.5">
                                        <div className="p-1 px-3 bg-orange-50 rounded-lg"><Clock size={16} className="text-orange-600" /></div>
                                        <span className="text-[8px] font-black text-orange-600">今日动态</span>
                                    </div>
                                    <TrendingUp size={16} className="opacity-20" />
                                    <Layout size={16} className="opacity-20" />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 3.2 裂变增长：挑战复活界面 (Z-Pattern Alternating) */}
                    <section className="bg-slate-900 rounded-[64px] p-8 md:p-16 border border-white/5 shadow-2xl flex flex-col lg:flex-row-reverse items-center gap-16 overflow-hidden relative">
                        <div className="absolute top-0 left-0 w-1/2 h-full bg-white/[0.02] -skew-x-12 -translate-x-32 z-0" />

                        <div className="lg:w-1/2 relative z-10">
                            <div className="inline-flex items-center gap-2 bg-rose-500/10 text-rose-400 px-4 py-1.5 rounded-full text-xs font-black mb-8 border border-rose-500/20">
                                <TrendingUp size={14} /> 核心裂变：挑战复活机制
                            </div>
                            <h3 className="text-4xl font-black text-white mb-6 tracking-tight leading-tight">
                                把“晒娃”变成一种刚需
                            </h3>
                            <p className="text-lg text-slate-400 mb-12 leading-relaxed">
                                如何让不爱发朋友圈的家长主动为你宣传？我们利用“损失厌恶”心理，将品牌传播融入对孩子的守护。
                            </p>

                            <div className="grid md:grid-cols-2 gap-6 mb-8">
                                <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                                    <span className="text-orange-400 font-black mb-2 block text-xs uppercase tracking-widest">场景还原</span>
                                    <p className="text-slate-300 text-sm leading-relaxed">
                                        孩子坚持了17天的“全对挑战”，第18天如果不小心失误，连胜记录将清零。孩子非常沮丧，这时候该怎么办？
                                    </p>
                                </div>
                                <div className="bg-rose-500/10 p-6 rounded-3xl border border-rose-500/20">
                                    <span className="text-rose-400 font-black mb-2 block text-xs uppercase tracking-widest">裂变解法</span>
                                    <p className="text-slate-300 text-sm leading-relaxed">
                                        家长发圈求赞“注入能量”，文案不是广告，而是“为了守护孩子的坚持”。这是最高级的视觉软广。
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 复活/激活 界面模拟 */}
                        <div className="lg:w-1/2 flex justify-center relative z-10">
                            <div className="absolute inset-0 bg-rose-500/20 blur-[120px] rounded-full scale-75" />
                            <div className="bg-slate-800 rounded-[48px] p-8 text-white border border-white/10 shadow-3xl max-w-sm w-full relative overflow-hidden group">
                                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-rose-500/10" />
                                <div className="relative z-10">
                                    <div className="text-center mb-8">
                                        <div className="inline-block px-4 py-1.5 bg-rose-500 text-[10px] font-black rounded-full mb-6 animate-bounce shadow-lg shadow-rose-500/40">
                                            ⚠️ 连胜挑战中断即将清零
                                        </div>
                                        <div className="text-3xl font-black italic">连续 <span className="text-5xl text-orange-400">17</span> 天连胜</div>
                                        <p className="text-slate-500 text-[10px] mt-3 font-black tracking-widest uppercase">今日任务待家长激活助力</p>
                                    </div>

                                    <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/10 mb-8 shadow-inner">
                                        <div className="flex justify-between items-center mb-6">
                                            <div className="space-y-1">
                                                <div className="text-sm font-black text-white">第 18 天：核心素养挑战</div>
                                                <div className="text-[10px] text-rose-400 font-bold flex items-center gap-1">
                                                    <Flame size={12} /> 状态：亟待注入能量
                                                </div>
                                            </div>
                                            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-orange-400"><TrendingUp size={24} /></div>
                                        </div>

                                        <button className="w-full bg-gradient-to-r from-orange-500 to-rose-500 text-white py-5 rounded-2xl font-black text-sm shadow-xl shadow-orange-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
                                            <Share2 size={18} /> 助力复活 · 守护孩子的努力
                                        </button>
                                    </div>

                                    <div className="flex items-center gap-4 p-5 bg-white/5 rounded-2xl border border-white/5 text-xs font-medium leading-relaxed text-slate-400">
                                        <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 shadow-inner">
                                            <Heart size={20} />
                                        </div>
                                        利用“损失厌恶”管理家长心理，让分享变成一种极具温度的“情感宣泄”。
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* 角色价值区 */}
                <section className="py-24 text-center">
                    <h2 className="text-3xl font-black mb-4 tracking-tight">为什么大家都爱用？</h2>
                    <p className="text-slate-400 font-medium mb-16 underline decoration-orange-500/30 decoration-4 underline-offset-8">解决每一个角色的核心焦虑</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {[
                            { icon: GraduationCap, title: '对孩子', desc: '枯燥作业变游戏副本\n点亮"五维内力"技能\n获取即时正反馈', color: 'bg-orange-50 text-orange-500' },
                            { icon: ShieldCheck, title: '对老师', desc: '减少"催骂吼"\n备课流程标准化\n交付标准统一化', color: 'bg-green-50 text-green-500' },
                            { icon: Heart, title: '对家长', desc: '打破信息监控黑盒\n感知机构专业度\n获得安心与信任', color: 'bg-rose-50 text-rose-500' },
                            { icon: Crown, title: '对校长', desc: '数据资产数字化留痕\n对抗教师流动风险\n服务产品化交付', color: 'bg-blue-50 text-blue-500' },
                        ].map((v, i) => (
                            <motion.div
                                key={i}
                                whileHover={{ y: -10 }}
                                className="bg-white p-8 rounded-[40px] shadow-sm border border-slate-100 flex flex-col items-center group"
                            >
                                <div className={`w-14 h-14 rounded-2xl ${v.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform`}>
                                    <v.icon size={28} />
                                </div>
                                <h3 className="font-black mb-2 text-slate-800">{v.title}</h3>
                                <p className="text-[11px] text-slate-500 font-medium leading-relaxed whitespace-pre-line text-center">{v.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* CTA */}
                <section className="bg-gradient-to-br from-orange-400 to-rose-500 rounded-[56px] p-12 md:p-20 text-center text-white shadow-2xl shadow-orange-200/50 overflow-hidden relative border border-white/20">
                    <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
                    <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl" />

                    <h2 className="text-3xl md:text-5xl font-black mb-8 leading-tight">让每一次教育服务都有回响</h2>
                    <p className="text-lg opacity-90 mb-12 max-w-xl mx-auto font-medium">
                        别让你的用心被埋没。立即开启星途与伴，重塑机构竞争力。
                    </p>
                    <div className="flex flex-col md:flex-row justify-center gap-4 relative z-10">
                        <button
                            onClick={() => navigate('/login')}
                            className="bg-white text-orange-500 px-16 py-5 rounded-3xl font-black text-lg shadow-2xl hover:shadow-white/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            申请系统演示
                        </button>
                    </div>
                </section>
                <div className="mt-12 pb-12 text-center">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[4px] italic">© 2026 星途与伴 · 赋能中国托管教育</p>
                </div>

            </div>
        </div>
    );
};

export default ExperienceAccounts;
