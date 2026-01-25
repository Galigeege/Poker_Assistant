/**
 * 游戏数据适配器
 * 将前端数据格式转换为后端 API 格式
 */
import type { RoundResult, StreetData, Player, Card } from '../types';

/**
 * 将 RoundResult 和 StreetData 转换为后端 API 需要的格式
 */
export function convertRoundDataToAPI(
  roundResult: RoundResult,
  streetHistory: StreetData[],
  reviewAnalysis: any | null,
  currentRoundInitialStacks?: Record<string, number>,
  heroHoleCardsFromState?: Card[]
): {
  hero_hole_cards: string[];
  community_cards: string[];
  street_history: any[];
  player_actions: any[];
  winners: any[];
  hand_info: any[];
  hero_profit: number;
  pot_size: number;
  review_analysis: any | null;
} {
  // Get hero UUID
  const heroUuid = roundResult.round_state.seats.find((s: Player) => s.name === '你')?.uuid;
  if (!heroUuid) {
    throw new Error('Hero UUID not found');
  }

  // Get hero hole cards
  let heroHoleCards: string[] = [];
  if (roundResult.player_hole_cards?.[heroUuid] && roundResult.player_hole_cards[heroUuid].length > 0) {
    heroHoleCards = roundResult.player_hole_cards[heroUuid];
  } else if (heroHoleCardsFromState && heroHoleCardsFromState.length > 0) {
    heroHoleCards = heroHoleCardsFromState;
  }

  // Calculate hero profit
  const initialStacks = roundResult.initial_stacks || currentRoundInitialStacks || {};
  const heroInitialStack = initialStacks[heroUuid] ?? 0;
  const heroSeat = roundResult.round_state.seats.find((s: Player) => s.uuid === heroUuid);
  const heroFinalStack = heroSeat ? heroSeat.stack : 0;
  const heroProfit = heroFinalStack - heroInitialStack;

  // Convert street history to API format
  // 保存 seats 信息到第一个 street（preflop），用于后续数据恢复
  const apiStreetHistory = streetHistory.map((street, idx) => {
    const streetData: any = {
      street: street.street,
      community_cards: street.community_cards,
      actions: street.actions.map(action => ({
        player: action.player,
        action: action.action,
        amount: action.amount
      }))
    };
    // 在第一个 street（preflop）中保存 seats 信息，用于后续数据恢复
    if (idx === 0 && roundResult.round_state.seats) {
      streetData.seats = roundResult.round_state.seats;
    }
    return streetData;
  });

  // Extract player actions (all actions from all streets)
  const playerActions: any[] = [];
  streetHistory.forEach(street => {
    street.actions.forEach(action => {
      playerActions.push({
        street: street.street,
        player: action.player,
        action: action.action,
        amount: action.amount
      });
    });
  });

  // Convert winners (include name from seats)
  const winners = roundResult.winners.map((w: any) => {
    const winnerSeat = roundResult.round_state.seats.find((s: Player) => s.uuid === w.uuid);
    return {
      uuid: w.uuid,
      name: (w as any).name || winnerSeat?.name || 'Unknown',
      stack: w.stack
    };
  });

  // Convert hand info (ensure it includes player names from seats)
  const handInfo = (roundResult.hand_info || []).map((hand: any) => {
    // 如果 hand_info 中没有 name，从 seats 中查找
    if (!hand.name && !hand.player_name) {
      const playerSeat = roundResult.round_state.seats.find((s: Player) => s.uuid === hand.uuid);
      return {
        ...hand,
        name: playerSeat?.name || 'Unknown',
        player_name: playerSeat?.name || 'Unknown'
      };
    }
    return hand;
  });

  return {
    hero_hole_cards: heroHoleCards,
    community_cards: roundResult.round_state.community_card || [],
    street_history: apiStreetHistory,
    player_actions: playerActions,
    winners: winners,
    hand_info: handInfo,
    hero_profit: heroProfit,
    pot_size: roundResult.round_state.pot?.main?.amount || 0,
    review_analysis: reviewAnalysis
  };
}

