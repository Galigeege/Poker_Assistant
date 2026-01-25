import React from 'react';
import { Player, PlayerType } from '../types';
import Card from './Card';

interface SeatProps {
  player: Player;
  position: 'bottom' | 'left' | 'top' | 'right' | 'top-left' | 'top-right';
  isDealer?: boolean;
  isActive?: boolean;
}

const Seat: React.FC<SeatProps> = ({ player, position, isDealer, isActive }) => {
  // Determine positioning styles based on table location
  const positionStyles = {
    'bottom': 'bottom-[-40px] left-1/2 -translate-x-1/2',
    'left': 'left-[-40px] top-1/2 -translate-y-1/2 flex-row-reverse',
    'right': 'right-[-40px] top-1/2 -translate-y-1/2',
    'top': 'top-[-40px] left-1/2 -translate-x-1/2 flex-col-reverse',
    'top-left': 'top-0 left-0 -translate-x-1/4 -translate-y-1/4',
    'top-right': 'top-0 right-0 translate-x-1/4 -translate-y-1/4',
  };

  const isHero = player.type === PlayerType.HUMAN;

  // Dynamic Avatar URL based on player type
  const avatarStyle = player.type === PlayerType.HUMAN ? 'adventurer' : 'bottts';
  const avatarUrl = `https://api.dicebear.com/9.x/${avatarStyle}/svg?seed=${player.avatarSeed}`;

  return (
    <div className={`absolute ${positionStyles[position]} flex flex-col items-center gap-2 z-10 transition-all duration-500`}>
      
      {/* Cards */}
      <div className={`flex gap-1 ${isHero ? '-mt-12 mb-2 scale-110' : 'opacity-90'}`}>
        {player.cards.map((card, idx) => (
          <Card 
            key={idx} 
            card={card} 
            hidden={!isHero && player.status !== 'all-in' && player.status !== 'folded'}
            size={isHero ? 'lg' : 'sm'}
            className={isHero && idx === 1 ? '-ml-8 hover:-ml-4 transition-all' : ''}
          />
        ))}
      </div>

      {/* Avatar & Info */}
      <div className={`relative group ${player.status === 'folded' ? 'opacity-50 grayscale' : ''}`}>
        
        {/* Active Indicator */}
        {isActive && (
          <div className="absolute -inset-1 bg-yellow-400 rounded-full blur opacity-75 animate-pulse"></div>
        )}

        {/* Action Bubble */}
        {player.action && (
           <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900/90 text-white text-xs px-2 py-1 rounded border border-white/10 whitespace-nowrap animate-bounce z-20">
             {player.action}
             {player.bet > 0 && ` $${player.bet}`}
           </div>
        )}

        {/* Avatar Circle */}
        <div className={`relative w-16 h-16 rounded-full border-4 ${isActive ? 'border-yellow-400' : 'border-gray-700'} bg-gray-800 overflow-hidden shadow-lg flex items-center justify-center`}>
          <img 
            src={avatarUrl} 
            alt={player.name} 
            className="w-full h-full object-cover scale-110"
            loading="lazy"
          />
          
          {/* Dealer Button */}
          {isDealer && (
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-white text-black text-[10px] font-bold rounded-full flex items-center justify-center border border-gray-300 shadow-sm z-10">
              D
            </div>
          )}
        </div>

        {/* Player Name & Stack */}
        <div className="absolute top-14 left-1/2 -translate-x-1/2 bg-gray-900/95 px-3 py-1 rounded-lg border border-gray-700 text-center min-w-[100px] shadow-xl">
          <div className="text-xs text-gray-400 font-medium truncate max-w-[80px]">{player.name}</div>
          <div className="text-sm font-bold text-yellow-500 font-mono">${player.chips}</div>
        </div>
      </div>
    </div>
  );
};

export default Seat;