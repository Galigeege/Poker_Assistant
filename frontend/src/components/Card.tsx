import React from 'react';

export interface CardData {
  suit: string; // 'h', 'd', 's', 'c' or full names
  rank: string;
}

interface CardProps {
  card?: string | CardData; // Support both "Ah" string and object
  hidden?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'responsive' | 'responsive-sm' | 'responsive-lg';
}

const Card: React.FC<CardProps> = ({ card, hidden = false, className = '', size = 'md' }) => {
  // Parse card input
  let displayRank = '';
  let displaySuit = '';
  let isRed = false;

  if (!hidden && card) {
    if (typeof card === 'string') {
      // Remove any whitespace or special characters
      const cleanCard = card.trim().replace(/[^A-Za-z0-9]/g, '');
      
      // "SA", "DK", "H10" format (Suit + Rank) from Backend
      // Or "Ah", "Td" format (Rank + Suit) if mixed
      
      let rankChar = '';
      let suitChar = '';

      // Simple heuristic: Check if first char is a Suit (S, H, D, C)
      if (['S', 'H', 'D', 'C', 's', 'h', 'd', 'c'].includes(cleanCard[0])) {
          suitChar = cleanCard[0].toUpperCase();
          rankChar = cleanCard.slice(1); // Handle '10' correctly
      } else {
          // Assume Rank + Suit (old format)
          // Handle 2-digit ranks like "10"
          if (cleanCard.length >= 3 && cleanCard.slice(0, 2) === '10') {
            rankChar = '10';
            suitChar = cleanCard.slice(2).toUpperCase();
          } else {
            rankChar = cleanCard.slice(0, -1);
            suitChar = cleanCard.slice(-1).toUpperCase();
          }
      }

      displayRank = rankChar.replace('T', '10');
      displaySuit = {
        'H': '♥', 'D': '♦', 'S': '♠', 'C': '♣',
        'h': '♥', 'd': '♦', 's': '♠', 'c': '♣'
      }[suitChar] || '?';
      isRed = suitChar === 'H' || suitChar === 'D' || suitChar === 'h' || suitChar === 'd';
    } else if (card && typeof card === 'object') {
      // Handle object format {suit: 'H', rank: '6'} or {s: 'H', r: '6'}
      const suit = (card as any).suit || (card as any).s || '';
      const rank = (card as any).rank || (card as any).r || '';
      if (suit && rank) {
        const suitUpper = suit.toUpperCase();
        displayRank = rank.replace('T', '10');
        const suitMap: Record<string, string> = {
          'H': '♥', 'D': '♦', 'S': '♠', 'C': '♣',
          'h': '♥', 'd': '♦', 's': '♠', 'c': '♣'
        };
        displaySuit = suitMap[suitUpper] || '?';
        isRed = suitUpper === 'H' || suitUpper === 'D';
      }
    }
  }
  
  // Size classes - includes responsive options using clamp
  const sizeClasses: Record<string, string> = {
    sm: 'w-8 h-12 text-xs rounded-sm',
    md: 'w-14 h-20 text-lg rounded',
    lg: 'w-20 h-28 text-2xl rounded-md',
    // Responsive sizes that scale with viewport
    'responsive-sm': 'w-[clamp(22px,2.8vw,40px)] h-[clamp(33px,4.2vw,60px)] text-[clamp(8px,1vw,13px)] rounded-[clamp(2px,0.25vw,4px)]',
    'responsive': 'w-[clamp(28px,3.5vw,52px)] h-[clamp(42px,5.25vw,78px)] text-[clamp(10px,1.2vw,16px)] rounded-[clamp(2px,0.3vw,5px)]',
    'responsive-lg': 'w-[clamp(36px,4.5vw,72px)] h-[clamp(54px,6.75vw,108px)] text-[clamp(14px,1.6vw,24px)] rounded-[clamp(3px,0.4vw,6px)]',
  };

  // Center suit size classes
  const centerSuitClasses: Record<string, string> = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
    'responsive-sm': 'text-[clamp(14px,1.6vw,22px)]',
    'responsive': 'text-[clamp(16px,2vw,30px)]',
    'responsive-lg': 'text-[clamp(22px,2.8vw,42px)]',
  };

  // Hidden card inner circle size
  const hiddenCircleClasses: Record<string, string> = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    'responsive-sm': 'w-[clamp(12px,1.4vw,18px)] h-[clamp(12px,1.4vw,18px)]',
    'responsive': 'w-[clamp(14px,1.6vw,22px)] h-[clamp(14px,1.6vw,22px)]',
    'responsive-lg': 'w-[clamp(18px,2.2vw,30px)] h-[clamp(18px,2.2vw,30px)]',
  };

  if (hidden || !card) {
    return (
      <div 
        className={`${sizeClasses[size]} bg-blue-900 border-2 border-white/20 shadow-lg flex items-center justify-center ${className} relative overflow-hidden`}
      >
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]"></div>
        <div className="w-full h-full bg-gradient-to-br from-blue-800 to-blue-950 flex items-center justify-center">
             <div className={`${hiddenCircleClasses[size]} rounded-full border-2 border-blue-400/30`}></div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`${sizeClasses[size]} bg-white shadow-xl flex flex-col items-center justify-center p-[clamp(2px,0.25vw,4px)] select-none transform transition-transform hover:-translate-y-0.5 ${className}`}
    >
      {displayRank && displaySuit ? (
        <>
          <div className={`self-start leading-none font-bold font-mono ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
            {displayRank}
            <div className="text-[0.6em]">{displaySuit}</div>
          </div>
          
          <div className={`${centerSuitClasses[size]} ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
            {displaySuit}
          </div>
        </>
      ) : (
        // Fallback if parsing failed
        <div className="flex items-center justify-center h-full text-xs text-gray-500">
          {typeof card === 'string' ? card : 'ERR'}
        </div>
      )}
    </div>
  );
};

export default Card;
