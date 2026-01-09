import React, { useState } from 'react';
import { X, BookOpen, ChevronRight, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface GuideSection {
  id: string;
  title: string;
  icon: string;
  content: React.ReactNode;
}

const FiveDimensionGuide = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [activeSection, setActiveSection] = useState('overview');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    const newSet = new Set(expandedItems);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedItems(newSet);
  };

  const sections: GuideSection[] = [
    {
      id: 'overview',
      title: '系统概述',
      icon: '📖',
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            五维内功系统是 ArkOK 的核心能力评估框架，通过 <strong>技能修炼</strong> → <strong>属性积累</strong> → <strong>等级提升</strong> 的机制，全面衡量学生的自主学习力。
          </p>
          <div className="bg-orange-50 p-4 rounded-xl border-l-4 border-orange-500">
            <p className="text-xs text-orange-700 font-medium">
              💡 教师认证技能 → 技能经验+1 → 维度经验+5 → 等级提升
            </p>
          </div>
        </div>
      )
    },
    {
      id: 'dimensions',
      title: '五维内功维度',
      icon: '🎯',
      content: (
        <div className="space-y-3">
          {[
            { name: '内省力', key: 'reflection', icon: '🟥', desc: '自我检查、错误纠正、复盘能力', color: 'bg-red-50 border-red-200' },
            { name: '逻辑力', key: 'logic', icon: '🟦', desc: '推理分析、结构化思维、知识串联', color: 'bg-blue-50 border-blue-200' },
            { name: '自主力', key: 'autonomy', icon: '🟨', desc: '主动学习、自发探索、费曼传道', color: 'bg-yellow-50 border-yellow-200' },
            { name: '规划力', key: 'planning', icon: '🟩', desc: '时间管理、计划制定、优先级排序', color: 'bg-green-50 border-green-200' },
            { name: '毅力值', key: 'grit', icon: '🟧', desc: '坚持不懈、百折不挠、持续积累', color: 'bg-orange-50 border-orange-200' },
          ].map((dim) => (
            <div key={dim.key} className={`p-3 rounded-lg border ${dim.color}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lg">{dim.icon}</span>
                <span className="font-bold text-sm">{dim.name}</span>
                <span className="text-xs text-slate-500 ml-auto">{dim.key}</span>
              </div>
              <p className="text-xs text-slate-600">{dim.desc}</p>
            </div>
          ))}
        </div>
      )
    },
    {
      id: 'levels',
      title: '三层等级系统',
      icon: '📊',
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
              <h4 className="font-bold text-purple-800 mb-2">👑 总等级 (Character Level)</h4>
              <p className="text-xs text-purple-700">所有经验总和 → Lv.1-10: 初窥门径 → 一代宗师 (0-23000 exp)</p>
            </div>
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
              <h4 className="font-bold text-blue-800 mb-2">⚡ 维度等级 (Dimension Level)</h4>
              <p className="text-xs text-blue-700">该维度下所有技能经验总和 → Lv.1-5: 学徒 → 首席 (0-150 exp)</p>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
              <h4 className="font-bold text-green-800 mb-2">🎖️ 技能等级 (Skill Level)</h4>
              <p className="text-xs text-green-700">每个技能独立等级 → Lv.1-3: 解锁 → 大师</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'skills',
      title: '技能库详解',
      icon: '🎓',
      content: (
        <div className="space-y-2">
          {[
            {
              dimension: '🟥 内省力',
              skills: [
                { name: '三色修补术', exp: '5/20/50', desc: '纠错学徒 → 订正能手 → 治愈大师' },
                { name: '雷达自检眼', exp: '3/15/40', desc: '扫雷兵 → 质检员 → 免检金牌' },
                { name: '试卷体检法', exp: '2/8/20', desc: '查病单 → 诊疗师 → 神医圣手' },
                { name: '日悟心法', exp: '7/21/60', desc: '记录者 → 内省者 → 觉悟者' },
                { name: '盲区探照灯', exp: '5/20/50', desc: '提问生 → 补漏匠 → 无缺公子' },
                { name: '细读定身咒', exp: '10/30/80', desc: '圈词人 → 审题王 → 火眼金睛' },
              ]
            },
            {
              dimension: '🟦 逻辑力',
              skills: [
                { name: '母题溯源眼', exp: '3/10/30', desc: '寻源者 → 破题手 → 通透宗师' },
                { name: '思维草图术', exp: '5/20/50', desc: '草稿新手 → 绘图师 → 推演专家' },
                { name: '结构解牛刀', exp: '3/10/30', desc: '拆书匠 → 架构师 → 全知视界' },
                { name: '异同辨析手', exp: '3/10/30', desc: '辨字员 → 明眼人 → 鉴别大师' },
                { name: '万能模型卡', exp: '2/8/20', desc: '模具工 → 建模师 → 举一反三' },
                { name: '知识串联桥', exp: '2/5/15', desc: '织网蛛 → 筑桥师 → 体系构建者' },
              ]
            },
            {
              dimension: '🟨 自主力',
              skills: [
                { name: '费曼传道', exp: '3/15/40', desc: '小助教 → 讲坛新秀 → 传道教授' },
                { name: '字字开花', exp: '10/50/200', desc: '采花童 → 词汇库 → 博学文曲' },
                { name: '素材捕捉手', exp: '5/20/60', desc: '拾贝者 → 收藏家 → 生活智者' },
                { name: '追问求索心', exp: '5/15/40', desc: '好奇宝宝 → 探究员 → 真理追求者' },
                { name: '侠义助人', exp: '5/20/50', desc: '热心肠 → 及时雨 → 侠之大者' },
                { name: '生活算术师', exp: '2/8/20', desc: '应用生 → 精算师 → 实干家' },
              ]
            },
            {
              dimension: '🟩 规划力',
              skills: [
                { name: '掌舵规划术', exp: '2/8/20', desc: '水手 → 大副 → 传奇船长' },
                { name: '前哨侦查兵', exp: '5/20/50', desc: '探路者 → 先锋官 → 预知未来' },
                { name: '粮草先行官', exp: '7/30/90', desc: '整理员 → 管家 → 井井有条' },
                { name: '番茄时钟法', exp: '10/40/100', desc: '守时者 → 效率达人 → 时间领主' },
                { name: '要事第一策', exp: '5/20/60', desc: '排序员 → 执行官 → 运筹帷幄' },
              ]
            },
            {
              dimension: '🟧 毅力值',
              skills: [
                { name: '定力禅修', exp: '5/20/60', desc: '静心 → 入定 → 金刚不坏' },
                { name: '薪火相传', exp: '7/21/100', desc: '点火者 → 持炬人 → 永恒之火' },
                { name: '百折不挠', exp: '3/10/30', desc: '挑战者 → 破壁人 → 逆境战神' },
                { name: '千锤百炼', exp: '20/80/200', desc: '苦修僧 → 基本功王 → 肌肉记忆' },
                { name: '滴水穿石', exp: '10/50/200', desc: '积水潭 → 汇川河 → 汪洋海' },
              ]
            },
          ].map((dim) => (
            <div key={dim.dimension} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleExpand(dim.dimension)}
                className="w-full p-3 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center justify-between"
              >
                <span className="font-bold text-sm">{dim.dimension}</span>
                <ChevronDown
                  size={16}
                  className={`transition-transform ${expandedItems.has(dim.dimension) ? 'rotate-180' : ''}`}
                />
              </button>
              <AnimatePresence>
                {expandedItems.has(dim.dimension) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 space-y-2 bg-white">
                      {dim.skills.map((skill, idx) => (
                        <div key={idx} className="flex items-start gap-2 p-2 rounded bg-slate-50 border border-slate-100">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-xs">{skill.name}</span>
                              <span className="text-[10px] text-slate-500">{skill.exp} exp</span>
                            </div>
                            <p className="text-[10px] text-slate-600">{skill.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )
    },
    {
      id: 'mapping',
      title: '任务映射表',
      icon: '📋',
      content: (
        <div className="space-y-3">
          <p className="text-xs text-slate-600 mb-3">核心教学法任务映射到技能的示例：</p>
          {[
            { task: '用"三色笔法"整理作业', skill: '三色修补术', dimension: '🟥 内省力' },
            { task: '错题归类与规律发现', skill: '母题溯源眼', dimension: '🟦 逻辑力' },
            { task: '制定学习计划', skill: '掌舵规划术', dimension: '🟩 规划力' },
            { task: '主动举手发言', skill: '百折不挠', dimension: '🟧 毅力值' },
            { task: '帮助同学讲解', skill: '费曼传道', dimension: '🟨 自主力' },
            { task: '作文提纲与修改', skill: '掌舵规划术', dimension: '🟩 规划力' },
            { task: '阅读理解策略练习', skill: '异同辨析手', dimension: '🟦 逻辑力' },
            { task: '课外阅读30分钟', skill: '滴水穿石', dimension: '🟧 毅力值' },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 rounded bg-slate-50 border border-slate-200">
              <span className="text-xs flex-1">{item.task}</span>
              <ChevronRight size={14} className="text-slate-400" />
              <span className="text-xs font-bold text-orange-600">{item.skill}</span>
              <span className="text-xs">{item.dimension}</span>
            </div>
          ))}
        </div>
      )
    },
    {
      id: 'mechanics',
      title: '机制说明',
      icon: '⚙️',
      content: (
        <div className="space-y-3">
          <div className="bg-blue-50 p-3 rounded-lg border-l-4 border-blue-500">
            <h4 className="font-bold text-sm text-blue-800 mb-1">🎯 技能认证</h4>
            <p className="text-xs text-blue-700">教师手动认证 → 技能经验+1 → 判定是否升级</p>
          </div>
          <div className="bg-green-50 p-3 rounded-lg border-l-4 border-green-500">
            <h4 className="font-bold text-sm text-green-800 mb-1">🔥 维度提升</h4>
            <p className="text-xs text-green-700">技能经验累积 → 维度经验+5 → 判定是否升级</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-lg border-l-4 border-purple-500">
            <h4 className="font-bold text-sm text-purple-800 mb-1">👑 总等级</h4>
            <p className="text-xs text-purple-700">所有经验总和（技能+PK+挑战+习惯）→ 总等级提升</p>
          </div>
          <div className="bg-orange-50 p-3 rounded-lg border-l-4 border-orange-500">
            <h4 className="font-bold text-sm text-orange-800 mb-1">🏆 连胜奖励</h4>
            <p className="text-xs text-orange-700">3连胜+10exp → 7连胜+30exp → 14连胜+60exp...</p>
          </div>
        </div>
      )
    },
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* 背景遮罩 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* 弹窗内容 */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative bg-white rounded-[32px] shadow-2xl max-w-4xl w-full max-h-[85vh] overflow-hidden flex"
        >
          {/* 左侧导航 */}
          <div className="w-56 bg-gradient-to-b from-orange-50 to-rose-50 p-6 border-r border-orange-100 overflow-y-auto">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
                <BookOpen size={20} className="text-white" />
              </div>
              <div>
                <h2 className="font-black text-orange-900">五维修炼</h2>
                <p className="text-[10px] text-orange-600">新手村向导</p>
              </div>
            </div>

            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all text-left ${
                    activeSection === section.id
                      ? 'bg-white shadow-md text-orange-600 font-bold'
                      : 'text-slate-600 hover:bg-white/50'
                  }`}
                >
                  <span className="text-lg">{section.icon}</span>
                  <span className="text-xs">{section.title}</span>
                  {activeSection === section.id && <ChevronRight size={14} className="ml-auto" />}
                </button>
              ))}
            </nav>
          </div>

          {/* 右侧内容 */}
          <div className="flex-1 flex flex-col">
            {/* 标题栏 */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{sections.find(s => s.id === activeSection)?.icon}</span>
                <h2 className="text-xl font-black text-slate-800">
                  {sections.find(s => s.id === activeSection)?.title}
                </h2>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
              >
                <X size={18} className="text-slate-600" />
              </button>
            </div>

            {/* 内容区域 */}
            <div className="flex-1 overflow-y-auto p-6">
              <AnimatePresence mode="wait">
                {sections.map((section) => (
                  activeSection === section.id && (
                    <motion.div
                      key={section.id}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.2 }}
                    >
                      {section.content}
                    </motion.div>
                  )
                ))}
              </AnimatePresence>
            </div>

            {/* 底部提示 */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <p className="text-[10px] text-slate-500 text-center">
                💡 提示：点击技能库详解中的维度可展开查看所有技能
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default FiveDimensionGuide;
