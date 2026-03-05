# OpenClaw Chat Widget

一个简单易用的 OpenClaw 聊天组件，支持嵌入到现有 Web 系统中。

## 功能特点

- 🎨 现代化的 UI 设计
- 💬 实时消息流式传输
- 🔌 WebSocket 连接管理
- 🔄 自动重连机制
- 📱 响应式设计
- ⌨️ 快捷键支持 (Enter 发送, Shift+Enter 换行)
- 🌐 支持多会话管理

## 快速开始

### 1. 演示模式（无需服务器）

直接在浏览器中打开 `index.html` 即可查看演示。

### 2. 连接真实 OpenClaw

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
            gatewayUrl: 'ws://your-openclaw-host:18789',
            token: 'your-gateway-token',
            sessionKey: 'agent:main:main'
        });
    </script>
</body>
</html>
```

## Session Key 说明

**推荐使用 `agent:main:main`（main session）**

OpenClaw 的 session 架构设计中：
- **Main Session** 是默认的会话入口
- OpenClaw 会根据任务需要**自行决定是否创建子 session**
- 例如：处理特定用户请求时，agent 可能会创建 `agent:main:direct:userId` 子 session

```
agent:main:main                    ← 主 session（入口）
├── agent:main:direct:user123      ← 子 session（由 OpenClaw 自动创建）
├── agent:main:thread:task456      ← 线程 session
└── agent:subagent:tool:task789    ← 子 agent session
```

**为什么使用 main session？**
- ✅ 让 OpenClaw 自主管理 session 策略
- ✅ 支持跨请求的上下文共享
- ✅ 灵活的路由和子 session 创建

## 配置选项

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `container` | string/Element | - | 容器选择器或元素（必需） |
| `gatewayUrl` | string | `'ws://localhost:18789'` | OpenClaw Gateway WebSocket 地址 |
| `token` | string | `''` | 认证 Token |
| `password` | string | `''` | 认证密码 |
| `sessionKey` | string | `'agent:main:main'` | 会话标识 (推荐使用 main session) |

## API 方法

### `on(event, callback)`
监听事件

```javascript
chatWidget.on('connected', () => {
    console.log('已连接');
});

chatWidget.on('message', (data) => {
    console.log('收到消息:', data);
});
```

### `disconnect()`
断开连接

```javascript
chatWidget.disconnect();
```

### `destroy()`
销毁组件

```javascript
chatWidget.destroy();
```

## 事件

| 事件 | 说明 | 数据 |
|------|------|------|
| `connected` | 连接成功 | - |
| `disconnected` | 连接断开 | - |
| `message` | 收到消息 | `{ role, message, runId }` |
| `tool` | 工具调用事件 | 工具数据 |

## OpenClaw WebSocket 协议

组件使用 OpenClaw Gateway WebSocket 协议：

### RPC 方法

**chat.send** - 发送消息
```json
{
    "id": 1,
    "method": "chat.send",
    "params": {
        "sessionKey": "agent:main:main",
        "message": "你好",
        "idempotencyKey": "unique-id"
    },
    "connect": {
        "params": {
            "auth": { "token": "your-token" }
        }
    }
}
```

**chat.history** - 获取历史记录
```json
{
    "id": 2,
    "method": "chat.history",
    "params": {
        "sessionKey": "agent:main:main",
        "limit": 50
    }
}
```

**chat.abort** - 中断运行
```json
{
    "id": 3,
    "method": "chat.abort",
    "params": {
        "sessionKey": "agent:main:main",
        "runId": "run-id"
    }
}
```

### 服务器推送事件

**chat** - 聊天事件
```json
{
    "method": "chat",
    "params": {
        "runId": "run-id",
        "sessionKey": "...",
        "seq": 1,
        "state": "final",
        "message": { "role": "assistant", "content": [...] }
    }
}
```

## 项目结构

```
openclaw-chat-widget/
├── index.html          # 示例页面
├── chat-widget.css     # 组件样式
├── chat-widget.js      # 组件核心代码
├── demo.js            # 演示脚本（模拟模式）
└── README.md          # 说明文档
```

## 开发计划

- [ ] 支持 Markdown 渲染
- [ ] 支持代码高亮
- [ ] 支持文件上传
- [ ] 支持语音输入
- [ ] 支持多语言切换
- [ ] 支持主题自定义

## 许可证

MIT
