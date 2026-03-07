/**
 * 请求验证中间件
 */

/**
 * 验证上传请求的必需字段
 */
function validateUploadRequest(req, res, next) {
  const { userId, sessionKey } = req.body;

  if (!userId || typeof userId !== 'string') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_USER_ID',
        message: '缺少或无效的用户 ID',
      },
    });
  }

  if (!sessionKey || typeof sessionKey !== 'string') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_SESSION_KEY',
        message: '缺少或无效的会话标识',
      },
    });
  }

  // 验证 userId 格式（防止路径遍历攻击）
  if (userId.includes('..') || userId.includes('/') || userId.includes('\\')) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_USER_ID_FORMAT',
        message: '用户 ID 格式无效',
      },
    });
  }

  next();
}

module.exports = {
  validateUploadRequest,
};
