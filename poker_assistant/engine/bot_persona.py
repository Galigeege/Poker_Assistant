"""
Bot 性格定义模块
基于《哈林顿在现金桌》理论的两种核心打法风格：TAG（紧凶）和 LAG（松凶）
"""
from dataclasses import dataclass
from typing import Optional

@dataclass
class BotPersona:
    name: str
    description: str
    playing_style: str
    style_code: str  # "tag", "lag" - 用于 Prompt 中的风格指令
    # 是否使用专用 Prompt 模板
    use_custom_prompt: bool = True
    custom_prompt_file: str = "bot_action_harrington.txt"
    
    def __repr__(self):
        return f"Persona: {self.name} ({self.style_code.upper()})"


# ==================== 两种核心打法风格 ====================
# 基于哈林顿理论，TAG 为默认，LAG 用于针对紧弱对手

PERSONAS = {
    # TAG（紧凶 - 哈林顿标准打法）
    "tag": BotPersona(
        name="紧凶 (TAG)",
        description="你是哈林顿理论的标准执行者。起手牌严谨，翻牌后激进。你是职业牌手的典型风格。",
        playing_style="""Tight Aggressive (TAG) 风格。你的核心策略：
- 翻牌前：玩前 15-20% 的起手牌，严格遵循位置原则
  * EP: 大对子(TT+)、AK/AQ
  * MP: 加入 99/88/AJs/KQs
  * LP: 加入同花连张(87s+)、小对子
- 翻牌后：主动建立底池，不被动跟注
  * 干燥面：高频 C-Bet (60-70%)
  * 湿润面：有牌继续，无牌放弃
- 混合策略：强牌偶尔慢打(20%)，保护过牌范围
- 位置意识：在位置内更激进，OOP 更谨慎
- 你是默认的最优打法""",
        style_code="tag"
    ),
    
    # C型：LAG（松凶）
    "lag": BotPersona(
        name="松凶 (LAG)",
        description="你是一个高频施压的玩家，擅长利用位置优势和弃牌率。你专门针对紧弱对手。",
        playing_style="""Loose Aggressive (LAG) 风格。你的核心策略：
- 翻牌前：放宽范围到 25-30%，尤其在后位
  * 在 CO/BTN 几乎任何两张牌都可以开池
  * 大量 3-Bet 轻牌（A5s, K9s 等阻挡牌）
- 翻牌后：高频施压，利用弃牌率
  * C-Bet 频率 70-80%，不管有没有牌
  * 转牌继续开枪（Double Barrel）如果出惊悚牌
  * 河牌敢于诈唬全下
- 半诈唬：任何听牌都是加注的理由
- 目标对手：专门针对紧弱玩家（太多弃牌的人）
- 风险：遇到跟注站或激进玩家时需要收紧
- 你需要强大的读牌能力和心理素质""",
        style_code="lag"
    )
}


def get_default_persona() -> BotPersona:
    """获取默认性格（TAG - 紧凶，哈林顿标准打法）"""
    return PERSONAS["tag"]


def get_random_persona() -> BotPersona:
    """随机获取一种性格"""
    import random
    return random.choice(list(PERSONAS.values()))


def get_persona_by_name(name: str) -> Optional[BotPersona]:
    """根据名称获取性格"""
    name_lower = name.lower()
    # 支持多种名称匹配
    if name_lower in PERSONAS:
        return PERSONAS[name_lower]
    # 别名支持
    aliases = {
        "a": "tag", "tight_aggressive": "tag", "standard": "tag", "harrington": "tag", "tight": "tag",
        "b": "lag", "loose_aggressive": "lag", "aggressive": "lag", "loose": "lag"
    }
    if name_lower in aliases:
        return PERSONAS[aliases[name_lower]]
    return None


def get_all_personas() -> dict:
    """获取所有性格"""
    return PERSONAS



