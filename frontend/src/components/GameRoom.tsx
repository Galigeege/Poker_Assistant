import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { ArrowLeft, LogOut, AlertCircle, Brain, X } from 'lucide-react';
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
  const [showMobileAI, setShowMobileAI] = useState(false);
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
    <div className="relative min-h-screen min-h-[100dvh] bg-[var(--color-bg-deep)] overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-radial opacity-40" />
      
      {/* Ambient Light Effects - Hidden on mobile for performance */}
      <div className="hidden md:block absolute top-0 left-1/4 w-96 h-96 bg-[var(--color-gold-500)]/5 rounded-full blur-[100px]" />
      <div className="hidden md:block absolute bottom-0 right-1/4 w-96 h-96 bg-[var(--color-emerald-500)]/5 rounded-full blur-[100px]" />

      {/* Main Content Area - Responsive margin */}
      <div className="relative flex flex-col min-h-screen min-h-[100dvh] lg:mr-80">
        
        {/* API Key Warning Banner */}
        <AnimatePresence>
          {needsApiKey && (
            <motion.div 
              className="absolute top-16 md:top-20 left-0 right-0 z-30 px-3 md:px-4"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="mx-auto max-w-2xl glass rounded-xl px-4 md:px-5 py-3 md:py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4 border border-[var(--color-gold-600)]/30">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-[var(--color-gold-500)] shrink-0" aria-hidden="true" />
                  <span className="text-xs md:text-sm text-[var(--color-text-secondary)]">
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
                  className="btn-gold px-4 py-2 text-sm w-full sm:w-auto"
                >
                  去配置
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Navigation Bar */}
        <motion.div 
          className="absolute top-0 left-0 right-0 p-3 md:p-5 flex justify-between items-center z-20"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button 
            onClick={handleLeaveTable}
            className="glass p-2.5 md:p-3 rounded-xl hover:bg-[var(--color-bg-hover)] transition-all duration-200 group"
            aria-label="返回首页"
          >
            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors" />
          </button>
          
          <div className="flex items-center gap-2">
            {/* Mobile AI Copilot Button */}
            <button 
              onClick={() => setShowMobileAI(true)}
              className="lg:hidden glass px-3 py-2 md:px-4 md:py-2.5 rounded-xl flex items-center gap-2 hover:bg-[var(--color-gold-900)]/30 hover:border-[var(--color-gold-600)]/50 transition-all duration-200 border border-[var(--color-gold-600)]/30"
              aria-label="打开 AI 助手"
            >
              <Brain className="w-4 h-4 text-[var(--color-gold-400)]" aria-hidden="true" />
              <span className="text-xs md:text-sm font-medium text-[var(--color-gold-300)]">AI</span>
            </button>
            
            <button 
              onClick={handleLeaveTable}
              className="glass px-3 py-2 md:px-5 md:py-2.5 rounded-xl flex items-center gap-2 hover:bg-[var(--color-crimson-900)]/30 hover:border-[var(--color-crimson-600)]/50 transition-all duration-200 border border-transparent"
              aria-label="离开牌桌"
            >
              <LogOut className="w-4 h-4 text-[var(--color-crimson-400)]" aria-hidden="true" />
              <span className="hidden sm:inline text-sm font-medium text-[var(--color-crimson-300)]">离开牌桌</span>
            </button>
          </div>
        </motion.div>

        {/* Poker Table Area - Responsive */}
        <div className="flex-1 flex items-center justify-center p-4 pt-16 pb-4 md:p-8 md:pt-20">
          <motion.div 
            className="relative w-full max-w-[950px]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Table - Responsive sizing */}
            <div className="relative 
              w-full aspect-[2/1.2] sm:aspect-[2/1] 
              max-w-[320px] sm:max-w-[500px] md:max-w-[700px] lg:max-w-[850px] xl:max-w-[950px]
              mx-auto
              poker-felt rounded-[80px] sm:rounded-[120px] md:rounded-[160px] lg:rounded-[200px] 
              border-[8px] sm:border-[10px] md:border-[14px] lg:border-[16px] border-[var(--color-bg-base)] 
              shadow-2xl flex items-center justify-center"
            >
              
              {/* Table Edge Highlight */}
              <div className="absolute inset-0 rounded-[72px] sm:rounded-[110px] md:rounded-[146px] lg:rounded-[184px] border border-[var(--color-gold-600)]/20 pointer-events-none" />
              
              {/* Center Pot Display - Responsive */}
              <motion.div 
                className="absolute top-[18%] sm:top-[20%] md:top-[22%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="glass px-3 py-1.5 sm:px-4 sm:py-2 md:px-6 md:py-3 rounded-xl md:rounded-2xl border border-[var(--color-gold-500)]/30">
                  <div className="text-[var(--color-text-muted)] text-[8px] sm:text-[10px] md:text-xs uppercase tracking-widest mb-0.5 md:mb-1 text-center">
                    Total Pot
                  </div>
                  <div className="text-[var(--color-gold-400)] font-bold text-lg sm:text-xl md:text-2xl lg:text-3xl font-mono text-center">
                    ${pot}
                  </div>
                </div>
              </motion.div>

              {/* Community Cards - Responsive */}
              <AnimatePresence>
                {communityCards.length > 0 && (
                  <motion.div 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-1 sm:gap-1.5 md:gap-2 lg:gap-3 z-0"
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
                        <Card card={card} size="responsive-sm" className="sm:hidden" />
                        <Card card={card} size="responsive" className="hidden sm:block" />
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

        {/* Controls Panel - Responsive positioning */}
        <AnimatePresence>
          {actionRequest && (
            <motion.div 
              className="fixed bottom-0 left-0 right-0 lg:bottom-6 lg:left-6 lg:right-auto z-30 
                p-3 sm:p-4 lg:p-0 
                bg-gradient-to-t from-[var(--color-bg-deep)] via-[var(--color-bg-deep)]/95 to-transparent lg:bg-none
                pb-safe"
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

      {/* AI Copilot Sidebar - Desktop only */}
      <div className="hidden lg:block fixed top-0 right-0 w-80 h-full z-20">
        <AICopilot />
      </div>

      {/* Mobile AI Copilot Drawer */}
      <AnimatePresence>
        {showMobileAI && (
          <>
            {/* Backdrop */}
            <motion.div
              className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMobileAI(false)}
            />
            
            {/* Drawer */}
            <motion.div
              className="lg:hidden fixed inset-x-0 bottom-0 z-50 max-h-[85vh]"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            >
              <div className="bg-[var(--color-bg-base)] rounded-t-3xl overflow-hidden shadow-2xl border-t border-[var(--color-border)]">
                {/* Drawer Handle */}
                <div className="flex justify-center pt-3 pb-2">
                  <div className="w-10 h-1 rounded-full bg-[var(--color-border)]" />
                </div>
                
                {/* Close Button */}
                <button
                  onClick={() => setShowMobileAI(false)}
                  className="absolute top-3 right-4 p-2 rounded-full hover:bg-[var(--color-bg-hover)] transition-colors"
                  aria-label="关闭 AI 助手"
                >
                  <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
                </button>
                
                {/* AI Copilot Content */}
                <div className="max-h-[calc(85vh-40px)] overflow-y-auto">
                  <AICopilot isMobile />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
