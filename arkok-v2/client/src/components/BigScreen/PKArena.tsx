import { motion, useAnimation } from 'framer-motion';
import { useEffect, useState } from 'react';

interface PKArenaProps {
  match: {
    id: string;
    playerA: {
      name: string;
      className: string;
      avatarUrl?: string;
    };
    playerB: {
      name: string;
      className: string;
      avatarUrl?: string;
    };
    topic: string;
    createdAt: string;
  };
  onComplete?: () => void;
}

export function PKArena({ match, onComplete }: PKArenaProps) {
  const [countdown, setCountdown] = useState(3);
  const [battlePhase, setBattlePhase] = useState<'countdown' | 'battle' | 'result'>('countdown');
  const controls = useAnimation();

  useEffect(() => {
    // 倒计时阶段
    const countdownInterval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setBattlePhase('battle');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(countdownInterval);
  }, []);

  useEffect(() => {
    // 战斗阶段
    if (battlePhase === 'battle') {
      const battleTimer = setTimeout(() => {
        setBattlePhase('result');
      }, 8000); // 8秒战斗时间

      return () => clearTimeout(battleTimer);
    }
  }, [battlePhase]);

  useEffect(() => {
    // 结果展示阶段
    if (battlePhase === 'result') {
      const resultTimer = setTimeout(() => {
        if (onComplete) onComplete();
      }, 6000); // 结果展示6秒

      return () => clearTimeout(resultTimer);
    }
  }, [battlePhase, onComplete]);

  useEffect(() => {
    // 启动动画序列
    controls.start({
      scale: [1, 1.05, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    });
  }, [controls]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center relative">
      {/* 战斗背景效果 */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-r from-red-900 via-purple-900 to-blue-900 opacity-50" />

        {/* 动态光束 */}
        <motion.div
          className="absolute top-1/2 left-0 w-1/2 h-1 bg-gradient-to-r from-transparent via-red-500 to-transparent"
          style={{ y: '-50%' }}
          animate={{
            x: ['-100%', '200%'],
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
        />

        <motion.div
          className="absolute top-1/2 right-0 w-1/2 h-1 bg-gradient-to-l from-transparent via-blue-500 to-transparent"
          style={{ y: '-50%' }}
          animate={{
            x: ['100%', '-200%'],
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
        />
      </div>

      {/* 倒计时阶段 */}
      {battlePhase === 'countdown' && (
        <motion.div
          className="text-center z-20"
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
        >
          <motion.h1
            className="text-6xl font-bold mb-4 bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent"
            animate={{
              scale: [1, 1.2, 1],
              rotate: [0, 5, -5, 0]
            }}
            transition={{
              duration: 1,
              repeat: countdown > 0 ? Infinity : 0,
              ease: "easeInOut"
            }}
          >
            ⚔️ PK 对战 ⚔️
          </motion.h1>

          <motion.div
            className="text-8xl font-bold text-cyan-400 mb-8"
            key={countdown}
            initial={{ scale: 0, rotateY: -180 }}
            animate={{ scale: 1, rotateY: 0 }}
            exit={{ scale: 0, rotateY: 180 }}
            transition={{
              duration: 0.5,
              type: "spring",
              stiffness: 200
            }}
          >
            {countdown || 'GO!'}
          </motion.div>

          <div className="text-xl text-gray-300">
            主题：<span className="text-cyan-400 font-bold">{match.topic}</span>
          </div>
        </motion.div>
      )}

      {/* 战斗阶段 */}
      {battlePhase === 'battle' && (
        <motion.div
          className="w-full max-w-6xl mx-auto px-8 z-20"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.2 }}
        >
          <div className="grid grid-cols-3 gap-8 items-center">
            {/* 玩家A */}
            <motion.div
              className="text-center"
              animate={{
                x: [0, -10, 10, 0]
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <motion.div
                className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 p-2"
                animate={{
                  rotate: [0, 360]
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-5xl font-bold text-white">
                  {match.playerA.name.charAt(0)}
                </div>
              </motion.div>

              <h2 className="text-3xl font-bold text-cyan-400 mb-2">{match.playerA.name}</h2>
              <p className="text-lg text-gray-300">{match.playerA.className}</p>

              {/* 血条 */}
              <div className="mt-4 h-4 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-400 to-blue-500"
                  animate={{
                    width: ['100%', '80%', '90%', '70%', '85%', '75%']
                  }}
                  transition={{
                    duration: 8,
                    ease: "easeInOut"
                  }}
                />
              </div>
            </motion.div>

            {/* VS 中心 */}
            <motion.div
              className="text-center"
              animate={controls}
            >
              <div className="text-6xl font-bold bg-gradient-to-r from-red-500 to-orange-500 bg-clip-text text-transparent mb-4">
                VS
              </div>
              <div className="text-2xl text-gray-300 font-bold">{match.topic}</div>

              {/* 战斗特效 */}
              <motion.div
                className="mt-4 text-4xl"
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [1, 0, 1]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                ⚡
              </motion.div>
            </motion.div>

            {/* 玩家B */}
            <motion.div
              className="text-center"
              animate={{
                x: [0, 10, -10, 0]
              }}
              transition={{
                duration: 0.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <motion.div
                className="w-32 h-32 mx-auto mb-4 rounded-full bg-gradient-to-r from-orange-400 to-red-500 p-2"
                animate={{
                  rotate: [0, -360]
                }}
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "linear"
                }}
              >
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center text-5xl font-bold text-white">
                  {match.playerB.name.charAt(0)}
                </div>
              </motion.div>

              <h2 className="text-3xl font-bold text-orange-400 mb-2">{match.playerB.name}</h2>
              <p className="text-lg text-gray-300">{match.playerB.className}</p>

              {/* 血条 */}
              <div className="mt-4 h-4 bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-gradient-to-r from-orange-400 to-red-500"
                  animate={{
                    width: ['100%', '85%', '75%', '90%', '80%', '70%']
                  }}
                  transition={{
                    duration: 8,
                    ease: "easeInOut"
                  }}
                />
              </div>
            </motion.div>
          </div>

          {/* 战斗装饰 */}
          <div className="absolute top-1/4 left-1/4 text-6xl opacity-20">
            <motion.div
              animate={{
                rotate: [0, 360],
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              ⚔️
            </motion.div>
          </div>

          <div className="absolute top-1/4 right-1/4 text-6xl opacity-20">
            <motion.div
              animate={{
                rotate: [0, -360],
                scale: [1, 1.2, 1]
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "linear"
              }}
            >
              🛡️
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* 结果阶段 */}
      {battlePhase === 'result' && (
        <motion.div
          className="text-center z-20"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.5 }}
        >
          <motion.div
            className="text-8xl mb-6"
            animate={{
              scale: [1, 1.3, 1],
              rotate: [0, 10, -10, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            🏆
          </motion.div>

          <h1 className="text-5xl font-bold bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent mb-8">
            战斗结束！
          </h1>

          <div className="grid grid-cols-2 gap-8 max-w-2xl mx-auto">
            <motion.div
              className="bg-gradient-to-r from-cyan-900 to-blue-900 bg-opacity-50 rounded-xl p-6 border border-cyan-500 border-opacity-50"
              whileHover={{ scale: 1.05 }}
            >
              <h3 className="text-2xl font-bold text-cyan-400 mb-2">{match.playerA.name}</h3>
              <p className="text-gray-300">{match.playerA.className}</p>
            </motion.div>

            <motion.div
              className="bg-gradient-to-r from-orange-900 to-red-900 bg-opacity-50 rounded-xl p-6 border border-orange-500 border-opacity-50"
              whileHover={{ scale: 1.05 }}
            >
              <h3 className="text-2xl font-bold text-orange-400 mb-2">{match.playerB.name}</h3>
              <p className="text-gray-300">{match.playerB.className}</p>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* 粒子效果背景 */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 bg-white rounded-full opacity-50"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              x: [0, Math.random() * 100 - 50, 0],
              opacity: [0, 1, 0],
              scale: [0, 1, 0]
            }}
            transition={{
              duration: Math.random() * 3 + 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeInOut"
            }}
          />
        ))}
      </div>
    </div>
  );
}

export default PKArena;