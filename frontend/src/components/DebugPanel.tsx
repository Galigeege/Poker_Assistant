import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../store/useGameStore';
import { 
  Bug, 
  ChevronDown, 
  Trash2, 
  Filter,
  Eye,
  EyeOff
} from 'lucide-react';
import type { DebugLog } from '../types';

interface DebugPanelProps {
  players: { name: string; uuid: string }[];
}

function DebugPanel({ players }: DebugPanelProps) {
  const { 
    isAdmin, 
    debugMode, 
    debugLogs, 
    debugFilterBots,
    setDebugMode, 
    clearDebugLogs 
  } = useGameStore();
  
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedLog, setSelectedLog] = useState<DebugLog | null>(null);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  
  // Only show for admins
  if (!isAdmin) return null;
  
  const aiPlayers = players.filter(p => p.name.startsWith('AI_'));
  
  const handleFilterChange = (botName: string) => {
    if (!debugFilterBots) {
      // Currently showing all, switch to just this one
      setDebugMode(true, [botName]);
    } else if (debugFilterBots.includes(botName)) {
      // Remove from filter
      const newFilter = debugFilterBots.filter(b => b !== botName);
      setDebugMode(true, newFilter.length > 0 ? newFilter : null);
    } else {
      // Add to filter
      setDebugMode(true, [...debugFilterBots, botName]);
    }
  };
  
  const toggleDebugMode = () => {
    setDebugMode(!debugMode);
  };
  
  // Collapsed state - just a toggle button
  if (!isExpanded) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed bottom-4 right-4 z-50"
      >
        <button
          onClick={() => setIsExpanded(true)}
          className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-lg transition-all ${
            debugMode 
              ? 'bg-orange-500 text-white hover:bg-orange-600' 
              : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
          }`}
        >
          <Bug className="w-5 h-5" />
          <span className="text-sm font-medium">Debug</span>
          {debugMode && debugLogs.length > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {debugLogs.length}
            </span>
          )}
        </button>
      </motion.div>
    );
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="fixed bottom-4 right-4 z-50 w-[480px] max-h-[70vh] bg-gray-900/95 backdrop-blur-sm 
                 rounded-xl shadow-2xl border border-gray-700/50 flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <Bug className={`w-5 h-5 ${debugMode ? 'text-orange-400' : 'text-gray-400'}`} />
          <span className="font-semibold text-white">Debug Panel</span>
          
          {/* Toggle Button */}
          <button
            onClick={toggleDebugMode}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
              debugMode 
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30' 
                : 'bg-gray-700 text-gray-400 border border-gray-600'
            }`}
          >
            {debugMode ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {debugMode ? 'ON' : 'OFF'}
          </button>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Filter Button */}
          <div className="relative">
            <button
              onClick={() => setShowFilterMenu(!showFilterMenu)}
              className={`p-2 rounded-lg transition-colors ${
                debugFilterBots && debugFilterBots.length > 0
                  ? 'bg-blue-500/20 text-blue-400'
                  : 'hover:bg-gray-700 text-gray-400'
              }`}
              title="Filter bots"
            >
              <Filter className="w-4 h-4" />
            </button>
            
            {/* Filter Menu */}
            <AnimatePresence>
              {showFilterMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-1 w-40 bg-gray-800 rounded-lg shadow-xl 
                             border border-gray-700 py-1 z-10"
                >
                  <div className="px-3 py-2 text-xs text-gray-400 border-b border-gray-700">
                    Filter AI Players
                  </div>
                  {aiPlayers.map((player) => (
                    <button
                      key={player.uuid}
                      onClick={() => handleFilterChange(player.name)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-700 transition-colors"
                    >
                      <div className={`w-3 h-3 rounded border ${
                        !debugFilterBots || debugFilterBots.includes(player.name)
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-gray-500'
                      }`} />
                      <span className="text-sm text-gray-200">{player.name}</span>
                    </button>
                  ))}
                  <div className="border-t border-gray-700 mt-1 pt-1">
                    <button
                      onClick={() => setDebugMode(true, null)}
                      className="w-full text-left px-3 py-2 text-xs text-gray-400 hover:bg-gray-700"
                    >
                      Show All
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          
          {/* Clear Logs */}
          <button
            onClick={clearDebugLogs}
            className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 transition-colors"
            title="Clear logs"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          
          {/* Minimize */}
          <button
            onClick={() => setIsExpanded(false)}
            className="p-2 rounded-lg hover:bg-gray-700 text-gray-400 transition-colors"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Logs List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 min-h-[200px] max-h-[400px]">
        {!debugMode ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 py-8">
            <EyeOff className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">Debug mode is disabled</p>
            <p className="text-xs">Click the toggle to enable</p>
          </div>
        ) : debugLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 py-8">
            <Bug className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm">No logs yet</p>
            <p className="text-xs">AI actions will appear here</p>
          </div>
        ) : (
          debugLogs.slice().reverse().map((log, idx) => (
            <motion.div
              key={`${log.bot_id}-${log.timestamp}-${idx}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                selectedLog === log
                  ? 'bg-gray-800 border-blue-500/50'
                  : 'bg-gray-800/50 border-gray-700/50 hover:border-gray-600'
              }`}
              onClick={() => setSelectedLog(selectedLog === log ? null : log)}
            >
              {/* Log Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    log.style === 'TAG' 
                      ? 'bg-blue-500/20 text-blue-300' 
                      : 'bg-purple-500/20 text-purple-300'
                  }`}>
                    {log.style}
                  </span>
                  <span className="text-sm font-medium text-white">{log.bot_name}</span>
                  <span className="text-xs text-gray-500">{log.position}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>{log.street}</span>
                  <span>RNG: {log.rng_value}</span>
                </div>
              </div>
              
              {/* Quick Info */}
              <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                <span>Hole: {log.hole_cards.join(' ')}</span>
                {log.community_cards.length > 0 && (
                  <span>Board: {log.community_cards.join(' ')}</span>
                )}
                <span>Pot: ${log.pot_size}</span>
                {log.to_call > 0 && <span>To Call: ${log.to_call}</span>}
              </div>
              
              {/* Response Preview */}
              <div className="text-sm text-gray-300 line-clamp-2">
                {log.response.substring(0, 150)}...
              </div>
              
              {/* Expanded Details */}
              <AnimatePresence>
                {selectedLog === log && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 pt-3 border-t border-gray-700 space-y-3"
                  >
                    {/* Analysis */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">Analysis</div>
                      <div className="flex gap-3 text-xs">
                        <span className="text-green-400">Equity: {log.analysis.equity || 'N/A'}</span>
                        <span className="text-blue-400">SPR: {log.analysis.spr || 'N/A'}</span>
                        <span className="text-yellow-400">Texture: {log.analysis.board_texture || 'N/A'}</span>
                      </div>
                    </div>
                    
                    {/* Full Response */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1">LLM Response</div>
                      <pre className="text-xs text-gray-300 bg-gray-950 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                        {log.response}
                      </pre>
                    </div>
                    
                    {/* Prompt */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1 flex items-center justify-between">
                        <span>Prompt (truncated)</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(log.prompt);
                          }}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          Copy
                        </button>
                      </div>
                      <pre className="text-xs text-gray-400 bg-gray-950 p-2 rounded max-h-[200px] overflow-y-auto whitespace-pre-wrap">
                        {log.prompt}
                      </pre>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>
      
      {/* Footer Stats */}
      {debugMode && debugLogs.length > 0 && (
        <div className="p-2 border-t border-gray-700/50 text-xs text-gray-500 flex justify-between">
          <span>{debugLogs.length} logs</span>
          <span>
            {debugFilterBots 
              ? `Filtered: ${debugFilterBots.join(', ')}` 
              : 'Showing all bots'}
          </span>
        </div>
      )}
    </motion.div>
  );
}

export default DebugPanel;
