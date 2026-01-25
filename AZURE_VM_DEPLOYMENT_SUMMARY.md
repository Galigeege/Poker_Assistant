# 📦 Azure VM 部署文件清单

## ✅ 已创建的配置文件

### 1. 部署文档
- **`AZURE_VM_DEPLOYMENT.md`** - 完整的 Azure VM 部署方案文档
- **`AZURE_VM_QUICK_START.md`** - 快速部署指南
- **`AZURE_VM_DEPLOYMENT_SUMMARY.md`** - 本文件（文件清单）

### 2. Docker 配置
- **`docker-compose.yml`** - Docker Compose 配置（后端 + PostgreSQL + Nginx）
- **`Dockerfile`** - 后端容器镜像构建文件
- **`.dockerignore`** - Docker 构建忽略文件

### 3. Nginx 配置
- **`deploy/nginx.conf`** - Nginx 反向代理配置（HTTP/HTTPS、WebSocket、静态文件）

### 4. 脚本文件
- **`scripts/azure_vm_setup.sh`** - 一键创建 Azure VM 的自动化脚本
- **`scripts/vm_init.sh`** - VM 初始化脚本（安装 Docker、配置环境）

---

## 🚀 快速开始

### 第一步：创建 Azure VM

```bash
./scripts/azure_vm_setup.sh
```

### 第二步：连接到 VM 并初始化

```bash
# 获取 VM IP
VM_IP=$(az vm show -d \
  --resource-group poker-assistant-rg \
  --name poker-assistant-vm \
  --query publicIps -o tsv)

# 连接到 VM
ssh azureuser@$VM_IP

# 在 VM 上运行初始化
bash scripts/vm_init.sh
```

### 第三步：上传项目并配置

```bash
# 在 VM 上
git clone <你的仓库> ~/poker-assistant
cd ~/poker-assistant
cp env_template.txt .env
nano .env  # 配置环境变量
```

### 第四步：构建前端并启动

```bash
# 构建前端
cd frontend
npm install
npm run build

# 启动所有服务
cd ..
docker-compose up -d

# 初始化数据库
docker-compose exec backend python -c "from backend.database.session import init_db; init_db()"
```

---

## 📋 环境变量配置

在 `~/poker-assistant/.env` 中配置：

```env
# 数据库密码（Docker Compose 使用）
POSTGRES_PASSWORD=<强密码>

# JWT 配置
JWT_SECRET_KEY=<32字符以上随机字符串>
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# CORS 配置（如果配置了域名）
CORS_ORIGINS=https://your-domain.com

# Deepseek API（可选）
DEEPSEEK_API_KEY=
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
LLM_PROVIDER=deepseek

# 游戏配置
GAME_INITIAL_STACK=1000
GAME_SMALL_BLIND=5
GAME_BIG_BLIND=10
GAME_MAX_ROUND=100
GAME_PLAYER_COUNT=6
```

---

## 🔍 验证清单

部署后，请验证：

- [ ] VM 可以 SSH 连接
- [ ] Docker 和 Docker Compose 已安装
- [ ] 所有容器正常运行：`docker-compose ps`
- [ ] 后端健康检查：`curl http://<VM_IP>/health`
- [ ] 前端可以访问：`curl http://<VM_IP>/`
- [ ] API 可以调用：`curl http://<VM_IP>/api/auth/register`
- [ ] WebSocket 可以连接（通过前端测试）
- [ ] 数据库连接正常（查看后端日志）

---

## 📚 参考文档

- **详细部署步骤**：`AZURE_VM_DEPLOYMENT.md`
- **快速开始**：`AZURE_VM_QUICK_START.md`

---

## 💡 提示

1. **SSH 密钥**：首次连接可能需要确认主机密钥
2. **Docker 权限**：初始化后需要重新登录以应用 docker 组权限
3. **防火墙**：确保网络安全组允许 22, 80, 443 端口
4. **域名配置**：建议配置域名并设置 HTTPS（Let's Encrypt）
5. **备份**：定期备份数据库和重要文件

---

## 🆘 遇到问题？

1. **查看日志**：`docker-compose logs -f`
2. **检查服务状态**：`docker-compose ps`
3. **重启服务**：`docker-compose restart`
4. **查看系统资源**：`htop`、`docker stats`
5. **参考文档**：`AZURE_VM_DEPLOYMENT.md` 中的"常见问题"章节

---

## 💰 成本

- **12 个月内**：$0（B1s 免费层）
- **12 个月后**：约 $10-15/月

---

## 🔐 安全建议

1. ✅ 使用 SSH 密钥认证
2. ✅ 只开放必要端口
3. ✅ 定期更新系统
4. ✅ 使用强密码
5. ✅ 配置 HTTPS
6. ✅ 定期备份

