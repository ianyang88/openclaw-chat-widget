/**
 * OAuth2Handler - OAuth2 认证处理器 (支持 PKCE)
 * 实现 OAuth 2.0 Authorization Code Flow with PKCE
 */
class OAuth2Handler {
    constructor(config) {
        this.sessionManager = config.sessionManager;
        this.userManager = config.userManager;

        // OAuth2 配置
        this.authorizationEndpoint = config.authorizationEndpoint;
        this.tokenEndpoint = config.tokenEndpoint;
        this.clientId = config.clientId;
        this.redirectUri = config.redirectUri || (window.location.origin + '/oauth-callback');
        this.scope = config.scope || 'openid profile email';
        this.usePopup = config.usePopup !== false; // 默认使用弹窗

        // 额外配置
        this.responseType = config.responseType || 'code';
        this.prompt = config.prompt; // 可选: 'none', 'login', 'consent'

        // 事件监听器
        this.eventListeners = new Map();

        // 回调监听器
        this.callbackHandler = null;

        // Token 刷新定时器
        this.refreshTimer = null;
    }

    /**
     * 开始 OAuth2 认证流程
     */
    async authenticate() {
        // 生成 PKCE 参数
        const { codeVerifier, codeChallenge } = await this.generatePKCEParameters();
        const state = this.generateState();

        // 保存 PKCE verifier 和 state
        this.sessionManager.savePKCEVerifier(codeVerifier);
        this.sessionManager.saveOAuthState(state);

        // 构建授权 URL
        const authUrl = this.buildAuthorizationUrl(codeChallenge, state);

        if (this.usePopup) {
            // 使用弹窗模式
            await this.authenticateWithPopup(authUrl, state);
        } else {
            // 使用重定向模式
            window.location.href = authUrl;
        }
    }

    /**
     * 使用弹窗进行认证
     */
    authenticateWithPopup(authUrl, state) {
        return new Promise((resolve, reject) => {
            // 计算弹窗尺寸
            const width = 500;
            const height = 600;
            const left = (window.screen.width - width) / 2;
            const top = (window.screen.height - height) / 2;

            // 打开弹窗
            const popup = window.open(
                authUrl,
                'oauth2-popup',
                `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
            );

            if (!popup) {
                reject(new Error('无法打开登录窗口，请检查弹窗是否被拦截'));
                return;
            }

            // 监听弹窗关闭
            const checkPopup = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkPopup);
                    if (!this.isAuthenticated()) {
                        reject(new Error('登录窗口被关闭'));
                    }
                }
            }, 1000);

            // 设置回调处理器
            this.setupCallbackHandler((result) => {
                clearInterval(checkPopup);
                popup.close();

                if (result.error) {
                    reject(new Error(result.error_description || result.error));
                } else {
                    this.handleCallback(result).then(resolve).catch(reject);
                }
            });

            // 设置超时
            setTimeout(() => {
                if (!popup.closed) {
                    popup.close();
                }
                clearInterval(checkPopup);
                reject(new Error('登录超时'));
            }, 5 * 60 * 1000); // 5分钟超时
        });
    }

    /**
     * 设置回调处理器
     */
    setupCallbackHandler(callback) {
        this.callbackHandler = callback;

        // 监听来自弹窗的消息
        window.addEventListener('message', this.handleMessageEvent);
    }

    /**
     * 处理来自弹窗的消息
     */
    handleMessageEvent = (event) => {
        // 验证来源
        if (!this.validateOrigin(event.origin)) {
            return;
        }

        const { type, data } = event.data;
        if (type === 'oauth2-callback' && this.callbackHandler) {
            this.callbackHandler(data);
            this.cleanupCallbackHandler();
        }
    }

    /**
     * 验证消息来源
     */
    validateOrigin(origin) {
        const allowedOrigins = [
            window.location.origin,
            new URL(this.redirectUri).origin
        ];
        return allowedOrigins.includes(origin);
    }

    /**
     * 清理回调处理器
     */
    cleanupCallbackHandler() {
        this.callbackHandler = null;
        window.removeEventListener('message', this.handleMessageEvent);
    }

    /**
     * 处理 OAuth 回调
     */
    async handleCallback(params) {
        const { code, state, error, error_description } = params;

        // 检查错误
        if (error) {
            throw new Error(error_description || error);
        }

        // 验证 state
        if (!this.sessionManager.validateOAuthState(state)) {
            throw new Error('Invalid state parameter');
        }

        // 获取 code_verifier
        const codeVerifier = this.sessionManager.getPKCEVerifier();
        if (!codeVerifier) {
            throw new Error('Missing code verifier');
        }

        // 交换 token
        const tokens = await this.exchangeCodeForToken(code, codeVerifier);

        // 解析用户信息
        const userId = this.userManager.parseUserIdFromJWT(tokens.accessToken);
        let userInfo = tokens.idToken ? this.userManager.parseUserInfoFromIdToken(tokens.idToken) : null;

        if (!userInfo && userId) {
            userInfo = { id: userId, name: userId };
        }

        if (!userId && !userInfo) {
            throw new Error('Unable to get user information from token');
        }

        const finalUserId = userId || userInfo.id;

        // 设置用户
        this.userManager.setUser(finalUserId, userInfo);

        // 保存会话
        this.sessionManager.saveUserId(finalUserId);
        this.sessionManager.saveUserInfo(userInfo);
        this.sessionManager.saveTokens(tokens);

        // 设置 token 自动刷新
        this.scheduleTokenRefresh(tokens.expiresIn);

        // 触发认证成功事件
        this.emit('authenticated', {
            userId: finalUserId,
            userInfo: userInfo,
            tokens: tokens
        });
    }

    /**
     * 交换授权码获取 token
     */
    async exchangeCodeForToken(code, codeVerifier) {
        const response = await fetch(this.tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: this.redirectUri,
                client_id: this.clientId,
                code_verifier: codeVerifier
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Token exchange failed: ${error}`);
        }

        const tokens = await response.json();

        return {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            idToken: tokens.id_token,
            tokenType: tokens.token_type,
            expiresIn: tokens.expires_in,
            scope: tokens.scope
        };
    }

    /**
     * 刷新 token
     */
    async refreshToken() {
        const tokens = this.sessionManager.getTokens();
        if (!tokens || !tokens.refreshToken) {
            throw new Error('No refresh token available');
        }

        const response = await fetch(this.tokenEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: tokens.refreshToken,
                client_id: this.clientId
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Token refresh failed: ${error}`);
        }

        const newTokens = await response.json();

        // 更新 token
        const updatedTokens = {
            ...tokens,
            accessToken: newTokens.access_token || tokens.accessToken,
            refreshToken: newTokens.refresh_token || tokens.refreshToken,
            idToken: newTokens.id_token || tokens.idToken,
            expiresIn: newTokens.expires_in
        };

        this.sessionManager.saveTokens(updatedTokens);

        // 重新安排刷新
        this.scheduleTokenRefresh(newTokens.expires_in);

        return updatedTokens;
    }

    /**
     * 安排 token 刷新
     */
    scheduleTokenRefresh(expiresIn) {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }

        // 在过期前 5 分钟刷新
        const refreshIn = (expiresIn || 3600) - 300;
        if (refreshIn > 0) {
            this.refreshTimer = setTimeout(async () => {
                try {
                    await this.refreshToken();
                } catch (e) {
                    console.error('Auto token refresh failed:', e);
                    this.emit('error', e);
                }
            }, refreshIn * 1000);
        }
    }

    /**
     * 生成 PKCE 参数
     */
    async generatePKCEParameters() {
        // 生成 code_verifier (43-128字符)
        const codeVerifier = this.generateRandomString(64);

        // 生成 code_challenge
        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        const digest = await window.crypto.subtle.digest('SHA-256', data);
        const codeChallenge = this.base64UrlEncode(digest);

        return { codeVerifier, codeChallenge };
    }

    /**
     * 生成随机字符串
     */
    generateRandomString(length) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
        const array = new Uint8Array(length);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => charset[byte % charset.length]).join('');
    }

    /**
     * Base64 URL 编码
     */
    base64UrlEncode(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        bytes.forEach(byte => binary += String.fromCharCode(byte));
        return btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    /**
     * 生成 state 参数
     */
    generateState() {
        return this.generateRandomString(32);
    }

    /**
     * 构建授权 URL
     */
    buildAuthorizationUrl(codeChallenge, state) {
        const params = new URLSearchParams({
            response_type: this.responseType,
            client_id: this.clientId,
            redirect_uri: this.redirectUri,
            scope: this.scope,
            state: state,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256'
        });

        if (this.prompt) {
            params.append('prompt', this.prompt);
        }

        return `${this.authorizationEndpoint}?${params.toString()}`;
    }

    /**
     * 检查是否已认证
     */
    isAuthenticated() {
        return this.userManager.hasUser() && !this.sessionManager.isTokenExpired();
    }

    /**
     * 登出
     */
    async logout() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
        this.sessionManager.clearTokens();
    }

    /**
     * 获取认证参数
     */
    getAuthParams() {
        const accessToken = this.sessionManager.getAccessToken();
        if (accessToken) {
            return { token: accessToken };
        }
        return {};
    }

    /**
     * 事件监听
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        if (!this.eventListeners.has(event)) return;
        const listeners = this.eventListeners.get(event);
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    emit(event, data) {
        if (!this.eventListeners.has(event)) return;
        this.eventListeners.get(event).forEach(callback => callback(data));
    }

    /**
     * 销毁
     */
    destroy() {
        this.cleanupCallbackHandler();
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }
        this.eventListeners.clear();
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OAuth2Handler;
}
