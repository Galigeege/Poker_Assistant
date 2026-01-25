# 🚀 从本地代码到 Azure VM 部署 - 完整步骤

## 📋 前置检查清单

在开始之前，请确认：

- [ ] Azure 账号已注册并登录
- [ ] Azure CLI 已安装：`az --version`
- [ ] 已登录 Azure：`az login`
- [ ] SSH 密钥已生成（或准备使用 `--generate-ssh-keys`）
- [ ] Git 已安装：`git --version`

---

## 第一步：准备代码仓库（如果还没有）

### 选项 A：使用现有 Git 仓库

如果你已经有远程仓库，直接使用：
```bash
cd /Users/mac/Codinnnnng/Poker_Assistant
git remote -v  # 查看远程仓库
```

### 选项 B：创建新的 Git 仓库

#### 1. 在 GitHub/GitLab 创建新仓库

访问 GitHub (https://github.com) 或 GitLab，创建一个新仓库（例如：`poker-assistant`）

#### 2. 初始化本地仓库并推送

```bash
cd /Users/mac/Codinnnnng/Poker_Assistant

# 如果还没有初始化 Git
git init
git add .
git commit -m "Initial commit: Azure VM deployment ready"

# 添加远程仓库（替换为你的仓库地址）
git remote add origin https://github.com/你的用户名/poker-assistant.git

# 推送到远程
git branch -M main
git push -u origin main
```

---

## 第二步：创建 Azure VM

### 2.1 运行自动化脚本

```bash
cd /Users/mac/Codinnnnng/Poker_Assistant
./scripts/azure_vm_setup.sh
```

脚本会：
- 创建资源组
- 创建虚拟网络
- 创建网络安全组（开放 22, 80, 443 端口）
- 创建公共 IP
- 创建 Ubuntu 22.04 VM（B1s 免费层）

### 2.2 获取 VM IP 地址

```bash
VM_IP=$(az vm show -d \
  --resource-group poker-assistant-rg \
  --name poker-assistant-vm \
  --query publicIps -o tsv)

echo "VM IP: $VM_IP"
```

**保存这个 IP 地址，后续会用到！**

---

## 第三步：连接到 VM 并初始化环境

### 3.1 SSH 连接到 VM

```bash
# 使用上面获取的 VM_IP
ssh azureuser@$VM_IP

# 或者直接使用 IP
# ssh azureuser@<你的VM_IP>
```

**注意**：首次连接会提示确认主机密钥，输入 `yes` 确认。

### 3.2 在 VM 上运行初始化脚本

```bash
# 方法 A: 如果代码已推送到 Git，直接克隆并运行
git clone <你的仓库地址> ~/poker-assistant
cd ~/poker-assistant
bash scripts/vm_init.sh

# 方法 B: 如果代码还没推送，先手动安装 Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
sudo apt install -y docker-compose-plugin
```

### 3.3 重新登录以应用 Docker 权限

```bash
# 退出 SSH
exit

# 重新连接
ssh azureuser@$VM_IP
```

---

## 第四步：上传代码到 VM

### 选项 A：使用 Git（推荐）

```bash
# 在 VM 上
cd ~
git clone <你的仓库地址> poker-assistant
cd poker-assistant
```

### 选项 B：使用 SCP（如果还没推送到 Git）

```bash
# 在本地（新开一个终端窗口）
cd /Users/mac/Codinnnnng/Poker_Assistant
scp -r . azureuser@$VM_IP:~/poker-assistant
```

---

## 第五步：配置环境变量

### 5.1 创建 .env 文件

```bash
# 在 VM 上
cd ~/poker-assistant
cp env_template.txt .env
nano .env
```

### 5.2 配置关键环境变量

在 `.env` 文件中配置以下内容：

```env
# 数据库密码（Docker Compose 使用）
POSTGRES_PASSWORD=<生成一个强密码，例如：Poker2024!SecurePass>

# JWT 配置（生成随机密钥）
JWT_SECRET_KEY=<生成32字符以上的随机字符串，例如：openssl rand -hex 32>
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# CORS 配置（暂时使用 *，配置域名后改为具体域名）
CORS_ORIGINS=*

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

**快速生成 JWT Secret**：
```bash
# 在 VM 上
openssl rand -hex 32
# 复制输出到 .env 文件的 JWT_SECRET_KEY
```

保存并退出：`Ctrl+X` → `Y` → `Enter`

---

## 第六步：构建前端

### 6.1 安装 Node.js（如果还没有）

```bash
# 在 VM 上
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 6.2 构建前端

```bash
# 在 VM 上
cd ~/poker-assistant/frontend
npm install
npm run build
```

**注意**：如果构建失败，可能需要更多内存。B1s（1GB RAM）可能不够，可以：
- 临时升级 VM 规格
- 或在本地构建后上传 `frontend/dist` 目录

---

## 第七步：启动服务

### 7.1 启动 Docker Compose

```bash
# 在 VM 上
cd ~/poker-assistant
docker-compose up -d
```

### 7.2 检查服务状态

```bash
docker-compose ps
```

应该看到三个服务都在运行：
- `poker-assistant-postgres`
- `poker-assistant-backend`
- `poker-assistant-nginx`

### 7.3 查看日志

```bash
# 查看所有服务日志
docker-compose logs -f

# 或查看特定服务
docker-compose logs -f backend
docker-compose logs -f nginx
```

---

## 第八步：初始化数据库

```bash
# 在 VM 上
docker-compose exec backend python -c "from backend.database.session import init_db; init_db()"
```

---

## 第九步：验证部署

### 9.1 测试健康检查

```bash
# 在本地或 VM 上
curl http://$VM_IP/health
```

应该返回：
```json
{"status":"ok","version":"2.0.0"}
```

### 9.2 测试前端

在浏览器中访问：`http://<VM_IP>`

应该能看到前端页面。

### 9.3 测试 API

```bash
# 测试注册接口
curl -X POST http://$VM_IP/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","email":"test@example.com","password":"test123"}'
```

### 9.4 测试完整流程

1. 在浏览器访问 `http://<VM_IP>`
2. 注册一个新用户
3. 登录
4. 创建游戏会话
5. 测试 WebSocket 连接

---

## 🎉 部署完成！

如果所有测试都通过，恭喜你，部署成功！

---

## 📝 后续优化（可选）

### 1. 配置自定义域名

1. 购买域名（或使用已有域名）
2. 配置 DNS A 记录指向 VM IP
3. 在 VM 上安装 SSL 证书：
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```
4. 更新 `.env` 中的 `CORS_ORIGINS`
5. 重启服务：`docker-compose restart`

### 2. 设置自动备份

创建备份脚本 `~/poker-assistant/scripts/backup.sh`：
```bash
#!/bin/bash
BACKUP_DIR=~/backups
mkdir -p $BACKUP_DIR
docker-compose exec -T postgres pg_dump -U pokeruser poker_assistant > $BACKUP_DIR/backup_$(date +%Y%m%d_%H%M%S).sql
```

添加到 crontab（每天凌晨 2 点备份）：
```bash
crontab -e
# 添加：0 2 * * * /home/azureuser/poker-assistant/scripts/backup.sh
```

### 3. 配置监控（可选）

- 使用 Azure Monitor
- 或安装 Prometheus + Grafana

---

## 🆘 常见问题

### Q: SSH 连接失败？
A: 
1. 检查 VM 是否运行：`az vm show -d --name poker-assistant-vm --query powerState`
2. 检查网络安全组是否允许端口 22
3. 检查公共 IP 是否正确

### Q: Docker Compose 启动失败？
A:
1. 检查 `.env` 文件是否存在且配置正确
2. 查看日志：`docker-compose logs`
3. 检查端口是否被占用：`sudo netstat -tulpn | grep :80`

### Q: 前端无法访问？
A:
1. 检查 `frontend/dist` 目录是否存在
2. 检查 Nginx 日志：`docker-compose logs nginx`
3. 检查防火墙规则

### Q: WebSocket 连接失败？
A:
1. 检查 Nginx 配置中的 WebSocket 代理设置
2. 检查后端服务是否正常运行
3. 查看浏览器控制台错误

---

## 📚 参考文档

- **详细部署文档**：`AZURE_VM_DEPLOYMENT.md`
- **快速开始**：`AZURE_VM_QUICK_START.md`
- **文件清单**：`AZURE_VM_DEPLOYMENT_SUMMARY.md`

---

## 💡 提示

1. **保存 VM IP**：建议保存到笔记中，方便后续访问
2. **定期备份**：建议设置自动备份脚本
3. **监控资源**：定期检查 VM 资源使用情况
4. **更新系统**：定期更新系统和 Docker 镜像

