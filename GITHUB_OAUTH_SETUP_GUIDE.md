# GitHub OAuth2 配置指南（5 分钟快速配置）

## 为什么选择 GitHub？

✅ **国内可访问** - 不需要特殊的网络环境
✅ **配置简单** - 只需 3 步即可完成
✅ **开发者友好** - 大多数开发者都有 GitHub 账号
✅ **安全可靠** - 业界标准的 OAuth2 认证

---

## 快速配置步骤

### 步骤 1：注册 GitHub OAuth App（2 分钟）

1. 登录 [GitHub](https://github.com)
2. 点击右上角头像 → **Settings**
3. 滚动到页面最下方，点击 **Developer settings**
4. 在左侧菜单选择 **OAuth Apps** → 点击 **New OAuth App**

### 步骤 2：填写应用信息（2 分钟）

填写表单：

| 字段 | 值 | 说明 |
|------|-----|------|
| **Application name** | `OpenClaw Chat Widget` | 应用名称 |
| **Homepage URL** | `http://8.148.244.33:8080` | 你的网站首页 |
| **Application description** | `OpenClaw 多用户聊天演示` | 应用描述 |
| **Authorization callback URL** | `http://8.148.244.33:8080/oauth-callback.html` | ⚠️ 重要：必须精确匹配 |

点击 **Register application**

### 步骤 3：获取 Client ID（1 分钟）

注册成功后，你会看到：
- **Client ID**: 复制这个（类似：`a1b2c3d4e5f6g7h8i9j0`）
- Client Secret: **不需要**（我们使用 PKCE 流程，无需 Secret）

---

## 更新配置文件

编辑 `/root/openclaw-chat-widget/github-oauth-demo.html`：

找到第 333 行：
```javascript
const GITHUB_CLIENT_ID = 'YOUR_GITHUB_CLIENT_ID';
```

替换为你的实际 Client ID：
```javascript
const GITHUB_CLIENT_ID = 'a1b2c3d4e5f6g7h8i9j0';
```

保存文件。

---

## 测试登录

1. 访问：`http://8.148.244.33:8080/github-oauth-demo.html`
2. 点击"使用 GitHub 账号登录"
3. 在弹出窗口中完成 GitHub 授权
4. 验证用户信息显示正确

---

## 验证清单

### 配置检查
- [ ] GitHub OAuth App 已创建
- [ ] Authorization callback URL 正确配置
- [ ] Client ID 已复制
- [ ] Client ID 已替换到 HTML 文件中

### 功能测试
- [ ] 登录按钮可点击
- [ ] 弹出 GitHub 授权窗口
- [ ] 授权成功后窗口关闭
- [ ] 用户信息卡片显示
- [ ] Session Key 格式正确：`agent:main:direct:github:xxxxx`
- [ ] 聊天界面显示
- [ ] 可以发送消息

### 持久化测试
- [ ] 刷新页面后自动恢复登录
- [ ] 用户信息保持显示
- [ ] 聊天历史保留

---

## 多用户隔离验证

### 方法 1：使用不同浏览器
1. Chrome：使用 GitHub 账号 A 登录
2. Firefox：使用 GitHub 账号 B 登录
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
用另一个 GitHub 账号登录，验证有独立的历史。

---

## Session Key 验证

在浏览器控制台执行：
```javascript
chatWidget.userManager.getSessionKey()
```

预期输出格式：
```
agent:main:direct:github:1234567
```

不同用户应该有不同的数字部分。

---

## 调试命令

### 查看认证状态
```javascript
chatWidget.isAuthenticated
```

### 查看用户信息
```javascript
chatWidget.userManager.getUserId()
chatWidget.userManager.getUserInfo()
chatWidget.userManager.getSessionKey()
```

### 查看所有保存的会话
```javascript
Object.keys(localStorage).filter(k => k.startsWith('openclaw_'))
```

### 清除所有会话（测试多用户）
```javascript
localStorage.clear()
location.reload()
```

---

## 故障排除

### 问题 1：登录按钮禁用
**原因**：未配置 GitHub Client ID
**解决**：按照步骤 1-3 配置，并替换到 HTML 文件

### 问题 2：弹出窗口后立即关闭
**原因**：回调 URL 不匹配
**解决**：检查 GitHub OAuth App 中的 Authorization callback URL 是否精确匹配

### 问题 3：错误 "redirect_uri_mismatch"
**原因**：回调 URL 配置错误
**解决**：
1. 确保 GitHub OAuth App 中配置的是：`http://8.148.244.33:8080/oauth-callback.html`
2. 确保 HTML 文件中的 redirectUri 一致
3. 注意：**不要在 URL 后面添加斜杠**

### 问题 4：用户信息显示不完整
**原因**：GitHub 权限范围不足
**解决**：确保 scope 包含 `read:user user:email`

### 问题 5：刷新后需要重新登录
**原因**：localStorage 被禁用或清除
**解决**：
1. 检查浏览器设置，确保允许 localStorage
2. 检查是否使用了隐身模式（localStorage 在关闭后清除）

### 问题 6：GitHub 授权页面显示"404 Not Found"
**原因**：OAuth App 配置错误或已被删除
**解决**：
1. 检查 GitHub OAuth App 是否存在
2. 重新创建 OAuth App

---

## GitHub vs Google OAuth2 对比

| 特性 | GitHub | Google |
|------|--------|--------|
| **国内访问** | ✅ 可直接访问 | ❌ 需要特殊网络 |
| **配置难度** | ⭐⭐☆☆☆ 简单 | ⭐⭐⭐☆☆ 中等 |
| **注册时间** | 2 分钟 | 5 分钟 |
| **授权页面** | 简洁 | 复杂（需要选择账号） |
| **用户信息** | username, email | name, email |
| **适用场景** | 开发者工具 | 通用应用 |

---

## 安全建议

### 生产环境
- ✅ 必须使用 HTTPS
- ✅ 在 GitHub OAuth App 中添加生产域名
- ✅ 设置域名白名单
- ✅ 定期审计 OAuth App 权限

### Token 安全
- ⚠️ Token 存储在 localStorage（便利但需注意 XSS）
- ✅ 实施 Content Security Policy (CSP)
- ✅ 定期审计代码安全性
- ✅ 考虑使用 httpOnly cookie 存储 token

### 权限最小化
GitHub OAuth App 只申请必要的权限：
- `read:user` - 读取用户基本信息
- `user:email` - 读取用户邮箱

不要申请不必要的权限（如 `repo`、`delete_repo` 等）。

---

## 下一步

完成 GitHub OAuth2 配置后，可以：

1. **添加更多 OAuth 提供商**：Microsoft、GitLab、Bitbucket
2. **自定义 UI**：修改 `github-oauth-demo.html` 的样式
3. **添加功能**：文件上传、语音消息、视频聊天
4. **部署到生产**：使用 HTTPS 和域名
5. **集成组织登录**：支持 GitHub 组织/企业账号

---

## 参考文档

- [GitHub OAuth Apps 文档](https://docs.github.com/en/developers/apps/building-oauth-apps)
- [GitHub OAuth Web Application Flow](https://docs.github.com/en/developers/apps/building-oauth-apps/authorizing-oauth-apps)
- [GitHub Scopes](https://docs.github.com/en/developers/apps/building-oauth-apps/scopes-for-oauth-apps)

---

## 常见问题

### Q: 需要配置 Client Secret 吗？
A: **不需要**。我们使用 PKCE (Proof Key for Code Exchange) 流程，这是更安全的方式，不需要在客户端存储 Client Secret。

### Q: GitHub OAuth App 可以公开吗？
A: 可以。Client ID 是公开信息，不会造成安全问题。只要不要泄露 Client Secret（虽然我们不需要它）。

### Q: 可以限制只有特定用户登录吗？
A: 可以。在认证成功后，检查用户的 GitHub username，决定是否允许登录。

### Q: 支持企业 GitHub 吗？
A: 支持。只需将授权和 token 端点改为企业 GitHub 的地址即可。

---

## 支持

遇到问题？
1. 检查浏览器控制台错误（F12）
2. 查看 `oauth-callback.html` 是否正确加载
3. 验证 GitHub OAuth App 配置
4. 确认网络连接正常
5. 检查回调 URL 是否精确匹配（包括协议、域名、端口、路径）
