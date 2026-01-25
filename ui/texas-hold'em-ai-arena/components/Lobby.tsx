import React, { useState } from 'react';
import { GameConfig } from '../types';
import { Settings, Play, Info } from 'lucide-react';

interface LobbyProps {
  onStart: (config: GameConfig) => void;
}

const Lobby: React.FC<LobbyProps> = ({ onStart }) => {
  const [config, setConfig] = useState<GameConfig>({
    bigBlind: 2,
    startStack: 200,
    difficulty: 'Regular',
    aiPersona: true,
    showOdds: true,
    aiAdvice: true,
  });

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-800 via-gray-900 to-black p-4">
      <div className="max-w-4xl w-full grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Hero Section */}
        <div className="flex flex-col justify-center space-y-6 text-center lg:text-left">
          <div className="inline-flex items-center justify-center lg:justify-start gap-2 text-emerald-400 font-mono text-sm bg-emerald-950/30 py-1 px-3 rounded-full border border-emerald-900/50 self-center lg:self-start">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            v2.0 Live Preview
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight text-white">
            Texas Hold'em <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500">
              AI Arena
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-md mx-auto lg:mx-0">
            Challenge state-of-the-art AI bots trained on GTO principles. 
            Get real-time strategic advice and analyze your gameplay instantly.
          </p>
        </div>

        {/* Config Card */}
        <div className="bg-gray-900/80 backdrop-blur-xl border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center gap-3 mb-6 text-gray-200 border-b border-gray-800 pb-4">
            <Settings className="w-6 h-6" />
            <h2 className="text-xl font-semibold">Game Configuration</h2>
          </div>

          <div className="space-y-6">
            
            {/* Difficulty */}
            <div className="space-y-2">
              <label className="text-sm text-gray-400">AI Difficulty</label>
              <div className="grid grid-cols-4 gap-2">
                {['Fish', 'Regular', 'Pro', 'GTO'].map((level) => (
                  <button
                    key={level}
                    onClick={() => setConfig({ ...config, difficulty: level as any })}
                    className={`py-2 rounded-lg text-sm font-medium transition-all ${
                      config.difficulty === level 
                      ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-2 ring-offset-gray-900' 
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            {/* Blinds & Stack */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Stakes (SB/BB)</label>
                <select 
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={config.bigBlind}
                  onChange={(e) => setConfig({...config, bigBlind: parseInt(e.target.value)})}
                >
                  <option value={2}>$1 / $2</option>
                  <option value={5}>$2 / $5</option>
                  <option value={10}>$5 / $10</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-gray-400">Start Stack (BB)</label>
                <select 
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  value={config.startStack}
                  onChange={(e) => setConfig({...config, startStack: parseInt(e.target.value)})}
                >
                  <option value={100}>100 BB</option>
                  <option value={200}>200 BB</option>
                  <option value={500}>Deep (500 BB)</option>
                </select>
              </div>
            </div>

            {/* Toggles */}
            <div className="space-y-3 pt-2">
               <label className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-5 rounded-full relative transition-colors ${config.aiAdvice ? 'bg-emerald-500' : 'bg-gray-600'}`}>
                      <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${config.aiAdvice ? 'left-6' : 'left-1'}`}></div>
                    </div>
                    <span className="text-sm text-gray-300">Enable AI Copilot Suggestions</span>
                  </div>
                  <Info className="w-4 h-4 text-gray-500" />
               </label>
            </div>

            <button 
              onClick={() => onStart(config)}
              className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 mt-4"
            >
              <Play className="w-5 h-5 fill-current" />
              Enter Arena
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Lobby;