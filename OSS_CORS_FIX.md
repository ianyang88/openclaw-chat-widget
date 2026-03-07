# ⚠️ 重要：需要配置 OSS CORS 规则

您的文件已成功上传到 OSS，但需要配置 CORS 才能让 OpenClaw Gateway 访问。

## 🚀 快速修复（1 分钟）

### 步骤 1: 打开 OSS 控制台

访问: https://oss.console.aliyun.com/

### 步骤 2: 选择您的 Bucket

点击: `bot-openclaw-chat`

### 步骤 3: 配置 CORS 规则

1. 点击左侧菜单：**数据安全** → **跨域设置（CORS）**
2. 点击：**创建规则**
3. 填写以下内容：

| 配置项 | 值 |
|--------|-----|
| **来源** | `*` |
| **允许 Methods** | `GET, POST, PUT, DELETE, HEAD` |
| **允许 Headers** | `*` |
| **暴露 Headers** | `ETag, x-oss-request-id` |
| **缓存时间（秒）** | `600` |

4. 点击：**确定**

### 步骤 4: 配置读写权限（可选，推荐）

如果希望文件可以直接通过 URL 访问：

1. 点击：**权限控制** → **读写权限**
2. 点击：**设置**
3. 选择：**公共读**（Bucket 中的文件可以被公开访问，但只有您能上传）
4. 点击：**确定**

**⚠️ 注意:** 公共读意味着任何人都可以通过 URL 访问文件，但只有您能上传。这对于大多数应用是安全的。

### 步骤 5: 验证配置

配置完成后，重新测试：

```bash
# 测试上传
curl -X POST http://localhost:3001/api/upload \
  -F "file=@/tmp/test.txt" \
  -F "userId=testuser" \
  -F "sessionKey=test"
```

返回的 fileUrl 应该可以直接访问了。

---

## 🎯 推荐配置

### 方案 A: 私有 Bucket + CORS（推荐）

**优点:** 更安全，只有授权用户能访问文件
**适用:** 敏感文件、企业应用

**配置:**
- 读写权限: 私有
- CORS: 按上述配置
- 访问方式: 使用签名 URL（SDK 自动生成）

### 方案 B: 公共读 Bucket + CORS（简单）

**优点:** 文件可以直接通过 URL 访问，简单方便
**适用:** 公开内容、临时文件

**配置:**
- 读写权限: 公共读
- CORS: 按上述配置
- 访问方式: 直接使用 fileUrl

---

## ✅ 配置完成后

您的系统将支持：
- ✅ 10MB 大文件上传
- ✅ 文件存储在阿里云 OSS
- ✅ 7 天自动过期
- ✅ OpenClaw Gateway 可以访问文件
- ✅ 完整的进度显示

---

## 🔍 验证文件是否可访问

配置 CORS 后，测试返回的 fileUrl:

```bash
# 上传文件获取 URL
curl -X POST http://localhost:3001/api/upload \
  -F "file=@/tmp/test.txt" \
  -F "userId=testuser" \
  -F "sessionKey=test" > /tmp/response.json

# 提取 URL
cat /tmp/response.json | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['fileUrl'])"

# 测试访问
curl -I "上面的URL"
```

预期响应: `HTTP/1.1 200 OK`

---

**现在就去配置 CORS 吧！** 🚀
