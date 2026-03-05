# OpenClaw Chat Widget 开发笔记

## 项目概述
OpenClaw 聊天组件 - 支持通过 WebSocket 连接到 OpenClaw Gateway

## 对接本机 Gateway

### Gateway 配置
- **地址**: `ws://localhost:18789`
- **认证方式**: Token
- **Token**: `1716a5eef04bff6b4f79fda916e151a558ec0f3db676d280`
- **配置文件**: `~/.openclaw/openclaw.json`

### 可用的 Agents
- `main` - 主 agent (zai/glm-4.6)
- `coder` - 代码助手
- `vision` - 视觉理解
- `research` - 研究助手
- `knowledge` - 知识库

### Session Key 格式
- 默认: `agent:main:main`
- 自定义: `agent:<agent-name>:<session-id>`

## 关键协议变更

OpenClaw Gateway 使用自定义 WebSocket 协议，与标准 WebSocket 不同：

| 字段 | 要求 | 说明 |
|------|------|------|
| `type` | `'req'` | 请求帧类型（不是 'request'） |
| `id` | 字符串 | 消息 ID 必须是字符串，不是数字 |
| `minProtocol` | `3` | 协议版本 |
| `client.id` | `'webchat'` | 必须使用 Gateway 预定义的客户端 ID |
| `client.mode` | `'webchat'` | 必须指定客户端模式 |
| `scopes` | `['operator.write', 'operator.admin']` | 必需的作用域 |

## 连接流程

1. WebSocket 连接建立
2. 等待 `connect.challenge` 事件（包含 nonce）
3. 发送 `connect` 消息（包含 token 和 nonce）
4. 收到 `connect.ok` 响应
5. 可以发送 `chat.send` 请求
6. 通过 `chat` 事件接收流式响应

## 测试页面

- **基本测试**: `http://localhost:8080/local-demo.html`
- **启动服务器**: `python3 -m http.server 8080`

## 已修改的文件

### chat-widget.js
- 消息协议适配（type, id 格式）
- 添加 Gateway 握手流程
- 添加事件处理（connect.challenge, chat, tool）
- 添加作用域声明

### local-demo.html
- 配置本机 Gateway 连接
- 添加版本号参数强制刷新缓存

### ~/.openclaw/openclaw.json
- 添加 `controlUi.allowedOrigins`
- 添加 `dangerouslyAllowHostHeaderOriginFallback`

## 下次继续开发时

1. 进入项目目录：`cd /home/ian/projects/openclaw-chat-widget`
2. 告诉 Claude：查看 `DEV_NOTES.md` 了解当前项目状态
3. 运行测试服务器：`python3 -m http.server 8080`
4. 访问测试页面验证功能

## 已知问题

- 无

## 待办事项

- [ ] 添加会话持久化功能
- [ ] 支持流式响应显示
- [ ] 添加错误重试机制
