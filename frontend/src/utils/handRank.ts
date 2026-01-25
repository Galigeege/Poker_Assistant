/**
 * 简单的手牌评估工具
 * 用于在前端显示手牌类型
 */

// 手牌类型中文名称
export const handRankNamesCN: Record<string, string> = {
  'highcard': '高牌',
  'onepair': '一对',
  'twopair': '两对',
  'threecard': '三条',
  'straight': '顺子',
  'flush': '同花',
  'fullhouse': '葫芦',
  'fourcard': '四条',
  'straightflush': '同花顺',
  'royalflush': '皇家同花顺',
};

// 牌面值映射
const rankValues: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8,
  '9': 9, '10': 10, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

// 解析牌面
function parseCard(card: string): { rank: string; suit: string; value: number } | null {
  if (!card || card.length < 2) return null;
  
  let suit: string;
  let rank: string;
  
  // 支持两种格式: "SA" (Suit+Rank) 或 "As" (Rank+Suit)
  if (['S', 'H', 'D', 'C', 's', 'h', 'd', 'c'].includes(card[0])) {
    suit = card[0].toUpperCase();
    rank = card.slice(1).toUpperCase();
  } else {
    rank = card.slice(0, -1).toUpperCase();
    suit = card.slice(-1).toUpperCase();
  }
  
  // 规范化 10
  if (rank === '10') rank = 'T';
  
  const value = rankValues[rank];
  if (!value) return null;
  
  return { rank, suit, value };
}

// 计算手牌类型（简化版本）
export function calculateHandRank(holeCards: string[], communityCards: string[]): string {
  const allCards = [...holeCards, ...communityCards]
    .map(parseCard)
    .filter((c): c is NonNullable<typeof c> => c !== null);
  
  if (allCards.length < 5) return 'highcard';
  
  // 统计每个值和花色
  const valueCounts: Record<number, number> = {};
  const suitCounts: Record<string, number> = {};
  const suitCards: Record<string, number[]> = {};
  
  for (const card of allCards) {
    valueCounts[card.value] = (valueCounts[card.value] || 0) + 1;
    suitCounts[card.suit] = (suitCounts[card.suit] || 0) + 1;
    if (!suitCards[card.suit]) suitCards[card.suit] = [];
    suitCards[card.suit].push(card.value);
  }
  
  const counts = Object.values(valueCounts).sort((a, b) => b - a);
  const values = Object.keys(valueCounts).map(Number).sort((a, b) => b - a);
  
  // 检查同花
  const flushSuit = Object.entries(suitCounts).find(([, count]) => count >= 5)?.[0];
  const isFlush = !!flushSuit;
  
  // 检查顺子
  function checkStraight(vals: number[]): boolean {
    const uniqueVals = [...new Set(vals)].sort((a, b) => b - a);
    // A-2-3-4-5 特殊情况
    if (uniqueVals.includes(14)) {
      uniqueVals.push(1);
    }
    
    for (let i = 0; i <= uniqueVals.length - 5; i++) {
      let isStraight = true;
      for (let j = 0; j < 4; j++) {
        if (uniqueVals[i + j] - uniqueVals[i + j + 1] !== 1) {
          isStraight = false;
          break;
        }
      }
      if (isStraight) return true;
    }
    return false;
  }
  
  const isStraight = checkStraight(values);
  
  // 同花顺检查
  if (isFlush && flushSuit) {
    const flushValues = suitCards[flushSuit];
    if (checkStraight(flushValues)) {
      // 检查是否是皇家同花顺
      const sortedFlush = [...new Set(flushValues)].sort((a, b) => b - a);
      if (sortedFlush.slice(0, 5).join(',') === '14,13,12,11,10') {
        return 'royalflush';
      }
      return 'straightflush';
    }
  }
  
  // 四条
  if (counts[0] === 4) return 'fourcard';
  
  // 葫芦
  if (counts[0] === 3 && counts[1] >= 2) return 'fullhouse';
  
  // 同花
  if (isFlush) return 'flush';
  
  // 顺子
  if (isStraight) return 'straight';
  
  // 三条
  if (counts[0] === 3) return 'threecard';
  
  // 两对
  if (counts[0] === 2 && counts[1] === 2) return 'twopair';
  
  // 一对
  if (counts[0] === 2) return 'onepair';
  
  return 'highcard';
}
