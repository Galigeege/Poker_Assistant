import React, { useState } from 'react';
import { Player } from '../types';

interface ControlsProps {
  onAction: (type: string, amount?: number) => void;
  minBet: number;
  maxBet: number;
  potSize: number;
  hero: Player;
  disabled?: boolean;
}

const Controls: React.FC<ControlsProps> = ({ onAction, minBet, maxBet, potSize, hero, disabled }) => {
  const [raiseAmount, setRaiseAmount] = useState(minBet);

  if (disabled) return null;

  const handleRaiseChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRaiseAmount(parseInt(e.target.value));
  };

  const presetBets = [
    { label: 'Min', val: minBet },
    { label: '1/2 Pot', val: Math.floor(potSize / 2) },
    { label: 'Pot', val: potSize },
    { label: 'All In', val: hero.chips },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 md:left-64 bg-gray-900 border-t border-gray-800 p-4 z-50">
      <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-6">
        
        {/* Slider & Presets */}
        <div className="flex-1 w-full space-y-2">
           <div className="flex justify-between text-xs text-gray-400 font-mono">
             <span>${minBet}</span>
             <span className="text-yellow-500 font-bold">${raiseAmount}</span>
             <span>${hero.chips}</span>
           </div>
           <input 
             type="range" 
             min={minBet} 
             max={hero.chips} 
             value={raiseAmount} 
             onChange={handleRaiseChange}
             className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-yellow-500"
           />
           <div className="flex gap-2 justify-between">
             {presetBets.map((preset) => (
               <button 
                 key={preset.label}
                 onClick={() => setRaiseAmount(Math.min(Math.max(preset.val, minBet), hero.chips))}
                 className="flex-1 py-1 text-xs bg-gray-800 hover:bg-gray-700 rounded text-gray-300 transition-colors"
               >
                 {preset.label}
               </button>
             ))}
           </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => onAction('FOLD')}
            className="flex-1 md:flex-none md:w-24 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/20 transition-all active:scale-95"
          >
            FOLD
          </button>
          <button 
            onClick={() => onAction('CHECK')} // Logic should handle check vs call based on current bet
            className="flex-1 md:flex-none md:w-24 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/20 transition-all active:scale-95"
          >
            CHECK
          </button>
          <button 
            onClick={() => onAction('RAISE', raiseAmount)}
            className="flex-1 md:flex-none md:w-32 py-3 rounded-xl font-bold text-black bg-yellow-400 hover:bg-yellow-300 shadow-lg shadow-yellow-900/20 transition-all active:scale-95"
          >
            RAISE ${raiseAmount}
          </button>
        </div>

      </div>
    </div>
  );
};

export default Controls;