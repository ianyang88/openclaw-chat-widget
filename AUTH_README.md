# OpenClaw Chat Widget - OAuth2/SAML SSO 认证实现

## 概述

本实现为 OpenClaw Chat Widget 添加了完整的 OAuth2/SAML 单点登录 (SSO) 支持，实现了用户级别的会话隔离和持久化。

## 功能特性

### 1. 多种认证方式支持

- **Token 认证**：传统的 token/password 认证（向后兼容）
- **OAuth2 认证**：完整的 OAuth 2.0 Authorization Code Flow with PKCE
- **SAML 认证**：SAML 2.0 SSO 支持（需要后端配合）
- **无认证模式**：用于演示和测试

### 2. 用户会话隔离

每个用户拥有独立的聊天会话，通过 `agent:main:direct:{userId}` 格式的 sessionKey 实现。

### 3. 会话持久化

- 使用 localStorage 存储用户信息和 token
- 支持页面刷新后自动恢复登录状态
- Token 过期前自动刷新

### 4. 安全特性

- **PKCE (Proof Key for Code Exchange)**：防止授权码拦截攻击
- **State 参数**：防止 CSRF 攻击
- **Token 自动刷新**：在 token 过期前自动刷新
- **来源验证**：验证 OAuth 回调消息来源

## 架构设计

```
OpenClawChatWidget
├── AuthenticationManager (认证协调器)
│   ├── OAuth2Handler
│   ├── SAMLHandler
│   └── TokenAuthHandler (内置)
├── SessionManager (会话持久化)
└── UserManager (用户ID管理)
```

## 使用方法

### 传统 Token 认证（向后兼容）

```javascript
const chatWidget = new OpenClawChatWidget({
    container: '#chat-widget',
    gatewayUrl: 'ws://localhost:18789',
    token: 'your-token',
    sessionKey: 'agent:main:main'
});
```

### OAuth2 认证

```javascript
const chatWidget = new OpenClawChatWidget({
    container: '#chat-widget',
    gatewayUrl: 'ws://localhost:18789',
    auth: {
        type: 'oauth2',
        oauth2: {
            // OAuth 2.0 配置
            authorizationEndpoint: 'https://accounts.example.com/authorize',
            tokenEndpoint: 'https://accounts.example.com/token',
            clientId: 'your-client-id',
            redirectUri: window.location.origin + '/oauth-callback',
            scope: 'openid profile email',

            // 可选配置
            usePopup: true,              // 使用弹窗模式（默认）
            prompt: 'login',             // 可选: 'none', 'login', 'consent'
            loginButtonText: '使用企业账号登录'
        }
    },
    session: {
        persist: true,      // 启用会话持久化（默认）
        autoRestore: true   // 启用自动恢复（默认）
    }
});
```

### 配置选项详解

#### auth 配置

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| type | string | 'none' | 认证类型：'oauth2', 'saml', 'token', 'none' |
| oauth2 | object | - | OAuth2 配置（当 type='oauth2' 时） |
| saml | object | - | SAML 配置（当 type='saml' 时） |

#### oauth2 配置

| 选项 | 类型 | 必需 | 描述 |
|------|------|------|------|
| authorizationEndpoint | string | 是 | OAuth 授权端点 URL |
| tokenEndpoint | string | 是 | OAuth 令牌端点 URL |
| clientId | string | 是 | OAuth 客户端 ID |
| redirectUri | string | 否 | OAuth 重定向 URI |
| scope | string | 否 | OAuth 请求范围 |
| usePopup | boolean | 否 | 是否使用弹窗模式（默认 true） |
| prompt | string | 否 | OAuth prompt 参数 |
| loginButtonText | string | 否 | 登录按钮文本 |

#### session 配置

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| persist | boolean | true | 是否持久化会话 |
| autoRestore | boolean | true | 是否自动恢复会话 |

## 事件监听

### 认证相关事件

```javascript
// 认证中
chatWidget.on('authenticating', () => {
    console.log('正在认证...');
});

// 认证成功
chatWidget.on('authenticated', (data) => {
    console.log('用户已登录:', data.userId);
    console.log('用户信息:', data.userInfo);
});

// 认证失败
chatWidget.on('error', (error) => {
    console.error('认证失败:', error);
});

// 登出
chatWidget.on('logout', () => {
    console.log('用户已登出');
});
```

### 原有事件（保持兼容）

```javascript
chatWidget.on('connected', () => {
    console.log('WebSocket 已连接');
});

chatWidget.on('disconnected', () => {
    console.log('WebSocket 已断开');
});

chatWidget.on('message', (data) => {
    console.log('收到消息:', data);
});
```

## OAuth 回调处理

### 弹窗模式（推荐）

当 `usePopup: true` 时，OAuth 流程在弹窗中完成，无需额外的回调处理。

### 重定向模式

当 `usePopup: false` 时，需要设置回调页面处理 OAuth 回调：

1. 将 `oauth-callback.html` 部署到您的服务器
2. 确保 OAuth 应用的重定向 URI 指向该页面
3. 回调完成后会自动返回主页面

## 集成示例

### Google OAuth2

```javascript
const chatWidget = new OpenClawChatWidget({
    container: '#chat-widget',
    gatewayUrl: 'ws://localhost:18789',
    auth: {
        type: 'oauth2',
        oauth2: {
            authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
            tokenEndpoint: 'https://oauth2.googleapis.com/token',
            clientId: 'your-google-client-id.apps.googleusercontent.com',
            redirectUri: window.location.origin + '/oauth-callback',
            scope: 'openid profile email'
        }
    }
});
```

### Azure AD OAuth2

```javascript
const chatWidget = new OpenClawChatWidget({
    container: '#chat-widget',
    gatewayUrl: 'ws://localhost:18789',
    auth: {
        type: 'oauth2',
        oauth2: {
            authorizationEndpoint: 'https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/authorize',
            tokenEndpoint: 'https://login.microsoftonline.com/{tenant-id}/oauth2/v2.0/token',
            clientId: 'your-azure-client-id',
            redirectUri: window.location.origin + '/oauth-callback',
            scope: 'openid profile email'
        }
    }
});
```

### 自定义 OAuth2 提供商

```javascript
const chatWidget = new OpenClawChatWidget({
    container: '#chat-widget',
    gatewayUrl: 'ws://localhost:18789',
    auth: {
        type: 'oauth2',
        oauth2: {
            authorizationEndpoint: 'https://your-idp.com/authorize',
            tokenEndpoint: 'https://your-idp.com/token',
            clientId: 'your-client-id',
            redirectUri: window.location.origin + '/oauth-callback',
            scope: 'openid profile email custom-scope'
        }
    }
});
```

## 文件结构

```
openclaw-chat-widget/
├── chat-widget.js           # 主组件（包含所有认证模块）
├── chat-widget.css          # 样式文件
├── index.html               # 演示页面
├── demo.js                  # 演示脚本
├── oauth-callback.html      # OAuth 回调页面
└── lib/auth/                # 认证模块（独立版本）
    ├── user-manager.js
    ├── session-manager.js
    ├── auth-manager.js
    ├── oauth2-handler.js
    └── saml-handler.js
```

## 浏览器兼容性

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- 需要支持以下 API：
  - Web Crypto API（用于 PKCE）
  - localStorage（用于会话持久化）
  - postMessage（用于弹窗通信）

## 安全注意事项

1. **HTTPS 要求**：生产环境必须使用 HTTPS
2. **Redirect URI 验证**：确保在 OAuth 提供商处正确配置重定向 URI
3. **Token 存储**：Token 存储在 localStorage，请注意 XSS 防护
4. **PKCE**：强制使用 PKCE，不要禁用
5. **State 验证**：自动验证 state 参数防止 CSRF

## 故障排查

### 登录弹窗被拦截

确保在用户交互事件（如点击）中触发登录，避免自动弹出登录窗口。

### Token 刷新失败

检查 refresh_token 是否正确返回，以及 token 端点是否支持刷新。

### 用户信息获取失败

确保 scope 包含 `openid` 和 `profile`，ID provider 正确返回 id_token。

## 向后兼容性

所有现有配置和 API 保持不变，新功能通过 `auth` 和 `session` 配置选项添加。

## 未来扩展

- [ ] SAML 完整实现（目前为基础框架）
- [ ] 多 OAuth 提供商支持
- [ ] 自定义认证处理器插件系统
- [ ] 更多会话存储选项（IndexedDB、SessionStorage）
- [ ] 细粒度权限控制

## 许可证

与原项目保持一致
