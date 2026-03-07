# OpenClaw 文件上传服务器

基于 Express.js 和阿里云 OSS 的文件上传服务，支持自动降级到 Base64 模式。

## 功能特性

- ✅ 支持 10MB 大文件上传（云存储模式）
- ✅ 自动降级到 Base64 模式（OSS 不可用时）
- ✅ 实时上传进度显示
- ✅ 文件类型白名单验证
- ✅ 文件大小限制
- ✅ 速率限制（防止滥用）
- ✅ 7 天自动过期（OSS 生命周期规则）
- ✅ CORS 支持
- ✅ 详细的日志记录

## 快速开始

### 1. 安装依赖

```bash
cd /root/openclaw-chat-widget
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 服务器配置
PORT=3001
FILE_SERVER_URL=http://localhost:3001

# 阿里云 OSS 配置（可选，不配置则使用降级模式）
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your_access_key_id
OSS_ACCESS_KEY_SECRET=your_access_key_secret
OSS_BUCKET=my-openclaw-files

# 文件上传限制
MAX_FILE_SIZE=10485760        # 10MB
UPLOAD_RATE_LIMIT=10          # 每分钟最多上传次数

# 文件生命周期
FILE_RETENTION_DAYS=7         # 7天后自动删除

# 安全配置
CORS_ORIGIN=*                 # 允许的来源
ENABLE_RATE_LIMIT=true        # 是否启用速率限制
```

### 3. 启动服务器

```bash
npm start
```

或指定端口：

```bash
PORT=3001 npm start
```

服务器将在指定端口启动，默认 3000。

### 4. 测试 API

**健康检查:**
```bash
curl http://localhost:3001/api/health
```

**文件上传:**
```bash
curl -X POST http://localhost:3001/api/upload \
  -F "file=@test.txt" \
  -F "userId=testuser" \
  -F "sessionKey=test-session"
```

## API 文档

### POST /api/upload

上传文件到 OSS。

**请求:**

- **Method:** `POST`
- **Content-Type:** `multipart/form-data`
- **Body:**
  - `file` (File, 必需): 要上传的文件
  - `userId` (String, 必需): 用户 ID
  - `sessionKey` (String, 必需): 会话标识

**成功响应 (200 OK):**

```json
{
  "success": true,
  "data": {
    "fileId": "uuid-v4",
    "userId": "user123",
    "fileName": "document.pdf",
    "fileSize": 1024000,
    "mimeType": "application/pdf",
    "fileUrl": "https://my-bucket.oss-cn-hangzhou.aliyuncs.com/uploads/user123/uuid-v4/document.pdf",
    "uploadDate": "2026-03-07T12:00:00.000Z",
    "expiresAt": "2026-03-14T12:00:00.000Z",
    "retentionDays": 7
  }
}
```

**降级响应 (200 OK):**

当 OSS 不可用时返回降级信号：

```json
{
  "success": false,
  "fallback": true,
  "error": {
    "code": "OSS_UNAVAILABLE",
    "message": "云存储服务暂时不可用，请使用 Base64 方式上传"
  }
}
```

**错误响应 (400 Bad Request):**

```json
{
  "success": false,
  "error": {
    "code": "FILE_TOO_LARGE",
    "message": "文件大小超过 10MB 限制"
  }
}
```

### GET /api/health

健康检查端点。

**响应:**

```json
{
  "success": true,
  "status": "ok",
  "oss": "enabled|disabled",
  "timestamp": "2026-03-07T12:00:00.000Z"
}
```

## 支持的文件类型

- PDF: `.pdf`
- Word: `.doc`, `.docx`
- Excel: `.xls`, `.xlsx`
- 文本: `.txt`, `.csv`, `.md`
- 图片: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`

## 安全特性

### 1. 文件类型验证
只允许白名单中的文件类型，阻止可执行文件上传。

### 2. 文件大小限制
- 云存储模式: 最大 10MB
- 降级模式: 最大 100KB

### 3. 速率限制
每分钟最多 10 次上传请求（可配置）。

### 4. 路径遍历防护
验证 userId 格式，防止 `../` 等路径遍历攻击。

### 5. OSS 安全
- 使用阿里云 OSS 官方 SDK
- 支持 HTTPS 访问
- 支持 Bucket 策略配置

## 降级机制

当 OSS 不可用时，服务器会自动返回降级信号：

```json
{
  "success": false,
  "fallback": true,
  "error": {
    "code": "OSS_UNAVAILABLE",
    "message": "..."
  }
}
```

客户端检测到此信号后，会自动切换到 Base64 模式（最大 100KB）。

## OSS 生命周期规则

### 自动删除过期文件

在阿里云 OSS 控制台配置生命周期规则：

1. 登录 [OSS 控制台](https://oss.console.aliyun.com/)
2. 选择对应的 Bucket
3. 点击"基础设置" → "生命周期"
4. 创建规则：
   - **规则名称:** `expire-after-7-days`
   - **前缀:** `uploads/`
   - **过期时间:** 7 天

### API 配置

在 `.env` 中设置保留天数：

```env
FILE_RETENTION_DAYS=7
```

## 生产环境部署

### 使用 PM2

```bash
# 安装 PM2
npm install -g pm2

# 启动服务
pm2 start server/index.js --name openclaw-upload-server

# 查看状态
pm2 status

# 查看日志
pm2 logs openclaw-upload-server

# 重启服务
pm2 restart openclaw-upload-server

# 停止服务
pm2 stop openclaw-upload-server
```

### 使用 Docker

```dockerfile
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

ENV PORT=3001
EXPOSE 3001

CMD ["npm", "start"]
```

构建和运行：

```bash
docker build -t openclaw-upload-server .
docker run -p 3001:3001 --env-file .env openclaw-upload-server
```

### Nginx 反向代理

```nginx
server {
    listen 80;
    server_name upload.yourdomain.com;

    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # 文件上传大小限制
        client_max_body_size 10M;
    }
}
```

## 监控和日志

### 日志格式

服务器使用统一的日志格式：

```
📝 METHOD /path
📥 详细信息
✅ 成功操作
⚠️ 警告信息
❌ 错误信息
```

### 日志级别

- INFO: 请求日志、操作成功
- WARN: 降级模式、配置警告
- ERROR: 上传失败、系统错误

### 推荐监控工具

- **PM2:** 进程管理和监控
- **Grafana + Prometheus:** 指标收集和可视化
- **ELK Stack:** 日志聚合和分析
- **Sentry:** 错误追踪

## 故障排查

### 问题 1: 服务器无法启动

**症状:** `Error: listen EADDRINUSE: address already in use`

**解决方案:**
```bash
# 查找占用端口的进程
lsof -i :3001

# 杀死进程
kill -9 <PID>

# 或使用其他端口
PORT=3002 npm start
```

### 问题 2: OSS 连接失败

**症状:** `OSS_UPLOAD_FAILED` 错误

**解决方案:**
1. 检查 `.env` 中的 OSS 凭证是否正确
2. 验证 Bucket 名称和区域是否匹配
3. 检查网络连接
4. 查看阿里云 OSS 控制台是否有异常

### 问题 3: 文件上传超时

**症状:** 大文件上传中断

**解决方案:**
1. 增加客户端超时时间
2. 检查网络带宽
3. 考虑使用分片上传

## 性能优化

### 1. 使用 CDN

为 OSS Bucket 配置 CDN 加速：

1. 在阿里云 CDN 控制台创建加速域名
2. 配置回源到 OSS Bucket
3. 使用 CDN 域名替代 OSS 域名

### 2. 启用 Gzip 压缩

在 `server/index.js` 中添加：

```javascript
const compression = require('compression');
app.use(compression());
```

### 3. 数据库缓存（可选）

对于频繁访问的文件元数据，可以使用 Redis 缓存。

## 许可证

MIT

## 贡献

欢迎提交 Issue 和 Pull Request！

## 联系方式

如有问题，请联系开发团队。
