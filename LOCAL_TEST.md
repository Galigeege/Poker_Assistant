# 🧪 本地测试指南

## 前置检查

### 1. 环境要求
- ✅ Python 3.8+ (当前: Python 3.13.2)
- ✅ Node.js 16+ (当前: v22.20.0)
- ✅ 后端依赖已安装
- ✅ 前端依赖已安装

### 2. 环境配置

确保 `.env` 文件已配置（如果不存在，从 `env_template.txt` 复制）：
```bash
cp env_template.txt .env
```

**重要配置项：**
- `DEEPSEEK_API_KEY` - Deepseek API 密钥（可选，可在前端配置）
- `DATABASE_URL` - 数据库连接（默认使用 SQLite）
- `JWT_SECRET_KEY` - JWT 密钥（开发环境可使用默认值）

## 🚀 启动步骤

### 方式一：使用启动脚本（推荐）

**终端 1 - 启动后端：**
```bash
cd /Users/mac/Codinnnnng/Poker_Assistant
python3 run_server.py
```

后端将在 `http://localhost:8000` 启动

**终端 2 - 启动前端：**
```bash
cd /Users/mac/Codinnnnng/Poker_Assistant/frontend
npm run dev
```

前端将在 `http://localhost:5173` 启动

### 方式二：手动启动

**启动后端：**
```bash
cd /Users/mac/Codinnnnng/Poker_Assistant
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

**启动前端：**
```bash
cd /Users/mac/Codinnnnng/Poker_Assistant/frontend
npm run dev
```

## 📝 测试流程

1. **访问前端**
   - 打开浏览器访问 `http://localhost:5173`
   - 首次使用需要注册账号

2. **配置 API Key（可选）**
   - 登录后，在首页点击 "API Key 状态"
   - 进入高级游戏设置，配置 Deepseek API Key
   - 如果不配置，AI 功能将不可用

3. **开始游戏**
   - 点击 "快速开始" 或 "自定义游戏"
   - 配置游戏参数（盲注、初始筹码等）
   - 开始游戏

4. **测试功能**
   - ✅ 游戏流程（下注、加注、弃牌等）
   - ✅ AI 对手行动
   - ✅ AI Copilot 建议
   - ✅ 游戏结束后复盘
   - ✅ Dashboard 查看历史对局

## 🔍 调试

### 查看后端日志
后端启动后会在终端显示详细日志，包括：
- WebSocket 连接状态
- 游戏事件
- AI 请求和响应（如果启用 DEBUG）

### 查看前端日志
打开浏览器开发者工具（F12）查看：
- Console 日志
- Network 请求
- WebSocket 消息

### 启用调试模式
在 `.env` 文件中设置：
```bash
DEBUG=true
LOG_LEVEL=DEBUG
```

## 🐛 常见问题

### 1. 后端启动失败
- 检查端口 8000 是否被占用
- 检查数据库文件权限
- 查看错误日志

### 2. 前端无法连接后端
- 确认后端已启动
- 检查 `frontend/.env` 或 `vite.config.ts` 中的 API 地址配置
- 检查 CORS 设置

### 3. WebSocket 连接失败
- 确认后端 WebSocket 端点可访问：`ws://localhost:8000/ws/game`
- 检查防火墙设置
- 查看浏览器控制台错误

### 4. AI 功能不可用
- 检查是否配置了 API Key（前端或后端 .env）
- 查看后端日志中的 API 错误
- 确认 API Key 有效

## 📊 健康检查

### 后端健康检查
```bash
curl http://localhost:8000/health
```

应返回：
```json
{"status": "ok", "version": "2.0.0"}
```

### API 文档
访问 `http://localhost:8000/docs` 查看 Swagger API 文档

## 🎯 下一步

测试通过后，可以：
1. 部署到 Azure App Service（参考 `APP_SERVICE_QUICK_START.md`）
2. 配置生产环境数据库（PostgreSQL）
3. 设置生产环境环境变量

