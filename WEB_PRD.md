# 德州扑克 AI 竞技场 - 完整 Web 版产品需求文档 (PRD) v2.0

## 1. 产品概述

### 1.1 产品定位
**“AI 驱动的沉浸式德州扑克竞技与训练平台”**
这就不仅仅是一个复盘工具，而是一个完整的在线德州扑克游戏。用户可以在精美的 Web 界面上与高智商 AI 实时对战，享受发牌的快感，同时获得实时的策略指导。游戏结束后，无缝切换到复盘模式进行深度学习。

### 1.2 核心价值
*   **Play (玩)**：零延迟、丝滑的 Web 对战体验，替代简陋的命令行。
*   **Learn (学)**：实时 AI 助手（Copilot）在对局中提供 GTO 建议。
*   **Review (复)**：基于对局数据的深度可视化复盘。

---

## 2. 用户流程 (User Journey)

1.  **登录/配置**：用户进入首页，设置游戏参数（盲注、AI 难度、AI 性格）。
2.  **入座 (Buy-in)**：点击“开始游戏”，进入 Web 牌桌界面。
3.  **实时对战**：
    *   系统发牌（动画效果）。
    *   轮到玩家行动时，操作面板亮起。
    *   玩家点击 Fold/Call/Raise。
    *   AI 对手思考并做出回应（显示“AI 思考中...”气泡）。
    *   摊牌比牌，筹码结算。
4.  **局间休息**：每局结束，显示本局结算弹窗。
5.  **退出与复盘**：点击“退出游戏”，自动跳转到 Dashboard，查看刚才的战绩，并进入复盘模式分析关键手牌。

---

## 3. 功能模块详解

### 3.1 游戏大厅 (The Lobby) - **新增**

**目标**：快速开始一局游戏，提供个性化配置。

*   **快速开始 (Quick Start)**：一键使用默认配置进入游戏。
*   **高级设置 (Custom Game)**：
    *   **盲注结构**：设置 SB/BB (如 $1/$2)。
    *   **初始筹码**：Stack Size (如 100BB, 200BB)。
    *   **对手配置**：
        *   数量：2-9 人桌。
        *   **AI 难度**：Fish (鱼), Regular (常客), Pro (职业), GTO (神)。
        *   **AI 性格**：开启/关闭“性格扮演”（如“松凶疯子”、“紧弱老头”）。
    *   **辅助功能**：开启/关闭“实时 AI 建议”、“胜率实时显示”。

### 3.2 实时对战界面 (Live Game Arena) - **核心新增**

这是用户停留时间最长的页面。

**A. 沉浸式牌桌 (The Table)**
*   **视角**：采用经典的顶视图（Top-down）或 2.5D 视角。
*   **座位布局**：椭圆形牌桌，Hero 始终位于正下方（6点钟方向）。
*   **对手信息**：头像（支持 AI 生成的性格头像）、昵称、筹码量、当前行动（Check/Bet $10）。
*   **公共牌区**：位于牌桌中央，清晰展示 Flop, Turn, River。
*   **底池区**：显示 Main Pot 和 Side Pot。

**B. 操作控制台 (Action Panel)** - *仅在 Hero 行动时激活*
*   **主按钮**：
    *   `Fold` (弃牌) - 红色
    *   `Check/Call` (过牌/跟注) - 绿色
    *   `Raise` (加注) - 黄色
*   **加注滑块 (Bet Slider)**：
    *   预设按钮：`Min`, `3BB`, `1/3 Pot`, `1/2 Pot`, `Pot`, `All-in`。
    *   +/- 微调按钮。
    *   输入框：手动输入金额。

**C. AI 战术副驾 (AI Copilot Sidebar)** - *可折叠*
*   **实时建议**：当轮到 Hero 行动时，自动分析当前局势。
    *   “建议：**Check** (频率 80%)”
    *   “理由：牌面干燥，你没有位置，适合控池。”
*   **对手情报**：点击某个对手头像，显示 AI 对他的实时分析（“这个 AI 最近 3 局打得很松，可能是诈唬”）。

**D. 状态通知 (Notifications)**
*   屏幕中央的 Toast 提示：“AI_1 加注到 $50”、“你赢得了底池 $200！”。

### 3.3 赛后复盘系统 (Post-Game Analytics)

*(沿用 v1.0 的设计，包含 Dashboard 和 单局复盘台)*

*   **Dashboard**：战绩总览、资金曲线。
*   **Replay Mode**：录像回放、胜率曲线图、AI 深度点评。

---

## 4. 信息架构 (Information Architecture)

```text
Web App
├── 首页 (Lobby)
│   ├── 快速开始
│   └── 游戏配置表单
├── 游戏房间 (Game Room)
│   ├── 顶栏 (菜单/退出/设置)
│   ├── 核心游戏区 (Canvas/SVG)
│   ├── 操作区 (UI Controls)
│   └── 侧边栏 (Chat/AI Copilot)
└── 复盘中心 (Review Hub)
    ├── 战绩概览 (Dashboard)
    ├── 牌谱列表 (Session List)
    └── 详情回放页 (Replay Detail)
```

---

## 5. 交互设计细节 (Interaction Design)

*   **发牌动画**：牌从 Dealer 位置飞入玩家手中的动画，增加真实感。
*   **筹码动画**：下注时筹码堆推入中央，结算时筹码飞向赢家。
*   **倒计时**：对手行动时显示进度条，模拟思考时间（避免 AI 秒回带来的机械感）。
*   **声音设计 (Sound FX)**：
    *   发牌声、筹码碰撞声、check 敲击声。
    *   胜利/失败的音效。

---

## 6. 技术架构升级 (Tech Stack v2.0)

为了支持实时游戏，必须引入 WebSocket。

### 6.1 前端 (Frontend)
*   **框架**: React (Next.js) / Vue 3
*   **状态管理**: Zustand / Redux (管理高频的游戏状态更新)
*   **UI 组件库**: Shadcn UI / Ant Design (大厅与复盘界面)
*   **游戏渲染**:
    *   方案 A (简单): HTML/CSS + Framer Motion (适合 2D 简单动画)
    *   方案 B (专业): Pixi.js 或 Phaser.js (适合高性能游戏渲染)
*   **通信**: Socket.io Client

### 6.2 后端 (Backend)
*   **框架**: **FastAPI** (Python)
    *   利用 Python 现有的 `PyPokerEngine` 逻辑，无需重写核心算法。
    *   使用 `FastAPI WebSockets` 处理实时游戏流。
*   **数据存储**:
    *   热数据 (游戏状态): 内存 / Redis
    *   冷数据 (历史记录): JSON 文件 / SQLite / PostgreSQL

### 6.3 通信协议 (WebSocket Events)
*   `game_init`: 初始化牌桌信息。
*   `round_start`: 发底牌。
*   `street_start`: 发公共牌。
*   `action_request`: **服务器 -> 客户端**，请求玩家操作。
*   `player_action`: **客户端 -> 服务器**，玩家发送操作（Fold/Call/Raise）。
*   `game_update`: 广播对手的行动。
*   `game_over`: 结算信息。

---

## 7. 开发路线图 (Roadmap)

1.  **Phase 1: 后端 API 化**
    *   改造 `GameController`，使其支持“步进式”执行（从 `while` 循环改为事件驱动）。
    *   搭建 FastAPI WebSocket 服务。
2.  **Phase 2: 前端游戏大厅与牌桌**
    *   实现基础的连接与发牌动画。
    *   实现操作按钮与服务器的交互。
3.  **Phase 3: 复盘系统集成**
    *   前端解析 JSON 并渲染复盘界面。
4.  **Phase 4: AI Copilot 实时接入**
    *   在 WebSocket 流中插入 AI 建议数据。
