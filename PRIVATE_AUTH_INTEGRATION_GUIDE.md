# 私有系统 OAuth2 对接指南

## 概述

将你们私有系统的用户认证集成到 OpenClaw Chat Widget，有两种方案：

| 方案 | 复杂度 | 开发时间 | 优点 | 缺点 |
|------|--------|----------|------|------|
| **方案 1：完整 OAuth2** | ⭐⭐⭐⭐☆ | 2-3 天 | 标准化、安全性高 | 开发工作量大 |
| **方案 2：简化 Token** | ⭐⭐☆☆☆ | 2-4 小时 | 快速实现、灵活 | 非标准 |

---

## 方案 2：简化 Token 认证（推荐）

### 工作原理

```
用户在聊天页面输入用户名密码
    ↓
调用你们系统的登录接口
    ↓
返回 token + 用户信息
    ↓
使用 token 连接 OpenClaw Gateway
    ↓
生成唯一 sessionKey
```

### 你们需要实现的接口（只需要 1 个！）

#### 登录接口

**请求：**
```http
POST /api/auth/login
Content-Type: application/json

{
    "username": "zhangsan",
    "password": "password123"
}
```

**响应（必须包含的字段）：**
```json
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
        "id": "12345",                    // ✅ 必填：用户唯一标识
        "username": "zhangsan",           // ✅ 必填：用户名
        "email": "zhangsan@company.com",  // ⚠️ 可选：邮箱
        "name": "张三"                     // ⚠️ 可选：显示名称
    }
}
```

**错误响应：**
```json
{
    "error": "INVALID_CREDENTIALS",
    "message": "用户名或密码错误"
}
```

HTTP 状态码：401 或 200（配合 error 字段）

### 接口要求

1. **token 格式**：
   - 推荐：JWT (JSON Web Token)
   - 可选：随机字符串 + 服务器存储

2. **token 有效期**：
   - 建议：7-30 天
   - 支持自动刷新

3. **安全要求**：
   - ✅ 使用 HTTPS（生产环境）
   - ✅ 密码传输加密
   - ✅ Token 签名验证
   - ✅ 防止暴力破解（登录失败限制）

### 集成步骤

#### 步骤 1：实现登录接口

```javascript
// Node.js Express 示例
app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;

    // 1. 验证用户名密码
    const user = await db.users.findOne({ username });
    if (!user || !bcrypt.compare(password, user.password)) {
        return res.status(401).json({
            error: 'INVALID_CREDENTIALS',
            message: '用户名或密码错误'
        });
    }

    // 2. 生成 token（JWT）
    const token = jwt.sign(
        { userId: user.id },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
    );

    // 3. 返回 token 和用户信息
    res.json({
        token: token,
        user: {
            id: user.id,
            username: user.username,
            email: user.email,
            name: user.name
        }
    });
});
```

```python
# Python Flask 示例
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    # 1. 验证用户名密码
    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return jsonify({
            'error': 'INVALID_CREDENTIALS',
            'message': '用户名或密码错误'
        }), 401

    # 2. 生成 token
    token = generate_jwt_token(user.id, expires_in=30*24*3600)

    # 3. 返回 token 和用户信息
    return jsonify({
        'token': token,
        'user': {
            'id': str(user.id),
            'username': user.username,
            'email': user.email,
            'name': user.name
        }
    })
```

#### 步骤 2：配置前端页面

编辑 `/root/openclaw-chat-widget/private-auth-demo.html` 第 267 行：

```javascript
const PRIVATE_AUTH_CONFIG = {
    authUrl: 'http://YOUR_SYSTEM/api/auth/login',  // 改为你们的接口地址
    userInfoUrl: 'http://YOUR_SYSTEM/api/user/info'  // 可选
};
```

#### 步骤 3：测试集成

1. 访问：`http://8.148.244.33:8080/private-auth-demo.html`
2. 输入你们系统的用户名和密码
3. 验证登录成功，显示用户信息

---

## 方案 1：完整 OAuth2 服务器

如果你们需要标准 OAuth2 支持，需要实现以下接口：

### 接口 1：授权端点

```
GET /oauth/authorize
```

**参数：**
- `response_type`: 必须是 `code`
- `client_id`: 客户端 ID
- `redirect_uri`: 重定向 URI
- `scope`: 权限范围
- `state`: 随机状态码
- `code_challenge`: PKCE challenge（推荐）
- `code_challenge_method`: `S256`

**功能：**
1. 显示登录页面（如果未登录）
2. 显示授权页面（用户授权）
3. 生成授权码
4. 重定向到 `redirect_uri?code=xxx&state=xxx`

### 接口 2：Token 端点

```
POST /oauth/token
```

**请求：**
```json
{
    "grant_type": "authorization_code",
    "code": "授权码",
    "client_id": "客户端ID",
    "redirect_uri": "重定向URI",
    "code_verifier": "PKCE verifier"
}
```

**响应：**
```json
{
    "access_token": "xxx",
    "token_type": "bearer",
    "expires_in": 3600,
    "refresh_token": "yyy"
}
```

### 接口 3：用户信息端点

```
GET /api/user
Authorization: Bearer {access_token}
```

**响应：**
```json
{
    "id": "12345",
    "username": "zhangsan",
    "email": "zhangsan@company.com",
    "name": "张三"
}
```

或者使用 JWT（推荐），在 `access_token` 的 payload 中包含用户信息。

---

## Session Key 生成规则

无论选择哪种方案，OpenClaw 都会根据用户信息生成唯一的 Session Key：

```
agent:main:direct:{provider}:{userId}
```

**示例：**
```
私有系统用户 A: agent:main:direct:private:user123
私有系统用户 B: agent:main:direct:private:user456
```

这确保了：
- ✅ 不同用户完全隔离
- ✅ 聊天历史独立
- ✅ 上下文不共享

---

## 安全建议

### Token 存储

**当前方案（便利性优先）：**
- Token 存储在 `localStorage`
- ✅ 优点：实现简单、自动持久化
- ⚠️ 风险：XSS 攻击可能窃取 token

**缓解措施：**
```javascript
// 1. 实施 Content Security Policy (CSP)
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self'; script-src 'self' 'unsafe-inline'">

// 2. 定期审计前端代码

// 3. 设置 Token 过期时间
// 4. 支持 Token 刷新机制
```

**生产环境建议：**
- 使用 **httpOnly Cookie** 存储 token
- 实施 CSRF 保护
- 使用 HTTPS
- 设置 SameSite Cookie 策略

### 密码安全

```javascript
// ✅ 推荐：使用 bcrypt 加密
const bcrypt = require('bcrypt');
const hashedPassword = await bcrypt.hash(plainPassword, 10);
const isValid = await bcrypt.compare(plainPassword, hashedPassword);

// ❌ 不要：明文存储或使用 MD5/SHA1
```

---

## 快速开始检查清单

### 方案 2：简化 Token（推荐）

- [ ] 确认你们系统已有登录功能
- [ ] 实现或调整登录接口（返回指定格式）
- [ ] 修改 `private-auth-demo.html` 中的接口地址
- [ ] 本地测试登录功能
- [ ] 测试多用户隔离

### 方案 1：完整 OAuth2

- [ ] 实现授权端点 `/oauth/authorize`
- [ ] 实现令牌端点 `/oauth/token`
- [ ] 实现用户信息端点 `/api/user`
- [ ] 配置 OAuth2 客户端
- [ ] 测试完整 OAuth2 流程

---

## 测试工具

### 测试登录接口

```bash
# 使用 curl 测试
curl -X POST http://your-system/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test123"}'

# 预期响应
{
    "token": "eyJhbGci...",
    "user": {
        "id": "123",
        "username": "test",
        "email": "test@example.com"
    }
}
```

### 解码 JWT Token

```javascript
// 在浏览器控制台
const token = "eyJhbGci..."; // 你的 token
const payload = JSON.parse(atob(token.split('.')[1]));
console.log(payload);
// 输出: { userId: "123", exp: 1234567890 }
```

---

## 常见问题

### Q: Token 存储在哪里安全？
A:
- 开发测试：localStorage 足够
- 生产环境：推荐 httpOnly Cookie

### Q: 如何处理 Token 过期？
A:
```javascript
// 方案 1: 提示用户重新登录
chatWidget.on('error', (error) => {
    if (error.message === 'TOKEN_EXPIRED') {
        alert('登录已过期，请重新登录');
        logout();
    }
});

// 方案 2: 自动刷新 Token
// 需要你们系统提供刷新 token 的接口
```

### Q: 可以限制只有特定用户使用吗？
A: 可以，在登录接口中检查用户权限：

```javascript
// 示例：只允许特定部门的用户登录
if (!user.departments.includes('IT')) {
    return res.status(403).json({
        error: 'FORBIDDEN',
        message: '您没有权限访问此系统'
    });
}
```

### Q: 如何与现有系统集成？
A:
- 如果已有登录接口，调整返回格式即可
- 如果已有单点登录（SSO），可以实现 OAuth2 或使用统一 Token

### Q: 支持手机号登录吗？
A: 完全支持，只需调整登录接口：

```javascript
// 登录接口支持多种方式
POST /api/auth/login
{
    "account": "13800138000",  // 手机号或邮箱
    "password": "password123"
}
```

---

## 参考资源

### OAuth2 标准
- [RFC 6749 - OAuth 2.0](https://tools.ietf.org/html/rfc6749)
- [RFC 7636 - PKCE](https://tools.ietf.org/html/rfc7636)

### JWT
- [JWT.io](https://jwt.io/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

### 现有实现参考
- GitHub OAuth2: https://github.com/settings/developers
- Google OAuth2: https://console.cloud.google.com/

---

## 下一步

1. **选择方案**：推荐方案 2（简化 Token）
2. **评估现有系统**：检查是否已有登录接口
3. **实现接口**：参考本文档的示例代码
4. **配置前端**：修改 `private-auth-demo.html`
5. **测试集成**：验证登录和多用户隔离

需要帮助实现接口或有其他问题，请随时询问！
