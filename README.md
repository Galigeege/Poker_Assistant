# 🎰 德州扑克 AI 竞技场 (Poker AI Arena)

**AI 驱动的沉浸式德州扑克竞技与训练平台**

一个集成 **多模态大模型 (Deepseek/OpenAI/Gemini)** 与 **专业扑克数学引擎 (Treys)** 的德州扑克实战系统。在这里，你的对手不再是只会写死规则的脚本，而是拥有不同性格、会思考、会诈唬的 AI 智能体。

<img width="1159" height="672" alt="image" src="https://github.com/user-attachments/assets/256d4eea-f133-41dc-8e2f-6b04cd498a12" />

---

## ✨ 核心特性 (v1.5 Update)

### 🧠 混合大脑架构 (Hybrid AI Brain)
我们摒弃了传统的 Rule-based 机器人，打造了真正的 **"Thinking AI"**：
- **LLM 决策层**: AI 能够理解复杂的牌局叙事，根据对手历史行为进行诈唬 (Bluff) 或价值下注 (Value Bet)。
- **Math 验证层**: 集成 `Treys` 库，实时计算 **Equity (胜率)**、**Pot Odds (赔率)** 和 **EV (期望值)**，确保 AI 不会犯低级数学错误。
- **个性化人格**: 你的对手可能是松凶的疯子，也可能是紧弱的老头，每个 AI 都有独特的人格设定。

### 🌐 多模型支持 (Multi-LLM Support)
自由切换大脑，体验不同的智慧：
- **Deepseek-V3**: 性价比之王，推理能力强。
- **OpenAI (GPT-4o)**: 顶尖的逻辑分析能力。
- **Google Gemini (1.5 Pro/Flash)**: 超长上下文，擅长记忆整局历史。（已解决安全过滤问题）

### 📊 数据黑匣子 (GameLogger)
- **全量数据记录**: 每一手牌的行动、底池变化、AI 思考过程都会被结构化保存为 JSON。
- **复盘准备**: 为即将到来的 Web 复盘分析系统打下数据基础。

### 🎮 沉浸式体验
- **CLI 可视化**: 在终端中享受带有颜色编码的精美牌桌界面。
- **实时策略副驾**: 轮到你行动时，AI 助教会提供基于 GTO 的**混合策略建议** (Mixed Strategy)，告诉你最佳行动频率。

---

## 🚀 快速开始

### 环境要求
- Python 3.8+
- API Key (Deepseek / OpenAI / Gemini 任选其一)

### 安装

```bash
# 1. 克隆项目
git clone https://github.com/Galigeege/Poker_Assistant.git
cd Poker_Assistant

# 2. 安装依赖
pip install -r requirements.txt

# 3. 配置环境
cp env_template.txt .env
```

### 配置你的 AI 大脑

打开 `.env` 文件，选择你的 LLM 提供商：

```bash
# 选项: deepseek (默认) | openai | gemini
LLM_PROVIDER=deepseek

# --- Deepseek 配置 ---
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx

# --- OpenAI 配置 ---
# LLM_PROVIDER=openai
# OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxx

# --- Google Gemini 配置 ---
# LLM_PROVIDER=gemini
# GEMINI_API_KEY=AIzaSyxxxxxxxxxxxxxxxx
# GEMINI_MODEL=gemini-1.5-pro
```

### 启动游戏

```bash
python main.py
```

---

## 🎮 操作指南

### 基础指令
- `F` / `fold`: 弃牌
- `C` / `check` / `call`: 过牌/跟注
- `R` / `raise`: 加注
- `A` / `allin`: 全下
- `H`: 查看帮助

### AI 辅助
- **Q**: 随时向 AI 提问（"这手牌我打错了吗？"）
- **Debug 模式**: 在 `.env` 中设置 `DEBUG=true`，可以查看 AI 的完整思考过程（Prompt & Response）。

---

## 🗺️ Roadmap

### Phase 1: Core (Current) ✅
- [x] 混合 AI 决策引擎 (LLM + Math)
- [x] 多 LLM 后端支持
- [x] GameLogger 数据持久化
- [x] 命令行交互优化

### Phase 2: Server (In Progress) 🚧
- [ ] FastAPI 后端改造
- [ ] WebSocket 实时通信
- [ ] 异步事件驱动架构

### Phase 3: Web Arena (Planning) 📅
- [ ] 实时对战 Web 界面 (React)
- [ ] 可视化复盘 Dashboard
- [ ] 胜率曲线图 (Equity Graph)

详见 [WEB_PRD.md](./WEB_PRD.md) 获取完整设计规划。

---

## 📁 项目结构

```text
Poker_Assistant/
├── poker_assistant/
│   ├── engine/            # 核心游戏逻辑 (GameController, AI Bot)
│   ├── ai_analysis/       # AI 分析师 (Strategy, Review)
│   ├── llm_service/       # 多模型适配层 (Client Factory)
│   ├── data/              # 数据持久化 (Logger)
│   ├── cli/               # 终端界面
│   └── utils/             # 数学库与配置
├── data/game_history/     # 你的对局录像 (JSON)
├── main.py                # 启动入口
└── .env                   # 配置文件
```

## 📄 许可
MIT License

## 🙏 致谢
- [PyPokerEngine](https://github.com/ishikota/PyPokerEngine)
- [Treys](https://github.com/mslain/treys)
