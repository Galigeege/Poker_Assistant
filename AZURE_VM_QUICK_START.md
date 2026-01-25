# 🚀 Azure VM 快速部署指南

## 前置要求

1. ✅ Azure 账号（已注册）
2. ✅ Azure CLI 已安装：`az --version`
3. ✅ 已登录 Azure：`az login`
4. ✅ SSH 密钥已生成（或使用 `--generate-ssh-keys`）

---

## 一键部署

### 步骤 1: 创建 Azure VM

```bash
cd /Users/mac/Codinnnnng/Poker_Assistant
./scripts/azure_vm_setup.sh
```

脚本会创建：
- 资源组
- 虚拟网络
- 网络安全组（开放 22, 80, 443 端口）
- 公共 IP
- Ubuntu 22.04 VM（B1s 免费层）

### 步骤 2: 连接到 VM 并初始化

```bash
# 获取 VM IP
VM_IP=$(az vm show -d \
  --resource-group poker-assistant-rg \
  --name poker-assistant-vm \
  --query publicIps -o tsv)

# 连接到 VM
ssh azureuser@$VM_IP
```

在 VM 上运行初始化脚本：

```bash
# 方法 A: 从 GitHub 拉取（如果已上传）
git clone <你的仓库地址> ~/poker-assistant
cd ~/poker-assistant
bash scripts/vm_init.sh

# 方法 B: 手动执行初始化步骤
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo apt install -y docker-compose-plugin
```

**重要**：初始化后需要重新登录以应用 docker 组权限：
```bash
exit
ssh azureuser@$VM_IP
```

### 步骤 3: 上传项目文件

**方法 A: 使用 Git（推荐）**
```bash
# 在 VM 上
cd ~
git clone <你的仓库地址> poker-assistant
cd poker-assistant
```

**方法 B: 使用 SCP**
```bash
# 在本地
scp -r /Users/mac/Codinnnnng/Poker_Assistant azureuser@$VM_IP:~/poker-assistant
```

### 步骤 4: 配置环境变量

```bash
# 在 VM 上
cd ~/poker-assistant
cp env_template.txt .env
nano .env
```

关键配置：
```env
# 数据库配置（Docker Compose 会自动使用）
POSTGRES_PASSWORD=<生成强密码>

# JWT 配置
JWT_SECRET_KEY=<生成32字符以上的随机字符串>
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# CORS 配置（如果已配置域名）
CORS_ORIGINS=https://your-domain.com

# Deepseek API（可选，用户可以在前端配置）
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

### 步骤 5: 构建前端

```bash
# 在 VM 上（或本地构建后上传）
cd ~/poker-assistant/frontend
npm install
npm run build
```

### 步骤 6: 启动服务

```bash
# 在 VM 上
cd ~/poker-assistant
docker-compose up -d
```

### 步骤 7: 初始化数据库

```bash
docker-compose exec backend python -c "from backend.database.session import init_db; init_db()"
```

### 步骤 8: 验证部署

```bash
# 检查服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 测试健康检查
curl http://$VM_IP/health
```

---

## 配置 HTTPS（可选但推荐）

### 1. 配置域名 DNS

将域名 A 记录指向 VM 的公共 IP：
```
your-domain.com  A  <VM_IP>
```

### 2. 安装 SSL 证书

```bash
# 在 VM 上
sudo certbot --nginx -d your-domain.com
```

### 3. 更新 Nginx 配置

取消注释 `deploy/nginx.conf` 中的 HTTPS 服务器块，并更新域名。

### 4. 重启 Nginx

```bash
docker-compose restart nginx
```

---

## 日常维护

### 查看日志
```bash
docker-compose logs -f
docker-compose logs -f backend
docker-compose logs -f nginx
```

### 重启服务
```bash
docker-compose restart
docker-compose restart backend
```

### 更新应用
```bash
# 拉取最新代码
git pull

# 重新构建并启动
docker-compose up -d --build
```

### 备份数据库
```bash
# 创建备份
docker-compose exec postgres pg_dump -U pokeruser poker_assistant > backup_$(date +%Y%m%d).sql

# 恢复备份
docker-compose exec -T postgres psql -U pokeruser poker_assistant < backup_20240101.sql
```

### 查看资源使用
```bash
# 查看 Docker 资源使用
docker stats

# 查看系统资源
htop
```

---

## 常见问题

### Q: 无法 SSH 连接到 VM？
A: 检查：
1. 网络安全组是否允许端口 22
2. VM 是否正在运行：`az vm show -d --name poker-assistant-vm --query powerState`
3. 公共 IP 是否正确

### Q: 应用无法访问？
A: 检查：
1. Docker Compose 服务是否运行：`docker-compose ps`
2. 防火墙规则是否允许 80/443 端口
3. Nginx 日志：`docker-compose logs nginx`

### Q: WebSocket 连接失败？
A: 检查：
1. Nginx 配置中的 WebSocket 代理设置
2. 后端服务是否正常运行
3. 浏览器控制台错误信息

### Q: 数据库连接失败？
A: 检查：
1. PostgreSQL 容器是否运行：`docker-compose ps postgres`
2. 数据库连接字符串是否正确
3. 数据库日志：`docker-compose logs postgres`

---

## 成本提醒

- **12 个月内**：$0（B1s 免费层）
- **12 个月后**：约 $10-15/月

建议在免费期结束前考虑：
- 继续使用（成本较低）
- 或迁移到其他免费方案

---

## 安全建议

1. ✅ 使用 SSH 密钥认证（禁用密码登录）
2. ✅ 只开放必要端口（22, 80, 443）
3. ✅ 定期更新系统：`sudo apt update && sudo apt upgrade`
4. ✅ 使用强密码（数据库、JWT Secret）
5. ✅ 配置 HTTPS（Let's Encrypt 免费证书）
6. ✅ 定期备份数据库

---

## 下一步

1. ✅ 完成上述部署步骤
2. ✅ 配置自定义域名和 HTTPS
3. ✅ 设置自动备份脚本
4. ✅ 配置监控（可选）

