#!/bin/bash

echo "=================================="
echo "⏳ CORS 生效状态监测"
echo "=================================="
echo ""
echo "阿里云 CORS 规则最多需要 15 分钟生效"
echo "此脚本每 2 分钟自动检测一次"
echo ""
echo "开始时间: $(date)"
echo "预计完成: $(date -d '+15 minutes' 2>/dev/null || date -v+15M)"
echo ""
echo "按 Ctrl+C 停止监测"
echo ""
echo "=================================="
echo ""

# 测试次数
test_count=0
max_tests=10  # 最多测试 10 次（20 分钟）

while [ $test_count -lt $max_tests ]; do
    test_count=$((test_count + 1))
    elapsed=$((test_count * 2))

    echo "🔍 第 $test_count 次测试（已等待约 $elapsed 分钟）"
    echo ""

    # 创建测试文件
    TEST_FILE="/tmp/test-cors-$(date +%s).txt"
    echo "CORS Test $(date)" > "$TEST_FILE"

    # 上传文件
    echo "📤 上传测试文件..."
    UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:3001/api/upload \
        -F "file=@$TEST_FILE" \
        -F "userId=cors-test" \
        -F "sessionKey=test" 2>&1)

    # 检查上传是否成功
    if ! echo "$UPLOAD_RESPONSE" | python3 -c "import sys, json; data=json.load(sys.stdin); sys.exit(0 if data.get('success') else 1)" 2>/dev/null; then
        echo "❌ 上传失败，服务器可能未运行"
        echo "请先启动服务器: PORT=3001 npm start &"
        exit 1
    fi

    echo "✅ 文件上传成功"
    echo ""

    # 提取 fileUrl
    FILE_URL=$(echo "$UPLOAD_RESPONSE" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(data['data']['fileUrl'])
except:
    print('ERROR')
" 2>/dev/null)

    if [ "$FILE_URL" = "ERROR" ] || [ -z "$FILE_URL" ]; then
        echo "❌ 无法提取文件 URL"
        sleep 120
        continue
    fi

    echo "📎 文件 URL: $FILE_URL"
    echo ""

    # 测试访问
    echo "🌐 测试文件访问..."

    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FILE_URL" 2>&1)
    CURL_ERROR=$?

    if [ $CURL_ERROR -ne 0 ]; then
        echo "⚠️  网络错误，跳过此次测试"
    elif [ "$HTTP_CODE" = "200" ]; then
        echo ""
        echo "=================================="
        echo "🎉 CORS 已生效！"
        echo "=================================="
        echo ""
        echo "✅ HTTP 状态码: 200 OK"
        echo "✅ 文件可正常访问"
        echo "✅ 已等待: 约 $elapsed 分钟"
        echo ""
        echo "🚀 现在可以开始使用完整功能了！"
        echo ""
        echo "📝 下一步:"
        echo "1. 浏览器访问: simple-integration.html?id=testuser"
        echo "2. 上传文件（最大 10MB）"
        echo "3. 发送消息给 AI"
        echo "4. AI 将成功分析文件内容"
        echo ""
        echo "🎊 恭喜！配置完成！"
        echo ""

        # 清理测试文件
        rm -f "$TEST_FILE"

        exit 0
    elif [ "$HTTP_CODE" = "403" ]; then
        echo "⏳ CORS 未生效（HTTP 403 Forbidden）"
        echo "   文件已上传但无法访问"
        echo ""
        echo "📊 进度: $elapsed / 15 分钟"

        if [ $test_count -lt $max_tests ]; then
            echo "⏰ 2 分钟后重试..."
            echo ""
        fi
    else
        echo "⚠️  意外的状态码: $HTTP_CODE"
        echo "   可能是其他配置问题"
    fi

    # 清理测试文件
    rm -f "$TEST_FILE"

    # 如果不是最后一次测试，等待 2 分钟
    if [ $test_count -lt $max_tests ]; then
        echo "=================================="
        echo ""
        sleep 120
    else
        echo ""
        echo "=================================="
        echo "⚠️  已达到最大测试次数"
        echo "=================================="
        echo ""
        echo "CORS 规则仍未生效"
        echo ""
        echo "建议:"
        echo "1. 检查 OSS 控制台 CORS 配置"
        echo "2. 确认 Bucket 权限为'公共读'"
        echo "3. 联系阿里云技术支持"
        echo ""
        echo "或继续手动测试:"
        echo "  curl -I $FILE_URL"
        echo ""
    fi
done
