import React, { useState, useEffect, useId } from 'react';
import { motion } from 'framer-motion';
import type { ActionRequest } from '../types';

interface ControlsProps {
  onAction: (action: string, amount: number) => void;
  actionRequest: ActionRequest | null;
  playerStack: number;
  potSize: number;
  isMobile?: boolean;
}

const Controls: React.FC<ControlsProps> = ({ onAction, actionRequest, playerStack, potSize, isMobile = false }) => {
  const [raiseAmount, setRaiseAmount] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();

  useEffect(() => {
    if (actionRequest) {
      const { valid_actions = [] } = actionRequest;
      const raiseAction = valid_actions.find((a: { action: string; amount?: { min: number; max: number } }) => a.action === 'raise');
      
      if (raiseAction && raiseAction.amount?.min !== -1) {
        const minRaise = raiseAction.amount.min;
        setRaiseAmount(minRaise);
        setInputValue(minRaise.toString());
      } else {
        setRaiseAmount(0);
        setInputValue('0');
      }
      setError(null);
    }
  }, [actionRequest]);

  if (!actionRequest) return null;

  const { call_amount = 0, valid_actions = [] } = actionRequest;
  const canCheck = call_amount === 0;
  
  const raiseAction = valid_actions.find((a: { action: string; amount?: { min: number; max: number } }) => a.action === 'raise');
  const minBet = raiseAction?.amount?.min ?? Math.max(call_amount * 2 + 10, 20);
  const maxBet = raiseAction?.amount?.max ?? Math.max(playerStack || (minBet + 100), minBet + 100);
  const canRaise = raiseAction && raiseAction.amount?.min !== -1;
  
  const validRaiseAmount = canRaise ? Math.max(Math.min(raiseAmount, maxBet), minBet) : minBet;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    const parsed = parseInt(value);
    if (!isNaN(parsed)) {
      setRaiseAmount(parsed);
    }
  };

  const handleInputBlur = () => {
    const clamped = Math.max(Math.min(raiseAmount, maxBet), minBet);
    setRaiseAmount(clamped);
    setInputValue(clamped.toString());
  };

  const handlePreset = (val: number) => {
    const clamped = canRaise ? Math.min(Math.max(val, minBet), maxBet) : minBet;
    setRaiseAmount(clamped);
    setInputValue(clamped.toString());
    setError(null);
  };

  const handleRaise = () => {
    if (!canRaise) {
      setError('当前不能加注');
      return;
    }
    
    if (raiseAmount < minBet || raiseAmount > maxBet) {
      setError(`加注金额必须在 $${minBet} - $${maxBet} 之间`);
      return;
    }
    
    setError(null);
    onAction('raise', validRaiseAmount);
  };

  const presets = [
    { label: 'Min', val: minBet },
    { label: '½ Pot', val: Math.floor(potSize / 2) + call_amount },
    { label: 'Pot', val: potSize + call_amount },
    { label: 'All In', val: maxBet },
  ];

  // ==================== 移动端布局 ====================
  if (isMobile) {
    // 移动端快捷按钮显示具体金额
    const mobilePresets = [
      { label: 'Min', val: minBet, display: `$${minBet}` },
      { label: '½Pot', val: Math.floor(potSize / 2) + call_amount, display: `$${Math.floor(potSize / 2) + call_amount}` },
      { label: 'Pot', val: potSize + call_amount, display: `$${potSize + call_amount}` },
      { label: 'All', val: maxBet, display: `$${maxBet}` },
    ];

    return (
      <motion.div 
        className="w-full bg-[var(--color-bg-base)] border-t border-[var(--color-border)] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
      >
        {/* Raise Amount Row - Mobile Compact */}
        <div className="flex items-center gap-2 mb-2">
          <label htmlFor={inputId} className="text-[var(--color-text-muted)] text-[10px] shrink-0 uppercase tracking-wider">
            Raise
          </label>
          <div className="flex-1 relative">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-gold-500)] font-bold text-xs font-mono">
              $
            </span>
            <input 
              id={inputId}
              name="raise-amount"
              type="number"
              value={inputValue}
              onChange={(e) => {
                handleInputChange(e);
                setError(null);
              }}
              onBlur={handleInputBlur}
              min={minBet}
              max={maxBet}
              className={`
                w-full pl-5 pr-2 py-1.5 
                bg-[var(--color-bg-deep)] 
                border rounded-lg 
                text-[var(--color-gold-400)] font-bold text-sm font-mono
                focus:outline-none transition-all
                ${error 
                  ? 'border-[var(--color-crimson-500)]' 
                  : 'border-[var(--color-border)] focus:border-[var(--color-gold-500)]'
                }
              `}
              disabled={!canRaise || minBet >= maxBet}
              autoComplete="off"
            />
          </div>
        </div>

        {/* Preset Buttons Row - Mobile with Amounts */}
        <div className="flex gap-1.5 mb-2">
          {mobilePresets.map((preset) => (
            <button 
              key={preset.label}
              type="button"
              onClick={() => handlePreset(preset.val)}
              disabled={!canRaise}
              className="
                flex-1 py-1.5 text-[10px] font-medium
                bg-[var(--color-bg-elevated)] active:bg-[var(--color-gold-900)]/30
                rounded-md text-[var(--color-text-secondary)]
                transition-all border border-[var(--color-border)]
                active:border-[var(--color-gold-500)]/50
                disabled:opacity-40 disabled:cursor-not-allowed
                flex flex-col items-center leading-tight
              "
            >
              <span className="text-[var(--color-text-muted)]">{preset.label}</span>
              <span className="text-[var(--color-gold-400)] font-mono text-[9px]">{preset.display}</span>
            </button>
          ))}
        </div>

        {/* Error Message - Mobile */}
        {error && (
          <motion.div 
            className="text-[10px] text-[var(--color-crimson-400)] bg-[var(--color-crimson-900)]/20 px-2 py-1 rounded mb-2"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
          >
            {error}
          </motion.div>
        )}

        {/* Action Buttons Row - Mobile Compact */}
        <div className="flex gap-2">
          <button 
            type="button"
            onClick={() => onAction('fold', 0)}
            className="
              flex-1 py-3 rounded-lg font-bold text-white text-sm
              bg-gradient-to-b from-[var(--color-crimson-600)] to-[var(--color-crimson-700)]
              active:from-[var(--color-crimson-500)] active:to-[var(--color-crimson-600)]
              active:brightness-110
              shadow-md shadow-[var(--color-crimson-900)]/30
              transition-all active:scale-[0.97]
            "
            aria-label="Fold 弃牌"
          >
            FOLD
          </button>
          
          <button 
            type="button"
            onClick={() => onAction('call', call_amount)}
            className="
              flex-1 py-3 rounded-lg font-bold text-white text-sm
              bg-gradient-to-b from-[var(--color-emerald-600)] to-[var(--color-emerald-700)]
              active:from-[var(--color-emerald-500)] active:to-[var(--color-emerald-600)]
              active:brightness-110
              shadow-md shadow-[var(--color-emerald-900)]/30
              transition-all active:scale-[0.97]
            "
            aria-label={canCheck ? 'Check 过牌' : `Call 跟注 $${call_amount}`}
          >
            {canCheck ? 'CHECK' : (
              <span className="flex flex-col items-center leading-tight">
                <span>CALL</span>
                <span className="text-[10px] opacity-80 font-mono">${call_amount}</span>
              </span>
            )}
          </button>
          
          <button 
            type="button"
            onClick={handleRaise}
            disabled={!canRaise || minBet >= maxBet}
            className="
              flex-1 py-3 rounded-lg font-bold text-[var(--color-bg-deep)] text-sm
              bg-gradient-to-b from-[var(--color-gold-400)] to-[var(--color-gold-600)]
              active:from-[var(--color-gold-300)] active:to-[var(--color-gold-500)]
              active:brightness-110
              shadow-md shadow-[var(--color-gold-900)]/30
              transition-all active:scale-[0.97]
              disabled:opacity-40 disabled:cursor-not-allowed
            "
            aria-label={`Raise 加注到 $${validRaiseAmount}`}
          >
            <span className="flex flex-col items-center leading-tight">
              <span>RAISE</span>
              <span className="text-[10px] opacity-80 font-mono">${validRaiseAmount}</span>
            </span>
          </button>
        </div>
      </motion.div>
    );
  }

  // ==================== 桌面端布局 (保持不变) ====================
  return (
    <motion.div 
      className="w-80 glass rounded-2xl p-5 shadow-2xl border border-[var(--color-border)]"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      {/* Header */}
      <div className="text-center mb-4">
        <span className="text-[var(--color-text-muted)] text-xs uppercase tracking-widest font-medium">
          Your Action
        </span>
        <div className="line-gold w-12 mx-auto mt-2" />
      </div>

      {/* Raise Amount Input */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-3">
          <label htmlFor={inputId} className="text-[var(--color-text-secondary)] text-sm shrink-0">
            Raise to:
          </label>
          <div className="flex-1 relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-gold-500)] font-bold font-mono">
              $
            </span>
            <input 
              id={inputId}
              name="raise-amount"
              type="number"
              value={inputValue}
              onChange={(e) => {
                handleInputChange(e);
                setError(null);
              }}
              onBlur={handleInputBlur}
              min={minBet}
              max={maxBet}
              className={`
                w-full pl-7 pr-3 py-2.5 
                bg-[var(--color-bg-base)] 
                border rounded-xl 
                text-[var(--color-gold-400)] font-bold text-lg font-mono
                focus:outline-none transition-all
                ${error 
                  ? 'border-[var(--color-crimson-500)]' 
                  : 'border-[var(--color-border)] focus:border-[var(--color-gold-500)] focus:ring-2 focus:ring-[var(--color-gold-500)]/20'
                }
              `}
              disabled={!canRaise || minBet >= maxBet}
              autoComplete="off"
            />
          </div>
        </div>
        
        <div className="flex justify-between text-[10px] text-[var(--color-text-dim)] font-mono px-1">
          <span>Min: ${minBet}</span>
          <span>Max: ${maxBet}</span>
        </div>
        
        {error && (
          <motion.div 
            className="text-xs text-[var(--color-crimson-400)] bg-[var(--color-crimson-900)]/20 px-3 py-1.5 rounded-lg border border-[var(--color-crimson-800)]/30"
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            role="alert"
          >
            {error}
          </motion.div>
        )}
      </div>

      {/* Preset Buttons */}
      <div className="grid grid-cols-4 gap-2 mb-5">
        {presets.map((preset) => (
          <button 
            key={preset.label}
            type="button"
            onClick={() => handlePreset(preset.val)}
            disabled={!canRaise}
            className="
              py-2 text-xs font-medium
              bg-[var(--color-bg-elevated)] hover:bg-[var(--color-bg-hover)]
              rounded-lg text-[var(--color-text-secondary)]
              transition-all border border-[var(--color-border)]
              hover:border-[var(--color-border-hover)] hover:text-[var(--color-text-primary)]
              disabled:opacity-50 disabled:cursor-not-allowed
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold-500)]
            "
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-3 gap-3">
        <button 
          type="button"
          onClick={() => onAction('fold', 0)}
          className="
            py-3.5 rounded-xl font-bold text-white
            bg-gradient-to-b from-[var(--color-crimson-600)] to-[var(--color-crimson-700)]
            hover:from-[var(--color-crimson-500)] hover:to-[var(--color-crimson-600)]
            shadow-lg shadow-[var(--color-crimson-900)]/40
            transition-all active:scale-95
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-crimson-400)]
          "
          aria-label="Fold 弃牌"
        >
          FOLD
        </button>
        
        <button 
          type="button"
          onClick={() => onAction('call', call_amount)}
          className="
            py-3.5 rounded-xl font-bold text-white
            bg-gradient-to-b from-[var(--color-emerald-600)] to-[var(--color-emerald-700)]
            hover:from-[var(--color-emerald-500)] hover:to-[var(--color-emerald-600)]
            shadow-lg shadow-[var(--color-emerald-900)]/40
            transition-all active:scale-95
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-emerald-400)]
          "
          aria-label={canCheck ? 'Check 过牌' : `Call 跟注 $${call_amount}`}
        >
          {canCheck ? 'CHECK' : 'CALL'}
          {!canCheck && call_amount > 0 && (
            <span className="block text-xs opacity-80 font-mono">${call_amount}</span>
          )}
        </button>
        
        <button 
          type="button"
          onClick={handleRaise}
          disabled={!canRaise || minBet >= maxBet}
          className="
            py-3.5 rounded-xl font-bold text-[var(--color-bg-deep)]
            bg-gradient-to-b from-[var(--color-gold-400)] to-[var(--color-gold-600)]
            hover:from-[var(--color-gold-300)] hover:to-[var(--color-gold-500)]
            shadow-lg shadow-[var(--color-gold-900)]/40
            transition-all active:scale-95
            disabled:opacity-50 disabled:cursor-not-allowed
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold-400)]
          "
          aria-label={`Raise 加注到 $${validRaiseAmount}`}
        >
          RAISE
          <span className="block text-xs opacity-80 font-mono">${validRaiseAmount}</span>
        </button>
      </div>
    </motion.div>
  );
};

export default Controls;
