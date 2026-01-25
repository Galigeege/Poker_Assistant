/**
 * 会话数据服务
 * 处理游戏会话和回合的数据获取和保存
 */
import { apiClient } from './api';

export interface GameSession {
  id: string;
  started_at: string;
  ended_at: string | null;
  total_hands: number;
  total_profit: number;
  win_rate: number;
  vpip: number;
  config: any;
}

export interface GameRound {
  id: string;
  round_number: number;
  hero_hole_cards: string[];
  community_cards: string[];
  street_history: any[];
  player_actions: any[];
  winners: any[];
  hand_info: any[];
  hero_profit: number;
  pot_size: number;
  review_analysis: any | null;
  created_at: string;
}

export interface SessionDetail extends GameSession {
  rounds: GameRound[];
}

export interface UserStatistics {
  total_sessions: number;
  total_hands: number;
  total_profit: number;
  win_rate: number;
  vpip: number;
}

/**
 * 创建新的游戏会话
 */
export async function createSession(config?: any): Promise<GameSession> {
  // 后端期望直接接收 config 作为 Body，而不是包装在对象中
  return await apiClient.post<GameSession>('/api/game/sessions', config || {});
}

/**
 * 获取用户的所有游戏会话
 */
export async function getSessions(limit: number = 100, skip: number = 0): Promise<GameSession[]> {
  const response = await apiClient.get<{ sessions: GameSession[] }>(
    `/api/game/sessions?limit=${limit}&skip=${skip}`
  );
  return response.sessions;
}

/**
 * 获取游戏会话详情（包含所有回合）
 */
export async function getSessionDetail(sessionId: string): Promise<SessionDetail> {
  return await apiClient.get<SessionDetail>(`/api/game/sessions/${sessionId}`);
}

/**
 * 获取游戏回合详情
 */
export async function getRoundDetail(sessionId: string, roundId: string): Promise<GameRound> {
  return await apiClient.get<GameRound>(`/api/game/sessions/${sessionId}/rounds/${roundId}`);
}

/**
 * 获取用户统计数据
 */
export async function getStatistics(): Promise<UserStatistics> {
  return await apiClient.get<UserStatistics>('/api/game/statistics');
}

/**
 * 创建游戏回合
 */
export async function createRound(
  sessionId: string,
  roundData: {
    hero_hole_cards: string[];
    community_cards: string[];
    street_history: any[];
    player_actions: any[];
    winners: any[];
    hand_info: any[];
    hero_profit: number;
    pot_size: number;
    review_analysis?: any;
  }
): Promise<GameRound> {
  return await apiClient.post<GameRound>(
    `/api/game/sessions/${sessionId}/rounds`,
    roundData
  );
}

/**
 * 保存回合的复盘分析
 */
export async function saveRoundReview(
  sessionId: string,
  roundId: string,
  reviewAnalysis: any
): Promise<{ id: string; review_analysis: any }> {
  return await apiClient.post<{ id: string; review_analysis: any }>(
    `/api/game/sessions/${sessionId}/rounds/${roundId}/review`,
    reviewAnalysis
  );
}

