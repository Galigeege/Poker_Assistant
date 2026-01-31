import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Player } from '../types';
import Card from './Card';

// 桌面端位置类型
type DesktopPosition = 'bottom' | 'left' | 'top' | 'right' | 'top-left' | 'top-right';
// 移动端位置类型
type MobilePosition = 'bottom' | 'top' | 'left-top' | 'left-bottom' | 'right-top' | 'right-bottom';

interface SeatProps {
  player: Player;
  position: DesktopPosition | MobilePosition;
  isDealer?: boolean;
  isActive?: boolean;
  heroHoleCards?: string[];
  positionLabel?: string;
  onPlayerClick?: (player: Player) => void;
  isMobile?: boolean;
}

const Seat: React.FC<SeatProps> = ({ 
  player, 
  position, 
  isDealer: _isDealer, 
  isActive, 
  heroHoleCards, 
  positionLabel, 
  onPlayerClick,
  isMobile = false
}) => {
  const isHero = player.name === '你';
  
  // 桌面端位置样式
  const desktopPositionStyles: Record<string, string> = {
    'bottom': 'bottom-[-70px] left-1/2 -translate-x-1/2',
    'left': 'left-[-70px] top-1/2 -translate-y-1/2 flex-row-reverse',
    'right': 'right-[-70px] top-1/2 -translate-y-1/2',
    'top': 'top-[-70px] left-1/2 -translate-x-1/2 flex-col-reverse',
    'top-left': 'top-[5%] left-[12%] -translate-x-1/2 -translate-y-1/2 flex-col-reverse',
    'top-right': 'top-[5%] right-[12%] translate-x-1/2 -translate-y-1/2 flex-col-reverse',
  };

  // 移动端位置样式 - 纵向椭圆布局（使用像素偏移更稳定）
  const mobilePositionStyles: Record<string, string> = {
    'bottom': 'hidden', // Hero 在移动端单独渲染，这里隐藏
    'top': 'top-[-45px] left-1/2 -translate-x-1/2',
    'left-top': 'top-[15%] left-[-35px]',
    'left-bottom': 'bottom-[15%] left-[-35px]',
    'right-top': 'top-[15%] right-[-35px]',
    'right-bottom': 'bottom-[15%] right-[-35px]',
  };

  const positionStyles = isMobile ? mobilePositionStyles : desktopPositionStyles;
  const isFolded = player.state === 'folded';
  
  // Avatar
  const avatarStyle = isHero ? 'adventurer' : 'bottts';
  const avatarUrl = `https://api.dicebear.com/9.x/${avatarStyle}/svg?seed=${player.name}`;

  // Position badge colors
  const getPositionBadgeStyle = (label: string) => {
    switch (label) {
      case 'BTN':
        return 'bg-[var(--color-text-primary)] text-[var(--color-bg-deep)] border-[var(--color-gold-400)]';
      case 'SB':
        return 'bg-blue-600 text-white border-blue-400';
      case 'BB':
        return 'bg-orange-600 text-white border-orange-400';
      default:
        return 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] border-[var(--color-border)]';
    }
  };

  // 移动端 Hero 位置不在这里渲染
  if (isMobile && isHero) {
    return null;
  }

  // Chip position styles for mobile - towards table center
  const mobileChipPositions: Record<string, string> = {
    'bottom': 'top-[-30px] left-1/2 -translate-x-1/2',
    'top': 'bottom-[-30px] left-1/2 -translate-x-1/2',
    'left-top': 'right-[-20px] top-1/2 -translate-y-1/2',
    'left-bottom': 'right-[-20px] top-1/2 -translate-y-1/2',
    'right-top': 'left-[-20px] top-1/2 -translate-y-1/2',
    'right-bottom': 'left-[-20px] top-1/2 -translate-y-1/2',
  };

  // ==================== 移动端座位渲染 ====================
  if (isMobile) {
    return (
      <motion.div 
        className={`absolute ${positionStyles[position]} flex flex-col items-center z-10`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Avatar & Info - Mobile */}
        <div className={`relative ${isFolded ? 'opacity-40 grayscale' : ''} transition-all duration-300`}>
          
          {/* Active Glow Ring - Mobile */}
          <AnimatePresence>
            {isActive && (
              <motion.div 
                className="absolute -inset-1.5 rounded-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="w-full h-full rounded-full bg-[var(--color-gold-500)]/40 blur-md animate-pulse" />
                <div className="absolute inset-0 rounded-full border-2 border-[var(--color-gold-500)]" />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Street Bet Chips Display - Mobile */}
          <AnimatePresence>
            {player.street_bet !== undefined && player.street_bet > 0 && !isFolded && (
              <motion.div 
                className={`absolute z-30 ${mobileChipPositions[position] || 'top-[-30px] left-1/2 -translate-x-1/2'}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <div className="flex items-center gap-0.5 bg-[var(--color-bg-deep)]/90 rounded-full px-1.5 py-0.5 border border-[var(--color-gold-600)]/50 shadow-lg">
                  {/* Simple chip icon */}
                  <div className="w-3 h-3 rounded-full bg-gradient-to-br from-[var(--color-gold-400)] to-[var(--color-gold-600)] border border-[var(--color-gold-300)] flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full border border-[var(--color-gold-300)]/50" />
                  </div>
                  <span className="text-[9px] font-bold text-[var(--color-gold-400)] font-mono">
                    ${player.street_bet}
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Avatar Circle - Mobile (increased size: 40px -> 48px) */}
          <motion.div 
            className={`
              relative w-12 h-12 rounded-full overflow-hidden
              bg-[var(--color-bg-elevated)] border-2
              ${isActive ? 'border-[var(--color-gold-500)] shadow-[0_0_12px_rgba(212,175,55,0.4)]' : 'border-[var(--color-border)]'}
              shadow-lg transition-all duration-300
              ${onPlayerClick ? 'cursor-pointer active:scale-95' : ''}
            `}
            onClick={() => onPlayerClick && onPlayerClick(player)}
            whileTap={onPlayerClick ? { scale: 0.95 } : undefined}
            role={onPlayerClick ? "button" : undefined}
            aria-label={onPlayerClick ? `查看 ${player.name} 的对手分析` : undefined}
          >
            <img 
              src={avatarUrl} 
              alt={`${player.name} 的头像`}
              className="w-full h-full object-cover scale-110"
              loading="lazy"
              width={48}
              height={48}
            />
            
            {/* Dealer Button - Mobile */}
            {player.is_dealer && (
              <div className="absolute bottom-0 right-0 w-4 h-4 bg-[var(--color-text-primary)] text-[var(--color-bg-deep)] text-[8px] font-bold rounded-full flex items-center justify-center border border-[var(--color-bg-elevated)] shadow-sm z-10">
                D
              </div>
            )}
          </motion.div>

          {/* Position Label Badge - Mobile */}
          {(player.position_label || positionLabel) && (
            <div className="absolute -top-0.5 -right-0.5 z-20">
              <span className={`text-[7px] px-1 py-0.5 rounded font-bold shadow-md border ${
                getPositionBadgeStyle(player.position_label || positionLabel || '')
              }`}>
                {player.position_label || positionLabel}
              </span>
            </div>
          )}

          {/* Player Name & Stack - Mobile Compact */}
          <div 
            className="absolute top-[52px] left-1/2 -translate-x-1/2 glass px-2 py-1 rounded-lg border border-[var(--color-border)] text-center min-w-[56px] shadow-lg"
          >
            <div className="text-[8px] text-[var(--color-text-muted)] font-medium truncate max-w-[48px]">
              {player.name}
            </div>
            <div className="text-[11px] font-bold text-[var(--color-gold-400)] font-mono">
              ${player.stack}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // Chip position styles for desktop - towards table center
  const desktopChipPositions: Record<string, string> = {
    'bottom': 'top-[-60px] left-1/2 -translate-x-1/2',
    'left': 'right-[80px] top-1/2 -translate-y-1/2',
    'right': 'left-[-80px] top-1/2 -translate-y-1/2',
    'top': 'bottom-[80px] left-1/2 -translate-x-1/2',
    'top-left': 'bottom-[-30px] right-[-20px]',
    'top-right': 'bottom-[-30px] left-[-20px]',
  };

  // ==================== 桌面端座位渲染 ====================
  return (
    <motion.div 
      className={`absolute ${positionStyles[position]} flex flex-col items-center gap-3 z-10`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      
      {/* Cards */}
      <motion.div 
        className={`flex gap-1.5 ${isHero ? '-mt-20 mb-5 scale-110' : 'opacity-90'}`}
        animate={{ opacity: isFolded ? 0.3 : 1 }}
      >
        {isHero && heroHoleCards && heroHoleCards.length > 0 ? (
          heroHoleCards.map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: -20, rotateY: 180 }}
              animate={{ opacity: 1, y: 0, rotateY: 0 }}
              transition={{ delay: idx * 0.15, duration: 0.4 }}
              className={idx === 1 ? '-ml-6 hover:-ml-2 transition-all duration-200' : ''}
            >
              <Card 
                card={card} 
                size={isHero ? 'lg' : 'sm'}
              />
            </motion.div>
          ))
        ) : !isHero && player.state !== 'folded' ? (
          <>
            <Card hidden size="sm" />
            <Card hidden size="sm" className="-ml-4" />
          </>
        ) : isHero ? (
          <>
            <Card hidden size="lg" />
            <Card hidden size="lg" className="-ml-6" />
          </>
        ) : null}
      </motion.div>

      {/* Avatar & Info */}
      <div className={`relative group ${isFolded ? 'opacity-40 grayscale' : ''} transition-all duration-300`}>
        
        {/* Street Bet Chips Display - Desktop */}
        <AnimatePresence>
          {player.street_bet !== undefined && player.street_bet > 0 && !isFolded && (
            <motion.div 
              className={`absolute z-30 ${desktopChipPositions[position] || 'top-[-60px] left-1/2 -translate-x-1/2'}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <div className="flex items-center gap-1 bg-[var(--color-bg-deep)]/90 rounded-full px-2 py-1 border border-[var(--color-gold-600)]/50 shadow-xl">
                {/* Chip stack icon */}
                <div className="relative w-4 h-4">
                  <div className="absolute bottom-0 left-0 w-4 h-4 rounded-full bg-gradient-to-br from-[var(--color-gold-400)] to-[var(--color-gold-600)] border border-[var(--color-gold-300)]" />
                  <div className="absolute bottom-0.5 left-0 w-4 h-4 rounded-full bg-gradient-to-br from-[var(--color-gold-500)] to-[var(--color-gold-700)] border border-[var(--color-gold-400)]" />
                  <div className="absolute bottom-1 left-0 w-4 h-4 rounded-full bg-gradient-to-br from-[var(--color-gold-300)] to-[var(--color-gold-500)] border border-[var(--color-gold-200)] flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full border border-[var(--color-gold-200)]/50" />
                  </div>
                </div>
                <span className="text-xs font-bold text-[var(--color-gold-400)] font-mono">
                  ${player.street_bet}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Active Glow Ring */}
        <AnimatePresence>
          {isActive && (
            <motion.div 
              className="absolute -inset-2 rounded-full"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <div className="w-full h-full rounded-full bg-[var(--color-gold-500)]/30 blur-md animate-pulse" />
              <div className="absolute inset-0 rounded-full border-2 border-[var(--color-gold-500)] animate-pulse" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Avatar Circle */}
        <motion.div 
          className={`
            relative w-16 h-16 rounded-full overflow-hidden
            bg-[var(--color-bg-elevated)] border-[3px]
            ${isActive ? 'border-[var(--color-gold-500)]' : 'border-[var(--color-border)]'}
            shadow-lg transition-all duration-300
            ${!isHero && onPlayerClick ? 'cursor-pointer hover:scale-110 hover:border-[var(--color-gold-400)]' : ''}
          `}
          onClick={() => !isHero && onPlayerClick && onPlayerClick(player)}
          whileHover={!isHero && onPlayerClick ? { scale: 1.1 } : undefined}
          role={!isHero && onPlayerClick ? "button" : undefined}
          aria-label={!isHero && onPlayerClick ? `查看 ${player.name} 的对手分析` : undefined}
          tabIndex={!isHero && onPlayerClick ? 0 : undefined}
          onKeyDown={(e) => {
            if (!isHero && onPlayerClick && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onPlayerClick(player);
            }
          }}
        >
          <img 
            src={avatarUrl} 
            alt={`${player.name} 的头像`}
            className="w-full h-full object-cover scale-110"
            loading="lazy"
            width={64}
            height={64}
          />
          
          {/* Dealer Button */}
          {player.is_dealer && (
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-[var(--color-text-primary)] text-[var(--color-bg-deep)] text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-[var(--color-bg-elevated)] shadow-sm z-10">
              D
            </div>
          )}
        </motion.div>

        {/* Position Label Badge */}
        {(player.position_label || positionLabel) && (
          <div className="absolute -top-1 -right-1 z-20">
            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shadow-lg border ${
              getPositionBadgeStyle(player.position_label || positionLabel || '')
            }`}>
              {player.position_label || positionLabel}
            </span>
          </div>
        )}

        {/* Player Name & Stack */}
        <motion.div 
          className="absolute top-[68px] left-1/2 -translate-x-1/2 glass px-4 py-2 rounded-xl border border-[var(--color-border)] text-center min-w-[100px] shadow-xl"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="text-xs text-[var(--color-text-muted)] font-medium truncate max-w-[80px] mb-0.5">
            {player.name}
          </div>
          <div className="text-base font-bold text-[var(--color-gold-400)] font-mono">
            ${player.stack}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Seat;
