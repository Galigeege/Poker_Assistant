import React from 'react';
import { motion } from 'framer-motion';

export interface CardData {
  suit: string;
  rank: string;
}

interface CardProps {
  card?: string | CardData;
  hidden?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'responsive' | 'responsive-sm' | 'responsive-lg';
}

const Card: React.FC<CardProps> = ({ card, hidden = false, className = '', size = 'md' }) => {
  // Parse card input
  let displayRank = '';
  let displaySuit = '';
  let isRed = false;
  let suitIcon = '';

  if (!hidden && card) {
    if (typeof card === 'string') {
      const cleanCard = card.trim().replace(/[^A-Za-z0-9]/g, '');
      
      let rankChar = '';
      let suitChar = '';

      if (['S', 'H', 'D', 'C', 's', 'h', 'd', 'c'].includes(cleanCard[0])) {
        suitChar = cleanCard[0].toUpperCase();
        rankChar = cleanCard.slice(1);
      } else {
        if (cleanCard.length >= 3 && cleanCard.slice(0, 2) === '10') {
          rankChar = '10';
          suitChar = cleanCard.slice(2).toUpperCase();
        } else {
          rankChar = cleanCard.slice(0, -1);
          suitChar = cleanCard.slice(-1).toUpperCase();
        }
      }

      displayRank = rankChar.replace('T', '10');
      const suitMap: Record<string, string> = {
        'H': '♥', 'D': '♦', 'S': '♠', 'C': '♣'
      };
      displaySuit = suitMap[suitChar] || '?';
      suitIcon = suitChar;
      isRed = suitChar === 'H' || suitChar === 'D';
    } else if (card && typeof card === 'object') {
      const suit = (card as { suit?: string; s?: string }).suit || (card as { s?: string }).s || '';
      const rank = (card as { rank?: string; r?: string }).rank || (card as { r?: string }).r || '';
      if (suit && rank) {
        const suitUpper = suit.toUpperCase();
        displayRank = rank.replace('T', '10');
        const suitMap: Record<string, string> = {
          'H': '♥', 'D': '♦', 'S': '♠', 'C': '♣'
        };
        displaySuit = suitMap[suitUpper] || '?';
        suitIcon = suitUpper;
        isRed = suitUpper === 'H' || suitUpper === 'D';
      }
    }
  }
  
  // Size classes with premium styling
  const sizeConfig: Record<string, { card: string; rank: string; suit: string; centerSuit: string; circle: string }> = {
    sm: {
      card: 'w-10 h-14',
      rank: 'text-xs',
      suit: 'text-[8px]',
      centerSuit: 'text-lg',
      circle: 'w-4 h-4',
    },
    md: {
      card: 'w-14 h-20',
      rank: 'text-base',
      suit: 'text-[10px]',
      centerSuit: 'text-2xl',
      circle: 'w-6 h-6',
    },
    lg: {
      card: 'w-20 h-28',
      rank: 'text-xl',
      suit: 'text-xs',
      centerSuit: 'text-4xl',
      circle: 'w-8 h-8',
    },
    'responsive-sm': {
      card: 'w-[clamp(28px,3vw,44px)] h-[clamp(42px,4.5vw,66px)]',
      rank: 'text-[clamp(9px,1vw,14px)]',
      suit: 'text-[clamp(6px,0.7vw,10px)]',
      centerSuit: 'text-[clamp(14px,1.8vw,24px)]',
      circle: 'w-[clamp(12px,1.5vw,20px)] h-[clamp(12px,1.5vw,20px)]',
    },
    responsive: {
      card: 'w-[clamp(36px,4vw,56px)] h-[clamp(54px,6vw,84px)]',
      rank: 'text-[clamp(11px,1.2vw,18px)]',
      suit: 'text-[clamp(7px,0.8vw,11px)]',
      centerSuit: 'text-[clamp(18px,2.2vw,32px)]',
      circle: 'w-[clamp(14px,1.8vw,24px)] h-[clamp(14px,1.8vw,24px)]',
    },
    'responsive-lg': {
      card: 'w-[clamp(44px,5vw,72px)] h-[clamp(66px,7.5vw,108px)]',
      rank: 'text-[clamp(14px,1.6vw,24px)]',
      suit: 'text-[clamp(8px,1vw,14px)]',
      centerSuit: 'text-[clamp(24px,3vw,44px)]',
      circle: 'w-[clamp(18px,2.2vw,30px)] h-[clamp(18px,2.2vw,30px)]',
    },
  };

  const config = sizeConfig[size];

  // Card back (hidden)
  if (hidden || !card) {
    return (
      <motion.div 
        className={`${config.card} rounded-lg shadow-xl overflow-hidden select-none ${className}`}
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
      >
        {/* Card back design - premium pattern */}
        <div className="w-full h-full bg-gradient-to-br from-[#1a3f6e] to-[#0d2240] border-2 border-[#2a5a9e]/40 rounded-lg relative overflow-hidden">
          {/* Pattern overlay */}
          <div className="absolute inset-0 opacity-20">
            <svg className="w-full h-full" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="cardBack" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                  <circle cx="5" cy="5" r="1" fill="#d4af37" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#cardBack)" />
            </svg>
          </div>
          
          {/* Center decoration */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`${config.circle} rounded-full border-2 border-[var(--color-gold-500)]/30 flex items-center justify-center`}>
              <div className="w-1/2 h-1/2 rounded-full bg-[var(--color-gold-500)]/20" />
            </div>
          </div>
          
          {/* Edge highlight */}
          <div className="absolute inset-1 rounded border border-[var(--color-gold-500)]/10" />
        </div>
      </motion.div>
    );
  }

  // Card front
  const textColor = isRed ? 'text-[var(--color-crimson-500)]' : 'text-[#1a1a1a]';
  
  return (
    <motion.div 
      className={`${config.card} rounded-lg shadow-xl overflow-hidden select-none ${className}`}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
    >
      <div className="w-full h-full bg-gradient-to-br from-[#fefefe] to-[#f0ece4] border border-[#d0c8b8]/60 rounded-lg relative p-1.5 flex flex-col">
        
        {/* Top left rank & suit */}
        <div className={`flex flex-col items-start leading-none font-bold ${textColor}`}>
          <span className={`${config.rank} font-display`}>{displayRank}</span>
          <span className={config.suit}>{displaySuit}</span>
        </div>
        
        {/* Center suit */}
        <div className={`flex-1 flex items-center justify-center ${config.centerSuit} ${textColor}`}>
          {displaySuit}
        </div>
        
        {/* Bottom right rank & suit (rotated) */}
        <div className={`flex flex-col items-end leading-none font-bold rotate-180 ${textColor}`}>
          <span className={`${config.rank} font-display`}>{displayRank}</span>
          <span className={config.suit}>{displaySuit}</span>
        </div>
        
        {/* Subtle shine effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent rounded-lg pointer-events-none" />
      </div>
    </motion.div>
  );
};

export default Card;
