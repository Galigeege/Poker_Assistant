import { useEffect, useState } from 'react';
import { X, Save, Key, Info, Lock } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-blue-900/50 to-indigo-900/50 border-b border-gray-700 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Info className="w-6 h-6 text-blue-400" />
            高级游戏设置
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 pb-28">
          {/* API Key 配置 - 移到最前面 */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <Key className="w-5 h-5 text-yellow-400" />
              <h3 className="text-lg font-semibold text-white">Deepseek API Key</h3>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              用于 AI Copilot / AI 对手行动规划 / AI 复盘等功能。Key 将保存到你的账号（不在本地浏览器保存）。
            </p>
            <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
              <div className="text-gray-400">配置状态：</div>
              {apiKeyStatusLoading ? (
                <span className="text-gray-500">检测中...</span>
              ) : apiKeyStatus ? (
                <>
                  <span className={`px-2 py-1 rounded border ${apiKeyStatus.has_user_api_key ? 'border-emerald-500/40 text-emerald-300 bg-emerald-900/20' : 'border-yellow-500/40 text-yellow-300 bg-yellow-900/20'}`}>
                    账号：{apiKeyStatus.has_user_api_key ? '已配置' : '未配置'}
                  </span>
                  <span className={`px-2 py-1 rounded border ${apiKeyStatus.has_default_api_key ? 'border-blue-500/40 text-blue-300 bg-blue-900/20' : 'border-gray-600 text-gray-400 bg-gray-900/20'}`}>
                    服务器默认：{apiKeyStatus.has_default_api_key ? '已配置' : '未配置'}
                  </span>
                </>
              ) : (
                <span className="text-gray-500">未知</span>
              )}
            </div>
            <div className="text-xs text-gray-400 mb-3">
              申请地址：
              <a
                href="https://platform.deepseek.com/api-keys"
                target="_blank"
                rel="noreferrer"
                className="text-blue-400 hover:text-blue-300 underline ml-1"
              >
                https://platform.deepseek.com/api-keys
              </a>
            </div>
            <div className="text-[11px] text-gray-500 mb-3 leading-relaxed">
              费用参考（估算）：Copilot 约 1k–3k 输入 + 0.4k–1.2k 输出/次；复盘约 1.5k–4k 输入 + 0.8k–1.5k 输出/次。<br />
              按“输入未命中 2 元/百万、输出 3 元/百万”估算：10 元约可用 Copilot 1,000–3,000 次，复盘 750–1,600 次。
            </div>
            <div className="flex gap-2">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={config.deepseekApiKey || ''}
                onChange={(e) => setConfig({ ...config, deepseekApiKey: e.target.value })}
                placeholder="sk-..."
                className="flex-1 px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 text-sm transition-colors"
              >
                {showApiKey ? '隐藏' : '显示'}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">保存后对新局/新游戏立即生效；用于 AI 对手、Copilot 和复盘。</p>
          </div>

          {/* 盲注结构 */}
          <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">盲注结构</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">小盲注 (SB)</label>
                <input
                  type="number"
                  min="1"
                  value={config.smallBlind}
                  onChange={(e) => setConfig({ ...config, smallBlind: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">大盲注 (BB)</label>
                <input
                  type="number"
                  min={config.smallBlind + 1}
                  value={config.bigBlind}
                  onChange={(e) => setConfig({ ...config, bigBlind: parseInt(e.target.value) || config.smallBlind * 2 })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-2">初始筹码</label>
                <input
                  type="number"
                  min="100"
                  step="100"
                  value={config.startStack}
                  onChange={(e) => setConfig({ ...config, startStack: parseInt(e.target.value) || 1000 })}
                  className="w-full px-3 py-2 bg-gray-900 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {Math.floor(config.startStack / config.bigBlind)} BB
                </div>
              </div>
            </div>
          </div>

          {/* 对手配置 - 置灰，正在开发中 */}
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50 opacity-60 relative">
            <div className="absolute inset-0 bg-gray-900/20 rounded-lg flex items-center justify-center">
              <div className="flex items-center gap-2 text-gray-400">
                <Lock className="w-4 h-4" />
                <span className="text-sm">正在开发中</span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-500 mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              对手配置
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-2">对手数量</label>
                <select
                  disabled
                  value={config.numOpponents}
                  className="w-full px-3 py-2 bg-gray-900/50 border border-gray-600/50 rounded-lg text-gray-500 cursor-not-allowed"
                >
                  {[2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <option key={num} value={num}>{num} 人桌</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-2">AI 难度</label>
                <div className="grid grid-cols-4 gap-2">
                  {(['Fish', 'Regular', 'Pro', 'GTO'] as const).map(level => (
                    <button
                      key={level}
                      disabled
                      className="py-2 px-3 rounded-lg text-sm font-medium bg-gray-700/50 text-gray-500 cursor-not-allowed"
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="aiPersona"
                  disabled
                  checked={config.aiPersona}
                  className="w-5 h-5 rounded border-gray-600/50 bg-gray-900/50 cursor-not-allowed"
                />
                <label htmlFor="aiPersona" className="text-sm text-gray-500">
                  启用 AI 性格扮演
                </label>
              </div>
            </div>
          </div>

          {/* 辅助功能 - 置灰，正在开发中 */}
          <div className="bg-gray-800/30 rounded-lg p-4 border border-gray-700/50 opacity-60 relative">
            <div className="absolute inset-0 bg-gray-900/20 rounded-lg flex items-center justify-center">
              <div className="flex items-center gap-2 text-gray-400">
                <Lock className="w-4 h-4" />
                <span className="text-sm">正在开发中</span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-500 mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              辅助功能
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="showOdds" className="text-sm text-gray-500">
                    实时胜率显示
                  </label>
                  <p className="text-xs text-gray-600">在牌桌上显示当前手牌胜率</p>
                </div>
                <input
                  type="checkbox"
                  id="showOdds"
                  disabled
                  checked={config.showOdds}
                  className="w-5 h-5 rounded border-gray-600/50 bg-gray-900/50 cursor-not-allowed"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <label htmlFor="aiAdvice" className="text-sm text-gray-500">
                    实时 AI 建议
                  </label>
                  <p className="text-xs text-gray-600">启用 AI Copilot 实时策略建议</p>
                </div>
                <input
                  type="checkbox"
                  id="aiAdvice"
                  disabled
                  checked={config.aiAdvice}
                  className="w-5 h-5 rounded border-gray-600/50 bg-gray-900/50 cursor-not-allowed"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex-shrink-0 bg-gray-900/95 backdrop-blur border-t border-gray-700 px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            保存并开始游戏
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameConfigModal;

