/**
 * 调试 OpenClaw 多次返回消息的问题
 *
 * 问题分析:
 * 1. handleChatEvent 只在 state === 'final' 时显示消息
 * 2. 没有跟踪已处理的 runId，可能导致重复处理或遗漏消息
 * 3. currentRunId 的逻辑可能在多次返回时出现问题
 *
 * 可能的场景:
 * - OpenClaw 对一个用户消息返回多个 assistant 消息
 * - 每个消息都有 state='final'，但 runId 相同或不同
 * - seq 字段表示消息的序列号
 */

console.log('问题分析：多次返回消息处理');

// 当前的 handleChatEvent 逻辑问题：
console.log(`
当前代码问题：

handleChatEvent(params) {
    const { state, message, runId, seq } = params;

    if (state === 'final' && message) {
        this.appendMessage('assistant', message);
        this.hideTypingIndicator();
        this.currentRunId = null;  // ⚠️ 问题：这里立即清空了 runId
        this.emit('message', { role: 'assistant', message, runId });
    }
    // ... 其他状态处理
}

问题：
1. currentRunId 被立即设置为 null
2. 如果同一个 runId 有多个 final 消息，后续消息可能无法正确处理
3. 没有使用 seq 字段来跟踪消息序列
4. 没有去重逻辑，可能重复显示相同消息
`);

// 建议的修复方案
console.log(`
建议的修复方案：

1. 使用 Map 跟踪已处理的消息 (runId + seq)
2. 延迟清空 currentRunId，确保所有消息都处理完毕
3. 支持流式消息的累积显示
4. 添加消息去重逻辑
`);
