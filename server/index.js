/**
 * Express 文件上传服务器
 * 为 OpenClaw Chat Widget 提供文件上传和云存储服务
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const uploadRoutes = require('./routes/upload');
const { handleUploadError } = require('./middleware/upload');
const { getRateLimiter } = require('./middleware/rateLimit');
const { validateOSSConfig } = require('./config/oss');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 中间件配置
// ==========================================

// CORS 配置
const corsOrigin = process.env.CORS_ORIGIN || '*';
app.use(cors({
  origin: corsOrigin,
  credentials: true,
}));

// 处理文件名编码（修复中文文件名乱码）
app.use((req, res, next) => {
  if (req.body) {
    for (const key in req.body) {
      try {
        // 尝试修复可能的 UTF-8 编码问题
        req.body[key] = decodeURIComponent(req.body[key]);
      } catch (e) {
        // 如果解码失败，保持原值
      }
    }
  }
  next();
});

// 解析 JSON 请求体
app.use(express.json());

// 设置 JSON 响应不转义 Unicode 字符（修复中文显示问题）
app.set('json escape', false);

// 解析 URL 编码请求体
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.path}`);
  next();
});

// ==========================================
// 路由
// ==========================================

// 应用速率限制
const rateLimiter = getRateLimiter();
app.use('/api/', rateLimiter);

// 上传路由
app.use('/api', uploadRoutes);

// 根路径
app.get('/', (req, res) => {
  res.json({
    service: 'OpenClaw File Upload Server',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      upload: 'POST /api/upload',
      health: 'GET /api/health',
    },
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 错误处理
// ==========================================

// 404 处理
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `端点 ${req.method} ${req.path} 不存在`,
    },
  });
});

// multer 错误处理
app.use(handleUploadError);

// 全局错误处理
app.use((err, req, res, next) => {
  console.error('❌ 未处理的错误:', err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: '服务器内部错误',
    },
  });
});

// ==========================================
// 启动服务器
// ==========================================

async function startServer() {
  try {
    // 验证 OSS 配置（如果配置了）
    if (process.env.OSS_ACCESS_KEY_ID && process.env.OSS_ACCESS_KEY_SECRET) {
      const ossValid = await validateOSSConfig();
      if (!ossValid) {
        console.warn('⚠️ OSS 配置无效，将启用降级模式');
      }
    } else {
      console.warn('⚠️ 未配置 OSS 凭证，将启用降级模式');
    }

    // 启动 HTTP 服务器
    app.listen(PORT, () => {
      console.log('');
      console.log('=================================');
      console.log('🚀 文件上传服务器已启动');
      console.log('=================================');
      console.log(`📍 监听端口: ${PORT}`);
      console.log(`🌐 服务地址: http://localhost:${PORT}`);
      console.log(`📁 上传端点: http://localhost:${PORT}/api/upload`);
      console.log(`❤️  健康检查: http://localhost:${PORT}/api/health`);
      console.log('=================================');
      console.log('');
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 启动服务器
startServer();

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('⚠️ 收到 SIGTERM 信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('⚠️ 收到 SIGINT 信号，正在关闭服务器...');
  process.exit(0);
});
