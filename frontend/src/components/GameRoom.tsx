import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { ArrowLeft, LogOut, AlertCircle, Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { useMobileMode } from '../hooks/useMobileMode';
import Seat from './Seat';
import Card from './Card';
import Controls from './Controls';
import AICopilot from './AICopilot';
import RoundResultModal from './RoundResult';
import OpponentProfileModal from './OpponentProfileModal';
import type { Player } from '../types';

// 移动端位置类型
type MobilePosition = 'bottom' | 'top' | 'left-top' | 'left-bottom' | 'right-top' | 'right-bottom';
// 桌面端位置类型
type DesktopPosition = 'bottom' | 'left' | 'top-left' | 'top-right' | 'right' | 'top';

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
    needsApiKeyMessage,
    aiCopilotEnabled,
    isConnecting,
    currentStreet
  } = useGameStore();

  // 回合阶段中文名称
  const streetNamesCN: Record<string, string> = {
    'preflop': '翻前',
    'flop': '翻牌',
    'turn': '转牌',
    'river': '河牌',
    'showdown': '摊牌'
  };

  const [selectedOpponent, setSelectedOpponent] = useState<Player | null>(null);
  const [mobileAIExpanded, setMobileAIExpanded] = useState(false);
  const navigate = useNavigate();
  const isMobile = useMobileMode();

  const hero = players.find(p => p.name === '你');
  const heroStack = hero ? hero.stack : 0;

  // Hero 永远在底部，其他玩家按游戏位置顺序排列
  const heroIndex = players.findIndex(p => p.name === '你');
  const orderedPlayers: Player[] = heroIndex >= 0 && hero
    ? [hero, ...players.filter((_, idx) => idx !== heroIndex)]
    : players;

  // 桌面端位置映射
  const getDesktopPosition = (player: Player, playerIndex: number): DesktopPosition => {
    if (player.name === '你') return 'bottom';
    const positionMap: Record<number, DesktopPosition> = {
      1: 'left',
      2: 'top-left',
      3: 'top',
      4: 'top-right',
      5: 'right'
    };
    return positionMap[playerIndex] || 'left';
  };

  // 移动端位置映射 - 纵向椭圆布局
  const getMobilePosition = (player: Player, playerIndex: number): MobilePosition => {
    if (player.name === '你') return 'bottom';
    // 5个AI对手围绕纵向椭圆
    const positionMap: Record<number, MobilePosition> = {
      1: 'left-top',      // 左上
      2: 'top',           // 顶部中央
      3: 'right-top',     // 右上
      4: 'right-bottom',  // 右下
      5: 'left-bottom'    // 左下
    };
    return positionMap[playerIndex] || 'left-top';
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

  // AI 建议数据
  const advice = actionRequest?.ai_advice;

  // ==================== 移动端布局 ====================
  if (isMobile) {
    return (
      <div className="relative min-h-screen bg-[var(--color-bg-deep)] overflow-hidden flex flex-col">
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-radial opacity-30" />
        
        {/* API Key Warning Banner - Mobile */}
        <AnimatePresence>
          {needsApiKey && (
            <motion.div 
              className="absolute top-14 left-0 right-0 z-30 px-3"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <div className="glass rounded-xl px-4 py-3 flex items-center justify-between gap-3 border border-[var(--color-gold-600)]/30">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <AlertCircle className="w-4 h-4 text-[var(--color-gold-500)] shrink-0" />
                  <span className="text-xs text-[var(--color-text-secondary)] truncate">
                    {needsApiKeyMessage || '需要配置 API Key'}
                  </span>
                </div>
                <button
                  onClick={() => {
                    try { localStorage.setItem('open_game_config_modal', '1'); } catch {}
                    disconnect();
                    navigate('/');
                  }}
                  className="btn-gold px-3 py-1.5 text-xs shrink-0"
                >
                  配置
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Navigation Bar - Mobile */}
        <motion.div 
          className="relative z-20 px-3 py-2 flex justify-between items-center bg-[var(--color-bg-base)]/90 backdrop-blur-sm border-b border-[var(--color-border)]"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <button 
            onClick={handleLeaveTable}
            className="p-2 rounded-lg active:bg-[var(--color-bg-hover)] transition-all"
            aria-label="返回首页"
          >
            <ArrowLeft className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>
          
          {/* Center Info: Street + Pot */}
          <div className="flex items-center gap-3">
            {/* Round Stage Indicator */}
            {currentStreet && (
              <div className="px-2 py-0.5 rounded bg-[var(--color-emerald-900)]/40 border border-[var(--color-emerald-600)]/30">
                <span className="text-[10px] font-bold text-[var(--color-emerald-400)] uppercase tracking-wider">
                  {streetNamesCN[currentStreet] || currentStreet}
                </span>
              </div>
            )}
            {/* Pot Display */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] text-[var(--color-text-dim)] uppercase">Pot</span>
              <span className="text-base font-bold text-[var(--color-gold-400)] font-mono">${pot}</span>
            </div>
          </div>
          
          {/* AI Toggle / Leave */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMobileAIExpanded(!mobileAIExpanded)}
              className={`p-2 rounded-lg transition-all ${
                aiCopilotEnabled ? 'bg-[var(--color-gold-600)]/20 text-[var(--color-gold-500)]' : 'text-[var(--color-text-dim)]'
              }`}
              aria-label="AI 助手"
            >
              <Brain className="w-5 h-5" />
            </button>
            <button 
              onClick={handleLeaveTable}
              className="p-2 rounded-lg active:bg-[var(--color-crimson-900)]/30 transition-all"
              aria-label="离开牌桌"
            >
              <LogOut className="w-4 h-4 text-[var(--color-crimson-400)]" />
            </button>
          </div>
        </motion.div>

        {/* AI Copilot Expandable Panel - Mobile */}
        <AnimatePresence>
          {mobileAIExpanded && aiCopilotEnabled && (
            <motion.div
              className="relative z-10 bg-[var(--color-bg-base)] border-b border-[var(--color-border)]"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <div className="px-4 py-3">
                {isConnecting ? (
                  <div className="flex items-center gap-2 text-xs text-[var(--color-gold-400)]">
                    <div className="w-4 h-4 border-2 border-[var(--color-gold-500)] border-t-transparent rounded-full animate-spin" />
                    <span>AI 分析中…</span>
                  </div>
                ) : advice ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`text-lg font-bold capitalize ${
                        advice.recommended_action?.toLowerCase() === 'fold' 
                          ? 'text-[var(--color-crimson-400)]'
                          : advice.recommended_action?.toLowerCase() === 'raise'
                          ? 'text-[var(--color-gold-400)]'
                          : 'text-[var(--color-emerald-400)]'
                      }`}>
                        {advice.recommended_action || advice.primary_strategy?.action || '—'}
                      </span>
                      {advice.win_probability && (
                        <span className="text-xs text-[var(--color-text-muted)] font-mono">
                          胜率 {advice.win_probability}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => setMobileAIExpanded(false)}
                      className="p-1 text-[var(--color-text-dim)]"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--color-text-dim)]">等待行动…</span>
                    <button
                      onClick={() => setMobileAIExpanded(false)}
                      className="p-1 text-[var(--color-text-dim)]"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {advice?.reasoning && (
                  <p className="text-[10px] text-[var(--color-text-secondary)] mt-2 line-clamp-2">
                    {advice.reasoning}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed AI Hint */}
        {!mobileAIExpanded && aiCopilotEnabled && advice && (
          <motion.button
            className="relative z-10 w-full px-4 py-2 bg-[var(--color-bg-elevated)] border-b border-[var(--color-border)] flex items-center justify-between"
            onClick={() => setMobileAIExpanded(true)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-[var(--color-gold-500)]" />
              <span className={`text-sm font-bold capitalize ${
                advice.recommended_action?.toLowerCase() === 'fold' 
                  ? 'text-[var(--color-crimson-400)]'
                  : advice.recommended_action?.toLowerCase() === 'raise'
                  ? 'text-[var(--color-gold-400)]'
                  : 'text-[var(--color-emerald-400)]'
              }`}>
                {advice.recommended_action || advice.primary_strategy?.action}
              </span>
              {advice.win_probability && (
                <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
                  {advice.win_probability}
                </span>
              )}
            </div>
            <ChevronDown className="w-4 h-4 text-[var(--color-text-dim)]" />
          </motion.button>
        )}

        {/* Current Action Player Indicator - Mobile */}
        {actionRequest && (
          <motion.div 
            className="px-4 py-1.5 bg-[var(--color-gold-900)]/30 border-b border-[var(--color-gold-600)]/20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[var(--color-gold-500)] animate-pulse" />
              <span className="text-xs text-[var(--color-gold-400)]">轮到你行动</span>
            </div>
          </motion.div>
        )}

        {/* Poker Table Area - Mobile (Vertical Ellipse) */}
        <div className="flex-1 flex items-center justify-center px-4 py-2 relative">
          <motion.div 
            className="relative w-full max-w-[340px]"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {/* Vertical Ellipse Table */}
            <div className="relative w-full aspect-[3/4] poker-felt rounded-[50%] border-[8px] border-[var(--color-bg-base)] shadow-2xl flex items-center justify-center">
              
              {/* Table Edge */}
              <div className="absolute inset-0 rounded-[50%] border border-[var(--color-gold-600)]/20 pointer-events-none" />
              
              {/* Community Cards - Mobile */}
              <AnimatePresence>
                {communityCards.length > 0 && (
                  <motion.div 
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-wrap justify-center gap-1 max-w-[95%]"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    {communityCards.map((card, i) => (
                      <motion.div
                        key={`${card}-${i}`}
                        initial={{ opacity: 0, y: -15, rotateY: 180 }}
                        animate={{ opacity: 1, y: 0, rotateY: 0 }}
                        transition={{ delay: i * 0.08 }}
                      >
                        <Card card={card} size="sm" />
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Player Seats - Mobile */}
              {orderedPlayers.filter(p => p.name !== '你').map((player, idx) => {
                const position = getMobilePosition(player, idx + 1);
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
                    isMobile={true}
                  />
                );
              })}
            </div>
          </motion.div>
        </div>

        {/* Hero Section - Mobile */}
        <div className="relative z-10 bg-[var(--color-bg-base)] border-t border-[var(--color-border)]">
          {/* Hero Info + Cards */}
          <div className="px-4 py-3 flex items-center justify-center gap-4">
            {/* Hero Avatar & Info */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <img 
                  src={`https://api.dicebear.com/9.x/adventurer/svg?seed=你`}
                  alt="你的头像"
                  className="w-12 h-12 rounded-full border-2 border-[var(--color-gold-500)] bg-[var(--color-bg-elevated)]"
                />
                {hero?.is_dealer && (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-white text-black text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-[var(--color-bg-base)]">
                    D
                  </div>
                )}
                {hero?.position_label && (
                  <div className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-[var(--color-gold-600)] text-[8px] font-bold rounded text-black">
                    {hero.position_label}
                  </div>
                )}
              </div>
              <div className="text-center">
                <div className="text-xs text-[var(--color-text-muted)]">你</div>
                <div className="text-lg font-bold text-[var(--color-gold-400)] font-mono">${heroStack}</div>
              </div>
            </div>

            {/* Hero Cards */}
            <div className="flex gap-1">
              {heroHoleCards && heroHoleCards.length > 0 ? (
                heroHoleCards.map((card, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: -10, rotateY: 180 }}
                    animate={{ opacity: 1, y: 0, rotateY: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={idx === 1 ? '-ml-3' : ''}
                  >
                    <Card card={card} size="md" />
                  </motion.div>
                ))
              ) : (
                <>
                  <Card hidden size="md" />
                  <Card hidden size="md" className="-ml-3" />
                </>
              )}
            </div>

            {/* Last Action */}
            {hero?.last_action && (
              <div className="glass px-2 py-1 rounded-lg">
                <span className={`text-xs font-bold uppercase ${
                  hero.last_action.action.toLowerCase() === 'fold' 
                    ? 'text-[var(--color-crimson-400)]'
                    : hero.last_action.action.toLowerCase() === 'raise'
                    ? 'text-[var(--color-gold-400)]'
                    : 'text-[var(--color-emerald-400)]'
                }`}>
                  {hero.last_action.action}
                </span>
                {hero.last_action.amount > 0 && (
                  <span className="text-xs text-[var(--color-text-secondary)] ml-1 font-mono">
                    ${hero.last_action.amount}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Controls Panel - Mobile Fixed Bottom */}
        <AnimatePresence>
          {actionRequest && (
            <motion.div 
              className="relative z-30"
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

        {/* Modals */}
        <AnimatePresence>
          {roundResult && (
            <RoundResultModal
              result={roundResult}
              onClose={() => {}}
              onNextRound={() => startNextRound()}
            />
          )}
        </AnimatePresence>

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

  // ==================== 桌面端布局 (保持不变) ====================
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
                  isMobile={false}
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
            isMobile={false}
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
