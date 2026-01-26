# 🌐 前端环境变量配置指南

## ✅ 后端 Tunnel URL

你的后端已通过 Cloudflare Tunnel 暴露：
```
https://healing-appraisal-suspected-circumstances.trycloudflare.com
```

## 📝 在 Cloudflare Pages 中配置环境变量

### 步骤 1: 进入项目设置

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **Pages** → 选择你的项目
3. 点击 **Settings** → **Environment variables**

### 步骤 2: 添加环境变量

点击 **Add variable**，添加以下变量：

#### Production 环境：

```
变量名: VITE_API_BASE_URL
值: https://healing-appraisal-suspected-circumstances.trycloudflare.com
```

```
变量名: VITE_WS_URL
值: wss://healing-appraisal-suspected-circumstances.trycloudflare.com
```

### 步骤 3: 重新部署

配置环境变量后，需要重新部署前端：

1. 在 Cloudflare Pages 项目中，点击 **Deployments**
2. 找到最新的部署，点击 **Retry deployment**
3. 或等待下一次 Git push 自动触发部署

### 步骤 4: 验证配置

部署完成后，访问你的前端网站，检查：
- ✅ 登录/注册功能是否正常
- ✅ 游戏是否可以正常开始
- ✅ WebSocket 连接是否建立

---

## ⚠️ 重要提示

### 临时 URL 的限制

- **每次重启 Tunnel，URL 会变化**
- 如果 Tunnel 断开，需要：
  1. 重新运行 `cloudflared tunnel --url http://localhost:8000`
  2. 获取新的 URL
  3. 更新 Cloudflare Pages 环境变量
  4. 重新部署前端

### 使用正式域名（推荐）

如果希望使用稳定的域名，可以：

1. 完成 Cloudflare 登录：`cloudflared tunnel login`
2. 创建正式 Tunnel：`cloudflared tunnel create poker-assistant-backend`
3. 配置 DNS 记录（如果有域名）
4. 使用配置文件启动 Tunnel

详细步骤请参考：`CLOUDFLARE_DEPLOYMENT.md`

---

## 🔍 测试后端连接

### 健康检查
```bash
curl https://healing-appraisal-suspected-circumstances.trycloudflare.com/health
```

### API 文档
访问：https://healing-appraisal-suspected-circumstances.trycloudflare.com/docs

### WebSocket 测试
在浏览器控制台运行：
```javascript
const ws = new WebSocket('wss://healing-appraisal-suspected-circumstances.trycloudflare.com/ws/game?token=test');
ws.onopen = () => console.log('WebSocket 连接成功');
ws.onerror = (e) => console.error('WebSocket 连接失败', e);
```

