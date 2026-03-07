/**
 * 文件上传路由
 */

const express = require('express');
const router = express.Router();
const { upload } = require('../middleware/upload');
const { uploadToOSS, generateFileMetadata } = require('../services/uploadService');
const { validateUploadRequest } = require('../middleware/validation');
const { isOSSAvailable } = require('../config/oss');

/**
 * POST /api/upload
 * 上传文件到 OSS
 */
router.post('/upload', upload.single('file'), validateUploadRequest, async (req, res) => {
  try {
    console.log('📥 收到上传请求, body:', req.body);
    console.log('📥 file:', req.file);

    // 修复文件名编码问题
    if (req.file && req.file.originalname) {
      try {
        // 尝试修复 UTF-8 编码的文件名
        const iconv = require('iconv-lite');
        // 检测文件名是否是 Latin-1 编码（浏览器默认编码）
        const detected = iconv.decode(Buffer.from(req.file.originalname, 'latin1'), 'utf-8');
        // 如果检测到的字符串有效，使用它；否则使用原始文件名
        if (detected && detected.length > 0) {
          req.file.originalname = detected;
        }
      } catch (e) {
        // 如果转换失败，使用原始文件名
        console.warn('文件名编码转换失败，使用原始文件名:', e.message);
      }
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILE_UPLOADED',
          message: '未找到上传的文件',
        },
      });
    }

    const { userId, sessionKey } = req.body;
    const { v4: uuidv4 } = require('uuid');
    const fileId = uuidv4();

    console.log(`📥 收到上传请求: userId=${userId}, file=${req.file.originalname}, size=${req.file.size}`);

    // 检查 OSS 是否可用
    if (!isOSSAvailable()) {
      console.log('⚠️ OSS 未配置，返回降级信号');
      return res.json({
        success: false,
        fallback: true,
        error: {
          code: 'OSS_UNAVAILABLE',
          message: '云存储服务暂时不可用，请使用 Base64 方式上传',
        },
      });
    }

    // 尝试上传到 OSS
    let ossResult;
    try {
      ossResult = await uploadToOSS(req.file, userId, fileId);
    } catch (ossError) {
      console.error('❌ OSS 上传失败:', ossError.message);

      // 检测是否是连接问题（触发降级）
      if (ossError.code === 'ENOTFOUND' || ossError.code === 'ECONNREFUSED' || ossError.message === 'OSS_UPLOAD_FAILED') {
        console.log('⚠️ OSS 不可用，返回降级信号');
        return res.json({
          success: false,
          fallback: true,
          error: {
            code: 'OSS_UNAVAILABLE',
            message: '云存储服务暂时不可用，请使用 Base64 方式上传',
          },
        });
      }

      // 其他 OSS 错误
      throw ossError;
    }

    // 生成文件元数据
    const fileMetadata = generateFileMetadata(req.file, userId, ossResult.url);

    console.log(`✅ 文件上传成功: ${fileMetadata.fileUrl}`);

    // 使用 JSON.stringify 确保中文字符不被转义
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(JSON.stringify({
      success: true,
      data: fileMetadata,
    }, null, 2));
  } catch (error) {
    console.error('❌ 上传处理失败:', error);

    res.status(500).json({
      success: false,
      error: {
        code: 'UPLOAD_FAILED',
        message: error.message || '文件上传失败',
      },
    });
  }
});

/**
 * GET /api/health
 * 健康检查端点
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'ok',
    oss: isOSSAvailable() ? 'enabled' : 'disabled',
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
