# 🧪 快速测试指南

## 服务器状态: ✅ 运行中

- **端口:** 3001
- **模式:** 降级模式（OSS 未配置）
- **进程 ID:** 2949971

---

## 📋 测试步骤

### 1️⃣ 测试服务器 API

```bash
# 健康检查
curl http://localhost:3001/api/health

# 预期结果: {"success":true,"status":"ok","oss":"disabled",...}
```

```bash
# 文件上传测试
echo "Hello World - Test File" > /tmp/test.txt
curl -X POST http://localhost:3001/api/upload \
  -F "file=@/tmp/test.txt" \
  -F "userId=testuser" \
  -F "sessionKey=test-session"

# 预期结果: 返回降级信号 (fallback: true)
```

---

### 2️⃣ 测试客户端集成

#### 方式 A: 使用浏览器

1. **打开测试页面**
   ```bash
   # 在浏览器中访问
   file:///root/openclaw-chat-widget/simple-integration.html?id=testuser
   ```

2. **测试文件上传**
   - 点击附件按钮 📎
   - 选择一个文本文件（< 100KB，因为当前是降级模式）
   - 观察进度条显示
   - 点击发送

3. **预期结果**
   - ✅ 显示"云存储服务暂时不可用，使用备用上传方式"
   - ✅ 文件列表显示已上传的文件
   - ✅ 消息发送成功

#### 方式 B: 使用本地服务器

```bash
# 启动简单的 HTTP 服务器
cd /root/openclaw-chat-widget
python3 -m http.server 8080

# 在浏览器访问
http://localhost:8080/simple-integration.html?id=testuser
```

---

### 3️⃣ 测试完整流程

```
1. 打开 simple-integration.html?id=testuser
2. 等待连接到 OpenClaw Gateway
3. 点击附件按钮
4. 选择文件（test.txt）
5. 观察进度条：
   - 文件名显示
   - 百分比（0% → 100%）
   - 上传大小
   - 预计时间
6. 发送消息
7. 检查 AI 是否能分析文件
```

---

## 🔍 验证清单

### 服务器端
- [x] 服务器正常启动
- [x] 健康检查返回 200
- [x] 文件上传接口正常工作
- [x] 降级信号正确返回

### 客户端端
- [ ] 打开页面无错误
- [ ] 点击附件按钮弹出文件选择器
- [ ] 选择文件后显示进度条
- [ ] 进度条实时更新
- [ ] 显示降级提示消息
- [ ] 文件上传到列表
- [ ] 发送消息成功
- [ ] AI 能访问文件内容

---

## 🐛 调试技巧

### 查看服务器日志
```bash
# 实时查看日志
tail -f /tmp/claude-0/-root/tasks/bo4pi937a.output
```

### 查看浏览器控制台
```
按 F12 打开开发者工具
→ Console 标签
→ 查看是否有错误信息
→ 查看网络请求（Network 标签）
```

### 测试网络请求
```bash
# 查看 API 请求详情
curl -v -X POST http://localhost:3001/api/upload \
  -F "file=@/tmp/test.txt" \
  -F "userId=testuser" \
  -F "sessionKey=test-session"
```

---

## 📊 性能测试

### 测试不同大小的文件

```bash
# 1KB 文件
dd if=/dev/zero of=/tmp/test-1k.txt bs=1K count=1

# 10KB 文件
dd if=/dev/zero of=/tmp/test-10k.txt bs=10K count=1

# 100KB 文件（降级模式最大）
dd if=/dev/zero of=/tmp/test-100k.txt bs=100K count=1

# 测试上传
time curl -X POST http://localhost:3001/api/upload \
  -F "file=@/tmp/test-100k.txt" \
  -F "userId=testuser" \
  -F "sessionKey=test-session"
```

---

## 🎯 成功标准

✅ **基本功能**
- 服务器响应所有请求
- 文件上传成功（降级模式）
- 客户端显示降级提示

✅ **用户体验**
- 进度条平滑更新
- 错误消息友好
- 无卡顿或崩溃

✅ **数据完整性**
- 文件内容完整传输
- Base64 编码正确
- AI 能访问文件

---

## 🚀 下一步

### 如果测试通过
1. ✅ 基础功能正常
2. 📝 记录测试结果
3. 🚀 准备生产部署

### 如果测试失败
1. 🔍 查看错误日志
2. 🐛 调试问题
3. 💬 询问开发团队

---

## 📞 快速命令

```bash
# 重启服务器
pkill -f "node server/index.js" && PORT=3001 npm start &

# 查看服务器状态
curl http://localhost:3001/api/health

# 查看服务器日志
tail -20 /tmp/claude-0/-root/tasks/bo4pi937a.output

# 测试上传
echo "test" > /tmp/test.txt && \
curl -X POST http://localhost:3001/api/upload \
  -F "file=@/tmp/test.txt" \
  -F "userId=testuser" \
  -F "sessionKey=test"
```

---

**准备就绪！开始测试吧！** 🎉
