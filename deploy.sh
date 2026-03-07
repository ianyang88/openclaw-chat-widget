#!/bin/bash

# ============================================================
# 服务器部署脚本 - 自动配置环境变量
# ============================================================
#
# 用途: 在服务器上首次部署或更新时运行此脚本
# 功能: 检查并创建 .env 文件（如果不存在）
#

set -e

echo "=================================="
echo "🚀 OpenClaw Chat Widget 服务器部署"
echo "=================================="
echo ""

# 项目目录
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

echo "📁 项目目录: $PROJECT_DIR"
echo ""

# 检查 .env 文件是否存在
if [ -f ".env" ]; then
    echo "✅ .env 文件已存在"
    echo ""

    # 检查必需的配置项
    source .env

    MISSING_CONFIGS=()

    if [ -z "$OSS_ACCESS_KEY_ID" ] || [ "$OSS_ACCESS_KEY_ID" = "your_access_key_id" ]; then
        MISSING_CONFIGS+=("OSS_ACCESS_KEY_ID")
    fi

    if [ -z "$OSS_ACCESS_KEY_SECRET" ] || [ "$OSS_ACCESS_KEY_SECRET" = "your_access_key_secret" ]; then
        MISSING_CONFIGS+=("OSS_ACCESS_KEY_SECRET")
    fi

    if [ ${#MISSING_CONFIGS[@]} -eq 0 ]; then
        echo "✅ 所有配置项已填写"
        echo ""
        echo "🎉 配置完成！可以启动服务器了"
        echo ""
        echo "启动命令:"
        echo "  npm start"
        echo ""
        echo "或使用 PM2:"
        echo "  pm2 start server/index.js --name openclaw-upload-server"
    else
        echo "⚠️  以下配置项需要填写:"
        echo ""
        for config in "${MISSING_CONFIGS[@]}"; do
            echo "  - $config"
        done
        echo ""
        echo "请编辑 .env 文件:"
        echo "  nano .env"
        echo ""
        echo "然后重新运行此脚本"
    fi
else
    echo "⚠️  .env 文件不存在"
    echo ""
    echo "正在创建 .env 文件..."

    # 检查 .env.example 是否存在
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ 已从 .env.example 创建 .env 文件"
    else
        # 创建基本的 .env 文件
        cat > .env << 'EOM'
# ==========================================
# 文件服务器配置
# ==========================================
PORT=3001
FILE_SERVER_URL=http://8.148.244.33:3001

# ==========================================
# 阿里云 OSS 配置
# ==========================================
OSS_REGION=oss-cn-guangzhou
OSS_ACCESS_KEY_ID=your_access_key_id
OSS_ACCESS_KEY_SECRET=your_access_key_secret
OSS_BUCKET=your_bucket_name

# ==========================================
# 文件上传限制
# ==========================================
MAX_FILE_SIZE=10485760        # 10MB (bytes)
UPLOAD_RATE_LIMIT=10          # 每分钟最多上传次数

# ==========================================
# 文件生命周期
# ==========================================
FILE_RETENTION_DAYS=7         # 文件保留天数（自动删除）

# ==========================================
# 安全配置
# ==========================================
CORS_ORIGIN=*                 # CORS 允许的来源
ENABLE_RATE_LIMIT=true        # 是否启用速率限制
EOM
        echo "✅ 已创建 .env 文件"
    fi

    echo ""
    echo "⚠️  重要: 请填写 OSS 配置信息"
    echo ""
    echo "编辑命令:"
    echo "  nano .env"
    echo ""
    echo "需要填写的配置项:"
    echo "  - OSS_ACCESS_KEY_ID      (阿里云 AccessKey ID)"
    echo "  - OSS_ACCESS_KEY_SECRET  (阿里云 AccessKey Secret)"
    echo "  - OSS_BUCKET             (Bucket 名称)"
    echo "  - OSS_REGION            (可选，默认 oss-cn-guangzhou)"
    echo ""
    echo "💡 提示:"
    echo "  - 获取 AccessKey: https://ram.console.aliyun.com/manage/ak"
    echo "  - 创建 Bucket: https://oss.console.aliyun.com/"
    echo "  - 配置 CORS: 参考 OSS_SETUP_GUIDE.md"
    echo ""
    echo "配置完成后，重新运行此脚本验证"
fi

echo ""
echo "=================================="
echo "📋 快速命令"
echo "=================================="
echo ""
echo "编辑配置:"
echo "  nano .env"
echo ""
echo "启动服务器:"
echo "  npm start"
echo ""
echo "使用 PM2 (推荐):"
echo "  pm2 start server/index.js --name openclaw-upload-server"
echo ""
echo "查看日志:"
echo "  pm2 logs openclaw-upload-server"
echo ""
echo "停止服务器:"
echo "  pm2 stop openclaw-upload-server"
echo ""
echo "重启服务器:"
echo "  pm2 restart openclaw-upload-server"
echo ""
echo "=================================="
