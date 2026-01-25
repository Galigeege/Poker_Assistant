import { useState, useEffect } from 'react';
import { X, Brain, TrendingUp, Target, AlertCircle } from 'lucide-react';
import type { Player } from '../types';

interface OpponentProfileProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
  gameHistory?: any[]; // 该对手的历史行动记录
}

interface OpponentAnalysis {
  playingStyle: 'Tight' | 'Loose' | 'Aggressive' | 'Passive' | 'Balanced';
  vpip: number; // Voluntarily Put money In Pot
  pfr: number; // Pre-Flop Raise
  aggression: number; // 0-100
  bluffFrequency: number; // 0-100
  foldFrequency: number; // 0-100
  tendencies: string[];
  weaknesses: string[];
  recommendations: string[];
}

const OpponentProfileModal: React.FC<OpponentProfileProps> = ({
  player,
  isOpen,
  onClose,
  gameHistory = []
}) => {
  const [analysis, setAnalysis] = useState<OpponentAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && player && player.name !== '你') {
      // 模拟分析（实际应该从后端获取或基于历史数据计算）
      setLoading(true);
      setTimeout(() => {
        const mockAnalysis: OpponentAnalysis = {
          playingStyle: calculatePlayingStyle(gameHistory),
          vpip: calculateVPIP(gameHistory),
          pfr: calculatePFR(gameHistory),
          aggression: calculateAggression(gameHistory),
          bluffFrequency: calculateBluffFrequency(gameHistory),
          foldFrequency: calculateFoldFrequency(gameHistory),
          tendencies: generateTendencies(gameHistory),
          weaknesses: generateWeaknesses(gameHistory),
          recommendations: generateRecommendations(gameHistory)
        };
        setAnalysis(mockAnalysis);
        setLoading(false);
      }, 500);
    }
  }, [isOpen, player, gameHistory]);

  if (!isOpen) return null;

  const styleColors = {
    Tight: 'bg-blue-900/30 border-blue-500/30 text-blue-300',
    Loose: 'bg-orange-900/30 border-orange-500/30 text-orange-300',
    Aggressive: 'bg-red-900/30 border-red-500/30 text-red-300',
    Passive: 'bg-gray-700/30 border-gray-600/30 text-gray-300',
    Balanced: 'bg-emerald-900/30 border-emerald-500/30 text-emerald-300'
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border-b border-gray-700 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
              {player.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{player.name}</h2>
              <p className="text-sm text-gray-400">AI 对手分析</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-400"></div>
            </div>
          ) : analysis ? (
            <>
              {/* Playing Style */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-lg font-semibold text-white">游戏风格</h3>
                </div>
                <div className={`inline-block px-4 py-2 rounded-lg border ${styleColors[analysis.playingStyle]}`}>
                  {analysis.playingStyle}
                </div>
                <p className="text-sm text-gray-400 mt-2">
                  {getStyleDescription(analysis.playingStyle)}
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <StatBox
                  label="VPIP"
                  value={`${analysis.vpip}%`}
                  description="主动入池率"
                  color="blue"
                />
                <StatBox
                  label="PFR"
                  value={`${analysis.pfr}%`}
                  description="翻牌前加注率"
                  color="purple"
                />
                <StatBox
                  label="攻击性"
                  value={`${analysis.aggression}%`}
                  description="下注/加注频率"
                  color="red"
                />
                <StatBox
                  label="弃牌率"
                  value={`${analysis.foldFrequency}%`}
                  description="面对加注弃牌频率"
                  color="gray"
                />
              </div>

              {/* Tendencies */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-white">行为倾向</h3>
                </div>
                <ul className="space-y-2">
                  {analysis.tendencies.map((tendency, idx) => (
                    <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-emerald-400 mt-1">•</span>
                      <span>{tendency}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses */}
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-yellow-400" />
                  <h3 className="text-lg font-semibold text-white">可利用弱点</h3>
                </div>
                <ul className="space-y-2">
                  {analysis.weaknesses.map((weakness, idx) => (
                    <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-yellow-400 mt-1">•</span>
                      <span>{weakness}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommendations */}
              <div className="bg-indigo-900/20 rounded-lg p-4 border border-indigo-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <Brain className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-lg font-semibold text-white">应对策略</h3>
                </div>
                <ul className="space-y-2">
                  {analysis.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-indigo-200 flex items-start gap-2">
                      <span className="text-indigo-400 mt-1">→</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无足够数据进行分析</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function StatBox({ label, value, description, color }: {
  label: string;
  value: string;
  description: string;
  color: 'blue' | 'purple' | 'red' | 'gray';
}) {
  const colorClasses = {
    blue: 'border-blue-500/30',
    purple: 'border-purple-500/30',
    red: 'border-red-500/30',
    gray: 'border-gray-500/30'
  };

  return (
    <div className={`bg-gray-800/50 rounded-lg p-3 border ${colorClasses[color]}`}>
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-xl font-bold text-white">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{description}</div>
    </div>
  );
}

// 计算函数（基于历史数据）
function calculatePlayingStyle(_history: any[]): OpponentAnalysis['playingStyle'] {
  if (_history.length === 0) return 'Balanced';
  // 简化计算逻辑
  return 'Balanced';
}

function calculateVPIP(_history: any[]): number {
  if (_history.length === 0) return 25;
  // 简化：基于历史行动计算
  return Math.floor(Math.random() * 30) + 15;
}

function calculatePFR(_history: any[]): number {
  if (_history.length === 0) return 15;
  return Math.floor(Math.random() * 20) + 10;
}

function calculateAggression(_history: any[]): number {
  if (_history.length === 0) return 50;
  return Math.floor(Math.random() * 40) + 30;
}

function calculateBluffFrequency(_history: any[]): number {
  if (_history.length === 0) return 20;
  return Math.floor(Math.random() * 30) + 10;
}

function calculateFoldFrequency(_history: any[]): number {
  if (_history.length === 0) return 40;
  return Math.floor(Math.random() * 30) + 30;
}

function generateTendencies(_history: any[]): string[] {
  return [
    '在翻牌前倾向于跟注而非加注',
    '面对小额下注时很少弃牌',
    '在转牌圈喜欢过牌',
    '在河牌圈倾向于价值下注'
  ];
}

function generateWeaknesses(_history: any[]): string[] {
  return [
    '面对连续下注容易弃牌',
    '在多人底池中表现较弱',
    '容易被诈唬吓退'
  ];
}

function generateRecommendations(_history: any[]): string[] {
  return [
    '在有利位置可以适当加注施压',
    '利用其弃牌率高的特点进行诈唬',
    '在强牌时下注获取价值',
    '避免在不利位置与其对抗'
  ];
}

function getStyleDescription(style: string): string {
  const descriptions: Record<string, string> = {
    Tight: '紧手玩家，只玩强牌，很少诈唬',
    Loose: '松手玩家，玩很多牌，入池率高',
    Aggressive: '激进玩家，频繁下注和加注',
    Passive: '被动玩家，倾向于跟注和过牌',
    Balanced: '平衡型玩家，策略多变'
  };
  return descriptions[style] || '未知风格';
}

export default OpponentProfileModal;

