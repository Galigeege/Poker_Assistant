export enum Suit {
  HEARTS = '♥',
  DIAMONDS = '♦',
  CLUBS = '♣',
  SPADES = '♠',
}

export enum Rank {
  TWO = '2', THREE = '3', FOUR = '4', FIVE = '5', SIX = '6',
  SEVEN = '7', EIGHT = '8', NINE = '9', TEN = '10',
  JACK = 'J', QUEEN = 'Q', KING = 'K', ACE = 'A',
}

export interface Card {
  suit: Suit;
  rank: Rank;
  hidden?: boolean;
}

export enum PlayerType {
  HUMAN = 'HUMAN',
  BOT = 'BOT',
}

export enum ActionType {
  FOLD = 'FOLD',
  CHECK = 'CHECK',
  CALL = 'CALL',
  RAISE = 'RAISE',
  ALL_IN = 'ALL_IN',
}

export interface Player {
  id: string;
  name: string;
  type: PlayerType;
  chips: number;
  bet: number;
  cards: Card[];
  status: 'active' | 'folded' | 'all-in' | 'waiting';
  action?: ActionType; // Last action taken
  avatarSeed: string;
  persona?: string; // e.g., "Aggressive"
}

export interface GameConfig {
  bigBlind: number;
  startStack: number;
  difficulty: 'Fish' | 'Regular' | 'Pro' | 'GTO';
  aiPersona: boolean;
  showOdds: boolean;
  aiAdvice: boolean;
}

export interface HandHistory {
  id: number;
  result: 'Win' | 'Loss';
  profit: number;
  hand: string; // e.g. "AhKh"
  date: string;
}
