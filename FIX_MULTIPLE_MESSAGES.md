# 修复多次返回消息显示问题

## 问题描述

当 OpenClaw 对一个用户消息返回多个 assistant 消息时，第一次以后的回答没有显示出来。

## 问题原因

1. **过早清空 currentRunId**: 在收到第一个 `state === 'final'` 的消息时，立即将 `currentRunId` 设置为 `null`
2. **缺少消息去重机制**: 没有跟踪已处理的消息，可能导致重复处理或遗漏
3. **不支持多个返回消息**: 逻辑假设每个用户消息只会有一个返回消息

## 修复方案

### 1. 添加消息去重机制

```javascript
// 在构造函数中添加
this.processedMessages = new Set(); // 跟踪已处理的消息 (runId:seq)

// 在 handleChatEvent 中检查消息是否已处理
const messageKey = runId && seq !== undefined ? `${runId}:${seq}` : null;
if (messageKey && this.processedMessages.has(messageKey)) {
    console.log('Skipping duplicate message:', messageKey);
    return;
}
this.processedMessages.add(messageKey);
```

### 2. 改进 currentRunId 管理

```javascript
// 不立即清空 currentRunId，允许同一 runId 的多个消息
// 添加超时机制来确保最终清空
scheduleRunIdTimeout(delay = 3000) {
    if (this.runIdTimeout) {
        clearTimeout(this.runIdTimeout);
    }
    this.runIdTimeout = setTimeout(() => {
        this.clearCurrentRunId();
    }, delay);
}
```

### 3. 支持多个返回消息

```javascript
handleChatEvent(params) {
    const { state, message, runId, seq } = params;

    if (state === 'final' && message) {
        // 检查去重
        // 显示消息
        // 设置超时清空（允许后续消息到达）
    }
    // ... 其他状态处理
}
```

## 测试场景

### 场景 1: 单次返回
```
用户: "你好"
OpenClaw: [final] "你好！有什么我可以帮助你的吗？"
预期: 显示一条消息 ✅
```

### 场景 2: 多次返回
```
用户: "介绍一下自己"
OpenClaw: [final] "我是 OpenClaw AI 助手..."
OpenClaw: [final] "我可以帮助您..."
OpenClaw: [final] "请问有什么问题吗？"
预期: 显示三条消息 ✅
```

### 场景 3: 重复消息
```
用户: "测试"
OpenClaw: [final, seq=1] "收到测试"
OpenClaw: [final, seq=1] "收到测试" (重复)
预期: 只显示一条消息 ✅
```

## 文件修改

### chat-widget.js

1. **构造函数**: 添加 `processedMessages` 和 `runIdTimeout`
2. **handleChatEvent**: 改进消息处理逻辑
3. **sendMessage**: 清理已处理消息记录
4. **新增方法**:
   - `scheduleRunIdTimeout()`: 设置超时清空
   - `clearCurrentRunId()`: 清空 currentRunId 和相关状态

## 测试步骤

1. 刷新浏览器页面 (清除缓存)
2. 打开浏览器开发者工具 (F12)
3. 切换到 Console 标签
4. 在聊天界面发送测试消息
5. 观察控制台输出和消息显示

### 预期控制台输出

```
Chat event: {state: "final", message: {...}, runId: "xxx", seq: 1}
Chat event: {state: "final", message: {...}, runId: "xxx", seq: 2}
Chat event: {state: "final", message: {...}, runId: "xxx", seq: 3}
RunId timeout, clearing currentRunId
```

## 兼容性

- ✅ 向后兼容：不影响现有单次返回消息的功能
- ✅ 性能优化：使用 Set 进行高效的去重检查
- ✅ 内存管理：每次发送新消息时清空已处理消息记录

## 进一步优化

如果需要支持流式消息（如 ChatGPT 的打字效果），可以考虑：

1. 添加消息累积逻辑
2. 支持 `content_delta` 状态
3. 实现打字动画效果

---

修复日期: 2026-03-06
修复者: Claude Code
