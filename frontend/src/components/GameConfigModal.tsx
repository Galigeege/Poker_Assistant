import { useEffect, useState, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Save, Key, Info, Lock, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { apiClient } from '../services/api';

export interface GameConfig {
  smallBlind: number;
  bigBlind: number;
  startStack: number;
  numOpponents: number;
  aiDifficulty: 'Fish' | 'Regular' | 'Pro' | 'GTO';
  aiPersona: boolean;
  aiPersonaType?: 'Aggressive' | 'Tight' | 'Loose' | 'Random';
  showOdds: boolean;
  aiAdvice: boolean;
  deepseekApiKey?: string;
}

interface GameConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: GameConfig) => void;
  initialConfig?: Partial<GameConfig>;
}

const GameConfigModal: React.FC<GameConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialConfig
}) => {
  const [config, setConfig] = useState<GameConfig>({
    smallBlind: 5,
    bigBlind: 10,
    startStack: 1000,
    numOpponents: 5,
    aiDifficulty: 'Regular',
    aiPersona: false,
    aiPersonaType: 'Random',
    showOdds: false,
    aiAdvice: true,
    deepseekApiKey: '',
    ...initialConfig
  });

  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<{ has_default_api_key: boolean; has_user_api_key: boolean } | null>(null);
  const [apiKeyStatusLoading, setApiKeyStatusLoading] = useState(false);
  
  const apiKeyInputId = useId();
  const smallBlindId = useId();
  const bigBlindId = useId();
  const startStackId = useId();

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const fetchStatus = async () => {
      setApiKeyStatusLoading(true);
      try {
        const status = await apiClient.get<{ has_default_api_key: boolean; has_user_api_key: boolean }>('/api/auth/me/api-key/status');
        if (!cancelled) setApiKeyStatus(status);
      } catch {
        if (!cancelled) setApiKeyStatus(null);
      } finally {
        if (!cancelled) setApiKeyStatusLoading(false);
      }
    };
    void fetchStatus();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(config);
    onClose();
  };

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
          className="premium-card max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
        {/* Header */}
          <div className="flex-shrink-0 border-b border-[var(--color-border)] px-6 py-4 flex justify-between items-center bg-[var(--color-bg-deep)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[var(--color-gold-600)]/20">
                <Info className="w-5 h-5 text-[var(--color-gold-500)]" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-[var(--color-text-primary)]">
                  游戏设置
          </h2>
                <p className="text-xs text-[var(--color-text-muted)]">配置游戏参数与 API Key</p>
              </div>
            </div>
          <button
            onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
              aria-label="关闭设置"
          >
              <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>
        </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* API Key Configuration */}
            <div className="bg-[var(--color-bg-elevated)] rounded-xl p-5 border border-[var(--color-border)]">
            <div className="flex items-center gap-2 mb-4">
                <Key className="w-5 h-5 text-[var(--color-gold-500)]" aria-hidden="true" />
                <h3 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
                  DeepSeek API Key
                </h3>
            </div>
              
              <p className="text-xs text-[var(--color-text-dim)] mb-4 leading-relaxed">
                用于 AI Copilot、AI 对手行动规划、AI 复盘等功能。Key 将保存到你的账号（不在本地浏览器保存）。
            </p>
              
              {/* Status Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="text-xs text-[var(--color-text-muted)]">配置状态：</span>
              {apiKeyStatusLoading ? (
                  <span className="text-xs text-[var(--color-text-dim)]">检测中…</span>
              ) : apiKeyStatus ? (
                <>
                    <span className={`text-xs px-2 py-1 rounded-lg border ${
                      apiKeyStatus.has_user_api_key 
                        ? 'border-[var(--color-emerald-600)]/40 text-[var(--color-emerald-400)] bg-[var(--color-emerald-900)]/20' 
                        : 'border-[var(--color-gold-600)]/40 text-[var(--color-gold-400)] bg-[var(--color-gold-900)]/20'
                    }`}>
                    账号：{apiKeyStatus.has_user_api_key ? '已配置' : '未配置'}
                  </span>
                    <span className={`text-xs px-2 py-1 rounded-lg border ${
                      apiKeyStatus.has_default_api_key 
                        ? 'border-[var(--color-text-dim)]/40 text-[var(--color-text-secondary)] bg-[var(--color-bg-base)]' 
                        : 'border-[var(--color-border)] text-[var(--color-text-dim)] bg-[var(--color-bg-base)]'
                    }`}>
                    服务器默认：{apiKeyStatus.has_default_api_key ? '已配置' : '未配置'}
                  </span>
                </>
              ) : (
                  <span className="text-xs text-[var(--color-text-dim)]">未知</span>
              )}
            </div>
              
              {/* Apply Link */}
              <div className="text-xs text-[var(--color-text-dim)] mb-4 flex items-center gap-1">
              申请地址：
              <a
                href="https://platform.deepseek.com/api-keys"
                target="_blank"
                rel="noreferrer"
                  className="text-[var(--color-gold-500)] hover:text-[var(--color-gold-400)] underline inline-flex items-center gap-1 transition-colors"
              >
                  platform.deepseek.com
                  <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            </div>
              
              {/* Input */}
            <div className="flex gap-2">
                <div className="flex-1 relative">
                  <label htmlFor={apiKeyInputId} className="sr-only">DeepSeek API Key</label>
              <input
                    id={apiKeyInputId}
                    name="deepseek-api-key"
                type={showApiKey ? 'text' : 'password'}
                value={config.deepseekApiKey || ''}
                onChange={(e) => setConfig({ ...config, deepseekApiKey: e.target.value })}
                    placeholder="sk-…"
                    className="input-premium pr-10"
                    autoComplete="off"
                    spellCheck={false}
              />
              <button
                    type="button"
                onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-dim)] hover:text-[var(--color-text-secondary)] transition-colors"
                    aria-label={showApiKey ? '隐藏 API Key' : '显示 API Key'}
              >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

              <p className="text-[10px] text-[var(--color-text-dim)] mt-3 leading-relaxed">
                费用参考：Copilot 约 1-3k token/次；复盘约 2-5k token/次。按 DeepSeek 定价，10 元约可用 Copilot 1,000-3,000 次。
              </p>
            </div>

            {/* Blinds Structure */}
            <div className="bg-[var(--color-bg-elevated)] rounded-xl p-5 border border-[var(--color-border)]">
              <h3 className="font-display text-lg font-semibold text-[var(--color-text-primary)] mb-4">
                盲注结构
              </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                  <label htmlFor={smallBlindId} className="block text-sm text-[var(--color-text-secondary)] mb-2">
                    小盲注 (SB)
                  </label>
                <input
                    id={smallBlindId}
                    name="small-blind"
                  type="number"
                  min="1"
                  value={config.smallBlind}
                  onChange={(e) => setConfig({ ...config, smallBlind: parseInt(e.target.value) || 1 })}
                    className="input-premium py-3 font-mono"
                    autoComplete="off"
                />
              </div>
              <div>
                  <label htmlFor={bigBlindId} className="block text-sm text-[var(--color-text-secondary)] mb-2">
                    大盲注 (BB)
                  </label>
                <input
                    id={bigBlindId}
                    name="big-blind"
                  type="number"
                  min={config.smallBlind + 1}
                  value={config.bigBlind}
                  onChange={(e) => setConfig({ ...config, bigBlind: parseInt(e.target.value) || config.smallBlind * 2 })}
                    className="input-premium py-3 font-mono"
                    autoComplete="off"
                />
              </div>
              <div>
                  <label htmlFor={startStackId} className="block text-sm text-[var(--color-text-secondary)] mb-2">
                    初始筹码
                  </label>
                <input
                    id={startStackId}
                    name="start-stack"
                  type="number"
                  min="100"
                  step="100"
                  value={config.startStack}
                  onChange={(e) => setConfig({ ...config, startStack: parseInt(e.target.value) || 1000 })}
                    className="input-premium py-3 font-mono"
                    autoComplete="off"
                />
                  <div className="text-xs text-[var(--color-text-dim)] mt-1.5 font-mono">
                    = {Math.floor(config.startStack / config.bigBlind)} BB
                </div>
              </div>
            </div>
          </div>

            {/* Coming Soon Sections */}
            <div className="bg-[var(--color-bg-base)] rounded-xl p-5 border border-[var(--color-border)] opacity-50 relative overflow-hidden">
              <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-bg-deep)]/50 z-10">
                <div className="flex items-center gap-2 text-[var(--color-text-dim)] bg-[var(--color-bg-elevated)] px-4 py-2 rounded-full border border-[var(--color-border)]">
                  <Lock className="w-4 h-4" aria-hidden="true" />
                <span className="text-sm">正在开发中</span>
                </div>
              </div>

              <h3 className="font-display text-lg font-semibold text-[var(--color-text-dim)] mb-4 flex items-center gap-2">
                <Lock className="w-4 h-4" aria-hidden="true" />
                对手配置
            </h3>
              <div className="space-y-4 pointer-events-none">
                <div>
                  <span className="block text-sm text-[var(--color-text-dim)] mb-2">对手数量</span>
                  <div className="input-premium py-3 text-[var(--color-text-dim)]">5 人桌</div>
                </div>
                <div>
                  <span className="block text-sm text-[var(--color-text-dim)] mb-2">AI 难度</span>
                  <div className="grid grid-cols-4 gap-2">
                    {(['Fish', 'Regular', 'Pro', 'GTO'] as const).map(level => (
                      <div key={level} className="py-2 px-3 rounded-lg text-sm text-center bg-[var(--color-bg-elevated)] text-[var(--color-text-dim)] border border-[var(--color-border)]">
                        {level}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
        </div>

        {/* Footer */}
          <div className="flex-shrink-0 border-t border-[var(--color-border)] px-6 py-4 flex justify-end gap-3 bg-[var(--color-bg-deep)]">
          <button
              type="button"
            onClick={onClose}
              className="btn-ghost px-6 py-2.5"
          >
            取消
          </button>
          <button
              type="button"
            onClick={handleSave}
              className="btn-gold px-6 py-2.5 flex items-center gap-2"
          >
              <Save className="w-4 h-4" aria-hidden="true" />
            保存并开始游戏
          </button>
        </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GameConfigModal;
