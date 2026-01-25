import React from 'react';
import type { Player } from '../types';
import Card from './Card';

interface SeatProps {
  player: Player;
  position: 'bottom' | 'left' | 'top' | 'right' | 'top-left' | 'top-right';
  isDealer?: boolean;
  isActive?: boolean;
  heroHoleCards?: string[];
  positionLabel?: string; // BTN, SB, BB, UTG, etc.
  onPlayerClick?: (player: Player) => void; // 点击玩家头像的回调
}

const Seat: React.FC<SeatProps> = ({ player, position, isDealer: _isDealer, isActive, heroHoleCards, positionLabel, onPlayerClick }) => {
  // Note: Backend uses random UUID, so we identify Hero by name === '你'
  const isHero = player.name === '你';
  
  // Debug: Log hero cards
  if (isHero) {
    console.log('[Seat] Hero Detected:', { player, heroHoleCards, hasCards: !!heroHoleCards, cardsLength: heroHoleCards?.length });
  }
  
  // Determine positioning styles based on table location
  const positionStyles = {
    'bottom': 'bottom-[-60px] left-1/2 -translate-x-1/2',
    'left': 'left-[-60px] top-1/2 -translate-y-1/2 flex-row-reverse',
    'right': 'right-[-60px] top-1/2 -translate-y-1/2',
    'top': 'top-[-60px] left-1/2 -translate-x-1/2 flex-col-reverse',
    'top-left': 'top-0 left-0 -translate-x-1/2 -translate-y-1/2 flex-col-reverse',
    'top-right': 'top-0 right-0 translate-x-1/2 -translate-y-1/2 flex-col-reverse',
  };

  const isFolded = player.state === 'folded';
  
  // Use DiceBear for avatars
  // Hero uses 'adventurer', Bots use 'bottts'
  const avatarStyle = isHero ? 'adventurer' : 'bottts';
  const avatarUrl = `https://api.dicebear.com/9.x/${avatarStyle}/svg?seed=${player.name}`;

  return (
    <div className={`absolute ${positionStyles[position]} flex flex-col items-center gap-2 z-10 transition-all duration-500`}>
      
      {/* Cards */}
      <div className={`flex gap-1 transition-all duration-300 ${isHero ? '-mt-16 mb-4 scale-110' : 'opacity-90'}`}>
        {/* Show hero cards if available, otherwise show backs if participating */}
        {isHero && heroHoleCards && heroHoleCards.length > 0 ? (
          heroHoleCards.map((card, idx) => (
            <Card 
              key={idx} 
              card={card} 
              size={isHero ? 'lg' : 'sm'}
              className={idx === 1 ? '-ml-8 hover:-ml-4 transition-all' : ''}
            />
          ))
        ) : !isHero && player.state !== 'folded' ? (
          <>
            <Card hidden size="sm" />
            <Card hidden size="sm" className="-ml-4" />
          </>
        ) : isHero ? (
          // Fallback: Show placeholder if hero cards missing
          <>
            <Card hidden size="lg" />
            <Card hidden size="lg" className="-ml-8" />
          </>
        ) : null}
      </div>

      {/* Avatar & Info */}
      <div className={`relative group ${isFolded ? 'opacity-50 grayscale' : ''}`}>
        
        {/* Active Indicator */}
        {isActive && (
          <div className="absolute -inset-1 bg-yellow-400 rounded-full blur opacity-75 animate-pulse"></div>
        )}

        {/* Action Bubble (Last Action) */}
        {player.last_action && (
           <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white text-xs px-2 py-1 rounded border border-white/10 whitespace-nowrap animate-bounce z-20">
             {/* call 0 = check */}
             {player.last_action.action.toLowerCase() === 'call' && player.last_action.amount === 0 
               ? 'CHECK' 
               : player.last_action.action.toUpperCase()}
             {player.last_action.amount > 0 && ` $${player.last_action.amount}`}
           </div>
        )}

        {/* Avatar Circle */}
        <div 
          className={`relative w-16 h-16 rounded-full border-4 ${isActive ? 'border-yellow-400' : 'border-gray-700'} bg-gray-800 overflow-hidden shadow-lg flex items-center justify-center transition-colors duration-300 box-border shrink-0 ${
            !isHero && onPlayerClick ? 'cursor-pointer hover:scale-110 hover:border-blue-400' : ''
          }`}
          onClick={() => !isHero && onPlayerClick && onPlayerClick(player)}
          title={!isHero && onPlayerClick ? '点击查看对手分析' : ''}
        >
          <img 
            src={avatarUrl} 
            alt={player.name} 
            className="w-full h-full object-cover scale-110 max-w-full max-h-full"
            loading="lazy"
          />
          
          {/* Dealer Button */}
          {player.is_dealer && (
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-white text-black text-[10px] font-bold rounded-full flex items-center justify-center border border-gray-300 shadow-sm z-10">
              D
            </div>
          )}
        </div>

        {/* Position Label Badge */}
        {(player.position_label || positionLabel) && (
          <div className="absolute -top-2 -right-2 z-20">
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shadow-lg border ${
              (player.position_label || positionLabel) === 'BTN' 
                ? 'bg-white text-black border-gray-300' 
                : (player.position_label || positionLabel) === 'SB' 
                  ? 'bg-blue-600 text-white border-blue-400'
                  : (player.position_label || positionLabel) === 'BB'
                    ? 'bg-orange-600 text-white border-orange-400'
                    : 'bg-gray-700 text-gray-200 border-gray-500'
            }`}>
              {player.position_label || positionLabel}
            </span>
          </div>
        )}

        {/* Player Name & Stack */}
        <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-gray-900/95 px-3 py-1.5 rounded-lg border border-gray-700 text-center min-w-[90px] shadow-xl backdrop-blur-sm">
          <div className="text-xs text-gray-400 font-medium truncate max-w-[70px] mb-0.5">{player.name}</div>
          <div className="text-sm font-bold text-yellow-500 font-mono">${player.stack}</div>
        </div>
      </div>
    </div>
  );
};

export default Seat;

