import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Rocket, Trophy, Clock, Award, Layout, TrendingUp, Star, Monitor, Swords, LayoutDashboard } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import DataDashboard from '../components/BigScreen/DataDashboard';
import StarshipBattleView, { BattleData } from '../components/BigScreen/StarshipBattleView';
import StreakLeaderboard from '../components/BigScreen/StreakLeaderboard';
import { apiService } from '../services/api.service';

// 获取用户信息
const getUserInfo = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }
  return null;
};

const userInfo = getUserInfo();

const BigScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);
  const [activeBattles, setActiveBattles] = useState<BattleData[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // 🔌 初始化 Socket.IO 连接
  useEffect(() => {
    const token = localStorage.getItem('token');
    const currentUserInfo = getUserInfo(); // 每次重新获取，检测账号切换
    const schoolId = currentUserInfo?.schoolId;

    if (!schoolId) {
      console.warn('[BigScreen] No schoolId found, running in demo mode');
      return;
    }

    // 🆕 检测账号切换：如果 schoolId 变了，刷新整个页面以重新建立连接
    const cachedSchoolId = sessionStorage.getItem('bigscreen_schoolId');
    if (cachedSchoolId && cachedSchoolId !== schoolId) {
      console.log('[BigScreen] ⚠️ 检测到账号切换，正在刷新页面...');
      sessionStorage.setItem('bigscreen_schoolId', schoolId);
      window.location.reload();
      return;
    }
    sessionStorage.setItem('bigscreen_schoolId', schoolId);

    console.log('[BigScreen] Initializing Socket.IO connection...');

    const newSocket = io(window.location.origin, {
      auth: { token },
      query: { schoolId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    });

    newSocket.on('connect', () => {
      console.log('[BigScreen] ✅ Socket connected:', newSocket.id);
      setIsConnected(true);
      // 加入学校房间
      newSocket.emit('JOIN_SCHOOL_ROOM', { schoolId });
    });

    newSocket.on('disconnect', () => {
      console.log('[BigScreen] ❌ Socket disconnected');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (err) => {
      console.error('[BigScreen] Socket connection error:', err.message);
      setIsConnected(false);
    });

    setSocket(newSocket);

    return () => {
      console.log('[BigScreen] Cleaning up socket connection');
      newSocket.disconnect();
    };
  }, []);

  // 🆕 初始加载活跃 PK 对战（刷新后仍能显示进行中的 PK）
  useEffect(() => {
    const userInfo = getUserInfo();
    const schoolId = userInfo?.schoolId;
    if (!schoolId) return;

    const fetchActivePKs = async () => {
      try {
        const response = await apiService.get<any>(`/pkmatch?schoolId=${schoolId}&status=ONGOING`);
        if (response.success && response.data && Array.isArray(response.data)) {
          const battles = response.data.map((match: any) => ({
            id: match.id,
            type: 'pk' as const,
            studentA: match.playerA ? {
              id: match.playerA.id,
              name: match.playerA.name,
              avatar_url: match.playerA.avatarUrl || '/avatar.jpg',
              team_name: match.playerA.className,
              energy: 100,
              score: match.playerA.exp || 0
            } : undefined,
            studentB: match.playerB ? {
              id: match.playerB.id,
              name: match.playerB.name,
              avatar_url: match.playerB.avatarUrl || '/avatar.jpg',
              team_name: match.playerB.className,
              energy: 100,
              score: match.playerB.exp || 0
            } : undefined,
            topic: match.topic,
            status: 'active' as const,
            startTime: new Date(match.createdAt).getTime(),
            rewardPoints: match.metadata?.pointsReward || 20,
            rewardExp: match.metadata?.expReward || 50
          }));
          console.log('[BigScreen] 🎮 Loaded', battles.length, 'ongoing PK(s)');
          setActiveBattles(battles);
        }
      } catch (err) {
        console.warn('[BigScreen] Failed to load active PKs:', err);
      }
    };

    fetchActivePKs();
  }, []);

  // WebSocket事件监听
  useEffect(() => {
    if (!socket) return;

    // 监听PK开始事件
    const handlePKStart = (data: any) => {
      console.log('🎮 PK Start Event:', data);
      const newBattle: BattleData = {
        id: data.matchId || `pk-${Date.now()}`,
        type: 'pk',
        studentA: data.playerA ? {
          id: data.playerA.id,
          name: data.playerA.name,
          avatar_url: data.playerA.avatarUrl || '/avatar.jpg',
          team_name: data.playerA.className,
          energy: 100,
          score: data.playerA.exp || 0
        } : undefined,
        studentB: data.playerB ? {
          id: data.playerB.id,
          name: data.playerB.name,
          avatar_url: data.playerB.avatarUrl || '/avatar.jpg',
          team_name: data.playerB.className,
          energy: 100,
          score: data.playerB.exp || 0
        } : undefined,
        topic: data.topic,
        status: 'starting',
        startTime: Date.now(),
        rewardPoints: data.rewardPoints || 100,
        rewardExp: data.rewardExp || 50
      };

      setActiveBattles(prev => {
        const exists = prev.find(b => b.id === newBattle.id);
        if (exists) return prev;
        return [...prev, newBattle];
      });

      // 自动切换到3屏（PK模式）
      setActiveTab(3);

      // 3秒后激活战斗
      setTimeout(() => {
        setActiveBattles(prev => prev.map(b => b.id === newBattle.id ? { ...b, status: 'active' } : b));
      }, 3000);
    };

    // 监听PK结束事件
    const handlePKEnd = (data: any) => {
      console.log('🏁 PK End Event:', data);
      setActiveBattles(prev => prev.map(b =>
        (b.id === data.matchId || (b.type === 'pk' && b.status !== 'ended'))
          ? { ...b, status: 'ended', winner_id: data.winnerId }
          : b
      ));

      // 8秒后从列表中移除该场对战
      setTimeout(() => {
        setActiveBattles(prev => {
          const filtered = prev.filter(b => b.id !== data.matchId && b.status !== 'ended');
          // 如果没有对战了，延迟切回1屏
          if (filtered.length === 0) {
            // setActiveTab(1); // 可选：是否自动切回
          }
          return filtered;
        });
      }, 8000);
    };

    // 监听挑战事件
    const handleChallengeStart = (data: any) => {
      console.log('⚡ Challenge Start Event:', data);
      const newBattle: BattleData = {
        id: `challenge-${Date.now()}`,
        type: 'challenge',
        studentA: data.student ? {
          id: data.student.id,
          name: data.student.name,
          avatar_url: data.student.avatarUrl || '/avatar.jpg',
          team_name: data.student.className,
          energy: 100,
          score: data.student.exp || 0
        } : undefined,
        topic: data.title,
        status: 'active',
        startTime: Date.now()
      };

      setActiveBattles(prev => [...prev, newBattle]);
      // 自动切换到3屏
      setActiveTab(3);

      // 10秒后自动移除挑战（挑战通常是瞬时的展示）
      setTimeout(() => {
        setActiveBattles(prev => prev.filter(b => b.id !== newBattle.id));
      }, 10000);
    };

    // 🔧 监听统一的 DATA_UPDATE 事件（后端使用此事件名）
    const handleDataUpdate = (payload: any) => {
      console.log('📡 DATA_UPDATE received:', payload.type, payload.data);

      switch (payload.type) {
        case 'PKMATCH_CREATED':
          // PK 对战创建
          const match = payload.data?.match;
          if (match) {
            handlePKStart({
              matchId: match.id,
              playerA: match.playerA,
              playerB: match.playerB,
              topic: match.topic
            });
          }
          break;

        case 'PKMATCH_COMPLETED':
        case 'PKMATCH_UPDATED':
          // PK 对战结束
          const matchData = payload.data?.match;
          if (matchData && matchData.status === 'COMPLETED') {
            handlePKEnd({
              matchId: matchData.id,
              winnerId: matchData.winnerId
            });
          }
          break;

        case 'CHALLENGE_COMPLETED':
          // 挑战完成
          if (payload.data?.student) {
            handleChallengeStart({
              student: payload.data.student,
              title: payload.data.title || '挑战任务'
            });
          }
          break;
      }
    };

    // 注册事件监听器
    socket.on('DATA_UPDATE', handleDataUpdate);
    // 保留直接事件监听
    socket.on('PK_START', handlePKStart);
    socket.on('PK_END', handlePKEnd);
    socket.on('CHALLENGE_START', handleChallengeStart);

    // 清理事件监听器
    return () => {
      socket.off('DATA_UPDATE', handleDataUpdate);
      socket.off('PK_START', handlePKStart);
      socket.off('PK_END', handlePKEnd);
      socket.off('CHALLENGE_START', handleChallengeStart);
    };
  }, [socket]);

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1') setActiveTab(1);
      if (e.key === '2') setActiveTab(2);
      if (e.key === '3') setActiveTab(3);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 页面切换动画配置
  const pageVariants = {
    initial: { opacity: 0, scale: 0.98, translateY: 10 },
    animate: { opacity: 1, scale: 1, translateY: 0 },
    exit: { opacity: 0, scale: 1.02, translateY: -10 }
  };

  const pageTransition = {
    type: "tween" as const,
    ease: "anticipate" as const,
    duration: 0.6
  };

  const tabs = [
    { id: 1, name: '大屏', icon: Monitor },
    { id: 2, name: '排行', icon: Trophy },
    { id: 3, name: 'PK', icon: Swords },
  ];

  return (
    <div className="w-screen h-screen bg-black text-white overflow-hidden relative font-sans">

      {/* 顶部全局导航栏 */}
      <header className="absolute top-0 left-0 right-0 h-[6vh] z-50 flex items-center justify-between px-[1.5vw] bg-slate-900/10 backdrop-blur-sm border-b border-white/5">
        {/* 左侧：校区标识 */}
        <div className="flex items-center gap-[0.8vw]">
          <div className="w-[3.2vh] h-[3.2vh] rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Layout className="w-[1.8vh] h-[1.8vh] text-white" />
          </div>
          <h1 className="text-[1.6vh] font-black bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent leading-none">
            星途成长方舟 · {userInfo?.schoolName || '校区名字'}
          </h1>
        </div>

        {/* 中间：屏幕切换按钮 - 进一步缩小 */}
        <div className="flex bg-slate-900/60 backdrop-blur-md rounded-xl p-0.5 border border-white/10 shadow-2xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                relative px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all duration-300 flex items-center gap-1.5
                ${activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg scale-105'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <tab.icon size={11} className={activeTab === tab.id ? 'animate-pulse' : ''} />
              <span>{tab.name}</span>

              {tab.id === 3 && activeBattles.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500 border border-white/20"></span>
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 右侧：时间日期 */}
        <div className="flex items-center gap-4">
          <div className="glass-card px-[1vw] py-[0.5vh] rounded-lg border border-white/10 flex items-center gap-3">
            <Clock size={12} className="text-blue-400" />
            <span className="text-[1.4vh] font-black font-mono text-white leading-none">
              {new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <AnimatePresence mode="wait">
        {activeTab === 1 && (
          <motion.div
            key="dashboard"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="absolute inset-0"
          >
            <DataDashboard />
          </motion.div>
        )}

        {activeTab === 2 && (
          <motion.div
            key="leaderboard"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="absolute inset-0"
          >
            <StreakLeaderboard schoolId={userInfo?.schoolId || 'demo'} />
          </motion.div>
        )}

        {activeTab === 3 && (
          <motion.div
            key="battle"
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={pageTransition}
            className="absolute inset-0"
          >
            <StarshipBattleView
              activeBattles={activeBattles}
            />
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default BigScreen;