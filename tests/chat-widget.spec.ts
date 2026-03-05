/**
 * 组件功能测试
 * 测试聊天组件的核心功能方法
 */

import { test, expect } from '@playwright/test';

test.describe('Chat Widget Component API', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test.html');
    await page.waitForTimeout(1500);
  });

  test('应该正确初始化组件', async ({ page }) => {
    const initialized = await page.evaluate(() => {
      return typeof window.demoWidget !== 'undefined' &&
             typeof window.demoWidget.widget !== 'undefined';
    });
    expect(initialized).toBe(true);
  });

  test('组件应该有正确的方法', async ({ page }) => {
    const methods = await page.evaluate(() => {
      const widget = window.demoWidget?.widget;
      if (!widget) return [];

      return [
        typeof widget.on,
        typeof widget.off,
        typeof widget.emit,
        typeof widget.connect,
        typeof widget.disconnect,
        typeof widget.destroy,
        typeof widget.loadHistory
      ];
    });

    // 所有方法都应该是函数
    methods.forEach(method => {
      expect(method).toBe('function');
    });
  });

  test('on 方法应该添加事件监听器', async ({ page }) => {
    const result = await page.evaluate(() => {
      return new Promise((resolve) => {
        const widget = window.demoWidget?.widget;
        if (!widget) {
          resolve(false);
          return;
        }

        let fired = false;
        widget.on('test-event', () => {
          fired = true;
        });

        widget.emit('test-event', {});

        setTimeout(() => resolve(fired), 100);
      });
    });

    expect(result).toBe(true);
  });

  test('off 方法应该移除事件监听器', async ({ page }) => {
    const result = await page.evaluate(() => {
      const widget = window.demoWidget?.widget;
      if (!widget) return false;

      let count = 0;
      const handler = () => { count++; };

      widget.on('test-off', handler);
      widget.emit('test-off', {});  // count = 1

      widget.off('test-off', handler);
      widget.emit('test-off', {});  // count 应该还是 1

      return count === 1;
    });

    expect(result).toBe(true);
  });

  test('emit 方法应该触发所有监听器', async ({ page }) => {
    const result = await page.evaluate(() => {
      const widget = window.demoWidget?.widget;
      if (!widget) return false;

      const results: number[] = [];

      widget.on('multi-test', () => results.push(1));
      widget.on('multi-test', () => results.push(2));
      widget.on('multi-test', () => results.push(3));

      widget.emit('multi-test', {});

      return results.length === 3 && results.join(',') === '1,2,3';
    });

    expect(result).toBe(true);
  });

  test('disconnect 方法应该断开连接', async ({ page }) => {
    await page.evaluate(() => {
      const widget = window.demoWidget;
      if (!widget) return;

      widget.disconnect();
    });

    await page.waitForTimeout(500);

    const connected = await page.evaluate(() => {
      return window.demoWidget?.widget?.connected;
    });

    expect(connected).toBe(false);
  });

  test('destroy 方法应该清理组件', async ({ page }) => {
    await page.evaluate(() => {
      const widget = window.demoWidget;
      if (!widget) return;

      widget.destroy();
    });

    await page.waitForTimeout(500);

    // 组件容器应该被清空
    const container = page.locator('#chat-widget');
    await expect(container).toBeEmpty();

    // demoWidget 应该还存在但 widget 应该被清理
    const demoWidgetExists = await page.evaluate(() => {
      return typeof window.demoWidget !== 'undefined';
    });
    expect(demoWidgetExists).toBe(true);
  });

  test('loadHistory 方法应该加载历史记录', async ({ page }) => {
    // 模拟模式下 loadHistory 不会有实际效果
    // 但我们可以检查方法是否存在且可调用
    const result = await page.evaluate(() => {
      const widget = window.demoWidget?.widget;
      if (!widget) return false;

      try {
        widget.loadHistory();
        return true;
      } catch (e) {
        return false;
      }
    });

    expect(result).toBe(true);
  });
});

test.describe('消息格式化', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test.html');
    await page.waitForTimeout(1500);
  });

  test('应该正确转义 HTML 特殊字符', async ({ page }) => {
    const input = page.locator('.chat-input');
    const sendBtn = page.locator('.send-btn');

    const dangerousInput = '<script>alert("xss")</script> & <>"\'';
    await input.fill(dangerousInput);
    await sendBtn.click();

    // 检查消息是否被转义
    const userBubble = page.locator('.message.user .message-bubble').first();

    // 应该包含转义后的文本，而不是执行脚本
    const textContent = await userBubble.textContent();
    expect(textContent).toContain('<script>alert("xss")</script>');

    // 不应该有实际的 script 标签
    const innerHTML = await userBubble.innerHTML();
    expect(innerHTML).not.toContain('<script>');
  });

  test('应该正确处理换行符', async ({ page }) => {
    const input = page.locator('.chat-input');
    const sendBtn = page.locator('.send-btn');

    await input.fill('Line 1\nLine 2\nLine 3');
    await sendBtn.click();

    const userBubble = page.locator('.message.user .message-bubble').first();
    const textContent = await userBubble.textContent();

    expect(textContent).toContain('Line 1');
    expect(textContent).toContain('Line 2');
    expect(textContent).toContain('Line 3');
  });

  test('应该正确处理空格', async ({ page }) => {
    const input = page.locator('.chat-input');
    const sendBtn = page.locator('.send-btn');

    await input.fill('  Hello   World  ');
    await sendBtn.click();

    const userBubble = page.locator('.message.user .message-bubble').first();
    const textContent = await userBubble.textContent() || '';

    // 应该保留空格（但 trim() 前后）
    expect(textContent.trim()).toBe('Hello   World');
  });
});

test.describe('边界情况', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test.html');
    await page.waitForTimeout(1500);
  });

  test('应该处理超长消息', async ({ page }) => {
    const input = page.locator('.chat-input');
    const sendBtn = page.locator('.send-btn');

    // 生成超长消息（1000 个字符）
    const longMessage = 'A'.repeat(1000);
    await input.fill(longMessage);
    await sendBtn.click();

    // 应该成功发送
    const userBubble = page.locator('.message.user .message-bubble').first();
    await expect(userBubble).toBeVisible();
  });

  test('应该处理特殊 Unicode 字符', async ({ page }) => {
    const input = page.locator('.chat-input');
    const sendBtn = page.locator('.send-btn');

    const unicodeText = 'Hello 🦀 世界 🌍 🎉 Emoji test 😀';
    await input.fill(unicodeText);
    await sendBtn.click();

    const userBubble = page.locator('.message.user .message-bubble').first();
    const textContent = await userBubble.textContent();

    expect(textContent).toContain('🦀');
    expect(textContent).toContain('世界');
    expect(textContent).toContain('🌍');
  });

  test('应该处理零宽字符', async ({ page }) => {
    const input = page.locator('.chat-input');
    const sendBtn = page.locator('.send-btn');

    // 包含零宽字符
    const textWithZWS = 'Hello\u200BWorld';  // \u200B 是零宽空格
    await input.fill(textWithZWS);
    await sendBtn.click();

    const userBubble = page.locator('.message.user .message-bubble').first();
    await expect(userBubble).toBeVisible();
  });
});

test.describe('状态管理', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test.html');
    await page.waitForTimeout(1500);
  });

  test('应该正确追踪消息状态', async ({ page }) => {
    const input = page.locator('.chat-input');
    const sendBtn = page.locator('.send-btn');

    // 发送消息前
    const isProcessingBefore = await page.evaluate(() => {
      return (window.demoWidget?.widget as any)?.isProcessing;
    });

    expect(isProcessingBefore).toBe(false);

    // 发送消息
    await input.fill('Test state');
    await sendBtn.click();

    // 处理中
    const isProcessingDuring = await page.evaluate(() => {
      return (window.demoWidget?.widget as any)?.isProcessing;
    });

    expect(isProcessingDuring).toBe(true);

    // 等待处理完成
    await page.waitForTimeout(3000);

    const isProcessingAfter = await page.evaluate(() => {
      return (window.demoWidget?.widget as any)?.isProcessing;
    });

    expect(isProcessingAfter).toBe(false);
  });

  test('应该正确存储消息历史', async ({ page }) => {
    const input = page.locator('.chat-input');
    const sendBtn = page.locator('.send-btn');

    // 发送几条消息
    await input.fill('Message 1');
    await sendBtn.click();
    await page.waitForTimeout(2000);

    await input.fill('Message 2');
    await sendBtn.click();
    await page.waitForTimeout(2000);

    // 检查消息历史
    const messages = await page.evaluate(() => {
      return (window.demoWidget as any)?.messages || [];
    });

    expect(messages.length).toBeGreaterThanOrEqual(4); // 2条用户 + 2条助手
    expect(messages[0].role).toBe('user');
    expect(messages[1].role).toBe('assistant');
  });
});
