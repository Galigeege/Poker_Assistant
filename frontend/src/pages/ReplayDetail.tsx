import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle, XCircle, Brain, Loader2, Trophy, Clock, Coins, User } from 'lucide-react';
import Card from '../components/Card';
import { useGameStore } from '../store/useGameStore';
import type { StreetReviewData, ReviewAnalysis } from '../types';
import { getSessionDetail, saveRoundReview } from '../services/sessionService';

interface ReplayDetailProps {
  sessionId: string;
  onBack: () => void;
}

interface RoundRecord {
  id: string;
  timestamp: string;
  profit: number;
  isWin: boolean;
  pot: number;
  communityCards: string[];
  winners: Array<{ uuid: string; name: string; stack: number }>;
  streetHistory: any[];
  reviewAnalysis: ReviewAnalysis | null;
  roundState: any;
  handInfo: any[];
  playerHoleCards: Record<string, string[]>;
}

const ReplayDetail: React.FC<ReplayDetailProps> = ({ sessionId, onBack }) => {
  const [rounds, setRounds] = useState<RoundRecord[]>([]);
  const [selectedRoundIndex, setSelectedRoundIndex] = useState<number | null>(null);
  const [localReviewAnalysis, setLocalReviewAnalysis] = useState<ReviewAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { socket, isReviewLoading, connect, isConnected, isConnecting } = useGameStore();
  
  // Don't auto-connect WebSocket - only connect when user clicks the review button
  // This prevents automatic reconnection when user is viewing replay details
  
  // Listen for review_result messages
  useEffect(() => {
    if (!socket) return;
    
    const handleMessage = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'review_result' && msg.data) {
          const reviewData = msg.data;
          setLocalReviewAnalysis(reviewData);
          
          // Clear loading state
          useGameStore.setState({ isReviewLoading: false });
          
          // Auto-save to round record
          if (selectedRoundIndex !== null && rounds[selectedRoundIndex]) {
            const selectedRound = rounds[selectedRoundIndex];
            const updatedRounds = [...rounds];
            updatedRounds[selectedRoundIndex] = {
              ...rounds[selectedRoundIndex],
              reviewAnalysis: reviewData
            };
            setRounds(updatedRounds);
            
            // Save to API (async, don't await)
            (async () => {
              try {
                // 获取后端回合 ID（如果有映射）
                const backendRoundId = localStorage.getItem(`backend_round_${selectedRound.id}`);
                if (backendRoundId) {
                  await saveRoundReview(sessionId, backendRoundId, reviewData);
                  console.log('[ReplayDetail] Review saved to API');
                } else {
                  console.warn('[ReplayDetail] No backend round ID found, skipping API save');
                }
              } catch (apiError) {
                console.error('[ReplayDetail] Failed to save review to API:', apiError);
              }
            })();
            
            // Also save to localStorage as backup
            const sessionKey = `session_${sessionId}`;
            const sessionData = localStorage.getItem(sessionKey);
            if (sessionData) {
              try {
                const parsed = JSON.parse(sessionData);
                parsed.rounds = updatedRounds;
                localStorage.setItem(sessionKey, JSON.stringify(parsed));
                console.log('[ReplayDetail] Review saved to localStorage');
              } catch (e) {
                console.error('Failed to save review to localStorage:', e);
              }
            }
          }
        }
      } catch (e) {
        // Ignore non-JSON messages
      }
    };
    
    socket.addEventListener('message', handleMessage);
    return () => socket.removeEventListener('message', handleMessage);
  }, [socket, selectedRoundIndex, rounds, sessionId]);
  
  // Update local review when selected round changes
  useEffect(() => {
    if (selectedRoundIndex !== null && rounds[selectedRoundIndex]) {
      setLocalReviewAnalysis(rounds[selectedRoundIndex].reviewAnalysis || null);
    } else {
      setLocalReviewAnalysis(null);
    }
  }, [selectedRoundIndex, rounds]);

  useEffect(() => {
    loadSessionData();
  }, [sessionId]);

  const loadSessionData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 从 API 获取会话详情
      const sessionDetail = await getSessionDetail(sessionId);
      
      // 转换 API 格式为前端格式
      const convertedRounds: RoundRecord[] = sessionDetail.rounds.map((round) => {
        // 从 street_history 中提取 seats 信息（通常在第一个 street 中）
        const firstStreet = round.street_history?.[0];
        let seats: any[] = firstStreet?.seats || [];
        
        // 如果第一个 street 没有 seats，尝试从其他 street 中查找
        if (seats.length === 0) {
          for (const street of round.street_history || []) {
            if (street.seats && street.seats.length > 0) {
              seats = street.seats;
              break;
            }
          }
        }
        
        // 计算 hero UUID（从 seats 中查找，或从 hero_hole_cards 推断）
        let heroUuid = seats.find((s: any) => s.name === '你')?.uuid;
        // 如果找不到 hero UUID，尝试从 winners 或 hand_info 中推断
        if (!heroUuid && round.winners && round.winners.length > 0) {
          // 假设第一个 winner 是 hero（如果只有一个 winner）
          // 或者从 hand_info 中查找
        }
        
        // 计算 isWin（hero 是否在 winners 中）
        const isWin = heroUuid ? round.winners?.some((w: any) => w.uuid === heroUuid) || false : false;
        
        // 转换 playerHoleCards
        const playerHoleCards: Record<string, string[]> = {};
        
        // 1. Hero 的手牌
        if (round.hero_hole_cards && round.hero_hole_cards.length > 0) {
          // 如果还没有 heroUuid，尝试从第一个 seat 推断（通常第一个是 hero）
          if (!heroUuid && seats.length > 0) {
            heroUuid = seats[0].uuid;
          }
          if (heroUuid) {
            playerHoleCards[heroUuid] = round.hero_hole_cards;
          }
        }
        
        // 2. 从 hand_info 中提取所有玩家的手牌（showdown）
        if (round.hand_info && Array.isArray(round.hand_info)) {
          round.hand_info.forEach((hand: any) => {
            if (hand.uuid) {
              // hand_info 可能包含 hole_card 或 hole_cards
              const holeCards = hand.hole_card || hand.hole_cards || [];
              if (holeCards.length > 0) {
                playerHoleCards[hand.uuid] = holeCards;
              }
              // 如果还没有 heroUuid，且手牌名称包含"你"，则这是 hero
              if (!heroUuid && (hand.name === '你' || hand.player_name === '你')) {
                heroUuid = hand.uuid;
              }
            }
          });
        }
        
        // 3. 从 winners 中提取手牌（如果有的话）
        if (round.winners && Array.isArray(round.winners)) {
          round.winners.forEach((winner: any) => {
            if (winner.uuid && winner.hole_card) {
              playerHoleCards[winner.uuid] = winner.hole_card;
            }
          });
        }
        
        // 确保有 seats（如果还没有，创建一个基本的）
        if (seats.length === 0 && heroUuid) {
          // 创建一个基本的 seats 结构
          seats = [{
            uuid: heroUuid,
            name: '你',
            stack: 0
          }];
        }
        
        return {
          id: round.id,
          timestamp: round.created_at || new Date().toISOString(),
          profit: round.hero_profit || 0,
          isWin,
          pot: round.pot_size || 0,
          communityCards: round.community_cards || [],
          winners: round.winners?.map((w: any) => {
            // 从 seats 中查找玩家名称
            const playerSeat = seats.find((s: any) => s.uuid === w.uuid);
            // 优先使用 w.name（如果 API 返回了 name），否则从 seats 查找，最后使用 'Unknown'
            return {
              uuid: w.uuid,
              name: w.name || playerSeat?.name || 'Unknown',
              stack: w.stack || 0
            };
          }) || [],
          streetHistory: round.street_history || [],
          reviewAnalysis: round.review_analysis || null,
          roundState: {
            seats: seats,
            community_card: round.community_cards || [],
            pot: { main: { amount: round.pot_size || 0 } }
          },
          handInfo: round.hand_info || [],
          playerHoleCards
        };
      });
      
      setRounds(convertedRounds);
      if (convertedRounds.length > 0) {
        setSelectedRoundIndex(0);
      }
    } catch (err: any) {
      console.error('Failed to load session data from API:', err);
      setError(err.message || '加载会话数据失败');
      
      // Fallback: 从 localStorage 加载
      try {
        const sessionKey = `session_${sessionId}`;
        const sessionData = localStorage.getItem(sessionKey);
        if (sessionData) {
          const parsed = JSON.parse(sessionData);
          setRounds(parsed.rounds || []);
          if (parsed.rounds && parsed.rounds.length > 0) {
            setSelectedRoundIndex(0);
          }
        }
      } catch (fallbackErr) {
        console.error('Failed to load from localStorage:', fallbackErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const selectedRound = selectedRoundIndex !== null ? rounds[selectedRoundIndex] : null;
  // Use local review if available (just generated), otherwise use saved review
  const reviewAnalysis = localReviewAnalysis || selectedRound?.reviewAnalysis;

  const streetNamesCN: Record<string, string> = {
    'preflop': '翻牌前',
    'flop': '翻牌圈',
    'turn': '转牌圈',
    'river': '河牌圈'
  };

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
                aria-label="返回"
          >
                <ArrowLeft className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>
              <div>
                <h1 className="font-display text-2xl font-bold text-gold-gradient">对局详情</h1>
                <p className="text-xs text-[var(--color-text-muted)]">{rounds.length} 局对战记录</p>
        </div>
      </div>
          </div>
        </div>
      </motion.div>

      <div className="relative z-10 max-w-7xl mx-auto p-6">
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
        
        {error && rounds.length === 0 && !isLoading && (
          <motion.div 
            className="premium-card p-4 border-[var(--color-crimson-600)]/30 flex items-start gap-3"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <XCircle className="w-5 h-5 text-[var(--color-crimson-400)] shrink-0 mt-0.5" />
            <div>
              <div className="text-[var(--color-crimson-400)] font-semibold text-sm mb-1">加载失败</div>
              <div className="text-[var(--color-text-muted)] text-xs">{error}。已切换到本地数据模式。</div>
            </div>
          </motion.div>
        )}
        
        {rounds.length === 0 && !isLoading && !error && (
          <div className="text-center py-16 text-[var(--color-text-dim)]">
            <div className="p-4 rounded-full bg-[var(--color-bg-base)] inline-block mb-4">
              <Trophy className="w-10 h-10 opacity-30" />
          </div>
            <p className="text-sm">未找到对局数据</p>
          </div>
        )}
        
        {!isLoading && rounds.length > 0 && (
          <motion.div 
            className="grid grid-cols-1 lg:grid-cols-4 gap-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {/* Round List */}
            <div className="lg:col-span-1">
              <div className="premium-card p-4">
                <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)] mb-4">对局列表</h2>
                <div className="space-y-2 max-h-[600px] overflow-y-auto scrollbar-thin">
                  {rounds.map((round, idx) => (
                    <motion.button
                      key={round.id}
                      onClick={() => setSelectedRoundIndex(idx)}
                      className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                        selectedRoundIndex === idx
                          ? 'bg-gradient-to-r from-[var(--color-gold-600)]/20 to-transparent border-[var(--color-gold-600)]/40'
                          : 'bg-[var(--color-bg-elevated)] border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:bg-[var(--color-bg-hover)]'
                      }`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.03 }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-[var(--color-text-primary)]">第 {idx + 1} 局</span>
                        <span className={`text-xs font-bold font-mono ${
                          round.profit >= 0 ? 'text-[var(--color-emerald-400)]' : 'text-[var(--color-crimson-400)]'
                        }`}>
                          {round.profit >= 0 ? '+' : ''}${round.profit.toFixed(2)}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--color-text-dim)]">
                        {new Date(round.timestamp).toLocaleTimeString('zh-CN')}
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            </div>

            {/* Round Detail */}
            <div className="lg:col-span-3">
              {selectedRound ? (
                <div className="space-y-6">
                  {/* Round Summary */}
                  <motion.div 
                    className="premium-card p-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={selectedRoundIndex}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="font-display text-xl font-semibold text-[var(--color-text-primary)]">
                        第 {selectedRoundIndex! + 1} 局详情
                      </h2>
                      <div className={`px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 ${
                        selectedRound.isWin
                          ? 'bg-[var(--color-emerald-600)]/20 text-[var(--color-emerald-400)] border border-[var(--color-emerald-600)]/30'
                          : 'bg-[var(--color-crimson-600)]/20 text-[var(--color-crimson-400)] border border-[var(--color-crimson-600)]/30'
                      }`}>
                        {selectedRound.isWin ? <Trophy className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {selectedRound.isWin ? '胜利' : '失败'}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-[var(--color-bg-elevated)] rounded-xl p-4 border border-[var(--color-border)]">
                        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-2">
                          <Coins className="w-3.5 h-3.5" />
                          盈利
                        </div>
                        <div className={`text-xl font-bold font-mono ${
                          selectedRound.profit >= 0 ? 'text-[var(--color-emerald-400)]' : 'text-[var(--color-crimson-400)]'
                        }`}>
                          {selectedRound.profit >= 0 ? '+' : ''}${selectedRound.profit.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-[var(--color-bg-elevated)] rounded-xl p-4 border border-[var(--color-border)]">
                        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-2">
                          <Trophy className="w-3.5 h-3.5" />
                          底池
                        </div>
                        <div className="text-xl font-bold font-mono text-[var(--color-gold-400)]">
                          ${selectedRound.pot.toFixed(2)}
                        </div>
                      </div>
                      <div className="bg-[var(--color-bg-elevated)] rounded-xl p-4 border border-[var(--color-border)]">
                        <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)] mb-2">
                          <Clock className="w-3.5 h-3.5" />
                          时间
                        </div>
                        <div className="text-sm font-medium text-[var(--color-text-secondary)]">
                          {new Date(selectedRound.timestamp).toLocaleString('zh-CN')}
                        </div>
                      </div>
                    </div>
                  </motion.div>

                  {/* Hero Hole Cards */}
                  <motion.div 
                    className="premium-card p-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <User className="w-5 h-5 text-[var(--color-gold-500)]" />
                      <h3 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">手牌</h3>
                  </div>
                    <div className="flex gap-6 flex-wrap">
                      {(() => {
                        const heroUuid = selectedRound.roundState?.seats?.find((s: any) => s.name === '你')?.uuid;
                        const heroCards = heroUuid && selectedRound.playerHoleCards?.[heroUuid];
                        
                        return (
                          <>
                            {/* Hero's cards */}
                            <div className="flex flex-col items-center gap-3 p-4 bg-gradient-to-br from-[var(--color-gold-600)]/10 to-transparent rounded-xl border border-[var(--color-gold-600)]/20">
                              <div className="text-sm text-[var(--color-gold-400)] font-semibold">你</div>
                              {heroCards && heroCards.length > 0 ? (
                                <div className="flex gap-2">
                                  {heroCards.map((card: string, i: number) => (
                                    <Card key={i} card={card} size="md" />
                                  ))}
                                </div>
                              ) : (
                                <div className="text-xs text-[var(--color-text-dim)] italic">手牌信息未记录</div>
                              )}
                            </div>
                            
                            {/* Other players' cards */}
                            {selectedRound.playerHoleCards && Object.entries(selectedRound.playerHoleCards)
                              .filter(([uuid]) => uuid !== heroUuid)
                              .map(([uuid, cards]) => {
                                const handInfo = selectedRound.handInfo?.find((h: any) => h.uuid === uuid);
                                const playerName = handInfo?.name || handInfo?.player_name || 
                                  selectedRound.roundState?.seats?.find((s: any) => s.uuid === uuid)?.name || 
                                  'Unknown';
                                return (
                                  <div key={uuid} className="flex flex-col items-center gap-3 p-4 bg-[var(--color-bg-elevated)] rounded-xl border border-[var(--color-border)]">
                                    <div className="text-sm text-[var(--color-text-secondary)]">
                                      {playerName}
                                      <span className="text-xs text-[var(--color-text-dim)] ml-1">(摊牌)</span>
                                    </div>
                                    <div className="flex gap-2">
                                      {cards && cards.length > 0 ? (
                                        cards.map((card: string, i: number) => (
                                          <Card key={i} card={card} size="md" />
                                        ))
                                      ) : (
                                        <span className="text-xs text-[var(--color-text-dim)]">手牌未记录</span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </>
                        );
                      })()}
                    </div>
                  </motion.div>

                  {/* Action History by Street */}
                  {selectedRound.streetHistory && selectedRound.streetHistory.length > 0 && (
                    <motion.div 
                      className="premium-card p-6"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <h3 className="font-display text-lg font-semibold text-[var(--color-text-primary)] mb-4">行动历史</h3>
                      <div className="space-y-4">
                        {selectedRound.streetHistory.map((streetData: any, idx: number) => (
                          <div key={idx} className="border-l-2 border-[var(--color-gold-600)]/40 pl-4">
                            <div className="flex items-center gap-3 mb-3">
                              <span className="text-sm font-semibold text-[var(--color-gold-400)]">
                                {streetNamesCN[streetData.street] || streetData.street}
                              </span>
                              {streetData.community_cards && streetData.community_cards.length > 0 && (
                                <div className="flex gap-1">
                                  {streetData.community_cards.map((card: string, i: number) => (
                                    <Card key={i} card={card} size="sm" />
                                  ))}
                                </div>
                              )}
                            </div>
                            {streetData.actions && streetData.actions.length > 0 ? (
                              <div className="space-y-1.5 text-sm">
                                {streetData.actions.map((action: any, i: number) => {
                                  const actionText = action.action === 'call' && action.amount === 0 
                                    ? 'CHECK' 
                                    : action.action.toUpperCase();
                                  const amountText = action.amount > 0 ? ` $${action.amount}` : '';
                                  const isHero = action.player === '你';
                                  return (
                                    <div key={i} className={`flex items-center gap-2 py-1 px-2 rounded ${isHero ? 'bg-[var(--color-gold-600)]/10' : ''}`}>
                                      <span className={`w-24 ${isHero ? 'text-[var(--color-gold-400)] font-medium' : 'text-[var(--color-text-dim)]'}`}>
                                        {action.player}:
                                      </span>
                                      <span className={`font-mono ${isHero ? 'text-[var(--color-gold-300)]' : 'text-[var(--color-text-secondary)]'}`}>
                                        {actionText}{amountText}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="text-sm text-[var(--color-text-dim)] italic">无行动记录</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {/* Showdown Results */}
                  {selectedRound.handInfo && selectedRound.handInfo.length > 0 && (
                    <motion.div 
                      className="premium-card p-6"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                    >
                      <div className="flex items-center gap-2 mb-4">
                        <Trophy className="w-5 h-5 text-[var(--color-gold-500)]" />
                        <h3 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">摊牌结果</h3>
                      </div>
                      <div className="space-y-2">
                        {selectedRound.handInfo.map((hand: any, idx: number) => {
                          const playerName = hand.name || hand.player_name || 
                            selectedRound.roundState?.seats?.find((s: any) => s.uuid === hand.uuid)?.name || 
                            'Unknown';
                          const handStrength = typeof hand.hand === 'string' 
                            ? hand.hand 
                            : hand.hand?.strength || hand.hand?.hand?.strength || 'Unknown';
                          const isWinner = selectedRound.winners.some((w: any) => w.uuid === hand.uuid);
                          return (
                            <div 
                              key={idx} 
                              className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                                isWinner 
                                  ? 'bg-[var(--color-emerald-600)]/15 border border-[var(--color-emerald-600)]/30' 
                                  : 'bg-[var(--color-bg-elevated)] border border-[var(--color-border)]'
                              }`}
                            >
                              <span className={`text-sm ${isWinner ? 'text-[var(--color-emerald-400)] font-semibold' : 'text-[var(--color-text-secondary)]'}`}>
                                {playerName}
                                {isWinner && <span className="ml-2 text-xs">🏆 获胜</span>}
                              </span>
                              <span className="text-sm text-[var(--color-text-muted)] font-mono">{handStrength}</span>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* Review Analysis */}
                  {reviewAnalysis && reviewAnalysis.streets && reviewAnalysis.streets.length > 0 ? (
                    <motion.div 
                      className="premium-card p-6"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <div className="flex items-center gap-2 mb-6">
                        <Brain className="w-5 h-5 text-[var(--color-gold-500)]" />
                        <h3 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">AI 复盘分析</h3>
                      </div>
                      <div className="space-y-6">
                        {reviewAnalysis.streets.map((street: StreetReviewData, idx: number) => (
                          <div
                            key={idx}
                            className="bg-[var(--color-bg-elevated)] rounded-xl p-5 border border-[var(--color-border)]"
                          >
                            {/* Street Header */}
                            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--color-border)]">
                              <span className="text-[var(--color-gold-400)] font-bold text-lg">
                                  {streetNamesCN[street.street] || street.street}
                                </span>
                              <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium ${
                                street.is_correct
                                  ? 'bg-[var(--color-emerald-600)]/20 text-[var(--color-emerald-400)] border border-[var(--color-emerald-600)]/30'
                                  : 'bg-[var(--color-gold-600)]/20 text-[var(--color-gold-400)] border border-[var(--color-gold-600)]/30'
                              }`}>
                                {street.is_correct ? (
                                  <>
                                    <CheckCircle className="w-4 h-4" />
                                    <span>正确</span>
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="w-4 h-4" />
                                    <span>可改进</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Community Cards */}
                            {(() => {
                              const actualStreetData = selectedRound.streetHistory?.find((s: any) => s.street === street.street);
                              const cardsToShow = actualStreetData?.community_cards || street.community_cards || [];
                              
                              if (cardsToShow.length > 0) {
                                return (
                                  <div className="mb-4">
                                    <div className="text-[var(--color-text-dim)] text-xs mb-2">公共牌</div>
                                    <div className="flex gap-2">
                                      {cardsToShow.map((card: string | { suit?: string; s?: string; rank?: string; r?: string }, i: number) => {
                                        let cardStr = '';
                                        if (typeof card === 'string') {
                                          cardStr = card;
                                        } else if (card && typeof card === 'object') {
                                          const suit = card.suit || card.s || '';
                                          const rank = card.rank || card.r || '';
                                          if (suit && rank) {
                                            cardStr = `${rank}${suit}`;
                                          }
                                        }
                                        
                                        if (cardStr && cardStr.length >= 2) {
                                          return <Card key={i} card={cardStr} size="sm" />;
                                        }
                                        return null;
                                      })}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}

                            {/* Action Comparison */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                              <div className="bg-[var(--color-bg-base)] rounded-xl p-4 border border-[var(--color-border)]">
                                <div className="text-[var(--color-text-muted)] text-xs mb-2 flex items-center gap-1">
                                  <User className="w-3 h-3" /> 你的行动
                                </div>
                                <div className="text-[var(--color-text-primary)] font-bold text-lg font-mono">
                                  {street.hero_action || '未行动'}
                                </div>
                              </div>
                              
                              <div className="bg-gradient-to-br from-[var(--color-gold-600)]/10 to-transparent rounded-xl p-4 border border-[var(--color-gold-600)]/30">
                                <div className="text-[var(--color-gold-400)] text-xs mb-2 flex items-center gap-1">
                                  <Brain className="w-3 h-3" /> AI 建议
                                </div>
                                <div className="text-[var(--color-gold-300)] font-bold text-lg font-mono">
                                  {street.ai_recommendation}
                                </div>
                              </div>
                            </div>

                            {/* Opponent Actions */}
                            {street.opponent_actions && (
                              <div className="mb-4">
                                <div className="text-[var(--color-text-dim)] text-xs mb-2">对手行动</div>
                                <div className="text-[var(--color-text-secondary)] text-sm bg-[var(--color-bg-base)] p-3 rounded-lg border border-[var(--color-border)]">
                                  {street.opponent_actions}
                                </div>
                              </div>
                            )}

                            {/* Analysis */}
                            <div className="mb-4">
                              <div className="text-[var(--color-text-dim)] text-xs mb-2">分析理由</div>
                              <div className="text-[var(--color-text-secondary)] text-sm leading-relaxed bg-[var(--color-bg-base)] p-4 rounded-lg border border-[var(--color-border)]">
                                {street.analysis}
                              </div>
                            </div>

                            {/* Conclusion */}
                            {street.conclusion && (
                              <div className="pt-3 border-t border-[var(--color-border)]">
                                <div className="text-[var(--color-text-dim)] text-xs mb-1">总结</div>
                                <div className="text-[var(--color-text-muted)] text-sm italic">
                                  {street.conclusion}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Overall Summary */}
                      {reviewAnalysis.overall_summary && (
                        <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
                          <h4 className="font-display text-lg font-semibold text-[var(--color-text-primary)] mb-3">整体评价</h4>
                          <div className="text-[var(--color-text-secondary)] leading-relaxed bg-[var(--color-bg-elevated)] p-4 rounded-xl border border-[var(--color-border)]">
                            {reviewAnalysis.overall_summary}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  ) : isReviewLoading ? (
                    <motion.div 
                      className="premium-card p-8"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <div className="text-center">
                        <div className="flex flex-col items-center gap-4 mb-6">
                          <div className="relative">
                            <div className="w-16 h-16 border-2 border-[var(--color-gold-500)]/30 rounded-full" />
                            <div className="absolute inset-0 w-16 h-16 border-2 border-[var(--color-gold-500)] border-t-transparent rounded-full animate-spin" />
                            <Brain className="absolute inset-0 m-auto w-6 h-6 text-[var(--color-gold-400)]" />
                          </div>
                          <div>
                            <h3 className="font-display text-lg font-semibold text-[var(--color-text-primary)] mb-2">正在生成 AI 复盘分析</h3>
                            <p className="text-sm text-[var(--color-text-muted)]">
                              AI 正在深度分析本局游戏，预计需要 <span className="text-[var(--color-gold-400)] font-semibold">30 秒左右</span>
                            </p>
                            <p className="text-xs text-[var(--color-text-dim)] mt-2">
                              请耐心等待，AI 将为您提供详细的复盘分析...
                            </p>
                          </div>
                        </div>
                        <div className="w-full bg-[var(--color-bg-base)] rounded-full h-2 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[var(--color-gold-600)] to-[var(--color-gold-400)] rounded-full animate-pulse" style={{ width: '60%' }}></div>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      className="premium-card p-6"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                    >
                      <div className="text-center mb-6">
                        <div className="p-4 rounded-full bg-[var(--color-bg-base)] inline-block mb-4">
                          <Brain className="w-8 h-8 text-[var(--color-text-dim)]" />
                        </div>
                        <p className="text-[var(--color-text-muted)]">本局暂无 AI 复盘分析</p>
                        <p className="text-sm text-[var(--color-text-dim)] mt-2">点击下方按钮生成 AI 复盘分析</p>
                        <p className="text-xs text-[var(--color-text-dim)] mt-1">预计需要 30 秒左右</p>
                      </div>
                      <button
                        onClick={async () => {
                          if (!selectedRound) {
                            console.error('Cannot request review: no round selected');
                            return;
                          }
                          
                          let currentSocket = socket;
                          if (!currentSocket || currentSocket.readyState !== WebSocket.OPEN) {
                            console.log('[ReplayDetail] WebSocket not connected, connecting...');
                            connect();
                            let attempts = 0;
                            while (attempts < 20 && (!currentSocket || currentSocket.readyState !== WebSocket.OPEN)) {
                              await new Promise(resolve => setTimeout(resolve, 100));
                              currentSocket = useGameStore.getState().socket;
                              attempts++;
                            }
                            
                            if (!currentSocket || currentSocket.readyState !== WebSocket.OPEN) {
                              console.error('Cannot request review: failed to connect WebSocket');
                              alert('无法连接到服务器，请稍后重试');
                              return;
                            }
                          }
                          
                          const heroUuid = selectedRound.roundState?.seats?.find((s: any) => s.name === '你')?.uuid;
                          const heroHoleCards = selectedRound.playerHoleCards?.[heroUuid] || [];
                          
                          const reviewData = {
                            hero_hole_cards: heroHoleCards,
                            community_cards: selectedRound.communityCards,
                            street_history: selectedRound.streetHistory,
                            winners: selectedRound.winners,
                            hand_info: selectedRound.handInfo,
                            final_pot: selectedRound.pot,
                            seats: selectedRound.roundState?.seats || []
                          };
                          
                          currentSocket.send(JSON.stringify({
                            type: 'review_request',
                            data: reviewData
                          }));
                          
                          useGameStore.setState({ isReviewLoading: true });
                          setLocalReviewAnalysis(null);
                        }}
                        disabled={isReviewLoading || !selectedRound || (isConnecting && !isConnected)}
                        className="btn-gold w-full py-3 px-4 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isReviewLoading ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>正在生成复盘分析...</span>
                          </>
                        ) : isConnecting && !isConnected ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>正在连接服务器...</span>
                          </>
                        ) : (
                          <>
                            <Brain className="w-5 h-5" />
                            <span>生成 AI 复盘分析</span>
                          </>
                        )}
                      </button>
                    </motion.div>
                  )}
                </div>
              ) : (
                <div className="text-center py-16 text-[var(--color-text-dim)]">
                  <div className="p-4 rounded-full bg-[var(--color-bg-base)] inline-block mb-4">
                    <Trophy className="w-10 h-10 opacity-30" />
                  </div>
                  <p className="text-sm">请选择一局查看详情</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ReplayDetail;

