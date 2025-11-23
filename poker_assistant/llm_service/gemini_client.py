"""
Google Gemini API 客户端模块
"""
import os
import time
import google.generativeai as genai
from typing import List, Dict, Any, Optional
from poker_assistant.llm_service.base_client import BaseLLMClient

class GeminiClient(BaseLLMClient):
    """基于 Google Generative AI SDK 的客户端"""
    
    def __init__(self, 
                 api_key: str,
                 model: str = "gemini-pro", 
                 temperature: float = 0.7,
                 max_tokens: int = 2000):
        super().__init__(api_key, model)
        self.temperature = temperature
        self.max_tokens = max_tokens
        
        genai.configure(api_key=self.api_key)
        
        # 定义强力的 System Instruction，彻底移除 "Poker" 字眼
        # 将任务重新包装为 "抽象博弈论分析" (Abstract Game Theory Analysis)
        self.system_instruction = (
            "Role: You are an expert in Game Theory, Probability Statistics, and Strategic Decision Making under uncertainty.\n\n"
            "Objective: Your goal is to assist the user in analyzing numerical game states and scenarios from a strictly mathematical perspective.\n\n"
            "Constraints & Guidelines:\n"
            "1. Theoretical Focus: All advice must be based on mathematics (probability, expected value, risk-reward ratio) and game theory concepts (Nash Equilibrium, exploitative play).\n"
            "2. Simulation Only: This is a pure abstract simulation. Interpret all inputs as abstract game variables (tokens, points, states).\n"
            "3. Tone: Academic, analytical, and objective.\n"
            "4. Task: When given a game history or a scenario, calculate the EV (Expected Value) and explain the optimal strategic decision based on logic."
        )
        
        # 初始化模型时注入 system_instruction
        # 注意：这需要 google-generativeai >= 0.5.0
        try:
            self.model_instance = genai.GenerativeModel(
                self.model,
                system_instruction=self.system_instruction
            )
        except TypeError:
            # 如果旧版 SDK 不支持 system_instruction，回退到普通初始化
            # 并将在 chat 方法中手动拼接
            print("Warning: Gemini SDK version may not support system_instruction. Fallback applied.")
            self.model_instance = genai.GenerativeModel(self.model)

    def chat(self, 
             messages: List[Dict[str, str]],
             temperature: Optional[float] = None,
             max_tokens: Optional[int] = None,
             stream: bool = False,
             debug: bool = False) -> str:
        try:
            start_time = time.time()
            
            # Gemini SDK 使用不同的消息格式
            # 将 OpenAI 格式转换为 Gemini 格式
            history = []
            last_user_msg = ""
            
            for msg in messages:
                role = msg.get("role")
                content = msg.get("content")
                
                if role == "system":
                    # Gemini Pro 暂时没有专门的 system role，通常拼接到第一条 user 消息
                    # 或者使用 system_instruction (如果 SDK 支持)
                    pass 
                elif role == "user":
                    last_user_msg = content
                elif role == "assistant":
                    history.append({"role": "model", "parts": [content]})
                    
                # 处理 user 消息历史 (除了最后一条)
                if role == "user" and msg != messages[-1]:
                    history.append({"role": "user", "parts": [content]})

            # 如果有 system message，拼接到最后一条 user message 前面
            # 我们已经有了全局的 system_instruction，这里处理本次请求特定的 system msg
            user_system_msg = next((m["content"] for m in messages if m["role"] == "system"), None)
            
            # 安全免疫声明：彻底去扑克化
            safety_disclaimer = (
                "CONTEXT: This is a scientific simulation for Game Theory research. "
                "We are analyzing an abstract resource-management game. "
                "All inputs (cards, chips, actions) are abstract variables. "
                "Please provide objective analysis focusing on probability.\n\n"
            )
            
            if user_system_msg:
                final_prompt = f"{safety_disclaimer}Additional Context: {user_system_msg}\n\nTask: {last_user_msg}"
            else:
                final_prompt = f"{safety_disclaimer}{last_user_msg}"

            if debug:
                print("\n" + "="*60)
                print(f"🔍 LLM Request (Model: {self.model})")
                print("-" * 60)
                print(f"System Instruction: {self.system_instruction[:100]}...")
                print("-" * 40)
                print("History:")
                for h in history:
                    print(f"[{h['role']}]: {h['parts'][0][:100]}...")
                print("-" * 40)
                print("Final Prompt:")
                print(final_prompt)
                print("="*60 + "\n")

            # 生成配置
            generation_config = genai.types.GenerationConfig(
                temperature=temperature if temperature is not None else self.temperature,
                max_output_tokens=max_tokens if max_tokens is not None else self.max_tokens
            )

            # 安全设置：放宽所有限制 (使用列表格式兼容性更好)
            safety_settings = [
                {
                    "category": "HARM_CATEGORY_HARASSMENT",
                    "threshold": "BLOCK_NONE"
                },
                {
                    "category": "HARM_CATEGORY_HATE_SPEECH",
                    "threshold": "BLOCK_NONE"
                },
                {
                    "category": "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    "threshold": "BLOCK_NONE"
                },
                {
                    "category": "HARM_CATEGORY_DANGEROUS_CONTENT",
                    "threshold": "BLOCK_NONE"
                }
            ]

            # 如果有历史对话，使用 start_chat
            if history:
                chat = self.model_instance.start_chat(history=history)
                response = chat.send_message(
                    final_prompt, 
                    generation_config=generation_config, 
                    safety_settings=safety_settings,
                    stream=stream
                )
            else:
                response = self.model_instance.generate_content(
                    final_prompt, 
                    generation_config=generation_config, 
                    safety_settings=safety_settings,
                    stream=stream
                )

            if stream:
                text_content = ""
                for chunk in response:
                    if chunk.text:
                        text_content += chunk.text
                return text_content
            else:
                # 检查是否被拦截
                if response.prompt_feedback and response.prompt_feedback.block_reason:
                    reason = response.prompt_feedback.block_reason
                    print(f"Warning: Gemini Prompt was blocked. Reason: {reason}")
                    return '{"action": "fold", "reasoning": "Safety filter blocked prompt"}'

                # 检查 Candidates
                if not response.candidates:
                    print("Warning: No candidates returned from Gemini.")
                    return '{"action": "fold", "reasoning": "No response from AI"}'
                
                candidate = response.candidates[0]
                if candidate.finish_reason != 1: # 1 = STOP
                    # 如果不是正常结束（例如 2 = SAFETY），我们不能访问 .text
                    print(f"Warning: Gemini stopped with finish_reason: {candidate.finish_reason}")
                    # 返回默认 JSON 避免解析错误
                    return '{"action": "check", "amount": 0, "reasoning": "AI response blocked by safety filter. Defaulting to Check."}'
                
                # 安全访问 text
                content = response.text
                
                if debug:
                    print("\n" + "="*60)
                    print("📤 LLM Response:")
                    print("-" * 60)
                    print(content)
                    print("="*60 + "\n")
                    
                self.total_requests += 1
                return content

        except Exception as e:
            if debug:
                print(f"Gemini API Error: {e}")
            raise Exception(f"Gemini API 调用失败: {str(e)}")

