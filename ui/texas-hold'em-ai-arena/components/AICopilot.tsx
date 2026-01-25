import React, { useEffect, useState } from 'react';
import { Brain, Sparkles, ChevronRight, Target, Zap } from 'lucide-react';
import { getGeminiAdvice } from '../services/geminiService';
import { Player, Card } from '../types';

interface CopilotProps {
  isOpen: boolean;
  toggleOpen: () => void;
  heroCards: Card[];
  communityCards: Card[];
  pot: number;
  players: Player[];
  isHeroTurn: boolean;
}

const AICopilot: React.FC<CopilotProps> = ({ isOpen, toggleOpen, heroCards, communityCards, pot, players, isHeroTurn }) => {
  const [advice, setAdvice] = useState<{ suggestion: string; reasoning: string; confidence: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isHeroTurn && heroCards.length > 0) {
      setLoading(true);
      // Mock history for now
      getGeminiAdvice(heroCards, communityCards, pot, players, ['Preflop Bet', 'Flop Check'])
        .then(data => {
          setAdvice(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isHeroTurn, heroCards, communityCards, pot, players]);

  return (
    <div 
      className={`fixed top-0 right-0 h-full bg-gray-900 border-l border-gray-800 z-40 transition-all duration-300 flex flex-col shadow-2xl ${
        isOpen ? 'w-80 translate-x-0' : 'w-80 translate-x-full'
      }`}
    >
      {/* Toggle Handle (Visible when closed) */}
      {!isOpen && (
        <button 
          onClick={toggleOpen}
          className="absolute left-[-40px] top-24 bg-indigo-600 p-2 rounded-l-lg shadow-lg text-white hover:bg-indigo-500 transition-colors"
        >
          <Brain className="w-6 h-6" />
        </button>
      )}

      {/* Header */}
      <div className="p-5 border-b border-gray-800 flex items-center justify-between bg-gray-950">
        <div className="flex items-center gap-2 text-indigo-400">
          <Sparkles className="w-5 h-5" />
          <h2 className="font-bold text-lg">AI Copilot</h2>
        </div>
        <button onClick={toggleOpen} className="text-gray-500 hover:text-white">
          <ChevronRight />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        
        {/* Live Status */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">Current Strategy</h3>
          
          {loading ? (
             <div className="flex flex-col items-center py-4 gap-3">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-indigo-300 animate-pulse">Analyzing GTO Lines...</span>
             </div>
          ) : advice && isHeroTurn ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">{advice.suggestion}</span>
                <div className="flex items-center gap-1 bg-indigo-900/40 px-2 py-1 rounded text-indigo-300 text-xs font-mono border border-indigo-500/30">
                   <Target className="w-3 h-3" />
                   {advice.confidence}% Conf
                </div>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">
                {advice.reasoning}
              </p>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              Waiting for your turn to provide analysis.
            </div>
          )}
        </div>

        {/* Opponent Profiler (Mock) */}
        <div>
           <h3 className="text-xs uppercase tracking-wider text-gray-500 font-semibold mb-3">Opponent Insights</h3>
           <div className="space-y-2">
             {players.filter(p => p.type !== 'HUMAN').map(p => (
               <div key={p.id} className="flex items-center gap-3 bg-gray-800/30 p-2 rounded-lg border border-gray-800">
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold">
                    {p.name[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-300">{p.name}</div>
                    <div className="flex items-center gap-1 text-[10px]">
                       <Zap className="w-3 h-3 text-yellow-500" />
                       <span className="text-gray-500">{p.persona || 'Unknown Style'}</span>
                    </div>
                  </div>
               </div>
             ))}
           </div>
        </div>

      </div>
      
      <div className="p-4 border-t border-gray-800 bg-gray-950 text-center">
        <span className="text-[10px] text-gray-600">Powered by Google Gemini 2.5 Flash</span>
      </div>
    </div>
  );
};

export default AICopilot;