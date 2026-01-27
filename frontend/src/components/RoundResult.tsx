import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RoundResult, Player, StreetReviewData, ReviewAnalysis } from '../types';
import Card from './Card';
import { 
  Trophy, X, Brain, Loader2, CheckCircle, XCircle, 
  Lightbulb, ArrowLeft, Crown, Sparkles 
} from 'lucide-react';
import { calculateHandRank, handRankNamesCN } from '../utils/handRank';
import { useGameStore } from '../store/useGameStore';

interface RoundResultProps {
  result: RoundResult;
  initialStacks?: Record<string, number>;
  onClose: () => void;
  onNextRound: () => void;
}

const RoundResultModal: React.FC<RoundResultProps> = ({ result, initialStacks, onClose, onNextRound }) => {
  const { winners, hand_info, round_state, player_hole_cards } = result;
  
  const { 
    heroHoleCards,
    streetHistory,
    reviewAnalysis, 
    isReviewLoading, 
    requestReview, 
    clearReview 
  } = useGameStore();
  
  const [showReviewModal, setShowReviewModal] = useState(false);
  
  const handleReviewClick = () => {
    setShowReviewModal(true);
      if (!reviewAnalysis && !isReviewLoading) {
        requestReview();
    }
  };
  
  const streetNamesCN: Record<string, string> = {
    'preflop': '翻牌前',
    'flop': '翻牌圈',
    'turn': '转牌圈',
    'river': '河牌圈'
  };
  
  const activePlayers = round_state.seats.filter((s: Player) => s.state !== 'folded');
  const isShowdown = (hand_info && hand_info.length > 0) || activePlayers.length > 1;
  
  const calculatePrize = (uuid: string, currentStack: number): number => {
    if (initialStacks && initialStacks[uuid] !== undefined) {
      return currentStack - initialStacks[uuid];
    }
    return currentStack;
  };
  
  const getPlayerName = (uuid: string): string => {
    const seat = round_state.seats.find((s: Player) => s.uuid === uuid);
    return seat?.name || 'Unknown';
  };
  
  const getPlayerCards = (uuid: string): string[] => {
    if (!player_hole_cards) return [];
    if (player_hole_cards[uuid]) return player_hole_cards[uuid];
    
    const playerName = getPlayerName(uuid);
    if (playerName === '你') {
      if (player_hole_cards['human_player']) return player_hole_cards['human_player'];
      for (const [key, cards] of Object.entries(player_hole_cards)) {
        const seat = round_state.seats.find((s: Player) => s.uuid === key);
        if (seat && seat.name === '你') return cards as string[];
      }
    }
    return [];
  };
  
  const getHandRankDisplay = (uuid: string): string => {
    const cards = getPlayerCards(uuid);
    const communityCards = round_state.community_card || [];
    if (cards.length < 2 || communityCards.length < 3) return '';
    const handRank = calculateHandRank(cards, communityCards);
    return handRankNamesCN[handRank] || handRank;
  };
  
  const winnerUuids = new Set(winners.map(w => w.uuid));
  
  const renderStructuredReview = (analysis: ReviewAnalysis) => {
    if (analysis.error) {
      return (
        <div className="text-[var(--color-crimson-400)] text-sm flex items-center gap-2 p-4 bg-[var(--color-crimson-900)]/20 rounded-xl border border-[var(--color-crimson-600)]/30">
          <XCircle className="w-5 h-5" aria-hidden="true" />
          <span>{analysis.error}</span>
        </div>
      );
    }
    
    if (!analysis.streets || analysis.streets.length === 0) {
      if ((analysis as { content?: string }).content) {
        return (
          <div className="text-[var(--color-text-secondary)] text-sm leading-relaxed whitespace-pre-wrap">
            {(analysis as { content?: string }).content}
          </div>
        );
      }
      return (
        <div className="text-[var(--color-text-dim)] text-sm text-center py-8">
          暂无复盘数据
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {/* Hero Hole Cards */}
        <div className="bg-[var(--color-bg-elevated)] rounded-xl p-4 border border-[var(--color-border)]">
          <div className="text-[var(--color-text-muted)] text-sm mb-3">你的手牌</div>
          <div className="flex gap-2">
            {heroHoleCards && heroHoleCards.map((card, i) => (
              <Card key={i} card={card} size="md" />
            ))}
          </div>
        </div>
        
        {/* Street Analysis */}
        {analysis.streets.map((street: StreetReviewData, idx: number) => (
          <motion.div 
            key={idx} 
            className="premium-card p-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
          >
            {/* Street Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--color-border)]">
              <span className="font-display text-xl font-bold text-[var(--color-text-primary)]">
                  {streetNamesCN[street.street] || street.street}
                </span>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${
                street.is_correct 
                  ? 'bg-[var(--color-emerald-900)]/30 text-[var(--color-emerald-400)] border border-[var(--color-emerald-600)]/30' 
                  : 'bg-[var(--color-gold-900)]/30 text-[var(--color-gold-400)] border border-[var(--color-gold-600)]/30'
              }`}>
                {street.is_correct ? (
                  <>
                    <CheckCircle className="w-4 h-4" aria-hidden="true" />
                    <span>正确</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" aria-hidden="true" />
                    <span>可改进</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Community Cards */}
            {(() => {
              const actualStreetData = streetHistory.find(s => s.street === street.street);
              const cardsToShow = actualStreetData?.community_cards || street.community_cards || [];
              
              if (cardsToShow.length > 0) {
                return (
                  <div className="mb-4">
                    <div className="text-[var(--color-text-dim)] text-xs mb-2">公共牌</div>
                    <div className="flex gap-2">
                      {cardsToShow.map((card, i) => {
                        let cardStr = '';
                        if (typeof card === 'string') {
                          cardStr = card;
                        } else if (card && typeof card === 'object') {
                          const suit = (card as { suit?: string; s?: string }).suit || (card as { s?: string }).s || '';
                          const rank = (card as { rank?: string; r?: string }).rank || (card as { r?: string }).r || '';
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
                <div className="text-[var(--color-text-dim)] text-xs mb-2">你的行动</div>
                <div className="text-[var(--color-text-primary)] font-bold text-lg">
                  {street.hero_action || '未行动'}
                </div>
              </div>
              <div className="bg-[var(--color-gold-900)]/20 rounded-xl p-4 border border-[var(--color-gold-600)]/30">
                <div className="text-[var(--color-gold-400)] text-xs mb-2 flex items-center gap-1">
                  <Brain className="w-3 h-3" aria-hidden="true" /> AI 建议
                </div>
                <div className="text-[var(--color-gold-300)] font-bold text-lg">
                  {street.ai_recommendation}
                </div>
              </div>
            </div>
            
            {/* Opponent Actions */}
            <div className="mb-4 bg-[var(--color-bg-base)] rounded-xl p-3 border border-[var(--color-border)]">
              <div className="text-[var(--color-text-dim)] text-xs mb-1">对手行动</div>
              <div className="text-[var(--color-text-secondary)] text-sm">
                {street.opponent_actions || '无对手行动'}
              </div>
            </div>
            
            {/* Analysis */}
            <div className="bg-[var(--color-bg-base)] rounded-xl p-4 mb-4 border-l-2 border-[var(--color-gold-500)]">
              <div className="text-[var(--color-gold-400)] text-xs mb-2">分析理由</div>
              <div className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
                {street.analysis}
              </div>
            </div>
            
            {/* Conclusion */}
            {street.conclusion && (
              <div className="flex items-start gap-3 bg-[var(--color-gold-900)]/10 rounded-xl p-4 border border-[var(--color-gold-600)]/20">
                <Lightbulb className="w-5 h-5 text-[var(--color-gold-400)] mt-0.5 shrink-0" aria-hidden="true" />
                <span className="text-[var(--color-gold-200)] text-sm leading-relaxed">
                  {street.conclusion}
                </span>
              </div>
            )}
          </motion.div>
        ))}
        
        {/* Overall Summary */}
        {analysis.overall_summary && (
          <motion.div 
            className="premium-card p-5 border-[var(--color-gold-600)]/30"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="text-[var(--color-gold-400)] text-sm font-bold mb-3 flex items-center gap-2">
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              整体评价与改进建议
            </div>
            <div className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
              {analysis.overall_summary}
            </div>
          </motion.div>
        )}
      </div>
    );
  };
  
  // Review Modal
  const ReviewModal = () => (
    <motion.div 
      className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="premium-card max-w-3xl w-full max-h-[95vh] flex flex-col"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex-shrink-0 border-b border-[var(--color-border)] px-6 py-4 flex justify-between items-center bg-[var(--color-bg-deep)]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[var(--color-gold-600)]/20">
              <Brain className="w-5 h-5 text-[var(--color-gold-500)]" aria-hidden="true" />
            </div>
            <h2 className="font-display text-xl font-bold text-[var(--color-text-primary)]">
            AI 复盘分析
          </h2>
          </div>
          <button
            onClick={() => setShowReviewModal(false)}
            className="btn-ghost px-4 py-2 text-sm flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            返回结果
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isReviewLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <div className="relative mb-4">
                <div className="w-12 h-12 border-2 border-[var(--color-gold-500)]/30 rounded-full" />
                <div className="absolute inset-0 w-12 h-12 border-2 border-[var(--color-gold-500)] border-t-transparent rounded-full animate-spin" />
              </div>
              <span className="text-[var(--color-text-secondary)]">AI 正在分析本局游戏…</span>
              <span className="text-[var(--color-text-dim)] text-sm mt-2">请稍候，这可能需要几秒钟</span>
            </div>
          ) : reviewAnalysis ? (
            renderStructuredReview(reviewAnalysis)
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <Brain className="w-12 h-12 text-[var(--color-text-dim)] mb-4 opacity-30" aria-hidden="true" />
              <span className="text-[var(--color-text-dim)]">正在准备复盘分析…</span>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
  
  return (
    <>
      <motion.div 
        className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div 
          className="premium-card max-w-4xl w-full max-h-[90vh] flex flex-col"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
        {/* Header */}
          <div className="flex-shrink-0 border-b border-[var(--color-border)] px-6 py-4 flex justify-between items-center bg-[var(--color-bg-deep)]">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[var(--color-gold-600)]/20">
                <Trophy className="w-5 h-5 text-[var(--color-gold-500)]" aria-hidden="true" />
              </div>
              <h2 className="font-display text-2xl font-bold text-gold-gradient">
            本局结果
          </h2>
            </div>
          <button
            onClick={onClose}
              className="p-2 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
              aria-label="关闭结果"
          >
              <X className="w-5 h-5 text-[var(--color-text-secondary)]" />
          </button>
        </div>
        
          {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Pot Size */}
          <div className="text-center">
              <div className="text-[var(--color-text-muted)] text-sm mb-1">底池</div>
              <div className="text-[var(--color-gold-400)] font-bold text-4xl font-mono">
              ${round_state.pot?.main?.amount || 0}
            </div>
          </div>
          
          {/* Community Cards */}
          {round_state.community_card && round_state.community_card.length > 0 && (
            <div>
                <div className="text-[var(--color-text-muted)] text-sm mb-3 text-center">公共牌</div>
                <div className="flex gap-3 justify-center">
                {round_state.community_card.map((card, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <Card card={card} size="responsive" />
                    </motion.div>
                ))}
              </div>
            </div>
          )}
          
            {/* Showdown Hands */}
          {isShowdown && player_hole_cards && Object.keys(player_hole_cards).length > 0 && (
            <div>
                <div className="text-[var(--color-text-muted)] text-sm mb-3">摊牌阶段</div>
              <div className="space-y-3">
                {round_state.seats
                    .filter((seat: Player) => seat.state !== 'folded')
                  .map((seat: Player) => {
                    const isWinner = winnerUuids.has(seat.uuid);
                    const cards = getPlayerCards(seat.uuid);
                    if (cards.length === 0) return null;
                    
                    return (
                        <motion.div
                        key={seat.uuid}
                          className={`p-4 rounded-xl border ${
                          isWinner
                              ? 'bg-[var(--color-gold-900)]/20 border-[var(--color-gold-600)]/40'
                              : 'bg-[var(--color-bg-elevated)] border-[var(--color-border)]'
                        }`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                      >
                          <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                              <span className={`font-bold ${isWinner ? 'text-[var(--color-gold-400)]' : 'text-[var(--color-text-primary)]'}`}>
                              {seat.name}
                            </span>
                              {isWinner && <Crown className="w-4 h-4 text-[var(--color-gold-400)]" aria-hidden="true" />}
                          </div>
                            <span className={`text-sm px-3 py-1 rounded-lg ${
                              isWinner 
                                ? 'bg-[var(--color-gold-900)]/30 text-[var(--color-gold-300)]' 
                                : 'bg-[var(--color-bg-base)] text-[var(--color-text-secondary)]'
                            }`}>
                              {getHandRankDisplay(seat.uuid)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          {cards.map((card, i) => (
                              <Card key={i} card={card} size="md" />
                          ))}
                        </div>
                        </motion.div>
                    );
                  })}
              </div>
            </div>
          )}
          
            {/* No Showdown */}
          {!isShowdown && (
              <div className="text-center py-6 text-[var(--color-text-muted)]">
                所有对手弃牌，无需摊牌
            </div>
          )}
          
          {/* Winners */}
          <div>
              <div className="text-[var(--color-text-muted)] text-sm mb-3">赢家</div>
              <div className="space-y-3">
              {winners.map((winner) => {
                const name = getPlayerName(winner.uuid);
                const prize = calculatePrize(winner.uuid, winner.stack);
                const isHero = name === '你';
                
                return (
                    <motion.div
                    key={winner.uuid}
                      className={`p-5 rounded-xl ${
                        isHero 
                          ? 'bg-[var(--color-emerald-900)]/20 border border-[var(--color-emerald-600)]/40' 
                          : 'bg-[var(--color-gold-900)]/20 border border-[var(--color-gold-600)]/40'
                    }`}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                  >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Trophy className={`w-6 h-6 ${isHero ? 'text-[var(--color-emerald-400)]' : 'text-[var(--color-gold-400)]'}`} aria-hidden="true" />
                          <span className={`font-bold text-xl ${isHero ? 'text-[var(--color-emerald-300)]' : 'text-[var(--color-gold-300)]'}`}>
                            {name}
                        </span>
                        </div>
                        <div className="text-right">
                          <div className={`font-bold text-2xl font-mono ${isHero ? 'text-[var(--color-emerald-400)]' : 'text-[var(--color-gold-400)]'}`}>
                            +${prize}
                          </div>
                          <div className="text-[var(--color-text-dim)] text-sm">
                          总筹码: ${winner.stack}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                );
              })}
            </div>
            </div>
          </div>
          
          {/* Footer Actions */}
          <div className="flex-shrink-0 border-t border-[var(--color-border)] px-6 py-4 bg-[var(--color-bg-deep)]">
            <div className="flex gap-4">
            <button
              onClick={handleReviewClick}
              disabled={isReviewLoading}
                className="flex-1 btn-ghost py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isReviewLoading ? (
                <>
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                    <span>AI 分析中…</span>
                </>
              ) : (
                <>
                    <Brain className="w-5 h-5" aria-hidden="true" />
                  <span>AI 复盘分析</span>
                </>
              )}
            </button>
            
          <button
            onClick={() => {
                  clearReview();
              onNextRound();
                  setTimeout(() => onClose(), 100);
            }}
                className="flex-1 btn-gold py-3.5 flex items-center justify-center gap-2"
          >
                <span className="font-bold">下一局</span>
                <span className="text-sm opacity-75">(Enter)</span>
          </button>
        </div>
      </div>
        </motion.div>
      </motion.div>
      
      <AnimatePresence>
      {showReviewModal && <ReviewModal />}
      </AnimatePresence>
    </>
  );
};

export default RoundResultModal;
