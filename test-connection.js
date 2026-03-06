/**
 * 快速测试 OpenClaw Gateway WebSocket 连接
 */

const GATEWAY_URL = 'ws://localhost:18789';
const TOKEN = '9aaa42a43ece4943693100cdbdb68281bfe3c3f43bbff5c5';

console.log('🔌 正在连接到 OpenClaw Gateway...');
console.log('   URL:', GATEWAY_URL);
console.log('   Token:', TOKEN);
console.log('');

const ws = new WebSocket(GATEWAY_URL);

ws.onopen = () => {
    console.log('✅ WebSocket 连接已建立');

    // 发送连接握手消息
    const connectMsg = {
        type: 'req',
        id: 'connect-1',
        minProtocol: 3,
        client: {
            id: 'webchat',
            mode: 'webchat'
        },
        scopes: ['operator.write', 'operator.admin'],
        method: 'connect',
        params: {
            auth: {
                token: TOKEN
            }
        }
    };

    console.log('📤 发送连接握手...');
    ws.send(JSON.stringify(connectMsg));
};

ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log('📥 收到消息:', JSON.stringify(data, null, 2));

    if (data.method === 'connect.ok') {
        console.log('');
        console.log('✅ 认证成功！');
        console.log('');
        console.log('🎯 连接已建立，现在可以发送聊天消息了');
        console.log('📝 访问 http://localhost:8080/local-demo.html 打开聊天界面');
        console.log('');
        ws.close();
    } else if (data.method === 'connect.challenge') {
        console.log('🔐 收到 challenge，nonce:', data.params.nonce);

        // 发送带 nonce 的连接消息
        const connectWithNonce = {
            type: 'req',
            id: 'connect-2',
            minProtocol: 3,
            client: {
                id: 'webchat',
                mode: 'webchat'
            },
            scopes: ['operator.write', 'operator.admin'],
            method: 'connect',
            params: {
                auth: {
                    token: TOKEN
                }
            },
            connect: {
                params: {
                    nonce: data.params.nonce
                }
            }
        };

        console.log('📤 发送认证响应...');
        ws.send(JSON.stringify(connectWithNonce));
    } else if (data.error) {
        console.error('❌ 错误:', data.error);
        ws.close();
    }
};

ws.onerror = (error) => {
    console.error('❌ WebSocket 错误:', error);
};

ws.onclose = () => {
    console.log('🔌 连接已关闭');
    process.exit(0);
};

// 10秒后超时
setTimeout(() => {
    console.log('⏱️  连接超时');
    ws.close();
    process.exit(1);
}, 10000);
