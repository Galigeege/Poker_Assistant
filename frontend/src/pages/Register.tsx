import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, AlertCircle, Spade, Diamond, Club, Heart, Check } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { register, isLoading, error, isAuthenticated, clearError } = useAuthStore();
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // 如果已登录，重定向到首页
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!username || username.length < 3) {
      errors.username = '用户名至少需要3个字符';
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = '请输入有效的邮箱地址';
    }

    if (!password || password.length < 6) {
      errors.password = '密码至少需要6个字符';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = '两次输入的密码不一致';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!validateForm()) {
      return;
    }

    try {
      await register(username, email, password);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '注册失败';
      setLocalError(errorMessage);
    }
  };

  const displayError = localError || error;

  // Password strength indicator
  const passwordStrength = {
    hasLength: password.length >= 6,
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*]/.test(password),
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg-deep)] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-radial opacity-50" />
      
      {/* Floating Suit Icons */}
      <motion.div 
        className="absolute top-[8%] left-[12%] text-[var(--color-gold-500)] opacity-10"
        animate={{ y: [-10, 10, -10], rotate: [0, 5, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      >
        <Club size={70} />
      </motion.div>
      <motion.div 
        className="absolute top-[15%] right-[18%] text-[var(--color-crimson-500)] opacity-10"
        animate={{ y: [10, -10, 10], rotate: [0, -5, 0] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      >
        <Diamond size={55} />
      </motion.div>
      <motion.div 
        className="absolute bottom-[20%] left-[8%] text-[var(--color-crimson-500)] opacity-10"
        animate={{ y: [-8, 12, -8], rotate: [0, 8, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      >
        <Heart size={65} />
      </motion.div>
      <motion.div 
        className="absolute bottom-[12%] right-[15%] text-[var(--color-gold-500)] opacity-10"
        animate={{ y: [12, -8, 12], rotate: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Spade size={80} />
      </motion.div>

      {/* Decorative Lines */}
      <div className="absolute top-0 left-1/3 w-px h-full bg-gradient-to-b from-transparent via-[var(--color-gold-500)]/10 to-transparent" />
      <div className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-transparent via-[var(--color-gold-500)]/10 to-transparent" />

      <motion.div 
        className="w-full max-w-md relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Logo Section */}
        <motion.div 
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          {/* Logo Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--color-bg-elevated)] border border-[var(--color-border)] mb-4">
            <div className="grid grid-cols-2 gap-0.5">
              <Spade className="w-4 h-4 text-[var(--color-gold-500)]" />
              <Heart className="w-4 h-4 text-[var(--color-crimson-500)]" />
              <Diamond className="w-4 h-4 text-[var(--color-crimson-500)]" />
              <Club className="w-4 h-4 text-[var(--color-gold-500)]" />
            </div>
          </div>
          
          <h1 className="font-display text-3xl font-bold text-gold-gradient mb-2 tracking-tight">
            Poker Arena
            </h1>
          <p className="text-[var(--color-text-muted)] text-xs tracking-wide uppercase">
            Join the Elite
          </p>
        </motion.div>

        {/* Register Card */}
        <motion.div 
          className="premium-card p-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {/* Card Header */}
          <div className="text-center mb-6">
            <h2 className="font-display text-xl font-semibold text-[var(--color-text-primary)] mb-2">
              创建账户
            </h2>
            <div className="line-gold w-12 mx-auto" />
          </div>

          {/* Error Message */}
          {displayError && (
            <motion.div 
              className="mb-5 p-3 bg-[var(--color-crimson-900)]/30 border border-[var(--color-crimson-600)]/30 rounded-[var(--radius-lg)] flex items-start gap-3"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <AlertCircle className="w-5 h-5 text-[var(--color-crimson-400)] shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-[var(--color-crimson-300)] text-sm" role="alert">{displayError}</p>
            </motion.div>
          )}

          {/* Register Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                用户名
              </label>
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (validationErrors.username) {
                    setValidationErrors({ ...validationErrors, username: '' });
                  }
                }}
                className={`input-premium py-3 ${validationErrors.username ? 'border-[var(--color-crimson-500)]' : ''}`}
                placeholder="至少3个字符…"
                disabled={isLoading}
                autoComplete="username"
                spellCheck={false}
              />
              {validationErrors.username && (
                <p className="mt-1 text-xs text-[var(--color-crimson-400)]" role="alert">{validationErrors.username}</p>
              )}
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                邮箱
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (validationErrors.email) {
                    setValidationErrors({ ...validationErrors, email: '' });
                  }
                }}
                className={`input-premium py-3 ${validationErrors.email ? 'border-[var(--color-crimson-500)]' : ''}`}
                placeholder="your@email.com"
                disabled={isLoading}
                autoComplete="email"
                spellCheck={false}
              />
              {validationErrors.email && (
                <p className="mt-1 text-xs text-[var(--color-crimson-400)]" role="alert">{validationErrors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                密码
              </label>
              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (validationErrors.password) {
                    setValidationErrors({ ...validationErrors, password: '' });
                  }
                }}
                className={`input-premium py-3 ${validationErrors.password ? 'border-[var(--color-crimson-500)]' : ''}`}
                placeholder="至少6个字符…"
                disabled={isLoading}
                autoComplete="new-password"
              />
              {validationErrors.password && (
                <p className="mt-1 text-xs text-[var(--color-crimson-400)]" role="alert">{validationErrors.password}</p>
              )}
              
              {/* Password Strength */}
              {password && (
                <div className="mt-2 flex gap-3 text-xs">
                  <span className={`flex items-center gap-1 ${passwordStrength.hasLength ? 'text-[var(--color-emerald-400)]' : 'text-[var(--color-text-dim)]'}`}>
                    <Check className="w-3 h-3" aria-hidden="true" /> 6+字符
                  </span>
                  <span className={`flex items-center gap-1 ${passwordStrength.hasNumber ? 'text-[var(--color-emerald-400)]' : 'text-[var(--color-text-dim)]'}`}>
                    <Check className="w-3 h-3" aria-hidden="true" /> 数字
                  </span>
                  <span className={`flex items-center gap-1 ${passwordStrength.hasSpecial ? 'text-[var(--color-emerald-400)]' : 'text-[var(--color-text-dim)]'}`}>
                    <Check className="w-3 h-3" aria-hidden="true" /> 特殊字符
                  </span>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1.5">
                确认密码
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (validationErrors.confirmPassword) {
                    setValidationErrors({ ...validationErrors, confirmPassword: '' });
                  }
                }}
                className={`input-premium py-3 ${validationErrors.confirmPassword ? 'border-[var(--color-crimson-500)]' : ''}`}
                placeholder="再次输入密码…"
                disabled={isLoading}
                autoComplete="new-password"
              />
              {validationErrors.confirmPassword && (
                <p className="mt-1 text-xs text-[var(--color-crimson-400)]" role="alert">{validationErrors.confirmPassword}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-emerald w-full py-3.5 text-base flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                  <span>注册中…</span>
                </>
              ) : (
                <span>创建账户</span>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="flex-1 line-gold" />
            <span className="text-[var(--color-text-dim)] text-xs uppercase tracking-widest">或</span>
            <div className="flex-1 line-gold" />
          </div>

          {/* Login Link */}
          <div className="text-center">
            <p className="text-[var(--color-text-muted)] text-sm mb-2">
              已有账户？
            </p>
              <button
              type="button"
                onClick={() => navigate('/login')}
              className="btn-ghost w-full py-2.5 text-sm font-medium"
              >
                立即登录
              </button>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div 
          className="mt-6 text-center"
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

export default Register;
