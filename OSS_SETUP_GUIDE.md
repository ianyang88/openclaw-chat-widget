# 阿里云 OSS 配置指南

## 📋 配置步骤概览

1. ✅ 创建阿里云账号
2. ⏳ 开通 OSS 服务
3. ⏳ 创建 Bucket
4. ⏳ 获取访问密钥（AccessKey）
5. ⏳ 配置 CORS 规则
6. ⏳ 配置生命周期规则
7. ⏳ 更新 .env 文件
8. ⏳ 测试连接

---

## 步骤 1: 创建阿里云账号

如果您还没有阿里云账号：

1. 访问 [阿里云官网](https://www.aliyun.com/)
2. 点击"免费注册"
3. 完成实名认证（需要身份证或企业认证）

**💡 提示:** 实名认证可能需要 1-2 个工作日

---

## 步骤 2: 开通 OSS 服务

1. 登录 [阿里云控制台](https://account.aliyun.com/)
2. 搜索"对象存储 OSS"或访问 [OSS 控制台](https://oss.console.aliyun.com/)
3. 点击"立即开通"
4. 选择"按量付费"（推荐）或"包年包月"
5. 同意服务协议并开通

**💡 费用说明:**
- 按量付费：0.12元/GB/月（存储）
- 流量费用：0.5元/GB（下行流量）
- 新用户通常有免费额度

---

## 步骤 3: 创建 Bucket

### 3.1 进入 OSS 控制台

访问: [https://oss.console.aliyun.com/](https://oss.console.aliyun.com/)

### 3.2 创建 Bucket

点击"创建 Bucket"按钮，填写以下信息：

| 配置项 | 推荐值 | 说明 |
|--------|--------|------|
| **Bucket 名称** | `openclaw-files-<yourname>` | 全球唯一，只能包含小写字母、数字、短横线 |
| **地域** | `oss-cn-hangzhou` | 选择离用户最近的区域 |
| **存储类型** | 标准存储 | 适合频繁访问 |
| **读写权限** | 私有 | 通过签名 URL 访问，更安全 |

**示例配置:**
```
Bucket 名称: openclaw-files-myapp
地域: 华东1（杭州）
存储类型: 标准存储
读写权限: 私有
```

### 3.3 记录 Bucket 信息

创建成功后，记录以下信息：
- ✅ Bucket 名称: `openclaw-files-myapp`
- ✅ 地域: `oss-cn-hangzhou`
- ✅ Endpoint: `oss-cn-hangzhou.aliyuncs.com`

---

## 步骤 4: 获取访问密钥（AccessKey）

### 4.1 创建 RAM 用户

**⚠️ 重要:** 不要使用主账号 AccessKey！建议创建 RAM 子账号。

1. 访问 [RAM 控制台](https://ram.console.aliyun.com/)
2. 点击"人员" → "用户"
3. 点击"创建用户"
4. 填写用户信息：
   ```
   用户名: openclaw-upload-service
   访问方式: ✅ 编程访问
   ```
5. 点击"确定"创建

### 4.2 添加权限

1. 在用户列表中，找到刚创建的用户
2. 点击"添加权限"
3. 搜索并添加以下权限：
   - `AliyunOSSFullAccess` （OSS 完整权限）
   - 或使用最小权限策略（推荐）

**最小权限策略示例:**
```json
{
  "Version": "1",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "oss:PutObject",
        "oss:GetObject"
      ],
      "Resource": [
        "acs:oss:*:*:openclaw-files-myapp/*"
      ]
    }
  ]
}
```

### 4.3 创建 AccessKey

1. 在用户详情页面，点击"创建 AccessKey"
2. 验证手机号
3. **重要:** 立即保存以下信息（只显示一次！）

```
AccessKey ID: LTAI5t7xxxxxxxxxxxxxx
AccessKey Secret: xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### 4.4 安全提示

- ✅ 将 AccessKey Secret 保存到安全的地方
- ✅ 定期轮换 AccessKey
- ✅ 限制 IP 访问（可选）
- ✅ 启用 MFA（多因素认证）

---

## 步骤 5: 配置 CORS 规则

### 5.1 为什么需要配置 CORS？

由于浏览器安全策略，您的网页域名与 OSS 域名不同时，需要配置 CORS。

### 5.2 配置步骤

1. 在 [OSS 控制台](https://oss.console.aliyun.com/)，选择您的 Bucket
2. 点击"数据安全" → "跨域设置（CORS）"
3. 点击"设置"
4. 点击"创建规则"

**规则配置:**

| 配置项 | 值 | 说明 |
|--------|-----|------|
| **来源** | `*` | 允许所有域名（生产环境建议指定域名） |
| **允许 Methods** | `GET, POST, PUT, DELETE, HEAD` | 允许的 HTTP 方法 |
| **允许 Headers** | `*` | 允许的请求头 |
| **暴露 Headers** | `ETag, x-oss-request-id` | 暴露给客户端的响应头 |
| **缓存时间（秒）** | `600` | 预检请求的缓存时间 |

**点击"确定"保存。**

---

## 步骤 6: 配置生命周期规则

自动删除过期文件，节省存储成本。

### 6.1 配置步骤

1. 在 Bucket 详情页，点击"基础设置" → "生命周期"
2. 点击"配置"
3. 点击"创建规则"

**规则配置:**

| 配置项 | 值 | 说明 |
|--------|-----|------|
| **规则名称** | `expire-after-7-days` | 规则名称 |
| **应用范围** | `整个 Bucket` 或 `指定前缀` | 建议指定 `uploads/` 前缀 |
| **过期策略** | ✅ 按天数过期 | |
| **过期天数** | `7` | 7天后自动删除 |

**点击"确定"保存。**

---

## 步骤 7: 更新 .env 文件

现在将您获取的信息填入 `.env` 文件。

### 7.1 编辑 .env 文件

```bash
cd /root/openclaw-chat-widget
nano .env
```

### 7.2 填写 OSS 配置

```env
# 阿里云 OSS 配置
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=LTAI5t7xxxxxxxxxxxxxx        # 您的 AccessKey ID
OSS_ACCESS_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxx  # 您的 AccessKey Secret
OSS_BUCKET=openclaw-files-myapp                  # 您的 Bucket 名称
```

### 7.3 保存并退出

按 `Ctrl+X`，然后按 `Y`，再按 `Enter` 保存。

---

## 步骤 8: 测试 OSS 连接

### 8.1 重启服务器

```bash
# 停止当前服务器
pkill -f "node server/index.js"

# 启动新服务器（会自动加载 .env）
cd /root/openclaw-chat-widget
PORT=3001 npm start &
```

### 8.2 检查服务器日志

```bash
tail -f /tmp/claude-0/-root/tasks/*/output
```

**预期输出:**
```
✅ OSS 配置验证成功
```

如果看到错误：
```
❌ OSS 配置验证失败
```

请检查：
- AccessKey ID 和 Secret 是否正确
- Bucket 名称是否正确
- Region 是否匹配
- 网络连接是否正常

### 8.3 测试文件上传

```bash
# 创建测试文件
echo "Hello OSS!" > /tmp/test-oss.txt

# 上传文件
curl -X POST http://localhost:3001/api/upload \
  -F "file=@/tmp/test-oss.txt" \
  -F "userId=testuser" \
  -F "sessionKey=test-session"
```

**预期响应（成功）:**
```json
{
  "success": true,
  "data": {
    "fileId": "uuid-v4",
    "fileName": "test-oss.txt",
    "fileSize": 10,
    "mimeType": "text/plain",
    "fileUrl": "https://openclaw-files-myapp.oss-cn-hangzhou.aliyuncs.com/testuser/uuid-v4/test-oss.txt",
    "uploadDate": "2026-03-07T...",
    "expiresAt": "2026-03-14T...",
    "retentionDays": 7
  }
}
```

### 8.4 验证文件上传到 OSS

1. 登录 [OSS 控制台](https://oss.console.aliyun.com/)
2. 选择您的 Bucket
3. 点击"文件管理"
4. 查看上传的文件

**预期结果:** 能看到 `testuser/uuid-v4/test-oss.txt` 文件

---

## 🔍 故障排查

### 问题 1: OSS 配置验证失败

**错误信息:** `❌ OSS 配置验证失败`

**可能原因:**
1. AccessKey ID 或 Secret 错误
2. Bucket 名称不存在
3. Region 不匹配
4. 网络问题

**解决方案:**
```bash
# 检查 .env 文件内容
cat /root/openclaw-chat-widget/.env

# 测试 OSS 连接（手动测试）
node -e "
const OSS = require('ali-oss');
const client = new OSS({
  region: 'oss-cn-hangzhou',
  accessKeyId: 'YOUR_ID',
  accessKeySecret: 'YOUR_SECRET',
  bucket: 'YOUR_BUCKET'
});
client.getBucketInfo().then(console.log).catch(console.error);
"
```

### 问题 2: CORS 错误

**错误信息:** `Access-Control-Allow-Origin`

**解决方案:**
1. 检查 OSS CORS 规则是否配置
2. 确认来源设置为 `*` 或您的域名
3. 清除浏览器缓存

### 问题 3: 上传超时

**可能原因:**
- 网络带宽不足
- 文件过大
- OSS 服务响应慢

**解决方案:**
1. 增加客户端超时时间
2. 使用 CDN 加速
3. 检查服务器带宽

---

## 📊 配置检查清单

使用以下清单确保配置完整：

### 阿里云配置
- [ ] 阿里云账号已创建并实名认证
- [ ] OSS 服务已开通
- [ ] Bucket 已创建
- [ ] RAM 用户已创建
- [ ] AccessKey 已生成并保存
- [ ] RAM 权限已配置
- [ ] CORS 规则已设置
- [ ] 生命周期规则已配置

### 服务器配置
- [ ] `.env` 文件已创建
- [ ] OSS 凭证已填写
- [ ] Bucket 名称已填写
- [ ] Region 已填写
- [ ] 服务器已重启

### 测试验证
- [ ] 服务器启动无错误
- [ ] OSS 配置验证成功
- [ ] 健康检查显示 `oss: "enabled"`
- [ ] 文件上传成功
- [ ] 文件可在 OSS 控制台看到
- [ ] 文件 URL 可访问

---

## 🎯 配置完成后

### 1. 更新客户端配置

在 `simple-integration.html` 中确认配置：

```javascript
fileServerUrl: 'http://localhost:3001',
```

### 2. 测试完整流程

1. 打开 `simple-integration.html?id=testuser`
2. 上传文件（最大 10MB！）
3. 查看进度条
4. 发送消息
5. 验证 AI 能访问文件

### 3. 监控和日志

- 查看 OSS 控制台的监控图表
- 配置告警（可选）
- 定期检查日志

---

## 💡 最佳实践

### 安全建议
- ✅ 使用 RAM 子账号，不要使用主账号
- ✅ 定期轮换 AccessKey
- ✅ 限制 Bucket 访问权限
- ✅ 启用日志记录
- ✅ 配置防盗链（Referer 白名单）

### 性能优化
- ✅ 使用 CDN 加速文件访问
- ✅ 启用图片处理服务
- ✅ 配置合适的缓存策略
- ✅ 使用生命周期规则清理过期文件

### 成本控制
- ✅ 定期清理不需要的文件
- ✅ 使用生命周期规则自动删除
- ✅ 选择合适的存储类型
- ✅ 监控存储使用量

---

## 📞 需要帮助？

如果遇到问题：

1. **查看日志:** `tail -f /tmp/claude-0/-root/tasks/*/output`
2. **检查配置:** `cat /root/openclaw-chat-widget/.env`
3. **测试连接:** 使用上面的测试代码
4. **阿里云文档:** [OSS 文档](https://help.aliyun.com/product/31815.html)

---

**配置成功后，您就可以使用 10MB 大文件上传了！** 🎉
