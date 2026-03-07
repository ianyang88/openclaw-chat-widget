/**
 * 阿里云 OSS 客户端配置
 */

const OSS = require('ali-oss');

let ossClient = null;
let isConfigured = false;

// 检查是否配置了 OSS 凭证
if (process.env.OSS_ACCESS_KEY_ID && process.env.OSS_ACCESS_KEY_SECRET) {
  try {
    // 从环境变量读取 OSS 配置
    ossClient = new OSS({
      region: process.env.OSS_REGION || 'oss-cn-hangzhou',
      accessKeyId: process.env.OSS_ACCESS_KEY_ID,
      accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
      bucket: process.env.OSS_BUCKET || 'my-openclaw-files',
    });
    isConfigured = true;
  } catch (error) {
    console.warn('⚠️ OSS 客户端初始化失败:', error.message);
  }
} else {
  console.warn('⚠️ 未配置 OSS 凭证，将启用降级模式');
}

/**
 * 验证 OSS 配置是否有效
 * @returns {Promise<boolean>}
 */
async function validateOSSConfig() {
  if (!ossClient) {
    console.warn('⚠️ OSS 客户端未配置');
    return false;
  }

  try {
    // 尝试获取 Bucket 信息来验证配置
    await ossClient.getBucketInfo();
    console.log('✅ OSS 配置验证成功');
    return true;
  } catch (error) {
    console.error('❌ OSS 配置验证失败:', error.message);
    return false;
  }
}

/**
 * 检查 OSS 是否可用
 * @returns {boolean}
 */
function isOSSAvailable() {
  return isConfigured && ossClient !== null;
}

module.exports = {
  ossClient,
  isOSSAvailable,
  validateOSSConfig,
};
