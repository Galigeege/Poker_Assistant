import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Player } from '../types';
import Card from './Card';

interface SeatProps {
  player: Player;
  position: 'bottom' | 'left' | 'top' | 'right' | 'top-left' | 'top-right';
  isDealer?: boolean;
  isActive?: boolean;
  heroHoleCards?: string[];
  positionLabel?: string;
  onPlayerClick?: (player: Player) => void;
}

const Seat: React.FC<SeatProps> = ({ 
  player, 
  position, 
  isDealer: _isDealer, 
  isActive, 
  heroHoleCards, 
  positionLabel, 
  onPlayerClick 
}) => {
  const isHero = player.name === '你';
  
  // Position styles - 桌面端固定位置
  const positionStyles: Record<string, string> = {
    'bottom': 'bottom-[-70px] left-1/2 -translate-x-1/2',
    'left': 'left-[-70px] top-1/2 -translate-y-1/2 flex-row-reverse',
    'right': 'right-[-70px] top-1/2 -translate-y-1/2',
    'top': 'top-[-70px] left-1/2 -translate-x-1/2 flex-col-reverse',
    'top-left': 'top-[5%] left-[12%] -translate-x-1/2 -translate-y-1/2 flex-col-reverse',
    'top-right': 'top-[5%] right-[12%] translate-x-1/2 -translate-y-1/2 flex-col-reverse',
  };

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
                size="lg"
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

        {/* Last Action Bubble */}
        <AnimatePresence>
          {player.last_action && (
            <motion.div 
              className="absolute -top-10 left-1/2 -translate-x-1/2 z-20"
              initial={{ opacity: 0, y: 10, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.8 }}
            >
              <div className="glass px-3 py-1.5 rounded-lg border border-[var(--color-border)] whitespace-nowrap">
                <span className={`text-xs font-bold uppercase tracking-wide ${
                  player.last_action.action.toLowerCase() === 'fold' 
                    ? 'text-[var(--color-crimson-400)]'
                    : player.last_action.action.toLowerCase() === 'raise'
                    ? 'text-[var(--color-gold-400)]'
                    : 'text-[var(--color-emerald-400)]'
                }`}>
                  {player.last_action.action.toLowerCase() === 'call' && player.last_action.amount === 0 
                    ? 'CHECK' 
                    : player.last_action.action.toUpperCase()}
                </span>
                {player.last_action.amount > 0 && (
                  <span className="text-xs text-[var(--color-text-secondary)] ml-1.5 font-mono">
                    ${player.last_action.amount}
                  </span>
                )}
              </div>
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
