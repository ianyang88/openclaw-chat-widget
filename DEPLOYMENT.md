# 🚀 服务器部署指南

## 问题说明

**问题:** `.env` 文件包含敏感的 OSS 凭证，不能提交到 Git，但服务器需要这个文件才能正常运行。

**解决方案:** 使用部署脚本在服务器上自动创建和配置 `.env` 文件。

---

## 📋 部署步骤

### 方式 1: 自动部署（推荐）

#### 1️⃣ 克隆或拉取代码

```bash
# 如果是首次部署
git clone https://github.com/ianyang88/openclaw-chat-widget.git
cd openclaw-chat-widget

# 如果是更新代码
git pull origin master
```

#### 2️⃣ 运行部署脚本

```bash
./deploy.sh
```

**脚本会:**
- ✅ 检查 `.env` 文件是否存在
- ✅ 如果不存在，从 `.env.example` 创建
- ✅ 提示您填写 OSS 配置
- ✅ 验证配置是否完整

#### 3️⃣ 填写 OSS 配置

根据脚本提示，编辑 `.env` 文件：

```bash
nano .env
```

填写以下信息：
```env
OSS_ACCESS_KEY_ID=LTAI5tGq6Ab4BijBXgCLfYj5
OSS_ACCESS_KEY_SECRET=uXRrRFLByQaDGKaPCuCQWdpN6YvI77
OSS_BUCKET=bot-openclaw-chat
OSS_REGION=oss-cn-guangzhou
```

保存并退出：`Ctrl+X` → `Y` → `Enter`

#### 4️⃣ 再次运行部署脚本验证

```bash
./deploy.sh
```

如果配置正确，会显示：
```
✅ 所有配置项已填写
🎉 配置完成！可以启动服务器了
```

#### 5️⃣ 启动服务器

**开发模式:**
```bash
npm start
```

**生产模式（推荐使用 PM2）:**
```bash
# 安装 PM2（如果未安装）
npm install -g pm2

# 启动服务器
pm2 start server/index.js --name openclaw-upload-server

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status

# 查看日志
pm2 logs openclaw-upload-server
```

---

### 方式 2: 手动配置

#### 1️⃣ 复制配置模板

```bash
cp .env.example .env
```

#### 2️⃣ 编辑配置

```bash
nano .env
```

#### 3️⃣ 填写配置信息

```env
# 服务器配置
PORT=3001
FILE_SERVER_URL=http://8.148.244.33:3001

# OSS 配置（必需）
OSS_REGION=oss-cn-guangzhou
OSS_ACCESS_KEY_ID=你的AccessKey_ID
OSS_ACCESS_KEY_SECRET=你的AccessKey_Secret
OSS_BUCKET=你的Bucket名称

# 其他配置（使用默认值即可）
MAX_FILE_SIZE=10485760
UPLOAD_RATE_LIMIT=10
FILE_RETENTION_DAYS=7
CORS_ORIGIN=*
ENABLE_RATE_LIMIT=true
```

#### 4️⃣ 保存并启动

```bash
npm start
```

---

### 方式 3: 使用环境变量（不创建文件）

如果您不想创建 `.env` 文件，可以直接设置环境变量：

#### 临时启动
```bash
export OSS_REGION=oss-cn-guangzhou
export OSS_ACCESS_KEY_ID=你的ID
export OSS_ACCESS_KEY_SECRET=你的Secret
export OSS_BUCKET=你的Bucket

npm start
```

#### PM2 配置文件
创建 `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [{
    name: 'openclaw-upload-server',
    script: './server/index.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      OSS_REGION: 'oss-cn-guangzhou',
      OSS_ACCESS_KEY_ID: '你的ID',
      OSS_ACCESS_KEY_SECRET: '你的Secret',
      OSS_BUCKET: '你的Bucket'
    }
  }]
};
```

启动：
```bash
pm2 start ecosystem.config.js
```

---

## 🔒 安全最佳实践

### 1. .env 文件权限

确保只有您能读取 `.env` 文件：

```bash
chmod 600 .env
```

### 2. 使用 PM2 密钥管理

PM2 可以加密环境变量：

```bash
# 加密环境变量
pm2 encrypt .env

# 启动时会自动解密
pm2 start server/index.js --name openclaw-upload-server
```

### 3. 使用阿里云 KMS（高级）

对于生产环境，建议使用密钥管理服务（KMS）。

---

## 🔄 更新部署

### 当您拉取新代码后

```bash
# 1. 拉取最新代码
git pull origin master

# 2. 安装新依赖（如果有）
npm install

# 3. 重启服务器
pm2 restart openclaw-upload-server

# 或者如果不是 PM2
pkill -f "server/index.js"
npm start &
```

### 如果需要更新配置

```bash
# 1. 编辑 .env
nano .env

# 2. 重启服务器
pm2 restart openclaw-upload-server
```

---

## 🚨 故障排查

### 问题 1: .env 文件丢失

**症状:** 服务器启动但 OSS 未启用

**解决:**
```bash
# 重新运行部署脚本
./deploy.sh

# 或手动创建
cp .env.example .env
nano .env  # 填写配置
```

### 问题 2: 配置未生效

**症状:** 修改 .env 后重启服务器，配置未更新

**原因:** PM2 可能缓存了环境变量

**解决:**
```bash
# 完全重启 PM2
pm2 delete openclaw-upload-server
pm2 start server/index.js --name openclaw-upload-server
```

### 问题 3: 权限错误

**症状:** `EACCES: permission denied`

**解决:**
```bash
# 检查文件权限
ls -la .env

# 修正权限
chmod 600 .env

# 确保文件所有者是正确的用户
sudo chown $USER:$USER .env
```

---

## 📊 部署检查清单

使用此清单确保部署成功：

### 初次部署
- [ ] 代码已克隆/拉取
- [ ] `npm install` 已执行
- [ ] `.env` 文件已创建
- [ ] OSS 凭证已填写
- [ ] 部署脚本运行成功
- [ ] 服务器成功启动
- [ ] 健康检查返回 200
- [ ] 测试文件上传成功

### 更新部署
- [ ] `git pull` 成功
- [ ] 新依赖已安装（如需要）
- [ ] `.env` 文件仍存在
- [ ] 服务器已重启
- [ ] 功能测试通过

---

## 💡 提示

### 备份配置

建议定期备份 `.env` 文件到安全的地方：

```bash
# 备份到加密文件
tar -czf env-backup-$(date +%Y%m%d).tar.gz .env
gpg -c env-backup-$(date +%Y%m%d).tar.gz > env-backup-$(date +%Y%m%d).tar.gz.gpg
```

### 使用多个环境

您可以为开发、测试、生产环境创建不同的配置：

```bash
# 开发环境
cp .env .env.development

# 生产环境
cp .env .env.production
```

启动时指定：
```bash
NODE_ENV=production node -r dotenv/config dotenv_config_path=.env.production server/index.js
```

---

## 📞 需要帮助？

如果遇到部署问题：
1. 查看日志: `pm2 logs openclaw-upload-server`
2. 检查配置: `cat .env`
3. 运行测试: `node scripts/verify-oss.js`

---

**现在您可以在服务器上安全地使用 `.env` 文件了！** 🎉
