/**
 * 文件上传服务
 * 处理文件上传到阿里云 OSS
 */

const { v4: uuidv4 } = require('uuid');
const { ossClient } = require('../config/oss');

/**
 * 上传文件到 OSS
 * @param {Object} file - multer 处理后的文件对象
 * @param {string} userId - 用户 ID
 * @param {string} fileId - 文件唯一标识符
 * @returns {Promise<Object>}
 */
async function uploadToOSS(file, userId, fileId) {
  if (!ossClient) {
    throw new Error('OSS_UPLOAD_FAILED');
  }

  try {
    // 构造 OSS 文件路径: userId/fileId/originalFilename
    const fileName = `${userId}/${fileId}/${file.originalname}`;

    console.log(`📤 开始上传到 OSS: ${fileName}`);

    // 上传到 OSS
    const result = await ossClient.put(fileName, file.buffer, {
      headers: {
        'Content-Type': file.mimetype,
      },
    });

    console.log(`✅ OSS 上传成功: ${result.url}`);

    return {
      success: true,
      url: result.url,
      name: fileName,
      etag: result.etag,
    };
  } catch (error) {
    console.error('❌ OSS 上传失败:', error.message);
    throw new Error('OSS_UPLOAD_FAILED');
  }
}

/**
 * 生成文件元数据
 * @param {Object} file - 文件对象
 * @param {string} userId - 用户 ID
 * @param {string} fileUrl - OSS 文件 URL
 * @returns {Object}
 */
function generateFileMetadata(file, userId, fileUrl) {
  const fileId = uuidv4();
  const retentionDays = parseInt(process.env.FILE_RETENTION_DAYS || '7', 10);
  const uploadDate = new Date();
  const expiresAt = new Date(uploadDate);
  expiresAt.setDate(expiresAt.getDate() + retentionDays);

  return {
    fileId,
    userId,
    fileName: file.originalname,
    fileSize: file.size,
    mimeType: file.mimetype,
    fileUrl,
    uploadDate: uploadDate.toISOString(),
    expiresAt: expiresAt.toISOString(),
    retentionDays,
  };
}

module.exports = {
  uploadToOSS,
  generateFileMetadata,
};
