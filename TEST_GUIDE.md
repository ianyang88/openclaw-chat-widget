# 多次返回消息修复 - 测试指南

## 🎯 修复内容

已修复 OpenClaw 多次返回消息时，后续消息不显示的问题。

## 🔧 主要改进

1. **消息去重机制**: 使用 `runId:seq` 跟踪已处理消息
2. **延迟清空 currentRunId**: 允许同一 runId 的多个消息到达
3. **超时自动清理**: 3秒后自动清空 currentRunId，避免状态卡死
4. **内存管理**: 每次发送新消息时清理旧数据

## 🧪 测试步骤

### 1. 刷新浏览器
```
在浏览器中打开: http://localhost:8080/local-demo.html
按 Ctrl+Shift+R (Windows/Linux) 或 Cmd+Shift+R (Mac) 强制刷新
```

### 2. 打开开发者工具
```
按 F12 打开开发者工具
切换到 Console 标签
```

### 3. 测试单次返回
```
输入: "你好"
预期: 显示一条回复消息
控制台: Chat event: {state: "final", seq: 1, ...}
```

### 4. 测试多次返回 (关键测试)
```
输入: "请从三个方面介绍你自己"
或
输入: "给我讲三个笑话"

预期: 显示多条回复消息
控制台:
  Chat event: {state: "final", seq: 1, ...}
  Chat event: {state: "final", seq: 2, ...}
  Chat event: {state: "final", seq: 3, ...}
```

### 5. 测试快速连续发送
```
快速发送多条消息，验证:
- 每条消息都能正确显示
- 不会出现消息丢失
- 不会出现重复消息
```

## 📊 预期结果

### ✅ 正常情况

```
用户: [消息1]
助手: [回复1.1]
助手: [回复1.2]
助手: [回复1.3]

用户: [消息2]
助手: [回复2.1]
助手: [回复2.2]
```

### ❌ 修复前的问题

```
用户: [消息1]
助手: [回复1.1]  ← 只有第一条显示
                   ← 后续消息丢失

用户: [消息2]
助手: [回复2.1]  ← 同样的问题
```

## 🔍 调试信息

### 控制台日志

正常情况下你应该看到:

```
Chat event: {state: "final", message: {...}, runId: "xxx", seq: 1}
Chat event: {state: "final", message: {...}, runId: "xxx", seq: 2}
Chat event: {state: "final", message: {...}, runId: "xxx", seq: 3}
RunId timeout, clearing currentRunId  ← 3秒后自动清理
```

### 如果看到重复消息

```
Chat event: {state: "final", seq: 1, ...}
Skipping duplicate message: xxx:1  ← 去重逻辑生效
```

## 🛠️ 故障排查

### 问题: 仍然只显示第一条消息

**检查项:**
1. 确认浏览器已强制刷新（清除缓存）
2. 检查控制台是否有 JavaScript 错误
3. 确认 HTTP 服务器正在运行
4. 查看控制台中的 seq 序号是否递增

### 问题: 消息显示重复

**检查项:**
1. 查看控制台是否有 "Skipping duplicate message" 日志
2. 确认 OpenClaw 返回的 seq 是否正确
3. 检查 processedMessages Set 是否正常工作

### 问题: 无法发送新消息

**检查项:**
1. 控制台显示: "请等待当前消息处理完成"
2. 说明 currentRunId 没有被正确清空
3. 等待 3 秒后重试（超时自动清理）
4. 或刷新页面重新开始

## 📈 性能影响

- **内存**: 每个会话额外存储约 1KB 的消息 ID
- **性能**: 去重检查时间复杂度 O(1)，几乎无影响
- **清理**: 每次发送新消息时自动清理旧数据

## 🔄 回滚方案

如果需要回滚到修复前的版本:

```bash
cd /root/openclaw-chat-widget
git status
git checkout chat-widget.js
```

## 📞 反馈问题

如果测试中发现问题，请提供:

1. 完整的控制台日志
2. 重现步骤
3. 浏览器类型和版本
4. 具体的错误信息

---

**修复版本**: 2026-03-06
**测试服务器**: http://localhost:8080/local-demo.html
**状态**: ✅ 准备测试
