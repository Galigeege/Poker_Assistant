# 🔧 Cloudflare Pages 部署命令修复

## ❌ 问题

Cloudflare Pages 在构建后尝试执行 `npx wrangler deploy`，导致部署失败。

错误信息：
```
✘ [ERROR] Missing entry-point to Worker script or to assets directory
Failed: error occurred while running deploy command
```

## ✅ 解决方案

### 方法 1: 使用空命令（推荐）

如果 Cloudflare Pages 要求 Deploy command 必须填写，使用以下命令：

```bash
echo "Static files deployment - no action needed"
```

或者更简单的：

```bash
true
```

这个命令会立即成功退出，不会执行任何操作。

### 方法 2: 使用注释命令

```bash
# Static files only - no deploy command needed
```

### 方法 3: 使用 exit 0

```bash
exit 0
```

## 📋 正确的 Cloudflare Pages 配置

### Build Settings

- **Framework preset**: `Vite`
- **Build command**: `cd frontend && npm install && npm run build`
- **Build output directory**: `frontend/dist`
- **Root directory**: `/` (项目根目录)
- **Deploy command**: `true` 或 `echo "Static files deployment - no action needed"`

### Environment Variables

```
NODE_VERSION=20
VITE_API_BASE_URL=https://healing-appraisal-suspected-circumstances.trycloudflare.com
VITE_WS_URL=wss://healing-appraisal-suspected-circumstances.trycloudflare.com
```

## 🔍 验证

部署成功后，应该看到：
- ✅ Build command completed
- ✅ Deploy command completed（但不会执行 wrangler）
- ✅ 没有 wrangler 相关错误
- ✅ 静态文件成功部署

## 💡 为什么这些命令有效？

- `true` - 总是返回成功退出码，不执行任何操作
- `echo "..."` - 只输出文本，不执行任何操作
- `exit 0` - 立即成功退出

这些命令都不会尝试部署到 Workers，只是满足 Cloudflare Pages 的必填要求。

## ⚠️ 重要提示

Cloudflare Pages 会自动：
1. 执行 Build command
2. 将 Build output directory 中的文件部署到 CDN
3. Deploy command 只是满足必填要求，实际部署是自动的
