"""
LLM 客户端工厂
根据配置创建对应的 LLM 客户端实例
"""
import os
from typing import Optional
from poker_assistant.llm_service.base_client import BaseLLMClient
from poker_assistant.llm_service.openai_compatible_client import OpenAICompatibleClient
from poker_assistant.llm_service.gemini_client import GeminiClient
from poker_assistant.llm_service.deepseek_client import DeepseekClient # 保留原类以兼容

def get_llm_client(
    provider: str = None,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None,
    model: Optional[str] = None
) -> BaseLLMClient:
    """
    获取 LLM 客户端实例
    
    Args:
        provider: 提供商名称 (deepseek/openai/gemini)，如果为 None 则读取环境变量 LLM_PROVIDER
    
    Returns:
        LLM 客户端实例
    """
    provider = (provider or os.getenv("LLM_PROVIDER", "deepseek")).lower()
    
    if provider == "deepseek":
        # 即使 DeepseekClient 还没有重构为继承 BaseLLMClient，
        # 我们也可以在这里返回它，只要它实现了 chat 方法。
        # 但为了代码整洁，最好后续重构 DeepseekClient。
        # 目前我们用 OpenAICompatibleClient 替代它，或者保留旧类。
        # 这里为了稳健，我们使用 OpenAICompatibleClient 来连接 Deepseek。
        resolved_api_key = api_key or os.getenv("DEEPSEEK_API_KEY")
        # 再次检查 Key 是否有效
        if not resolved_api_key or "your_" in resolved_api_key:
             # 如果当前 provider 的 Key 无效，尝试 fallback 或者报错
             pass
             
        return OpenAICompatibleClient(
            api_key=resolved_api_key,
            base_url=base_url or "https://api.deepseek.com",
            model=model or "deepseek-chat"
        )
        
    elif provider == "openai":
        resolved_api_key = api_key or os.getenv("OPENAI_API_KEY")
        if not resolved_api_key or "your_" in resolved_api_key:
            raise ValueError(f"OPENAI_API_KEY 无效或未配置 (Current Provider: {provider})")
        return OpenAICompatibleClient(
            api_key=resolved_api_key,
            base_url=base_url or "https://api.openai.com/v1",
            model=model or os.getenv("OPENAI_MODEL", "gpt-4o")
        )
        
    elif provider == "gemini":
        resolved_api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not resolved_api_key or "your_" in resolved_api_key:
            raise ValueError(f"GEMINI_API_KEY 无效或未配置 (Current Provider: {provider})")
        return GeminiClient(
            api_key=resolved_api_key,
            model=model or os.getenv("GEMINI_MODEL", "gemini-pro")
        )
        
    else:
        raise ValueError(f"不支持的 LLM 提供商: {provider}")

