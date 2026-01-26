import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, Spade, Diamond, Club, Heart } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isLoading, error, clearError } = useAuthStore();
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  // 获取重定向路径（如果有）
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!username || !password) {
      setLocalError('请输入用户名和密码');
      return;
    }

    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '登录失败';
      setLocalError(errorMessage);
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen bg-[var(--color-bg-deep)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-radial opacity-50" />
      
      {/* Floating Suit Icons */}
      <motion.div 
        className="absolute top-[10%] left-[15%] text-[var(--color-gold-500)] opacity-10"
        animate={{ y: [-10, 10, -10], rotate: [0, 5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <Spade size={80} />
      </motion.div>
      <motion.div 
        className="absolute top-[20%] right-[20%] text-[var(--color-crimson-500)] opacity-10"
        animate={{ y: [10, -10, 10], rotate: [0, -5, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <Heart size={60} />
      </motion.div>
      <motion.div 
        className="absolute bottom-[25%] left-[10%] text-[var(--color-crimson-500)] opacity-10"
        animate={{ y: [-8, 12, -8], rotate: [0, 8, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <Diamond size={70} />
      </motion.div>
      <motion.div 
        className="absolute bottom-[15%] right-[12%] text-[var(--color-gold-500)] opacity-10"
        animate={{ y: [12, -8, 12], rotate: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Club size={90} />
      </motion.div>

      {/* Decorative Lines */}
      <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-[var(--color-gold-500)]/10 to-transparent" />
      <div className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-transparent via-[var(--color-gold-500)]/10 to-transparent" />

      <motion.div 
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo Section */}
        <motion.div 
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {/* Logo Icon */}
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] mb-6">
            <div className="grid grid-cols-2 gap-1">
              <Spade className="w-5 h-5 text-[var(--color-gold-500)]" />
              <Heart className="w-5 h-5 text-[var(--color-crimson-500)]" />
              <Diamond className="w-5 h-5 text-[var(--color-crimson-500)]" />
              <Club className="w-5 h-5 text-[var(--color-gold-500)]" />
            </div>
          </div>
          
          <h1 className="font-display text-4xl font-bold text-gold-gradient mb-3 tracking-tight">
            Poker Arena
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm tracking-wide uppercase">
            Premium AI Poker Experience
          </p>
        </motion.div>

        {/* Login Card */}
        <motion.div 
          className="premium-card p-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {/* Card Header */}
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl font-semibold text-[var(--color-text-primary)] mb-2">
              欢迎回来
            </h2>
            <div className="line-gold w-16 mx-auto" />
          </div>

          {/* Error Message */}
          {displayError && (
            <motion.div 
              className="mb-6 p-4 bg-[var(--color-crimson-900)]/30 border border-[var(--color-crimson-600)]/30 rounded-[var(--radius-lg)] flex items-start gap-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <AlertCircle className="w-5 h-5 text-[var(--color-crimson-400)] shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-[var(--color-crimson-300)] text-sm" role="alert">{displayError}</p>
            </motion.div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-premium"
                placeholder="请输入用户名…"
                disabled={isLoading}
                autoComplete="username"
                spellCheck={false}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-premium"
                placeholder="请输入密码…"
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-gold w-full py-4 text-lg flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  <span>登录中…</span>
                </>
              ) : (
                <span>进入赌场</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-8 flex items-center gap-4">
            <div className="flex-1 line-gold" />
            <span className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest">或</span>
            <div className="flex-1 line-gold" />
          </div>

          {/* Register Link */}
          <div className="text-center">
            <p className="text-[var(--color-text-muted)] text-sm mb-3">
              还没有账户？
            </p>
            <button
              type="button"
              onClick={() => navigate('/register')}
              className="btn-ghost w-full py-3 font-medium"
            >
              立即注册
            </button>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div 
          className="mt-8 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <p className="text-[var(--color-text-dim)] text-xs">
            Powered by <span className="text-[var(--color-gold-600)]">DeepSeek AI</span>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
