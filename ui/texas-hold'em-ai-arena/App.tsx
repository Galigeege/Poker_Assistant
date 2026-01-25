import React, { useState, useEffect } from 'react';
import Lobby from './components/Lobby';
import Seat from './components/Seat';
import Card from './components/Card';
import Controls from './components/Controls';
import AICopilot from './components/AICopilot';
import ReviewDashboard from './components/ReviewDashboard';
import { Player, PlayerType, Suit, Rank, GameConfig, HandHistory, ActionType } from './types';
import { Menu, LogOut } from 'lucide-react';

// Mock Initial State
const initialPlayers: Player[] = [
  { id: 'hero', name: 'Hero', type: PlayerType.HUMAN, chips: 1000, bet: 0, cards: [{ suit: Suit.SPADES, rank: Rank.ACE }, { suit: Suit.HEARTS, rank: Rank.ACE }], status: 'active', avatarSeed: 'hero' },
  { id: 'bot1', name: 'BluffMaster', type: PlayerType.BOT, chips: 950, bet: 10, cards: [{ suit: Suit.CLUBS, rank: Rank.SEVEN }, { suit: Suit.DIAMONDS, rank: Rank.EIGHT }], status: 'active', avatarSeed: 'bot1', persona: 'Aggressive', action: ActionType.RAISE },
  { id: 'bot2', name: 'RockSolid', type: PlayerType.BOT, chips: 1200, bet: 0, cards: [{ suit: Suit.HEARTS, rank: Rank.TWO }, { suit: Suit.SPADES, rank: Rank.SEVEN }], status: 'folded', avatarSeed: 'bot2', persona: 'Tight', action: ActionType.FOLD },
  { id: 'bot3', name: 'MathWiz', type: PlayerType.BOT, chips: 800, bet: 10, cards: [{ suit: Suit.DIAMONDS, rank: Rank.KING }, { suit: Suit.CLUBS, rank: Rank.QUEEN }], status: 'active', avatarSeed: 'bot3', persona: 'Pro', action: ActionType.CALL },
  { id: 'bot4', name: 'Fishy', type: PlayerType.BOT, chips: 400, bet: 0, cards: [{ suit: Suit.HEARTS, rank: Rank.JACK }, { suit: Suit.SPADES, rank: Rank.TEN }], status: 'folded', avatarSeed: 'bot4', persona: 'Fish', action: ActionType.FOLD },
];

const App: React.FC = () => {
  const [view, setView] = useState<'lobby' | 'game' | 'review'>('lobby');
  const [isCopilotOpen, setCopilotOpen] = useState(true);
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [pot, setPot] = useState(20);
  const [communityCards, setCommunityCards] = useState<{ card: any; revealed: boolean }[]>([
    { card: { suit: Suit.DIAMONDS, rank: Rank.FIVE }, revealed: false },
    { card: { suit: Suit.SPADES, rank: Rank.KING }, revealed: false },
    { card: { suit: Suit.HEARTS, rank: Rank.NINE }, revealed: false },
  ]);

  // Simulation for demo purposes
  const [turnStep, setTurnStep] = useState(0);

  const startGame = (config: GameConfig) => {
    // In real app, apply config here
    setView('game');
    setTimeout(() => simulateGameFlow(), 1000);
  };

  const simulateGameFlow = () => {
    // Simple visual flow simulation
    const steps = [
      () => setCommunityCards(prev => prev.map((c, i) => i < 3 ? { ...c, revealed: true } : c)), // Flop
      () => setPot(prev => prev + 50), // Pot grows
      () => setPlayers(prev => prev.map(p => p.id === 'hero' ? { ...p, action: undefined } : p)), // Clear hero action
    ];
    
    // Trigger one step for demo
    setTimeout(steps[0], 500);
  };

  const handleAction = (type: string, amount?: number) => {
    setPlayers(prev => prev.map(p => 
      p.id === 'hero' ? { 
        ...p, 
        action: type as any, 
        bet: amount || p.bet, 
        chips: p.chips - (amount || 0) 
      } : p
    ));
    
    // Mock AI Response
    setTimeout(() => {
      setPot(prev => prev + (amount || 0));
      setPlayers(prev => prev.map(p => p.id === 'bot1' ? { ...p, action: ActionType.CALL } : p));
      setPot(prev => prev + (amount || 0)); // Bot matches
    }, 1000);
  };

  if (view === 'lobby') {
    return <Lobby onStart={startGame} />;
  }

  if (view === 'review') {
    return <ReviewDashboard history={[]} onBack={() => setView('lobby')} />;
  }

  // GAME VIEW
  return (
    <div className="relative min-h-screen bg-gray-950 overflow-hidden flex">
      
      {/* Main Game Area */}
      <div className={`flex-1 relative transition-all duration-300 ${isCopilotOpen ? 'mr-80' : ''}`}>
        
        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 pointer-events-none">
          <div className="pointer-events-auto flex gap-2">
            <button onClick={() => setView('lobby')} className="bg-gray-900/80 p-2 rounded-lg text-gray-400 hover:text-white backdrop-blur-sm border border-gray-700">
              <Menu className="w-5 h-5" />
            </button>
          </div>
          <div className="pointer-events-auto">
            <button onClick={() => setView('review')} className="bg-red-900/80 px-4 py-2 rounded-lg text-red-200 font-bold text-sm hover:bg-red-800 backdrop-blur-sm border border-red-800/50 flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Leave Table
            </button>
          </div>
        </div>

        {/* Table Container */}
        <div className="w-full h-screen flex items-center justify-center bg-gray-900 perspective-[1000px] overflow-hidden">
           
           {/* The Table */}
           <div className="relative w-[900px] h-[450px] md:w-[1100px] md:h-[550px] poker-felt rounded-[200px] border-[16px] border-gray-800 shadow-[0_0_150px_rgba(0,0,0,0.5)] ring-1 ring-white/5 flex items-center justify-center transform rotate-x-10">
              
              {/* Community Cards */}
              <div className="flex gap-3 z-0">
                 {communityCards.map((c, i) => (
                   <Card key={i} card={c.card} hidden={!c.revealed} />
                 ))}
              </div>

              {/* Pot Info */}
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center">
                 <div className="text-gray-300 text-xs uppercase tracking-widest mb-1">Total Pot</div>
                 <div className="text-yellow-400 font-bold text-xl font-mono">${pot}</div>
                 <div className="mt-2 flex gap-1 justify-center">
                   {/* Chips visual representation */}
                   <div className="w-4 h-4 rounded-full bg-red-500 border border-red-300 shadow-sm"></div>
                   <div className="w-4 h-4 rounded-full bg-blue-500 border border-blue-300 shadow-sm"></div>
                   <div className="w-4 h-4 rounded-full bg-black border border-gray-600 shadow-sm"></div>
                 </div>
              </div>

              {/* Seats */}
              <Seat player={players[0]} position="bottom" isActive={!players[0].action} /> {/* Hero */}
              <Seat player={players[1]} position="left" />
              <Seat player={players[2]} position="top-left" />
              <Seat player={players[3]} position="top-right" isDealer />
              <Seat player={players[4]} position="right" />

           </div>
        </div>

        {/* Notifications / Toasts Area */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 pointer-events-none">
           {/* Example Toast */}
           {players[1].action === 'RAISE' && (
             <div className="bg-black/70 backdrop-blur text-white px-6 py-2 rounded-full animate-bounce border border-white/10">
               BluffMaster raises to $20!
             </div>
           )}
        </div>

        {/* Controls */}
        <Controls 
          hero={players[0]} 
          potSize={pot} 
          minBet={2} 
          maxBet={players[0].chips} 
          onAction={handleAction}
          disabled={!!players[0].action}
        />
      </div>

      {/* Side Panel */}
      <AICopilot 
        isOpen={isCopilotOpen} 
        toggleOpen={() => setCopilotOpen(!isCopilotOpen)} 
        heroCards={players[0].cards}
        communityCards={communityCards.filter(c => c.revealed).map(c => c.card)}
        pot={pot}
        players={players}
        isHeroTurn={!players[0].action}
      />

    </div>
  );
};

export default App;