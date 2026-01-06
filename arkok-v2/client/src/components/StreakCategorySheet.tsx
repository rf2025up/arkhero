import React, { useState, useEffect } from 'react';
import { X, Plus, Flame, Loader2 } from 'lucide-react';
import apiService from '../services/api.service';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

interface CategoryItem {
    id?: string;
    name: string;
    code: string;
    isDefault: boolean;
}

interface StreakCategories {
    chinese: CategoryItem[];
    math: CategoryItem[];
    english: CategoryItem[];
}

// 默认分类 - 与后端和 FIXED_QC_ITEMS 保持一致
const DEFAULT_CATEGORIES: StreakCategories = {
    chinese: [
        { name: '课文背诵', code: 'cn_recitation', isDefault: true },
        { name: '生字组词', code: 'cn_word_combo', isDefault: true },
        { name: '默写课文', code: 'cn_dictation_text', isDefault: true },
        { name: '听写词语', code: 'cn_dictation', isDefault: true },
        { name: '朗读课文', code: 'cn_reading', isDefault: true },
    ],
    math: [
        { name: '口算练习', code: 'math_calculation', isDefault: true },
        { name: '计算练习', code: 'math_vertical', isDefault: true },
        { name: '应用题', code: 'math_word_problem', isDefault: true },
        { name: '错题订正', code: 'math_correction', isDefault: true },
    ],
    english: [
        { name: '单词默写', code: 'en_dictation', isDefault: true },
        { name: '中英互译', code: 'en_translation', isDefault: true },
        { name: '句型背诵', code: 'en_sentence', isDefault: true },
        { name: '课文背诵', code: 'en_recitation', isDefault: true },
    ]
};

interface StreakCategorySheetProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (code: string, name: string) => void;
    studentName?: string;
}

const StreakCategorySheet: React.FC<StreakCategorySheetProps> = ({
    isOpen,
    onClose,
    onSelect,
    studentName
}) => {
    const { user } = useAuth();
    const [categories, setCategories] = useState<StreakCategories | null>(null);
    const [loading, setLoading] = useState(false);
    const [addingSubject, setAddingSubject] = useState<'chinese' | 'math' | 'english' | null>(null);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [deletingId, setDeletingId] = useState<string | null>(null);

    // 获取分类数据
    const fetchCategories = async () => {
        if (!user?.schoolId) {
            // 如果没有 schoolId，使用默认分类
            setCategories(DEFAULT_CATEGORIES);
            return;
        }
        setLoading(true);
        try {
            const response = await apiService.get(`/streaks/categories?schoolId=${user.schoolId}`);
            console.log('[StreakSheet] API response:', response);
            if (response.success && response.data) {
                setCategories(response.data as StreakCategories);
            } else {
                // API 失败时使用默认分类
                setCategories(DEFAULT_CATEGORIES);
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error);
            // 出错时使用默认分类
            setCategories(DEFAULT_CATEGORIES);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) {
            fetchCategories();
        }
    }, [isOpen, user?.schoolId]);

    // 添加自定义分类
    const handleAddCategory = async (subject: 'chinese' | 'math' | 'english') => {
        if (!newCategoryName.trim() || !user?.schoolId) return;

        try {
            const response = await apiService.post('/streaks/categories', {
                schoolId: user.schoolId,
                subject,
                name: newCategoryName.trim()
            });

            if (response.success) {
                toast.success('已添加');
                setNewCategoryName('');
                setAddingSubject(null);
                fetchCategories();
            }
        } catch (error) {
            console.error('Failed to add category:', error);
            toast.error('添加失败');
        }
    };

    // 删除自定义分类（长按触发）
    const handleDeleteCategory = async (id: string) => {
        if (!confirm('确定要删除这个分类吗？')) return;

        try {
            const response = await apiService.delete(`/streaks/categories/${id}`);
            if (response.success) {
                toast.success('已删除');
                fetchCategories();
            }
        } catch (error) {
            console.error('Failed to delete category:', error);
            toast.error('删除失败');
        }
    };

    // 长按处理
    let longPressTimer: NodeJS.Timeout;
    const handleTouchStart = (id: string | undefined) => {
        if (!id) return;
        longPressTimer = setTimeout(() => {
            setDeletingId(id);
            handleDeleteCategory(id);
        }, 800);
    };

    const handleTouchEnd = () => {
        clearTimeout(longPressTimer);
    };

    if (!isOpen) return null;

    const subjectConfig = {
        chinese: { label: '语文', dotColor: 'bg-orange-500', pillActive: 'bg-orange-500 text-white border-orange-500', pillDefault: 'bg-white border-gray-200 text-gray-700 hover:border-orange-300' },
        math: { label: '数学', dotColor: 'bg-blue-500', pillActive: 'bg-blue-500 text-white border-blue-500', pillDefault: 'bg-white border-gray-200 text-gray-700 hover:border-blue-300' },
        english: { label: '英语', dotColor: 'bg-purple-500', pillActive: 'bg-purple-500 text-white border-purple-500', pillDefault: 'bg-white border-gray-200 text-gray-700 hover:border-purple-300' }
    };

    const renderSubjectSection = (subject: 'chinese' | 'math' | 'english') => {
        const config = subjectConfig[subject];
        const items = categories?.[subject] || [];

        return (
            <div key={subject} className="mb-6">
                {/* 科目标题 */}
                <div className="flex items-center gap-2 mb-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${config.dotColor}`}></span>
                    <span className="text-sm font-bold text-gray-700">{config.label}</span>
                    <span className="text-xs text-gray-400 ml-auto">长按删除</span>
                </div>

                {/* 分类标签 */}
                <div className="flex flex-wrap gap-2">
                    {items.map((item) => (
                        <button
                            key={item.code}
                            onClick={() => {
                                onSelect(item.code, item.name);
                                onClose();
                            }}
                            onTouchStart={() => handleTouchStart(item.id)}
                            onTouchEnd={handleTouchEnd}
                            onMouseDown={() => handleTouchStart(item.id)}
                            onMouseUp={handleTouchEnd}
                            onMouseLeave={handleTouchEnd}
                            className={`px-4 py-2 rounded-full border text-sm font-medium transition-all active:scale-95 ${item.isDefault ? config.pillDefault : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            {item.name}
                        </button>
                    ))}

                    {/* 添加按钮 */}
                    {addingSubject === subject ? (
                        <div className="flex items-center gap-1">
                            <input
                                type="text"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                placeholder="输入名称"
                                autoFocus
                                className="w-24 px-3 py-1.5 rounded-full border border-gray-300 text-sm focus:outline-none focus:border-orange-400"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleAddCategory(subject);
                                    if (e.key === 'Escape') setAddingSubject(null);
                                }}
                            />
                            <button
                                onClick={() => handleAddCategory(subject)}
                                className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center"
                            >
                                <Plus size={16} />
                            </button>
                            <button
                                onClick={() => { setAddingSubject(null); setNewCategoryName(''); }}
                                className="w-8 h-8 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center"
                            >
                                <X size={16} />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => setAddingSubject(subject)}
                            className="w-9 h-9 rounded-full border-2 border-dashed border-gray-300 text-gray-400 flex items-center justify-center hover:border-orange-400 hover:text-orange-500 transition-colors"
                        >
                            <Plus size={18} />
                        </button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-black/50 backdrop-blur-[2px] animate-in fade-in">
            <div className="absolute inset-0" onClick={onClose}></div>

            <div className="relative bg-white w-full max-w-lg rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden max-h-[85vh]">
                {/* Handle bar */}
                <div className="w-full flex justify-center pt-3 pb-1 cursor-pointer" onClick={onClose}>
                    <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
                </div>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <span className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center text-orange-500">
                            <Flame size={20} fill="currentColor" />
                        </span>
                        <div>
                            <h2 className="text-base font-bold text-gray-900">连胜记录</h2>
                            {studentName && <p className="text-xs text-gray-500">为 {studentName} 记录</p>}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors text-gray-500">
                        <X size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: 'calc(85vh - 120px)' }}>
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <>
                            {renderSubjectSection('chinese')}
                            {renderSubjectSection('math')}
                            {renderSubjectSection('english')}
                        </>
                    )}
                </div>

                {/* Safe area padding - 增加底部留白防止被导航栏遮挡 */}
                <div className="h-24 bg-white"></div>
            </div>
        </div>
    );
};

export default StreakCategorySheet;
