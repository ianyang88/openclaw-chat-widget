# 🔍 调试指南 - 检查 OpenClaw 多次返回消息

## 📋 问题诊断步骤

### 第一步：使用 WebSocket 调试工具

1. **打开调试工具**
   ```
   访问: http://localhost:8080/debug-websocket.html
   ```

2. **点击"连接"按钮**
   - 观察"连接状态"变为"已连接"
   - 查看消息日志中的握手过程

3. **点击"发送测试消息"**
   - 发送一条测试消息
   - **重点观察**: "Final 消息数"统计

4. **分析日志**
   - 查看有多少个 `state: "final"` 的消息
   - 记录每个消息的 `seq` (序列号)
   - 查看 `runId` 是否相同

### 第二步：使用聊天组件并查看控制台

1. **打开聊天页面**
   ```
   访问: http://localhost:8080/local-demo.html
   ```

2. **打开浏览器开发者工具** (F12)
   - 切换到 Console 标签
   - 确保可以看到详细日志

3. **发送一条测试消息**
   ```
   建议测试: "请从三个方面介绍你自己"
   或: "给我讲三个不同的笑话"
   ```

4. **查看控制台输出**
   - 寻找 `=== Chat Event Debug ===` 分隔符
   - 统计有多少个 `state: final` 的消息
   - 检查 `Message key` 和 `processed messages`

## 📊 预期结果分析

### 场景 A: OpenClaw 只返回一条消息

**WebSocket 调试工具显示:**
```
Final 消息数: 1
```

**控制台显示:**
```
=== Chat Event Debug ===
State: final
Run ID: xxx
Seq: 1
✅ Added to processed: xxx:1
📨 Appending message to UI...
```

**结论**: OpenClaw 本身只返回了一条消息，不是组件的问题。

---

### 场景 B: OpenClaw 返回多条消息（组件正常工作）

**WebSocket 调试工具显示:**
```
Final 消息数: 3
```

**控制台显示:**
```
=== Chat Event Debug ===
State: final
Seq: 1
✅ Added to processed: xxx:1
📨 Appending message to UI...

=== Chat Event Debug ===
State: final
Seq: 2
✅ Added to processed: xxx:2
📨 Appending message to UI...

=== Chat Event Debug ===
State: final
Seq: 3
✅ Added to processed: xxx:3
📨 Appending message to UI...
```

**聊天界面显示:**
```
助手: [第一条回复]
助手: [第二条回复]
助手: [第三条回复]
```

**结论**: ✅ 组件正常工作！

---

### 场景 C: OpenClaw 返回多条消息（但有重复）

**WebSocket 调试工具显示:**
```
Final 消息数: 3
```

**控制台显示:**
```
=== Chat Event Debug ===
Seq: 1
✅ Added to processed: xxx:1

=== Chat Event Debug ===
Seq: 1  ← 相同的 seq
⚠️ Skipping duplicate message: xxx:1  ← 被去重过滤

=== Chat Event Debug ===
Seq: 2
✅ Added to processed: xxx:2
```

**结论**: ✅ 去重机制正常工作！

---

### 场景 D: 组件接收多条但只显示一条

**WebSocket 调试工具显示:**
```
Final 消息数: 3  ← 确认收到3条
```

**控制台显示:**
```
=== Chat Event Debug ===
Seq: 1
✅ Added to processed: xxx:1
📨 Appending message to UI...

=== Chat Event Debug ===
Seq: 2
✅ Added to processed: xxx:2
📨 Appending message to UI...

=== Chat Event Debug ===
Seq: 3
✅ Added to processed: xxx:3
📨 Appending message to UI...
```

**聊天界面显示:**
```
助手: [只有一条消息]  ← 问题！
```

**结论**: ❌ UI 渲染有问题，需要检查 `appendMessage` 函数。

---

## 🔧 故障排查

### 问题 1: 调试工具无法连接

**检查:**
1. HTTP 服务器是否运行: `ps aux | grep python`
2. OpenClaw Gateway 是否运行: `ps aux | grep openclaw`
3. 端口是否正确: 18789

**解决:**
```bash
# 重启 HTTP 服务器
cd /root/openclaw-chat-widget
python3 -m http.server 8080
```

### 问题 2: 看到 "Skipping duplicate message"

**说明:** 这是正常的去重逻辑在工作

**验证:**
- 检查跳过的消息是否真的重复
- 确认 `seq` 序列号是否相同

### 问题 3: 控制台没有 "Chat Event Debug"

**检查:**
1. 浏览器是否强制刷新 (Ctrl+Shift+R)
2. 是否有 JavaScript 错误
3. chat-widget.js 是否正确加载

**解决:**
```javascript
// 在控制台中检查
console.log(window.chatWidget);
```

## 📝 收集诊断信息

请提供以下信息：

1. **WebSocket 调试工具截图**
   - 连接状态
   - 消息统计
   - Final 消息数

2. **浏览器控制台截图**
   - 完整的 "Chat Event Debug" 日志
   - 特别是 `state`, `seq`, `Message key` 部分

3. **聊天界面截图**
   - 显示了多少条助手回复

4. **测试消息**
   - 你发送的具体消息内容

## 🎯 快速测试命令

在浏览器控制台中运行:

```javascript
// 检查组件状态
console.log('Connected:', window.chatWidget.connected);
console.log('Current runId:', window.chatWidget.currentRunId);
console.log('Processed messages:', Array.from(window.chatWidget.processedMessages));

// 手动触发消息发送
window.chatWidget.sendMessage("测试消息 " + new Date().toLocaleTimeString());
```

---

**现在请按照以下步骤操作:**

1. 访问 `http://localhost:8080/debug-websocket.html`
2. 连接并发送测试消息
3. 记录 "Final 消息数" 的值
4. 访问 `http://localhost:8080/local-demo.html`
5. 打开控制台 (F12)
6. 发送测试消息
7. 复制完整的控制台日志

这样我们就能确定问题到底在哪里了！
