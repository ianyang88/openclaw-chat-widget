/**
 * Demo 脚本 - 模拟 OpenClaw WebSocket 响应
 * 用于演示聊天组件功能，不需要真实的 OpenClaw 服务器
 */

// 模拟的 AI 回复库
const mockResponses = [
    "你好！我是 OpenClaw 助手。我可以帮你处理各种任务，比如编写代码、分析文档、发送消息等。",
    "这是一个很好的问题！让我来帮你分析一下...",
    "根据我的理解，你想要实现一个功能。我可以帮你编写相应的代码。",
    "我明白了。让我帮你处理这个任务...",
    "好的，我已经收到你的消息。请稍等，我正在处理中...",
    "这个请求涉及到多个步骤，让我逐一为你处理。",
    "非常有趣的想法！我们可以进一步探讨这个话题。",
    "我需要更多信息来帮助你。能否提供更多细节？"
];

// 模拟工具调用响应
const mockToolCalls = [
    { name: 'web_search', status: 'searching...' },
    { name: 'code_generation', status: 'generating...' },
    { name: 'file_read', status: 'reading...' }
];

class MockOpenClawWidget {
    constructor(options = {}) {
        this.container = typeof options.container === 'string'
            ? document.querySelector(options.container)
            : options.container;

        this.sessionKey = options.sessionKey || 'agent:main:main';
        this.messages = [];

        // 模拟状态
        this.isProcessing = false;
        this.typingTimeout = null;

        this.init();
    }

    init() {
        // 使用真实的 chat-widget.js 但覆盖 WebSocket 部分
        this.widget = new OpenClawChatWidget({
            container: this.container,
            gatewayUrl: 'ws://mock-server:18789',
            sessionKey: this.sessionKey
        });

        // 覆盖连接方法
        this.widget.connect = () => {
            setTimeout(() => {
                this.widget.connected = true;
                this.widget.updateStatus('connected');
                this.widget.emit('connected');
            }, 500);
        };

        // 覆盖发送消息方法
        const originalSendMessage = this.widget.sendMessage.bind(this.widget);
        this.widget.sendMessage = async () => {
            const { input } = this.widget.elements;
            const message = input.value.trim();

            if (!message) return;
            if (this.isProcessing) {
                this.widget.showError('请等待当前消息处理完成');
                return;
            }

            // 清空输入框
            input.value = '';
            this.widget.updateSendButton();
            this.widget.autoResizeInput();

            // 显示用户消息
            this.widget.appendMessage('user', message);
            this.messages.push({ role: 'user', content: message });

            // 模拟处理
            this.isProcessing = true;
            this.widget.showTypingIndicator();

            // 模拟网络延迟
            await this.delay(1000 + Math.random() * 2000);

            // 随机选择回复
            const response = this.selectResponse(message);
            this.widget.hideTypingIndicator();
            this.widget.appendMessage('assistant', response);
            this.messages.push({ role: 'assistant', content: response });

            this.isProcessing = false;
        };

        // 初始化连接
        this.widget.connect();
    }

    selectResponse(userMessage) {
        // 根据用户消息选择合适的回复
        const lowerMessage = userMessage.toLowerCase();

        if (lowerMessage.includes('代码') || lowerMessage.includes('编程') || lowerMessage.includes('function')) {
            return "好的，我来帮你写代码。以下是一个示例：\n\n```javascript\nfunction hello() {\n    console.log('Hello, OpenClaw!');\n}\n```\n\n你需要什么功能的代码？";
        }

        if (lowerMessage.includes('你好') || lowerMessage.includes('hi') || lowerMessage.includes('hello')) {
            return "你好！很高兴见到你。有什么我可以帮助你的吗？";
        }

        if (lowerMessage.includes('再见') || lowerMessage.includes('bye')) {
            return "再见！如果还有需要帮助的地方，随时来找我。";
        }

        if (lowerMessage.includes('帮助') || lowerMessage.includes('help')) {
            return "我可以帮你做很多事情：\n\n📝 编写代码\n🔍 搜索信息\n📄 分析文档\n📧 发送消息\n📅 安排提醒\n\n你想让我帮你做什么？";
        }

        // 随机回复
        return mockResponses[Math.floor(Math.random() * mockResponses.length)];
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // 代理方法
    on(event, callback) {
        return this.widget.on(event, callback);
    }

    disconnect() {
        return this.widget.disconnect();
    }

    destroy() {
        return this.widget.destroy();
    }
}

// 初始化演示
document.addEventListener('DOMContentLoaded', () => {
    // 使用模拟版本进行演示
    const demoWidget = new MockOpenClawWidget({
        container: '#chat-widget',
        sessionKey: 'agent:default:webchat:channel:default'
    });

    // 监听事件
    demoWidget.on('connected', () => {
        console.log('✅ 已连接到模拟的 OpenClaw Gateway');
    });

    demoWidget.on('message', (data) => {
        console.log('💬 消息:', data);
    });

    // 导出到全局以便调试
    window.demoWidget = demoWidget;

    // 添加欢迎提示
    console.log(`
    ╔════════════════════════════════════════════════╗
    ║  OpenClaw Chat Widget Demo                      ║
    ║                                                  ║
    ║  这是一个演示版本，使用模拟数据                ║
    ║  无需真实的 OpenClaw 服务器                     ║
    ║                                                  ║
    ║  在控制台中可访问:                              ║
    ║  - demoWidget: 聊天组件实例                     ║
    ║                                                  ║
    ╚════════════════════════════════════════════════╝
    `);
});
