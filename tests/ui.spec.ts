/**
 * UI 交互测试
 * 测试聊天组件的用户界面交互
 */

import { test, expect } from '@playwright/test';

test.describe('Chat Widget UI', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到测试页面
    await page.goto('/test.html');
  });

  test('应该正确渲染聊天组件', async ({ page }) => {
    // 检查组件是否存在
    const widget = page.locator('.openclaw-chat-widget');
    await expect(widget).toBeVisible();

    // 检查头部
    await expect(page.locator('.chat-header')).toBeVisible();
    await expect(page.locator('.chat-avatar')).toContainText('🦀');

    // 检查消息区域
    await expect(page.locator('.chat-messages')).toBeVisible();

    // 检查输入区域
    await expect(page.locator('.chat-input-area')).toBeVisible();
    await expect(page.locator('.chat-input')).toBeVisible();
    await expect(page.locator('.send-btn')).toBeVisible();
  });

  test('应该显示欢迎消息', async ({ page }) => {
    const messages = page.locator('.message');
    await expect(messages).toHaveCount(1);

    const welcomeMessage = messages.first();
    await expect(welcomeMessage).toHaveClass(/assistant/);
    await expect(welcomeMessage.locator('.message-bubble')).toContainText('你好');
  });

  test('输入框应该支持输入和自动调整高度', async ({ page }) => {
    const input = page.locator('.chat-input');

    // 初始状态
    await expect(input).toHaveValue('');

    // 输入短文本
    await input.fill('Hello');
    await expect(input).toHaveValue('Hello');

    // 输入多行文本
    const longText = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
    await input.fill(longText);
    await expect(input).toHaveValue(longText);

    // 检查高度是否增加
    const initialHeight = await input.evaluate(el => el.offsetHeight);
    await input.fill(longText + '\nLine 6\nLine 7\nLine 8');
    const newHeight = await input.evaluate(el => el.offsetHeight);
    expect(newHeight).toBeGreaterThan(initialHeight);
  });

  test('发送按钮应该在输入时启用', async ({ page }) => {
    const input = page.locator('.chat-input');
    const sendBtn = page.locator('.send-btn');

    // 初始状态（连接成功后）按钮应该是可用的
    await page.waitForTimeout(1000); // 等待模拟连接成功
    await expect(sendBtn).toBeEnabled();

    // 清空输入后按钮应该禁用
    await input.fill('');
    await expect(sendBtn).toBeDisabled();

    // 输入文本后按钮应该启用
    await input.fill('Test message');
    await expect(sendBtn).toBeEnabled();
  });

  test('Enter 键应该发送消息', async ({ page }) => {
    const input = page.locator('.chat-input');
    const sendBtn = page.locator('.send-btn');

    await page.waitForTimeout(1000); // 等待连接成功

    // 输入消息
    await input.fill('Test message with Enter');

    // 按下 Enter 键
    await input.press('Enter');

    // 检查用户消息是否显示
    const userMessages = page.locator('.message.user');
    await expect(userMessages).toHaveCount(1);
    await expect(userMessages.first().locator('.message-bubble')).toContainText('Test message with Enter');

    // 输入框应该清空
    await expect(input).toHaveValue('');
  });

  test('Shift+Enter 应该换行而不是发送', async ({ page }) => {
    const input = page.locator('.chat-input');
    const sendBtn = page.locator('.send-btn');

    await page.waitForTimeout(1000);

    // 按下 Shift+Enter
    await input.fill('Line 1');
    await input.press('Shift+Enter');
    await input.type('Line 2');

    // 检查输入框内容（应该有两行）
    await expect(input).toHaveValue(/Line 1\nLine 2/);

    // 不应该发送消息
    const userMessages = page.locator('.message.user');
    await expect(userMessages).toHaveCount(0);
  });

  test('点击发送按钮应该发送消息', async ({ page }) => {
    const input = page.locator('.chat-input');
    const sendBtn = page.locator('.send-btn');

    await page.waitForTimeout(1000);

    await input.fill('Click send test');
    await sendBtn.click();

    // 检查用户消息
    const userMessages = page.locator('.message.user');
    await expect(userMessages).toHaveCount(1);
    await expect(userMessages.first().locator('.message-bubble')).toContainText('Click send test');
  });

  test('应该显示正在输入指示器', async ({ page }) => {
    const input = page.locator('.chat-input');
    const sendBtn = page.locator('.send-btn');

    await page.waitForTimeout(1000);

    // 发送消息
    await input.fill('Test typing indicator');
    await sendBtn.click();

    // 检查是否显示 typing indicator
    const typingIndicator = page.locator('.typing-message');
    await expect(typingIndicator).toBeVisible();

    // 等待响应（typing indicator 应该消失）
    await page.waitForTimeout(3000);
    await expect(typingIndicator).not.toBeVisible();
  });

  test('应该收到助手回复', async ({ page }) => {
    const input = page.locator('.chat-input');
    const sendBtn = page.locator('.send-btn');

    await page.waitForTimeout(1000);

    // 发送消息
    await input.fill('Hello');
    await sendBtn.click();

    // 等待助手回复
    const assistantMessages = page.locator('.message.assistant');
    await expect(async () => {
      const count = await assistantMessages.count();
      expect(count).toBeGreaterThan(1); // 至少有欢迎消息和回复
    }).toPass({ timeout: 5000 });
  });

  test('清空聊天按钮应该清空消息', async ({ page }) => {
    const input = page.locator('.chat-input');
    const sendBtn = page.locator('.send-btn');
    const clearBtn = page.locator('[data-action="clear"]');

    await page.waitForTimeout(1000);

    // 发送几条消息
    await input.fill('Message 1');
    await sendBtn.click();
    await page.waitForTimeout(2000);

    await input.fill('Message 2');
    await sendBtn.click();
    await page.waitForTimeout(2000);

    // 检查消息数量
    const messagesBefore = await page.locator('.message').count();
    expect(messagesBefore).toBeGreaterThan(1);

    // 点击清空按钮
    await clearBtn.click();

    // 应该只剩欢迎消息
    const messagesAfter = await page.locator('.message').count();
    expect(messagesAfter).toBe(1);
  });

  test('消息应该有时间戳', async ({ page }) => {
    const messageTime = page.locator('.message-time').first();
    await expect(messageTime).toBeVisible();

    // 时间戳格式应该是 HH:MM
    const timeText = await messageTime.textContent();
    expect(timeText).toMatch(/^\d{2}:\d{2}$/);
  });

  test('消息应该有正确的角色标识', async ({ page }) => {
    const input = page.locator('.chat-input');
    const sendBtn = page.locator('.send-btn');

    await page.waitForTimeout(1000);

    // 发送用户消息
    await input.fill('User message');
    await sendBtn.click();

    // 检查用户消息
    const userMessage = page.locator('.message.user').first();
    await expect(userMessage).toBeVisible();
    await expect(userMessage.locator('.message-avatar')).toContainText('👤');

    // 检查助手消息
    const assistantMessage = page.locator('.message.assistant').first();
    await expect(assistantMessage).toBeVisible();
    await expect(assistantMessage.locator('.message-avatar')).toContainText('🦀');
  });

  test('消息区域应该自动滚动到底部', async ({ page }) => {
    const input = page.locator('.chat-input');
    const sendBtn = page.locator('.send-btn');
    const messagesContainer = page.locator('.chat-messages');

    await page.waitForTimeout(1000);

    // 发送多条消息
    for (let i = 1; i <= 5; i++) {
      await input.fill(`Message ${i}`);
      await sendBtn.click();
      await page.waitForTimeout(500);
    }

    // 检查滚动位置（应该在底部）
    const scrollTop = await messagesContainer.evaluate(el => el.scrollTop);
    const scrollHeight = await messagesContainer.evaluate(el => el.scrollHeight);
    const clientHeight = await messagesContainer.evaluate(el => el.clientHeight);

    // 允许一些误差
    expect(Math.abs(scrollTop + clientHeight - scrollHeight)).toBeLessThan(10);
  });

  test('连接状态应该正确显示', async ({ page }) => {
    const statusDot = page.locator('.status-dot');
    const statusText = page.locator('.status-text');

    // 初始状态：连接中
    await expect(statusDot).toHaveClass(/connecting/);
    await expect(statusText).toContainText('连接中');

    // 等待连接成功
    await page.waitForTimeout(1500);

    // 连接成功状态
    await expect(statusDot).toHaveClass(/connected/);
    await expect(statusText).toContainText('已连接');
  });

  test('消息气泡样式应该正确', async ({ page }) => {
    const input = page.locator('.chat-input');
    const sendBtn = page.locator('.send-btn');

    await page.waitForTimeout(1000);

    await input.fill('Test styles');
    await sendBtn.click();

    // 用户消息气泡
    const userBubble = page.locator('.message.user .message-bubble').first();
    await expect(userBubble).toHaveCSS('background', /rgb(102, 126, 234)/); // 紫色渐变

    // 助手消息气泡
    const assistantBubble = page.locator('.message.assistant .message-bubble').first();
    await expect(assistantBubble).toHaveCSS('background', /rgb(255, 255, 255)/); // 白色
  });

  test('应该禁用重复发送（处理中状态）', async ({ page }) => {
    const input = page.locator('.chat-input');
    const sendBtn = page.locator('.send-btn');

    await page.waitForTimeout(1000);

    // 发送第一条消息
    await input.fill('First message');
    await sendBtn.click();

    // 立即尝试发送第二条消息
    await input.fill('Second message');

    // 在响应返回前，按钮应该被禁用或显示错误
    await page.waitForTimeout(500);
    await sendBtn.click();

    // 应该显示错误提示
    const errorToast = page.locator('.error-toast');
    await expect(errorToast).toBeVisible();
    await expect(errorToast).toContainText('请等待当前消息处理完成');
  });
});

test.describe('响应式设计', () => {
  test('移动端布局应该正确', async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/test.html');

    // 检查组件是否可见
    const widget = page.locator('.openclaw-chat-widget');
    await expect(widget).toBeVisible();

    // 检查消息内容宽度
    const messageContent = page.locator('.message-content').first();
    const maxWidth = await messageContent.evaluate(el => {
      return window.getComputedStyle(el).maxWidth;
    });
    expect(maxWidth).toBe('85%'); // 移动端应该是 85%
  });

  test('桌面端布局应该正确', async ({ page }) => {
    // 设置桌面端视口
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/test.html');

    // 检查消息内容宽度
    const messageContent = page.locator('.message-content').first();
    const maxWidth = await messageContent.evaluate(el => {
      return window.getComputedStyle(el).maxWidth;
    });
    expect(maxWidth).toBe('70%'); // 桌面端应该是 70%
  });
});
