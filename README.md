# 🎰 德州扑克 AI 竞技场 (Poker AI Arena)

**AI 驱动的沉浸式德州扑克竞技与训练平台**

一个集成 **多模态大模型 (Deepseek/OpenAI/Gemini)** 与 **专业扑克数学引擎 (Treys)** 的德州扑克实战系统。在这里，你的对手不再是只会写死规则的脚本，而是拥有不同性格、会思考、会诈唬的 AI 智能体。

![游戏界面](./assets/image-c1316789-93cc-4eba-badb-43ef2f39f865.png)

*游戏界面展示：实时 AI Copilot 战略分析、6人桌对战、现代化 Web 界面*

---

## ✨ 核心特性

### 🧠 混合大脑架构 (Hybrid AI Brain)
我们摒弃了传统的 Rule-based 机器人，打造了真正的 **"Thinking AI"**：
- **LLM 决策层**: AI 能够理解复杂的牌局叙事，根据对手历史行为进行诈唬 (Bluff) 或价值下注 (Value Bet)
- **Math 验证层**: 集成 `Treys` 库，实时计算 **Equity (胜率)**、**Pot Odds (赔率)** 和 **EV (期望值)**，确保 AI 不会犯低级数学错误
- **个性化人格**: 你的对手可能是松凶的疯子，也可能是紧弱的老头，每个 AI 都有独特的人格设定

### 🌐 多模型支持 (Multi-LLM Support)
自由切换大脑，体验不同的智慧：
- **Deepseek-V3**: 性价比之王，推理能力强（推荐）
- **OpenAI (GPT-4o)**: 顶尖的逻辑分析能力
- **Google Gemini (1.5 Pro/Flash)**: 超长上下文，擅长记忆整局历史

### 🤖 AI 功能套件
- **AI Copilot**: 实时战略建议，基于 GTO 的混合策略分析
- **AI 对手**: 5 个拥有不同性格和难度的 AI 玩家
- **AI 复盘**: 游戏结束后深度分析你的决策
- **AI 聊天**: 随时向 AI 提问，获得专业建议

### 🎮 现代化 Web 界面
- **实时游戏桌**: 精美的 6 人桌界面，实时显示玩家状态和底池
- **战略分析面板**: 右侧实时显示 AI Copilot 的详细分析和建议
- **游戏历史**: Dashboard 查看所有对局记录和统计数据
- **复盘系统**: 详细查看每手牌的过程和结果

### 📊 数据持久化
- **全量数据记录**: 每一手牌的行动、底池变化、AI 思考过程都会被结构化保存
- **统计分析**: 胜率、VPIP、盈利等关键指标
- **历史回放**: 随时回顾之前的对局

---

## 🚀 快速开始

### 在线体验

项目已部署到 Cloudflare，可以直接访问：
- **前端**: [访问你的 Cloudflare Pages 域名]
- **后端**: 通过 Cloudflare Tunnel 安全暴露

### 本地开发

#### 环境要求
- Python 3.8+
- Node.js 16+
- API Key (Deepseek / OpenAI / Gemini 任选其一)

#### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/Galigeege/Poker_Assistant.git
cd Poker_Assistant

# 2. 安装后端依赖
pip install -r requirements.txt

# 3. 安装前端依赖
cd frontend
npm install
cd ..

# 4. 配置环境
cp env_template.txt .env
# 编辑 .env 文件，配置 API Key 等
```

#### 启动服务

**终端 1 - 启动后端：**
```bash
python3 run_server.py
```

**终端 2 - 启动前端：**
```bash
cd frontend
npm run dev
```

访问 `http://localhost:5173` 开始游戏！

详细说明请参考 [本地测试指南](./LOCAL_TEST.md)

---

## 🎮 功能演示

### 游戏界面

![游戏界面](./assets/image-c1316789-93cc-4eba-badb-43ef2f39f865.png)

**主要功能：**
- 🎯 **实时 AI Copilot**: 右侧面板提供战略分析和建议
- 🎲 **6 人桌对战**: 与 5 个 AI 对手同台竞技
- 💰 **智能下注**: 支持最小加注、半池、满池、全下等快捷操作
- 📊 **位置显示**: 清晰标注每个玩家的位置（UTG, MP, CO, BTN, SB, BB）
- 🎴 **手牌展示**: 实时显示你的底牌和公共牌

### AI Copilot 分析

AI Copilot 会提供：
- **主要策略**: 推荐行动（Raise/Call/Fold）及频率
- **备选策略**: 混合策略建议，平衡范围
- **数学基础**: Equity、Pot Odds、EV 分析
- **位置分析**: 基于位置的策略调整
- **对手分析**: 根据对手行为给出针对性建议

---

## 🏗️ 技术架构

### 前端
- **框架**: React 19 + TypeScript
- **状态管理**: Zustand
- **UI 库**: Tailwind CSS + Framer Motion
- **构建工具**: Vite
- **路由**: React Router DOM

### 后端
- **框架**: FastAPI
- **实时通信**: WebSocket
- **数据库**: SQLite (开发) / PostgreSQL (生产)
- **ORM**: SQLAlchemy
- **认证**: JWT

### AI 引擎
- **游戏引擎**: PyPokerEngine
- **手牌评估**: Treys
- **LLM 集成**: OpenAI 兼容 API (支持 Deepseek/OpenAI/Gemini)

### 部署
- **前端**: Cloudflare Pages (免费，全球 CDN)
- **后端**: PC/服务器 + Cloudflare Tunnel (免费，安全暴露)
- **数据库**: SQLite (本地) 或 PostgreSQL (云数据库)

---

## 📁 项目结构

```
Poker_Assistant/
├── frontend/              # React 前端
│   ├── src/
│   │   ├── components/    # UI 组件
│   │   ├── pages/         # 页面
│   │   ├── store/         # 状态管理
│   │   └── services/     # API 服务
│   └── package.json
├── backend/               # FastAPI 后端
│   ├── auth/              # 认证模块
│   ├── game/              # 游戏路由
│   ├── database/          # 数据库模型
│   └── main.py            # 入口文件
├── poker_assistant/       # 核心游戏逻辑
│   ├── engine/            # 游戏引擎
│   ├── ai_analysis/       # AI 分析模块
│   ├── llm_service/       # LLM 服务
│   └── utils/             # 工具函数
├── scripts/               # 部署脚本
├── deploy/                # 部署配置
└── requirements.txt       # Python 依赖
```

---

## 🚀 部署指南

### Cloudflare 部署（推荐，完全免费）

项目已配置好 Cloudflare 部署方案：

1. **前端部署**: Cloudflare Pages
   - 自动构建和部署
   - 全球 CDN 加速
   - 自动 HTTPS

2. **后端部署**: PC/服务器 + Cloudflare Tunnel
   - 无需公网 IP
   - 安全暴露
   - 完全免费

详细步骤请参考：
- [Cloudflare 部署指南](./CLOUDFLARE_DEPLOYMENT.md)
- [后端部署指南](./BACKEND_DEPLOYMENT.md)
- [部署成功总结](./DEPLOYMENT_SUCCESS.md)

### 其他部署方案

- [Docker Compose 部署](./DEPLOYMENT_OPTIONS.md)
- [Azure 部署](./AZURE_DEPLOYMENT.md)

---

## 🎯 核心功能

### 游戏功能
- ✅ 6 人桌德州扑克
- ✅ 实时 WebSocket 通信
- ✅ 多难度 AI 对手
- ✅ 自定义游戏设置（盲注、初始筹码）
- ✅ 游戏历史记录
- ✅ 详细复盘系统

### AI 功能
- ✅ 实时 AI Copilot 建议
- ✅ AI 对手（LLM 驱动）
- ✅ AI 复盘分析
- ✅ AI 聊天助手
- ✅ 对手行为分析
- ✅ 牌面分析

### 用户体验
- ✅ 用户注册/登录
- ✅ 游戏数据统计
- ✅ 响应式设计
- ✅ 现代化 UI/UX

---

## 📚 文档

- [本地测试指南](./LOCAL_TEST.md) - 本地开发环境设置
- [Cloudflare 部署指南](./CLOUDFLARE_DEPLOYMENT.md) - 完整部署步骤
- [后端部署指南](./BACKEND_DEPLOYMENT.md) - PC 后端部署
- [部署成功总结](./DEPLOYMENT_SUCCESS.md) - 部署维护指南
- [前端环境配置](./frontend/ENV_CONFIG.md) - 前端环境变量说明

---

## 🛠️ 开发

### 本地开发

```bash
# 启动后端
python3 run_server.py

# 启动前端（新终端）
cd frontend
npm run dev
```

### 测试

```bash
# 后端 API 测试
python3 test_api.py

# 数据库测试
python3 scripts/test_database.py
```

### 代码结构

- **前端**: `frontend/src/` - React 组件和页面
- **后端**: `backend/` - FastAPI 路由和业务逻辑
- **游戏引擎**: `poker_assistant/engine/` - 核心游戏逻辑
- **AI 分析**: `poker_assistant/ai_analysis/` - AI 功能模块

---

## 🗺️ 项目状态

### ✅ 已完成
- [x] 混合 AI 决策引擎 (LLM + Math)
- [x] 多 LLM 后端支持
- [x] FastAPI 后端 + WebSocket
- [x] React 前端界面
- [x] 实时 AI Copilot
- [x] AI 对手系统
- [x] 游戏历史记录
- [x] 复盘分析系统
- [x] 用户认证系统
- [x] Cloudflare 部署方案

### 🚧 计划中
- [ ] 多人对战（多用户）
- [ ] 排行榜系统
- [ ] 更多 AI 人格
- [ ] 移动端适配
- [ ] 国际化支持

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📄 许可

MIT License

---

## 🙏 致谢

- [PyPokerEngine](https://github.com/ishikota/PyPokerEngine) - 德州扑克游戏引擎
- [Treys](https://github.com/mslain/treys) - 扑克手牌评估库
- [FastAPI](https://fastapi.tiangolo.com/) - 现代 Python Web 框架
- [React](https://react.dev/) - UI 框架
- [Cloudflare](https://www.cloudflare.com/) - 免费部署平台

---

## 📞 联系方式

- GitHub: [Galigeege/Poker_Assistant](https://github.com/Galigeege/Poker_Assistant)
- Issues: [提交问题](https://github.com/Galigeege/Poker_Assistant/issues)

---

**🎊 享受你的 AI 扑克之旅！**
