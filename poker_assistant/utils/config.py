"""
配置管理模块
管理游戏配置、AI 配置和 LLM 配置
"""
import os
from typing import Dict, Any
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()


class Config:
    """配置类 - 单例模式"""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._load_config()
    
    def _load_config(self):
        """从环境变量加载配置"""
        # 强制重新加载 .env，覆盖已有的环境变量
        load_dotenv(override=True)
        
        # 辅助函数：获取并过滤占位符
        def get_clean_env(key, default=""):
            val = os.getenv(key, default)
            # 如果值包含 "your_" 和 "_here"，说明是未修改的模板值，视为无效
            if "your_" in val and "_here" in val:
                return ""
            return val
            
        # Deepseek API 配置
        self.DEEPSEEK_API_KEY = get_clean_env("DEEPSEEK_API_KEY", "")
        self.DEEPSEEK_BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com/v1")
        
        # 多 LLM 支持配置
        self.LLM_PROVIDER = os.getenv("LLM_PROVIDER", "deepseek").lower() # deepseek, openai, gemini
        self.OPENAI_API_KEY = get_clean_env("OPENAI_API_KEY", "")
        self.GEMINI_API_KEY = get_clean_env("GEMINI_API_KEY", "")
        
        # 游戏配置
        self.GAME_INITIAL_STACK = int(os.getenv("GAME_INITIAL_STACK", "1000"))
        self.GAME_SMALL_BLIND = int(os.getenv("GAME_SMALL_BLIND", "5"))
        self.GAME_BIG_BLIND = int(os.getenv("GAME_BIG_BLIND", "10"))
        self.GAME_MAX_ROUND = int(os.getenv("GAME_MAX_ROUND", "100"))
        self.GAME_PLAYER_COUNT = int(os.getenv("GAME_PLAYER_COUNT", "6"))
        
        # AI 配置
        self.AI_OPPONENT_DIFFICULTY = os.getenv("AI_OPPONENT_DIFFICULTY", "mixed")  # easy/medium/hard/mixed
        self.AI_ANALYSIS_LEVEL = os.getenv("AI_ANALYSIS_LEVEL", "medium")
        self.AI_AUTO_SHOW_ADVICE = os.getenv("AI_AUTO_SHOW_ADVICE", "true").lower() == "true"
        self.AI_ENABLE_OPPONENT_ANALYSIS = os.getenv("AI_ENABLE_OPPONENT_ANALYSIS", "true").lower() == "true"
        self.AI_ENABLE_BOARD_ANALYSIS = os.getenv("AI_ENABLE_BOARD_ANALYSIS", "true").lower() == "true"
        self.AI_ENABLE_REVIEW = os.getenv("AI_ENABLE_REVIEW", "true").lower() == "true"
        self.AI_ENABLE_CHAT = os.getenv("AI_ENABLE_CHAT", "true").lower() == "true"
        
        # LLM 配置
        self.LLM_MODEL = os.getenv("LLM_MODEL", "deepseek-chat")
        self.LLM_TEMPERATURE = float(os.getenv("LLM_TEMPERATURE", "0.7"))
        self.LLM_MAX_TOKENS = int(os.getenv("LLM_MAX_TOKENS", "2000"))
        self.LLM_TIMEOUT = int(os.getenv("LLM_TIMEOUT", "30"))
        
        # 调试配置
        self.DEBUG = os.getenv("DEBUG", "false").lower() == "true"
        self.LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
        self.LOG_FILE = os.getenv("LOG_FILE", "logs/poker_assistant.log")
    
    def get_game_config(self) -> Dict[str, Any]:
        """获取游戏配置字典"""
        return {
            "max_round": self.GAME_MAX_ROUND,
            "initial_stack": self.GAME_INITIAL_STACK,
            "small_blind_amount": self.GAME_SMALL_BLIND,
            "big_blind_amount": self.GAME_BIG_BLIND,
            "player_count": self.GAME_PLAYER_COUNT,
        }
    
    def get_ai_config(self) -> Dict[str, Any]:
        """获取 AI 配置字典"""
        return {
            "opponent_difficulty": self.AI_OPPONENT_DIFFICULTY,
            "analysis_level": self.AI_ANALYSIS_LEVEL,
            "auto_show_advice": self.AI_AUTO_SHOW_ADVICE,
            "enable_opponent_analysis": self.AI_ENABLE_OPPONENT_ANALYSIS,
            "enable_board_analysis": self.AI_ENABLE_BOARD_ANALYSIS,
            "enable_review": self.AI_ENABLE_REVIEW,
            "enable_chat": self.AI_ENABLE_CHAT,
        }
    
    def get_llm_config(self) -> Dict[str, Any]:
        """获取 LLM 配置字典"""
        return {
            "model": self.LLM_MODEL,
            "temperature": self.LLM_TEMPERATURE,
            "max_tokens": self.LLM_MAX_TOKENS,
            "timeout": self.LLM_TIMEOUT,
            "api_key": self.DEEPSEEK_API_KEY,
            "base_url": self.DEEPSEEK_BASE_URL,
        }
    
    def validate(self) -> bool:
        """验证配置是否有效"""
        errors = []
        
        # 验证 API Key
        if self.LLM_PROVIDER == "deepseek" and not self.DEEPSEEK_API_KEY:
            errors.append("⚠️  DEEPSEEK_API_KEY 未配置（AI 功能将不可用）")
        elif self.LLM_PROVIDER == "openai" and not self.OPENAI_API_KEY:
            errors.append("⚠️  OPENAI_API_KEY 未配置")
        elif self.LLM_PROVIDER == "gemini" and not self.GEMINI_API_KEY:
            errors.append("⚠️  GEMINI_API_KEY 未配置")
        
        # 验证游戏配置
        if self.GAME_INITIAL_STACK <= 0:
            errors.append("❌ GAME_INITIAL_STACK 必须大于 0")
        
        if self.GAME_SMALL_BLIND <= 0 or self.GAME_BIG_BLIND <= 0:
            errors.append("❌ 盲注金额必须大于 0")
        
        if self.GAME_BIG_BLIND <= self.GAME_SMALL_BLIND:
            errors.append("❌ 大盲注必须大于小盲注")
        
        if self.GAME_PLAYER_COUNT < 2 or self.GAME_PLAYER_COUNT > 10:
            errors.append("❌ 玩家数量必须在 2-10 之间")
        
        if errors:
            for error in errors:
                print(error)
            return False
        
        return True


# 全局配置实例
config = Config()

