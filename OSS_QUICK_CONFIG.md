# 🚀 OSS 快速配置 - 5 步完成

## 📝 您需要准备的 4 个信息

1. **AccessKey ID** - 类似 `LTAI5t7xxxxxxxxxxxxxx`
2. **AccessKey Secret** - 类似 `xxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
3. **Bucket 名称** - 类似 `openclaw-files-myapp`
4. **Region** - 例如 `oss-cn-hangzhou`

---

## ⚡ 快速开始（3 种方式）

### 方式 1: 图形界面（推荐新手）

**第 1 步: 创建 Bucket**
```
访问: https://oss.console.aliyun.com/
点击: "创建 Bucket"
填写:
  - Bucket 名称: openclaw-files-yourname（自定义）
  - 地域: 华东1（杭州）
  - 读写权限: 私有
点击: "确定"
```

**第 2 步: 获取 AccessKey**
```
访问: https://ram.console.aliyun.com/manage/ak
点击: "创建 AccessKey"
注意: 只显示一次，立即复制保存！
复制: AccessKey ID 和 Secret
```

**第 3 步: 配置 CORS**
```
回到: https://oss.console.aliyun.com/
选择: 您的 Bucket
点击: "数据安全" → "跨域设置"
点击: "创建规则"
填写:
  - 来源: *
  - 允许 Methods: GET, POST, PUT, DELETE, HEAD
  - 允许 Headers: *
  - 暴露 Headers: ETag, x-oss-request-id
点击: "确定"
```

**第 4 步: 更新配置文件**
```bash
# 编辑配置
nano /root/openclaw-chat-widget/.env

# 修改这 4 行：
OSS_ACCESS_KEY_ID=你的AccessKey_ID
OSS_ACCESS_KEY_SECRET=你的AccessKey_Secret
OSS_BUCKET=你的Bucket名称
OSS_REGION=oss-cn-hangzhou

# 保存: Ctrl+X, Y, Enter
```

**第 5 步: 验证配置**
```bash
/root/openclaw-chat-widget/scripts/simple-oss-test.sh
```

---

### 方式 2: 使用阿里云 CLI（适合开发者）

```bash
# 1. 安装阿里云 CLI
wget https://aliyuncli.alicdn.com/aliyun-cli-linux-latest-amd64.tgz
tar -xzf aliyun-cli-linux-latest-amd64.tgz
sudo mv aliyun /usr/local/bin/

# 2. 配置凭证
aliyun configure

# 3. 创建 Bucket
aliyun oss mb oss://openclaw-files-yourname

# 4. 设置 CORS
aliyun oss put-cors --bucket openclaw-files-yourname --cors-cfg file://cors-config.json

# 5. 更新 .env 文件
nano /root/openclaw-chat-widget/.env
```

---

### 方式 3: 自动化脚本（高级）

如果您有阿里云账号，我可以帮您创建自动化配置脚本。

---

## ✅ 验证配置成功

运行测试脚本：
```bash
/root/openclaw-chat-widget/scripts/simple-oss-test.sh
```

**预期输出:**
```
✅ 所有配置项已填写
✅ OSS 连接成功！
✅ 文件上传成功！
🎉 所有测试通过！
```

---

## 🔄 配置完成后

### 1. 重启服务器
```bash
pkill -f "node server/index.js"
PORT=3001 npm start &
```

### 2. 测试文件上传
```bash
echo "Hello OSS!" > /tmp/test.txt
curl -X POST http://localhost:3001/api/upload \
  -F "file=@/tmp/test.txt" \
  -F "userId=testuser" \
  -F "sessionKey=test"
```

### 3. 验证响应
```json
{
  "success": true,
  "data": {
    "fileUrl": "https://your-bucket.oss-cn-hangzhou.aliyuncs.com/..."
  }
}
```

### 4. 查看上传的文件
访问: https://oss.console.aliyun.com/
→ 选择您的 Bucket
→ 文件管理
→ 查看上传的文件

---

## 🆘 遇到问题？

### 问题 1: 没有阿里云账号
- 注册: https://www.aliyun.com/
- 新用户有免费额度

### 问题 2: AccessKey 找不到
- 访问: https://ram.console.aliyun.com/manage/ak
- 创建新的 AccessKey（注意：只显示一次）

### 问题 3: Bucket 名称已被占用
- 在名称后添加随机数字: `openclaw-files-yourname-123`

### 问题 4: 配置验证失败
- 检查 AccessKey 是否复制完整
- 确认 Bucket 名称正确（不含空格）
- 验证 Region 匹配

---

## 💡 快速命令参考

```bash
# 查看当前配置
cat /root/openclaw-chat-widget/.env

# 编辑配置
nano /root/openclaw-chat-widget/.env

# 运行验证
/root/openclaw-chat-widget/scripts/simple-oss-test.sh

# 重启服务器
pkill -f "node server/index.js" && PORT=3001 npm start &

# 查看服务器日志
tail -f /tmp/claude-0/-root/tasks/*/output
```

---

## 📚 详细文档

- **完整配置指南:** [OSS_SETUP_GUIDE.md](/root/openclaw-chat-widget/OSS_SETUP_GUIDE.md)
- **服务器文档:** [server/README.md](/root/openclaw-chat-widget/server/README.md)
- **快速开始:** [QUICK_START.md](/root/openclaw-chat-widget/QUICK_START.md)

---

**准备好配置了吗？按顺序完成上面的 5 个步骤即可！** 🚀
