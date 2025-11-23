# 📤 部署到 GitHub 教程

本指南将帮助你把项目推送到 GitHub，即使你之前没有使用过 GitHub。

## 📋 前置准备

### 1. 注册 GitHub 账号
如果还没有 GitHub 账号：
- 访问 [https://github.com](https://github.com)
- 点击 "Sign up" 注册账号
- 验证邮箱

### 2. 安装 Git（你已经安装了✅）
你的系统已经有 Git，可以跳过这一步。

---

## 🚀 部署步骤

### 步骤 1: 在 GitHub 上创建新仓库

1. **登录 GitHub**
   - 访问 [https://github.com](https://github.com)
   - 使用你的账号登录

2. **创建新仓库**
   - 点击右上角的 `+` 号
   - 选择 "New repository"（新建仓库）

3. **填写仓库信息**
   ```
   Repository name（仓库名称）:    Poker_Assistant
   Description（描述）:           AI德州扑克练习助手 - 基于Deepseek AI的智能德州扑克练习项目
   
   设置选项：
   ☑ Public（公开）或 Private（私有） - 建议选 Private 保护隐私
   ☐ 不要勾选 "Initialize this repository with a README"
   ☐ 不要添加 .gitignore
   ☐ 不要添加 license
   ```
   
   ⚠️ **重要**：不要勾选任何初始化选项，因为我们本地已经有代码了！

4. **点击 "Create repository"（创建仓库）**

### 步骤 2: 连接本地仓库到 GitHub

创建完仓库后，GitHub 会显示一个页面，上面有仓库地址。复制那个地址（类似 `https://github.com/你的用户名/Poker_Assistant.git`）

然后在终端执行以下命令：

```bash
# 进入项目目录
cd /Users/mac/Codinnnnng/Poker_Assistant

# 添加远程仓库（将 <你的仓库地址> 替换为实际地址）
git remote add origin https://github.com/你的用户名/Poker_Assistant.git

# 验证远程仓库是否添加成功
git remote -v
```

你应该看到类似这样的输出：
```
origin  https://github.com/你的用户名/Poker_Assistant.git (fetch)
origin  https://github.com/你的用户名/Poker_Assistant.git (push)
```

### 步骤 3: 推送代码到 GitHub

```bash
# 推送代码到 GitHub
git push -u origin main
```

第一次推送时，系统会要求你输入 GitHub 的用户名和密码（或 token）。

#### 🔐 关于身份验证

**GitHub 已经不再支持密码验证，需要使用 Personal Access Token（个人访问令牌）**

##### 创建 Personal Access Token：

1. 登录 GitHub
2. 点击右上角头像 → **Settings**（设置）
3. 左侧菜单最下方 → **Developer settings**（开发者设置）
4. 点击 **Personal access tokens** → **Tokens (classic)**
5. 点击 **Generate new token** → **Generate new token (classic)**
6. 填写信息：
   ```
   Note（备注）: Poker Assistant Deployment
   Expiration（过期时间）: 选择你想要的时间（建议 90 days）
   
   勾选权限：
   ☑ repo（完整的仓库访问权限）
   ```
7. 点击 **Generate token**
8. **⚠️ 立即复制这个 token 并保存**（刷新页面后就看不到了）

##### 使用 Token 推送：

当执行 `git push` 时：
- **Username**: 你的 GitHub 用户名
- **Password**: 粘贴你刚才复制的 token（不是你的 GitHub 密码）

### 步骤 4: 验证部署成功

推送成功后：
1. 回到你的 GitHub 仓库页面
2. 刷新页面
3. 你应该能看到所有的项目文件

---

## 🔄 后续更新代码

当你修改代码后想要更新到 GitHub：

```bash
# 1. 查看修改了哪些文件
git status

# 2. 添加修改的文件
git add .

# 3. 提交修改
git commit -m "描述你的修改内容"

# 4. 推送到 GitHub
git push
```

---

## ✅ 安全检查清单

在推送之前，确认：
- ✅ `.env` 文件已在 `.gitignore` 中（已确认）
- ✅ `.env` 没有被提交到 Git（已确认）
- ✅ API Key 是安全的（已确认）

---

## 🆘 常见问题

### Q1: 推送时提示 "remote: Repository not found"
**解决方案**：
- 检查仓库地址是否正确
- 确认你有该仓库的访问权限

### Q2: 推送被拒绝 "Updates were rejected"
**解决方案**：
```bash
# 先拉取远程代码
git pull origin main --rebase

# 再推送
git push origin main
```

### Q3: 忘记了 GitHub 用户名或密码
**解决方案**：
- 用户名：访问 [https://github.com/settings/profile](https://github.com/settings/profile) 查看
- 密码：使用 Personal Access Token，不是账号密码

### Q4: 想要修改仓库为私有/公开
**解决方案**：
- 进入仓库页面
- 点击 "Settings"
- 滚动到最下方 "Danger Zone"
- 点击 "Change repository visibility"

---

## 📝 建议的 .gitignore 补充

当前 `.gitignore` 已经配置好了，但如果需要补充：

```gitignore
# 已有的配置
.env
.env.local

# 如果使用 macOS
.DS_Store

# 如果使用 PyCharm
.idea/

# 如果使用 VSCode
.vscode/
```

---

## 🎯 下一步

部署成功后，你可以：

1. **添加 README 徽章**：让项目看起来更专业
2. **设置 GitHub Actions**：自动化测试（未来可选）
3. **邀请协作者**：如果需要团队协作
4. **创建 Release**：发布稳定版本

---

## 📞 需要帮助？

如果遇到问题：
1. 查看本文档的"常见问题"部分
2. 检查 GitHub 的帮助文档：[https://docs.github.com](https://docs.github.com)
3. 或者直接问我！

---

**祝你部署顺利！🎉**



