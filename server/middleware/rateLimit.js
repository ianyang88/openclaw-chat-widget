/**
 * 速率限制中间件
 */

const rateLimit = require('express-rate-limit');

/**
 * 文件上传速率限制
 * 防止滥用和 DoS 攻击
 */
const uploadRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 分钟
  max: parseInt(process.env.UPLOAD_RATE_LIMIT || '10', 10), // 默认每分钟 10 次
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_REQUESTS',
      message: '上传请求过多，请稍后再试',
    },
  },
  standardHeaders: true, // 返回速率限制信息在 `RateLimit-*` headers
  legacyHeaders: false,
});

/**
 * 根据环境变量决定是否启用速率限制
 */
function getRateLimiter() {
  if (process.env.ENABLE_RATE_LIMIT === 'true') {
    return uploadRateLimit;
  }
  // 返回一个空的中间件（不限制）
  return (req, res, next) => next();
}

module.exports = {
  getRateLimiter,
};
