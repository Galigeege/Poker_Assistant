# Phase 1 测试指南

## 📋 测试前准备

### 1. 确保依赖已安装
```bash
pip install -r requirements.txt
```

### 2. 确保数据库已初始化
```bash
python3 scripts/init_db.py
```

### 3. 配置环境变量（可选）
如果还没有 `.env` 文件，可以复制模板：
```bash
cp env_template.txt .env
```

---

## 🚀 方法一：使用 API 文档测试（推荐）

### 启动服务器
```bash
# 方法 1：使用启动脚本
python3 run_server.py

# 方法 2：使用 uvicorn
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

### 访问 API 文档
打开浏览器访问：**http://localhost:8000/docs**

你会看到 Swagger UI 界面，可以：
1. 查看所有 API 端点
2. 直接在浏览器中测试 API
3. 查看请求/响应格式

### 测试步骤

#### 1. 测试用户注册
1. 在 API 文档中找到 `POST /api/auth/register`
2. 点击 "Try it out"
3. 输入测试数据：
   ```json
   {
     "username": "testuser",
     "email": "test@example.com",
     "password": "test123"
   }
   ```
4. 点击 "Execute"
5. 查看响应，应该返回用户信息（不包含密码）

#### 2. 测试用户登录
1. 找到 `POST /api/auth/login`
2. 点击 "Try it out"
3. 输入刚才注册的用户名和密码
4. 点击 "Execute"
5. 复制返回的 `access_token`

#### 3. 测试获取用户信息
1. 找到 `GET /api/auth/me`
2. 点击 "Try it out"
3. 点击 "Authorize" 按钮（右上角）
4. 输入刚才获取的 token（格式：`Bearer <token>` 或直接输入 token）
5. 点击 "Execute"
6. 应该返回当前用户信息

---

## 💻 方法二：使用命令行测试

### 测试脚本
创建一个测试脚本 `test_api.sh`：

```bash
#!/bin/bash

BASE_URL="http://localhost:8000"

echo "=== Phase 1 API 测试 ==="
echo ""

# 1. 健康检查
echo "1️⃣ 健康检查..."
curl -s "$BASE_URL/health" | python3 -m json.tool
echo ""

# 2. 注册用户
echo "2️⃣ 注册新用户..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser_'$(date +%s)'",
    "email": "test_'$(date +%s)'@example.com",
    "password": "test123"
  }')
echo "$REGISTER_RESPONSE" | python3 -m json.tool
echo ""

# 3. 登录
echo "3️⃣ 用户登录..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser_'$(date +%s)'",
    "password": "test123"
  }')
echo "$LOGIN_RESPONSE" | python3 -m json.tool

# 提取 token
TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token', ''))")
echo ""

# 4. 获取用户信息
if [ -n "$TOKEN" ] && [ "$TOKEN" != "None" ]; then
  echo "4️⃣ 获取用户信息（使用 Token）..."
  curl -s -X GET "$BASE_URL/api/auth/me" \
    -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
else
  echo "❌ 无法获取 token"
fi
```

运行测试：
```bash
chmod +x test_api.sh
./test_api.sh
```

---

## 🧪 方法三：使用 Python 测试脚本

创建 `test_api.py`：

```python
#!/usr/bin/env python3
"""
API 测试脚本
"""
import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def test_health():
    """测试健康检查"""
    print("1️⃣ 健康检查...")
    response = requests.get(f"{BASE_URL}/health")
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    assert response.status_code == 200
    print("✅ 通过\n")

def test_register():
    """测试用户注册"""
    print("2️⃣ 用户注册...")
    data = {
        "username": f"testuser_{hash('test')}",
        "email": f"test_{hash('test')}@example.com",
        "password": "test123"
    }
    response = requests.post(f"{BASE_URL}/api/auth/register", json=data)
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    assert response.status_code == 201
    print("✅ 通过\n")
    return data["username"], data["password"]

def test_login(username, password):
    """测试用户登录"""
    print("3️⃣ 用户登录...")
    data = {"username": username, "password": password}
    response = requests.post(f"{BASE_URL}/api/auth/login", json=data)
    result = response.json()
    print(json.dumps(result, indent=2, ensure_ascii=False))
    assert response.status_code == 200
    assert "access_token" in result
    print("✅ 通过\n")
    return result["access_token"]

def test_get_me(token):
    """测试获取用户信息"""
    print("4️⃣ 获取用户信息...")
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/api/auth/me", headers=headers)
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    assert response.status_code == 200
    assert "username" in response.json()
    print("✅ 通过\n")

def main():
    print("=" * 50)
    print("Phase 1 API 测试")
    print("=" * 50)
    print()
    
    try:
        test_health()
        username, password = test_register()
        token = test_login(username, password)
        test_get_me(token)
        
        print("=" * 50)
        print("✅ 所有测试通过！")
        print("=" * 50)
    except Exception as e:
        print(f"❌ 测试失败: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
```

运行测试：
```bash
python3 test_api.py
```

---

## 🌐 方法四：使用 Postman 或 Insomnia

### 导入 API 集合

1. **获取 OpenAPI 规范**：
   - 访问：http://localhost:8000/openapi.json
   - 保存 JSON 文件

2. **导入到 Postman**：
   - 打开 Postman
   - File → Import
   - 选择 OpenAPI JSON 文件
   - 自动创建所有 API 请求

3. **测试流程**：
   - 先执行注册请求
   - 再执行登录请求，复制 token
   - 在环境变量中设置 `token`
   - 执行获取用户信息请求，使用 `{{token}}`

---

## ✅ 测试检查清单

### 基础功能测试
- [ ] 服务器可以启动
- [ ] 健康检查返回正常
- [ ] API 文档可以访问

### 用户注册测试
- [ ] 可以注册新用户
- [ ] 用户名重复时返回错误
- [ ] 邮箱重复时返回错误
- [ ] 密码太短时返回错误（< 6 字符）
- [ ] 密码太长时返回错误（> 72 字节）

### 用户登录测试
- [ ] 正确用户名密码可以登录
- [ ] 错误密码返回 401
- [ ] 不存在的用户返回 401
- [ ] 登录返回有效的 JWT token

### Token 验证测试
- [ ] 使用有效 token 可以获取用户信息
- [ ] 无效 token 返回 401
- [ ] 过期 token 返回 401
- [ ] 无 token 返回 401

### 数据库测试
- [ ] 用户数据保存到数据库
- [ ] 密码以哈希形式存储（不是明文）
- [ ] 可以查询用户信息

---

## 🐛 常见问题排查

### 1. 服务器无法启动
```bash
# 检查端口是否被占用
lsof -i :8000

# 检查 Python 路径
python3 -c "import sys; print(sys.path)"
```

### 2. 数据库错误
```bash
# 检查数据库文件是否存在
ls -lh data/poker_assistant.db

# 重新初始化数据库
python3 scripts/init_db.py
```

### 3. 导入错误
```bash
# 确保从项目根目录运行
cd /Users/mac/Codinnnnng/Poker_Assistant

# 检查依赖是否安装
pip list | grep -E "fastapi|sqlalchemy|bcrypt|jose"
```

### 4. Token 验证失败
- 检查 token 格式：`Bearer <token>`
- 检查 token 是否过期
- 检查 JWT_SECRET_KEY 是否一致

---

## 📊 预期测试结果

### 成功场景
1. **注册**：返回 201，包含用户信息（不含密码）
2. **登录**：返回 200，包含 `access_token`
3. **获取用户信息**：返回 200，包含用户详细信息

### 失败场景
1. **重复注册**：返回 400，错误信息："Username already registered"
2. **错误密码**：返回 401，错误信息："Incorrect username or password"
3. **无效 Token**：返回 401，错误信息："Invalid authentication credentials"

---

## 🎯 快速测试命令

### 一键测试脚本
```bash
# 创建快速测试脚本
cat > quick_test.sh << 'EOF'
#!/bin/bash
echo "测试注册..."
curl -s -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"quicktest","email":"quick@test.com","password":"test123"}' \
  | python3 -m json.tool

echo -e "\n测试登录..."
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"quicktest","password":"test123"}' \
  | python3 -c "import sys, json; print(json.load(sys.stdin).get('access_token',''))")

echo "Token: ${TOKEN:0:30}..."

echo -e "\n测试获取用户信息..."
curl -s -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer $TOKEN" \
  | python3 -m json.tool
EOF

chmod +x quick_test.sh
./quick_test.sh
```

---

## 📝 测试报告模板

测试完成后，记录结果：

```
测试日期: ___________
测试人员: ___________

✅ 通过的测试:
- [ ] 健康检查
- [ ] 用户注册
- [ ] 用户登录
- [ ] Token 验证
- [ ] 错误处理

❌ 失败的测试:
- [ ] 

备注:
_________________________________
```

---

**提示**: 推荐使用 **方法一（API 文档）** 进行测试，最直观且不需要额外工具！


