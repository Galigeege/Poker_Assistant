import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'
import { Trophy, Play, Settings, History, LogOut, User } from 'lucide-react'
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

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);

  // 如果已连接，显示游戏房间
  if (isConnected) {
    return <GameRoom />;
  }

  const refreshApiKeyStatus = async () => {
    setApiKeyStatusLoading(true);
    try {
      const status = await apiClient.get<{ has_default_api_key: boolean; has_user_api_key: boolean }>('/api/auth/me/api-key/status');
      setApiKeyStatus(status);
      return status;
    } catch (e: any) {
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

  // 允许其他页面通过 localStorage 标记，回到首页后自动打开“高级游戏设置”弹窗
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
    <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
      {/* User Info Bar */}
      {user && (
        <div className="absolute top-4 right-4 flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-300">
            <User className="w-5 h-5" />
            <span>{user.username}</span>
          </div>
          {/* API Key Status (常驻) */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-700 bg-gray-900/50 text-sm">
            <span className="text-gray-400">API Key</span>
            {apiKeyStatusLoading ? (
              <span className="text-gray-500">检测中...</span>
            ) : apiKeyStatus ? (
              apiKeyStatus.has_user_api_key ? (
                <span className="text-emerald-400 font-semibold">已配置</span>
              ) : (
                <span className="text-yellow-400 font-semibold">未配置</span>
              )
            ) : (
              <span className="text-gray-500">未知</span>
            )}
            {!apiKeyStatusLoading && apiKeyStatus && !apiKeyStatus.has_user_api_key && (
              <button
                onClick={() => setShowConfigModal(true)}
                className="ml-2 px-2 py-1 bg-yellow-600/80 hover:bg-yellow-600 text-black rounded text-xs font-semibold"
              >
                配置
              </button>
            )}
            {!apiKeyStatusLoading && apiKeyStatus && apiKeyStatus.has_user_api_key && (
              <button
                onClick={() => setShowConfigModal(true)}
                className="ml-2 px-2 py-1 bg-gray-700 hover:bg-gray-600 text-gray-200 rounded text-xs"
              >
                查看
              </button>
            )}
          </div>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="px-4 py-2 bg-red-900/50 hover:bg-red-800/50 rounded-lg flex items-center gap-2 transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            退出
          </button>
        </div>
      )}

      <div className="max-w-4xl w-full space-y-12 text-center">
        
        {/* Header */}
        <div className="space-y-4 animate-fade-in">
          <h1 className="text-6xl font-black tracking-tighter bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
            POKER AI ARENA
          </h1>
          <p className="text-xl text-slate-400">
            The Ultimate Texas Hold'em Battleground vs. LLM Agents
          </p>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card 
            icon={isConnecting ? <div className="animate-spin">⏳</div> : <Play className="w-12 h-12 text-emerald-400" />}
            title={isConnecting ? "Connecting..." : "Quick Start"}
            description="Jump into a game with default settings"
            onClick={() => {
              void (async () => {
                const status = apiKeyStatus || await refreshApiKeyStatus();
                // 未配置账号 Key：直接打开高级游戏设置弹窗
                if (status && !status.has_user_api_key) {
                  setShowConfigModal(true);
                  return;
                }
                // 默认行为：直接开始
                connect();
                navigate('/game');
              })();
            }}
            primary
            disabled={isConnecting}
          />
          <Card 
            icon={<Settings className="w-12 h-12 text-blue-400" />}
            title="Custom Game"
            description="Configure blinds, AI difficulty, and more"
            onClick={() => setShowConfigModal(true)}
          />
          <Card 
            icon={<History className="w-12 h-12 text-purple-400" />}
            title="Review"
            description="Analyze your past sessions and stats"
            onClick={() => navigate('/dashboard')}
          />
        </div>

        {/* Stats Footer */}
        <div className="pt-12 flex justify-center gap-12 text-slate-500">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            <span>Total Hands: 0</span>
          </div>
          <div>
            <span>Win Rate: 0%</span>
          </div>
        </div>
      </div>

      {/* Game Config Modal */}
      <GameConfigModal
        isOpen={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSave={async (config: GameConfig) => {
          console.log('Game config:', config);
          // 保存配置到 localStorage（不保存 deepseekApiKey，避免同浏览器跨账号泄漏）
          localStorage.setItem('gameConfig', JSON.stringify({
            smallBlind: config.smallBlind,
            bigBlind: config.bigBlind,
            startStack: config.startStack,
          }));
          
          // 创建游戏会话，传递盲注结构配置
          const start = async () => {
            try {
              const { createSession } = await import('./services/sessionService');
              const session = await createSession({
                small_blind: config.smallBlind,
                big_blind: config.bigBlind,
                initial_stack: config.startStack,
                // 让后端可优先使用用户配置的 key（覆盖环境默认 key）
                deepseek_api_key: config.deepseekApiKey || undefined,
              });
              console.log('Session created:', session);
              // 保存 session ID 到 localStorage（useGameStore 会使用）
              localStorage.setItem('current_session_id', session.id);
              localStorage.setItem(`backend_session_${session.id}`, session.id);
            } catch (error) {
              console.error('Failed to create session:', error);
              // 即使创建失败，也继续连接（使用默认配置）
            }
            // 保存完成后刷新状态（常驻显示）
            await refreshApiKeyStatus();
            connect();
            navigate('/game');
          };

          await start();
        }}
      />
    </div>
  )
}

// ReplayDetail 包装组件，用于从路由参数获取 sessionId
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

  // 应用启动时检查认证状态
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        {/* 公开路由 */}
        <Route path="/login" element={
          <LoginRoute />
        } />
        <Route path="/register" element={
          <RegisterRoute />
        } />

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

// 登录路由组件（如果已登录则重定向）
function LoginRoute() {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <Login />;
}

// 注册路由组件（如果已登录则重定向）
function RegisterRoute() {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  return <Register />;
}

function Card({ icon, title, description, onClick, primary = false, disabled = false }: any) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`
        group relative p-8 rounded-2xl border transition-all duration-200
        flex flex-col items-center text-center gap-4
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${primary 
          ? 'bg-emerald-950/30 border-emerald-500/50 hover:bg-emerald-900/50 hover:border-emerald-400 hover:-translate-y-1 shadow-[0_0_30px_-10px_rgba(16,185,129,0.3)]' 
          : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-500 hover:-translate-y-1'
        }
      `}
    >
      <div className="p-4 rounded-full bg-slate-900/50 group-hover:scale-110 transition-transform duration-200">
        {icon}
      </div>
      <div>
        <h3 className={`text-xl font-bold mb-2 ${primary ? 'text-emerald-100' : 'text-slate-100'}`}>
          {title}
        </h3>
        <p className="text-sm text-slate-400 group-hover:text-slate-300">
          {description}
        </p>
      </div>
    </button>
  )
}

export default App
