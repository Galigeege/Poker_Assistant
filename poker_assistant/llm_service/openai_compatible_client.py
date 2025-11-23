"""
OpenAI 兼容客户端基类
Deepseek 和 OpenAI 都可以继承此类
"""
import time
import os
from typing import List, Dict, Any, Optional
from openai import OpenAI
from poker_assistant.llm_service.base_client import BaseLLMClient

class OpenAICompatibleClient(BaseLLMClient):
    """基于 OpenAI SDK 的兼容客户端"""
    
    def __init__(self, 
                 api_key: str, 
                 base_url: str,
                 model: str,
                 default_temperature: float = 0.7,
                 default_max_tokens: int = 2000,
                 timeout: int = 30):
        super().__init__(api_key, model)
        self.base_url = base_url
        self.default_temperature = default_temperature
        self.default_max_tokens = default_max_tokens
        
        self.client = OpenAI(
            api_key=self.api_key,
            base_url=self.base_url,
            timeout=timeout
        )

    def chat(self, 
             messages: List[Dict[str, str]],
             temperature: Optional[float] = None,
             max_tokens: Optional[int] = None,
             stream: bool = False,
             debug: bool = False) -> str:
        try:
            start_time = time.time()
            temp = temperature if temperature is not None else self.default_temperature
            tokens = max_tokens if max_tokens is not None else self.default_max_tokens
            
            if debug:
                print("\n" + "="*60)
                print(f"🔍 LLM Request (Model: {self.model})")
                print("-" * 60)
                for msg in messages:
                    role = msg.get('role', 'unknown').upper()
                    content = msg.get('content', '')
                    print(f"[{role}]:")
                    print(content)
                    print("-" * 40)
                print("="*60 + "\n")
            
            response = self.client.chat.completions.create(
                model=self.model,
                messages=messages,
                temperature=temp,
                max_tokens=tokens,
                stream=stream,
                top_p=0.95,
                frequency_penalty=0.0,
                presence_penalty=0.0
            )
            
            if stream:
                content = ""
                for chunk in response:
                    if chunk.choices[0].delta.content:
                        content += chunk.choices[0].delta.content
                
                if debug:
                    print("\n" + "="*60)
                    print("📤 LLM Response (Streamed):")
                    print("-" * 60)
                    print(content)
                    print("="*60 + "\n")
                    
                return content
            else:
                content = response.choices[0].message.content
                
                if debug:
                    print("\n" + "="*60)
                    print("📤 LLM Response:")
                    print("-" * 60)
                    print(content)
                    print("="*60 + "\n")
                
                # Stats
                self.total_requests += 1
                if hasattr(response, 'usage'):
                    self.total_tokens += response.usage.total_tokens
                    
                return content
                
        except Exception as e:
            if debug:
                print(f"API Error: {e}")
            raise e

