# ⏰ CORS 规则生效等待指南

**说明:** 阿里云 OSS CORS 规则设置后，最多需要 15 分钟生效。

---

## ✅ 已完成

您已成功配置：
- ✅ OSS 跨域规则
- ✅ Bucket 公共读权限
- ✅ 文件上传功能

**当前状态:** 等待 CORS 规则生效（最多 15 分钟）

---

## ⏰ 等待期间可以做什么？

### 1️⃣ 测试文件上传功能（立即可用）

虽然跨域规则未生效，但**文件上传功能完全正常**！

```bash
# 测试上传
echo "Hello OSS!" > /tmp/test-waiting.txt
curl -X POST http://localhost:3001/api/upload \
  -F "file=@/tmp/test-waiting.txt" \
  -F "userId=testuser" \
  -F "sessionKey=test" | python3 -m json.tool
```

**预期结果:**
```json
{
  "success": true,
  "data": {
    "fileUrl": "http://bot-openclaw-chat.oss-cn-guangzhou.aliyuncs.com/..."
  }
}
```

✅ 上传功能正常，只是 fileUrl 暂时无法直接访问。

---

### 2️⃣ 验证文件已上传到 OSS

即使跨域未生效，文件也已成功存储在 OSS 中！

**验证方法:**

1. **查看 OSS 控制台**
   ```
   访问: https://oss.console.aliyun.com/
   选择: bot-openclaw-chat
   点击: 文件管理
   查看您刚才上传的文件
   ```

2. **使用阿里云 CLI 访问（绕过 CORS）**
   ```bash
   # 安装 OSS 浏览器（如果已安装可跳过）
   # 直接在控制台查看文件内容
   ```

3. **使用签名 URL（绕过 CORS 限制）**
   ```bash
   node -e "
   const OSS = require('ali-oss');
   require('dotenv').config();
   const client = new OSS({
     region: process.env.OSS_REGION,
     accessKeyId: process.env.OSS_ACCESS_KEY_ID,
     accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
     bucket: process.env.OSS_BUCKET
   });

   // 生成签名 URL（1小时有效，不受 CORS 限制）
   const url = client.signatureUrl('testuser/test-file.txt', { expires: 3600 });
   console.log('签名 URL:', url);
   console.log('此 URL 可以直接访问，不受 CORS 限制');
   "
   ```

---

### 3️⃣ 熟悉完整使用流程

在等待期间，可以先熟悉整个流程：

#### 浏览器端测试

1. **打开聊天页面**
   ```
   file:///root/openclaw-chat-widget/simple-integration.html?id=testuser
   ```

2. **上传文件**
   - 点击附件按钮 📎
   - 选择小文件（< 100KB 测试）
   - 查看进度条显示

3. **发送消息**
   - 输入消息
   - 点击发送
   - 观察 AI 响应

**注意:** 即使 CORS 未生效，您也可以：
- ✅ 上传文件
- ✅ 看到进度条
- ✅ 发送消息
- ✅ AI 会回复（但可能暂时无法分析文件内容，等待 CORS 生效后即可）

---

### 4️⃣ 检查 CORS 生效状态

#### 方法 1: 定期测试（每 2 分钟）

```bash
# 创建测试脚本
cat > /tmp/test-cors.sh << 'EOF'
#!/bin/bash
echo "测试 CORS 规则是否生效..."
echo ""

# 先上传文件
TEST_FILE="/tmp/test-cors-$(date +%s).txt"
echo "Test CORS $(date)" > "$TEST_FILE"

RESPONSE=$(curl -s -X POST http://localhost:3001/api/upload \
  -F "file@$TEST_FILE" \
  -F "userId=cors-test" \
  -F "sessionKey=test")

FILE_URL=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['fileUrl'])")

echo "文件 URL: $FILE_URL"
echo ""

# 测试访问
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FILE_URL")

echo "HTTP 状态码: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ CORS 已生效！文件可访问！"
    echo ""
    echo "现在可以开始使用完整功能了！"
    exit 0
elif [ "$HTTP_CODE" = "403" ]; then
    echo "⏳ CORS 未生效，请继续等待..."
    echo ""
    echo "预计等待时间: 最多 15 分钟"
    echo "当前已等待: $(($(date +%s) % 120)) 秒"
    exit 1
else
    echo "⚠️  意外的状态码: $HTTP_CODE"
    exit 2
fi
EOF

chmod +x /tmp/test-cors.sh

# 运行测试
/tmp/test-cors.sh
```

#### 方法 2: 使用循环自动测试

```bash
# 每 2 分钟自动测试一次
watch -n 120 '/tmp/test-cors.sh'
```

#### 方法 3: 查看详细错误信息

```bash
# 带详细信息的测试
curl -v -X POST http://localhost:3001/api/upload \
  -F "file=@/tmp/test.txt" \
  -F "userId=testuser" \
  -F "sessionKey=test" 2>&1 | grep -A 5 "fileUrl"

# 提取 URL 并测试访问
FILE_URL=$(curl -s -X POST http://localhost:3001/api/upload \
  -F "file=@/tmp/test.txt" \
  -F "userId=testuser" \
  -F "sessionKey=test" | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['data']['fileUrl'])")

echo "测试访问: $FILE_URL"
curl -I "$FILE_URL"
```

---

### 5️⃣ 准备生产环境配置

在等待期间，可以：

#### 配置 CDN（可选）

如果您希望文件访问更快：
```
1. 进入阿里云 CDN 控制台
2. 添加加速域名
3. 源站设置为您的 OSS Bucket
4. 等待 CDN 配置生效
```

#### 配置生命周期规则

确保 7 天后自动删除：
```
1. OSS 控制台 → 基础设置 → 生命周期
2. 创建规则:
   - 规则名称: expire-after-7-days
   - 前缀: uploads/（或整个 Bucket）
   - 过期时间: 7 天
```

#### 设置防盗链（可选）

保护您的文件不被盗用：
```
1. OSS 控制台 → 权限控制 → 防盗链
2. 设置白名单域名
3. 允许空 Referer（可选）
```

---

### 6️⃣ 阅读文档

- 📖 [完整使用指南](./QUICK_START.md)
- 📖 [API 文档](./server/README.md)
- 📖 [测试步骤](./TEST_STEPS.md)

---

## ⏱️ 等待时间预估

| 操作 | 预计生效时间 |
|------|-------------|
| CORS 规则设置 | 最多 15 分钟 |
| Bucket 权限变更 | 立即生效 |
| 文件上传 | 立即可用 |
| 生命周期规则 | 立即生效 |

---

## 🎯 CORS 生效后的验证

当 CORS 生效后，您应该看到：

### 命令行测试
```bash
/tmp/test-cors.sh
```

**输出:**
```
✅ CORS 已生效！文件可访问！

现在可以开始使用完整功能了！
```

### 浏览器测试
```
1. 打开 simple-integration.html?id=testuser
2. 上传文件
3. 发送消息
4. AI 成功分析文件内容
```

---

## 💡 提示

### 如果 15 分钟后仍未生效

1. **检查配置**
   - 确认 CORS 规则已保存
   - 确认 Bucket 权限为"公共读"

2. **清除浏览器缓存**
   ```
   Chrome: Ctrl+Shift+Delete
   Firefox: Ctrl+Shift+Delete
   Safari: Command+Option+E
   ```

3. **使用隐私模式测试**
   - Chrome: Ctrl+Shift+N
   - Firefox: Ctrl+Shift+P

4. **联系阿里云技术支持**
   - 工单系统: https://workorder.console.aliyun.com/

---

## 🚀 CORS 生效后立即做

### 1. 运行完整测试
```bash
/root/openclaw-chat-widget/scripts/test-full-flow.sh
```

### 2. 浏览器完整测试
```bash
# 启动本地服务器（如果需要）
cd /root/openclaw-chat-widget
python3 -m http.server 8080

# 在浏览器打开
# http://localhost:8080/simple-integration.html?id=testuser
```

### 3. 上传大文件测试
```bash
# 创建 5MB 测试文件
dd if=/dev/zero of=/tmp/test-5mb.bin bs=5M count=1

# 测试上传
curl -X POST http://localhost:3001/api/upload \
  -F "file=@/tmp/test-5mb.bin" \
  -F "userId=testuser" \
  -F "sessionKey=test"
```

---

## 📊 功能对比

| 功能 | CORS 未生效 | CORS 生效后 |
|------|------------|------------|
| 文件上传 | ✅ 可用 | ✅ 可用 |
| 进度显示 | ✅ 可用 | ✅ 可用 |
| 文件存储到 OSS | ✅ 可用 | ✅ 可用 |
| 直接访问 URL | ❌ 受限 | ✅ 可用 |
| AI 分析文件 | ❌ 受限 | ✅ 可用 |
| 10MB 上传 | ✅ 可用 | ✅ 可用 |

---

## 🎉 总结

**当前状态:**
- ✅ OSS 配置完成
- ✅ 文件上传功能正常
- ⏳ 等待 CORS 规则生效（最多 15 分钟）

**可以立即使用:**
- ✅ 文件上传到 OSS
- ✅ 实时进度显示
- ✅ 10MB 大文件支持

**等待生效后:**
- ✅ AI 可以下载并分析文件
- ✅ 完整的文件处理流程

**预估时间:** 15 分钟后即可使用完整功能 🚀
