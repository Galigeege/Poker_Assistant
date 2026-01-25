import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/useGameStore';
import { ArrowLeft, LogOut } from 'lucide-react';
import Seat from './Seat';
import Card from './Card';
import Controls from './Controls';
import AICopilot from './AICopilot';
import RoundResultModal from './RoundResult';
import OpponentProfileModal from './OpponentProfileModal';
import type { Player } from '../types';

function GameRoom() {
  const { 
    disconnect, 
    communityCards,
    pot,
    players,
    actionRequest, 
    sendAction,
    heroHoleCards,
    roundResult,
    startNextRound,
    needsApiKey,
    needsApiKeyMessage
  } = useGameStore();

  const [selectedOpponent, setSelectedOpponent] = useState<Player | null>(null);
  const navigate = useNavigate();

  const hero = players.find(p => p.name === '你');
  const heroStack = hero ? hero.stack : 0;

  // Hero 永远在底部（图形位置），其他玩家按游戏位置顺序排列
  // 找到 Hero 在 players 中的索引
  const heroIndex = players.findIndex(p => p.name === '你');
  
  // 重新排序：Hero 始终在第一位（底部），其他玩家按游戏位置顺序（从 Hero 开始顺时针）
  const orderedPlayers: Player[] = heroIndex >= 0 && hero
    ? [hero, ...players.filter((_, idx) => idx !== heroIndex)]
    : players;

  // 位置映射函数：Hero 永远在 bottom，其他玩家按顺序分配其他位置
  // 牌桌位置顺序（从底部顺时针）：bottom → left → top-left → top → top-right → right
  const getPositionForPlayer = (player: Player, playerIndex: number): 'bottom' | 'left' | 'top-left' | 'top-right' | 'right' | 'top' => {
    // Hero 永远在底部
    if (player.name === '你') {
      return 'bottom';
    }
    
    // 其他玩家按索引顺序分配位置
    // playerIndex 0 是 Hero (bottom)，所以从 playerIndex 1 开始
    const positionMap: Record<number, 'bottom' | 'left' | 'top-left' | 'top-right' | 'right' | 'top'> = {
      1: 'left',      // 第一个对手在左侧
      2: 'top-left',  // 第二个对手在左上
      3: 'top',       // 第三个对手在上方
      4: 'top-right', // 第四个对手在右上
      5: 'right'      // 第五个对手在右侧
    };
    
    return positionMap[playerIndex] || 'left';
  };

  const handlePlayerClick = (player: Player) => {
    if (player.name !== '你') {
      setSelectedOpponent(player);
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-950 overflow-hidden">
      <div className="relative flex flex-col min-h-screen mr-72">
        {needsApiKey && (
          <div className="absolute top-16 left-0 right-0 z-30 px-4">
            <div className="mx-auto max-w-3xl bg-yellow-900/30 border border-yellow-500/40 text-yellow-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3 backdrop-blur-sm">
              <div className="text-sm">
                {needsApiKeyMessage || '需要配置 API Key 才能使用 AI 功能'}
              </div>
              <button
                onClick={() => {
                  try {
                    localStorage.setItem('open_game_config_modal', '1');
                  } catch {
                    // ignore
                  }
                  // 需要离开牌桌后才能看到首页的高级设置弹窗
                  disconnect();
                  navigate('/');
                }}
                className="px-3 py-2 bg-yellow-600/80 hover:bg-yellow-600 rounded-lg text-sm text-black font-semibold"
              >
                去配置
              </button>
            </div>
          </div>
        )}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 pointer-events-none">
          <div className="pointer-events-auto flex gap-2">
            <button 
              onClick={() => {
                disconnect();
                navigate('/');
              }} 
              className="bg-gray-900/80 p-2 rounded-lg text-gray-400 hover:text-white backdrop-blur-sm border border-gray-700"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
          <div className="pointer-events-auto">
            <button 
              onClick={() => {
                disconnect();
                navigate('/');
              }} 
              className="bg-red-900/80 px-4 py-2 rounded-lg text-red-200 font-bold text-sm hover:bg-red-800 backdrop-blur-sm border border-red-800/50 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Leave Table
            </button>
          </div>
        </div>

        <div className="flex-1 flex items-center justify-center p-8">
          <div className="relative w-[810px] h-[405px] md:w-[900px] md:h-[450px] poker-felt rounded-[180px] border-[14px] border-gray-800 shadow-2xl flex items-center justify-center">
            <div className="absolute top-[25%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center z-10 bg-gray-900/90 px-4 py-2 rounded-lg border border-yellow-500/30 backdrop-blur-sm">
              <div className="text-gray-300 text-xs uppercase tracking-widest mb-1">Total Pot</div>
              <div className="text-yellow-400 font-bold text-2xl font-mono">${pot}</div>
            </div>

            {communityCards.length > 0 && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex gap-2 z-0">
                {communityCards.map((card, i) => (
                  <Card key={i} card={card} />
                ))}
              </div>
            )}

            {orderedPlayers.map((player, idx) => {
              const position = getPositionForPlayer(player, idx);
              const isActive = actionRequest ? (actionRequest.round_state?.seats?.find((s: Player) => s.uuid === player.uuid)?.state === 'participating') : false;
              
              return (
                <Seat
                  key={player.uuid}
                  player={player}
                  position={position}
                  isDealer={player.is_dealer}
                  isActive={isActive}
                  heroHoleCards={heroHoleCards}
                  positionLabel={player.position_label}
                  onPlayerClick={handlePlayerClick}
                />
              );
            })}
          </div>
        </div>

        <div className="fixed bottom-4 left-4 w-80 z-30">
          <Controls 
            onAction={sendAction}
            actionRequest={actionRequest}
            playerStack={heroStack}
            potSize={pot}
          />
        </div>
      </div>

      <div className="fixed top-0 right-0 w-72 h-full z-20">
        <AICopilot />
      </div>

      {roundResult && (
        <RoundResultModal
          result={roundResult}
          onClose={() => {
            // Modal will be closed when roundResult is cleared in startNextRound
          }}
          onNextRound={() => {
            console.log('[GameRoom] onNextRound called');
            startNextRound();
          }}
        />
      )}

      {selectedOpponent && (
        <OpponentProfileModal
          player={selectedOpponent}
          isOpen={!!selectedOpponent}
          onClose={() => setSelectedOpponent(null)}
        />
      )}
    </div>
  );
}

export default GameRoom;
