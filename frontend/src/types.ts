export type Card = string; // "Ah", "Td", "2s" etc.

export interface Player {
  uuid: string;
  name: string;
  stack: number;
  state: 'participating' | 'folded' | 'allin';
  position?: number; // Seat index
  is_dealer?: boolean;
  position_label?: string; // BTN, SB, BB, UTG, etc.
  last_action?: {
    action: string;
    amount: number;
  };
  hole_cards?: Card[]; // Only visible for Hero or at showdown
  street_bet?: number; // Total amount bet by this player in current street
}

export interface Pot {
  amount: number;
}

export interface GameState {
  round_count: number;
  street: 'preflop' | 'flop' | 'turn' | 'river' | 'showdown';
  small_blind: number;
  big_blind: number;
  pot: Pot;
  community_cards: Card[];
  players: Player[];
  hero_uuid: string;
  current_player_uuid?: string;
  dealer_btn?: number;
  winners?: any[];
}

export interface ActionRequest {
  valid_actions: Array<{ action: string; amount: { min: number; max: number } }>;
  hole_card: Card[];
  round_state: any; // Detailed raw state from engine if needed
  call_amount: number; // Amount needed to call
  ai_advice?: {
    primary_strategy?: {
      action: string;
      amount: string;
      reason: string;
      frequency?: string;
    };
    alternative_strategy?: {
      action: string;
      amount: string;
      reason: string;
      frequency?: string;
    };
    reasoning?: string; // Fallback or main analysis
    win_probability?: string;
    risk_level?: string;
    recommended_action?: string;
  };
}

export interface RoundResult {
  winners: Array<{
    uuid: string;
    stack: number;
  }>;
  hand_info?: Array<{
    uuid: string;
    hand?: {
      hand?: {
        strength?: string;
      };
      strength?: string;
      high?: number;
      low?: number;
    } | string;
  }>;
  round_state: {
    seats: Player[];
    pot: { main: { amount: number } };
    community_card: Card[];
    dealer_btn?: number;
  };
  initial_stacks?: Record<string, number>;
  player_hole_cards?: Record<string, Card[]>;
}

// Street history for review
export interface StreetAction {
  player: string;
  action: string;
  amount: number;
}

export interface StreetData {
  street: string;
  community_cards: Card[];
  actions: StreetAction[];
}

// AI Review Analysis - Structured per-street analysis
export interface StreetReviewData {
  street: string;
  community_cards: Card[];
  hero_action: string | null;  // 玩家的行动，null 表示未行动
  hero_action_amount?: number;
  ai_recommendation: string;   // AI 建议的行动
  ai_recommendation_amount?: number;
  opponent_actions: string;    // 对手行动摘要
  analysis: string;            // 分析理由
  is_correct: boolean;         // 玩家行动是否正确
  conclusion?: string;         // 结论评语
}

export interface ReviewAnalysis {
  streets: StreetReviewData[];
  overall_summary?: string;
  error?: string;
}

export type WebSocketMessage = 
  | { type: 'system'; content: string }
  | { type: 'needs_api_key'; content: string }
  | { type: 'game_start'; data: any }
  | { type: 'round_start'; data: { round_count: number; hole_card: string[]; seats: any[]; dealer_btn?: number } }
  | { type: 'street_start'; data: { street: string; round_state: any } }
  | { type: 'game_update'; data: { action: any; round_state: any } }
  | { type: 'action_request'; data: ActionRequest }
  | { type: 'round_result'; data: RoundResult }
  | { type: 'review_request'; data: any }
  | { type: 'review_result'; data: ReviewAnalysis };

