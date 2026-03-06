# 流式输出调试指南 (2026-03-06)

## ✅ 本次修复

### 1. 每次刷新清空 Session
**修改位置：** `simple-integration.html` 第 273 行

**修改内容：**
```javascript
// 旧代码 - 固定的 sessionKey（持久化上下文）
const sessionKey = `agent:main:direct:url:${userId}`;

// 新代码 - 添加时间戳（每次刷新清空上下文）
const timestamp = Date.now();
const sessionKey = `agent:main:direct:url:${userId}:${timestamp}`;
```

**效果：**
- ✅ 每次刷新页面都会创建新的 session
- ✅ AI 不会记住之前的对话
- ✅ 响应速度更快（不需要加载历史上下文）

---

### 2. 修复流式输出 [object Object] 问题

**根本原因：**
在处理 delta 消息时，代码传递了 `String(message)` 的结果（字符串化），而不是原始的 `message` 对象。

**修复位置：** `chat-widget.js` 第 1612-1621 行

**修改内容：**
```javascript
// 旧代码 - 传递字符串化的消息
} else if (state === 'delta' && message) {
    console.log('📖 Processing DELTA message (streaming):', {
        runId,
        length: messageStr.length,  // ❌ 字符串化
        preview: messageStr.substring(0, 50),
        messageType: typeof message
    });
    this.updateStreamingMessage(runId, messageStr);  // ❌ 传递字符串
    return;
}

// 新代码 - 传递原始消息对象
} else if (state === 'delta' && message) {
    console.log('📖 Processing DELTA message (streaming):', {
        runId,
        messageType: typeof message,
        messageKeys: typeof message === 'object' ? Object.keys(message) : null,
        rawMessage: message  // ✅ 显示原始消息
    });
    this.updateStreamingMessage(runId, message);  // ✅ 传递原始对象
    return;
}
```

**为什么这样修复有效？**
- `formatMessage()` 函数已经能够正确处理对象类型的消息
- 传递原始对象让 `formatMessage()` 能够提取正确的文本内容
- 不再显示 `[object Object]`

---

### 3. 添加详细调试日志

**新增日志位置：**
- `handleChatEvent()` - 显示消息结构
- `updateStreamingMessage()` - 显示格式化过程

**日志示例：**
```javascript
📖 Processing DELTA message (streaming): {
    runId: "abc123",
    messageType: "object",
    messageKeys: ["content", "role"],
    rawMessage: {
        content: [{ type: "text", text: "hello" }],
        role: "assistant"
    }
}

🔄 updateStreamingMessage called: {
    runId: "abc123",
    deltaContentType: "object",
    deltaContent: { content: [...] }
}

🎨 Formatted content: {
    displayContentLength: 5,
    displayContentPreview: "hello"
}
```

---

## 🧪 测试步骤

### 步骤 1: 刷新页面，验证 Session 清空

```bash
# 访问页面
http://8.148.244.33:8080/simple-integration.html?id=testuser

# 打开浏览器控制台
# 查看日志
```

**预期日志：**
```
✅ UserManager 设置完成: {
    userId: "testuser",
    generatedSessionKey: "agent:main:direct:url:testuser:1733512345678"
    //                                                  ^^^^^^^^^^^^^^^^ 时间戳
}
```

**验证方法：**
1. 发送消息："我的名字是张三"
2. AI 应该记住
3. **刷新页面**（F5）
4. 发送消息："我叫什么名字？"
5. AI **不应该**知道名字（因为 session 已清空）

---

### 步骤 2: 测试流式输出

```bash
# 打开控制台（F12）
# 切换到 Console 标签
# 发送一条简单消息
"1+1="
```

**预期日志：**
```
📨 Chat event: { state: "started", ... }
📖 Processing DELTA message (streaming): {
    rawMessage: { content: [...] }
}
🔄 updateStreamingMessage called: {...}
🎨 Formatted content: {...}
📖 Processing DELTA message (streaming): {...}
🔄 updateStreamingMessage called: {...}
✅ Processing FINAL message: {...}
💬 Finalizing streaming message...
```

**预期效果：**
- ✅ 消息逐步显示（不是一次性）
- ✅ 看到 ✍️ 流式指示器
- ✅ 指示器完成后消失
- ✅ 不再显示 `[object Object]`

---

### 步骤 3: 检查消息格式

在控制台中查看日志，特别关注：

```javascript
// 1. 消息类型
messageType: "object"  // 应该是 "object"，不是 "string"

// 2. 消息键
messageKeys: ["content", "role"]  // 标准格式

// 3. 原始消息
rawMessage: {
    content: [
        { type: "text", text: "1+1=" }
    ]
}
```

**如果看到以下情况，说明有问题：**
```
❌ messageType: "string"
❌ messageKeys: null
❌ rawMessage: "1+1="  (应该是对象)
```

---

## 🐛 如果流式输出仍然不生效

### 检查清单

1. **控制台是否有 DELTA 消息日志？**
   - 没有 DELTA 日志 → OpenClaw 没有发送流式消息
   - 有 DELTA 日志 → 继续检查

2. **updateStreamingMessage 是否被调用？**
   - 没有 → delta 处理逻辑有问题
   - 有 → 继续检查

3. **Formatted content 是否正确？**
   - 显示 `[object Object]` → formatMessage 有问题
   - 显示正确文本 → DOM 更新有问题

4. **DOM 中是否有流式消息元素？**
   ```javascript
   // 在控制台执行
   document.querySelectorAll('.message.streaming')
   ```
   - 找不到元素 → 元素创建有问题
   - 找到元素 → 样式或内容更新有问题

---

## 📊 调试命令

```javascript
// 1. 查看流式消息状态
chatWidget.streamingMessages

// 2. 查看 DOM 中的流式元素
document.querySelectorAll('.message.streaming')

// 3. 查看流式元素内容
document.querySelector('.streaming-content')?.innerHTML

// 4. 手动触发测试
chatWidget.updateStreamingMessage('test-run-id', {
    content: [{ type: 'text', text: '测试内容' }]
})

// 5. 查看当前 runId
chatWidget.currentRunId
```

---

## 🎯 成功标志

✅ 控制台看到 `📖 Processing DELTA message` 日志
✅ 控制台看到 `🔄 updateStreamingMessage called` 日志
✅ 消息逐步显示（不是一次性）
✅ 不再显示 `[object Object]`
✅ 每次刷新页面后 AI 不记得之前的对话

---

## 🚀 如果还有问题

请提供以下信息：

1. **完整的控制台日志**（从发送消息到接收回复）
2. **消息的实际结构**（`rawMessage` 字段）
3. **是否看到 DELTA 消息**（是/否）
4. **updateStreamingMessage 是否被调用**（是/否）

---

**准备就绪，开始测试！** 🎯
