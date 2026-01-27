import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, Target, ScrollText, TrendingUp, Zap } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';

interface AICopilotProps {
  isMobile?: boolean;
}

const AICopilot: React.FC<AICopilotProps> = ({ isMobile = false }) => {
  const { actionRequest, isConnecting, aiCopilotEnabled, setAiCopilotEnabled, logs } = useGameStore();
  const advice = actionRequest?.ai_advice;
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // ==================== 移动端布局 ====================
  if (isMobile) {
    return (
      <div className="flex flex-col">
        {/* Header */}
        <div className="px-4 pt-2 pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[var(--color-gold-600)]/20">
                <Sparkles className="w-4 h-4 text-[var(--color-gold-500)]" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-sm text-[var(--color-text-primary)]">
                  AI Copilot
                </h2>
                <p className="text-[9px] text-[var(--color-text-dim)] uppercase tracking-wider">
                  Strategic Advisor
                </p>
              </div>
            </div>
            
            <button
              onClick={() => setAiCopilotEnabled(!aiCopilotEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                aiCopilotEnabled ? 'bg-[var(--color-gold-600)]' : 'bg-[var(--color-bg-hover)]'
              }`}
              role="switch"
              aria-checked={aiCopilotEnabled}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
                aiCopilotEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
          <div className="premium-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="w-4 h-4 text-[var(--color-gold-500)]" />
              <h3 className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
                Strategic Analysis
              </h3>
            </div>
            
            <AnimatePresence mode="wait">
              {!aiCopilotEnabled ? (
                <motion.div key="disabled" className="text-center py-6 text-[var(--color-text-dim)]"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="p-3 rounded-full bg-[var(--color-bg-base)] inline-block mb-2">
                    <Brain className="w-6 h-6 opacity-30" />
                  </div>
                  <p className="text-sm mb-1">AI Copilot 已关闭</p>
                  <p className="text-[10px]">开启开关以启用 AI 建议</p>
                </motion.div>
              ) : isConnecting ? (
                <motion.div key="loading" className="flex flex-col items-center py-6 gap-2"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="relative">
                    <div className="w-8 h-8 border-2 border-[var(--color-gold-500)]/30 rounded-full" />
                    <div className="absolute inset-0 w-8 h-8 border-2 border-[var(--color-gold-500)] border-t-transparent rounded-full animate-spin" />
                  </div>
                  <span className="text-xs text-[var(--color-gold-400)] animate-pulse">AI 正在分析中…</span>
                </motion.div>
              ) : advice ? (
                <motion.div key="advice" className="space-y-3"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${
                        (advice.recommended_action || advice.primary_strategy?.action)?.toLowerCase() === 'fold' 
                          ? 'bg-[var(--color-crimson-900)]/30 text-[var(--color-crimson-400)]'
                          : (advice.recommended_action || advice.primary_strategy?.action)?.toLowerCase() === 'raise'
                          ? 'bg-[var(--color-gold-900)]/30 text-[var(--color-gold-400)]'
                          : 'bg-[var(--color-emerald-900)]/30 text-[var(--color-emerald-400)]'
                      }`}>
                        <Zap className="w-4 h-4" />
                      </div>
                      <span className="text-lg font-bold text-[var(--color-text-primary)] capitalize font-display">
                        {advice.recommended_action || advice.primary_strategy?.action || '思考中…'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border)]">
                      <Target className="w-3 h-3 text-[var(--color-gold-500)]" />
                      <span className="text-xs font-mono text-[var(--color-gold-400)]">
                        {advice.win_probability || '—'}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap border-l-2 border-[var(--color-border)] pl-3">
                    {advice.reasoning || advice.primary_strategy?.reason}
                  </p>
                </motion.div>
              ) : (
                <motion.div key="waiting" className="text-center py-6 text-[var(--color-text-dim)]"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="p-3 rounded-full bg-[var(--color-bg-base)] inline-block mb-2">
                    <TrendingUp className="w-6 h-6 opacity-30" />
                  </div>
                  <p className="text-sm">等待行动…</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Game Logs - Collapsed */}
          <details className="group">
            <summary className="flex items-center gap-2 cursor-pointer list-none">
              <ScrollText className="w-4 h-4 text-[var(--color-text-dim)]" />
              <h3 className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
                游戏日志
              </h3>
              <span className="text-[10px] text-[var(--color-text-dim)] ml-auto">{logs.length} 条</span>
            </summary>
            <div className="mt-3 bg-[var(--color-bg-deep)] rounded-xl border border-[var(--color-border)] p-3 space-y-1 max-h-40 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-center py-4 text-[var(--color-text-dim)] text-xs">暂无日志</div>
              ) : (
                <>
                  {logs.slice(-30).map((log, index) => (
                    <div key={`${logs.length - 30 + index}-${log}`}
                      className="text-[10px] text-[var(--color-text-secondary)] leading-relaxed px-2 py-1 rounded hover:bg-[var(--color-bg-hover)] break-words">
                      {log}
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </>
              )}
            </div>
          </details>
        </div>
        
        <div className="p-3 border-t border-[var(--color-border)] text-center">
          <span className="text-[9px] text-[var(--color-text-dim)] flex items-center justify-center gap-1.5">
            <Sparkles className="w-3 h-3 text-[var(--color-gold-600)]" />
            Powered by DeepSeek V3
          </span>
        </div>
      </div>
    );
  }

  // ==================== 桌面端布局 ====================
  return (
    <div className="h-screen bg-[var(--color-bg-base)] border-l border-[var(--color-border)] flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-[var(--color-border)] bg-[var(--color-bg-deep)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[var(--color-gold-600)]/20">
              <Sparkles className="w-4 h-4 text-[var(--color-gold-500)]" />
            </div>
            <div>
              <h2 className="font-display font-semibold text-sm text-[var(--color-text-primary)]">AI Copilot</h2>
              <p className="text-[9px] text-[var(--color-text-dim)] uppercase tracking-wider">Strategic Advisor</p>
            </div>
          </div>
          
          <button
            onClick={() => setAiCopilotEnabled(!aiCopilotEnabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-gold-500)] ${
              aiCopilotEnabled ? 'bg-[var(--color-gold-600)]' : 'bg-[var(--color-bg-hover)]'
            }`}
            role="switch"
            aria-checked={aiCopilotEnabled}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${
              aiCopilotEnabled ? 'translate-x-6' : 'translate-x-1'
            }`} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="premium-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-4 h-4 text-[var(--color-gold-500)]" />
            <h3 className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">
              Strategic Analysis
            </h3>
          </div>
          
          <AnimatePresence mode="wait">
            {!aiCopilotEnabled ? (
              <motion.div key="disabled" className="text-center py-8 text-[var(--color-text-dim)]"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="p-4 rounded-full bg-[var(--color-bg-base)] inline-block mb-3">
                  <Brain className="w-8 h-8 opacity-30" />
                </div>
                <p className="text-sm mb-1">AI Copilot 已关闭</p>
                <p className="text-[10px]">开启开关以启用 AI 建议</p>
              </motion.div>
            ) : isConnecting ? (
              <motion.div key="loading" className="flex flex-col items-center py-8 gap-3"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="relative">
                  <div className="w-10 h-10 border-2 border-[var(--color-gold-500)]/30 rounded-full" />
                  <div className="absolute inset-0 w-10 h-10 border-2 border-[var(--color-gold-500)] border-t-transparent rounded-full animate-spin" />
                </div>
                <span className="text-xs text-[var(--color-gold-400)] animate-pulse">AI 正在分析中…</span>
              </motion.div>
            ) : advice ? (
              <motion.div key="advice" className="space-y-4"
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${
                      (advice.recommended_action || advice.primary_strategy?.action)?.toLowerCase() === 'fold' 
                        ? 'bg-[var(--color-crimson-900)]/30 text-[var(--color-crimson-400)]'
                        : (advice.recommended_action || advice.primary_strategy?.action)?.toLowerCase() === 'raise'
                        ? 'bg-[var(--color-gold-900)]/30 text-[var(--color-gold-400)]'
                        : 'bg-[var(--color-emerald-900)]/30 text-[var(--color-emerald-400)]'
                    }`}>
                      <Zap className="w-5 h-5" />
                    </div>
                    <span className="text-xl font-bold text-[var(--color-text-primary)] capitalize font-display">
                      {advice.recommended_action || advice.primary_strategy?.action || '思考中…'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-bg-base)] border border-[var(--color-border)]">
                    <Target className="w-3 h-3 text-[var(--color-gold-500)]" />
                    <span className="text-xs font-mono text-[var(--color-gold-400)]">{advice.win_probability || '—'}</span>
                  </div>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed whitespace-pre-wrap border-l-2 border-[var(--color-border)] pl-3">
                  {advice.reasoning || advice.primary_strategy?.reason}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {advice.primary_strategy?.frequency && (
                    <div className="bg-[var(--color-bg-base)] rounded-xl p-3 border border-[var(--color-border)]">
                      <div className="text-[9px] text-[var(--color-text-dim)] uppercase tracking-wider mb-1">主选</div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[var(--color-emerald-400)] uppercase">{advice.primary_strategy.action}</span>
                        <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{advice.primary_strategy.frequency}</span>
                      </div>
                    </div>
                  )}
                  {advice.alternative_strategy && (
                    <div className="bg-[var(--color-bg-base)] rounded-xl p-3 border border-[var(--color-border)]">
                      <div className="text-[9px] text-[var(--color-text-dim)] uppercase tracking-wider mb-1">备选</div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-[var(--color-text-secondary)] uppercase">{advice.alternative_strategy.action}</span>
                        <span className="text-[10px] font-mono text-[var(--color-text-muted)]">{advice.alternative_strategy.frequency || '—'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div key="waiting" className="text-center py-8 text-[var(--color-text-dim)]"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="p-4 rounded-full bg-[var(--color-bg-base)] inline-block mb-3">
                  <TrendingUp className="w-8 h-8 opacity-30" />
                </div>
                <p className="text-sm">等待行动…</p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Game Logs */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center gap-2 mb-3">
            <ScrollText className="w-4 h-4 text-[var(--color-text-dim)]" />
            <h3 className="text-xs uppercase tracking-wider text-[var(--color-text-muted)] font-semibold">游戏日志</h3>
          </div>
          <div className="flex-1 overflow-y-auto bg-[var(--color-bg-deep)] rounded-xl border border-[var(--color-border)] p-3 space-y-1" style={{ maxHeight: '280px' }}>
            {logs.length === 0 ? (
              <div className="text-center py-6 text-[var(--color-text-dim)] text-xs">暂无日志</div>
            ) : (
              <>
                {logs.slice(-50).map((log, index) => (
                  <motion.div key={`${logs.length - 50 + index}-${log}`}
                    className="text-[10px] text-[var(--color-text-secondary)] leading-relaxed px-2 py-1 rounded hover:bg-[var(--color-bg-hover)] transition-colors break-words"
                    initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                    {log}
                  </motion.div>
                ))}
                <div ref={logsEndRef} />
              </>
            )}
          </div>
        </div>
      </div>
      
      <div className="p-3 border-t border-[var(--color-border)] bg-[var(--color-bg-deep)] text-center">
        <span className="text-[9px] text-[var(--color-text-dim)] flex items-center justify-center gap-1.5">
          <Sparkles className="w-3 h-3 text-[var(--color-gold-600)]" />
          Powered by DeepSeek V3
        </span>
      </div>
    </div>
  );
};

export default AICopilot;
