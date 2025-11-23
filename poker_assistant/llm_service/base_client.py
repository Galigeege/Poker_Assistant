"""
LLM 客户端基类模块
定义所有 LLM 客户端必须实现的接口
"""
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class BaseLLMClient(ABC):
    """LLM 客户端抽象基类"""
    
    def __init__(self, api_key: str, model: str):
        self.api_key = api_key
        self.model = model
        self.total_requests = 0
        self.total_tokens = 0
        self.total_cost = 0.0

    @abstractmethod
    def chat(self, 
             messages: List[Dict[str, str]],
             temperature: Optional[float] = None,
             max_tokens: Optional[int] = None,
             stream: bool = False,
             debug: bool = False) -> str:
        """
        发送聊天请求
        
        Args:
            messages: 消息列表 [{"role": "user/assistant/system", "content": "..."}]
            temperature: 温度参数
            max_tokens: 最大 token 数
            stream: 是否流式输出
            debug: 是否开启调试
            
        Returns:
            AI 回复内容
        """
        pass

    def chat_simple(self, 
                   user_message: str, 
                   system_message: Optional[str] = None) -> str:
        """
        简化的聊天接口
        """
        messages = []
        if system_message:
            messages.append({"role": "system", "content": system_message})
        messages.append({"role": "user", "content": user_message})
        
        return self.chat(messages)

    def get_statistics(self) -> Dict[str, Any]:
        """获取使用统计"""
        return {
            "total_requests": self.total_requests,
            "total_tokens": self.total_tokens,
            "total_cost": self.total_cost
        }

