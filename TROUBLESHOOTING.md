# 🔧 连接问题故障排查指南

## 🚨 问题：调试工具连接不成功

### 📋 快速诊断清单

#### ✅ 检查 1: 确认服务器状态

在终端中运行以下命令：

```bash
# 检查 OpenClaw Gateway
ps aux | grep openclaw

# 检查端口监听
netstat -tlnp | grep 18789

# 检查 HTTP 服务器
ps aux | grep python

# 检查 HTTP 端口
netstat -tlnp | grep 8080
```

**预期结果:**
- OpenClaw Gateway 进程运行中
- 端口 18789 正在监听
- HTTP 服务器运行中
- 端口 8080 正在监听

---

#### ✅ 检查 2: 测试页面访问

**在浏览器中访问以下 URL:**

1. **简单测试页面** (推荐首先使用)
   ```
   http://localhost:8080/test-connection-simple.html
   ```
   - 点击 "测试连接" 按钮
   - 查看详细的连接日志

2. **原始调试页面**
   ```
   http://localhost:8080/debug-websocket.html
   ```

3. **聊天组件页面**
   ```
   http://localhost:8080/local-demo.html
   ```

---

#### ✅ 检查 3: 浏览器控制台

**按 F12 打开开发者工具，然后:**

1. **切换到 Console 标签**
2. **查找红色错误信息**
3. **特别注意以下错误:**
   - `ERR_CONNECTION_REFUSED`
   - `ERR_CONNECTION_TIMED_OUT`
   - `WebSocket` 相关错误
   - `CORS` 错误
   - `Mixed Content` 错误

---

## 🔍 常见错误及解决方案

### 错误 1: `ERR_CONNECTION_REFUSED`

**原因:** 无法连接到服务器

**解决方案:**

```bash
# 重启 OpenClaw Gateway
sudo systemctl restart openclaw
# 或
openclaw-gateway &

# 重启 HTTP 服务器
cd /root/openclaw-chat-widget
python3 -m http.server 8080
```

---

### 错误 2: `ERR_CONNECTION_TIMED_OUT`

**原因:** 连接超时

**解决方案:**

1. 检查防火墙设置
2. 确认端口 18789 和 8080 没有被阻止
3. 尝试使用 `127.0.0.1` 而不是 `localhost`

---

### 错误 3: 浏览器控制台显示 CORS 错误

**原因:** 跨域访问被阻止

**解决方案:**

检查 OpenClaw 配置文件:

```bash
cat ~/.openclaw/openclaw.json
```

确认 `controlUi.allowedOrigins` 包含:

```json
"controlUi": {
    "allowedOrigins": [
        "http://localhost:18789",
        "http://127.0.0.1:18789",
        "http://localhost:8080",
        "http://127.0.0.1:8080"
    ]
}
```

---

### 错误 4: 页面无法加载 (404)

**原因:** HTTP 服务器未运行或文件路径错误

**解决方案:**

```bash
# 确认在正确的目录
cd /root/openclaw-chat-widget

# 确认文件存在
ls test-connection-simple.html

# 重启 HTTP 服务器
python3 -m http.server 8080
```

---

## 🧪 分步测试流程

### 第 1 步: 测试 HTTP 服务器

在浏览器中访问:
```
http://localhost:8080/
```

**预期:** 看到文件列表或主页

**如果失败:** HTTP 服务器未运行

---

### 第 2 步: 测试 OpenClaw Gateway

在终端中运行:

```bash
curl -I http://localhost:18789
```

**预期:** 返回 HTTP 头信息

**如果失败:** OpenClaw Gateway 未运行

---

### 第 3 步: 测试简单连接页面

在浏览器中访问:
```
http://localhost:8080/test-connection-simple.html
```

1. 点击 "测试连接" 按钮
2. 查看日志输出

**预期:**
```
✅ 浏览器支持 WebSocket
正在连接到: ws://localhost:18789
✅ WebSocket 连接成功！
```

---

### 第 4 步: 检查浏览器兼容性

在浏览器控制台中运行:

```javascript
// 检查 WebSocket 支持
console.log('WebSocket supported:', !!window.WebSocket);

// 检查 localStorage 支持
console.log('localStorage supported:', !!window.localStorage);

// 测试 WebSocket 连接
const testWs = new WebSocket('ws://localhost:18789');
testWs.onopen = () => console.log('✅ WebSocket 连接成功');
testWs.onerror = (e) => console.log('❌ WebSocket 错误:', e);
```

---

## 📱 浏览器要求

**支持的浏览器:**
- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+

**不支持的浏览器:**
- ❌ IE 11 及更早版本
- ❌ 过时的浏览器版本

---

## 🔄 完全重置流程

如果以上都失败，尝试完全重置:

```bash
# 1. 停止所有服务
pkill -f openclaw
pkill -f "python.*http.server"

# 2. 重新启动 OpenClaw
openclaw-gateway &

# 3. 等待几秒
sleep 3

# 4. 确认 OpenClaw 运行
ps aux | grep openclaw

# 5. 重新启动 HTTP 服务器
cd /root/openclaw-chat-widget
python3 -m http.server 8080

# 6. 等待几秒
sleep 2

# 7. 确认端口监听
netstat -tlnp | grep -E '(18789|8080)'

# 8. 清除浏览器缓存并重新加载
```

---

## 📝 收集诊断信息

如果问题仍然存在，请提供以下信息:

1. **浏览器信息**
   - 浏览器名称和版本
   - 操作系统

2. **控制台错误**
   - 完整的错误消息
   - 错误堆栈

3. **服务器状态**
   ```bash
   ps aux | grep -E "(openclaw|python.*8080)"
   netstat -tlnp | grep -E "(18789|8080)"
   ```

4. **网络测试**
   ```bash
   curl -v http://localhost:8080/test-connection-simple.html
   curl -v http://localhost:18789
   ```

---

## 🎯 快速测试命令

**在浏览器控制台中运行:**

```javascript
// 快速 WebSocket 测试
const testWs = new WebSocket('ws://localhost:18789');
testWs.onopen = () => alert('✅ 连接成功！');
testWs.onerror = (e) => alert('❌ 连接失败: ' + e);
testWs.onclose = (e) => console.log('连接关闭:', e.code, e.reason);
```

---

**现在请按照以下步骤操作:**

1. 首先访问 **http://localhost:8080/test-connection-simple.html**
2. 点击 "测试连接" 按钮
3. 查看页面上的日志输出
4. 如果有错误，按 F12 查看浏览器控制台
5. 告诉我看到了什么错误信息

这样我们就能准确定位问题了！
