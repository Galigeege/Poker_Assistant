import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Brain, TrendingUp, Target, AlertCircle, Crosshair, Shield } from 'lucide-react';
import type { Player } from '../types';

interface OpponentProfileProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
  gameHistory?: unknown[];
}

interface OpponentAnalysis {
  playingStyle: 'Tight' | 'Loose' | 'Aggressive' | 'Passive' | 'Balanced';
  vpip: number;
  pfr: number;
  aggression: number;
  bluffFrequency: number;
  foldFrequency: number;
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

  const styleColors: Record<string, { bg: string; border: string; text: string }> = {
    Tight: { bg: 'bg-blue-900/20', border: 'border-blue-500/30', text: 'text-blue-300' },
    Loose: { bg: 'bg-orange-900/20', border: 'border-orange-500/30', text: 'text-orange-300' },
    Aggressive: { bg: 'bg-[var(--color-crimson-900)]/20', border: 'border-[var(--color-crimson-500)]/30', text: 'text-[var(--color-crimson-300)]' },
    Passive: { bg: 'bg-[var(--color-bg-elevated)]', border: 'border-[var(--color-border)]', text: 'text-[var(--color-text-secondary)]' },
    Balanced: { bg: 'bg-[var(--color-emerald-900)]/20', border: 'border-[var(--color-emerald-500)]/30', text: 'text-[var(--color-emerald-300)]' }
  };

  const avatarUrl = `https://api.dicebear.com/9.x/bottts/svg?seed=${player.name}`;

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div 
          className="premium-card max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          {/* Header */}
          <div className="flex-shrink-0 border-b border-[var(--color-border)] px-6 py-4 flex justify-between items-center bg-[var(--color-bg-deep)]">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[var(--color-bg-elevated)] border-2 border-[var(--color-border)] overflow-hidden">
                <img 
                  src={avatarUrl} 
                  alt={`${player.name} 的头像`} 
                  className="w-full h-full object-cover"
                  width={56}
                  height={56}
                />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-[var(--color-text-primary)]">
                  {player.name}
                </h2>
                <p className="text-sm text-[var(--color-text-muted)]">AI 对手分析</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
              aria-label="关闭对手分析"
            >
              <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative mb-4">
                  <div className="w-12 h-12 border-2 border-[var(--color-gold-500)]/30 rounded-full" />
                  <div className="absolute inset-0 w-12 h-12 border-2 border-[var(--color-gold-500)] border-t-transparent rounded-full animate-spin" />
                </div>
                <span className="text-[var(--color-text-muted)]">分析中…</span>
              </div>
            ) : analysis ? (
              <>
                {/* Playing Style */}
                <div className="bg-[var(--color-bg-elevated)] rounded-xl p-5 border border-[var(--color-border)]">
                  <div className="flex items-center gap-2 mb-4">
                    <Target className="w-5 h-5 text-[var(--color-gold-500)]" aria-hidden="true" />
                    <h3 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
                      游戏风格
                    </h3>
                  </div>
                  <div className={`inline-block px-4 py-2 rounded-xl border ${styleColors[analysis.playingStyle].bg} ${styleColors[analysis.playingStyle].border}`}>
                    <span className={`font-bold ${styleColors[analysis.playingStyle].text}`}>
                      {analysis.playingStyle}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-text-muted)] mt-3">
                    {getStyleDescription(analysis.playingStyle)}
                  </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <StatBox
                    label="VPIP"
                    value={`${analysis.vpip}%`}
                    description="主动入池率"
                    color="gold"
                  />
                  <StatBox
                    label="PFR"
                    value={`${analysis.pfr}%`}
                    description="翻牌前加注率"
                    color="gold"
                  />
                  <StatBox
                    label="攻击性"
                    value={`${analysis.aggression}%`}
                    description="下注/加注频率"
                    color="crimson"
                  />
                  <StatBox
                    label="弃牌率"
                    value={`${analysis.foldFrequency}%`}
                    description="面对加注弃牌频率"
                    color="default"
                  />
                </div>

                {/* Tendencies */}
                <div className="bg-[var(--color-bg-elevated)] rounded-xl p-5 border border-[var(--color-border)]">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-[var(--color-emerald-400)]" aria-hidden="true" />
                    <h3 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
                      行为倾向
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {analysis.tendencies.map((tendency, idx) => (
                      <li key={idx} className="text-sm text-[var(--color-text-secondary)] flex items-start gap-2">
                        <span className="text-[var(--color-emerald-400)] mt-0.5">•</span>
                        <span>{tendency}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Weaknesses */}
                <div className="bg-[var(--color-bg-elevated)] rounded-xl p-5 border border-[var(--color-border)]">
                  <div className="flex items-center gap-2 mb-4">
                    <Crosshair className="w-5 h-5 text-[var(--color-gold-500)]" aria-hidden="true" />
                    <h3 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
                      可利用弱点
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {analysis.weaknesses.map((weakness, idx) => (
                      <li key={idx} className="text-sm text-[var(--color-text-secondary)] flex items-start gap-2">
                        <span className="text-[var(--color-gold-400)] mt-0.5">•</span>
                        <span>{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Recommendations */}
                <div className="bg-[var(--color-gold-900)]/10 rounded-xl p-5 border border-[var(--color-gold-600)]/20">
                  <div className="flex items-center gap-2 mb-4">
                    <Brain className="w-5 h-5 text-[var(--color-gold-500)]" aria-hidden="true" />
                    <h3 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
                      应对策略
                    </h3>
                  </div>
                  <ul className="space-y-2">
                    {analysis.recommendations.map((rec, idx) => (
                      <li key={idx} className="text-sm text-[var(--color-gold-200)] flex items-start gap-2">
                        <Shield className="w-4 h-4 text-[var(--color-gold-400)] mt-0.5 shrink-0" aria-hidden="true" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            ) : (
              <div className="text-center py-16 text-[var(--color-text-dim)]">
                <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-30" aria-hidden="true" />
                <p>暂无足够数据进行分析</p>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

function StatBox({ label, value, description, color }: {
  label: string;
  value: string;
  description: string;
  color: 'gold' | 'crimson' | 'emerald' | 'default';
}) {
  const colorStyles: Record<string, string> = {
    gold: 'border-[var(--color-gold-600)]/30',
    crimson: 'border-[var(--color-crimson-600)]/30',
    emerald: 'border-[var(--color-emerald-600)]/30',
    default: 'border-[var(--color-border)]'
  };

  return (
    <div className={`bg-[var(--color-bg-base)] rounded-xl p-4 border ${colorStyles[color]}`}>
      <div className="text-xs text-[var(--color-text-dim)] mb-1 uppercase tracking-wider">{label}</div>
      <div className="text-2xl font-bold text-[var(--color-text-primary)] font-mono">{value}</div>
      <div className="text-xs text-[var(--color-text-muted)] mt-1">{description}</div>
    </div>
  );
}

// Helper functions
function calculatePlayingStyle(_history: unknown[]): OpponentAnalysis['playingStyle'] {
  if (!_history || _history.length === 0) return 'Balanced';
  return 'Balanced';
}

function calculateVPIP(_history: unknown[]): number {
  if (!_history || _history.length === 0) return 25;
  return Math.floor(Math.random() * 30) + 15;
}

function calculatePFR(_history: unknown[]): number {
  if (!_history || _history.length === 0) return 15;
  return Math.floor(Math.random() * 20) + 10;
}

function calculateAggression(_history: unknown[]): number {
  if (!_history || _history.length === 0) return 50;
  return Math.floor(Math.random() * 40) + 30;
}

function calculateBluffFrequency(_history: unknown[]): number {
  if (!_history || _history.length === 0) return 20;
  return Math.floor(Math.random() * 30) + 10;
}

function calculateFoldFrequency(_history: unknown[]): number {
  if (!_history || _history.length === 0) return 40;
  return Math.floor(Math.random() * 30) + 30;
}

function generateTendencies(_history: unknown[]): string[] {
  return [
    '在翻牌前倾向于跟注而非加注',
    '面对小额下注时很少弃牌',
    '在转牌圈喜欢过牌',
    '在河牌圈倾向于价值下注'
  ];
}

function generateWeaknesses(_history: unknown[]): string[] {
  return [
    '面对连续下注容易弃牌',
    '在多人底池中表现较弱',
    '容易被诈唬吓退'
  ];
}

function generateRecommendations(_history: unknown[]): string[] {
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
