# 🖥️ PC 后端部署指南

## 📋 部署步骤

### 第一步：安装依赖

#### 1.1 安装 Python 依赖

```bash
cd /Users/mac/Codinnnnng/Poker_Assistant
pip3 install -r requirements.txt
```

#### 1.2 安装 Cloudflare Tunnel（用于暴露后端）

```bash
# macOS
brew install cloudflared

# 或手动下载
# https://github.com/cloudflare/cloudflared/releases
```

### 第二步：配置环境变量

#### 2.1 创建/编辑 .env 文件

```bash
cp env_template.txt .env
# 编辑 .env 文件，设置必要的配置
```

**关键配置项：**
```bash
# 数据库（使用 SQLite，开发环境）
DATABASE_URL=sqlite:///./data/poker_assistant.db

# JWT 密钥（生成一个随机字符串，至少 32 字符）
JWT_SECRET_KEY=your-secret-key-change-this-to-random-string-min-32-chars

# CORS 配置（允许前端域名）
CORS_ORIGINS=https://your-frontend-domain.pages.dev

# Deepseek API Key（可选，可在前端配置）
DEEPSEEK_API_KEY=your_api_key_here
```

### 第三步：初始化数据库

```bash
python3 -c "from backend.database.session import init_db; init_db()"
```

### 第四步：设置 Cloudflare Tunnel

#### 4.1 运行自动化设置脚本

```bash
./scripts/cloudflare_setup.sh
```

脚本会引导你：
1. 登录 Cloudflare
2. 创建 Tunnel
3. 配置域名（如果有）或使用临时域名
4. 生成配置文件

#### 4.2 手动设置（如果脚本失败）

```bash
# 1. 登录 Cloudflare
cloudflared tunnel login

# 2. 创建隧道
cloudflared tunnel create poker-assistant-backend

# 3. 查看隧道 ID
cloudflared tunnel list

# 4. 创建配置文件
mkdir -p ~/.cloudflared
cat > ~/.cloudflared/config.yml << EOF
tunnel: <你的隧道ID>
credentials-file: ~/.cloudflared/<隧道ID>.json

ingress:
  # 后端 API
  - hostname: api.yourdomain.com
    service: http://localhost:8000
  # WebSocket
  - hostname: ws.yourdomain.com
    service: http://localhost:8000
  # 默认规则（必须放在最后）
  - service: http_status:404
EOF

# 5. 配置 DNS（如果有域名）
cloudflared tunnel route dns poker-assistant-backend api.yourdomain.com
cloudflared tunnel route dns poker-assistant-backend ws.yourdomain.com
```

### 第五步：启动后端服务

#### 5.1 启动后端（开发模式）

```bash
# 方式一：使用启动脚本
./start_local.sh

# 方式二：直接运行
python3 run_server.py

# 方式三：使用 uvicorn
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 5.2 启动 Cloudflare Tunnel

**新终端窗口：**

```bash
# 使用配置文件启动
cloudflared tunnel --config ~/.cloudflared/config.yml run

# 或使用临时域名（每次启动会变化）
cloudflared tunnel --url http://localhost:8000
```

### 第六步：验证部署

#### 6.1 检查后端健康状态

```bash
# 本地检查
curl http://localhost:8000/health

# 通过 Tunnel 检查（使用 Tunnel 显示的 URL）
curl https://your-tunnel-url.trycloudflare.com/health
```

#### 6.2 检查 API 文档

访问：`http://localhost:8000/docs` 或通过 Tunnel URL

### 第七步：配置前端环境变量

在 Cloudflare Pages 项目设置中添加环境变量：

```
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_WS_URL=wss://ws.yourdomain.com
```

如果没有域名，使用临时 URL：
```
VITE_API_BASE_URL=https://your-tunnel-url.trycloudflare.com
VITE_WS_URL=wss://your-tunnel-url.trycloudflare.com
```

---

## 🔧 常见问题

### Q: 如何让 Tunnel 在后台运行？

**macOS (使用 launchd):**
```bash
# 创建 plist 文件
cat > ~/Library/LaunchAgents/com.cloudflare.tunnel.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.cloudflare.tunnel</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/local/bin/cloudflared</string>
        <string>tunnel</string>
        <string>--config</string>
        <string>~/.cloudflared/config.yml</string>
        <string>run</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
</dict>
</plist>
EOF

# 加载服务
launchctl load ~/Library/LaunchAgents/com.cloudflare.tunnel.plist

# 启动服务
launchctl start com.cloudflare.tunnel
```

**Linux (使用 systemd):**
```bash
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

### Q: 如何查看 Tunnel 日志？

```bash
# macOS
tail -f ~/Library/Logs/cloudflared.log

# Linux
journalctl -u cloudflared -f
```

### Q: 后端启动失败？

1. 检查端口 8000 是否被占用：`lsof -i :8000`
2. 检查数据库文件权限：`ls -la data/poker_assistant.db`
3. 查看后端日志：检查终端输出

### Q: Tunnel 连接失败？

1. 检查后端是否运行：`curl http://localhost:8000/health`
2. 检查 Tunnel 配置：`cat ~/.cloudflared/config.yml`
3. 重新登录：`cloudflared tunnel login`

---

## 📝 快速启动脚本

我已经创建了快速启动脚本，可以一键启动：

```bash
# 启动后端 + Tunnel（需要先配置 Tunnel）
./scripts/start_backend_with_tunnel.sh
```

---

## 🎯 下一步

1. ✅ 后端在 PC 上运行
2. ✅ Cloudflare Tunnel 暴露后端
3. ✅ 前端通过 Tunnel URL 访问后端
4. ✅ 测试完整流程

