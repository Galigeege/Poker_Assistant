import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { ArrowLeft, LogOut, AlertCircle } from 'lucide-react';
import Seat from './Seat';
import Card from './Card';
import Controls from './Controls';
import AICopilot from './AICopilot';
import RoundResultModal from './RoundResult';
import OpponentProfileModal from './OpponentProfileModal';
import type { Player } from '../types';

function GameRoom() {
  const { 
    disconnect, 
    communityCards,
    pot,
    players,
    actionRequest, 
    sendAction,
    heroHoleCards,
    roundResult,
    startNextRound,
    needsApiKey,
    needsApiKeyMessage
  } = useGameStore();

  const [selectedOpponent, setSelectedOpponent] = useState<Player | null>(null);
  const navigate = useNavigate();

  const hero = players.find(p => p.name === '你');
  const heroStack = hero ? hero.stack : 0;

  // Hero 永远在底部，其他玩家按游戏位置顺序排列
  const heroIndex = players.findIndex(p => p.name === '你');
  const orderedPlayers: Player[] = heroIndex >= 0 && hero
    ? [hero, ...players.filter((_, idx) => idx !== heroIndex)]
    : players;

  // 位置映射函数
  const getPositionForPlayer = (player: Player, playerIndex: number): 'bottom' | 'left' | 'top-left' | 'top-right' | 'right' | 'top' => {
    if (player.name === '你') {
      return 'bottom';
    }
    
    const positionMap: Record<number, 'bottom' | 'left' | 'top-left' | 'top-right' | 'right' | 'top'> = {
      1: 'left',
      2: 'top-left',
      3: 'top',
      4: 'top-right',
      5: 'right'
    };
    
    return positionMap[playerIndex] || 'left';
  };

  const handlePlayerClick = (player: Player) => {
    if (player.name !== '你') {
      setSelectedOpponent(player);
    }
  };

  const handleLeaveTable = () => {
    disconnect();
    navigate('/');
  };

  return (
    <div className="relative min-h-screen bg-[var(--color-bg-deep)] overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-radial opacity-40" />
      
      {/* Ambient Light Effects */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[var(--color-gold-500)]/5 rounded-full blur-[100px]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-[var(--color-emerald-500)]/5 rounded-full blur-[100px]" />

      {/* Main Content Area */}
      <div className="relative flex flex-col min-h-screen mr-80">
        
        {/* API Key Warning Banner */}
        <AnimatePresence>
          {needsApiKey && (
            <motion.div 
              className="absolute top-20 left-0 right-0 z-30 px-4"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="mx-auto max-w-2xl glass rounded-xl px-5 py-4 flex items-center justify-between gap-4 border border-[var(--color-gold-600)]/30">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-[var(--color-gold-500)]" aria-hidden="true" />
                  <span className="text-sm text-[var(--color-text-secondary)]">
                    {needsApiKeyMessage || '需要配置 API Key 才能使用 AI 功能'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    try {
                      localStorage.setItem('open_game_config_modal', '1');
                    } catch {
                      // ignore
                    }
                    disconnect();
                    navigate('/');
                  }}
                  className="btn-gold px-4 py-2 text-sm"
                >
                  去配置
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Navigation Bar */}
        <motion.div 
          className="absolute top-0 left-0 right-0 p-5 flex justify-between items-center z-20"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button 
            onClick={handleLeaveTable}
            className="glass p-3 rounded-xl hover:bg-[var(--color-bg-hover)] transition-all duration-200 group"
            aria-label="返回首页"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors" />
          </button>
          
          <button 
            onClick={handleLeaveTable}
            className="glass px-5 py-2.5 rounded-xl flex items-center gap-2 hover:bg-[var(--color-crimson-900)]/30 hover:border-[var(--color-crimson-600)]/50 transition-all duration-200 border border-transparent"
            aria-label="离开牌桌"
          >
            <LogOut className="w-4 h-4 text-[var(--color-crimson-400)]" aria-hidden="true" />
            <span className="text-sm font-medium text-[var(--color-crimson-300)]">离开牌桌</span>
          </button>
        </motion.div>

        {/* Poker Table Area */}
        <div className="flex-1 flex items-center justify-center p-8 pt-20">
          <motion.div 
            className="relative"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Table */}
            <div className="relative w-[850px] h-[420px] md:w-[950px] md:h-[475px] poker-felt rounded-[200px] border-[16px] border-[var(--color-bg-base)] shadow-2xl flex items-center justify-center">
              
              {/* Table Edge Highlight */}
              <div className="absolute inset-0 rounded-[184px] border border-[var(--color-gold-600)]/20 pointer-events-none" />
              
              {/* Center Pot Display */}
              <motion.div 
                className="absolute top-[22%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="glass px-6 py-3 rounded-2xl border border-[var(--color-gold-500)]/30">
                  <div className="text-[var(--color-text-muted)] text-xs uppercase tracking-widest mb-1 text-center">
                    Total Pot
                  </div>
                  <div className="text-[var(--color-gold-400)] font-bold text-3xl font-mono text-center">
                    ${pot}
                  </div>
                </div>
              </motion.div>

              {/* Community Cards */}
              <AnimatePresence>
                {communityCards.length > 0 && (
                  <motion.div 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-3 z-0"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  >
                    {communityCards.map((card, i) => (
                      <motion.div
                        key={`${card}-${i}`}
                        initial={{ opacity: 0, y: -30, rotateY: 180 }}
                        animate={{ opacity: 1, y: 0, rotateY: 0 }}
                        transition={{ delay: i * 0.1, duration: 0.4 }}
                      >
                        <Card card={card} size="responsive" />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Player Seats */}
              {orderedPlayers.map((player, idx) => {
                const position = getPositionForPlayer(player, idx);
                const isActive = actionRequest 
                  ? (actionRequest.round_state?.seats?.find((s: Player) => s.uuid === player.uuid)?.state === 'participating') 
                  : false;
                
                return (
                  <Seat
                    key={player.uuid}
                    player={player}
                    position={position}
                    isDealer={player.is_dealer}
                    isActive={isActive}
                    heroHoleCards={heroHoleCards}
                    positionLabel={player.position_label}
                    onPlayerClick={handlePlayerClick}
                  />
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Controls Panel */}
        <AnimatePresence>
          {actionRequest && (
            <motion.div 
              className="fixed bottom-6 left-6 z-30"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
            >
              <Controls 
                onAction={sendAction}
                actionRequest={actionRequest}
                playerStack={heroStack}
                potSize={pot}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI Copilot Sidebar */}
      <div className="fixed top-0 right-0 w-80 h-full z-20">
        <AICopilot />
      </div>

      {/* Round Result Modal */}
      <AnimatePresence>
        {roundResult && (
          <RoundResultModal
            result={roundResult}
            onClose={() => {}}
            onNextRound={() => {
              startNextRound();
            }}
          />
        )}
      </AnimatePresence>

      {/* Opponent Profile Modal */}
      <AnimatePresence>
        {selectedOpponent && (
          <OpponentProfileModal
            player={selectedOpponent}
            isOpen={!!selectedOpponent}
            onClose={() => setSelectedOpponent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default GameRoom;
