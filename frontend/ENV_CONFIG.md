# 前端环境变量配置

## 开发环境

在 `frontend` 目录下创建 `.env.local` 文件：

```env
# API 基础 URL（后端服务地址）
VITE_API_BASE_URL=http://localhost:8000

# WebSocket URL（留空则使用 vite proxy）
VITE_WS_URL=
```

## 生产环境

### Cloudflare Pages 部署

在 Cloudflare Pages 项目设置中配置环境变量：

```env
# API 基础 URL（Cloudflare Tunnel 后端地址）
VITE_API_BASE_URL=https://api.yourdomain.com

# WebSocket URL（Cloudflare Tunnel WebSocket 地址）
VITE_WS_URL=wss://ws.yourdomain.com
```

### 其他部署方式

在 `frontend` 目录下创建 `.env.production` 文件：

```env
# API 基础 URL（后端服务地址）
VITE_API_BASE_URL=https://your-api.azurewebsites.net

# WebSocket URL（后端 WebSocket 地址）
VITE_WS_URL=wss://your-api.azurewebsites.net
```

## 说明

- `VITE_API_BASE_URL`: 用于 HTTP API 请求（登录、注册、游戏会话等）
- `VITE_WS_URL`: 用于 WebSocket 连接（实时游戏通信）
  - 如果留空，开发环境会使用 vite proxy（`/ws` -> `ws://localhost:8000/ws/game`）
  - 生产环境必须设置，指向后端的 WebSocket 端点

## 构建

```bash
# 开发环境
npm run dev

# 生产环境构建
npm run build
```

构建时，Vite 会将环境变量注入到代码中。

