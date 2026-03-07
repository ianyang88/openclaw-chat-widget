#!/usr/bin/env node

/**
 * OpenClaw SessionKey 隔离验证脚本 (HTTP API 版本)
 *
 * 使用 HTTP API 测试 sessionKey 隔离
 */

const http = require('http');

// 配置
const CONFIG = {
    host: '8.148.244.33',
    port: 18789,
    token: '9aaa42a43ece4943693100cdbdb68281bfe3c3f43bbff5c5',
    sessionKeyA: `agent:main:test:userA:${Date.now()}`,
    sessionKeyB: `agent:main:test:userB:${Date.now()}`
};

// 颜色输出
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
    console.log('\n' + '='.repeat(60));
    log(title, 'cyan');
    console.log('='.repeat(60));
}

// 发送 HTTP 请求
function sendRequest(path, data, sessionKey) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);

        const options = {
            hostname: CONFIG.host,
            port: CONFIG.port,
            path: path,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData),
                'Authorization': `Bearer ${CONFIG.token}`
            }
        };

        const req = http.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const result = JSON.parse(responseData);
                    resolve({ status: res.statusCode, data: result });
                } catch (e) {
                    resolve({ status: res.statusCode, data: responseData });
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

// 获取 session 历史记录
async function getSessionHistory(sessionKey) {
    const response = await sendRequest('/tools/invoke', {
        tool: 'session_history',
        args: {
            sessionKey: sessionKey,
            limit: 10
        }
    }, sessionKey);

    return response;
}

// 获取所有 sessions 列表
async function listSessions() {
    const response = await sendRequest('/tools/invoke', {
        tool: 'sessions_list',
        args: { limit: 20 },
        sessionKey: 'agent:main'
    }, 'agent:main');

    return response;
}

// 发送消息到 session
async function sendMessage(sessionKey, message) {
    const response = await sendRequest('/tools/invoke', {
        tool: 'chat.send',
        args: {
            sessionKey: sessionKey,
            message: message
        }
    }, sessionKey);

    return response;
}

// 等待函数
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 主测试流程
async function runVerification() {
    logSection('🔍 OpenClaw SessionKey 隔离验证 (HTTP API)');

    log('\n配置信息:', 'cyan');
    log(`  SessionKey A: ${CONFIG.sessionKeyA}`, 'cyan');
    log(`  SessionKey B: ${CONFIG.sessionKeyB}`, 'cyan');

    // Step 1: 获取初始 sessions 列表
    logSection('步骤 1: 获取初始 sessions 列表');
    let initialSessions;
    try {
        const listResponse = await listSessions();
        initialSessions = listResponse.data?.result?.sessions || [];
        log(`初始 session 数量: ${initialSessions.length}`, 'blue');
        initialSessions.forEach((s, i) => {
            log(`  ${i + 1}. ${s.sessionKey || s.id || 'unknown'}`, 'blue');
        });
    } catch (e) {
        log(`获取初始列表失败: ${e.message}`, 'yellow');
        initialSessions = [];
    }

    await sleep(1000);

    // Step 2: 向 sessionKey A 发送消息
    logSection('步骤 2: 向 sessionKey A 发送消息');
    const messageA = `Test message from User A at ${Date.now()}`;
    try {
        log(`发送消息: ${messageA}`, 'blue');
        await sendMessage(CONFIG.sessionKeyA, messageA);
        log('✅ 消息已发送到 sessionKey A', 'green');
    } catch (e) {
        log(`发送消息失败: ${e.message}`, 'red');
    }

    await sleep(2000);

    // Step 3: 获取 sessionKey A 的历史记录
    logSection('步骤 3: 获取 sessionKey A 的历史记录');
    let historyA = [];
    try {
        const historyResponse = await getSessionHistory(CONFIG.sessionKeyA);
        historyA = historyResponse.data?.result?.messages || [];
        log(`sessionKey A 的消息数: ${historyA.length}`, 'blue');
        historyA.forEach((m, i) => {
            const role = m.role || 'unknown';
            const content = typeof m.content === 'string' ? m.content.substring(0, 50) : JSON.stringify(m.content).substring(0, 50);
            log(`  ${i + 1}. [${role}] ${content}...`, 'blue');
        });
    } catch (e) {
        log(`获取历史记录失败: ${e.message}`, 'yellow');
    }

    await sleep(1000);

    // Step 4: 向 sessionKey B 发送消息
    logSection('步骤 4: 向 sessionKey B 发送消息');
    const messageB = `Test message from User B at ${Date.now()}`;
    try {
        log(`发送消息: ${messageB}`, 'blue');
        await sendMessage(CONFIG.sessionKeyB, messageB);
        log('✅ 消息已发送到 sessionKey B', 'green');
    } catch (e) {
        log(`发送消息失败: ${e.message}`, 'red');
    }

    await sleep(2000);

    // Step 5: 获取 sessionKey B 的历史记录
    logSection('步骤 5: 获取 sessionKey B 的历史记录');
    let historyB = [];
    try {
        const historyResponse = await getSessionHistory(CONFIG.sessionKeyB);
        historyB = historyResponse.data?.result?.messages || [];
        log(`sessionKey B 的消息数: ${historyB.length}`, 'blue');
        historyB.forEach((m, i) => {
            const role = m.role || 'unknown';
            const content = typeof m.content === 'string' ? m.content.substring(0, 50) : JSON.stringify(m.content).substring(0, 50);
            log(`  ${i + 1}. [${role}] ${content}...`, 'blue');
        });
    } catch (e) {
        log(`获取历史记录失败: ${e.message}`, 'yellow');
    }

    await sleep(1000);

    // Step 6: 检查 sessions 列表更新
    logSection('步骤 6: 检查 sessions 列表更新');
    try {
        const listResponse = await listSessions();
        const finalSessions = listResponse.data?.result?.sessions || [];
        log(`最终 session 数量: ${finalSessions.length}`, 'blue');
        finalSessions.forEach((s, i) => {
            log(`  ${i + 1}. ${s.sessionKey || s.id || 'unknown'}`, 'blue');
        });

        const newSessionCount = finalSessions.length - initialSessions.length;
        log(`新增 session 数量: ${newSessionCount}`, 'blue');
    } catch (e) {
        log(`获取最终列表失败: ${e.message}`, 'yellow');
    }

    await sleep(1000);

    // Step 7: 验证隔离
    logSection('步骤 7: 验证隔离状态');

    const aHasAMessage = historyA.some(m => {
        const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        return content.includes('User A');
    });

    const aHasBMessage = historyA.some(m => {
        const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        return content.includes('User B');
    });

    const bHasBMessage = historyB.some(m => {
        const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        return content.includes('User B');
    });

    const bHasAMessage = historyB.some(m => {
        const content = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        return content.includes('User A');
    });

    log(`\nSessionKey A 包含 User A 消息: ${aHasAMessage ? '✅ 是' : '❌ 否'}`, aHasAMessage ? 'green' : 'red');
    log(`SessionKey A 包含 User B 消息: ${aHasBMessage ? '❌ 是 (泄露!)' : '✅ 否'}`, aHasBMessage ? 'red' : 'green');
    log(`SessionKey B 包含 User B 消息: ${bHasBMessage ? '✅ 是' : '❌ 否'}`, bHasBMessage ? 'green' : 'red');
    log(`SessionKey B 包含 User A 消息: ${bHasAMessage ? '❌ 是 (泄露!)' : '✅ 否'}`, bHasAMessage ? 'red' : 'green');

    // 结论
    logSection('📊 测试结论');

    if (!aHasBMessage && !bHasAMessage && aHasAMessage && bHasBMessage) {
        log('\n✅ SessionKey 隔离成功！', 'green');
        log('\nOpenClaw 将完整的 sessionKey 作为唯一标识符。', 'green');
        log('\n建议:', 'green');
        log('  1. 可以按照原计划修复 getSessionKey() 方法', 'green');
        log('  2. 确保 sessionKey 包含时间戳和用户 ID', 'green');
        log('  3. 直接返回 baseSessionKey，不重新生成', 'green');
    } else if (aHasBMessage || bHasAMessage) {
        log('\n❌ SessionKey 隔离失败！', 'red');
        log('\n检测到消息泄露！不同的 sessionKey 返回了相同的消息。', 'red');
        log('\n建议:', 'yellow');
        log('  1. 使用不同的 agent 名称（如 agent:userA, agent:userB）', 'yellow');
        log('  2. 或使用 namespace/prefix 机制', 'yellow');
    } else {
        log('\n⚠️ 测试结果不确定', 'yellow');
        log('\n可能是以下原因:', 'yellow');
        log('  1. 消息尚未被处理（需要更多等待时间）', 'yellow');
        log('  2. API 返回格式与预期不同', 'yellow');
        log('  3. 其他配置问题', 'yellow');
    }

    log('\n' + '='.repeat(60), 'cyan');
    log('测试完成', 'cyan');
    console.log('='.repeat(60) + '\n');
}

// 运行测试
runVerification().catch(error => {
    log(`\n测试失败: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
});
