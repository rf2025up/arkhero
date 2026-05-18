import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Search, Edit3, Trash2, X, Check, Users, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/api.service';
import MessageCenter from '../components/MessageCenter';

interface Student {
    id: string;
    name: string;
    className: string;
    grade?: string;
    avatarUrl?: string;
    isActive?: boolean;
    teacherId?: string;
    teacher?: { name: string };
}

const StudentManagement: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedClass, setSelectedClass] = useState('');

    // 弹窗状态
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        className: '',
        grade: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const availableClasses = [
        '一年级1班', '一年级2班', '二年级1班', '二年级2班',
        '三年级1班', '三年级2班', '四年级1班', '四年级2班',
        '五年级1班', '五年级2班', '六年级1班', '六年级2班'
    ];

    const grades = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];

    // 获取学生列表
    const fetchStudents = async () => {
        try {
            setLoading(true);
            const response = await apiService.get('/students?scope=ALL_SCHOOL');
            if (response.success && response.data) {
                const data = response.data as any;
                const studentList = Array.isArray(data) ? data : (data.students || []);
                setStudents(studentList);
            }
        } catch (error) {
            console.error('获取学生列表失败:', error);
            toast.error('获取学生列表失败');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStudents();
    }, []);

    // 过滤学生
    const filteredStudents = students.filter(s => {
        const matchesSearch = !searchQuery || s.name.includes(searchQuery);
        const matchesClass = !selectedClass || s.className === selectedClass;
        return matchesSearch && matchesClass;
    });

    // 按班级分组
    const groupedStudents = filteredStudents.reduce((acc, student) => {
        const key = student.className || '未分班';
        if (!acc[key]) acc[key] = [];
        acc[key].push(student);
        return acc;
    }, {} as Record<string, Student[]>);

    // 打开新增弹窗
    const handleAdd = () => {
        setEditingStudent(null);
        setFormData({ name: '', className: '', grade: '' });
        setIsModalOpen(true);
    };

    // 打开编辑弹窗
    const handleEdit = (student: Student) => {
        setEditingStudent(student);
        setFormData({
            name: student.name,
            className: student.className || '',
            grade: student.grade || ''
        });
        setIsModalOpen(true);
    };

    // 删除学生 (增强型确认)
    const handleDelete = async (student: Student) => {
        const confirmName = window.prompt(`确定要删除学生「${student.name}」吗？\n请输入该学生的姓名以确认：`);

        if (confirmName === null) return; // 用户点击取消

        if (confirmName !== student.name) {
            toast.error('姓名录入错误，删除已取消');
            return;
        }

        try {
            const response = await apiService.delete(`/students/${student.id}`);
            if (response.success) {
                setStudents(prev => prev.filter(s => s.id !== student.id));
                toast.success(`已删除「${student.name}」`);
            } else {
                toast.error('删除失败');
            }
        } catch (error) {
            toast.error('删除失败');
        }
    };

    // 提交表单
    const handleSubmit = async () => {
        if (!formData.name.trim()) {
            toast.error('请输入学生姓名');
            return;
        }
        if (!formData.className) {
            toast.error('请选择班级');
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingStudent) {
                // 更新学生 - 保留原有师生关系,只修改姓名和班级信息
                const response = await apiService.put(`/students/${editingStudent.id}`, {
                    name: formData.name,
                    className: formData.className,
                    grade: formData.grade,
                    teacherId: editingStudent.teacherId  // 🆕 保持原有师生关系不变
                });
                if (response.success) {
                    setStudents(prev => prev.map(s =>
                        s.id === editingStudent.id
                            ? { ...s, ...formData }
                            : s
                    ));
                    toast.success(`已更新「${formData.name}」`);
                    setIsModalOpen(false);
                } else {
                    toast.error('更新失败');
                }
            } else {
                // 新增学生
                const response = await apiService.post('/students', {
                    name: formData.name,
                    className: formData.className,
                    grade: formData.grade,
                    schoolId: user?.schoolId,
                    teacherId: user?.userId || user?.id  // 🆕 师生绑定:必须指定归属老师
                });
                if (response.success && response.data) {
                    setStudents(prev => [...prev, response.data as Student]);
                    toast.success(`已添加「${formData.name}」`);
                    setIsModalOpen(false);
                } else {
                    toast.error('添加失败');
                }
            }
        } catch (error) {
            toast.error(editingStudent ? '更新失败' : '添加失败');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F2F4F7] pb-24">
            {/* 🆕 “精致沉浸·精准排版” Header (对齐过关页风格) */}
            <div
                className="pt-10 pb-6 px-6 rounded-b-[30px] shadow-lg shadow-orange-200/20 overflow-hidden mb-6 relative"
                style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)' }}
            >
                {/* 背景装饰 */}
                <div className="absolute inset-0 pointer-events-none opacity-40">
                    <div className="absolute -top-1/4 -right-1/4 w-full h-full bg-white/10 blur-[80px] rounded-full" />
                </div>

                <div className="relative z-10">
                    {/* Header Row: Title on left, Add Button on right */}
                    <div className="flex justify-between items-center">
                        <div className="flex items-baseline gap-2">
                            <h1 className="text-2xl font-black text-white tracking-tight drop-shadow-sm flex items-center gap-2">
                                <Users className="w-6 h-6" />
                                学员管理
                            </h1>
                            <span className="text-[10px] font-bold text-white/50 tracking-[0.2em] uppercase">
                                Students
                            </span>
                        </div>

                        <button
                            onClick={handleAdd}
                            className="bg-white text-orange-600 px-5 py-2.5 rounded-full flex items-center gap-2 hover:bg-orange-50 active:scale-95 transition-all text-xs font-black shadow-md shadow-orange-900/10"
                        >
                            <Plus size={16} strokeWidth={3} />
                            添加学生
                        </button>
                    </div>
                </div>
            </div>

            <div className="pt-2">
                {/* 搜索与筛选区域 */}
                <div className="px-5 space-y-3">
                    <div className="relative">
                        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="搜索学生姓名..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-gray-100 rounded-xl py-3 pl-10 pr-4 text-sm font-medium outline-none shadow-sm focus:ring-2 focus:ring-orange-500/20"
                        />
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        <button
                            onClick={() => setSelectedClass('')}
                            className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${!selectedClass ? 'bg-orange-500 text-white shadow-md shadow-orange-100' : 'bg-white text-gray-500 border border-gray-100'}`}
                        >
                            全部
                        </button>
                        {availableClasses.map(c => (
                            <button
                                key={c}
                                onClick={() => setSelectedClass(c)}
                                className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${selectedClass === c ? 'bg-orange-500 text-white shadow-md shadow-orange-100' : 'bg-white text-gray-500 border border-gray-100'}`}
                            >
                                {c}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 统计信息 */}
                <div className="px-5 py-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Users size={16} />
                        <span>共 <strong className="text-gray-800">{filteredStudents.length}</strong> 名学员</span>
                        {selectedClass && <span className="text-orange-500">（{selectedClass}）</span>}
                    </div>
                </div>

                {/* 学生列表 */}
                <div className="px-5 space-y-4">
                    {loading ? (
                        <div className="py-12 text-center text-gray-400">
                            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                            <p className="text-sm">加载中...</p>
                        </div>
                    ) : Object.keys(groupedStudents).length === 0 ? (
                        <div className="py-12 text-center text-gray-400">
                            <GraduationCap size={48} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm">暂无学生数据</p>
                        </div>
                    ) : (
                        Object.entries(groupedStudents).map(([className, classStudents]) => (
                            <div key={className} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-50">
                                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                                        <span className="font-bold text-gray-800 text-sm">{className}</span>
                                    </div>
                                    <span className="text-xs text-gray-400 font-bold">{classStudents.length}人</span>
                                </div>
                                <div className="divide-y divide-gray-50">
                                    {classStudents.map(student => (
                                        <div key={student.id} className="px-4 py-3 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                                                    {student.name.slice(0, 1)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-gray-800 text-sm">{student.name}</p>
                                                    {student.teacher && (
                                                        <p className="text-[10px] text-gray-400">老师：{student.teacher.name}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(student)}
                                                    className="w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-400 rounded-lg hover:bg-orange-50 hover:text-orange-500 transition-colors"
                                                >
                                                    <Edit3 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(student)}
                                                    className="w-8 h-8 flex items-center justify-center bg-gray-50 text-gray-400 rounded-lg hover:bg-red-50 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={14} />
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

            {/* 新增/编辑弹窗 */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-6">
                    <div className="bg-white w-full max-w-sm rounded-[28px] p-6 shadow-2xl animate-in fade-in zoom-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-gray-800 text-lg">
                                {editingStudent ? '编辑学员' : '新增学员'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-gray-50 text-gray-400 rounded-xl">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">学生姓名</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="请输入学生姓名"
                                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-orange-500/20"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">所属班级</label>
                                <select
                                    value={formData.className}
                                    onChange={e => setFormData({ ...formData, className: e.target.value })}
                                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-orange-500/20 appearance-none"
                                >
                                    <option value="">请选择班级</option>
                                    {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">年级</label>
                                <select
                                    value={formData.grade}
                                    onChange={e => setFormData({ ...formData, grade: e.target.value })}
                                    className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm font-medium focus:ring-2 focus:ring-orange-500/20 appearance-none"
                                >
                                    <option value="">请选择年级</option>
                                    {grades.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-500 text-sm font-bold"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isSubmitting}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-bold shadow-lg shadow-orange-200 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Check size={16} />
                                        {editingStudent ? '保存' : '添加'}
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentManagement;
