import { create } from 'zustand';
import type { GameState, WebSocketMessage, ActionRequest, Card, RoundResult, Player, StreetData, ReviewAnalysis } from '../types';
import { createSession, createRound } from '../services/sessionService';
import { convertRoundDataToAPI } from '../services/gameDataAdapter';
import { useAuthStore } from './useAuthStore';

// Helper function to save round result to session history
function saveRoundToSession(roundResult: RoundResult, streetHistory: StreetData[], reviewAnalysis: ReviewAnalysis | null, currentRoundInitialStacks?: Record<string, number>, heroHoleCardsFromState?: Card[]) {
  try {
    // Get or create current session
    const sessionId = localStorage.getItem('current_session_id') || `session_${Date.now()}`;
    if (!localStorage.getItem('current_session_id')) {
      localStorage.setItem('current_session_id', sessionId);
    }
    
    // Load existing session data
    const sessionKey = `session_${sessionId}`;
    const existingSession = localStorage.getItem(sessionKey);
    let sessionData: any = existingSession ? JSON.parse(existingSession) : {
      id: sessionId,
      startTime: new Date().toISOString(),
      rounds: [],
      totalHands: 0,
      totalProfit: 0,
      totalWins: 0,
      totalLosses: 0
    };
    
    // Calculate round profit
    const heroUuid = roundResult.round_state.seats.find((s: Player) => s.name === '你')?.uuid;
    if (!heroUuid) {
      console.error('[Store] Hero UUID not found, cannot save round');
      return;
    }
    
    const heroSeat = roundResult.round_state.seats.find((s: Player) => s.uuid === heroUuid);
    const initialStacks = roundResult.initial_stacks || {};
    
    // Get initial stack for this round
    // Priority: 1) roundResult.initial_stacks (from backend), 2) currentRoundInitialStacks (from round_start), 3) previous round's final stack
    let heroInitialStack: number | undefined = initialStacks[heroUuid];
    if (heroInitialStack === undefined || heroInitialStack === null) {
      // Try to get from currentRoundInitialStacks (passed as parameter)
      heroInitialStack = currentRoundInitialStacks?.[heroUuid];
    }
    
    const heroFinalStack = heroSeat ? heroSeat.stack : 0;
    
    // Calculate profit: final stack - initial stack for this round
    let roundProfit = 0;
    if (heroInitialStack !== undefined && heroInitialStack !== null) {
      roundProfit = heroFinalStack - heroInitialStack;
    } else {
      console.warn('[Store] Initial stack not available, trying fallback calculation');
      // Fallback: try to calculate from previous round's final stack
      const previousRound = sessionData.rounds.length > 0 ? sessionData.rounds[sessionData.rounds.length - 1] : null;
      if (previousRound && previousRound.heroFinalStack !== undefined) {
        heroInitialStack = previousRound.heroFinalStack;
        roundProfit = heroFinalStack - (heroInitialStack || 0);
      } else {
        console.error('[Store] Cannot calculate profit: no initial stack available');
        roundProfit = 0;
        heroInitialStack = 0; // Set default for storage
      }
    }
    
    // isWin: Hero is in winners list (successfully won the pot)
    const isWin = roundResult.winners.some(w => w.uuid === heroUuid);
    
    // Get hero hole cards - try multiple sources with priority
    let heroHoleCards: string[] = [];
    
    // Priority 1: from roundResult.player_hole_cards (most reliable)
    if (roundResult.player_hole_cards?.[heroUuid] && roundResult.player_hole_cards[heroUuid].length > 0) {
      heroHoleCards = roundResult.player_hole_cards[heroUuid];
      console.log('[Store] Hero cards from roundResult.player_hole_cards:', heroHoleCards);
    } 
    // Priority 2: from heroHoleCardsFromState (passed from store state)
    else if (heroHoleCardsFromState && heroHoleCardsFromState.length > 0) {
      heroHoleCards = heroHoleCardsFromState;
      console.log('[Store] Hero cards from state:', heroHoleCards);
    }
    // Priority 3: try to get from roundState.seats (if available)
    else {
      const heroSeat = roundResult.round_state.seats.find((s: Player) => s.uuid === heroUuid);
      // Note: roundState.seats typically doesn't contain hole cards, but we check anyway
      console.log('[Store] Hero cards not found in player_hole_cards or state, heroSeat:', heroSeat);
    }
    
    // Filter player hole cards: only show cards for players who went to showdown
    // Players who folded should not have their cards exposed
    const showdownPlayerUuids = new Set<string>();
    roundResult.winners.forEach(w => showdownPlayerUuids.add(w.uuid));
    // Also include players in hand_info (they showed their cards)
    if (roundResult.hand_info) {
      roundResult.hand_info.forEach((hi: any) => {
        if (hi.uuid) showdownPlayerUuids.add(hi.uuid);
      });
    }
    
    // Filter hole cards: only show for showdown players
    // IMPORTANT: Always include hero's cards, even if not in player_hole_cards
    const visibleHoleCards: Record<string, string[]> = {};
    
    // Always add hero's cards first (CRITICAL: Hero's cards should always be visible)
    if (heroHoleCards && heroHoleCards.length > 0) {
      visibleHoleCards[heroUuid] = heroHoleCards;
      console.log('[Store] Added hero cards to visibleHoleCards:', heroHoleCards);
    } else {
      console.warn('[Store] WARNING: Hero cards not found! heroUuid:', heroUuid, 'player_hole_cards:', roundResult.player_hole_cards, 'heroHoleCardsFromState:', heroHoleCardsFromState);
    }
    
    // Then add showdown players' cards
    if (roundResult.player_hole_cards) {
      Object.entries(roundResult.player_hole_cards).forEach(([uuid, cards]) => {
        // Skip hero (already added), only add opponent cards if they went to showdown
        if (uuid !== heroUuid && showdownPlayerUuids.has(uuid)) {
          visibleHoleCards[uuid] = cards;
        }
      });
    }
    
    console.log('[Store] Final visibleHoleCards:', visibleHoleCards);
    
    // Create round record with detailed information
    const roundRecord = {
      id: `round_${Date.now()}`,
      timestamp: new Date().toISOString(),
      profit: roundProfit,
      isWin: isWin,
      pot: roundResult.round_state.pot?.main?.amount || 0,
      communityCards: roundResult.round_state.community_card || [],
      winners: roundResult.winners.map(w => ({
        uuid: w.uuid,
        name: roundResult.round_state.seats.find((s: Player) => s.uuid === w.uuid)?.name || 'Unknown',
        stack: w.stack
      })),
      // Detailed street history with all actions
      streetHistory: streetHistory,
      // AI review analysis (can be added later via replay page)
      reviewAnalysis: reviewAnalysis,
      // Full round state for reference
      roundState: roundResult.round_state,
      // Hand info (showdown results)
      handInfo: roundResult.hand_info || [],
      // Player hole cards (only visible for showdown players)
      playerHoleCards: visibleHoleCards,
      // Hero's initial and final stack for this round
      heroInitialStack: heroInitialStack ?? 0,
      heroFinalStack: heroFinalStack
    };
    
    // Update session data
    sessionData.rounds.push(roundRecord);
    sessionData.totalHands = sessionData.rounds.length;
    sessionData.totalProfit = sessionData.rounds.reduce((sum: number, r: any) => sum + r.profit, 0);
    // Win rate: total wins (successfully won pot) / total hands
    sessionData.totalWins = sessionData.rounds.filter((r: any) => r.isWin).length;
    sessionData.totalLosses = sessionData.rounds.filter((r: any) => !r.isWin).length;
    sessionData.lastUpdate = new Date().toISOString();
    
    // Save session data
    localStorage.setItem(sessionKey, JSON.stringify(sessionData));
    
    // Update sessions list
    const sessionsKey = 'poker_sessions';
    const existingSessions = localStorage.getItem(sessionsKey);
    let sessions: any[] = existingSessions ? JSON.parse(existingSessions) : [];
    
    // Find or create session summary
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    const sessionSummary = {
      id: sessionId,
      date: sessionData.startTime,
      hands: sessionData.totalHands,
      profit: sessionData.totalProfit,
      winRate: sessionData.totalHands > 0 
        ? (sessionData.totalWins / sessionData.totalHands) * 100 
        : 0,
      bigBlind: 10, // TODO: Get from game config
      result: sessionData.totalProfit > 0 ? 'win' as const 
        : sessionData.totalProfit < 0 ? 'loss' as const 
        : 'break-even' as const
    };
    
    if (sessionIndex >= 0) {
      sessions[sessionIndex] = sessionSummary;
    } else {
      sessions.push(sessionSummary);
    }
    
    // Sort by date (newest first)
    sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    localStorage.setItem(sessionsKey, JSON.stringify(sessions));
    
    console.log('[Store] Round saved to session (localStorage):', sessionId);
    
    // 尝试保存到后端 API
    const backendSessionId = localStorage.getItem(`backend_session_${sessionId}`);
    if (backendSessionId) {
      try {
        // 转换数据格式
        const apiRoundData = convertRoundDataToAPI(
          roundResult,
          streetHistory,
          reviewAnalysis,
          currentRoundInitialStacks,
          heroHoleCardsFromState
        );
        
        // 保存到后端
        createRound(backendSessionId, apiRoundData).then((savedRound) => {
          console.log('[Store] Round saved to backend API:', savedRound.id);
          // 保存回合 ID 映射（用于后续的复盘分析保存）
          localStorage.setItem(`backend_round_${roundRecord.id}`, savedRound.id);
        }).catch((error) => {
          console.error('[Store] Failed to save round to backend API:', error);
          // 如果 API 保存失败，数据仍然在 localStorage 中，可以稍后重试
        });
      } catch (conversionError) {
        console.error('[Store] Failed to convert round data for API:', conversionError);
      }
    } else {
      console.log('[Store] No backend session ID found, skipping API save');
    }
  } catch (error) {
    console.error('[Store] Failed to save round to session:', error);
  }
}

// Helper function to calculate each player's street bet from action_histories
function calculateStreetBets(roundState: any, currentStreet: string): Map<string, number> {
  const bets = new Map<string, number>();
  
  if (!roundState?.action_histories || !currentStreet) {
    return bets;
  }
  
  const streetActions = roundState.action_histories[currentStreet];
  if (!streetActions || !Array.isArray(streetActions)) {
    return bets;
  }
  
  // Sum up all bets/raises for each player in current street
  // Each action has format: { action: string, amount: number, uuid?: string, player_uuid?: string }
  for (const action of streetActions) {
    const uuid = action.uuid || action.player_uuid;
    const actionType = action.action?.toLowerCase();
    const amount = action.amount || 0;
    
    if (!uuid || amount <= 0) continue;
    
    // Only count call, raise, and bet actions (not fold)
    if (actionType === 'call' || actionType === 'raise' || actionType === 'bet' || actionType === 'bigblind' || actionType === 'smallblind') {
      const currentBet = bets.get(uuid) || 0;
      bets.set(uuid, currentBet + amount);
    }
  }
  
  return bets;
}

// Helper function to calculate position labels
function calculatePositionLabels(players: Player[], dealerBtn?: number): Map<string, string> {
  const labels = new Map<string, string>();
  if (dealerBtn === undefined || players.length === 0) return labels;
  
  const playerCount = players.length;
  
  players.forEach((player, index) => {
    // Calculate steps from BTN (clockwise distance)
    const stepsFromBtn = (index - dealerBtn + playerCount) % playerCount;
    
    if (stepsFromBtn === 0) {
      labels.set(player.uuid, 'BTN');
    } else if (playerCount === 2) {
      // Heads up: dealer is BTN/SB, other is BB
      labels.set(player.uuid, 'BB');
    } else if (stepsFromBtn === 1) {
      labels.set(player.uuid, 'SB');
    } else if (stepsFromBtn === 2) {
      labels.set(player.uuid, 'BB');
    } else if (stepsFromBtn === 3) {
      labels.set(player.uuid, 'UTG');
    } else if (stepsFromBtn === playerCount - 1) {
      labels.set(player.uuid, 'CO'); // Cut-off (right before BTN)
    } else if (stepsFromBtn === playerCount - 2) {
      labels.set(player.uuid, 'HJ'); // Hijack (right before CO)
    } else {
      // Middle positions: UTG+1, UTG+2, etc.
      const mpPosition = stepsFromBtn - 3; // 0-based MP position
      if (mpPosition === 1) {
        labels.set(player.uuid, 'UTG+1');
      } else if (mpPosition === 2) {
        labels.set(player.uuid, 'UTG+2');
      } else {
        labels.set(player.uuid, 'MP');
      }
    }
  });
  
  return labels;
}

interface GameStore {
  // Connection State
  isConnected: boolean;
  isConnecting: boolean;
  socket: WebSocket | null;
  
  // Game State
  isPlaying: boolean; // True if inside a game session
  gameState: GameState | null;
  communityCards: Card[]; // Community cards on board
  pot: number; // Current pot size
  players: Player[]; // All players including Hero
  
  // Hero State
  heroHoleCards: Card[];
  actionRequest: ActionRequest | null; // If not null, it's Hero's turn
  
  // AI Copilot
  aiCopilotEnabled: boolean; // Whether AI Copilot is enabled (default: false)
  
  // Round Result
  roundResult: RoundResult | null;
  waitingForNextRound: boolean; // True if waiting for user to click "Next Round"
  pendingRoundStart: any; // Pending round_start data when waiting for next round
  pendingEvents: any[]; // Queue of pending events when waiting for next round
  
  // Street History for Review
  streetHistory: StreetData[];
  currentStreet: string;
  
  // Review Analysis
  reviewAnalysis: ReviewAnalysis | null;
  isReviewLoading: boolean;
  
  // Current Round Initial Stacks (for profit calculation)
  currentRoundInitialStacks: Record<string, number>;
  
  // Logs
  logs: string[];

  // API Key Prompt
  needsApiKey: boolean;
  needsApiKeyMessage: string | null;

  // Actions
  connect: () => void;
  disconnect: () => void;
  sendAction: (action: string, amount: number) => void;
  startNextRound: () => void;
  addLog: (msg: string) => void;
  setAiCopilotEnabled: (enabled: boolean) => void;
  requestReview: () => void;
  clearReview: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  isConnected: false,
  isConnecting: false,
  socket: null,
  isPlaying: false,
  gameState: null,
  communityCards: [],
  pot: 0,
  players: [],
  heroHoleCards: [],
  actionRequest: null,
  aiCopilotEnabled: false, // 默认关闭，避免影响游戏节奏
  roundResult: null,
  waitingForNextRound: false,
  pendingRoundStart: null,
  pendingEvents: [],
  streetHistory: [],
  currentStreet: '',
  reviewAnalysis: null,
  isReviewLoading: false,
  currentRoundInitialStacks: {},
  logs: [],
  needsApiKey: false,
  needsApiKeyMessage: null,

  connect: () => {
    const currentSocket = get().socket;
    // 如果已经连接，直接返回
    if (currentSocket && currentSocket.readyState === WebSocket.OPEN) {
      console.log('[Store] Already connected');
      return;
    }
    
    // 如果 socket 存在但未打开，先关闭
    if (currentSocket) {
      currentSocket.close();
    }

    set({ isConnecting: true });
    
    // 获取 token 并添加到查询参数
    const token = useAuthStore.getState().token;
    if (!token) {
      console.error('[Store] No token available, cannot connect to WebSocket');
      set({ isConnecting: false });
      get().addLog('错误: 未登录，无法连接游戏服务器');
      return;
    }
    
    // WebSocket URL 配置：
    // 1. 如果设置了 VITE_WS_URL 环境变量，直接使用（生产环境）
    // 2. 否则，在开发环境使用 vite proxy（/ws），生产环境使用当前域名
    const wsBaseUrl = import.meta.env.VITE_WS_URL;
    let wsUrl: string;
    
    if (wsBaseUrl) {
      // 使用环境变量配置的 WebSocket URL（生产环境）
      wsUrl = `${wsBaseUrl}/ws/game?token=${encodeURIComponent(token)}`;
    } else {
      // 开发环境：使用 vite proxy（/ws -> ws://localhost:8000/ws/game）
      // 生产环境：假设前后端同域，使用当前域名
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      wsUrl = `${protocol}//${window.location.host}/ws/game?token=${encodeURIComponent(token)}`;
    } 
    
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('[Store] WS Connected - will resume existing game if available');
      set({ isConnected: true, isConnecting: false, logs: [...get().logs, '已连接到服务器'] });
    };

    socket.onclose = () => {
      console.log('[Store] WS Disconnected');
      set({ isConnected: false, isConnecting: false, socket: null, logs: [...get().logs, '已断开连接'] });
    };

    socket.onmessage = (event) => {
      const msg = JSON.parse(event.data) as WebSocketMessage;
      handleMessage(msg, set, get);
    };

    set({ socket });
  },

  disconnect: () => {
    get().socket?.close();
    set({ socket: null, isConnected: false, isPlaying: false });
    // 不断开连接时不清除 session ID，允许用户重新连接后恢复游戏
    // 只有在用户明确要求新游戏时才清除 session ID
  },
  
  startNewGame: () => {
    // 明确要求开始新游戏
    const socket = get().socket;
    if (socket && socket.readyState === WebSocket.OPEN) {
      // 清除当前 session ID，开始新 session
      localStorage.removeItem('current_session_id');
      // 发送新游戏请求
      socket.send(JSON.stringify({ type: 'new_game' }));
    } else {
      // 如果未连接，先连接，然后清除 session ID
      localStorage.removeItem('current_session_id');
      get().connect();
    }
  },

  sendAction: (action, amount) => {
    const socket = get().socket;
    if (socket && socket.readyState === WebSocket.OPEN) {
      const payload = {
        type: 'player_action',
        data: { action, amount }
      };
      socket.send(JSON.stringify(payload));
      set({ actionRequest: null }); // Clear action request immediately after sending
      console.log('Sent Action:', payload);
    }
  },

  addLog: (msg) => set((state) => ({ logs: [...state.logs, msg] })),
  
  setAiCopilotEnabled: (enabled) => {
    set({ aiCopilotEnabled: enabled });
    // 发送设置到后端
    const socket = get().socket;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        type: 'ai_copilot_setting',
        data: { enabled }
      }));
    }
  },
  
  requestReview: () => {
    const socket = get().socket;
    const { roundResult, heroHoleCards, streetHistory } = get();
    
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      console.error('[Store] Cannot request review: socket not connected');
      return;
    }
    
    if (!roundResult) {
      console.error('[Store] Cannot request review: no round result');
      return;
    }
    
    set({ isReviewLoading: true });
    
    // 发送复盘请求到后端
    const reviewData = {
      hero_hole_cards: heroHoleCards,
      community_cards: roundResult.round_state.community_card || [],
      street_history: streetHistory,
      winners: roundResult.winners,
      hand_info: roundResult.hand_info || [],
      final_pot: roundResult.round_state.pot?.main?.amount || 0,
      seats: roundResult.round_state.seats
    };
    
    console.log('[Store] Requesting review with data:', reviewData);
    socket.send(JSON.stringify({
      type: 'review_request',
      data: reviewData
    }));
  },
  
  clearReview: () => {
    set({ 
      reviewAnalysis: null, 
      isReviewLoading: false,
      streetHistory: [],
      currentStreet: ''
    });
  },
  
  startNextRound: () => {
    const pendingData = get().pendingRoundStart;
    const pendingEvents = [...get().pendingEvents]; // Copy the array before clearing
    
    console.log('[Store] startNextRound called. pendingData:', !!pendingData, 'pendingEvents:', pendingEvents.length);
    
    // Clear the result modal and waiting state first
    set({ 
      roundResult: null, 
      waitingForNextRound: false,
      pendingRoundStart: null,
      pendingEvents: []
    });
    
    // Always send message to backend to signal next round
    const socket = get().socket;
    if (socket && socket.readyState === WebSocket.OPEN) {
      console.log('[Store] Sending start_next_round to backend');
      socket.send(JSON.stringify({ type: 'start_next_round' }));
    } else {
      console.error('[Store] Cannot send start_next_round: socket not open', {
        socket: !!socket,
        readyState: socket?.readyState
      });
    }
    
    // If we have pending round start data, process it now
    if (pendingData) {
      console.log('[Store] Processing pending round_start:', pendingData);
      
      // Calculate position labels
      const positionLabels = calculatePositionLabels(pendingData.seats, pendingData.dealer_btn);
      const playersWithPositions = pendingData.seats.map((seat: any) => ({
        ...seat,
        position_label: positionLabels.get(seat.uuid),
        is_dealer: seat.uuid === pendingData.seats[pendingData.dealer_btn || 0]?.uuid
      }));
      
      // Store initial stacks for this round
      const initialStacksForRound: Record<string, number> = {};
      pendingData.seats.forEach((seat: any) => {
        initialStacksForRound[seat.uuid] = seat.stack;
      });
      
      set({ 
        heroHoleCards: pendingData.hole_card,
        actionRequest: null,
        communityCards: [],
        pot: 0,
        players: playersWithPositions,
        streetHistory: [],
        currentStreet: '',
        reviewAnalysis: null,
        isReviewLoading: false,
        currentRoundInitialStacks: initialStacksForRound
      });
      
      get().addLog(`第 ${pendingData.round_count || '?'} 局开始，手牌: ${pendingData.hole_card?.join(' ') || 'N/A'}`);
    }
    
    // Process any pending events after a short delay to ensure state is updated
    // This should happen regardless of whether pendingData exists
    if (pendingEvents.length > 0) {
      console.log('[Store] Processing pending events:', pendingEvents.length);
      // Use setTimeout to ensure the state is fully updated before processing
      setTimeout(() => {
        pendingEvents.forEach((event: any) => {
          console.log('[Store] Replaying event:', event.type);
          handleMessage(event, set, get);
        });
      }, 50);
    }
  },
}));

// Message Handler Logic
function handleMessage(msg: WebSocketMessage, set: any, get: any) {
  console.log('RX:', msg);

  switch (msg.type) {
    case 'system':
      get().addLog(`[System] ${msg.content}`);
      break;

    case 'needs_api_key':
      set({
        needsApiKey: true,
        needsApiKeyMessage: (msg as any).content || '请配置 API Key 以启用 AI 功能',
      });
      get().addLog(`[System] ${(msg as any).content || '需要配置 API Key'}`);
      break;

    case 'game_start':
      set({ isPlaying: true });
      get().addLog('游戏开始！');
      // 创建后端会话（如果还没有创建）
      const existingBackendSessionId = localStorage.getItem('current_session_id');
      if (!existingBackendSessionId) {
        // 从 localStorage 读取游戏配置
        const savedConfig = localStorage.getItem('gameConfig');
        let config = null;
        if (savedConfig) {
          try {
            const parsed = JSON.parse(savedConfig);
            config = {
              small_blind: parsed.smallBlind,
              big_blind: parsed.bigBlind,
              initial_stack: parsed.startStack,
            };
          } catch (e) {
            console.error('[Store] Failed to parse game config:', e);
          }
        }
        
        createSession(config).then((backendSession) => {
          console.log('[Store] Backend session created:', backendSession.id);
          // 保存后端会话 ID 到 localStorage
          const frontendSessionId = backendSession.id;
          localStorage.setItem('current_session_id', frontendSessionId);
          localStorage.setItem(`backend_session_${frontendSessionId}`, backendSession.id);
          get().addLog(`[System] Backend session created: ${backendSession.id}`);
        }).catch((error) => {
          console.error('[Store] Failed to create backend session:', error);
          get().addLog(`[System] 错误: 无法创建游戏会话 (${error.message})`);
        });
      } else {
        console.log('[Store] Using existing backend session:', existingBackendSessionId);
      }
      break;

    case 'round_start':
      // If we're waiting for user to click "Next Round", ignore this message
      // and queue it for later
      if (get().waitingForNextRound) {
        console.log('[Store] round_start received but waiting for next round, storing for later');
        // Store the pending round start data
        set({ pendingRoundStart: msg.data });
        return;
      }
      
      // Initialize basic round state
      console.log('[Store] round_start received:', msg.data);
      console.log('[Store] hole_card:', msg.data.hole_card, 'Type:', typeof msg.data.hole_card, 'isArray:', Array.isArray(msg.data.hole_card));
      
      // Calculate position labels
      const positionLabels = calculatePositionLabels(msg.data.seats, msg.data.dealer_btn);
      const playersWithPositions = msg.data.seats.map((seat: any) => ({
        ...seat,
        position_label: positionLabels.get(seat.uuid),
        is_dealer: seat.uuid === msg.data.seats[msg.data.dealer_btn || 0]?.uuid
      }));
      
      // Store initial stacks for this round (for profit calculation)
      const initialStacksForRound: Record<string, number> = {};
      msg.data.seats.forEach((seat: any) => {
        initialStacksForRound[seat.uuid] = seat.stack;
      });
      
      console.log('[Store] round_start - Saving heroHoleCards:', msg.data.hole_card);
      console.log('[Store] round_start - Saving initialStacks:', initialStacksForRound);
      
      set({ 
        heroHoleCards: msg.data.hole_card || [],
        actionRequest: null,
        communityCards: [], // Reset board
        pot: 0,
        players: playersWithPositions,
        roundResult: null,
        waitingForNextRound: false,
        pendingRoundStart: null,
        // Reset street history for new round
        streetHistory: [],
        currentStreet: '',
        reviewAnalysis: null,
        isReviewLoading: false,
        // Store initial stacks for this round
        currentRoundInitialStacks: initialStacksForRound
      });
      get().addLog(`第 ${msg.data.round_count} 局开始，手牌: ${msg.data.hole_card?.join(' ') || 'N/A'}`);
      break;
    
    case 'street_start':
      // If waiting for next round, queue the event
      if (get().waitingForNextRound) {
        console.log('[Store] street_start received but waiting for next round, queuing');
        set({ pendingEvents: [...get().pendingEvents, msg] });
        return;
      }
      
      // Update community cards and pot from round_state
      if (msg.data.round_state) {
        const dealerBtn = msg.data.round_state.dealer_btn;
        const positionLabels = calculatePositionLabels(msg.data.round_state.seats, dealerBtn);
        
        // New street - reset street bets to 0 (new betting round)
        const playersWithPositions = msg.data.round_state.seats.map((seat: any) => ({
          ...seat,
          position_label: positionLabels.get(seat.uuid),
          is_dealer: dealerBtn !== undefined && seat.uuid === msg.data.round_state.seats[dealerBtn]?.uuid,
          street_bet: 0, // Reset at start of new street
          last_action: undefined // Clear last action at new street
        }));
        
        const newCommunityCards = msg.data.round_state.community_card || [];
        
        set({
          communityCards: newCommunityCards,
          pot: msg.data.round_state.pot?.main?.amount || 0,
          players: playersWithPositions,
          currentStreet: msg.data.street
        });
        
        // Add new street to history
        const currentHistory = get().streetHistory;
        const streetData: StreetData = {
          street: msg.data.street,
          community_cards: newCommunityCards,
          actions: []
        };
        set({ streetHistory: [...currentHistory, streetData] });
      }
      console.log('[Store] After street_start, heroHoleCards:', get().heroHoleCards);
      // Format street name in Chinese
      const streetNames: Record<string, string> = {
        'preflop': '翻牌前',
        'flop': '翻牌圈',
        'turn': '转牌圈',
        'river': '河牌圈'
      };
      const streetName = streetNames[msg.data.street] || msg.data.street;
      get().addLog(`进入 ${streetName}`);
      break;

    case 'action_request':
      // If waiting for next round, queue the event
      if (get().waitingForNextRound) {
        console.log('[Store] action_request received but waiting for next round, queuing');
        set({ pendingEvents: [...get().pendingEvents, msg] });
        return;
      }
      
      // 如果手牌为空，尝试从 action_request 中获取（fallback）
      const actionData = msg.data;
      if (actionData.hole_card && (!get().heroHoleCards || get().heroHoleCards.length === 0)) {
        console.log('[Store] action_request - WARNING: Setting heroHoleCards from action_request (should have been set in round_start):', actionData.hole_card);
        set({ heroHoleCards: actionData.hole_card });
      }
      
      // 确保手牌已设置
      if (!get().heroHoleCards || get().heroHoleCards.length === 0) {
        console.warn('[Store] action_request - WARNING: heroHoleCards is empty! This should not happen. Action data:', actionData);
      }
      
      set({ actionRequest: msg.data });
      // Also update state if provided, but preserve position labels
      if (msg.data.round_state) {
        const currentPlayers = get().players;
        const updatedPlayers = msg.data.round_state.seats.map((seat: any) => {
          // Preserve position_label and is_dealer from current state
          const existingPlayer = currentPlayers.find((p: Player) => p.uuid === seat.uuid);
          return {
            ...seat,
            position_label: existingPlayer?.position_label,
            is_dealer: existingPlayer?.is_dealer
          };
        });
        set({
          communityCards: msg.data.round_state.community_card || [],
          pot: msg.data.round_state.pot?.main?.amount || 0,
          players: updatedPlayers
        });
      }
      console.log('[Store] After action_request, heroHoleCards:', get().heroHoleCards);
      get().addLog('👉 轮到你了！');
      break;

    case 'game_update':
      // If waiting for next round, queue the event
      if (get().waitingForNextRound) {
        console.log('[Store] game_update received but waiting for next round, queuing');
        set({ pendingEvents: [...get().pendingEvents, msg] });
        return;
      }
      
      const action = msg.data.action;
      // Also update state if provided, but preserve position labels
      if (msg.data.round_state) {
        const currentPlayers = get().players;
        const currentStreetForBets = get().currentStreet;
        
        // Calculate street bets from action histories
        const streetBets = calculateStreetBets(msg.data.round_state, currentStreetForBets);
        
        const updatedPlayers = msg.data.round_state.seats.map((seat: any) => {
          // Preserve position_label and is_dealer from current state
          const existingPlayer = currentPlayers.find((p: Player) => p.uuid === seat.uuid);
          const basePlayer = {
            ...seat,
            position_label: existingPlayer?.position_label,
            is_dealer: existingPlayer?.is_dealer,
            // Update street bet from action histories
            street_bet: streetBets.get(seat.uuid) || 0
          };
          
          // If this player just acted, add last_action
          if (seat.uuid === action.player_uuid) {
            return {
              ...basePlayer,
              last_action: {
                action: action.action,
                amount: action.amount || 0
              }
            };
          }
          return basePlayer;
        });

        set({
          communityCards: msg.data.round_state.community_card || [],
          pot: msg.data.round_state.pot?.main?.amount || 0,
          players: updatedPlayers
        });
      }
      
      // Record action in street history
      const streetHistory = [...get().streetHistory];
      const currentStreet = get().currentStreet;
      if (streetHistory.length > 0 && currentStreet) {
        const lastStreetIdx = streetHistory.findIndex(s => s.street === currentStreet);
        if (lastStreetIdx >= 0) {
          // Find player name
          const playerName = get().players.find((p: Player) => p.uuid === action.player_uuid)?.name || action.player_uuid;
          streetHistory[lastStreetIdx].actions.push({
            player: playerName,
            action: action.action,
            amount: action.amount || 0
          });
          set({ streetHistory });
        }
      }
      
      // Format log with player name and position
      const player = get().players.find((p: Player) => p.uuid === action.player_uuid);
      const playerName = player?.name || 'Unknown';
      const positionLabel = player?.position_label || '';
      const actionText = action.action.toLowerCase() === 'call' && action.amount === 0 
        ? 'CHECK' 
        : action.action.toUpperCase();
      const amountText = action.amount > 0 ? ` $${action.amount}` : '';
      const positionText = positionLabel ? `[${positionLabel}] ` : '';
      
      get().addLog(`${positionText}${playerName}: ${actionText}${amountText}`);
      break;

    case 'round_result':
      // Store round result and wait for user to click "Next Round"
      // Delay showing the result modal to let user see the last action
      console.log('[Store] round_result received:', msg.data);
      console.log('[Store] Delaying result modal by 1.5s to show last action');
      
      // First, set waitingForNextRound to true to queue any incoming events
      // But don't show the modal yet
      set({ 
        waitingForNextRound: true,
        actionRequest: null // Clear any pending action
      });
      
      // Save round result to session history
      const roundData = msg.data as RoundResult;
      const currentRoundStacks = get().currentRoundInitialStacks;
      const currentHeroHoleCards = get().heroHoleCards;
      
      console.log('[Store] Saving round result - currentHeroHoleCards:', currentHeroHoleCards);
      console.log('[Store] roundData.player_hole_cards:', roundData.player_hole_cards);
      
      // Ensure player_hole_cards includes Hero's cards if not already present
      if (!roundData.player_hole_cards) {
        roundData.player_hole_cards = {};
      }
      
      // Get hero UUID
      const heroUuid = roundData.round_state.seats.find((s: Player) => s.name === '你')?.uuid;
      if (heroUuid) {
        // If Hero's cards are not in player_hole_cards, add them from state
        if (!roundData.player_hole_cards[heroUuid] && currentHeroHoleCards && currentHeroHoleCards.length > 0) {
          roundData.player_hole_cards[heroUuid] = currentHeroHoleCards;
          console.log('[Store] Added Hero cards to roundData.player_hole_cards:', currentHeroHoleCards);
        }
      }
      
      if (!roundData.initial_stacks || Object.keys(roundData.initial_stacks).length === 0) {
        roundData.initial_stacks = currentRoundStacks;
      }
      saveRoundToSession(roundData, get().streetHistory, get().reviewAnalysis, currentRoundStacks, currentHeroHoleCards);
      
      // Delay showing the result modal by 1.5 seconds
      // This gives the user time to see the last AI action
      setTimeout(() => {
        console.log('[Store] Now showing round result modal');
        set({ 
          roundResult: roundData
        });
        console.log('[Store] After set, roundResult:', get().roundResult, 'waitingForNextRound:', get().waitingForNextRound);
      }, 1500);
      
      get().addLog('本局结束。查看结果并点击"下一局"继续。');
      break;
    
    case 'review_result':
      // Handle review analysis result from backend
      console.log('[Store] Received review_result:', msg);
      const reviewData = (msg as any).data;
      if (reviewData) {
        set({
          reviewAnalysis: reviewData as ReviewAnalysis,
          isReviewLoading: false
        });
      }
      break;
  }
}

