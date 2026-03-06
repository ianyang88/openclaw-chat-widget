# Google OAuth2 配置指南

## 快速开始（5 分钟配置）

### 步骤 1：创建 Google Cloud 项目

1. 访问 [Google Cloud Console](https://console.cloud.google.com/)
2. 点击顶部的项目选择器
3. 点击"新建项目"
4. 项目名称：`OpenClaw Chat Widget`
5. 点击"创建"

### 步骤 2：启用 OAuth2 认证

1. 在左侧菜单，找到 **"APIs & Services"** → **"Credentials"**
2. 点击顶部的 **"+ 创建凭据"** 按钮
3. 选择 **"OAuth 客户端 ID"**

### 步骤 3：配置同意屏幕

如果是第一次创建，会提示配置同意屏幕：

1. 选择 **"外部"** 用户类型
2. 填写应用信息：
   - 应用名称：`OpenClaw Chat Widget`
   - 用户支持电子邮件：您的邮箱
   - 开发者联系信息：您的邮箱
3. 点击"保存并继续"
4. 跳过范围（点击"保存并继续"）
5. 跳过测试用户（点击"保存并继续"）
6. 点击"返回控制台"

### 步骤 4：创建 OAuth 客户端 ID

1. 回到 **"Credentials"** 页面
2. 点击 **"+ 创建凭据"** → **"OAuth 客户端 ID"**
3. 应用类型选择：**"Web 应用"**
4. 应用名称：`OpenClaw Multi-User Chat`
5. 授权重定向 URI（已获授权的 JavaScript 来源和重定向 URI）：

   **已获授权的 JavaScript 来源：**
   ```
   http://localhost:8080
   http://8.148.244.33:8080
   ```

   **已获授权的重定向 URI：**
   ```
   http://localhost:8080/oauth-callback.html
   http://8.148.244.33:8080/oauth-callback.html
   ```

6. 点击"创建"
7. 复制 **客户端 ID**（格式：`xxxxxxxxxx-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com`）

### 步骤 5：更新配置文件

编辑 `/root/openclaw-chat-widget/multi-user-demo.html`：

```javascript
// 找到这一行（约 217 行）
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';

// 替换为您的实际 Client ID
const GOOGLE_CLIENT_ID = '你的客户端ID.apps.googleusercontent.com';
```

### 步骤 6：测试登录

1. 访问：`http://8.148.244.33:8080/multi-user-demo.html`
2. 点击"使用 Google 账号登录"
3. 完成 Google 登录流程
4. 验证用户信息正确显示

## 验证清单

### 配置检查
- [ ] Google Cloud 项目已创建
- [ ] OAuth 同意屏幕已配置
- [ ] OAuth 客户端 ID 已生成
- [ ] 重定向 URI 已正确配置
- [ ] Client ID 已替换到 HTML 中

### 功能测试
- [ ] 登录按钮可点击
- [ ] 弹出 Google 登录窗口
- [ ] 授权成功后窗口关闭
- [ ] 用户信息卡片显示
- [ ] Session Key 格式正确：`agent:main:direct:google:xxxxx`
- [ ] 聊天界面显示
- [ ] 可以发送消息

### 持久化测试
- [ ] 刷新页面后自动恢复登录
- [ ] 用户信息保持显示
- [ ] 聊天历史保留

## 多用户隔离验证

### 方法 1：使用不同浏览器
1. Chrome：使用 Google 账号 A 登录
2. Firefox：使用 Google 账号 B 登录
3. 验证：两个浏览器的聊天历史完全独立

### 方法 2：使用无痕窗口
1. 正常窗口：账号 A
2. 无痕窗口：账号 B
3. 验证：两个窗口有独立的历史

### 方法 3：清除 localStorage
在浏览器控制台执行：
```javascript
localStorage.clear();
location.reload();
```
使用另一个 Google 账号登录，验证有独立的历史。

## Session Key 验证

在浏览器控制台执行：
```javascript
chatWidget.userManager.getSessionKey()
```

预期输出格式：
```
agent:main:direct:google:123456789
```

不同用户应该有不同的数字部分。

## 故障排除

### 问题 1：登录按钮禁用
**原因**：未配置 Google Client ID
**解决**：按照步骤 1-5 配置

### 问题 2：弹出窗口后立即关闭
**原因**：重定向 URI 未配置或不匹配
**解决**：检查 Google Cloud Console 中的重定向 URI 配置

### 问题 3：错误 "redirect_uri_mismatch"
**原因**：重定向 URI 不匹配
**解决**：确保 Google Console 和 HTML 中的 redirectUri 一致

### 问题 4：用户信息显示不完整
**原因**：OAuth scope 权限不足
**解决**：确保 scope 包含 `openid profile email`

### 问题 5：刷新后需要重新登录
**原因**：localStorage 被禁用或清除
**解决**：检查浏览器设置，确保允许 localStorage

## 安全建议

### 生产环境
- ✅ 必须使用 HTTPS
- ✅ 在 Google Console 添加生产域名
- ✅ 设置域名白名单
- ✅ 定期更新 Client Secret

### Token 安全
- ⚠️ Token 存储在 localStorage（便利但需注意 XSS）
- ✅ 实施 Content Security Policy (CSP)
- ✅ 定期审计代码安全性
- ✅ 考虑使用 httpOnly cookie 存储 token

## 下一步

完成 OAuth2 配置后，可以：

1. **添加更多 OAuth 提供商**：GitHub、Microsoft、Azure AD
2. **自定义 UI**：修改 `multi-user-demo.html` 的样式
3. **添加功能**：文件上传、语音消息、视频聊天
4. **部署到生产**：使用 HTTPS 和域名

## 参考文档

- [Google OAuth 2.0 文档](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)
- [OpenID Connect 规范](https://openid.net/connect/)

## 支持

遇到问题？
1. 检查浏览器控制台错误
2. 查看 `oauth-callback.html` 是否正确加载
3. 验证 Google Console 配置
4. 确认网络连接正常
