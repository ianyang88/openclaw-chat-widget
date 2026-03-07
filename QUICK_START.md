# 文件上传服务 - 快速开始指南

## 📋 概述

本项目为 OpenClaw Chat Widget 添加了基于阿里云 OSS 的文件上传服务，支持：
- 10MB 大文件上传
- 实时进度显示
- 自动降级到 Base64（OSS 不可用时）
- 7 天自动过期

## 🚀 5 分钟快速开始

### 方案 1: 降级模式（无需 OSS 配置）

适合开发和测试环境，无需阿里云账号。

```bash
# 1. 安装依赖（已完成）
cd /root/openclaw-chat-widget
npm install

# 2. 启动服务器
PORT=3001 npm start &

# 3. 测试 API
curl http://localhost:3001/api/health

# 4. 测试文件上传（会返回降级信号）
echo "test" > /tmp/test.txt
curl -X POST http://localhost:3001/api/upload \
  -F "file=@/tmp/test.txt" \
  -F "userId=testuser" \
  -F "sessionKey=test"
```

**客户端配置:**
```javascript
new OpenClawChatWidget({
    fileServerUrl: 'http://localhost:3001',
    // ... 其他配置
});
```

### 方案 2: 云存储模式（需要阿里云 OSS）

适合生产环境，支持大文件上传。

#### 步骤 1: 创建阿里云 OSS Bucket

1. 登录 [阿里云 OSS 控制台](https://oss.console.aliyun.com/)
2. 创建 Bucket:
   - **Bucket 名称:** `my-openclaw-files`（自定义）
   - **地域:** 选择离用户最近的区域（如 `oss-cn-hangzhou`）
   - **读写权限:** 私有（通过临时 URL 访问）

#### 步骤 2: 获取访问密钥

1. 进入 [RAM 访问控制](https://ram.console.aliyun.com/manage/ak)
2. 创建 AccessKey:
   - **AccessKey ID:** 复制保存
   - **AccessKey Secret:** 复制保存（只显示一次！）

#### 步骤 3: 配置环境变量

```bash
# 复制配置模板
cp .env.example .env

# 编辑 .env 文件
nano .env
```

填写以下配置：

```env
# 阿里云 OSS 配置
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your_access_key_id
OSS_ACCESS_KEY_SECRET=your_access_key_secret
OSS_BUCKET=my-openclaw-files

# 文件上传限制
MAX_FILE_SIZE=10485760        # 10MB
FILE_RETENTION_DAYS=7         # 7天后自动删除
```

#### 步骤 4: 配置 CORS 规则

在 OSS 控制台配置 CORS：

1. 选择 Bucket → 数据安全 → 跨域设置
2. 添加规则：
   - **来源:** `*`（或指定域名）
   - **允许 Methods:** `GET`, `POST`, `PUT`, `DELETE`, `HEAD`
   - **允许 Headers:** `*`
   - **暴露 Headers:** `ETag`, `x-oss-request-id`
   - **缓存时间:** 600

#### 步骤 5: 配置生命周期规则

1. 选择 Bucket → 基础设置 → 生命周期
2. 创建规则：
   - **规则名称:** `expire-after-7-days`
   - **前缀:** `uploads/`
   - **过期时间:** 7 天

#### 步骤 6: 启动服务器

```bash
PORT=3001 npm start
```

测试上传：

```bash
curl -X POST http://localhost:3001/api/upload \
  -F "file=@/tmp/test.txt" \
  -F "userId=testuser" \
  -F "sessionKey=test"
```

**成功响应:**
```json
{
  "success": true,
  "data": {
    "fileId": "uuid",
    "fileName": "test.txt",
    "fileUrl": "https://my-bucket.oss-cn-hangzhou.aliyuncs.com/...",
    ...
  }
}
```

## 📱 客户端集成

### 配置文件服务器地址

在 `simple-integration.html` 中配置：

```javascript
chatWidget = new OpenClawChatWidget({
    container: '#chat-widget',
    gatewayUrl: 'ws://8.148.244.33:18789',
    token: gatewayToken,
    sessionKey: sessionKey,
    fileServerUrl: 'http://localhost:3001',  // ⬅️ 添加此配置
    auth: { type: 'none' },
    session: {
        persist: false,
        autoRestore: false
    }
});
```

### 测试完整流程

1. 打开浏览器访问 `simple-integration.html?id=testuser`
2. 点击附件按钮 📎
3. 选择文件（< 10MB）
4. 查看上传进度条
5. 发送消息
6. 验证 AI 能访问文件

## 🔍 验证部署

### 检查清单

- [ ] 服务器正常启动
- [ ] 健康检查端点返回 200
- [ ] 文件上传接口正常工作
- [ ] 降级模式返回正确的降级信号
- [ ] 云存储模式返回文件 URL
- [ ] 客户端能成功上传文件
- [ ] 上传进度条正常显示
- [ ] 日志输出正常

### 健康检查

```bash
# 检查服务器状态
curl http://localhost:3001/api/health

# 预期响应
{
  "success": true,
  "status": "ok",
  "oss": "disabled",  // 或 "enabled"
  "timestamp": "..."
}
```

## ⚙️ 生产环境配置

### 使用 PM2

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start server/index.js --name openclaw-upload-server

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status
```

### 使用 Nginx 反向代理

```nginx
server {
    listen 80;
    server_name upload.yourdomain.com;

    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 10M;
    }
}
```

### 环境变量管理

生产环境使用 `.env` 文件（不提交到 Git）：

```bash
# .gitignore 中已包含
.env
```

## 🐛 常见问题

### Q1: 端口被占用怎么办？

```bash
# 查找占用进程
lsof -i :3001

# 使用其他端口
PORT=3002 npm start
```

### Q2: 如何切换回降级模式？

删除或重命名 `.env` 文件：

```bash
mv .env .env.bak
npm start
```

### Q3: 如何查看上传的文件？

**降级模式:** 文件以 Base64 形式直接发送给 OpenClaw Gateway

**云存储模式:** 登录阿里云 OSS 控制台查看 Bucket 中的文件

### Q4: 7 天后文件会自动删除吗？

是的，OSS 生命周期规则会自动删除过期文件。

### Q5: 如何修改文件保留时间？

在 `.env` 中修改：

```env
FILE_RETENTION_DAYS=30  # 30 天
```

同时在 OSS 控制台更新生命周期规则。

## 📊 性能参考

| 文件大小 | 上传时间（云存储） | 上传时间（降级） |
|---------|-------------------|------------------|
| 1 MB    | < 1 秒            | < 2 秒           |
| 5 MB    | < 3 秒            | 不支持           |
| 10 MB   | < 5 秒            | 不支持           |

## 🔗 相关文档

- [完整 API 文档](./server/README.md)
- [实施状态](./IMPLEMENTATION_STATUS.md)
- [测试结果](./TESTING_RESULTS.md)

## 💡 下一步

1. ✅ 基础功能已实现
2. ⏳ 配置阿里云 OSS（可选）
3. ⏳ 测试完整流程
4. ⏳ 部署到生产环境
5. ⏳ 配置监控和告警

---

**需要帮助？** 查看完整文档或提交 Issue。
