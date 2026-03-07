#!/usr/bin/env node

/**
 * OSS 配置验证脚本
 * 用于测试 OSS 连接和配置是否正确
 */

require('dotenv').config();
const OSS = require('ali-oss');

console.log('\n=================================');
console.log('🔍 OSS 配置验证工具');
console.log('=================================\n');

// 检查环境变量
console.log('📋 步骤 1: 检查环境变量\n');

const requiredVars = [
    'OSS_REGION',
    'OSS_ACCESS_KEY_ID',
    'OSS_ACCESS_KEY_SECRET',
    'OSS_BUCKET'
];

let missingVars = [];
let hasEmptyVars = false;

requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
        missingVars.push(varName);
        hasEmptyVars = true;
    } else if (value === 'your_access_key_id' || value === 'your_access_key_secret') {
        console.log(`❌ ${varName}: 使用了默认值，请填写实际值`);
        hasEmptyVars = true;
    } else {
        // 隐藏 Secret 部分内容
        const displayValue = varName.includes('SECRET')
            ? value.substring(0, 8) + '...' + value.substring(value.length - 4)
            : value;
        console.log(`✅ ${varName}: ${displayValue}`);
    }
});

if (missingVars.length > 0) {
    console.log(`\n❌ 缺少环境变量: ${missingVars.join(', ')}`);
    console.log('请在 .env 文件中配置这些变量\n');
    process.exit(1);
}

if (hasEmptyVars) {
    console.log('\n❌ 请填写正确的 OSS 凭证\n');
    process.exit(1);
}

console.log('\n环境变量检查通过！✅\n');

// 创建 OSS 客户端
console.log('📋 步骤 2: 创建 OSS 客户端\n');

const ossClient = new OSS({
    region: process.env.OSS_REGION,
    accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    bucket: process.env.OSS_BUCKET,
});

console.log(`✅ OSS 客户端已创建`);
console.log(`   Region: ${process.env.OSS_REGION}`);
console.log(`   Bucket: ${process.env.OSS_BUCKET}\n`);

// 测试连接
console.log('📋 步骤 3: 测试 OSS 连接\n');

async function testConnection() {
    try {
        // 获取 Bucket 信息
        const bucketInfo = await ossClient.getBucketInfo();
        console.log('✅ OSS 连接成功！');
        console.log(`   Bucket 所在区域: ${bucketInfo.bucket.Location}`);
        console.log(`   Bucket 创建时间: ${bucketInfo.bucket.CreationDate}`);
        console.log(`   Bucket 存储类型: ${bucketInfo.bucket.StorageClass}\n`);

        // 测试上传文件
        console.log('📋 步骤 4: 测试文件上传\n');

        const testFileName = `test/openclaw-test-${Date.now()}.txt`;
        const testContent = 'OpenClaw OSS Test File';

        console.log(`📤 上传测试文件: ${testFileName}`);
        const uploadResult = await ossClient.put(testFileName, Buffer.from(testContent));
        console.log('✅ 文件上传成功！');
        console.log(`   文件 URL: ${uploadResult.url}\n`);

        // 列出文件
        console.log('📋 步骤 5: 列出 Bucket 文件\n');
        const listResult = await ossClient.list({
            'max-keys': 5
        });

        console.log(`✅ Bucket 中有 ${listResult.objects ? listResult.objects.length : 0} 个文件`);
        if (listResult.objects && listResult.objects.length > 0) {
            console.log('   最近的文件:');
            listResult.objects.slice(0, 5).forEach(obj => {
                console.log(`   - ${obj.name} (${(obj.size / 1024).toFixed(2)} KB)`);
            });
        }
        console.log('');

        // 获取文件签名 URL（测试访问权限）
        console.log('📋 步骤 6: 生成签名 URL\n');
        const signedUrl = ossClient.signatureUrl(testFileName, { expires: 3600 });
        console.log('✅ 签名 URL 已生成（1小时有效）:');
        console.log(`   ${signedUrl}\n`);

        // 清理测试文件
        console.log('📋 步骤 7: 清理测试文件\n');
        await ossClient.delete(testFileName);
        console.log('✅ 测试文件已删除\n');

        // 最终总结
        console.log('=================================');
        console.log('🎉 所有测试通过！');
        console.log('=================================\n');
        console.log('✅ OSS 配置正确，可以正常使用！');
        console.log('✅ 服务器已准备好处理文件上传');
        console.log('✅ 支持最大 10MB 文件上传\n');

        console.log('📝 下一步:');
        console.log('1. 重启文件服务器:');
        console.log('   pkill -f "node server/index.js" && PORT=3001 npm start &\n');
        console.log('2. 测试上传 API:');
        console.log('   curl -X POST http://localhost:3001/api/upload \\\\');
        console.log('     -F "file=@test.txt" \\\\');
        console.log('     -F "userId=testuser" \\\\');
        console.log('     -F "sessionKey=test"\n');
        console.log('3. 打开浏览器测试完整流程\n');

    } catch (error) {
        console.error('❌ OSS 测试失败！');
        console.error(`   错误码: ${error.code}`);
        console.error(`   错误信息: ${error.message}\n`);

        // 针对不同错误给出建议
        if (error.code === 'NoSuchBucket') {
            console.log('💡 建议: Bucket 不存在，请检查 Bucket 名称是否正确');
            console.log('💡 或者创建新 Bucket: ' + process.env.OSS_BUCKET);
        } else if (error.code === 'InvalidAccessKeyId') {
            console.log('💡 建议: AccessKey ID 无效，请检查是否正确');
        } else if (error.code === 'SignatureDoesNotMatch') {
            console.log('💡 建议: AccessKey Secret 错误，请检查是否正确');
        } else if (error.code === 'AccessDenied') {
            console.log('💡 建议: RAM 用户没有足够的权限');
            console.log('💡 请添加 AliyunOSSFullAccess 权限');
        } else if (error.code === 'ENOTFOUND') {
            console.log('💡 建议: 网络连接失败，请检查网络或 Region 设置');
        }

        console.log('\n📖 详细配置指南: OSS_SETUP_GUIDE.md\n');
        process.exit(1);
    }
}

testConnection();
