"""
修复版 GameEvaluator
使用 treys 库进行更准确的手牌评估，解决 PyPokerEngine 的 kicker 比较问题
"""
from functools import reduce
from treys import Card as TreysCard, Evaluator as TreysEvaluator

from pypokerengine.engine.hand_evaluator import HandEvaluator
from pypokerengine.engine.pay_info import PayInfo

# 全局 treys evaluator 实例
_treys_evaluator = TreysEvaluator()


def convert_card_to_treys(card):
    """
    将 PyPokerEngine 的 Card 对象转换为 treys 格式字符串
    PyPokerEngine: Card(suit=2, rank=14) -> 'As'
    treys 格式: 'As' (Ace of spades)
    """
    # PyPokerEngine suit: 2=Spade, 4=Heart, 8=Diamond, 16=Club
    # treys suit: 's', 'h', 'd', 'c'
    suit_map = {2: 's', 4: 'h', 8: 'd', 16: 'c'}
    # PyPokerEngine rank: 2-14 (14=Ace)
    # treys rank: '2'-'9', 'T', 'J', 'Q', 'K', 'A'
    rank_map = {
        2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
        10: 'T', 11: 'J', 12: 'Q', 13: 'K', 14: 'A'
    }
    
    suit = suit_map.get(card.suit, 's')
    rank = rank_map.get(card.rank, '2')
    return f"{rank}{suit}"


def eval_hand_with_treys(hole_cards, community_cards):
    """
    使用 treys 库评估手牌
    返回分数（越小越好，treys 的评分系统）
    """
    try:
        # 转换为 treys 格式
        hole = [TreysCard.new(convert_card_to_treys(c)) for c in hole_cards]
        board = [TreysCard.new(convert_card_to_treys(c)) for c in community_cards]
        
        # treys 返回的分数越小越好（1 是皇家同花顺）
        score = _treys_evaluator.evaluate(board, hole)
        return score
    except Exception as e:
        print(f"[PatchedEvaluator] Error evaluating hand: {e}")
        # 回退到 PyPokerEngine 的评估
        return HandEvaluator.eval_hand(hole_cards, community_cards)


class PatchedGameEvaluator:
    """
    修复版 GameEvaluator，使用 treys 进行手牌评估
    """

    @classmethod
    def judge(cls, table):
        winners = cls._find_winners_from(table.get_community_card(), table.seats.players)
        hand_info = cls._gen_hand_info_if_needed(table.seats.players, table.get_community_card())
        prize_map = cls._calc_prize_distribution(table.get_community_card(), table.seats.players)
        return winners, hand_info, prize_map

    @classmethod
    def create_pot(cls, players):
        side_pots = cls._get_side_pots(players)
        main_pot = cls._get_main_pot(players, side_pots)
        return side_pots + [main_pot]

    @classmethod
    def _calc_prize_distribution(cls, community_card, players):
        prize_map = cls._create_prize_map(len(players))
        pots = cls.create_pot(players)
        for pot in pots:
            winners = cls._find_winners_from(community_card, pot["eligibles"])
            prize = int(pot["amount"] / len(winners))
            for winner in winners:
                prize_map[players.index(winner)] += prize
        return prize_map

    @classmethod
    def _create_prize_map(cls, player_num):
        def update(d, other):
            d.update(other)
            return d
        return reduce(update, [{i: 0} for i in range(player_num)], {})

    @classmethod
    def _find_winners_from(cls, community_card, players):
        """
        使用 treys 库找到赢家 - 更准确的手牌比较
        """
        active_players = [player for player in players if player.is_active()]
        
        if len(active_players) == 0:
            return []
        
        if len(active_players) == 1:
            return active_players
        
        # 使用 treys 评估每个玩家的手牌（分数越小越好）
        scores = []
        for player in active_players:
            score = eval_hand_with_treys(player.hole_card, community_card)
            scores.append(score)
        
        # treys 分数越小越好，所以找最小值
        best_score = min(scores)
        
        # 找出所有拥有最佳分数的玩家
        winners = [
            player for score, player in zip(scores, active_players)
            if score == best_score
        ]
        
        return winners

    @classmethod
    def _gen_hand_info_if_needed(cls, players, community):
        """生成手牌信息（使用原始 PyPokerEngine 格式以保持兼容性）"""
        active_players = [player for player in players if player.is_active()]
        
        def gen_hand_info(player):
            return {
                "uuid": player.uuid,
                "hand": HandEvaluator.gen_hand_rank_info(player.hole_card, community)
            }
        
        return [] if len(active_players) == 1 else [gen_hand_info(player) for player in active_players]

    @classmethod
    def _get_main_pot(cls, players, sidepots):
        max_pay = max([pay.amount for pay in cls._get_payinfo(players)])
        return {
            "amount": cls._get_players_pay_sum(players) - cls._get_sidepots_sum(sidepots),
            "eligibles": [player for player in players if player.pay_info.amount == max_pay]
        }

    @classmethod
    def _get_players_pay_sum(cls, players):
        return sum([pay.amount for pay in cls._get_payinfo(players)])

    @classmethod
    def _get_side_pots(cls, players):
        pay_amounts = [payinfo.amount for payinfo in cls._fetch_allin_payinfo(players)]
        gen_sidepots = lambda sidepots, allin_amount: sidepots + [cls._create_sidepot(players, sidepots, allin_amount)]
        return reduce(gen_sidepots, pay_amounts, [])

    @classmethod
    def _create_sidepot(cls, players, smaller_side_pots, allin_amount):
        return {
            "amount": cls._calc_sidepot_size(players, smaller_side_pots, allin_amount),
            "eligibles": cls._select_eligibles(players, allin_amount)
        }

    @classmethod
    def _calc_sidepot_size(cls, players, smaller_side_pots, allin_amount):
        add_chip_for_pot = lambda pot, player: pot + min(allin_amount, player.pay_info.amount)
        target_pot_size = reduce(add_chip_for_pot, players, 0)
        return target_pot_size - cls._get_sidepots_sum(smaller_side_pots)

    @classmethod
    def _get_sidepots_sum(cls, sidepots):
        return reduce(lambda sum_, sidepot: sum_ + sidepot["amount"], sidepots, 0)

    @classmethod
    def _select_eligibles(cls, players, allin_amount):
        return [player for player in players if cls._is_eligible(player, allin_amount)]

    @classmethod
    def _is_eligible(cls, player, allin_amount):
        return player.pay_info.amount >= allin_amount and \
            player.pay_info.status != PayInfo.FOLDED

    @classmethod
    def _fetch_allin_payinfo(cls, players):
        payinfo = cls._get_payinfo(players)
        allin_info = [info for info in payinfo if info.status == PayInfo.ALLIN]
        return sorted(allin_info, key=lambda info: info.amount)

    @classmethod
    def _get_payinfo(cls, players):
        return [player.pay_info for player in players]


def patch_pypokerengine():
    """
    在运行时替换 PyPokerEngine 的 GameEvaluator
    应该在游戏启动前调用一次
    """
    import pypokerengine.engine.game_evaluator as ge_module
    import pypokerengine.engine.round_manager as rm_module
    import pypokerengine.engine.data_encoder as de_module
    
    # 替换 GameEvaluator 在所有模块中的引用
    ge_module.GameEvaluator = PatchedGameEvaluator
    rm_module.GameEvaluator = PatchedGameEvaluator
    de_module.GameEvaluator = PatchedGameEvaluator
    
    print("[PatchedEvaluator] PyPokerEngine GameEvaluator has been patched with treys-based evaluation")


# 自动应用补丁
patch_pypokerengine()

