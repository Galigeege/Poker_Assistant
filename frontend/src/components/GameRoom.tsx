import { useState, useEffect } from 'react';
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

// 移动端断点
const MOBILE_BREAKPOINT = 768;

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
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

  // 检测是否移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const hero = players.find(p => p.name === '你');
  const heroStack = hero ? hero.stack : 0;

  // Hero 永远在底部，其他玩家按游戏位置顺序排列
  const heroIndex = players.findIndex(p => p.name === '你');
  const orderedPlayers: Player[] = heroIndex >= 0 && hero
    ? [hero, ...players.filter((_, idx) => idx !== heroIndex)]
    : players;

  // 桌面端位置映射
  const getDesktopPosition = (player: Player, playerIndex: number): 'bottom' | 'left' | 'top-left' | 'top-right' | 'right' | 'top' => {
    if (player.name === '你') return 'bottom';
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

  // ==================== 移动端 UI ====================
  if (isMobile) {
    const opponents = orderedPlayers.filter(p => p.name !== '你');
    
    return (
      <div className="fixed inset-0 bg-[var(--color-bg-deep)] flex flex-col overflow-hidden">
        {/* 顶部导航 */}
        <div className="flex-none flex items-center justify-between px-3 py-2 bg-[var(--color-bg-base)] border-b border-[var(--color-border)]">
          <button 
            onClick={handleLeaveTable}
            className="p-2 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
            aria-label="返回首页"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>
          
          <div className="text-center">
            <div className="text-[var(--color-gold-400)] font-bold font-mono text-lg">
              ${pot}
            </div>
            <div className="text-[8px] text-[var(--color-text-dim)] uppercase tracking-wider">
              Total Pot
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <button 
              onClick={() => setShowMobileAI(true)}
              className="p-2 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors border border-[var(--color-gold-600)]/30"
              aria-label="AI 助手"
            >
              <Brain className="w-5 h-5 text-[var(--color-gold-400)]" />
            </button>
            <button 
              onClick={handleLeaveTable}
              className="p-2 rounded-lg hover:bg-[var(--color-crimson-900)]/30 transition-colors"
              aria-label="离开牌桌"
            >
              <LogOut className="w-5 h-5 text-[var(--color-crimson-400)]" />
            </button>
          </div>
        </div>

        {/* API Key Warning */}
        <AnimatePresence>
          {needsApiKey && (
            <motion.div 
              className="flex-none px-3 py-2 bg-[var(--color-gold-900)]/20 border-b border-[var(--color-gold-600)]/30"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="flex items-center gap-2 text-xs text-[var(--color-gold-400)]">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="flex-1">{needsApiKeyMessage || '需要配置 API Key'}</span>
                <button
                  onClick={() => {
                    localStorage.setItem('open_game_config_modal', '1');
                    disconnect();
                    navigate('/');
                  }}
                  className="px-2 py-1 bg-[var(--color-gold-600)] text-[var(--color-bg-deep)] rounded text-xs font-medium"
                >
                  配置
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 游戏区域 - 竖向布局 */}
        <div className="flex-1 flex flex-col min-h-0 p-3 gap-2">
          
          {/* 对手区域 - 上半部分 */}
          <div className="flex-1 flex flex-col gap-2 min-h-0">
            {/* 对手行（2-3人一行） */}
            <div className="flex-1 flex items-center justify-center gap-3">
              {opponents.slice(0, 3).map((player) => {
                const isActive = actionRequest 
                  ? (actionRequest.round_state?.seats?.find((s: Player) => s.uuid === player.uuid)?.state === 'participating') 
                  : false;
                return (
                  <MobileOpponentSeat
                    key={player.uuid}
                    player={player}
                    isActive={isActive}
                    onPlayerClick={handlePlayerClick}
                  />
                );
              })}
            </div>
            {opponents.length > 3 && (
              <div className="flex-1 flex items-center justify-center gap-3">
                {opponents.slice(3).map((player) => {
                  const isActive = actionRequest 
                    ? (actionRequest.round_state?.seats?.find((s: Player) => s.uuid === player.uuid)?.state === 'participating') 
                    : false;
                  return (
                    <MobileOpponentSeat
                      key={player.uuid}
                      player={player}
                      isActive={isActive}
                      onPlayerClick={handlePlayerClick}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* 公共牌区域 - 中间 */}
          <div className="flex-none py-3">
            <div className="flex items-center justify-center gap-1.5">
              {communityCards.length > 0 ? (
                communityCards.map((card, i) => (
                  <motion.div
                    key={`${card}-${i}`}
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                  >
                    <Card card={card} size="md" />
                  </motion.div>
                ))
              ) : (
                <div className="flex gap-1.5">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className="w-10 h-14 rounded-lg border border-[var(--color-border)] border-dashed opacity-30" />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 玩家区域 - 下半部分 */}
          <div className="flex-none">
            {/* 玩家手牌 */}
            <div className="flex items-center justify-center gap-2 mb-3">
              {heroHoleCards && heroHoleCards.length > 0 ? (
                heroHoleCards.map((card, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                  >
                    <Card card={card} size="lg" />
                  </motion.div>
                ))
              ) : (
                <>
                  <Card hidden size="lg" />
                  <Card hidden size="lg" />
                </>
              )}
            </div>
            
            {/* 玩家信息 */}
            <div className="flex items-center justify-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-[var(--color-gold-500)] bg-[var(--color-bg-elevated)]">
                  <img 
                    src={`https://api.dicebear.com/9.x/adventurer/svg?seed=你`}
                    alt="玩家头像"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="text-center">
                  <div className="text-xs text-[var(--color-text-muted)]">你</div>
                  <div className="text-lg font-bold text-[var(--color-gold-400)] font-mono">${heroStack}</div>
                </div>
                {hero?.position_label && (
                  <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-[var(--color-text-primary)] text-[var(--color-bg-deep)]">
                    {hero.position_label}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 控制面板 - 底部固定 */}
        <AnimatePresence>
          {actionRequest && (
            <motion.div 
              className="flex-none bg-[var(--color-bg-base)] border-t border-[var(--color-border)] p-3 pb-safe"
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
            >
              <Controls 
                onAction={sendAction}
                actionRequest={actionRequest}
                playerStack={heroStack}
                potSize={pot}
                isMobile={true}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 移动端 AI 抽屉 */}
        <AnimatePresence>
          {showMobileAI && (
            <>
              <motion.div
                className="fixed inset-0 bg-black/60 z-40"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowMobileAI(false)}
              />
              <motion.div
                className="fixed inset-x-0 bottom-0 z-50 max-h-[80vh]"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              >
                <div className="bg-[var(--color-bg-base)] rounded-t-2xl overflow-hidden border-t border-[var(--color-border)]">
                  <div className="flex justify-center pt-2 pb-1">
                    <div className="w-10 h-1 rounded-full bg-[var(--color-border)]" />
                  </div>
                  <button
                    onClick={() => setShowMobileAI(false)}
                    className="absolute top-2 right-3 p-2 rounded-full hover:bg-[var(--color-bg-hover)]"
                    aria-label="关闭"
                  >
                    <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
                  </button>
                  <div className="max-h-[calc(80vh-40px)] overflow-y-auto">
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
              onNextRound={() => startNextRound()}
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

  // ==================== 桌面端 UI (保持原有布局) ====================
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
            <div className="relative w-[850px] h-[420px] poker-felt rounded-[200px] border-[16px] border-[var(--color-bg-base)] shadow-2xl flex items-center justify-center">
              
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
                        <Card card={card} size="md" />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Player Seats */}
              {orderedPlayers.map((player, idx) => {
                const position = getDesktopPosition(player, idx);
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

// 移动端对手座位组件
function MobileOpponentSeat({ 
  player, 
  isActive, 
  onPlayerClick 
}: { 
  player: Player; 
  isActive: boolean;
  onPlayerClick: (player: Player) => void;
}) {
  const isFolded = player.state === 'folded';
  const avatarUrl = `https://api.dicebear.com/9.x/bottts/svg?seed=${player.name}`;
  
  return (
    <div 
      className={`flex flex-col items-center gap-1 ${isFolded ? 'opacity-40 grayscale' : ''}`}
      onClick={() => onPlayerClick(player)}
    >
      {/* 隐藏的手牌 */}
      {!isFolded && (
        <div className="flex -space-x-3 mb-1">
          <div className="w-6 h-9 rounded bg-gradient-to-br from-[#1a3f6e] to-[#0d2240] border border-[#2a5a9e]/40 shadow" />
          <div className="w-6 h-9 rounded bg-gradient-to-br from-[#1a3f6e] to-[#0d2240] border border-[#2a5a9e]/40 shadow" />
        </div>
      )}
      
      {/* 头像 */}
      <div className={`relative w-10 h-10 rounded-full overflow-hidden border-2 ${
        isActive ? 'border-[var(--color-gold-500)] shadow-lg shadow-[var(--color-gold-500)]/30' : 'border-[var(--color-border)]'
      } bg-[var(--color-bg-elevated)]`}>
        <img src={avatarUrl} alt={player.name} className="w-full h-full object-cover" />
        {player.is_dealer && (
          <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-white text-[var(--color-bg-deep)] text-[8px] font-bold rounded-full flex items-center justify-center border border-[var(--color-bg-elevated)]">
            D
          </div>
        )}
      </div>
      
      {/* 位置标签 */}
      {player.position_label && (
        <span className={`text-[8px] px-1 py-0.5 rounded font-bold ${
          player.position_label === 'BTN' ? 'bg-white text-[var(--color-bg-deep)]' :
          player.position_label === 'SB' ? 'bg-blue-600 text-white' :
          player.position_label === 'BB' ? 'bg-orange-600 text-white' :
          'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)]'
        }`}>
          {player.position_label}
        </span>
      )}
      
      {/* 名称和筹码 */}
      <div className="text-center">
        <div className="text-[9px] text-[var(--color-text-muted)] truncate max-w-[60px]">{player.name}</div>
        <div className="text-xs font-bold text-[var(--color-gold-400)] font-mono">${player.stack}</div>
      </div>
      
      {/* 最后行动 */}
      <AnimatePresence>
        {player.last_action && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
              player.last_action.action.toLowerCase() === 'fold' ? 'bg-[var(--color-crimson-900)]/50 text-[var(--color-crimson-400)]' :
              player.last_action.action.toLowerCase() === 'raise' ? 'bg-[var(--color-gold-900)]/50 text-[var(--color-gold-400)]' :
              'bg-[var(--color-emerald-900)]/50 text-[var(--color-emerald-400)]'
            }`}
          >
            {player.last_action.action.toLowerCase() === 'call' && player.last_action.amount === 0 
              ? 'CHECK' 
              : player.last_action.action.toUpperCase()}
            {player.last_action.amount > 0 && ` $${player.last_action.amount}`}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default GameRoom;
