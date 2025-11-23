"""
扑克数学工具模块
负责计算胜率 (Equity)、底池赔率 (Pot Odds) 和期望值 (EV)
使用 treys 库进行手牌评估
"""
from treys import Card, Evaluator, Deck
from typing import List, Tuple, Union

class PokerMath:
    def __init__(self):
        self.evaluator = Evaluator()

    def calculate_equity(self, hole_cards: List[str], community_cards: List[str], num_simulations: int = 1000) -> float:
        """
        计算手牌在当前公共牌下的胜率 (Monte Carlo 模拟)
        
        Args:
            hole_cards: 手牌列表 (e.g., ['Ah', 'Kd'])
            community_cards: 公共牌列表 (e.g., ['Th', 'Js', '2c'])，可以为空
            num_simulations: 模拟次数，默认 1000 次
            
        Returns:
            胜率 (0.0 - 1.0)
        """
        # 将卡牌字符串转换为 treys 格式
        try:
            hero_hand = [Card.new(c) for c in hole_cards]
            board = [Card.new(c) for c in community_cards]
        except KeyError:
            # 处理可能出现的卡牌格式错误
            return 0.0

        deck = Deck()
        
        # 从牌堆中移除已知牌
        for card in hero_hand + board:
            if card in deck.cards:
                deck.cards.remove(card)

        wins = 0
        
        # Monte Carlo 模拟
        # 仅在 simulations 确实需要时进行
        if 5 - len(board) == 0:
            # 如果是 River，且只需要评估对手手牌
            # 这里简化为仍然跑 Monte Carlo，随机对手手牌
            pass 

        return self._monte_carlo_equity(hero_hand, board, deck.cards, num_simulations)

    def _monte_carlo_equity(self, hero_hand, board, remaining_cards, iterations):
        import random
        wins = 0
        cards_to_draw_board = 5 - len(board)
        
        # 优化：如果公共牌已满（River），只需要抽对手的两张牌
        # 这种情况下，Evaluate 只需要做一次 lookup（对于 Hero），但对手是变化的
        
        # 预计算 Hero 的 rank (如果 board 完整)
        hero_score = None
        if cards_to_draw_board == 0:
            hero_score = self.evaluator.evaluate(board, hero_hand)

        for _ in range(iterations):
            # 随机抽样，不改变 remaining_cards
            drawn = random.sample(remaining_cards, cards_to_draw_board + 2) # board补牌 + 对手2张
            
            sim_board = board + drawn[:cards_to_draw_board]
            villain_hand = drawn[cards_to_draw_board:]
            
            if hero_score is None:
                current_hero_score = self.evaluator.evaluate(sim_board, hero_hand)
            else:
                current_hero_score = hero_score
                
            villain_score = self.evaluator.evaluate(sim_board, villain_hand)
            
            if current_hero_score < villain_score:
                wins += 1
            elif current_hero_score == villain_score:
                wins += 0.5
                
        return wins / iterations

    def calculate_pot_odds(self, to_call: int, pot_size: int) -> float:
        """
        计算底池赔率
        
        Args:
            to_call: 需要跟注的金额
            pot_size: 当前底池金额（包含对手的下注，不包含你这一轮将要跟注的金额）
            
        Returns:
            跟注所需的胜率 (0.0 - 1.0)
            公式: call / (pot + call)
        """
        if to_call <= 0:
            return 0.0
        final_pot = pot_size + to_call
        if final_pot == 0: 
            return 0.0
        return to_call / final_pot

    def analyze_hand(self, hole_cards: List[str], community_cards: List[str], 
                    pot_size: int, to_call: int) -> dict:
        """
        综合数学分析
        """
        equity = self.calculate_equity(hole_cards, community_cards)
        pot_odds = self.calculate_pot_odds(to_call, pot_size)
        
        ev_call = 0.0
        if to_call > 0:
            # 简单 EV 计算: (Win % * Total Pot) - (Lose % * Call Amount)
            # Total Pot = Current Pot + Call Amount
            total_pot = pot_size + to_call
            ev_call = (equity * total_pot) - ((1 - equity) * to_call)
        
        return {
            "equity": round(equity, 3),
            "equity_percent": f"{round(equity * 100, 1)}%",
            "pot_odds": round(pot_odds, 3),
            "pot_odds_percent": f"{round(pot_odds * 100, 1)}%",
            "ev_call": round(ev_call, 2),
            "is_ev_positive": ev_call > 0
        }

