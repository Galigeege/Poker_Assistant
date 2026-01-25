# ☁️ Cloudflare 部署方案

## 📋 架构概览

```
┌─────────────────────────────────────────────────────────┐
│              Cloudflare 部署架构                          │
└─────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│  Cloudflare      │         │  你的服务器       │
│  Pages           │────────▶│  (本地/云服务器)  │
│  (前端)          │  HTTPS  │                  │
│                  │         │  ┌──────────────┐ │
│  - React 静态文件 │         │  │  FastAPI     │ │
│  - 免费托管       │         │  │  Backend     │ │
│  - 自动 HTTPS     │         │  │  + WebSocket │ │
│  - 全球 CDN       │         │  └──────┬───────┘ │
└──────────────────┘         │         │         │
                              │  ┌──────▼───────┐ │
                              │  │  PostgreSQL  │ │
                              │  │  Database    │ │
                              │  └──────────────┘ │
                              └─────────┬─────────┘
                                        │
                              ┌─────────▼─────────┐
                              │  Cloudflare Tunnel │
                              │  (安全暴露后端)     │
                              └────────────────────┘
```

## 🎯 方案优势

### ✅ 完全免费
- **Cloudflare Pages**: 免费无限流量
- **Cloudflare Tunnel**: 免费，无需公网 IP
- **自动 HTTPS**: 免费 SSL 证书
- **全球 CDN**: 加速前端访问

### ✅ 安全可靠
- **零信任网络**: Cloudflare Tunnel 提供安全连接
- **DDoS 防护**: Cloudflare 自动防护
- **无需暴露端口**: 后端不直接暴露在公网

### ✅ 简单部署
- **前端**: Git 推送自动部署
- **后端**: 一条命令启动 Tunnel

---

## 🚀 部署步骤

### 第一步：部署前端到 Cloudflare Pages

#### 1.1 准备前端构建

```bash
cd frontend
npm install
npm run build
```

#### 1.2 在 Cloudflare Dashboard 创建 Pages 项目

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Pages** → **Create a project**
3. 选择 **Connect to Git**
4. 选择你的 GitHub 仓库：`Galigeege/Poker_Assistant`
5. 配置构建设置：
   - **Framework preset**: Vite
   - **Build command**: `cd frontend && npm install && npm run build`
   - **Build output directory**: `frontend/dist`
   - **Root directory**: `/` (项目根目录)

#### 1.3 配置环境变量

在 Cloudflare Pages 项目设置中添加环境变量：

```
VITE_API_BASE_URL=https://your-backend-domain.com
VITE_WS_URL=wss://your-backend-domain.com
```

> ⚠️ 注意：这里需要先完成后端部署，获取后端域名后再配置

#### 1.4 自动部署

每次推送到 `main` 或 `dev-web-backend` 分支，Cloudflare Pages 会自动构建和部署。

---

### 第二步：部署后端（使用 Cloudflare Tunnel）

#### 2.1 准备服务器

你需要一台运行后端的服务器（可以是本地电脑、云服务器等）：

**选项 A：本地电脑**
- 优点：免费
- 缺点：需要保持电脑开机

**选项 B：云服务器**
- 推荐：DigitalOcean ($6/月), Vultr ($6/月), Linode ($5/月)
- 优点：稳定，24/7 运行

#### 2.2 在服务器上部署后端

```bash
# 1. 克隆代码
git clone https://github.com/Galigeege/Poker_Assistant.git
cd Poker_Assistant

# 2. 使用 Docker Compose 部署
./deploy.sh

# 或者手动部署：
docker-compose up -d
```

#### 2.3 安装 Cloudflare Tunnel

```bash
# 下载 cloudflared
# Linux
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared

# macOS
brew install cloudflared

# 验证安装
cloudflared --version
```

#### 2.4 登录 Cloudflare

```bash
cloudflared tunnel login
```

这会打开浏览器，选择你的域名并授权。

#### 2.5 创建 Tunnel

```bash
# 创建隧道
cloudflared tunnel create poker-assistant-backend

# 查看隧道列表
cloudflared tunnel list
```

#### 2.6 配置路由

```bash
# 创建配置文件目录
mkdir -p ~/.cloudflared

# 创建配置文件
cat > ~/.cloudflared/config.yml << EOF
tunnel: <你的隧道ID>
credentials-file: /Users/你的用户名/.cloudflared/<隧道ID>.json

ingress:
  # 后端 API
  - hostname: api.yourdomain.com
    service: http://localhost:8000
  # WebSocket
  - hostname: ws.yourdomain.com
    service: http://localhost:8000
  # 健康检查
  - hostname: health.yourdomain.com
    service: http://localhost:8000
  # 默认规则（必须放在最后）
  - service: http_status:404
EOF
```

#### 2.7 配置 DNS

```bash
# 在 Cloudflare Dashboard 中配置 DNS 记录
# 或者使用 CLI：
cloudflared tunnel route dns <隧道名称> api.yourdomain.com
cloudflared tunnel route dns <隧道名称> ws.yourdomain.com
```

#### 2.8 启动 Tunnel

```bash
# 测试运行
cloudflared tunnel --config ~/.cloudflared/config.yml run

# 或作为系统服务运行（推荐）
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

---

### 第三步：配置前端环境变量

在 Cloudflare Pages 项目设置中更新环境变量：

```
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_WS_URL=wss://ws.yourdomain.com
```

重新部署前端以应用新配置。

---

## 🔧 简化方案：使用 Docker Compose + Cloudflare Tunnel

我已经创建了一个包含 Cloudflare Tunnel 的 Docker Compose 配置，可以一键部署：

```bash
# 1. 配置环境变量
cp env_template.txt .env
# 编辑 .env，设置必要的配置

# 2. 部署（包含 Cloudflare Tunnel）
docker-compose -f docker-compose.yml -f docker-compose.cloudflare.yml up -d
```

---

## 📝 配置清单

### 前端（Cloudflare Pages）
- [ ] 创建 Pages 项目
- [ ] 连接 GitHub 仓库
- [ ] 配置构建设置
- [ ] 设置环境变量（后端域名）

### 后端（服务器 + Cloudflare Tunnel）
- [ ] 准备服务器（本地或云服务器）
- [ ] 部署后端（Docker Compose）
- [ ] 安装 cloudflared
- [ ] 登录 Cloudflare
- [ ] 创建 Tunnel
- [ ] 配置 DNS 记录
- [ ] 启动 Tunnel 服务

### 数据库
- [ ] PostgreSQL 在服务器上运行（Docker Compose 已包含）

---

## 🎯 快速开始脚本

我已经准备了自动化脚本，可以简化部署过程。运行：

```bash
./scripts/cloudflare_setup.sh
```

---

## 💡 提示

1. **域名**: 你需要一个域名（可以在 Cloudflare 购买，约 $10/年）
2. **免费域名**: 可以使用 Freenom 的免费域名（.tk, .ml 等）
3. **本地测试**: 可以先在本地测试 Tunnel，确认无误后再部署到服务器

---

## 🐛 常见问题

### Q: 没有域名怎么办？
A: 可以使用 Cloudflare Tunnel 的临时域名（格式：`xxx.trycloudflare.com`），但每次重启会变化。

### Q: WebSocket 连接失败？
A: 确保 Tunnel 配置中正确设置了 WebSocket 路由，并且使用 `wss://` 协议。

### Q: 如何查看 Tunnel 日志？
A: `cloudflared tunnel --config ~/.cloudflared/config.yml run` 会显示实时日志。

---

## 📚 参考资源

- [Cloudflare Pages 文档](https://developers.cloudflare.com/pages/)
- [Cloudflare Tunnel 文档](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [cloudflared GitHub](https://github.com/cloudflare/cloudflared)

