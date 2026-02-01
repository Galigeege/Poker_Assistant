"""
扑克数学工具模块
负责计算胜率 (Equity)、底池赔率 (Pot Odds) 和期望值 (EV)
支持 Harrington 理论所需的 SPR、有效筹码深度和牌面纹理分析
使用 treys 库进行手牌评估
"""
from treys import Card, Evaluator, Deck
from typing import List, Tuple, Union, Dict, Any
from collections import Counter

class PokerMath:
    def __init__(self):
        self.evaluator = Evaluator()
        
        # 牌型名称映射 (treys rank class -> 中英文名称)
        self.HAND_RANK_NAMES = {
            1: ("Straight Flush", "同花顺"),
            2: ("Four of a Kind", "四条"),
            3: ("Full House", "葫芦"),
            4: ("Flush", "同花"),
            5: ("Straight", "顺子"),
            6: ("Three of a Kind", "三条"),
            7: ("Two Pair", "两对"),
            8: ("One Pair", "一对"),
            9: ("High Card", "高牌"),
        }
    
    def _convert_card_to_treys(self, card: str) -> str:
        """
        将 PyPokerEngine 格式的牌转换为 treys 格式
        
        PyPokerEngine: 'SA' (Suit + Rank) -> treys: 'As' (Rank + lowercase suit)
        PyPokerEngine: 'H8' -> treys: '8h'
        """
        if not card or len(card) != 2:
            return card
        
        suit = card[0].lower()  # S -> s, H -> h, D -> d, C -> c
        rank = card[1]  # A, K, Q, J, T, 9, 8, ...
        
        return f"{rank}{suit}"
    
    def _convert_cards_to_treys(self, cards: List[str]) -> List[str]:
        """将多张牌转换为 treys 格式"""
        return [self._convert_card_to_treys(c) for c in cards]
    
    def evaluate_made_hand(self, hole_cards: List[str], community_cards: List[str]) -> Dict[str, Any]:
        """
        评估当前组成的牌型
        
        Args:
            hole_cards: 手牌 (e.g., ['SK', 'SQ'])
            community_cards: 公共牌 (e.g., ['CJ', 'H3', 'D8', 'ST', 'CA'])
            
        Returns:
            包含牌型信息的字典
        """
        if len(community_cards) < 3:
            return {
                "hand_rank": 0,
                "hand_rank_class": 9,
                "hand_name_en": "N/A (Pre-flop)",
                "hand_name_cn": "翻牌前",
                "hand_description": "尚未发公共牌",
                "is_strong": False
            }
        
        try:
            # 转换牌格式: PyPokerEngine ('SA') -> treys ('As')
            treys_hole = self._convert_cards_to_treys(hole_cards)
            treys_board = self._convert_cards_to_treys(community_cards)
            
            hero_hand = [Card.new(c) for c in treys_hole]
            board = [Card.new(c) for c in treys_board]
            
            # 评估牌力 (数值越小越强，1是皇家同花顺，7462是最弱高牌)
            hand_rank = self.evaluator.evaluate(board, hero_hand)
            hand_rank_class = self.evaluator.get_rank_class(hand_rank)
            
            # 获取牌型名称
            hand_name_en, hand_name_cn = self.HAND_RANK_NAMES.get(hand_rank_class, ("Unknown", "未知"))
            
            # 判断是否是强牌 (顺子及以上)
            is_strong = hand_rank_class <= 5
            is_monster = hand_rank_class <= 3  # 葫芦及以上
            is_nuts_possible = hand_rank_class <= 2  # 四条及以上几乎是坚果
            
            # 解析牌面信息用于详细描述
            def get_rank_name(r):
                return {'A': 'A', 'K': 'K', 'Q': 'Q', 'J': 'J', 'T': '10', 
                        '9': '9', '8': '8', '7': '7', '6': '6', '5': '5', 
                        '4': '4', '3': '3', '2': '2'}.get(r, r)
            
            def get_rank_value(r):
                return {'A': 14, 'K': 13, 'Q': 12, 'J': 11, 'T': 10,
                        '9': 9, '8': 8, '7': 7, '6': 6, '5': 5, 
                        '4': 4, '3': 3, '2': 2}.get(r, 0)
            
            # 获取手牌和公共牌的点数
            hole_ranks = [c[1] for c in hole_cards]  # e.g., ['4', 'J'] from ['C4', 'CJ']
            board_ranks = [c[1] for c in community_cards]  # e.g., ['7', 'Q', 'Q', '9']
            all_ranks = hole_ranks + board_ranks
            
            # 统计点数出现次数
            rank_counts = Counter(all_ranks)
            
            # 生成详细描述
            if hand_rank_class == 5:  # 顺子
                all_values = sorted(set([get_rank_value(r) for r in all_ranks]), reverse=True)
                if 14 in all_values and 13 in all_values and 12 in all_values and 11 in all_values and 10 in all_values:
                    hand_description = f"坚果顺子 (A-K-Q-J-T) - 当前牌面最强顺子！"
                    is_nuts_possible = True
                else:
                    hand_description = f"{hand_name_cn} - 强成手牌"
            elif hand_rank_class == 4:  # 同花
                hand_description = f"{hand_name_cn} - 强成手牌，注意更大同花"
            elif hand_rank_class <= 3:
                hand_description = f"{hand_name_cn} - 怪兽牌，应最大化价值"
            elif hand_rank_class == 6:  # 三条
                trips = [r for r, cnt in rank_counts.items() if cnt >= 3]
                if trips:
                    trip_rank = get_rank_name(trips[0])
                    if trips[0] in hole_ranks:
                        hand_description = f"暗三条 {trip_rank} (口袋对成set) - 强隐蔽牌！"
                    else:
                        hand_description = f"明三条 {trip_rank} (公共牌三条) - 注意对手也可能有"
                else:
                    hand_description = f"{hand_name_cn} - 中等牌力"
            elif hand_rank_class == 7:  # 两对
                pairs = [r for r, cnt in rank_counts.items() if cnt >= 2]
                pairs_sorted = sorted(pairs, key=lambda x: get_rank_value(x), reverse=True)[:2]
                pair_names = [get_rank_name(p) for p in pairs_sorted]
                # 检查是否使用了手牌
                hole_in_pairs = any(p in hole_ranks for p in pairs_sorted)
                if hole_in_pairs:
                    hand_description = f"两对 {pair_names[0]}-{pair_names[1]} (使用手牌) - 边缘牌力，控制底池"
                else:
                    hand_description = f"两对 {pair_names[0]}-{pair_names[1]} (公共牌) - 弱两对，仅有踢脚优势"
            elif hand_rank_class == 8:  # 一对
                pairs = [r for r, cnt in rank_counts.items() if cnt >= 2]
                if pairs:
                    pair_rank = pairs[0]
                    pair_name = get_rank_name(pair_rank)
                    # 检查对子是来自手牌还是公共牌
                    hole_pair_count = hole_ranks.count(pair_rank)
                    board_pair_count = board_ranks.count(pair_rank)
                    
                    if hole_pair_count == 2:
                        # 口袋对子
                        hand_description = f"口袋对 {pair_name}{pair_name} - 暗对，有摊牌价值"
                    elif hole_pair_count == 1 and board_pair_count >= 1:
                        # 手牌配对公共牌
                        # 判断是顶对、中对还是底对
                        board_values = sorted([get_rank_value(r) for r in board_ranks], reverse=True)
                        pair_value = get_rank_value(pair_rank)
                        if pair_value == board_values[0]:
                            hand_description = f"顶对 {pair_name} (手牌配对) - 中等偏强，可以价值下注"
                        elif pair_value == board_values[-1]:
                            hand_description = f"底对 {pair_name} (手牌配对) - 弱牌力，控制底池"
                        else:
                            hand_description = f"中对 {pair_name} (手牌配对) - 边缘牌力"
                    elif board_pair_count >= 2:
                        # 公共牌上的对子
                        # 找到手牌中最大的踢脚
                        kickers = sorted([get_rank_value(r) for r in hole_ranks], reverse=True)
                        kicker_name = get_rank_name(hole_ranks[kickers.index(max(kickers))] if kickers else 'x')
                        for hr in hole_ranks:
                            if get_rank_value(hr) == max(kickers):
                                kicker_name = get_rank_name(hr)
                                break
                        hand_description = f"公共对 {pair_name}{pair_name} (踢脚 {kicker_name}) - ⚠️ 对子来自公共牌，你仅有踢脚优势！"
                    else:
                        hand_description = f"一对 {pair_name} - 弱牌力，考虑摊牌价值"
                else:
                    hand_description = f"{hand_name_cn} - 弱牌力，考虑摊牌价值"
            else:  # 高牌
                high_cards = sorted([get_rank_value(r) for r in hole_ranks], reverse=True)
                if high_cards:
                    high_name = get_rank_name([r for r in hole_ranks if get_rank_value(r) == high_cards[0]][0])
                    hand_description = f"高牌 {high_name} - 无成手牌，考虑弃牌或诈唬"
                else:
                    hand_description = f"{hand_name_cn} - 弱牌，考虑弃牌或诈唬"
            
            return {
                "hand_rank": hand_rank,
                "hand_rank_class": hand_rank_class,
                "hand_name_en": hand_name_en,
                "hand_name_cn": hand_name_cn,
                "hand_description": hand_description,
                "is_strong": is_strong,
                "is_monster": is_monster,
                "is_nuts_possible": is_nuts_possible
            }
            
        except Exception as e:
            return {
                "hand_rank": 9999,
                "hand_rank_class": 9,
                "hand_name_en": "Error",
                "hand_name_cn": "评估错误",
                "hand_description": f"牌型评估失败: {e}",
                "is_strong": False
            }

    def calculate_equity(self, hole_cards: List[str], community_cards: List[str], num_simulations: int = 300) -> float:
        """
        计算手牌在当前公共牌下的胜率 (Monte Carlo 模拟)
        
        Args:
            hole_cards: 手牌列表 (e.g., ['SA', 'DK'] 或 ['Ah', 'Kd'])
            community_cards: 公共牌列表 (e.g., ['HT', 'SJ', 'C2'])，可以为空
            num_simulations: 模拟次数，默认 300 次（优化速度，精度仍足够）
            
        Returns:
            胜率 (0.0 - 1.0)
        """
        # 转换牌格式: PyPokerEngine ('SA') -> treys ('As')
        try:
            treys_hole = self._convert_cards_to_treys(hole_cards)
            treys_board = self._convert_cards_to_treys(community_cards)
            
            hero_hand = [Card.new(c) for c in treys_hole]
            board = [Card.new(c) for c in treys_board]
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
            # EV 计算 (期望收益): 
            # EV = P(win) × Pot - P(lose) × Call
            # 注意: Pot 是跟注前的底池，不包含本次跟注
            ev_call = (equity * pot_size) - ((1 - equity) * to_call)
        
        return {
            "equity": round(equity, 3),
            "equity_percent": f"{round(equity * 100, 1)}%",
            "pot_odds": round(pot_odds, 3),
            "pot_odds_percent": f"{round(pot_odds * 100, 1)}%",
            "ev_call": round(ev_call, 2),
            "is_ev_positive": ev_call > 0
        }

    # ==================== Harrington Theory Methods ====================
    
    def calculate_effective_stack_bb(self, my_stack: int, opponent_stacks: List[int], big_blind: int) -> float:
        """
        计算有效筹码深度（BB 数）
        有效筹码 = min(我的筹码, 对手最小筹码) / 大盲注
        
        Args:
            my_stack: 我的筹码
            opponent_stacks: 对手筹码列表
            big_blind: 大盲注金额
            
        Returns:
            有效筹码深度（BB 数）
        """
        if big_blind <= 0:
            return 0.0
        
        if not opponent_stacks:
            return my_stack / big_blind
        
        min_opponent_stack = min(opponent_stacks)
        effective_stack = min(my_stack, min_opponent_stack)
        return round(effective_stack / big_blind, 1)
    
    def calculate_spr(self, effective_stack: int, pot_size: int) -> float:
        """
        计算 SPR（筹码底池比 - Stack to Pot Ratio）
        SPR = 有效筹码 / 底池
        
        SPR 指导：
        - SPR < 4: 低 SPR，强牌应致力于全下
        - SPR 4-10: 中等 SPR，可灵活操作
        - SPR > 10: 高 SPR，需要保护手牌，控制底池
        
        Args:
            effective_stack: 有效筹码
            pot_size: 当前底池大小
            
        Returns:
            SPR 值
        """
        if pot_size <= 0:
            return float('inf')
        return round(effective_stack / pot_size, 1)
    
    def analyze_board_texture(self, community_cards: List[str]) -> Dict[str, Any]:
        """
        分析牌面纹理（Harrington 理论核心）
        
        Args:
            community_cards: 公共牌列表 (e.g., ['Kh', '7d', '2c'])
            
        Returns:
            {
                "texture": "dry" | "semi_wet" | "wet",
                "texture_cn": "干燥" | "半湿润" | "湿润",
                "paired": bool,
                "flush_possible": bool,  # 3+ 同花色
                "flush_draw": bool,      # 2 同花色
                "straight_possible": bool,
                "straight_draw": bool,
                "high_card": str,
                "connectedness": int,    # 连接度 0-5
                "description": str       # 人类可读描述
            }
        """
        if not community_cards:
            return {
                "texture": "unknown",
                "texture_cn": "未知",
                "paired": False,
                "flush_possible": False,
                "flush_draw": False,
                "straight_possible": False,
                "straight_draw": False,
                "high_card": "None",
                "connectedness": 0,
                "description": "翻牌前，无公共牌"
            }
        
        # 解析牌面
        ranks = []
        suits = []
        rank_values = []
        
        rank_map = {'2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, 
                    '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14}
        rank_display = {'2': '2', '3': '3', '4': '4', '5': '5', '6': '6', '7': '7', 
                        '8': '8', '9': '9', 'T': 'T', 'J': 'J', 'Q': 'Q', 'K': 'K', 'A': 'A'}
        
        for card in community_cards:
            if len(card) >= 2:
                rank = card[0].upper()
                suit = card[1].lower()
                ranks.append(rank)
                suits.append(suit)
                if rank in rank_map:
                    rank_values.append(rank_map[rank])
        
        # 1. 检查是否有对子
        rank_counts = Counter(ranks)
        paired = any(count >= 2 for count in rank_counts.values())
        
        # 2. 检查同花可能性
        suit_counts = Counter(suits)
        max_suit_count = max(suit_counts.values()) if suit_counts else 0
        flush_possible = max_suit_count >= 3
        flush_draw = max_suit_count == 2
        
        # 3. 检查顺子可能性
        unique_values = sorted(set(rank_values))
        straight_possible = False
        straight_draw = False
        connectedness = 0
        
        if len(unique_values) >= 3:
            # 检查连续性
            for i in range(len(unique_values) - 2):
                window = unique_values[i:i+3]
                gap = window[-1] - window[0]
                if gap <= 4:  # 3 张牌跨度 <= 4，可能有顺子
                    straight_possible = True
                    connectedness = max(connectedness, 5 - gap)
        
        if len(unique_values) >= 2 and not straight_possible:
            for i in range(len(unique_values) - 1):
                gap = unique_values[i+1] - unique_values[i]
                if gap <= 3:  # 2 张牌跨度 <= 3，有顺子听牌
                    straight_draw = True
                    connectedness = max(connectedness, 4 - gap)
        
        # 4. 最高牌
        high_card = "None"
        if rank_values:
            max_val = max(rank_values)
            for r, v in rank_map.items():
                if v == max_val:
                    high_card = rank_display[r]
                    break
        
        # 5. 综合判断纹理
        wetness_score = 0
        if flush_possible:
            wetness_score += 3
        elif flush_draw:
            wetness_score += 1
        if straight_possible:
            wetness_score += 3
        elif straight_draw:
            wetness_score += 1
        if paired:
            wetness_score -= 1  # 对子牌面稍微干燥
        
        if wetness_score >= 4:
            texture = "wet"
            texture_cn = "湿润"
        elif wetness_score >= 2:
            texture = "semi_wet"
            texture_cn = "半湿润"
        else:
            texture = "dry"
            texture_cn = "干燥"
        
        # 6. 生成描述
        desc_parts = []
        desc_parts.append(f"最高牌 {high_card}")
        if paired:
            desc_parts.append("有对子")
        if flush_possible:
            desc_parts.append("同花已成或听牌危险")
        elif flush_draw:
            desc_parts.append("两张同色")
        if straight_possible:
            desc_parts.append("顺子可能")
        elif straight_draw:
            desc_parts.append("顺子听牌可能")
        
        description = f"{texture_cn}牌面 - " + ", ".join(desc_parts)
        
        return {
            "texture": texture,
            "texture_cn": texture_cn,
            "paired": paired,
            "flush_possible": flush_possible,
            "flush_draw": flush_draw,
            "straight_possible": straight_possible,
            "straight_draw": straight_draw,
            "high_card": high_card,
            "connectedness": connectedness,
            "description": description
        }
    
    def analyze_hand_harrington(
        self,
        hole_cards: List[str],
        community_cards: List[str],
        pot_size: int,
        to_call: int,
        my_stack: int,
        opponent_stacks: List[int],
        big_blind: int
    ) -> Dict[str, Any]:
        """
        Harrington 理论综合分析
        整合所有 Harrington Bot 需要的数学数据
        
        Args:
            hole_cards: 手牌
            community_cards: 公共牌
            pot_size: 底池大小
            to_call: 跟注金额
            my_stack: 我的筹码
            opponent_stacks: 对手筹码列表
            big_blind: 大盲注
            
        Returns:
            包含所有 Harrington 分析数据的字典
        """
        # 基础数学分析
        basic = self.analyze_hand(hole_cards, community_cards, pot_size, to_call)
        
        # 有效筹码深度
        effective_stack_bb = self.calculate_effective_stack_bb(my_stack, opponent_stacks, big_blind)
        
        # 计算有效筹码（用于 SPR）
        if opponent_stacks:
            effective_stack = min(my_stack, min(opponent_stacks))
        else:
            effective_stack = my_stack
        
        # SPR
        spr = self.calculate_spr(effective_stack, pot_size)
        
        # SPR 分类
        if spr == float('inf'):
            spr_category = "N/A"
            spr_advice = "底池为空"
        elif spr < 4:
            spr_category = "Low"
            spr_advice = "低 SPR - 强牌应致力于全下，边缘牌谨慎"
        elif spr < 10:
            spr_category = "Medium"
            spr_advice = "中等 SPR - 可灵活操作，关注位置优势"
        else:
            spr_category = "High"
            spr_advice = "高 SPR - 保护手牌，重视隐含赔率"
        
        # 筹码深度分类
        if effective_stack_bb < 20:
            stack_category = "Short"
            stack_advice = "短筹码 - 推/弃模式，减少翻牌后操作"
        elif effective_stack_bb < 50:
            stack_category = "Medium"
            stack_advice = "中筹码 - 标准打法，注意 commitment threshold"
        elif effective_stack_bb < 100:
            stack_category = "Deep"
            stack_advice = "深筹码 - 投机牌价值提升，注意隐含赔率"
        else:
            stack_category = "Very Deep"
            stack_advice = "超深筹码 - 同花连张、小对子价值极高"
        
        # 牌面纹理
        board_texture = self.analyze_board_texture(community_cards)
        
        # 牌型评估（关键！告诉 LLM 实际组成的牌型）
        made_hand = self.evaluate_made_hand(hole_cards, community_cards)
        
        return {
            # 基础数学
            **basic,
            
            # 筹码深度
            "effective_stack_bb": effective_stack_bb,
            "stack_category": stack_category,
            "stack_advice": stack_advice,
            
            # SPR
            "spr": spr if spr != float('inf') else "N/A",
            "spr_category": spr_category,
            "spr_advice": spr_advice,
            
            # 牌面纹理
            "board_texture": board_texture["texture"],
            "board_texture_cn": board_texture["texture_cn"],
            "board_description": board_texture["description"],
            "board_paired": board_texture["paired"],
            "flush_possible": board_texture["flush_possible"],
            "straight_possible": board_texture["straight_possible"],
            
            # 牌型评估
            "made_hand_en": made_hand["hand_name_en"],
            "made_hand_cn": made_hand["hand_name_cn"],
            "made_hand_description": made_hand["hand_description"],
            "is_strong_hand": made_hand["is_strong"],
            "is_monster_hand": made_hand.get("is_monster", False),
            "is_nuts_possible": made_hand.get("is_nuts_possible", False),
        }

