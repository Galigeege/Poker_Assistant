import React from 'react';
import { Card as CardType, Suit, Rank } from '../types';

interface CardProps {
  card?: CardType;
  hidden?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const Card: React.FC<CardProps> = ({ card, hidden = false, className = '', size = 'md' }) => {
  const isRed = card && (card.suit === Suit.HEARTS || card.suit === Suit.DIAMONDS);
  
  const sizeClasses = {
    sm: 'w-8 h-12 text-xs rounded-sm',
    md: 'w-14 h-20 text-lg rounded',
    lg: 'w-20 h-28 text-2xl rounded-md',
  };

  if (hidden || !card) {
    return (
      <div 
        className={`${sizeClasses[size]} bg-blue-900 border-2 border-white/20 shadow-lg flex items-center justify-center ${className} relative overflow-hidden`}
      >
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')]"></div>
        <div className="w-full h-full bg-gradient-to-br from-blue-800 to-blue-950 flex items-center justify-center">
             <div className="w-6 h-6 rounded-full border-2 border-blue-400/30"></div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`${sizeClasses[size]} bg-white shadow-xl flex flex-col items-center justify-between p-1 select-none transform transition-transform hover:-translate-y-1 ${className}`}
    >
      <div className={`self-start leading-none font-bold font-mono ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        {card.rank}
        <div className="text-[0.6em]">{card.suit}</div>
      </div>
      
      <div className={`text-2xl ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        {card.suit}
      </div>

      <div className={`self-end leading-none font-bold font-mono rotate-180 ${isRed ? 'text-red-600' : 'text-gray-900'}`}>
        {card.rank}
        <div className="text-[0.6em]">{card.suit}</div>
      </div>
    </div>
  );
};

export default Card;