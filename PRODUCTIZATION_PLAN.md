# 产品化行动计划 (Productization Plan)

## 一、项目概述

### 1.1 目标
将当前单用户本地存储的德州扑克 AI 竞技场升级为支持多用户的产品化系统，实现：
- ✅ 用户认证与授权（登录/注册）
- ✅ 用户数据隔离（每个用户独立的数据空间）
- ✅ 多用户并发游戏支持（多个用户同时进行游戏）

### 1.2 当前架构分析

#### 后端架构
- **WebSocket 连接管理**: `ConnectionManager` - 单例模式，管理所有连接
- **游戏管理器**: `GameManager` - 单例模式，管理单个游戏实例
- **数据存储**: 
  - 游戏状态：内存（`GameManager`）
  - 历史记录：前端 `localStorage`（无用户隔离）

#### 前端架构
- **状态管理**: Zustand (`useGameStore`)
- **数据持久化**: `localStorage`（按 session ID 存储）
- **WebSocket**: 直接连接到 `/ws/game`

#### 问题识别
1. ❌ **无用户认证**: 所有用户共享同一游戏实例
2. ❌ **数据未隔离**: `localStorage` 在浏览器层面，但无用户标识
3. ❌ **单游戏实例**: `GameManager` 是单例，只能支持一个游戏
4. ❌ **连接未绑定用户**: `ConnectionManager` 只管理连接，不区分用户

---

## 二、技术方案设计

### 2.1 用户认证系统

#### 2.1.1 认证方案选择

**方案 A: JWT Token 认证（推荐）**
- ✅ 无状态，易于扩展
- ✅ 支持分布式部署
- ✅ 前端可存储 token，自动携带

**方案 B: Session 认证**
- ❌ 需要服务器存储 session
- ❌ 不利于水平扩展

**选择**: **方案 A - JWT Token**

#### 2.1.2 数据库设计

**用户表 (users)**
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,  -- bcrypt
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);
```

**用户会话表 (user_sessions)** - 可选，用于 token 黑名单
```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_jti VARCHAR(255) UNIQUE,  -- JWT ID
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);
```

#### 2.1.3 API 设计

**REST API 端点**
```
POST   /api/auth/register      - 用户注册
POST   /api/auth/login         - 用户登录
POST   /api/auth/refresh       - 刷新 token
POST   /api/auth/logout        - 登出（可选，用于 token 黑名单）
GET    /api/auth/me            - 获取当前用户信息
```

**请求/响应示例**
```json
// POST /api/auth/register
{
  "username": "player1",
  "email": "player1@example.com",
  "password": "secure_password"
}

// Response
{
  "user": {
    "id": "uuid",
    "username": "player1",
    "email": "player1@example.com"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### 2.2 用户数据隔离

#### 2.2.1 数据存储架构

**方案 A: PostgreSQL + Redis（推荐）**
- PostgreSQL: 持久化数据（用户信息、游戏历史、统计数据）
- Redis: 热数据缓存（活跃游戏状态、会话信息）

**方案 B: SQLite（开发/小规模）**
- 简单，适合初期开发
- 性能有限，不适合高并发

**选择**: **方案 A（生产）** / **方案 B（开发阶段）**

#### 2.2.2 数据表设计

**游戏会话表 (game_sessions)**
```sql
CREATE TABLE game_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    total_hands INTEGER DEFAULT 0,
    total_profit DECIMAL(10, 2) DEFAULT 0,
    win_rate DECIMAL(5, 2),
    vpip DECIMAL(5, 2),
    config JSONB,  -- 游戏配置（盲注、AI难度等）
    created_at TIMESTAMP DEFAULT NOW()
);
```

**游戏回合表 (game_rounds)**
```sql
CREATE TABLE game_rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES game_sessions(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    hero_hole_cards JSONB,  -- ["SA", "HK"]
    community_cards JSONB,  -- ["DA", "DK", "DQ"]
    street_history JSONB,   -- 完整的街道历史
    player_actions JSONB,   -- 所有玩家的行动
    winners JSONB,          -- 赢家信息
    hand_info JSONB,        -- 摊牌信息
    hero_profit DECIMAL(10, 2),
    pot_size DECIMAL(10, 2),
    review_analysis JSONB,   -- AI 复盘分析（可选）
    created_at TIMESTAMP DEFAULT NOW()
);
```

**用户统计数据表 (user_statistics)** - 可选，用于快速查询
```sql
CREATE TABLE user_statistics (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_sessions INTEGER DEFAULT 0,
    total_hands INTEGER DEFAULT 0,
    total_profit DECIMAL(10, 2) DEFAULT 0,
    win_rate DECIMAL(5, 2) DEFAULT 0,
    vpip DECIMAL(5, 2) DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### 2.3 多用户并发支持

#### 2.3.1 架构重构

**当前架构问题**:
```
GameManager (单例)
  └── 单个游戏实例
      └── 所有用户共享
```

**目标架构**:
```
GameManagerRegistry
  ├── GameManager (user_1) -> GameInstance_1
  ├── GameManager (user_2) -> GameInstance_2
  └── GameManager (user_3) -> GameInstance_3
```

#### 2.3.2 实现方案

**方案 A: 每个用户一个 GameManager 实例**
- ✅ 完全隔离
- ✅ 易于管理
- ❌ 资源消耗较大（每个用户一个线程）

**方案 B: 游戏房间模式（Room-based）**
- ✅ 资源利用率高
- ✅ 支持多用户同桌（未来扩展）
- ❌ 实现复杂度较高

**选择**: **方案 A（初期）** → **方案 B（未来扩展）**

#### 2.3.3 连接管理重构

**当前**: `ConnectionManager` - 所有连接在一个列表
**目标**: `ConnectionManager` - 按用户 ID 管理连接

```python
class ConnectionManager:
    def __init__(self):
        # user_id -> WebSocket
        self.user_connections: Dict[str, WebSocket] = {}
        # user_id -> GameManager
        self.user_games: Dict[str, GameManager] = {}
```

---

## 三、详细实施计划

### Phase 1: 数据库与认证基础 (Week 1-2)

#### 1.1 数据库设置
- [ ] **任务 1.1.1**: 选择数据库（PostgreSQL 或 SQLite）
  - 开发环境：SQLite
  - 生产环境：PostgreSQL
- [ ] **任务 1.1.2**: 创建数据库迁移脚本
  - 使用 Alembic 或自定义迁移脚本
  - 创建所有必需的表结构
- [ ] **任务 1.1.3**: 设置数据库连接池
  - 使用 SQLAlchemy 或 asyncpg
  - 配置连接池参数

#### 1.2 用户认证实现
- [ ] **任务 1.2.1**: 安装依赖
  ```bash
  pip install python-jose[cryptography] passlib[bcrypt] python-multipart
  ```
- [ ] **任务 1.2.2**: 创建认证模块
  - `backend/auth/__init__.py`
  - `backend/auth/models.py` - 用户模型
  - `backend/auth/schemas.py` - Pydantic schemas
  - `backend/auth/crud.py` - 数据库操作
  - `backend/auth/security.py` - 密码哈希、JWT 生成
  - `backend/auth/dependencies.py` - FastAPI 依赖注入
- [ ] **任务 1.2.3**: 实现认证 API
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `POST /api/auth/refresh`
- [ ] **任务 1.2.4**: 添加认证中间件
  - JWT token 验证
  - 用户信息注入到请求上下文

#### 1.3 前端认证集成
- [ ] **任务 1.3.1**: 创建认证 Store
  - `frontend/src/store/useAuthStore.ts`
  - 管理用户状态、token 存储
- [ ] **任务 1.3.2**: 创建登录/注册页面
  - `frontend/src/pages/Login.tsx`
  - `frontend/src/pages/Register.tsx`
- [ ] **任务 1.3.3**: 添加路由保护
  - 未登录用户重定向到登录页
  - 已登录用户自动跳转到游戏大厅
- [ ] **任务 1.3.4**: 添加 HTTP 拦截器
  - 自动在请求头添加 `Authorization: Bearer <token>`
  - Token 过期自动刷新或重定向登录

**交付物**:
- ✅ 数据库表结构
- ✅ 用户注册/登录功能
- ✅ JWT token 认证流程

---

### Phase 2: 数据隔离与持久化 (Week 2-3)

#### 2.1 后端数据层重构
- [ ] **任务 2.1.1**: 创建数据访问层 (DAL)
  - `backend/database/__init__.py`
  - `backend/database/models.py` - SQLAlchemy 模型
  - `backend/database/session.py` - 数据库会话管理
  - `backend/database/crud.py` - CRUD 操作
- [ ] **任务 2.1.2**: 实现游戏会话存储
  - 创建 `GameSessionService`
  - 保存游戏会话到数据库
  - 查询用户历史会话
- [ ] **任务 2.1.3**: 实现游戏回合存储
  - 保存每局游戏的完整数据
  - 包括手牌、行动历史、复盘分析
- [ ] **任务 2.1.4**: 实现统计数据计算
  - 实时更新用户统计数据
  - 支持按时间范围查询

#### 2.2 前端数据迁移
- [ ] **任务 2.2.1**: 移除 `localStorage` 依赖
  - 保留作为 fallback（离线模式）
  - 优先使用 API 获取数据
- [ ] **任务 2.2.2**: 创建数据服务层
  - `frontend/src/services/api.ts` - API 客户端
  - `frontend/src/services/gameService.ts` - 游戏数据服务
  - `frontend/src/services/sessionService.ts` - 会话数据服务
- [ ] **任务 2.2.3**: 重构 Dashboard
  - 从 API 获取统计数据
  - 从 API 获取会话列表
- [ ] **任务 2.2.4**: 重构 ReplayDetail
  - 从 API 获取回合详情
  - 从 API 获取复盘分析

#### 2.3 数据迁移脚本
- [ ] **任务 2.3.1**: 创建迁移工具
  - 将现有 `localStorage` 数据导入数据库
  - 支持批量导入（如果有多个用户数据）

**交付物**:
- ✅ 数据库持久化层
- ✅ 前端数据服务层
- ✅ 数据迁移工具

---

### Phase 3: 多用户并发支持 (Week 3-4)

#### 3.1 后端架构重构
- [ ] **任务 3.1.1**: 重构 `ConnectionManager`
  ```python
  class ConnectionManager:
      def __init__(self):
          # user_id -> WebSocket
          self.user_connections: Dict[str, WebSocket] = {}
          # user_id -> GameManager
          self.user_games: Dict[str, GameManager] = {}
  ```
- [ ] **任务 3.1.2**: 重构 `GameManager`
  - 从单例改为可实例化
  - 每个实例绑定一个 `user_id`
  - 支持独立启动/停止
- [ ] **任务 3.1.3**: 创建 `GameManagerRegistry`
  - 管理所有用户的游戏实例
  - 提供创建、获取、销毁接口
  - 支持资源清理（用户断开连接后清理）
- [ ] **任务 3.1.4**: 重构 WebSocket 端点
  - 从 token 中提取 `user_id`
  - 为每个用户创建独立的游戏实例
  - 消息路由到对应的 `GameManager`

#### 3.2 资源管理
- [ ] **任务 3.2.1**: 实现连接清理
  - 用户断开连接时清理游戏实例
  - 设置超时机制（用户长时间不活跃）
- [ ] **任务 3.2.2**: 实现资源限制
  - 限制每个用户的最大并发游戏数
  - 限制服务器总游戏实例数
- [ ] **任务 3.2.3**: 添加监控指标
  - 活跃用户数
  - 活跃游戏数
  - 资源使用情况

#### 3.3 测试与优化
- [ ] **任务 3.3.1**: 并发测试
  - 模拟多个用户同时游戏
  - 压力测试（10+ 并发用户）
- [ ] **任务 3.3.2**: 性能优化
  - 游戏实例池化（可选）
  - 数据库连接池优化
  - Redis 缓存优化

**交付物**:
- ✅ 多用户并发支持
- ✅ 资源管理机制
- ✅ 性能测试报告

---

### Phase 4: 前端用户体验优化 (Week 4-5)

#### 4.1 用户界面优化
- [ ] **任务 4.1.1**: 添加用户信息显示
  - 导航栏显示用户名
  - 用户设置页面
- [ ] **任务 4.1.2**: 优化登录/注册流程
  - 表单验证
  - 错误提示
  - 加载状态
- [ ] **任务 4.1.3**: 添加数据同步提示
  - 数据保存成功提示
  - 网络错误处理

#### 4.2 数据加载优化
- [ ] **任务 4.2.1**: 实现数据缓存
  - 使用 React Query 或 SWR
  - 减少不必要的 API 请求
- [ ] **任务 4.2.2**: 实现分页加载
  - 会话列表分页
  - 回合列表分页
- [ ] **任务 4.2.3**: 添加加载状态
  - Skeleton 加载动画
  - 进度指示器

**交付物**:
- ✅ 优化的用户界面
- ✅ 流畅的数据加载体验

---

## 四、技术栈选择

### 后端
- **认证**: `python-jose` (JWT), `passlib` (密码哈希)
- **数据库 ORM**: `SQLAlchemy` (同步) 或 `Tortoise ORM` (异步)
- **数据库**: PostgreSQL (生产) / SQLite (开发)
- **缓存**: Redis (可选，用于会话缓存)
- **迁移工具**: Alembic

### 前端
- **HTTP 客户端**: `axios` 或 `fetch`
- **状态管理**: Zustand (保持现有)
- **数据获取**: React Query 或 SWR (可选)
- **路由**: React Router (如果还没有)

---

## 五、数据库迁移策略

### 5.1 开发环境
- 使用 SQLite，便于开发和测试
- 数据文件: `data/poker_assistant.db`

### 5.2 生产环境
- 使用 PostgreSQL
- 支持连接池、事务、备份

### 5.3 迁移工具
- 使用 Alembic 管理数据库迁移
- 版本控制数据库 schema

---

## 六、安全考虑

### 6.1 认证安全
- ✅ 密码使用 bcrypt 哈希（至少 12 rounds）
- ✅ JWT token 设置合理的过期时间（1小时）
- ✅ 实现 refresh token 机制
- ✅ HTTPS 传输（生产环境）

### 6.2 数据安全
- ✅ SQL 注入防护（使用 ORM）
- ✅ XSS 防护（前端输入验证）
- ✅ CSRF 防护（JWT token 在 header 中）

### 6.3 资源安全
- ✅ 用户只能访问自己的数据
- ✅ API 端点验证用户身份
- ✅ WebSocket 连接验证 token

---

## 七、测试计划

### 7.1 单元测试
- 认证模块测试
- 数据访问层测试
- 游戏管理器测试

### 7.2 集成测试
- 用户注册/登录流程
- 游戏数据保存/读取
- 多用户并发游戏

### 7.3 端到端测试
- 完整用户流程（注册 → 游戏 → 复盘）
- 多用户同时操作

---

## 八、部署考虑

### 8.1 环境变量
```env
# 数据库
DATABASE_URL=postgresql://user:pass@localhost/poker_assistant
# 或 SQLite
DATABASE_URL=sqlite:///data/poker_assistant.db

# JWT
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=1

# Redis (可选)
REDIS_URL=redis://localhost:6379/0
```

### 8.2 Docker 化（可选）
- 创建 `Dockerfile`
- 创建 `docker-compose.yml`（包含 PostgreSQL、Redis）

---

## 九、风险评估与应对

### 9.1 技术风险
| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 数据库性能瓶颈 | 高 | 使用连接池、索引优化、Redis 缓存 |
| 并发冲突 | 中 | 使用数据库事务、乐观锁 |
| Token 泄露 | 高 | HTTPS、短期过期、refresh token |

### 9.2 业务风险
| 风险 | 影响 | 应对措施 |
|------|------|----------|
| 用户数据丢失 | 高 | 定期备份、事务保证 |
| 服务不可用 | 中 | 健康检查、错误监控 |

---

## 十、时间估算

| Phase | 任务 | 预估时间 |
|-------|------|----------|
| Phase 1 | 数据库与认证 | 2 周 |
| Phase 2 | 数据隔离 | 1 周 |
| Phase 3 | 多用户并发 | 1 周 |
| Phase 4 | 前端优化 | 1 周 |
| **总计** | | **5 周** |

---

## 十一、下一步行动

### 立即开始
1. ✅ 确认技术方案（数据库选择、认证方式）
2. ✅ 创建项目分支 `feature/multi-user-support`
3. ✅ 设置开发环境（数据库、依赖）

### 第一周
1. 完成 Phase 1.1 - 数据库设置
2. 完成 Phase 1.2 - 后端认证实现
3. 开始 Phase 1.3 - 前端认证集成

---

## 附录

### A. 文件结构规划

```
backend/
├── auth/
│   ├── __init__.py
│   ├── models.py          # 用户模型
│   ├── schemas.py         # Pydantic schemas
│   ├── crud.py            # 数据库操作
│   ├── security.py         # 密码、JWT
│   ├── dependencies.py     # FastAPI 依赖
│   └── router.py          # 认证路由
├── database/
│   ├── __init__.py
│   ├── models.py          # SQLAlchemy 模型
│   ├── session.py         # 数据库会话
│   └── crud.py            # CRUD 操作
├── game/
│   ├── __init__.py
│   ├── manager_registry.py  # 游戏管理器注册表
│   └── session_service.py   # 游戏会话服务
└── main.py               # 更新 WebSocket 端点

frontend/
├── src/
│   ├── pages/
│   │   ├── Login.tsx
│   │   └── Register.tsx
│   ├── store/
│   │   └── useAuthStore.ts
│   └── services/
│       ├── api.ts
│       ├── gameService.ts
│       └── sessionService.ts
```

### B. API 端点清单

```
# 认证
POST   /api/auth/register
POST   /api/auth/login
GET    /api/auth/me
POST   /api/auth/refresh

# 游戏会话
GET    /api/sessions              # 获取用户所有会话
GET    /api/sessions/{id}         # 获取会话详情
POST   /api/sessions               # 创建新会话（可选）

# 游戏回合
GET    /api/sessions/{id}/rounds  # 获取会话的所有回合
GET    /api/rounds/{id}           # 获取回合详情

# 统计数据
GET    /api/stats                 # 获取用户统计数据
GET    /api/stats/sessions        # 获取会话统计
```

---

**文档版本**: v1.0  
**创建日期**: 2024  
**最后更新**: 2024


