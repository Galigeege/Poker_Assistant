# 🚀 Azure VM 部署方案（方案 B）

## 📋 架构概览

```
┌─────────────────────────────────────────────────────────┐
│                    Azure VM 部署架构                    │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│              Azure VM (B1s - 免费层 12个月)              │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Nginx (反向代理 + 静态文件)                      │  │
│  │  - 端口 80/443                                   │  │
│  │  - HTTPS (Let's Encrypt)                        │  │
│  │  - WebSocket 代理                               │  │
│  └──────────────┬───────────────────────────────────┘  │
│                 │                                       │
│  ┌──────────────▼───────────────────────────────────┐  │
│  │  Docker Compose                                 │  │
│  │                                                  │  │
│  │  ┌──────────────┐    ┌──────────────┐          │  │
│  │  │  FastAPI     │    │  PostgreSQL  │          │  │
│  │  │  Backend     │───▶│  Database    │          │  │
│  │  │  :8000       │    │  :5432       │          │  │
│  │  └──────────────┘    └──────────────┘          │  │
│  │                                                  │  │
│  │  ┌──────────────┐                               │  │
│  │  │  Frontend    │                               │  │
│  │  │  (静态文件)   │                               │  │
│  │  └──────────────┘                               │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 🎯 方案优势

- ✅ **完全控制**：可以运行 Docker Compose、自定义配置
- ✅ **免费层**：B1s（1 vCPU, 1GB RAM）12 个月免费
- ✅ **稳定不休眠**：VM 不会自动休眠
- ✅ **成本低**：12 个月后约 $10-15/月
- ✅ **灵活**：可以安装任何软件、运行任何服务

---

## 📦 部署步骤

### 第一步：创建 Azure VM

#### 1.1 创建资源组
```bash
az group create --name poker-assistant-rg --location eastus
```

#### 1.2 创建虚拟网络（可选，但推荐）
```bash
az network vnet create \
  --resource-group poker-assistant-rg \
  --name poker-assistant-vnet \
  --address-prefix 10.0.0.0/16 \
  --subnet-name default \
  --subnet-prefix 10.0.1.0/24
```

#### 1.3 创建网络安全组（开放必要端口）
```bash
az network nsg create \
  --resource-group poker-assistant-rg \
  --name poker-assistant-nsg

# 开放 SSH (22)
az network nsg rule create \
  --resource-group poker-assistant-rg \
  --nsg-name poker-assistant-nsg \
  --name AllowSSH \
  --priority 1000 \
  --protocol Tcp \
  --destination-port-ranges 22 \
  --access Allow

# 开放 HTTP (80)
az network nsg rule create \
  --resource-group poker-assistant-rg \
  --nsg-name poker-assistant-nsg \
  --name AllowHTTP \
  --priority 1001 \
  --protocol Tcp \
  --destination-port-ranges 80 \
  --access Allow

# 开放 HTTPS (443)
az network nsg rule create \
  --resource-group poker-assistant-rg \
  --nsg-name poker-assistant-nsg \
  --name AllowHTTPS \
  --priority 1002 \
  --protocol Tcp \
  --destination-port-ranges 443 \
  --access Allow
```

#### 1.4 创建公共 IP
```bash
az network public-ip create \
  --resource-group poker-assistant-rg \
  --name poker-assistant-ip \
  --allocation-method Static \
  --sku Basic
```

#### 1.5 创建 VM（Ubuntu 22.04 LTS）
```bash
az vm create \
  --resource-group poker-assistant-rg \
  --name poker-assistant-vm \
  --image Ubuntu2204 \
  --size Standard_B1s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --public-ip-address poker-assistant-ip \
  --vnet-name poker-assistant-vnet \
  --subnet default \
  --nsg poker-assistant-nsg \
  --storage-sku Standard_LRS
```

#### 1.6 获取 VM 公共 IP
```bash
VM_IP=$(az vm show -d \
  --resource-group poker-assistant-rg \
  --name poker-assistant-vm \
  --query publicIps -o tsv)

echo "VM IP: $VM_IP"
```

---

### 第二步：初始化 VM（安装 Docker、配置环境）

#### 2.1 连接到 VM
```bash
ssh azureuser@$VM_IP
```

#### 2.2 运行初始化脚本
```bash
# 在 VM 上执行
curl -fsSL https://raw.githubusercontent.com/your-repo/poker-assistant/main/scripts/vm_init.sh | bash
```

或者手动执行初始化步骤（见 `scripts/vm_init.sh`）。

---

### 第三步：部署应用

#### 3.1 上传项目文件到 VM

**方法 A：使用 Git（推荐）**
```bash
# 在 VM 上
cd ~
git clone <你的仓库地址> poker-assistant
cd poker-assistant
```

**方法 B：使用 SCP**
```bash
# 在本地
scp -r /Users/mac/Codinnnnng/Poker_Assistant azureuser@$VM_IP:~/poker-assistant
```

#### 3.2 配置环境变量
```bash
# 在 VM 上
cd ~/poker-assistant
cp env_template.txt .env

# 编辑 .env 文件
nano .env
```

关键配置：
```env
DATABASE_URL=postgresql://pokeruser:your_password@postgres:5432/poker_assistant
JWT_SECRET_KEY=<生成32字符以上的随机字符串>
CORS_ORIGINS=https://your-domain.com
```

#### 3.3 启动 Docker Compose
```bash
cd ~/poker-assistant
docker-compose up -d
```

#### 3.4 初始化数据库
```bash
docker-compose exec backend python -c "from backend.database.session import init_db; init_db()"
```

---

### 第四步：配置 Nginx 和 HTTPS

#### 4.1 配置 Nginx（已包含在 docker-compose 中）
Nginx 配置位于 `deploy/nginx.conf`，会自动挂载到容器。

#### 4.2 配置 HTTPS（使用 Let's Encrypt）
```bash
# 在 VM 上安装 certbot
sudo apt update
sudo apt install -y certbot python3-certbot-nginx

# 获取 SSL 证书（需要先配置域名 DNS 指向 VM IP）
sudo certbot --nginx -d your-domain.com
```

---

## 🔧 配置文件说明

### `docker-compose.yml`
- **backend**: FastAPI 应用（端口 8000）
- **postgres**: PostgreSQL 数据库（端口 5432）
- **nginx**: 反向代理和静态文件服务（端口 80/443）

### `deploy/nginx.conf`
- 反向代理 `/api` 到后端
- WebSocket 代理 `/ws` 到后端
- 静态文件服务（前端构建产物）

### `scripts/vm_init.sh`
- 安装 Docker 和 Docker Compose
- 配置防火墙
- 安装必要工具

---

## 📊 监控和维护

### 查看日志
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f nginx
```

### 重启服务
```bash
docker-compose restart
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

---

## 💰 成本估算

- **12 个月内**：$0（B1s 免费层）
- **12 个月后**：约 $10-15/月（取决于区域和存储）

---

## 🔐 安全建议

1. **SSH 密钥认证**：禁用密码登录
2. **防火墙**：只开放必要端口（22, 80, 443）
3. **定期更新**：`sudo apt update && sudo apt upgrade`
4. **SSL 证书**：使用 Let's Encrypt 免费证书
5. **数据库密码**：使用强密码
6. **JWT Secret**：使用随机生成的强密钥

---

## 🚨 常见问题

### Q: VM 无法连接？
A: 检查：
1. 网络安全组规则是否允许 SSH（端口 22）
2. 公共 IP 是否正确
3. VM 是否正在运行

### Q: 应用无法访问？
A: 检查：
1. Docker Compose 服务是否运行：`docker-compose ps`
2. Nginx 配置是否正确
3. 防火墙规则是否允许 HTTP/HTTPS

### Q: WebSocket 连接失败？
A: 检查：
1. Nginx 配置中的 WebSocket 代理设置
2. 后端服务是否正常运行
3. 浏览器控制台错误信息

---

## 📝 下一步

1. ✅ 完成上述部署步骤
2. ✅ 配置自定义域名（可选）
3. ✅ 设置自动备份脚本
4. ✅ 配置监控和告警（可选）

---

## 🔗 参考链接

- [Azure VM 文档](https://docs.microsoft.com/azure/virtual-machines/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Nginx 文档](https://nginx.org/en/docs/)

