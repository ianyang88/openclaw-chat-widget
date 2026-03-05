/**
 * WebSocket 通信测试
 * 测试聊天组件的 WebSocket 消息收发逻辑
 */

import { test, expect } from '@playwright/test';

test.describe('WebSocket Communication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test.html');
    // 等待模拟连接成功
    await page.waitForTimeout(1500);
  });

  test('应该初始化 WebSocket 连接', async ({ page }) => {
    // 通过页面状态检查连接
    const connected = await page.evaluate(() => {
      return window.demoWidget?.widget?.connected;
    });
    expect(connected).toBe(true);
  });

  test('应该发送 chat.send 请求', async ({ page }) => {
    // 监听 console.log 来查看发送的消息
    const logs: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'log') {
        logs.push(msg.text());
      }
    });

    const input = page.locator('.chat-input');
    const sendBtn = page.locator('.send-btn');

    await input.fill('WebSocket test message');
    await sendBtn.click();

    // 等待处理
    await page.waitForTimeout(2000);

    // 检查是否记录了消息事件
    const hasMessageLog = logs.some(log => log.includes('消息:') || log.includes('Message'));
    expect(hasMessageLog).toBe(true);
  });

  test('应该触发 connected 事件', async ({ page }) => {
    const eventFired = await page.evaluate(() => {
      return new Promise((resolve) => {
        const widget = window.demoWidget;
        if (!widget) {
          resolve(false);
          return;
        }

        let connectedFired = false;
        widget.on('connected', () => {
          connectedFired = true;
        });

        // 等待一下让事件有机会触发
        setTimeout(() => resolve(connectedFired), 500);
      });
    });

    expect(eventFired).toBe(true);
  });

  test('应该触发 message 事件', async ({ page }) => {
    const input = page.locator('.chat-input');
    const sendBtn = page.locator('.send-btn');

    const messageEvents = await page.evaluate(async () => {
      const events: any[] = [];
      const widget = window.demoWidget;

      if (!widget) return events;

      widget.on('message', (data: any) => {
        events.push(data);
      });

      // 等待用户发送消息
      await new Promise(resolve => setTimeout(resolve, 500));

      return events;
    });

    // 发送用户消息
    await input.fill('Test message event');
    await sendBtn.click();
    await page.waitForTimeout(1000);

    // 再次检查事件
    const eventsAfter = await page.evaluate(() => {
      return (window as any).messageEvents || [];
    });

    // 应该至少有用户消息事件
    expect(eventsAfter.length).toBeGreaterThan(0);
  });

  test('应该正确处理多轮对话', async ({ page }) => {
    const input = page.locator('.chat-input');
    const sendBtn = page.locator('.send-btn');

    const messages: string[] = [];

    // 发送多轮消息
    const questions = ['你好', '帮助', '再见'];

    for (const question of questions) {
      await input.fill(question);
      await sendBtn.click();

      // 等待回复
      await page.waitForTimeout(2500);

      // 收集消息
      const currentMessages = await page.locator('.message-bubble').allTextContents();
      messages.push(...currentMessages);
    }

    // 应该包含所有问题和回复
    for (const question of questions) {
      expect(messages.some(m => m.includes(question))).toBe(true);
    }
  });

  test('应该正确格式化消息内容', async ({ page }) => {
    const input = page.locator('.chat-input');
    const sendBtn = page.locator('.send-btn');

    // 发送包含特殊字符的消息
    const specialMessage = 'Test <script>alert("test")</script> & quotes"';
    await input.fill(specialMessage);
    await sendBtn.click();

    // 检查消息是否被正确转义
    const userBubble = page.locator('.message.user .message-bubble').first();
    const textContent = await userBubble.textContent();

    // 不应该包含原始的 script 标签（应该被转义）
    expect(textContent).toContain(specialMessage);
  });

  test('应该处理空消息', async ({ page }) => {
    const input = page.locator('.chat-input');
    const sendBtn = page.locator('.send-btn');

    // 尝试发送空消息
    await input.fill('   ');  // 只有空格
    await sendBtn.click();

    // 不应该添加任何消息
    const userMessages = page.locator('.message.user');
    await expect(userMessages).toHaveCount(0);
  });

  test('应该正确处理时间戳', async ({ page }) => {
    const input = page.locator('.chat-input');
    const sendBtn = page.locator('.send-btn');

    // 获取发送前的时间
    const beforeTime = new Date();
    const beforeHours = beforeTime.getHours().toString().padStart(2, '0');
    const beforeMinutes = beforeTime.getMinutes().toString().padStart(2, '0');

    await input.fill('Timestamp test');
    await sendBtn.click();

    // 获取消息时间戳
    const messageTime = page.locator('.message.user .message-time').first();
    const timeText = await messageTime.textContent();

    // 时间应该接近当前时间
    expect(timeText).toMatch(/^\d{2}:\d{2}$/);

    // 检查小时和分钟是否合理（允许 1 分钟误差）
    const [hours, minutes] = (timeText || '').split(':').map(Number);
    const currentMinutes = parseInt(beforeMinutes) + 1;

    expect(hours).toBe(parseInt(beforeHours));
    expect(minutes).toBeGreaterThanOrEqual(parseInt(beforeMinutes));
    expect(minutes).toBeLessThanOrEqual(currentMinutes);
  });

  test('应该正确设置 sessionKey', async ({ page }) => {
    const sessionKey = await page.evaluate(() => {
      return window.demoWidget?.widget?.sessionKey;
    });

    expect(sessionKey).toBe('agent:main:main');
  });

  test('应该支持事件监听器的添加和移除', async ({ page }) => {
    const result = await page.evaluate(() => {
      const widget = window.demoWidget;
      if (!widget) return false;

      let callCount = 0;

      const handler = () => {
        callCount++;
      };

      // 添加监听器
      widget.on('test-event', handler);

      // 触发事件
      widget.widget.emit('test-event', {});

      // 移除监听器
      widget.off('test-event', handler);

      // 再次触发（不应该调用）
      widget.widget.emit('test-event', {});

      return callCount === 1;
    });

    expect(result).toBe(true);
  });

  test('应该支持销毁组件', async ({ page }) => {
    const result = await page.evaluate(() => {
      const widget = window.demoWidget;
      if (!widget) return false;

      // 销毁组件
      widget.destroy();

      // 检查组件是否被清理
      const container = document.querySelector('#chat-widget');
      return container && container.innerHTML === '';
    });

    expect(result).toBe(true);
  });
});

test.describe('WebSocket 错误处理', () => {
  test('应该处理连接失败情况', async ({ page, context }) => {
    // 模拟网络失败
    await context.setOffline(true);

    await page.goto('/test.html');

    // 等待连接尝试
    await page.waitForTimeout(3000);

    // 检查错误状态
    const statusDot = page.locator('.status-dot');
    await expect(statusDot).toHaveClass(/disconnected/);
  });

  test('应该处理消息发送失败', async ({ page }) => {
    // 这个测试需要在真实 WebSocket 环境中
    // 模拟模式下会一直返回成功
    const input = page.locator('.chat-input');
    const sendBtn = page.locator('.send-btn');

    await page.waitForTimeout(1500);

    // 连续快速发送多条消息
    for (let i = 0; i < 3; i++) {
      await input.fill(`Message ${i}`);
      await sendBtn.click();
      await page.waitForTimeout(100);
    }

    // 应该显示错误提示（因为上一条消息还在处理）
    const errorToast = page.locator('.error-toast');
    await expect(errorToast).toBeVisible();
  });
});
