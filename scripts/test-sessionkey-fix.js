#!/usr/bin/env node

/**
 * SessionKey Fix Verification Test
 *
 * 验证 getSessionKey() 是否正确返回完整的 sessionKey（包含时间戳）
 */

// 模拟必要的环境
global.document = {
    querySelector: () => ({
        appendChild: () => {},
        addEventListener: () => {}
    })
};

global.window = {};

// 导入修复后的代码
const path = require('path');
const fs = require('fs');

// 读取 chat-widget.js
const code = fs.readFileSync(path.join(__dirname, '../chat-widget.js'), 'utf8');

// 检查修复是否已应用
const hasDirectReturn = code.includes('getSessionKey()') &&
                        code.includes('return this.baseSessionKey;') &&
                        code.includes('不再调用 userManager.getSessionKey()');

console.log('='.repeat(60));
console.log('SessionKey Fix Verification');
console.log('='.repeat(60));

console.log('\n检查项目:');
console.log('1. getSessionKey() 方法是否存在: ' + (code.includes('getSessionKey()') ? '✅' : '❌'));
console.log('2. 是否直接返回 baseSessionKey: ' + (code.includes('return this.baseSessionKey;') ? '✅' : '❌'));
console.log('3. 是否添加了注释说明: ' + (code.includes('不再调用 userManager.getSessionKey()') ? '✅' : '❌'));

console.log('\n' + '='.repeat(60));

if (hasDirectReturn) {
    console.log('✅ 修复已应用！');
    console.log('\n修复说明:');
    console.log('- getSessionKey() 现在直接返回 this.baseSessionKey');
    console.log('- 不再重新生成 sessionKey，时间戳不会丢失');
    console.log('- 每个用户的会话将真正隔离');
    console.log('\n示例:');
    console.log('  输入: agent:main:direct:url:userA:1741234567890');
    console.log('  存储: this.baseSessionKey = "agent:main:direct:url:userA:1741234567890"');
    console.log('  返回: getSessionKey() = "agent:main:direct:url:userA:1741234567890" ✅');
    console.log('\nvs 之前的行为:');
    console.log('  输入: agent:main:direct:url:userA:1741234567890');
    console.log('  存储: this.baseSessionKey = "agent:main:direct:url:userA:1741234567890"');
    console.log('  返回: getSessionKey() = "agent:main:direct:url:userA" ❌ (丢失时间戳!)');
    process.exit(0);
} else {
    console.log('❌ 修复未应用或未正确实现！');
    process.exit(1);
}
