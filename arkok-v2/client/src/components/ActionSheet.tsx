import React, { useState, useEffect } from 'react';
import { X, UserPlus, History, TrendingDown, Gift } from 'lucide-react';
import { Student } from '../types/student';
import { useClass } from '../context/ClassContext';

// 积分操作记录类型（支持7条历史）
interface ScoreRecord {
  id: string;
  points: number;
  exp: number;
  reason?: string;
  reasonType?: string;  // DEDUCT / EXCHANGE
  operatorName?: string;
  operatedAt: string;
}

interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStudents: Student[];
  onConfirm: (points: number, reason: string, exp?: number, reasonType?: string) => void;
  onTransfer?: (studentIds: string[], targetTeacherId?: string) => void;
  onCheckin?: (studentIds: string[]) => void;
  scoreHistory: ScoreRecord[];
}

const ActionSheet: React.FC<ActionSheetProps> = ({
  isOpen,
  onClose,
  selectedStudents,
  onConfirm,
  onTransfer,
  onCheckin,
  scoreHistory
}) => {
  const { viewMode, isProxyMode } = useClass();
  const [customPoints, setCustomPoints] = useState<string>('');
  const [customExp, setCustomExp] = useState<string>('');
  // 减分理由选择弹窗状态
  const [showReasonPicker, setShowReasonPicker] = useState(false);
  const [selectedReasonType, setSelectedReasonType] = useState<string>('');
  const [pendingPoints, setPendingPoints] = useState<number>(0);
  const [pendingExp, setPendingExp] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      setCustomPoints('');
      setCustomExp('');
      setShowReasonPicker(false);
      setSelectedReasonType('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCustomConfirm = () => {
    const pts = parseInt(customPoints);
    const exp = parseInt(customExp);

    if (!isNaN(pts) || !isNaN(exp)) {
      const finalPts = isNaN(pts) ? 0 : pts;
      const finalExp = isNaN(exp) ? 0 : exp;

      // 减分：弹出理由选择弹窗
      if (finalPts < 0) {
        setPendingPoints(finalPts);
        setPendingExp(finalExp);
        setShowReasonPicker(true);
        return;
      }

      // 加分/经验调整：直接提交，reason 自动生成
      const reason = finalPts > 0 ? '手动加分' : '经验调整';
      onConfirm(finalPts, reason, finalExp, undefined);
    }
  };

  // 减分理由确认 —— reason 直接由 reasonType 决定，不再需要输入框
  const handleReasonConfirm = () => {
    if (!selectedReasonType) return;
    const reason = selectedReasonType === 'EXCHANGE' ? '积分兑换' : '减分惩罚';
    onConfirm(pendingPoints, reason, pendingExp, selectedReasonType);
    setShowReasonPicker(false);
  };

  // 抢人功能
  const handleTransferToMyClass = () => {
    if (onTransfer && selectedStudents.length > 0) {
      onTransfer(selectedStudents.map(s => s.id), 'current');
      onClose();
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const getReasonTypeTag = (reasonType?: string | null) => {
    if (reasonType === 'EXCHANGE') {
      return <span className="text-[10px] font-bold bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">积分兑换</span>;
    }
    if (reasonType === 'DEDUCT') {
      return <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">减分</span>;
    }
    return null;
  };

  const getButtonText = () => {
    const pts = parseInt(customPoints);
    if (isNaN(pts) || pts === 0) return '确认调整';
    return pts > 0 ? '确认加分' : '确认减分';
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-[2px] transition-opacity animate-in fade-in">
      <div className="absolute inset-0" onClick={onClose}></div>

      <div className="relative bg-white w-full max-w-none rounded-t-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 overflow-hidden max-h-[85vh] flex flex-col">
        <div className="w-full flex justify-center pt-3 pb-1" onClick={onClose}>
          <div className="w-12 h-1.5 bg-gray-200 rounded-full"></div>
        </div>

        <div className="flex items-center justify-between p-5 border-b border-gray-100 bg-white sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            {selectedStudents.length === 1 ? (
              <>
                <img src={selectedStudents[0]?.avatarUrl || '/avatar.jpg'} alt="avatar" className="w-12 h-12 rounded-full border-2 border-orange-100 shadow-sm" />
                <div>
                  <p className="font-bold text-lg text-gray-800">{selectedStudents[0].name}</p>
                  <div className="flex items-center space-x-2 text-xs font-medium">
                    <span className="text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">积分: {selectedStudents[0].points}</span>
                    <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">经验: {selectedStudents[0].exp}</span>
                  </div>
                </div>
              </>
            ) : (
              <div>
                <p className="font-bold text-lg text-gray-800">批量操作</p>
                <p className="text-xs text-gray-500 mt-0.5">已选中 <span className="text-primary font-bold">{selectedStudents.length}</span> 位学生</p>
              </div>
            )}
          </div>
          <button onClick={onClose} className="p-2 bg-gray-50 rounded-full hover:bg-gray-200 transition-colors text-gray-500">
            <X size={24} />
          </button>
        </div>

        {/* 抢人功能 */}
        {(() => {
          const shouldShow = !!(onTransfer && (viewMode === 'ALL_SCHOOL' || viewMode === 'SPECIFIC_CLASS'));
          return shouldShow;
        })() && (
          <div className="px-4 pb-2">
            <button
              onClick={handleTransferToMyClass}
              className="w-full bg-blue-600 text-white font-bold rounded-xl py-3.5 hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg flex items-center justify-center gap-2"
            >
              <UserPlus size={20} />
              移入我的班级 ({selectedStudents.length}人)
            </button>
          </div>
        )}

        {/* 积分调整功能 */}
        {(viewMode === 'MY_STUDENTS' || isProxyMode) && (
          <div className="p-5 border-t border-gray-100 bg-white pb-14 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] overflow-y-auto flex-1">

            {/* 最近7条操作记录 */}
            {scoreHistory.length > 0 && (
              <div className="mb-4 bg-gray-50 rounded-xl border border-gray-100 overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
                  <History size={14} className="text-gray-400" />
                  <span className="text-xs font-medium text-gray-500">最近操作记录</span>
                  <span className="text-[10px] text-gray-300 ml-auto">{scoreHistory.length}条</span>
                </div>
                <div className="divide-y divide-gray-50">
                  {scoreHistory.map((record) => (
                    <div key={record.id} className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center gap-2">
                        {record.points !== 0 && (
                          <span className={`text-sm font-bold ${record.points > 0 ? 'text-orange-600' : 'text-red-500'}`}>
                            {record.points > 0 ? '+' : ''}{record.points}积分
                          </span>
                        )}
                        {record.exp !== 0 && (
                          <span className="text-xs font-bold text-blue-600">
                            {record.exp > 0 ? '+' : ''}{record.exp}经验
                          </span>
                        )}
                        {getReasonTypeTag(record.reasonType)}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-gray-400">
                          {record.operatorName && `${record.operatorName} · `}
                          {formatDate(record.operatedAt)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 积分/经验输入（已删除原因输入框） */}
            <div className="flex gap-3 items-center mb-4">
              <div className="flex-1 relative">
                <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold text-gray-400">积分</label>
                <input
                  type="number"
                  placeholder="0"
                  value={customPoints}
                  onChange={(e) => setCustomPoints(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center font-bold text-gray-800 focus:ring-2 focus:ring-primary focus:border-transparent outline-none bg-gray-50"
                />
              </div>
              <div className="flex-1 relative">
                <label className="absolute -top-2 left-2 bg-white px-1 text-[10px] font-bold text-gray-400">经验值</label>
                <input
                  type="number"
                  placeholder="0"
                  value={customExp}
                  onChange={(e) => setCustomExp(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-center font-bold text-gray-800 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none bg-gray-50"
                />
              </div>
            </div>

            <button
              onClick={handleCustomConfirm}
              className="w-full bg-gray-900 text-white font-bold rounded-xl py-3.5 hover:bg-gray-800 active:scale-[0.98] transition-all shadow-lg"
            >
              {getButtonText()}
            </button>
          </div>
        )}

        {/* 非我的学生且非代理视图的提示 */}
        {viewMode !== 'MY_STUDENTS' && !isProxyMode && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mx-4 mb-4">
            <div className="text-center">
              <p className="text-sm font-medium text-blue-600 mb-1">🔒 积分调整功能锁定</p>
              <p className="text-xs text-blue-500">
                {viewMode === 'SPECIFIC_CLASS' ? '当前为临时查看模式，如需代管理请至"我的"页发起。' : '请切换到"我的学生"视图以调整积分'}
              </p>
            </div>
          </div>
        )}

        {/* 减分理由选择弹窗 */}
        {showReasonPicker && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-2xl p-5 mx-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
              <h3 className="text-lg font-bold text-gray-800 text-center mb-4">请选择减分原因</h3>

              <div className="flex gap-3 mb-5">
                <button
                  onClick={() => setSelectedReasonType('DEDUCT')}
                  className={`flex-1 py-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    selectedReasonType === 'DEDUCT'
                      ? 'border-gray-800 bg-gray-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <TrendingDown size={24} className={selectedReasonType === 'DEDUCT' ? 'text-gray-800' : 'text-gray-400'} />
                  <span className={`text-sm font-bold ${selectedReasonType === 'DEDUCT' ? 'text-gray-800' : 'text-gray-500'}`}>
                    减分惩罚
                  </span>
                </button>

                <button
                  onClick={() => setSelectedReasonType('EXCHANGE')}
                  className={`flex-1 py-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                    selectedReasonType === 'EXCHANGE'
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <Gift size={24} className={selectedReasonType === 'EXCHANGE' ? 'text-orange-500' : 'text-gray-400'} />
                  <span className={`text-sm font-bold ${selectedReasonType === 'EXCHANGE' ? 'text-orange-600' : 'text-gray-500'}`}>
                    积分兑换
                  </span>
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setShowReasonPicker(false); setSelectedReasonType(''); }}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl"
                >
                  取消
                </button>
                <button
                  onClick={handleReasonConfirm}
                  disabled={!selectedReasonType}
                  className={`flex-1 py-3 font-bold rounded-xl transition-all ${
                    selectedReasonType
                      ? 'bg-gray-900 text-white active:scale-[0.98]'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  确认减分
                </button>
              </div>

              {!selectedReasonType && (
                <p className="text-xs text-center text-gray-400 mt-3">请先选择减分原因</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActionSheet;
