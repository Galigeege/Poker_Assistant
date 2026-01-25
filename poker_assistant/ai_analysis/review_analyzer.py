"""
复盘分析引擎
对已结束的对局进行深度分析
"""
import json
import os
from typing import Dict, Any, List, Optional

from poker_assistant.llm_service.client_factory import get_llm_client
from poker_assistant.utils.card_utils import format_cards


class ReviewAnalyzer:
    """复盘分析引擎"""
    
    def __init__(
        self,
        provider: Optional[str] = None,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        model: Optional[str] = None
    ):
        """初始化复盘分析引擎"""
        self.llm_client = get_llm_client(
            provider=provider,
            api_key=api_key,
            base_url=base_url,
            model=model
        )
        
        # 加载结构化 prompt 模板
        self.prompt_template = ""
        try:
            prompt_path = os.path.join(os.path.dirname(__file__), '../prompts/review_analysis_structured.txt')
            with open(prompt_path, 'r', encoding='utf-8') as f:
                self.prompt_template = f.read()
        except Exception as e:
            print(f"[ReviewAnalyzer] Error loading prompt template: {e}")
    
    def generate_review(self,
                       round_count: int,
                       hole_cards: List[str],
                       community_cards: List[str],
                       action_history: List[Dict],
                       winners: List[Dict],
                       hand_info: List[Dict],
                       final_pot: int) -> Dict[str, Any]:
        """
        生成结构化复盘报告
        
        Args:
            round_count: 回合数
            hole_cards: 你的手牌
            community_cards: 最终公共牌
            action_history: 行动历史
            winners: 赢家信息
            hand_info: 手牌信息
            final_pot: 最终底池
        
        Returns:
            结构化的复盘报告 dict
        """
        try:
            # 格式化数据
            hole_cards_str = format_cards(hole_cards)
            community_cards_str = format_cards(community_cards) if community_cards else "无"
            
            # 格式化赢家
            winners_str = ", ".join([w.get("name", "未知") for w in winners])
            
            # 判断结果
            you_won = any("你" in w.get("name", "") for w in winners)
            result = "胜利" if you_won else "失败"
            
            # 格式化行动历史
            history_str = self._format_action_history(action_history)
            
            # 构建 prompt
            prompt = self.prompt_template.format(
                hole_cards=hole_cards_str,
                community_cards=community_cards_str,
                final_pot=final_pot,
                result=result,
                winners=winners_str,
                action_history=history_str
            )
            
            # 调用 LLM（详细分析需要足够的 token）
            messages = [{"role": "user", "content": prompt}]
            response = self.llm_client.chat(
                messages, 
                temperature=0.4,  # 适中的温度
                max_tokens=1500   # 足够的 token 用于详细分析
            )
            
            # 解析 JSON 响应
            return self._parse_response(response)
        
        except Exception as e:
            print(f"[ReviewAnalyzer] Error: {e}")
            import traceback
            traceback.print_exc()
            return {"error": f"复盘分析暂时不可用（{str(e)}）"}
    
    def _parse_response(self, response: str) -> Dict[str, Any]:
        """解析 LLM 响应，提取 JSON"""
        try:
            # 清理可能的 markdown 标记
            content = response.strip()
            
            # 尝试找到 JSON 块
            if "```json" in content:
                start = content.find("```json") + 7
                end = content.find("```", start)
                if end > start:
                    content = content[start:end].strip()
            elif "```" in content:
                start = content.find("```") + 3
                end = content.find("```", start)
                if end > start:
                    content = content[start:end].strip()
            
            # 解析 JSON
            result = json.loads(content)
            return result
            
        except json.JSONDecodeError as e:
            print(f"[ReviewAnalyzer] JSON parse error: {e}")
            print(f"[ReviewAnalyzer] Raw response: {response[:500]}...")
            # 返回原始内容作为 fallback
            return {
                "content": response,
                "error": "AI 返回了非结构化内容"
            }
    
    def _format_action_history(self, history: List[Dict]) -> str:
        """格式化行动历史"""
        if not history:
            return "无行动记录"
        
        formatted = []
        current_street = ""
        
        for h in history:
            street = h.get("street", "")
            player = h.get("player_name", "")
            action = h.get("action", "")
            amount = h.get("amount", 0)
            
            # 街道标题
            if street != current_street:
                current_street = street
                street_names = {
                    "preflop": "【翻牌前】",
                    "flop": "【翻牌圈】",
                    "turn": "【转牌圈】",
                    "river": "【河牌圈】"
                }
                formatted.append(street_names.get(street, f"【{street}】"))
            
            # 规范化行动：call 0 = check（过牌）
            action_lower = action.lower()
            if action_lower == "call" and (amount == 0 or amount is None):
                action_lower = "check"
            
            # 行动翻译
            action_cn = {
                "fold": "弃牌",
                "call": "跟注",
                "raise": "加注",
                "allin": "全下",
                "check": "过牌"
            }.get(action_lower, action)
            
            # 标记玩家行动
            player_label = "你" if player == "你" else player
            
            if amount and amount > 0 and action_lower not in ["fold", "check"]:
                formatted.append(f"  {player_label}: {action_cn} ${amount}")
            else:
                formatted.append(f"  {player_label}: {action_cn}")
        
        return "\n".join(formatted)
