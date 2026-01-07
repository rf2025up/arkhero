/**
 * 签到日历弹窗组件
 * 显示本月签到情况：已签到日期深色，未签到日期白色
 */

import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { apiService } from '../services/api.service';

interface CheckinCalendarModalProps {
    studentId: string;
    isOpen: boolean;
    onClose: () => void;
}

const CheckinCalendarModal: React.FC<CheckinCalendarModalProps> = ({
    studentId,
    isOpen,
    onClose
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [checkinDates, setCheckinDates] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // 获取当前月份的签到日期
    useEffect(() => {
        if (isOpen && studentId) {
            fetchCheckinDates();
        }
    }, [isOpen, studentId, currentDate]);

    const fetchCheckinDates = async () => {
        setIsLoading(true);
        try {
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1; // API 期望 1-12
            const res = await apiService.get<{ dates: string[] }>(`/checkins/student/${studentId}/monthly-dates`, { year, month });
            if (res.success && res.data?.dates) {
                setCheckinDates(res.data.dates);
            }
        } catch (error) {
            console.error('Failed to fetch checkin dates:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 获取日历数据
    const getCalendarDays = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        // 本月第一天是星期几（0=周日）
        const firstDay = new Date(year, month, 1).getDay();
        // 本月天数
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days: { day: number; isCurrentMonth: boolean; dateStr: string }[] = [];

        // 上月填充（空白）
        for (let i = 0; i < firstDay; i++) {
            days.push({ day: 0, isCurrentMonth: false, dateStr: '' });
        }

        // 本月日期
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            days.push({ day: d, isCurrentMonth: true, dateStr });
        }

        return days;
    };

    // 切换月份
    const changeMonth = (delta: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth(newDate.getMonth() + delta);
        setCurrentDate(newDate);
    };

    // 检查某天是否已签到
    const isCheckedIn = (dateStr: string) => {
        return checkinDates.includes(dateStr);
    };

    // 检查是否是今天
    const isToday = (dateStr: string) => {
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        return dateStr === todayStr;
    };

    if (!isOpen) return null;

    const calendarDays = getCalendarDays();
    const monthNames = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
    const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* 遮罩层 */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* 弹窗内容 */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-[90%] max-w-[340px] overflow-hidden animate-in zoom-in-95 duration-200">
                {/* 头部 */}
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar size={18} />
                        <span className="font-bold">签到日历</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* 月份切换 */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <button
                        onClick={() => changeMonth(-1)}
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                        <ChevronLeft size={16} />
                    </button>
                    <span className="font-bold text-gray-700">
                        {currentDate.getFullYear()}年 {monthNames[currentDate.getMonth()]}
                    </span>
                    <button
                        onClick={() => changeMonth(1)}
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
                    >
                        <ChevronRight size={16} />
                    </button>
                </div>

                {/* 星期标题 */}
                <div className="grid grid-cols-7 px-2 py-2 bg-gray-50">
                    {weekDays.map((day, i) => (
                        <div key={i} className="text-center text-xs font-bold text-gray-400">
                            {day}
                        </div>
                    ))}
                </div>

                {/* 日历网格 */}
                <div className="grid grid-cols-7 gap-1 p-2">
                    {isLoading ? (
                        <div className="col-span-7 py-8 text-center text-gray-400">
                            加载中...
                        </div>
                    ) : (
                        calendarDays.map((item, index) => (
                            <div
                                key={index}
                                className={`
                  aspect-square flex items-center justify-center rounded-lg text-sm font-bold
                  ${!item.isCurrentMonth ? 'text-transparent' : ''}
                  ${item.isCurrentMonth && isCheckedIn(item.dateStr)
                                        ? 'bg-green-500 text-white shadow-sm shadow-green-200'
                                        : item.isCurrentMonth
                                            ? 'bg-gray-50 text-gray-400'
                                            : ''
                                    }
                  ${isToday(item.dateStr) ? 'ring-2 ring-green-400 ring-offset-1' : ''}
                `}
                            >
                                {item.isCurrentMonth ? item.day : ''}
                            </div>
                        ))
                    )}
                </div>

                {/* 底部统计 */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded bg-green-500"></div>
                            <span className="text-xs text-gray-500">已签到</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded bg-gray-100 border border-gray-200"></div>
                            <span className="text-xs text-gray-500">未签到</span>
                        </div>
                    </div>
                    <div className="text-sm font-bold text-green-600">
                        本月 {checkinDates.length} 天
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckinCalendarModal;
