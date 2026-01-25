import { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, Calendar, Play, BarChart3, AlertTriangle, Loader2 } from 'lucide-react';
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
  vpip: number; // 入池率 (Voluntarily Put money In Pot)
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
      // 从 API 获取统计数据
      const statistics = await getStatistics();
      
      // 从 API 获取会话列表
      const apiSessions = await getSessions(100, 0);
      
      // 转换 API 会话格式为前端格式，并获取第一局手牌
      const sessions: Session[] = await Promise.all(apiSessions.map(async (session) => {
        // 获取第一局的手牌（如果存在）
        let firstRoundHoleCards: string[] | undefined = undefined;
        try {
          const sessionDetail = await getSessionDetail(session.id);
          if (sessionDetail.rounds && sessionDetail.rounds.length > 0) {
            firstRoundHoleCards = sessionDetail.rounds[0].hero_hole_cards || undefined;
          }
        } catch (e) {
          console.warn('Failed to get first round hole cards for session:', session.id, e);
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

      // 计算总胜场和总负场（从统计数据中）
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
    } catch (err: any) {
      console.error('Failed to load data from API:', err);
      setError(err.message || '加载数据失败');
      
      // Fallback: 从 localStorage 加载数据
      try {
        const savedSessions = localStorage.getItem('poker_sessions');
        if (savedSessions) {
          const sessions: Session[] = JSON.parse(savedSessions);
          // Calculate stats from localStorage (same logic as before)
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
                totalWins += rounds.filter((r: any) => r.isWin).length;
                totalProfit += rounds.reduce((sum: number, r: any) => sum + (r.profit || 0), 0);
                
                rounds.forEach((round: any) => {
                  const heroUuid = round.roundState?.seats?.find((s: any) => s.name === '你')?.uuid;
                  if (!heroUuid) return;
                  
                  const preflopStreet = round.streetHistory?.find((s: any) => s.street === 'preflop');
                  if (preflopStreet && preflopStreet.actions) {
                    const heroAction = preflopStreet.actions.find((a: any) => {
                      const playerName = round.roundState?.seats?.find((s: any) => s.uuid === heroUuid)?.name;
                      return a.player === playerName || a.player === '你';
                    });
                    
                    if (heroAction && (heroAction.action === 'call' || heroAction.action === 'raise')) {
                      totalVpipHands++;
                    }
                  }
                });
              } catch (e) {
                console.error('Failed to parse session data:', e);
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
      } catch (fallbackErr) {
        console.error('Failed to load from localStorage:', fallbackErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 生成资金曲线数据（累计盈利）- 使用所有session
  const allSessions = [...stats.sessions].reverse(); // 从最早到最新
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

  // 计算盈利范围，确保0点位于中点
  const maxProfit = Math.max(...cumulativeProfitData.map(d => d.cumulativeProfit), 0);
  const minProfit = Math.min(...cumulativeProfitData.map(d => d.cumulativeProfit), 0);
  
  // 计算绝对值较大的那个，用于确定Y轴范围
  // 这样0点就会在中间位置
  const maxAbsProfit = Math.max(Math.abs(maxProfit), Math.abs(minProfit), 1); // 至少为1，避免除0
  const profitMin = -maxAbsProfit; // 最小值是负的最大绝对值
  const profitMax = maxAbsProfit; // 最大值是正的最大绝对值

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border-b border-gray-700 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-2xl font-bold">复盘中心</h1>
          </div>
          <button
            onClick={() => {
              const { connect } = useGameStore.getState();
              // 先清除 session ID，然后连接（连接时会启动新游戏）
              localStorage.removeItem('current_session_id');
              connect();
              navigate('/game');
            }}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg flex items-center gap-2 transition-colors"
          >
            <Play className="w-4 h-4" />
            开始新游戏
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
            <span className="ml-3 text-gray-400">加载数据中...</span>
          </div>
        )}

        {/* Error State */}
        {error && !isLoading && (
          <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="text-red-400 font-semibold text-sm mb-1">加载失败</div>
              <div className="text-red-300/80 text-xs">
                {error}。已切换到本地数据模式。
              </div>
            </div>
          </div>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <StatCard
            title="总手数"
            value={stats.totalHands}
            icon={<Trophy className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            title="胜率"
            value={`${stats.winRate.toFixed(1)}%`}
            icon={<BarChart3 className="w-5 h-5" />}
            color={stats.winRate >= 50 ? 'green' : 'red'}
            trend={stats.winRate >= 50 ? 'up' : 'down'}
          />
          <StatCard
            title="入池率"
            value={`${stats.vpip.toFixed(1)}%`}
            icon={<BarChart3 className="w-5 h-5" />}
            color="blue"
          />
          <StatCard
            title="总盈利"
            value={`$${stats.totalProfit > 0 ? '+' : ''}${stats.totalProfit.toFixed(2)}`}
            icon={stats.totalProfit >= 0 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            color={stats.totalProfit >= 0 ? 'green' : 'red'}
          />
          <StatCard
            title="游戏场次"
            value={stats.sessions.length}
            icon={<Calendar className="w-5 h-5" />}
            color="purple"
          />
        </div>

        {/* Profit Curve Chart */}
        {cumulativeProfitData.length > 0 && (
          <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-yellow-400" />
              资金曲线（累计盈利）
            </h2>
            <div className="h-96 relative">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                {/* Zero line - always at center (50%) */}
                <line
                  x1="0"
                  y1="50"
                  x2="100"
                  y2="50"
                  stroke="#6b7280"
                  strokeWidth="0.3"
                  strokeDasharray="2,2"
                />
                <polyline
                  points={cumulativeProfitData.map((point, idx) => {
                    const x = (idx / (cumulativeProfitData.length - 1 || 1)) * 100;
                    // Y坐标：0点在50%，正值在上方，负值在下方
                    // profitMax对应0%（顶部），0对应50%（中间），profitMin对应100%（底部）
                    // 公式：y = 50 - (profit / maxAbsProfit) * 50
                    const y = 50 - (point.cumulativeProfit / maxAbsProfit) * 50;
                    return `${x},${y}`;
                  }).join(' ')}
                  fill="none"
                  stroke="url(#profitGradient)"
                  strokeWidth="0.5"
                  vectorEffect="non-scaling-stroke"
                />
                {cumulativeProfitData.map((point, idx) => {
                  const x = (idx / (cumulativeProfitData.length - 1 || 1)) * 100;
                  const y = 50 - (point.cumulativeProfit / maxAbsProfit) * 50;
                  return (
                    <circle
                      key={idx}
                      cx={x}
                      cy={y}
                      r="1"
                      fill={point.cumulativeProfit >= 0 ? '#10b981' : '#ef4444'}
                      className="hover:r-2 transition-all"
                    />
                  );
                })}
                <defs>
                  <linearGradient id="profitGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                    <stop offset="50%" stopColor="#10b981" stopOpacity="0.6" />
                    <stop offset="50%" stopColor="#ef4444" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0.8" />
                  </linearGradient>
                </defs>
              </svg>
              {/* Y-axis labels */}
              <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-500 pr-2">
                <span>${profitMax.toFixed(0)}</span>
                <span>$0</span>
                <span>${profitMin.toFixed(0)}</span>
              </div>
            </div>
            <div className="flex justify-between text-xs text-gray-500 mt-2">
              <span>起始: ${cumulativeProfitData[0]?.cumulativeProfit.toFixed(2) || '0.00'}</span>
              <span>当前: ${cumulativeProfitData[cumulativeProfitData.length - 1]?.cumulativeProfit.toFixed(2) || '0.00'}</span>
            </div>
          </div>
        )}

        {/* Session List */}
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4">历史对局</h2>
          {stats.sessions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>暂无历史对局记录</p>
              <p className="text-sm mt-2">开始游戏后，对局记录将自动保存</p>
            </div>
          ) : (
            <div className="space-y-2">
              {stats.sessions.map((session) => (
                <SessionRow 
                  key={session.id} 
                  session={session} 
                  onViewDetail={(sessionId) => {
                    // Navigate to detail page using React Router
                    navigate(`/replay/${sessionId}`);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function StatCard({ title, value, icon, color, trend }: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'purple';
  trend?: 'up' | 'down';
}) {
  const colorClasses = {
    blue: 'bg-blue-900/30 border-blue-500/30',
    green: 'bg-emerald-900/30 border-emerald-500/30',
    red: 'bg-red-900/30 border-red-500/30',
    purple: 'bg-purple-900/30 border-purple-500/30'
  };

  return (
    <div className={`${colorClasses[color]} rounded-xl p-4 border`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{title}</span>
        <div className={`text-${color}-400`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-white">
        {value}
        {trend && (
          <span className={`ml-2 text-sm ${trend === 'up' ? 'text-emerald-400' : 'text-red-400'}`}>
            {trend === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </div>
  );
}

function SessionRow({ session, onViewDetail }: { session: Session; onViewDetail: (sessionId: string) => void }) {
  const resultColors = {
    win: 'bg-emerald-900/30 border-emerald-500/30',
    loss: 'bg-red-900/30 border-red-500/30',
    'break-even': 'bg-gray-700/30 border-gray-600/30'
  };

  return (
    <div className={`${resultColors[session.result]} rounded-lg p-4 border flex items-center justify-between hover:opacity-80 transition-opacity`}>
      <div className="flex items-center gap-4">
        <div>
          <div className="text-sm font-medium text-white">
            {new Date(session.date).toLocaleString('zh-CN')}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            {session.hands} 手牌 · ${session.bigBlind} BB
          </div>
          {session.firstRoundHoleCards && session.firstRoundHoleCards.length > 0 && (
            <div className="flex items-center gap-1 mt-2">
              <span className="text-xs text-gray-500">手牌:</span>
              {session.firstRoundHoleCards.map((card: string, i: number) => (
                <Card key={i} card={card} size="sm" />
              ))}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-6">
        <div className="text-right">
          <div className={`text-sm font-semibold ${session.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {session.profit >= 0 ? '+' : ''}${session.profit.toFixed(2)}
          </div>
          <div className="text-xs text-gray-400">
            胜率: {session.winRate.toFixed(1)}%
          </div>
        </div>
        <button 
          onClick={() => onViewDetail(session.id)}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-sm transition-colors"
        >
          查看详情
        </button>
      </div>
    </div>
  );
}

export default Dashboard;

