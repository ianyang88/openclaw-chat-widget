# OpenClaw Chat Widget 配置完成

## ✅ 配置状态

### 已完成配置

1. **OpenClaw Gateway 状态** ✅
   - 进程运行中: PID 2463263
   - 监听端口: 18789
   - 绑定模式: LAN
   - 认证方式: Token

2. **聊天组件配置** ✅
   - 已更新 local-demo.html 的 Token
   - Gateway 地址: ws://localhost:18789
   - Session Key: agent:main:main
   - 模型: zai/glm-4.6

3. **测试服务器** ✅
   - HTTP 服务器运行中: 端口 8080
   - 访问地址: http://localhost:8080/local-demo.html

## 🔑 认证信息

```
Gateway URL: ws://localhost:18789
Token: 9aaa42a43ece4943693100cdbdb68281bfe3c3f43bbff5c5
Session Key: agent:main:main
Model: zai/glm-4.6
```

## 🌐 访问地址

### 本地测试页面
```
http://localhost:8080/local-demo.html
```

### 主演示页面
```
http://localhost:8080/index.html
```

## 📋 使用步骤

### 1. 打开测试页面
在浏览器中访问:
```
http://localhost:8080/local-demo.html
```

### 2. 查看连接状态
- 页面应该显示 "连接中..." 状态
- 几秒后应该变为 "已连接"
- 浏览器控制台会显示连接日志

### 3. 开始对话
- 在输入框中输入消息
- 按 Enter 发送
- 查看 AI 回复

## 🛠️ 开发者调试

### 浏览器控制台命令

```javascript
// 查看组件实例
window.chatWidget

// 手动发送消息
chatWidget.sendMessage("你好，请介绍一下你自己")

// 查看连接状态
chatWidget.connected

// 断开连接
chatWidget.disconnect()

// 重新连接
chatWidget.connect()

// 监听消息
chatWidget.on('message', (data) => {
    console.log('收到消息:', data)
})
```

## 📡 WebSocket 协议流程

### 1. 建立连接
```
客户端 → Gateway: WebSocket 连接请求
Gateway → 客户端: 连接建立
```

### 2. 认证握手
```
Gateway → 客户端: connect.challenge (包含 nonce)
客户端 → Gateway: connect (包含 token + nonce)
Gateway → 客户端: connect.ok (认证成功)
```

### 3. 发送消息
```
客户端 → Gateway: chat.send (包含消息内容)
Gateway → 客户端: chat 事件 (流式响应)
```

## 🔧 故障排查

### 问题: 无法连接到 Gateway

**检查项:**
1. Gateway 进程是否运行: `ps aux | grep openclaw`
2. 端口是否监听: `netstat -tlnp | grep 18789`
3. 防火墙是否允许连接

### 问题: 认证失败

**检查项:**
1. Token 是否正确
2. Gateway 配置文件: ~/.openclaw/openclaw.json
3. 查看浏览器控制台错误信息

### 问题: 消息无响应

**检查项:**
1. Session Key 是否正确: agent:main:main
2. 模型是否可用: zai/glm-4.6
3. 网络连接是否稳定

## 📁 项目文件说明

```
openclaw-chat-widget/
├── chat-widget.js          # 主组件 (包含所有连接逻辑)
├── chat-widget.css         # UI 样式
├── local-demo.html         # 本地 Gateway 测试页 ⭐
├── index.html              # 主演示页
├── demo.js                 # 演示脚本
├── test-connection.js      # 连接测试脚本
├── README.md               # 使用文档
└── DEV_NOTES.md            # 开发笔记
```

## 🚀 下一步

### 集成到你的项目

```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="chat-widget.css">
</head>
<body>
    <div id="chat-widget"></div>

    <script src="chat-widget.js"></script>
    <script>
        const chatWidget = new OpenClawChatWidget({
            container: '#chat-widget',
            gatewayUrl: 'ws://localhost:18789',
            token: '9aaa42a43ece4943693100cdbdb68281bfe3c3f43bbff5c5',
            sessionKey: 'agent:main:main'
        });

        // 监听连接事件
        chatWidget.on('connected', () => {
            console.log('已连接到 OpenClaw');
        });

        chatWidget.on('message', (data) => {
            console.log('收到消息:', data);
        });
    </script>
</body>
</html>
```

### 自定义配置

#### 修改模型
在 local-demo.html 中修改 sessionKey:
```javascript
sessionKey: 'agent:coder:main'  // 使用 coder agent
sessionKey: 'agent:vision:main' // 使用 vision agent
```

#### 修改样式
编辑 chat-widget.css 文件来自定义外观。

#### 添加功能
参考 DEV_NOTES.md 中的待办事项列表。

## 📞 技术支持

- 查看 README.md 了解完整 API 文档
- 查看 DEV_NOTES.md 了解开发细节
- 查看 AUTH_README.md 了解认证配置

---
配置完成时间: 2026-03-06
配置者: Claude Code
