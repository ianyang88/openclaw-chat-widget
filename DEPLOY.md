# 📝 部署说明

## ⚠️ 重要提醒

**.env 文件不能提交到 Git**（包含 OSS 敏感凭证），但服务器需要这个文件才能运行。

---

## 🚀 快速部署（3 步）

### 1️⃣ 在服务器上拉取代码

```bash
cd /root/openclaw-chat-widget
git pull origin master
npm install
```

### 2️⃣ 运行部署脚本

```bash
./deploy.sh
```

脚本会自动：
- ✅ 检查 `.env` 是否存在
- ✅ 如果不存在，从 `.env.example` 创建
- ✅ 提示您填写 OSS 配置

### 3️⃣ 编辑 .env 文件

```bash
nano .env
```

填写以下信息：
```env
OSS_ACCESS_KEY_ID=your_access_key_id
OSS_ACCESS_KEY_SECRET=your_access_key_secret
OSS_BUCKET=bot-openclaw-chat
OSS_REGION=oss-cn-guangzhou
```

保存：`Ctrl+X` → `Y` → `Enter`

### 4️⃣ 启动服务器

```bash
# 使用 PM2（推荐）
pm2 start server/index.js --name openclaw-upload-server

# 或直接启动
npm start
```

---

## 📖 详细部署指南

查看完整文档：[DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 🔒 安全说明

- ✅ `.env` 文件已在 `.gitignore` 中
- ✅ 不会提交到 Git
- ✅ 只在服务器上存在
- ✅ 通过部署脚本创建

---

## 💡 服务器重启后

如果服务器重启，PM2 会自动恢复服务：

```bash
# 查看状态
pm2 status

# 查看日志
pm2 logs openclaw-upload-server
```

---

**现在您可以在服务器上安全地使用 .env 文件了！** 🎉
