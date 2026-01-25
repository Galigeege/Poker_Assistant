import React, { useEffect, useRef } from 'react';
import { Brain, Sparkles, Target, ScrollText } from 'lucide-react';
import { useGameStore } from '../store/useGameStore';

const AICopilot: React.FC = () => {
  const { actionRequest, isConnecting, aiCopilotEnabled, setAiCopilotEnabled, logs } = useGameStore();
  const advice = actionRequest?.ai_advice;
  const logsEndRef = useRef<HTMLDivElement>(null);

  // 自动滚动到最新日志
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div className="fixed top-0 right-0 w-72 h-screen bg-gray-900 border-l border-gray-800 flex flex-col z-30">
      
      {/* Header */}
      <div className="p-4 border-b border-gray-800 flex items-center justify-between bg-gray-950">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <h2 className="font-bold text-sm text-indigo-400">AI Copilot</h2>
        </div>
        {/* Toggle Switch */}
        <button
          onClick={() => setAiCopilotEnabled(!aiCopilotEnabled)}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
            aiCopilotEnabled ? 'bg-indigo-600' : 'bg-gray-600'
          }`}
          aria-label={aiCopilotEnabled ? '关闭 AI Copilot' : '开启 AI Copilot'}
        >
          <span
            className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
              aiCopilotEnabled ? 'translate-x-4.5' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {/* Content - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        
        {/* Strategic Analysis */}
        <div className="bg-gray-800/50 rounded-xl p-3 border border-gray-700">
          <h3 className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-2">Strategic Analysis</h3>
          
          {!aiCopilotEnabled ? (
            <div className="text-center py-6 text-gray-500 text-xs flex flex-col items-center gap-2">
              <Brain className="w-6 h-6 opacity-20" />
              <span>AI Copilot 已关闭</span>
              <span className="text-[10px] text-gray-600">开启开关以启用 AI 建议</span>
            </div>
          ) : isConnecting ? (
             <div className="flex flex-col items-center py-4 gap-2">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-xs text-indigo-300 animate-pulse">AI 正在分析中...</span>
             </div>
          ) : advice ? (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xl font-bold text-white capitalize">
                  {advice.recommended_action || advice.primary_strategy?.action || 'Thinking...'}
                </span>
                <div className="flex items-center gap-1 bg-indigo-900/40 px-1.5 py-0.5 rounded text-indigo-300 text-[10px] font-mono border border-indigo-500/30">
                   <Target className="w-2.5 h-2.5" />
                   {advice.win_probability || '??'}
                </div>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">
                {advice.reasoning || advice.primary_strategy?.reason}
              </p>
              
              {/* Primary Strategy Frequency */}
              {advice.primary_strategy?.frequency && (
                <div className="pt-2 border-t border-gray-700/50">
                  <div className="text-[10px] text-gray-500 font-semibold mb-0.5">
                    主选 ({advice.primary_strategy.frequency})
                  </div>
                  <div className="text-xs text-indigo-300 font-medium uppercase">
                    {advice.primary_strategy.action}
                  </div>
                </div>
              )}
              
              {/* Alternative Strategy */}
              {advice.alternative_strategy && (
                <div className="pt-2 border-t border-gray-700/50">
                  <div className="text-[10px] text-gray-500 font-semibold mb-0.5">
                    备选 ({advice.alternative_strategy.frequency || '??'})
                  </div>
                  <div className="text-xs text-indigo-300 font-medium uppercase">
                    {advice.alternative_strategy.action}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500 text-xs flex flex-col items-center gap-2">
              <Brain className="w-6 h-6 opacity-20" />
              <span>等待行动...</span>
            </div>
          )}
        </div>

        {/* Game Logs */}
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-2">
            <ScrollText className="w-3.5 h-3.5 text-gray-500" />
            <h3 className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">游戏日志</h3>
                  </div>
          <div className="overflow-y-auto bg-gray-800/30 rounded-lg border border-gray-800 p-2 space-y-1" style={{ maxHeight: '350px' }}>
            {logs.length === 0 ? (
              <div className="text-center py-4 text-gray-500 text-xs">
                暂无日志
                    </div>
            ) : (
              <>
                {logs.slice(-50).map((log, index) => (
                  <div 
                    key={`${logs.length - 50 + index}-${log}`}
                    className="text-[10px] text-gray-300 leading-relaxed px-1.5 py-0.5 rounded hover:bg-gray-700/30 transition-colors break-words"
                  >
                    {log}
               </div>
             ))}
                <div ref={logsEndRef} />
              </>
            )}
           </div>
        </div>

      </div>
      
      {/* Footer */}
      <div className="p-2 border-t border-gray-800 bg-gray-950 text-center">
        <span className="text-[9px] text-gray-600">Powered by Deepseek V3</span>
      </div>
    </div>
  );
};

export default AICopilot;
