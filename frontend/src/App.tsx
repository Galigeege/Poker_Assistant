import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Trophy, Play, Settings, History, LogOut, User, 
  Spade, Heart, Diamond, Club, Sparkles, Crown
} from 'lucide-react'
import { useGameStore } from './store/useGameStore'
import { useAuthStore } from './store/useAuthStore'
import { apiClient } from './services/api'
import GameRoom from './components/GameRoom'
import GameConfigModal from './components/GameConfigModal'
import type { GameConfig } from './components/GameConfigModal'
import Dashboard from './pages/Dashboard'
import ReplayDetail from './pages/ReplayDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import ProtectedRoute from './components/ProtectedRoute'

function HomePage() {
  const { connect, isConnected, isConnecting } = useGameStore();
  const { isAuthenticated, user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<{ has_default_api_key: boolean; has_user_api_key: boolean } | null>(null);
  const [apiKeyStatusLoading, setApiKeyStatusLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  if (isConnected) {
    return <GameRoom />;
  }

  const refreshApiKeyStatus = async () => {
    setApiKeyStatusLoading(true);
    try {
      const status = await apiClient.get<{ has_default_api_key: boolean; has_user_api_key: boolean }>('/api/auth/me/api-key/status');
      setApiKeyStatus(status);
      return status;
    } catch {
      setApiKeyStatus(null);
      return null;
    } finally {
      setApiKeyStatusLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      void refreshApiKeyStatus();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    try {
      if (localStorage.getItem('open_game_config_modal') === '1') {
        localStorage.removeItem('open_game_config_modal');
        setShowConfigModal(true);
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="min-h-screen bg-[var(--color-bg-deep)] text-[var(--color-text-primary)] relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-radial opacity-60" />
      
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-30">
        <motion.div 
          className="absolute top-[5%] left-[10%] text-[var(--color-gold-500)]"
          animate={{ y: [-15, 15, -15], rotate: [0, 10, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        >
          <Spade size={100} strokeWidth={1} />
        </motion.div>
        <motion.div 
          className="absolute top-[15%] right-[15%] text-[var(--color-crimson-600)]"
          animate={{ y: [15, -15, 15], rotate: [0, -8, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        >
          <Heart size={80} strokeWidth={1} />
        </motion.div>
        <motion.div 
          className="absolute bottom-[20%] left-[8%] text-[var(--color-crimson-600)]"
          animate={{ y: [-12, 18, -12], rotate: [0, 12, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        >
          <Diamond size={90} strokeWidth={1} />
        </motion.div>
        <motion.div 
          className="absolute bottom-[10%] right-[10%] text-[var(--color-gold-500)]"
          animate={{ y: [18, -12, 18], rotate: [0, -10, 0] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        >
          <Club size={110} strokeWidth={1} />
        </motion.div>
      </div>
      
      {/* Decorative Lines */}
      <div className="absolute top-0 left-[20%] w-px h-full bg-gradient-to-b from-transparent via-[var(--color-gold-500)]/10 to-transparent" />
      <div className="absolute top-0 right-[20%] w-px h-full bg-gradient-to-b from-transparent via-[var(--color-gold-500)]/10 to-transparent" />

      {/* User Info Bar */}
      {user && (
        <motion.div 
          className="absolute top-6 right-6 flex items-center gap-4 z-20"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-3 px-4 py-2 glass rounded-full">
            <User className="w-4 h-4 text-[var(--color-gold-500)]" aria-hidden="true" />
            <span className="text-sm font-medium">{user.username}</span>
          </div>
          
          {/* API Key Status */}
          <div className="flex items-center gap-2 px-4 py-2 glass rounded-full text-sm">
            <span className="text-[var(--color-text-muted)]">API Key</span>
            {apiKeyStatusLoading ? (
              <span className="text-[var(--color-text-dim)]">检测中…</span>
            ) : apiKeyStatus ? (
              apiKeyStatus.has_user_api_key ? (
                <span className="text-[var(--color-emerald-400)] font-semibold">已配置</span>
              ) : (
                <span className="text-[var(--color-gold-500)] font-semibold">未配置</span>
              )
            ) : (
              <span className="text-[var(--color-text-dim)]">未知</span>
            )}
            {!apiKeyStatusLoading && apiKeyStatus && !apiKeyStatus.has_user_api_key && (
              <button
                onClick={() => setShowConfigModal(true)}
                className="ml-1 px-2 py-0.5 bg-[var(--color-gold-600)] hover:bg-[var(--color-gold-500)] text-[var(--color-bg-deep)] rounded text-xs font-semibold transition-colors"
                aria-label="配置 API Key"
              >
                配置
              </button>
            )}
          </div>
          
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="p-2 glass rounded-full hover:bg-[var(--color-bg-hover)] transition-colors"
            aria-label="退出登录"
          >
            <LogOut className="w-4 h-4 text-[var(--color-crimson-400)]" aria-hidden="true" />
          </button>
        </motion.div>
      )}

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
        <div className="max-w-5xl w-full space-y-16 text-center">
          
          {/* Header */}
          <motion.div 
            className="space-y-6"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            {/* Logo */}
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] mb-2 animate-float">
              <div className="grid grid-cols-2 gap-1.5">
                <Spade className="w-6 h-6 text-[var(--color-gold-500)]" aria-hidden="true" />
                <Heart className="w-6 h-6 text-[var(--color-crimson-500)]" aria-hidden="true" />
                <Diamond className="w-6 h-6 text-[var(--color-crimson-500)]" aria-hidden="true" />
                <Club className="w-6 h-6 text-[var(--color-gold-500)]" aria-hidden="true" />
              </div>
            </div>
            
            <h1 className="font-display text-6xl md:text-7xl font-bold tracking-tight">
              <span className="text-gold-gradient">Poker</span>
              <span className="text-[var(--color-text-primary)]"> Arena</span>
            </h1>
            
            <p className="text-xl text-[var(--color-text-secondary)] max-w-xl mx-auto font-light">
              与 AI 对手在虚拟牌桌上较量
              <br />
              <span className="text-[var(--color-gold-500)]">DeepSeek</span> 驱动的终极德州扑克体验
            </p>
          </motion.div>

          {/* Main Actions */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
          >
            <ActionCard 
              icon={isConnecting ? (
                <div className="w-12 h-12 border-3 border-[var(--color-gold-500)] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="w-12 h-12" />
              )}
              title={isConnecting ? "连接中…" : "快速开始"}
              description="使用默认设置立即开始游戏"
              onClick={async () => {
                const status = apiKeyStatus || await refreshApiKeyStatus();
                if (status && !status.has_user_api_key) {
                  setShowConfigModal(true);
                  return;
                }
                connect();
                navigate('/game');
              }}
              variant="primary"
              disabled={isConnecting}
            />
            <ActionCard 
              icon={<Settings className="w-12 h-12" />}
              title="自定义游戏"
              description="配置盲注、AI 难度等参数"
              onClick={() => setShowConfigModal(true)}
              variant="secondary"
            />
            <ActionCard 
              icon={<History className="w-12 h-12" />}
              title="复盘中心"
              description="分析历史对局与统计数据"
              onClick={() => navigate('/dashboard')}
              variant="secondary"
            />
          </motion.div>

          {/* Stats Footer */}
          <motion.div 
            className="flex justify-center gap-8 md:gap-16"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="flex items-center gap-3 chip">
              <Trophy className="w-4 h-4 text-[var(--color-gold-500)]" aria-hidden="true" />
              <span className="text-[var(--color-text-secondary)]">总手数: <span className="font-mono text-[var(--color-text-primary)]">0</span></span>
            </div>
            <div className="flex items-center gap-3 chip">
              <Crown className="w-4 h-4 text-[var(--color-gold-500)]" aria-hidden="true" />
              <span className="text-[var(--color-text-secondary)]">胜率: <span className="font-mono text-[var(--color-text-primary)]">0%</span></span>
            </div>
          </motion.div>

          {/* Powered By */}
          <motion.div 
            className="pt-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            <div className="flex items-center justify-center gap-2 text-[var(--color-text-dim)] text-sm">
              <Sparkles className="w-4 h-4 text-[var(--color-gold-600)]" aria-hidden="true" />
              <span>Powered by DeepSeek AI</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Game Config Modal */}
      <AnimatePresence>
        {showConfigModal && (
          <GameConfigModal
            isOpen={showConfigModal}
            onClose={() => setShowConfigModal(false)}
            onSave={async (config: GameConfig) => {
              localStorage.setItem('gameConfig', JSON.stringify({
                smallBlind: config.smallBlind,
                bigBlind: config.bigBlind,
                startStack: config.startStack,
              }));
              
              const start = async () => {
                try {
                  const { createSession } = await import('./services/sessionService');
                  const session = await createSession({
                    small_blind: config.smallBlind,
                    big_blind: config.bigBlind,
                    initial_stack: config.startStack,
                    deepseek_api_key: config.deepseekApiKey || undefined,
                  });
                  localStorage.setItem('current_session_id', session.id);
                  localStorage.setItem(`backend_session_${session.id}`, session.id);
                } catch (error) {
                  console.error('Failed to create session:', error);
                }
                await refreshApiKeyStatus();
                connect();
                navigate('/game');
              };

              await start();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// Action Card Component
interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  variant: 'primary' | 'secondary';
  disabled?: boolean;
}

function ActionCard({ icon, title, description, onClick, variant, disabled = false }: ActionCardProps) {
  const isPrimary = variant === 'primary';
  
  return (
    <motion.button 
      onClick={onClick}
      disabled={disabled}
      className={`
        group relative p-8 rounded-2xl border transition-all duration-300
        flex flex-col items-center text-center gap-5
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${isPrimary 
          ? 'bg-gradient-to-br from-[var(--color-gold-900)]/30 to-[var(--color-bg-elevated)] border-[var(--color-gold-600)]/40 hover:border-[var(--color-gold-500)] hover:shadow-[0_0_40px_-10px_rgba(212,175,55,0.4)]' 
          : 'bg-[var(--color-bg-card)] border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-hover)]'
        }
      `}
      whileHover={!disabled ? { y: -4 } : undefined}
      whileTap={!disabled ? { scale: 0.98 } : undefined}
    >
      {/* Glow Effect for Primary */}
      {isPrimary && !disabled && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[var(--color-gold-500)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}
      
      <div className={`
        p-4 rounded-xl transition-all duration-300
        ${isPrimary 
          ? 'bg-[var(--color-gold-600)]/20 text-[var(--color-gold-400)] group-hover:bg-[var(--color-gold-600)]/30 group-hover:scale-110' 
          : 'bg-[var(--color-bg-elevated)] text-[var(--color-text-secondary)] group-hover:text-[var(--color-gold-400)] group-hover:scale-110'
        }
      `}>
        {icon}
      </div>
      
      <div className="relative z-10">
        <h3 className={`text-xl font-semibold mb-2 ${isPrimary ? 'text-[var(--color-gold-300)]' : 'text-[var(--color-text-primary)]'}`}>
          {title}
        </h3>
        <p className="text-sm text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)] transition-colors">
          {description}
        </p>
      </div>
      
      {/* Primary Badge */}
      {isPrimary && (
        <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-[var(--color-gold-600)] text-[var(--color-bg-deep)] text-xs font-bold rounded-full">
          推荐
        </div>
      )}
    </motion.button>
  )
}

// ReplayDetail Wrapper
function ReplayDetailWrapper() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  
  if (!sessionId) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <ReplayDetail 
      sessionId={sessionId} 
      onBack={() => navigate('/dashboard')} 
    />
  );
}

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        {/* 公开路由 */}
        <Route path="/login" element={<LoginRoute />} />
        <Route path="/register" element={<RegisterRoute />} />

        {/* 受保护的路由 */}
        <Route path="/" element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        } />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard onBack={() => window.location.href = '/'} />
          </ProtectedRoute>
        } />
        <Route path="/replay/:sessionId" element={
          <ProtectedRoute>
            <ReplayDetailWrapper />
          </ProtectedRoute>
        } />
        <Route path="/game" element={
          <ProtectedRoute>
            <GameRoom />
          </ProtectedRoute>
        } />
        {/* 404 重定向到首页 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

// 登录路由组件
function LoginRoute() {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <Login />;
}

// 注册路由组件
function RegisterRoute() {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <Register />;
}

export default App
