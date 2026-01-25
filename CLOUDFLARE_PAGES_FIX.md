# 🔧 Cloudflare Pages 部署命令修复

## ❌ 问题

Cloudflare Pages 在构建后尝试执行 `npx wrangler deploy`，导致部署失败。

错误信息：
```
✘ [ERROR] Missing entry-point to Worker script or to assets directory
Failed: error occurred while running deploy command
```

## ✅ 解决方案

### 方法 1: 清空 Deploy Command（推荐）

在 Cloudflare Pages 项目设置中：

1. 进入 **Settings** → **Builds & deployments**
2. 找到 **Deploy command** 字段
3. **完全清空**（删除所有内容，包括空格）
4. 保存设置
5. 重新触发部署

### 方法 2: 设置 Deploy Command 为空命令

如果无法完全清空，可以设置为：

```bash
echo "Deploy skipped - static files only"
```

### 方法 3: 删除 wrangler.toml（如果存在）

如果项目中有 `wrangler.toml` 文件，Cloudflare Pages 可能会自动检测并尝试使用它。

**注意**：`frontend/wrangler.toml` 只是参考文件，不会影响 Pages 部署。

## 📋 正确的 Cloudflare Pages 配置

### Build Settings

- **Framework preset**: `Vite`
- **Build command**: `cd frontend && npm install && npm run build`
- **Build output directory**: `frontend/dist`
- **Root directory**: `/` (项目根目录)
- **Deploy command**: （**留空**）

### Environment Variables

```
NODE_VERSION=20
VITE_API_BASE_URL=https://healing-appraisal-suspected-circumstances.trycloudflare.com
VITE_WS_URL=wss://healing-appraisal-suspected-circumstances.trycloudflare.com
```

## 🔍 验证

部署成功后，应该看到：
- ✅ Build command completed
- ✅ 没有 wrangler 相关错误
- ✅ 静态文件成功部署

## 💡 为什么不需要 Deploy Command？

Cloudflare Pages 会自动：
1. 执行 Build command
2. 将 Build output directory 中的文件部署到 CDN
3. 不需要额外的部署命令

`wrangler deploy` 是用于 Cloudflare Workers 的，不是用于静态网站的。

