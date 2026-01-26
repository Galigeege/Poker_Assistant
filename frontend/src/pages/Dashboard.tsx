import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, Trophy, TrendingUp, TrendingDown, Calendar, Play, 
  BarChart3, AlertTriangle, Spade, Heart
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, ReferenceLine 
} from 'recharts';
import { useGameStore } from '../store/useGameStore';
import { getStatistics, getSessions, getSessionDetail } from '../services/sessionService';
import Card from '../components/Card';
import { useNavigate } from 'react-router-dom';

interface DashboardProps {
  onBack: () => void;
}

interface SessionStats {
  totalHands: number;
  totalWins: number;
  totalLosses: number;
  winRate: number;
  totalProfit: number;
  vpip: number;
  sessions: Session[];
}

interface Session {
  id: string;
  date: string;
  hands: number;
  profit: number;
  winRate: number;
  bigBlind: number;
  result: 'win' | 'loss' | 'break-even';
  firstRoundHoleCards?: string[];
}

const Dashboard: React.FC<DashboardProps> = ({ onBack }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<SessionStats>({
    totalHands: 0,
    totalWins: 0,
    totalLosses: 0,
    winRate: 0,
    totalProfit: 0,
    vpip: 0,
    sessions: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const statistics = await getStatistics();
      const apiSessions = await getSessions(100, 0);
      
      const sessions: Session[] = await Promise.all(apiSessions.map(async (session) => {
        let firstRoundHoleCards: string[] | undefined = undefined;
        try {
          const sessionDetail = await getSessionDetail(session.id);
          if (sessionDetail.rounds && sessionDetail.rounds.length > 0) {
            firstRoundHoleCards = sessionDetail.rounds[0].hero_hole_cards || undefined;
          }
        } catch (e) {
          console.warn('Failed to get first round hole cards:', session.id, e);
        }
        
        return {
          id: session.id,
          date: session.started_at,
          hands: session.total_hands,
          profit: session.total_profit,
          winRate: session.win_rate,
          bigBlind: session.config?.big_blind || 10,
          result: session.total_profit > 0 ? 'win' as const 
            : session.total_profit < 0 ? 'loss' as const 
            : 'break-even' as const,
          firstRoundHoleCards
        };
      }));

      const totalWins = Math.round((statistics.win_rate / 100) * statistics.total_hands);
      const totalLosses = statistics.total_hands - totalWins;

      setStats({
        totalHands: statistics.total_hands,
        totalWins,
        totalLosses,
        winRate: statistics.win_rate,
        totalProfit: statistics.total_profit,
        vpip: statistics.vpip,
        sessions: sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '加载数据失败';
      console.error('Failed to load data:', err);
      setError(errorMessage);
      
      // Fallback to localStorage
      try {
        const savedSessions = localStorage.getItem('poker_sessions');
        if (savedSessions) {
          const sessions: Session[] = JSON.parse(savedSessions);
          let totalHands = 0;
          let totalWins = 0;
          let totalProfit = 0;
          let totalVpipHands = 0;
          
          sessions.forEach(session => {
            const sessionKey = `session_${session.id}`;
            const sessionData = localStorage.getItem(sessionKey);
            if (sessionData) {
              try {
                const parsed = JSON.parse(sessionData);
                const rounds = parsed.rounds || [];
                totalHands += rounds.length;
                totalWins += rounds.filter((r: { isWin?: boolean }) => r.isWin).length;
                totalProfit += rounds.reduce((sum: number, r: { profit?: number }) => sum + (r.profit || 0), 0);
                
                rounds.forEach((round: { roundState?: { seats?: { name: string; uuid: string }[] }; streetHistory?: { street: string; actions?: { player: string; action: string }[] }[] }) => {
                  const heroUuid = round.roundState?.seats?.find((s) => s.name === '你')?.uuid;
                  if (!heroUuid) return;
                  
                  const preflopStreet = round.streetHistory?.find((s) => s.street === 'preflop');
                  if (preflopStreet && preflopStreet.actions) {
                    const heroAction = preflopStreet.actions.find((a) => {
                      const playerName = round.roundState?.seats?.find((s) => s.uuid === heroUuid)?.name;
                      return a.player === playerName || a.player === '你';
                    });
                    
                    if (heroAction && (heroAction.action === 'call' || heroAction.action === 'raise')) {
                      totalVpipHands++;
                    }
                  }
                });
              } catch {
                // ignore
              }
            }
          });
          
          const winRate = totalHands > 0 ? (totalWins / totalHands) * 100 : 0;
          const vpip = totalHands > 0 ? (totalVpipHands / totalHands) * 100 : 0;
          const totalLosses = totalHands - totalWins;
          
          setStats({
            totalHands,
            totalWins,
            totalLosses,
            winRate,
            totalProfit,
            vpip,
            sessions: sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          });
        }
      } catch {
        // ignore
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 资金曲线数据
  const allSessions = [...stats.sessions].reverse();
  const cumulativeProfitData = allSessions.map((s, idx) => {
    const previousProfit = idx > 0 
      ? allSessions.slice(0, idx).reduce((sum, sess) => sum + sess.profit, 0)
      : 0;
    return {
      x: idx + 1,
      cumulativeProfit: previousProfit + s.profit,
      sessionProfit: s.profit
    };
  });

  // 计算 Y 轴范围（确保包含 0 点）
  const profitValues = cumulativeProfitData.map(d => d.cumulativeProfit);
  const dataMin = Math.min(...profitValues, 0);
  const dataMax = Math.max(...profitValues, 0);
  
  // 计算合适的范围（对称于 0 点，或包含 0）
  const absMax = Math.max(Math.abs(dataMin), Math.abs(dataMax), 10);
  const yAxisMax = Math.ceil(absMax * 1.2 / 10) * 10; // 向上取整到 10 的倍数
  const yAxisMin = -yAxisMax;

  return (
    <div className="min-h-screen bg-[var(--color-bg-deep)] text-[var(--color-text-primary)]">
      {/* Background */}
      <div className="fixed inset-0 bg-gradient-radial opacity-40 pointer-events-none" />
      
      {/* Header */}
      <motion.div 
        className="relative z-10 border-b border-[var(--color-border)] bg-[var(--color-bg-base)]/80 backdrop-blur-sm"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 rounded-xl hover:bg-[var(--color-bg-hover)] transition-colors"
                aria-label="返回首页"
              >
                <ArrowLeft className="w-5 h-5 text-[var(--color-text-secondary)]" />
              </button>
              <div>
                <h1 className="font-display text-2xl font-bold text-gold-gradient">复盘中心</h1>
                <p className="text-xs text-[var(--color-text-muted)]">分析历史对局与统计数据</p>
              </div>
            </div>
            <button
              onClick={() => {
                const { connect } = useGameStore.getState();
                localStorage.removeItem('current_session_id');
                connect();
                navigate('/game');
              }}
              className="btn-gold px-5 py-2.5 flex items-center gap-2"
            >
              <Play className="w-4 h-4" aria-hidden="true" />
              开始新游戏
            </button>
          </div>
        </div>
      </motion.div>

      <div className="relative z-10 max-w-7xl mx-auto p-6 space-y-6">
        {/* Loading State */}
        <AnimatePresence>
          {isLoading && (
            <motion.div 
              className="flex items-center justify-center py-16"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 border-2 border-[var(--color-gold-500)]/30 rounded-full" />
                  <div className="absolute inset-0 w-12 h-12 border-2 border-[var(--color-gold-500)] border-t-transparent rounded-full animate-spin" />
                </div>
                <span className="text-[var(--color-text-muted)]">加载数据中…</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error State */}
        {error && !isLoading && (
          <motion.div 
            className="premium-card p-4 border-[var(--color-crimson-600)]/30 flex items-start gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertTriangle className="w-5 h-5 text-[var(--color-crimson-400)] shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="text-[var(--color-crimson-400)] font-semibold text-sm mb-1">加载失败</div>
              <div className="text-[var(--color-text-muted)] text-xs">
                {error}。已切换到本地数据模式。
              </div>
            </div>
          </motion.div>
        )}

        {!isLoading && (
          <>
            {/* Stats Overview */}
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-5 gap-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <StatCard
                title="总手数"
                value={stats.totalHands}
                icon={<Trophy className="w-5 h-5" />}
                iconColor="text-[var(--color-gold-500)]"
              />
              <StatCard
                title="胜率"
                value={`${stats.winRate.toFixed(1)}%`}
                icon={<BarChart3 className="w-5 h-5" />}
                iconColor={stats.winRate >= 50 ? 'text-[var(--color-emerald-400)]' : 'text-[var(--color-crimson-400)]'}
                trend={stats.winRate >= 50 ? 'up' : 'down'}
              />
              <StatCard
                title="入池率"
                value={`${stats.vpip.toFixed(1)}%`}
                icon={<Spade className="w-5 h-5" />}
                iconColor="text-[var(--color-text-secondary)]"
              />
              <StatCard
                title="总盈利"
                value={`$${stats.totalProfit > 0 ? '+' : ''}${stats.totalProfit.toFixed(2)}`}
                icon={stats.totalProfit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                iconColor={stats.totalProfit >= 0 ? 'text-[var(--color-emerald-400)]' : 'text-[var(--color-crimson-400)]'}
                valueColor={stats.totalProfit >= 0 ? 'text-[var(--color-emerald-400)]' : 'text-[var(--color-crimson-400)]'}
              />
              <StatCard
                title="游戏场次"
                value={stats.sessions.length}
                icon={<Calendar className="w-5 h-5" />}
                iconColor="text-[var(--color-gold-500)]"
              />
            </motion.div>

            {/* Profit Curve Chart */}
            {cumulativeProfitData.length > 0 && (
              <motion.div 
                className="premium-card p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-[var(--color-gold-600)]/30 to-[var(--color-emerald-600)]/20 border border-[var(--color-gold-600)]/20">
                      <TrendingUp className="w-5 h-5 text-[var(--color-gold-400)]" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
                        资金曲线
                      </h2>
                      <p className="text-xs text-[var(--color-text-muted)]">累计盈利走势</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-[var(--color-emerald-500)]" />
                      <span className="text-[var(--color-text-muted)]">盈利</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-[var(--color-crimson-500)]" />
                      <span className="text-[var(--color-text-muted)]">亏损</span>
                    </div>
                  </div>
                </div>
                
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={cumulativeProfitData}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                          <stop offset="50%" stopColor="#10b981" stopOpacity={0.05} />
                        </linearGradient>
                        <linearGradient id="lossGradient" x1="0" y1="1" x2="0" y2="0">
                          <stop offset="0%" stopColor="#ef4444" stopOpacity={0.4} />
                          <stop offset="50%" stopColor="#ef4444" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid 
                        strokeDasharray="3 3" 
                        stroke="rgba(255,255,255,0.05)" 
                        vertical={false}
                      />
                      <XAxis 
                        dataKey="x" 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--color-text-dim)', fontSize: 11 }}
                        tickFormatter={(value) => `#${value}`}
                      />
                      <YAxis 
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'var(--color-text-dim)', fontSize: 11 }}
                        tickFormatter={(value: number) => value === 0 ? '$0' : `${value > 0 ? '+' : ''}$${Math.round(value)}`}
                        domain={[yAxisMin, yAxisMax]}
                        ticks={[yAxisMin, yAxisMin / 2, 0, yAxisMax / 2, yAxisMax]}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'var(--color-bg-elevated)',
                          border: '1px solid var(--color-border)',
                          borderRadius: '12px',
                          padding: '12px 16px',
                          boxShadow: '0 10px 40px rgba(0,0,0,0.5)'
                        }}
                        labelStyle={{ color: 'var(--color-text-muted)', marginBottom: 4, fontSize: 12 }}
                        formatter={(value) => {
                          const numValue = typeof value === 'number' ? value : 0;
                          return [
                            `${numValue >= 0 ? '+' : ''}$${numValue.toFixed(2)}`,
                            '累计盈利'
                          ];
                        }}
                        labelFormatter={(label) => `第 ${label} 场`}
                      />
                      <ReferenceLine 
                        y={0} 
                        stroke="rgba(255,255,255,0.2)" 
                        strokeDasharray="3 3"
                      />
                      <Area
                        type="monotone"
                        dataKey="cumulativeProfit"
                        stroke="#d4af37"
                        strokeWidth={2}
                        fill="url(#profitGradient)"
                        dot={(props: { cx?: number; cy?: number; payload?: { cumulativeProfit: number } }) => {
                          const { cx, cy, payload } = props;
                          if (!cx || !cy || !payload) return null;
                          return (
                            <circle
                              cx={cx}
                              cy={cy}
                              r={4}
                              fill={payload.cumulativeProfit >= 0 ? '#10b981' : '#ef4444'}
                              stroke="var(--color-bg-base)"
                              strokeWidth={2}
                            />
                          );
                        }}
                        activeDot={{
                          r: 6,
                          stroke: '#d4af37',
                          strokeWidth: 2,
                          fill: 'var(--color-bg-base)'
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Summary */}
                <div className="flex justify-between items-center mt-4 pt-4 border-t border-[var(--color-border)]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[var(--color-text-dim)]" />
                    <span className="text-xs text-[var(--color-text-dim)] font-mono">
                      起始: $0.00
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-[var(--color-text-muted)]">当前累计:</span>
                    <span className={`text-lg font-bold font-mono ${
                      (cumulativeProfitData[cumulativeProfitData.length - 1]?.cumulativeProfit || 0) >= 0 
                        ? 'text-[var(--color-emerald-400)]' 
                        : 'text-[var(--color-crimson-400)]'
                    }`}>
                      {(cumulativeProfitData[cumulativeProfitData.length - 1]?.cumulativeProfit || 0) >= 0 ? '+' : ''}
                      ${(cumulativeProfitData[cumulativeProfitData.length - 1]?.cumulativeProfit || 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Session List */}
            <motion.div 
              className="premium-card p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-[var(--color-bg-elevated)]">
                  <Heart className="w-5 h-5 text-[var(--color-crimson-400)]" aria-hidden="true" />
                </div>
                <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
                  历史对局
                </h2>
              </div>
              
              {stats.sessions.length === 0 ? (
                <div className="text-center py-16 text-[var(--color-text-dim)]">
                  <div className="p-4 rounded-full bg-[var(--color-bg-base)] inline-block mb-4">
                    <Trophy className="w-10 h-10 opacity-30" aria-hidden="true" />
                  </div>
                  <p className="text-sm mb-1">暂无历史对局记录</p>
                  <p className="text-xs">开始游戏后，对局记录将自动保存</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.sessions.map((session, index) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <SessionRow 
                        session={session} 
                        onViewDetail={(sessionId) => navigate(`/replay/${sessionId}`)}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
};

// Stat Card Component
function StatCard({ title, value, icon, iconColor, valueColor, trend }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconColor: string;
  valueColor?: string;
  trend?: 'up' | 'down';
}) {
  return (
    <div className="premium-card p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[var(--color-text-muted)]">{title}</span>
        <div className={iconColor} aria-hidden="true">
          {icon}
        </div>
      </div>
      <div className={`text-2xl font-bold font-mono ${valueColor || 'text-[var(--color-text-primary)]'}`}>
        {value}
        {trend && (
          <span className={`ml-2 text-sm ${trend === 'up' ? 'text-[var(--color-emerald-400)]' : 'text-[var(--color-crimson-400)]'}`}>
            {trend === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </div>
  );
}

// Session Row Component
function SessionRow({ session, onViewDetail }: { session: Session; onViewDetail: (sessionId: string) => void }) {
  const resultStyles = {
    win: 'border-[var(--color-emerald-600)]/20 hover:border-[var(--color-emerald-600)]/40',
    loss: 'border-[var(--color-crimson-600)]/20 hover:border-[var(--color-crimson-600)]/40',
    'break-even': 'border-[var(--color-border)] hover:border-[var(--color-border-hover)]'
  };

  return (
    <div className={`
      bg-[var(--color-bg-elevated)] rounded-xl p-4 border ${resultStyles[session.result]}
      flex items-center justify-between transition-all duration-200 hover:bg-[var(--color-bg-hover)]
    `}>
      <div className="flex items-center gap-4">
        <div>
          <div className="text-sm font-medium text-[var(--color-text-primary)]">
            {new Date(session.date).toLocaleString('zh-CN', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
          <div className="text-xs text-[var(--color-text-dim)] mt-1">
            {session.hands} 手牌 · ${session.bigBlind} BB
          </div>
          {session.firstRoundHoleCards && session.firstRoundHoleCards.length > 0 && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className="text-[10px] text-[var(--color-text-dim)]">首手:</span>
              {session.firstRoundHoleCards.map((card: string, i: number) => (
                <Card key={i} card={card} size="sm" />
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="text-right">
          <div className={`text-sm font-bold font-mono ${session.profit >= 0 ? 'text-[var(--color-emerald-400)]' : 'text-[var(--color-crimson-400)]'}`}>
            {session.profit >= 0 ? '+' : ''}${session.profit.toFixed(2)}
          </div>
          <div className="text-xs text-[var(--color-text-dim)]">
            胜率: {session.winRate.toFixed(1)}%
          </div>
        </div>
        <button 
          onClick={() => onViewDetail(session.id)}
          className="btn-ghost px-4 py-2 text-sm"
        >
          查看详情
        </button>
      </div>
    </div>
  );
}

export default Dashboard;
