"""
策略建议引擎
为玩家提供实时的行动建议
"""
from typing import Dict, Any, List, Optional
import json
import os

from poker_assistant.llm_service.deepseek_client import DeepseekClient
from poker_assistant.llm_service.client_factory import get_llm_client
from poker_assistant.llm_service.base_client import BaseLLMClient
from poker_assistant.llm_service.prompt_manager import PromptManager
from poker_assistant.llm_service.context_manager import ContextManager
from poker_assistant.utils.card_utils import format_cards, get_street_name, format_chips
from poker_assistant.utils.poker_math import PokerMath


class StrategyAdvisor:
    """策略建议引擎（支持局内上下文）"""
    
    def __init__(self, 
                 llm_client: Optional[BaseLLMClient] = None,
                 prompt_manager: Optional[PromptManager] = None,
                 context_manager: Optional[ContextManager] = None):
        """
        初始化策略建议引擎
        
        Args:
            llm_client: LLM 客户端 (BaseLLMClient)
            prompt_manager: Prompt 管理器
            context_manager: 上下文管理器（用于保留局内历史）
        """
        self.llm_client = llm_client or get_llm_client() # 使用工厂获取客户端
        self.prompt_manager = prompt_manager or PromptManager()
        self.context_manager = context_manager or ContextManager()
        self.poker_math = PokerMath()
        
        # 当前局 ID
        self.current_round_id: Optional[str] = None
        
        # 对手建模器引用（外部传入）
        self.opponent_modeler = None
    
    def start_new_round(self, round_id: str):
        """
        开始新一局
        
        Args:
            round_id: 局号
        """
        self.current_round_id = round_id
        self.context_manager.clear_history()
    
    def set_opponent_modeler(self, opponent_modeler):
        """设置对手建模器"""
        self.opponent_modeler = opponent_modeler
    
    def get_advice(self,
                   hole_cards: List[str],
                   community_cards: List[str],
                   street: str,
                   position: str,
                   pot_size: int,
                   stack_size: int,
                   call_amount: int,
                   valid_actions: List[Dict],
                   opponent_actions: Optional[List[Dict]] = None,
                   active_opponents: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        获取策略建议
        
        Args:
            hole_cards: 手牌
            community_cards: 公共牌
            street: 当前街道
            position: 位置
            pot_size: 底池大小
            stack_size: 筹码数量
            call_amount: 需要跟注的金额
            valid_actions: 可选行动
            opponent_actions: 对手行动历史（完整局内历史）
        
        Returns:
            建议结果字典
        """
        try:
            # 格式化数据
            hole_cards_str = format_cards(hole_cards)
            community_cards_str = format_cards(community_cards) if community_cards else "无"
            street_cn = get_street_name(street)
            
            # 格式化对手行动（传递完整历史）
            if opponent_actions and len(opponent_actions) > 0:
                actions_str = self._format_opponent_actions(opponent_actions, pot_size)
            else:
                actions_str = "对手尚未行动"
            
            # 格式化可选行动
            valid_actions_str = self._format_valid_actions(valid_actions)
            
            # 添加对手建模信息
            opponent_info = ""
            if self.opponent_modeler and active_opponents:
                opponent_summaries = []
                for opp_name in active_opponents:
                    summary = self.opponent_modeler.get_opponent_summary(opp_name, detailed=True)
                    opponent_summaries.append(summary)
                if opponent_summaries:
                    opponent_info = "\n\n【对手特点】\n" + "\n".join(opponent_summaries)
            
            # 数学分析 (PokerMath)
            math_analysis = self.poker_math.analyze_hand(
                hole_cards=hole_cards,
                community_cards=community_cards,
                pot_size=pot_size,
                to_call=call_amount
            )
            
            math_context = (
                f"\n\n【数学参考数据】\n"
                f"- 胜率 (Equity): {math_analysis['equity_percent']}\n"
                f"- 赔率需求 (Pot Odds): {math_analysis['pot_odds_percent']}\n"
                f"- 期望值 (EV): {math_analysis['ev_call']} ({'正期望 +EV' if math_analysis['is_ev_positive'] else '负期望 -EV'})\n"
                f"- 建议: 仅供参考，请结合对手风格和牌面纹理综合判断。"
            )

            # 构建 prompt
            current_prompt = self.prompt_manager.format_template(
                "strategy_advice",
                hole_cards=hole_cards_str,
                community_cards=community_cards_str,
                street=street_cn,
                position=position,
                pot_size=pot_size,
                stack_size=stack_size,
                call_amount=call_amount,
                opponent_actions=actions_str,
                valid_actions=valid_actions_str
            )
            
            # 添加数学信息
            current_prompt += math_context
            
            # 添加对手信息
            if opponent_info:
                current_prompt += opponent_info
            
            # 构建消息列表（包含局内历史）
            messages = []
            
            # 添加本局之前的建议（最近2轮 = 4条消息）
            history = list(self.context_manager.conversation_history)[-4:]
            for msg in history:
                messages.append(msg)
            
            # 如果有历史，添加上下文提示
            if history:
                context_hint = "\n\n【上下文】你在本局之前已经给出过建议，请保持策略连贯性。"
                current_prompt += context_hint
            
            # 添加当前请求
            messages.append({"role": "user", "content": current_prompt})
            
            # 调用 LLM (提升 max_tokens 到 3000)
            debug_mode = os.getenv('DEBUG', 'false').lower() == 'true'
            response = self.llm_client.chat(
                messages, 
                temperature=0.7, 
                max_tokens=3000,  # 提升到 3000
                debug=debug_mode
            )
            
            # 保存到历史
            self.context_manager.add_user_message(current_prompt)
            self.context_manager.add_assistant_message(response)
            
            # 解析响应
            advice = self._parse_response(response)
            
            # 添加原始数据
            advice["raw_response"] = response
            advice["pot_size"] = pot_size
            advice["stack_size"] = stack_size
            advice["call_amount"] = call_amount
            
            return advice
        
        except Exception as e:
            # 错误处理：返回降级建议
            return self._fallback_advice(e, valid_actions)
    
    def get_simple_advice(self,
                         hole_cards: List[str],
                         community_cards: List[str],
                         pot_size: int,
                         call_amount: int,
                         valid_actions: List[Dict]) -> str:
        """
        获取简化的文本建议（更快）
        
        Args:
            hole_cards: 手牌
            community_cards: 公共牌
            pot_size: 底池
            call_amount: 跟注金额
            valid_actions: 可选行动
        
        Returns:
            建议文本
        """
        try:
            advice = self.get_advice(
                hole_cards=hole_cards,
                community_cards=community_cards,
                street="flop",  # 默认
                position="",
                pot_size=pot_size,
                stack_size=1000,  # 默认
                call_amount=call_amount,
                valid_actions=valid_actions
            )
            
            return advice.get("reasoning", "暂无建议")
        
        except Exception as e:
            return f"获取建议时出错: {str(e)}"
    
    def _format_opponent_actions(self, actions: List[Dict], pot_size: int = 0) -> str:
        """格式化对手行动历史（包含完整局内历史和下注尺度分析）"""
        if not actions:
            return "无"
        
        # 检查是否是完整历史格式（带 'street' 字段）
        is_full_history = 'street' in actions[0] if actions else False
        
        if is_full_history:
            # 按街道分组格式化
            formatted_lines = []
            current_street = ""
            
            for action in actions:
                street = action.get('street', 'unknown')
                if street != current_street:
                    current_street = street
                    formatted_lines.append(f"\n[{get_street_name(street)}]")
                
                player = action.get("player", "对手")
                action_type = action.get("action", "")
                amount = action.get("amount", 0)
                
                line = self._format_single_action(player, action_type, amount, pot_size)
                formatted_lines.append(line)
            
            return "\n".join(formatted_lines)
        else:
            # 兼容旧格式（仅当前街道）
            formatted = []
            for action in actions[-5:]:
                player = action.get("player", "对手")
                action_type = action.get("action", "")
                amount = action.get("amount", 0)
                formatted.append(self._format_single_action(player, action_type, amount, pot_size))
            return "；".join(formatted)

    def _format_single_action(self, player, action_type, amount, pot_size):
        """格式化单个行动"""
        action_cn = {
            "fold": "弃牌",
            "call": "跟注",
            "check": "过牌",
            "raise": "加注",
            "allin": "全下"
        }.get(action_type, action_type)
        
        if amount > 0:
            # 计算下注尺度（相对于底池）
            # 注意：这里的 pot_size 是当前总底池，对于历史行动可能不完全准确，
            # 但作为近似参考已足够
            size_desc = ""
            if pot_size > 0:
                bet_to_pot_ratio = amount / pot_size
                if bet_to_pot_ratio < 0.33:
                    size_desc = "（小）"
                elif bet_to_pot_ratio < 0.5:
                    size_desc = "（小）"
                elif bet_to_pot_ratio < 0.75:
                    size_desc = "（中）"
                elif bet_to_pot_ratio < 1.2:
                    size_desc = "（标准）"
                elif bet_to_pot_ratio < 2.0:
                    size_desc = "（超额）"
                else:
                    size_desc = "（巨大）"
            
            return f"{player} {action_cn} ${amount}{size_desc}"
        else:
            return f"{player} {action_cn}"
    
    def _format_valid_actions(self, valid_actions: List[Dict]) -> str:
        """格式化可选行动"""
        actions = []
        
        for action_info in valid_actions:
            action = action_info.get("action", "")
            
            if action == "fold":
                actions.append("弃牌")
            elif action == "call":
                amount = action_info.get("amount", 0)
                actions.append(f"跟注 ${amount}")
            elif action == "raise":
                min_amount = action_info.get("amount", {}).get("min", 0)
                max_amount = action_info.get("amount", {}).get("max", 0)
                if min_amount > 0:
                    actions.append(f"加注 ${min_amount}-${max_amount}")
        
        return " / ".join(actions)
    
    def _parse_response(self, response: str) -> Dict[str, Any]:
        """
        解析 AI 响应 (JSON)
        
        Args:
            response: AI 响应文本
        
        Returns:
            解析后的建议字典
        """
        advice = {
            "reasoning": response,
            "primary_strategy": None,
            "alternative_strategy": None,
            "recommended_action": "call", # 默认回退
            "confidence": "medium"
        }
        
        try:
            # 1. 清理 Markdown 标记
            content = response.replace("```json", "").replace("```", "").strip()
            
            # 2. 查找 JSON 块 (如果还有其他文本)
            if "{" in content:
                start = content.find("{")
                end = content.rfind("}") + 1
                content = content[start:end]
            
            # 3. 解析 JSON
            parsed = json.loads(content)
            advice.update(parsed)
            
            # 4. 为了兼容旧代码，将 primary_strategy 的 action 映射到 recommended_action
            if "primary_strategy" in parsed and parsed["primary_strategy"]:
                action = parsed["primary_strategy"]["action"].lower()
                if action == "check":
                    advice["recommended_action"] = "call" 
                    advice["call_amount"] = 0 # 标记为 check
                elif action == "all_in":
                    advice["recommended_action"] = "allin"
                else:
                    advice["recommended_action"] = action
                
                # 映射金额
                if "amount" in parsed["primary_strategy"]:
                    advice["raise_amount"] = parsed["primary_strategy"]["amount"]
            
        except Exception as e:
            # 解析失败，回退到文本提取
            print(f"JSON解析失败: {e}, 尝试文本提取")
            advice["recommended_action"] = self._extract_action(response)
        
        return advice
    
    def _extract_action(self, text: str) -> str:
        """从文本中提取推荐行动"""
        text_lower = text.lower()
        
        if "弃牌" in text or "fold" in text_lower:
            return "fold"
        elif "加注" in text or "raise" in text_lower:
            return "raise"
        elif "跟注" in text or "call" in text_lower:
            return "call"
        elif "过牌" in text or "check" in text_lower:
            return "call"  # 过牌相当于跟注0
        
        return "call"  # 默认跟注
    
    def _fallback_advice(self, error: Exception, valid_actions: List[Dict]) -> Dict[str, Any]:
        """降级建议（当 API 失败时）"""
        return {
            "reasoning": f"AI 建议暂时不可用（{str(error)}）。请根据自己的判断决定。",
            "recommended_action": "call",
            "confidence": "low",
            "error": str(error)
        }
    
    def format_advice_display(self, advice: Dict[str, Any]) -> str:
        """
        格式化建议用于显示
        
        Args:
            advice: 建议字典
        
        Returns:
            格式化的文本
        """
        lines = []
        
        # 1. 主选策略 (Primary Strategy)
        primary = advice.get("primary_strategy")
        if primary:
            action = primary.get("action", "").lower()
            amount = primary.get("amount", 0)
            frequency = primary.get("frequency", "")
            
            action_cn = self._translate_action(action)
            
            amount_str = ""
            if action == "raise":
                amount_str = f" ${amount}"
            
            lines.append(f"🎯 主选策略: {action_cn}{amount_str} ({frequency})")
        else:
            # 兼容旧逻辑
            action = advice.get("recommended_action", "")
            action_cn = self._translate_action(action)
            lines.append(f"💡 推荐行动: {action_cn}")
            
        # 2. 备选策略 (Alternative Strategy)
        alternative = advice.get("alternative_strategy")
        if alternative:
            action = alternative.get("action", "").lower()
            amount = alternative.get("amount", 0)
            frequency = alternative.get("frequency", "")
            condition = alternative.get("condition", "")
            
            action_cn = self._translate_action(action)
            
            amount_str = ""
            if action == "raise":
                amount_str = f" ${amount}"
            
            lines.append(f"🔄 备选策略: {action_cn}{amount_str} ({frequency})")
            if condition:
                lines.append(f"   └─ 适用条件: {condition}")
        
        # 3. 理由
        reasoning = advice.get("reasoning", "")
        if reasoning:
            lines.append(f"\n📝 深度分析:\n{reasoning}")
        
        # 4. 数学指标
        if "win_probability" in advice:
            win_prob = advice["win_probability"]
            if isinstance(win_prob, (int, float)):
                lines.append(f"\n📊 胜率估算: {win_prob*100:.0f}%")
        
        return "\n".join(lines)

    def _translate_action(self, action: str) -> str:
        """翻译行动名称"""
        action = action.lower()
        if action == "fold": return "🚫 弃牌"
        if action == "call": return "✅ 跟注"
        if action == "check": return "✅ 过牌"
        if action == "raise": return "📈 加注"
        if action == "all_in" or action == "allin": return "💰 全下"
        return action

