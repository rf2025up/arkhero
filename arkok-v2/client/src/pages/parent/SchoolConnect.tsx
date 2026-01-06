import React, { useState, useEffect } from 'react';
import { useOutletContext, useParams, useNavigate } from 'react-router-dom';
import {
    Bell, Award, Users, Calendar, ChevronRight,
    MessageCircle, Heart, Settings, HelpCircle, LogOut
} from 'lucide-react';

const API_BASE = '/api/parent';

interface Notification {
    id: string;
    type: 'comment' | 'like' | 'system';
    title: string;
    content: string;
    time: string;
    read: boolean;
}

interface Student {
    id: string;
    name: string;
    className?: string;
}

/**
 * 家校互联页
 * 功能：消息通知、勋章墙、绑定孩子、在线请假等
 */
const SchoolConnect: React.FC = () => {
    const { studentId } = useParams<{ studentId: string }>();
    const navigate = useNavigate();
    const { setCurrentStudent } = useOutletContext<any>();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [badgeCount, setBadgeCount] = useState(0);
    const [unreadCount, setUnreadCount] = useState(0);
    const [parentInfo, setParentInfo] = useState<any>(null);

    useEffect(() => {
        const storedStudents = localStorage.getItem('parent_students');
        const storedParent = localStorage.getItem('parent_info');

        if (storedStudents) {
            setStudents(JSON.parse(storedStudents));
        }
        if (storedParent) {
            setParentInfo(JSON.parse(storedParent));
        }

        loadNotifications();
        loadBadgeCount();
    }, [studentId]);

    const loadNotifications = async () => {
        setNotifications([
            {
                id: '1',
                type: 'comment',
                title: '老师评语',
                content: '今天表现很棒，继续加油！',
                time: '2小时前',
                read: false
            },
            {
                id: '2',
                type: 'system',
                title: '续费提醒',
                content: '您的课程将于下周到期，请及时续费',
                time: '1天前',
                read: true
            }
        ]);
        setUnreadCount(1);
    };

    const loadBadgeCount = async () => {
        const token = localStorage.getItem('parent_token');
        if (!token || !studentId) return;

        try {
            const res = await fetch(`${API_BASE}/growth/${studentId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (res.ok) {
                setBadgeCount(data.summary?.totalBadges || 0);
            }
        } catch (err) {
            console.error('获取勋章数失败', err);
        }
    };

    const handleSwitchStudent = (student: Student) => {
        setCurrentStudent(student);
    };

    const handleLogout = () => {
        if (window.confirm('确定要退出登录吗？')) {
            localStorage.removeItem('parent_token');
            localStorage.removeItem('parent_info');
            localStorage.removeItem('parent_students');
            navigate('/parent/login');
        }
    };

    const menuItems = [
        {
            icon: Bell,
            iconBg: 'bg-blue-100',
            iconColor: 'text-blue-500',
            title: '消息通知',
            subtitle: '查看老师评语、续费提醒',
            badge: unreadCount > 0 ? unreadCount : undefined,
            onClick: () => {/* TODO: 跳转消息列表 */ }
        },
        {
            icon: Award,
            iconBg: 'bg-yellow-100',
            iconColor: 'text-yellow-500',
            title: '我的勋章墙',
            subtitle: `已获得 ${badgeCount} 枚勋章`,
            arrow: true,
            onClick: () => {/* TODO: 跳转勋章墙 */ }
        },
        {
            icon: Users,
            iconBg: 'bg-green-100',
            iconColor: 'text-green-500',
            title: '绑定孩子',
            subtitle: `已绑定 ${students.length} 个孩子`,
            arrow: true,
            onClick: () => {/* TODO: 跳转绑定管理 */ }
        },
        {
            icon: Calendar,
            iconBg: 'bg-purple-100',
            iconColor: 'text-purple-500',
            title: '在线请假',
            subtitle: '向老师提交请假申请',
            arrow: true,
            onClick: () => {/* TODO: 跳转请假页面 */ }
        }
    ];

    const settingsItems = [
        {
            icon: Settings,
            iconBg: 'bg-gray-100',
            iconColor: 'text-gray-500',
            title: '账号设置',
            subtitle: '修改密码、手机号',
            arrow: true
        },
        {
            icon: HelpCircle,
            iconBg: 'bg-gray-100',
            iconColor: 'text-gray-500',
            title: '帮助与反馈',
            subtitle: '使用指南、问题反馈',
            arrow: true
        }
    ];

    return (
        <div className="min-h-screen bg-gray-100 pb-24">
            {/* 用户信息卡 - 铺满顶部样式 */}
            <div className="bg-gradient-to-br from-orange-400 via-red-500 to-pink-600 pt-12 pb-8 px-6 text-white shadow-lg overflow-hidden relative rounded-b-[40px]">
                {/* 页面大标题 */}
                <div className="relative z-10 mb-6 flex justify-between items-center">
                    <h1 className="text-lg font-black tracking-widest opacity-90">家校互联</h1>
                    <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center backdrop-blur-md border border-white/10">
                        <Settings size={16} />
                    </div>
                </div>

                <div className="flex items-center gap-4 relative z-10">
                    <div className="w-16 h-16 bg-white/20 rounded-2xl backdrop-blur-md flex items-center justify-center text-3xl border border-white/30 shadow-inner">
                        👤
                    </div>
                    <div className="flex-1">
                        <div className="font-black text-xl tracking-tight">
                            {parentInfo?.name || '家长用户'}
                        </div>
                        <div className="text-xs text-white/80 mt-0.5 font-bold">
                            {parentInfo?.phone ? parentInfo.phone.replace(/(\d{3})\d{4}(\d{2})/, '$1****$2') : '未设置手机号'}
                        </div>
                    </div>
                </div>

                {/* 绑定的孩子列表 */}
                {students.length > 0 && (
                    <div className="flex gap-2 mt-5 overflow-x-auto no-scrollbar relative z-10">
                        {students.map(s => (
                            <button
                                key={s.id}
                                onClick={() => handleSwitchStudent(s)}
                                className={`flex-shrink-0 px-5 py-2 rounded-full text-xs font-black transition-all active:scale-95 border ${s.id === studentId
                                        ? 'bg-white text-orange-600 shadow-lg border-white'
                                        : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                                    }`}
                            >
                                {s.name}
                            </button>
                        ))}
                    </div>
                )}

                {/* 背景装饰图 */}
                <div className="absolute right-[-30px] top-[-30px] opacity-10 pointer-events-none">
                    <Heart size={160} />
                </div>
            </div>

            {/* 内容区 */}
            <div className="p-4 space-y-4">
                {/* 功能菜单 */}
                <div className="space-y-4">
                    {menuItems.map((item, i) => (
                        <button
                            key={i}
                            onClick={item.onClick}
                            className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 active:bg-gray-50 transition-all text-left group"
                        >
                            <div className={`w-12 h-12 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center transition-transform group-active:scale-90`}>
                                <item.icon size={22} />
                            </div>
                            <div className="flex-1">
                                <p className="font-black text-gray-800 text-sm tracking-tight">{item.title}</p>
                                <p className="text-[10px] text-gray-400 font-bold mt-0.5">{item.subtitle}</p>
                            </div>
                            {item.badge && (
                                <span className="min-w-[20px] h-5 px-1 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                                    {item.badge}
                                </span>
                            )}
                            {item.arrow && (
                                <ChevronRight size={18} className="text-gray-300 group-hover:translate-x-1 transition-transform" />
                            )}
                        </button>
                    ))}
                </div>

                {/* 最近消息预览 */}
                {notifications.length > 0 && (
                    <div className="mt-6">
                        <div className="flex justify-between items-center mb-3 px-1">
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">最近消息</h3>
                        </div>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                            {notifications.slice(0, 2).map((notif, i) => (
                                <div
                                    key={notif.id}
                                    className={`p-4 flex items-start gap-4 active:bg-gray-50 transition-colors ${!notif.read ? 'bg-orange-50/30' : ''}`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${notif.type === 'comment' ? 'bg-blue-50 text-blue-500' :
                                            notif.type === 'like' ? 'bg-red-50 text-red-500' :
                                                'bg-gray-50 text-gray-500'
                                        }`}>
                                        {notif.type === 'comment' ? <MessageCircle size={16} /> :
                                            notif.type === 'like' ? <Heart size={16} /> :
                                                <Bell size={16} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-sm text-gray-800">{notif.title}</span>
                                            <span className="text-[10px] text-gray-400 font-bold">{notif.time}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-1 truncate font-medium">{notif.content}</p>
                                    </div>
                                    {!notif.read && (
                                        <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0 mt-2 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* 设置菜单 */}
                <div className="mt-6">
                    <div className="flex justify-between items-center mb-3 px-1">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">账号设置</h3>
                    </div>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden divide-y divide-gray-50">
                        {settingsItems.map((item, i) => (
                            <button
                                key={i}
                                className="w-full p-4 flex items-center gap-4 active:bg-gray-50 transition-all text-left group"
                            >
                                <div className={`w-10 h-10 rounded-xl ${item.iconBg} ${item.iconColor} flex items-center justify-center`}>
                                    <item.icon size={20} />
                                </div>
                                <div className="flex-1">
                                    <p className="font-bold text-gray-800 text-sm">{item.title}</p>
                                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">{item.subtitle}</p>
                                </div>
                                {item.arrow && (
                                    <ChevronRight size={18} className="text-gray-200 group-hover:translate-x-1 transition-transform" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 退出登录 */}
                <div className="mt-8">
                    <button
                        onClick={handleLogout}
                        className="w-full bg-white text-red-500 font-black py-4 rounded-2xl border border-gray-100 flex items-center justify-center gap-2 active:bg-red-50 active:scale-[0.98] transition-all shadow-sm"
                    >
                        <LogOut size={18} />
                        退出账号
                    </button>
                </div>

                <div className="text-center text-[10px] font-black text-gray-300 mt-10 mb-4 uppercase tracking-[0.2em]">
                    ArkOK Family Edition
                </div>
            </div>
        </div>
    );
};

export default SchoolConnect;
