import { useState } from 'react';
import type { RoundResult, Player, StreetReviewData, ReviewAnalysis } from '../types';
import Card from './Card';
import { Trophy, X, Brain, Loader2, CheckCircle, XCircle, Lightbulb, ArrowLeft } from 'lucide-react';
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
  
  // Review state from store
  const { 
    heroHoleCards,
    reviewAnalysis, 
    isReviewLoading, 
    requestReview, 
    clearReview 
  } = useGameStore();
  
  // Local state for showing review modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  
  // Handle review button click
  const handleReviewClick = () => {
    setShowReviewModal(true);
    if (!reviewAnalysis && !isReviewLoading) {
      requestReview();
    }
  };
  
  // Street names in Chinese
  const streetNamesCN: Record<string, string> = {
    'preflop': '翻牌前',
    'flop': '翻牌圈',
    'turn': '转牌圈',
    'river': '河牌圈'
  };
  
  // Determine if showdown occurred
  const activePlayers = round_state.seats.filter((s: Player) => s.state !== 'folded');
  const isShowdown = (hand_info && hand_info.length > 0) || activePlayers.length > 1;
  
  // Calculate prize for each winner
  const calculatePrize = (uuid: string, currentStack: number): number => {
    if (initialStacks && initialStacks[uuid] !== undefined) {
      return currentStack - initialStacks[uuid];
    }
    return currentStack;
  };
  
  // Get player name by UUID
  const getPlayerName = (uuid: string): string => {
    const seat = round_state.seats.find((s: Player) => s.uuid === uuid);
    return seat?.name || 'Unknown';
  };
  
  // Get player hole cards
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
  
  // Get hand rank display
  const getHandRankDisplay = (uuid: string): string => {
    const cards = getPlayerCards(uuid);
    const communityCards = round_state.community_card || [];
    if (cards.length < 2 || communityCards.length < 3) return '';
    const handRank = calculateHandRank(cards, communityCards);
    return handRankNamesCN[handRank] || handRank;
  };
  
  const winnerUuids = new Set(winners.map(w => w.uuid));
  
  // Render structured review content
  const renderStructuredReview = (analysis: ReviewAnalysis) => {
    if (analysis.error) {
      return (
        <div className="text-red-400 text-sm flex items-center gap-2">
          <XCircle className="w-5 h-5" />
          <span>{analysis.error}</span>
        </div>
      );
    }
    
    if (!analysis.streets || analysis.streets.length === 0) {
      // Fallback to content if available
      if ((analysis as any).content) {
        return (
          <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
            {(analysis as any).content}
          </div>
        );
      }
      return (
        <div className="text-gray-500 text-sm text-center py-4">
          暂无复盘数据
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {/* Hero Hole Cards Section */}
        <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
          <div className="text-gray-400 text-sm mb-2">🃏 你的手牌</div>
          <div className="flex gap-2">
            {heroHoleCards && heroHoleCards.map((card, i) => (
              <Card key={i} card={card} size="md" />
            ))}
          </div>
        </div>
        
        {/* Street by Street Analysis */}
        {analysis.streets.map((street: StreetReviewData, idx: number) => (
          <div 
            key={idx} 
            className="bg-gradient-to-br from-slate-800/50 to-slate-900/70 rounded-xl p-5 border border-slate-600/30 shadow-lg"
          >
            {/* Street Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700/50">
              <div className="flex items-center gap-3">
                <span className="text-white font-bold text-xl">
                  {streetNamesCN[street.street] || street.street}
                </span>
              </div>
              {/* Correct/Incorrect Badge */}
              <div className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium ${
                street.is_correct 
                  ? 'bg-green-900/50 text-green-400 border border-green-500/30' 
                  : 'bg-orange-900/50 text-orange-400 border border-orange-500/30'
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
            
            {/* Community Cards for this street */}
            {street.community_cards && street.community_cards.length > 0 && (
              <div className="mb-4">
                <div className="text-gray-500 text-xs mb-2">公共牌</div>
                <div className="flex gap-2">
                  {street.community_cards.map((card, i) => (
                    <Card key={i} card={typeof card === 'string' ? card : `${card}`} size="sm" />
                  ))}
                </div>
              </div>
            )}
            
            {/* Action Comparison */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Player Action */}
              <div className="bg-gray-800/70 rounded-lg p-4 border border-gray-600/50">
                <div className="text-gray-400 text-xs mb-2 flex items-center gap-1">
                  <span>👤</span> 你的行动
                </div>
                <div className="text-white font-bold text-lg">
                  {street.hero_action || '未行动'}
                </div>
              </div>
              
              {/* AI Recommendation */}
              <div className="bg-indigo-900/40 rounded-lg p-4 border border-indigo-500/40">
                <div className="text-indigo-400 text-xs mb-2 flex items-center gap-1">
                  <Brain className="w-3 h-3" /> AI 建议
                </div>
                <div className="text-indigo-300 font-bold text-lg">
                  {street.ai_recommendation}
                </div>
              </div>
            </div>
            
            {/* Opponent Actions */}
            <div className="mb-4 bg-gray-900/50 rounded-lg p-3 border border-gray-700/50">
              <div className="text-gray-500 text-xs mb-1">对手行动</div>
              <div className="text-gray-300 text-sm">
                {street.opponent_actions || '无对手行动'}
              </div>
            </div>
            
            {/* Analysis */}
            <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-lg p-4 mb-4 border border-cyan-600/30">
              <div className="text-cyan-400 text-xs mb-2 flex items-center gap-1">
                <span>📊</span> 分析理由
              </div>
              <div className="text-gray-200 text-sm leading-relaxed">
                {street.analysis}
              </div>
            </div>
            
            {/* Conclusion */}
            {street.conclusion && (
              <div className="flex items-start gap-3 bg-yellow-900/20 rounded-lg p-4 border border-yellow-500/30">
                <Lightbulb className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
                <span className="text-yellow-200 text-sm leading-relaxed">
                  {street.conclusion}
                </span>
              </div>
            )}
          </div>
        ))}
        
        {/* Overall Summary */}
        {analysis.overall_summary && (
          <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 rounded-xl p-5 border border-purple-500/30">
            <div className="text-purple-400 text-sm font-bold mb-3 flex items-center gap-2">
              <span>📋</span> 整体评价与改进建议
            </div>
            <div className="text-gray-200 text-sm leading-relaxed">
              {analysis.overall_summary}
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Review Modal (separate window)
  const ReviewModal = () => (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-indigo-500/30 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-r from-indigo-900/50 to-purple-900/50 border-b border-indigo-500/30 px-6 py-4 flex justify-between items-center rounded-t-2xl">
          <h2 className="text-xl font-bold text-white flex items-center gap-3">
            <Brain className="w-6 h-6 text-indigo-400" />
            AI 复盘分析
          </h2>
          <button
            onClick={() => setShowReviewModal(false)}
            className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors px-3 py-1.5 rounded-lg hover:bg-gray-800"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>返回结果</span>
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isReviewLoading ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Loader2 className="w-12 h-12 animate-spin text-indigo-400 mb-4" />
              <span className="text-gray-400 text-lg">AI 正在分析本局游戏...</span>
              <span className="text-gray-500 text-sm mt-2">请稍候，这可能需要几秒钟</span>
            </div>
          ) : reviewAnalysis ? (
            renderStructuredReview(reviewAnalysis)
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <Brain className="w-12 h-12 text-gray-600 mb-4" />
              <span className="text-gray-500">正在准备复盘分析...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
  
  return (
    <>
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex-shrink-0 bg-gray-900 border-b border-gray-700 px-6 py-4 flex justify-between items-center">
            <h2 className="text-2xl font-bold text-yellow-400 flex items-center gap-2">
              <Trophy className="w-6 h-6" />
              本局结果
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Pot Size */}
            <div className="text-center">
              <div className="text-gray-400 text-sm mb-1">底池</div>
              <div className="text-yellow-400 font-bold text-3xl font-mono">
                ${round_state.pot?.main?.amount || 0}
              </div>
            </div>
            
            {/* Community Cards */}
            {round_state.community_card && round_state.community_card.length > 0 && (
              <div>
                <div className="text-gray-400 text-sm mb-2">公共牌</div>
                <div className="flex gap-2 justify-center">
                  {round_state.community_card.map((card, i) => (
                    <Card key={i} card={card} />
                  ))}
                </div>
              </div>
            )}
            
            {/* Showdown Hands */}
            {isShowdown && player_hole_cards && Object.keys(player_hole_cards).length > 0 && (
              <div>
                <div className="text-gray-400 text-sm mb-3">🃏 摊牌阶段 - 玩家手牌</div>
                <div className="space-y-3">
                  {round_state.seats
                    .filter((seat: Player) => seat.state !== 'folded')
                    .map((seat: Player) => {
                      const isWinner = winnerUuids.has(seat.uuid);
                      const cards = getPlayerCards(seat.uuid);
                      if (cards.length === 0) return null;
                      
                      return (
                        <div
                          key={seat.uuid}
                          className={`p-4 rounded-lg border ${
                            isWinner
                              ? 'bg-yellow-900/20 border-yellow-500/50'
                              : 'bg-gray-800/50 border-gray-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold ${isWinner ? 'text-yellow-400' : 'text-gray-300'}`}>
                                {seat.name}
                              </span>
                              {isWinner && <Trophy className="w-4 h-4 text-yellow-400" />}
                            </div>
                            <span className={`text-sm px-2 py-0.5 rounded ${isWinner ? 'bg-yellow-900/50 text-yellow-300' : 'bg-gray-700 text-gray-300'}`}>
                              {getHandRankDisplay(seat.uuid)}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            {cards.map((card, i) => (
                              <Card key={i} card={card} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
            
            {/* No Showdown */}
            {!isShowdown && (
              <div className="text-center py-4">
                <div className="text-gray-400 text-sm">🎯 所有对手弃牌，无需摊牌</div>
              </div>
            )}
            
            {/* Winners */}
            <div>
              <div className="text-gray-400 text-sm mb-3">🎉 赢家</div>
              <div className="space-y-2">
                {winners.map((winner) => {
                  const name = getPlayerName(winner.uuid);
                  const prize = calculatePrize(winner.uuid, winner.stack);
                  const isHero = name === '你';
                  
                  return (
                    <div
                      key={winner.uuid}
                      className={`p-4 rounded-lg ${
                        isHero ? 'bg-green-900/20 border border-green-500/50' : 'bg-yellow-900/20 border border-yellow-500/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold text-lg ${isHero ? 'text-green-400' : 'text-yellow-400'}`}>
                            {isHero ? '👤' : '🤖'} {name}
                          </span>
                          <Trophy className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div className="text-right">
                          <div className="text-yellow-400 font-bold text-xl font-mono">
                            赢得 ${prize}
                          </div>
                          <div className="text-gray-400 text-sm">
                            总筹码: ${winner.stack}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* Bottom Action Buttons - Same Level */}
          <div className="flex-shrink-0 bg-gray-900 border-t border-gray-700 px-6 py-4">
            <div className="flex gap-4">
              {/* AI Review Button */}
              <button
                onClick={handleReviewClick}
                disabled={isReviewLoading}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-wait text-white font-medium transition-colors"
              >
                {isReviewLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>AI 分析中...</span>
                  </>
                ) : (
                  <>
                    <Brain className="w-5 h-5" />
                    <span>AI 复盘分析</span>
                  </>
                )}
              </button>
              
              {/* Next Round Button */}
              <button
                onClick={() => {
                  clearReview();
                  onNextRound();
                  onClose();
                }}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <span>下一局</span>
                <span className="text-sm opacity-75">(按 Enter)</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Review Modal - Separate Window */}
      {showReviewModal && <ReviewModal />}
    </>
  );
};

export default RoundResultModal;
