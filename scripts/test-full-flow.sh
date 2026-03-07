#!/bin/bash

echo "=================================="
echo "🧪 完整流程测试"
echo "=================================="
echo ""

# 1. 检查服务器状态
echo "📋 步骤 1: 检查服务器"
echo ""

HEALTH=$(curl -s http://localhost:3001/api/health)
echo "$HEALTH" | python3 -m json.tool

if echo "$HEALTH" | grep -q '"oss": "enabled"'; then
    echo "✅ OSS 已启用"
else
    echo "❌ OSS 未启用"
    exit 1
fi

echo ""

# 2. 测试文件上传
echo "📋 步骤 2: 测试文件上传"
echo ""

TEST_FILE="/tmp/test-openclaw-$(date +%s).txt"
echo "Hello OpenClaw with OSS! $(date)" > "$TEST_FILE"

echo "📄 创建测试文件: $TEST_FILE"
ls -lh "$TEST_FILE"
echo ""

UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:3001/api/upload \
    -F "file=@$TEST_FILE" \
    -F "userId=testuser" \
    -F "sessionKey=test-session")

echo "$UPLOAD_RESPONSE" | python3 -m json.tool
echo ""

# 提取 fileUrl
FILE_URL=$(echo "$UPLOAD_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    if data.get('success'):
        print(data['data']['fileUrl'])
    else:
        print('ERROR: Upload failed')
        sys.exit(1)
except Exception as e:
    print(f'ERROR: {e}')
    sys.exit(1)
")

if [ "$FILE_URL" = "ERROR: Upload failed" ] || [ -z "$FILE_URL" ]; then
    echo "❌ 文件上传失败"
    exit 1
fi

echo "✅ 文件上传成功"
echo "📎 文件 URL: $FILE_URL"
echo ""

# 3. 测试文件访问
echo "📋 步骤 3: 测试文件访问"
echo ""

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FILE_URL")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ 文件可访问 (HTTP $HTTP_CODE)"
    echo "📄 文件内容:"
    curl -s "$FILE_URL"
    echo ""
else
    echo "⚠️  文件无法访问 (HTTP $HTTP_CODE)"
    echo "💡 需要配置 CORS 或设置 Bucket 为公共读"
    echo "📖 查看配置指南: OSS_CORS_FIX.md"
fi

echo ""

# 4. 总结
echo "=================================="
echo "📊 测试总结"
echo "=================================="
echo ""
echo "✅ 服务器状态: 正常"
echo "✅ OSS 配置: 已启用"
echo "✅ 文件上传: 成功"
echo ""
if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ 文件访问: 成功"
    echo ""
    echo "🎉 所有测试通过！系统已就绪！"
    echo ""
    echo "📝 下一步:"
    echo "1. 打开浏览器访问 simple-integration.html?id=testuser"
    echo "2. 上传文件（最大 10MB）"
    echo "3. 查看实时进度"
    echo "4. 发送消息给 AI"
else
    echo "⚠️  文件访问: 需要配置 CORS"
    echo ""
    echo "📝 必需操作:"
    echo "1. 访问 OSS 控制台: https://oss.console.aliyun.com/"
    echo "2. 选择 Bucket: bot-openclaw-chat"
    echo "3. 配置 CORS（参考 OSS_CORS_FIX.md）"
    echo "4. 重新运行此测试"
fi
echo ""
