#!/bin/bash

# OSS 配置快速检查脚本

echo "=================================="
echo "🔍 OSS 配置快速检查"
echo "=================================="
echo ""

# 检查 .env 文件是否存在
if [ ! -f "/root/openclaw-chat-widget/.env" ]; then
    echo "❌ .env 文件不存在"
    echo "请先创建 .env 文件"
    exit 1
fi

echo "✅ .env 文件存在"
echo ""

# 检查必需的配置项
echo "📋 检查配置项:"
echo ""

source /root/openclaw-chat-widget/.env 2>/dev/null || true

check_config() {
    local var_name=$1
    local var_value=${!var_name}
    local is_secret=$2

    if [ -z "$var_value" ]; then
        echo "❌ $var_name: 未配置"
        return 1
    fi

    if [ "$var_value" = "your_access_key_id" ] || [ "$var_value" = "your_access_key_secret" ] || [ "$var_value" = "my-openclaw-files" ]; then
        echo "⚠️  $var_name: 使用了默认值，请修改"
        return 1
    fi

    if [ "$is_secret" = "true" ]; then
        local len=${#var_value}
        local masked="${var_value:0:8}...${var_value: -4}"
        echo "✅ $var_name: $masked (长度: $len)"
    else
        echo "✅ $var_name: $var_value"
    fi
    return 0
}

# 检查所有配置
all_ok=true

check_config "OSS_REGION" "false" || all_ok=false
check_config "OSS_ACCESS_KEY_ID" "false" || all_ok=false
check_config "OSS_ACCESS_KEY_SECRET" "true" || all_ok=false
check_config "OSS_BUCKET" "false" || all_ok=false

echo ""

if [ "$all_ok" = false ]; then
    echo "❌ 配置不完整，请编辑 .env 文件:"
    echo "   nano /root/openclaw-chat-widget/.env"
    echo ""
    exit 1
fi

echo "✅ 所有配置项已填写"
echo ""

# 运行 Node.js 验证脚本
echo "🔍 运行详细验证..."
echo ""

cd /root/openclaw-chat-widget
node scripts/verify-oss.js
