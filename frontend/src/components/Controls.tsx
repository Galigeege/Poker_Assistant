import React, { useState, useEffect } from 'react';
import type { ActionRequest } from '../types';

interface ControlsProps {
  onAction: (action: string, amount: number) => void;
  actionRequest: ActionRequest | null;
  playerStack: number;
  potSize: number;
}

const Controls: React.FC<ControlsProps> = ({ onAction, actionRequest, playerStack, potSize }) => {
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Update default raise amount when turn starts
  useEffect(() => {
    if (actionRequest) {
      const { valid_actions = [] } = actionRequest;
      const raiseAction = valid_actions.find((a: any) => a.action === 'raise');
      
      if (raiseAction && raiseAction.amount?.min !== -1) {
        const minRaise = raiseAction.amount.min;
        // Default to min raise
        const initialAmount = minRaise;
        setRaiseAmount(initialAmount);
        setInputValue(initialAmount.toString());
      } else {
        // Fallback if raise not available
        setRaiseAmount(0);
        setInputValue('0');
      }
      setError(null);
    }
  }, [actionRequest]);

  if (!actionRequest) return null;

  const { call_amount = 0, valid_actions = [] } = actionRequest;
  const canCheck = call_amount === 0;
  
  // Get actual min/max raise amounts from valid_actions
  const raiseAction = valid_actions.find((a: any) => a.action === 'raise');
  const minBet = raiseAction?.amount?.min ?? Math.max(call_amount * 2 + 10, 20);
  const maxBet = raiseAction?.amount?.max ?? Math.max(playerStack || (minBet + 100), minBet + 100);
  const canRaise = raiseAction && raiseAction.amount?.min !== -1;
  
  // Ensure raiseAmount is within valid range
  const validRaiseAmount = canRaise ? Math.max(Math.min(raiseAmount, maxBet), minBet) : minBet;

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    const parsed = parseInt(value);
    if (!isNaN(parsed)) {
      setRaiseAmount(parsed);
    }
  };

  // Handle input blur - validate and clamp value
  const handleInputBlur = () => {
    const clamped = Math.max(Math.min(raiseAmount, maxBet), minBet);
    setRaiseAmount(clamped);
    setInputValue(clamped.toString());
  };

  // Handle preset button click
  const handlePreset = (val: number) => {
    const clamped = canRaise ? Math.min(Math.max(val, minBet), maxBet) : minBet;
    setRaiseAmount(clamped);
    setInputValue(clamped.toString());
    setError(null);
  };

  // Handle raise action with validation
  const handleRaise = () => {
    if (!canRaise) {
      setError('当前不能加注');
      return;
    }
    
    if (raiseAmount < minBet || raiseAmount > maxBet) {
      setError(`加注金额必须在 $${minBet} 到 $${maxBet} 之间`);
      return;
    }
    
    setError(null);
    onAction('raise', validRaiseAmount);
  };

  return (
    <div className="fixed bottom-4 left-4 w-80 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-2xl p-4 z-40 shadow-2xl animate-slide-up">
      {/* Header */}
      <div className="text-center mb-3">
        <span className="text-gray-400 text-xs uppercase tracking-wider">Your Action</span>
      </div>

      {/* Raise Amount Input */}
      <div className="mb-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-gray-400 text-sm">Raise to:</span>
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-500 font-bold">$</span>
            <input 
              type="number"
              value={inputValue}
              onChange={(e) => {
                handleInputChange(e);
                setError(null);
              }}
              onBlur={handleInputBlur}
              min={minBet}
              max={maxBet}
              className={`w-full pl-8 pr-3 py-2 bg-gray-800 border rounded-lg text-yellow-500 font-bold text-lg focus:outline-none transition-colors ${
                error ? 'border-red-500' : 'border-gray-600 focus:border-yellow-500'
              }`}
              disabled={!canRaise || minBet >= maxBet}
            />
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-500 font-mono px-1">
          <span>Min: ${minBet}</span>
          <span>Max: ${maxBet}</span>
        </div>
        {error && (
          <div className="text-xs text-red-400 bg-red-900/30 px-2 py-1 rounded border border-red-800/50">
            {error}
          </div>
        )}
      </div>

      {/* Preset Buttons */}
      <div className="grid grid-cols-4 gap-1.5 mb-4">
        {[
          { label: 'Min', val: minBet },
          { label: '½ Pot', val: Math.floor(potSize / 2) + call_amount },
          { label: 'Pot', val: potSize + call_amount },
          { label: 'All In', val: maxBet },
        ].map((preset) => (
          <button 
            key={preset.label}
            onClick={() => handlePreset(preset.val)}
            className="py-1.5 text-xs bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-300 transition-colors border border-gray-700 hover:border-gray-600"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-2">
        <button 
          onClick={() => onAction('fold', 0)}
          className="py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/30 transition-all active:scale-95"
        >
          FOLD
        </button>
        <button 
          onClick={() => onAction('call', call_amount)}
          className="py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
        >
          {canCheck ? 'CHECK' : `CALL`}
          {!canCheck && call_amount > 0 && (
            <span className="block text-xs opacity-80">${call_amount}</span>
          )}
        </button>
        <button 
          onClick={handleRaise}
          className="py-3 rounded-xl font-bold text-black bg-yellow-400 hover:bg-yellow-300 shadow-lg shadow-yellow-900/30 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={!canRaise || minBet >= maxBet}
        >
          RAISE
          <span className="block text-xs opacity-80">${validRaiseAmount}</span>
        </button>
      </div>
    </div>
  );
};

export default Controls;
