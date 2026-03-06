/**
 * OpenClaw Chat Widget
 * 一个支持多种认证方式的 OpenClaw 聊天组件
 *
 * 使用示例 (传统方式):
 * const chatWidget = new OpenClawChatWidget({
 *     container: '#chat-widget',
 *     gatewayUrl: 'ws://localhost:18789',
 *     token: 'your-token',
 *     sessionKey: 'agent:main:main'
 * });
 *
 * 使用示例 (OAuth2):
 * const chatWidget = new OpenClawChatWidget({
 *     container: '#chat-widget',
 *     gatewayUrl: 'ws://localhost:18789',
 *     auth: {
 *         type: 'oauth2',
 *         oauth2: {
 *             authorizationEndpoint: 'https://accounts.example.com/authorize',
 *             tokenEndpoint: 'https://accounts.example.com/token',
 *             clientId: 'your-client-id',
 *             redirectUri: window.location.origin + '/oauth-callback',
 *             scope: 'openid profile email'
 *         }
 *     },
 *     session: {
 *         persist: true,
 *         autoRestore: true
 *     }
 * });
 */

// ============================================================
// UserManager - 用户ID管理与sessionKey生成
// ============================================================
class UserManager {
    constructor(config = {}) {
        this.userId = null;
        this.userInfo = null;
        this.baseSessionKey = config.baseSessionKey || 'agent:main';
        this.userPrefix = config.userPrefix || 'direct';
    }

    setUser(userId, userInfo = {}) {
        if (!userId) {
            throw new Error('User ID is required');
        }
        this.userId = userId;
        this.userInfo = {
            id: userId,
            name: userInfo.name || userId,
            email: userInfo.email || '',
            avatar: userInfo.avatar || null,
            ...userInfo
        };
    }

    clearUser() {
        this.userId = null;
        this.userInfo = null;
    }

    getUserId() {
        return this.userId;
    }

    getUserInfo() {
        return this.userInfo;
    }

    generateSessionKey(userId = null) {
        const targetUserId = userId || this.userId;
        if (!targetUserId) {
            return `${this.baseSessionKey}:main`;
        }
        return `${this.baseSessionKey}:${this.userPrefix}:${targetUserId}`;
    }

    getSessionKey() {
        return this.generateSessionKey();
    }

    hasUser() {
        return this.userId !== null;
    }

    parseUserIdFromJWT(token, userIdClaim = 'sub') {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid token format');
            }
            const payload = JSON.parse(atob(parts[1]));
            return payload[userIdClaim] || payload.sub || payload.user_id;
        } catch (e) {
            console.error('Failed to parse JWT:', e);
            return null;
        }
    }

    parseUserInfoFromIdToken(idToken) {
        try {
            const parts = idToken.split('.');
            if (parts.length !== 3) {
                throw new Error('Invalid id_token format');
            }
            const payload = JSON.parse(atob(parts[1]));

            return {
                id: payload.sub || payload.user_id,
                name: payload.name || payload.nickname || payload.preferred_username,
                email: payload.email,
                email_verified: payload.email_verified,
                picture: payload.picture || payload.avatar,
                given_name: payload.given_name,
                family_name: payload.family_name
            };
        } catch (e) {
            console.error('Failed to parse id_token:', e);
            return null;
        }
    }
}

// ============================================================
// SessionManager - 会话持久化管理
// ============================================================
class SessionManager {
    constructor(config = {}) {
        this.storagePrefix = config.storagePrefix || 'openclaw';
        this.enabled = config.persist !== false;
        this.autoRestore = config.autoRestore !== false;

        this.STORAGE_KEYS = {
            AUTH_STATE: `${this.storagePrefix}_auth_state`,
            USER_ID: `${this.storagePrefix}_user_id`,
            USER_INFO: `${this.storagePrefix}_user_info`,
            TOKENS: `${this.storagePrefix}_tokens`,
            SESSION_DATA: `${this.storagePrefix}_session_data`,
            PKCE_VERIFIER: `${this.storagePrefix}_pkce_verifier`,
            OAUTH_STATE: `${this.storagePrefix}_oauth_state`
        };
    }

    saveUserId(userId) {
        if (!this.enabled) return;
        try {
            localStorage.setItem(this.STORAGE_KEYS.USER_ID, userId);
        } catch (e) {
            console.error('Failed to save user ID:', e);
        }
    }

    getUserId() {
        if (!this.enabled) return null;
        try {
            return localStorage.getItem(this.STORAGE_KEYS.USER_ID);
        } catch (e) {
            console.error('Failed to get user ID:', e);
            return null;
        }
    }

    saveUserInfo(userInfo) {
        if (!this.enabled) return;
        try {
            localStorage.setItem(this.STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
        } catch (e) {
            console.error('Failed to save user info:', e);
        }
    }

    getUserInfo() {
        if (!this.enabled) return null;
        try {
            const data = localStorage.getItem(this.STORAGE_KEYS.USER_INFO);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Failed to get user info:', e);
            return null;
        }
    }

    saveTokens(tokens) {
        if (!this.enabled) return;
        try {
            const tokenData = {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                idToken: tokens.idToken,
                tokenType: tokens.tokenType || 'Bearer',
                expiresAt: tokens.expiresAt || (Date.now() + (tokens.expiresIn || 3600) * 1000),
                scope: tokens.scope || ''
            };
            localStorage.setItem(this.STORAGE_KEYS.TOKENS, JSON.stringify(tokenData));
        } catch (e) {
            console.error('Failed to save tokens:', e);
        }
    }

    getTokens() {
        if (!this.enabled) return null;
        try {
            const data = localStorage.getItem(this.STORAGE_KEYS.TOKENS);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Failed to get tokens:', e);
            return null;
        }
    }

    getAccessToken() {
        const tokens = this.getTokens();
        return tokens ? tokens.accessToken : null;
    }

    isTokenExpired() {
        const tokens = this.getTokens();
        if (!tokens || !tokens.expiresAt) return true;
        return Date.now() >= (tokens.expiresAt - 5 * 60 * 1000);
    }

    saveSessionData(sessionData) {
        if (!this.enabled) return;
        try {
            localStorage.setItem(this.STORAGE_KEYS.SESSION_DATA, JSON.stringify(sessionData));
        } catch (e) {
            console.error('Failed to save session data:', e);
        }
    }

    getSessionData() {
        if (!this.enabled) return null;
        try {
            const data = localStorage.getItem(this.STORAGE_KEYS.SESSION_DATA);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Failed to get session data:', e);
            return null;
        }
    }

    savePKCEVerifier(verifier) {
        if (!this.enabled) return;
        try {
            localStorage.setItem(this.STORAGE_KEYS.PKCE_VERIFIER, verifier);
        } catch (e) {
            console.error('Failed to save PKCE verifier:', e);
        }
    }

    getPKCEVerifier() {
        if (!this.enabled) return null;
        try {
            const verifier = localStorage.getItem(this.STORAGE_KEYS.PKCE_VERIFIER);
            localStorage.removeItem(this.STORAGE_KEYS.PKCE_VERIFIER);
            return verifier;
        } catch (e) {
            console.error('Failed to get PKCE verifier:', e);
            return null;
        }
    }

    saveOAuthState(state) {
        if (!this.enabled) return;
        try {
            localStorage.setItem(this.STORAGE_KEYS.OAUTH_STATE, state);
        } catch (e) {
            console.error('Failed to save OAuth state:', e);
        }
    }

    validateOAuthState(state) {
        if (!this.enabled) return false;
        try {
            const savedState = localStorage.getItem(this.STORAGE_KEYS.OAUTH_STATE);
            localStorage.removeItem(this.STORAGE_KEYS.OAUTH_STATE);
            return savedState === state;
        } catch (e) {
            console.error('Failed to validate OAuth state:', e);
            return false;
        }
    }

    clearSession() {
        if (!this.enabled) return;
        try {
            Object.values(this.STORAGE_KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
        } catch (e) {
            console.error('Failed to clear session:', e);
        }
    }

    clearTokens() {
        if (!this.enabled) return;
        try {
            localStorage.removeItem(this.STORAGE_KEYS.TOKENS);
        } catch (e) {
            console.error('Failed to clear tokens:', e);
        }
    }

    hasSession() {
        return this.getUserId() !== null && this.getTokens() !== null;
    }

    getSessionState() {
        return {
            userId: this.getUserId(),
            userInfo: this.getUserInfo(),
            tokens: this.getTokens(),
            sessionData: this.getSessionData()
        };
    }
}

// ============================================================
// OAuth2Handler - OAuth2 认证处理器 (支持 PKCE)
// ============================================================
class OAuth2Handler {
    constructor(config) {
        this.sessionManager = config.sessionManager;
        this.userManager = config.userManager;

        this.authorizationEndpoint = config.authorizationEndpoint;
        this.tokenEndpoint = config.tokenEndpoint;
        this.clientId = config.clientId;
        this.redirectUri = config.redirectUri || (window.location.origin + '/oauth-callback');
        this.scope = config.scope || 'openid profile email';
        this.usePopup = config.usePopup !== false;
        this.responseType = config.responseType || 'code';
        this.prompt = config.prompt;

        this.eventListeners = new Map();
        this.callbackHandler = null;
        this.refreshTimer = null;
    }

    async authenticate() {
        const { codeVerifier, codeChallenge } = await this.generatePKCEParameters();
        const state = this.generateState();

        this.sessionManager.savePKCEVerifier(codeVerifier);
        this.sessionManager.saveOAuthState(state);

        const authUrl = this.buildAuthorizationUrl(codeChallenge, state);

        if (this.usePopup) {
            await this.authenticateWithPopup(authUrl, state);
        } else {
            window.location.href = authUrl;
        }
    }

    authenticateWithPopup(authUrl, state) {
        return new Promise((resolve, reject) => {
            const width = 500;
            const height = 600;
            const left = (window.screen.width - width) / 2;
            const top = (window.screen.height - height) / 2;

            const popup = window.open(
                authUrl,
                'oauth2-popup',
                `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
            );

            if (!popup) {
                reject(new Error('无法打开登录窗口，请检查弹窗是否被拦截'));
                return;
            }

            const checkPopup = setInterval(() => {
                if (popup.closed) {
                    clearInterval(checkPopup);
                    if (!this.isAuthenticated()) {
                        reject(new Error('登录窗口被关闭'));
                    }
                }
            }, 1000);

            this.setupCallbackHandler((result) => {
                clearInterval(checkPopup);
                popup.close();

                if (result.error) {
                    reject(new Error(result.error_description || result.error));
                } else {
                    this.handleCallback(result).then(resolve).catch(reject);
                }
            });

            setTimeout(() => {
                if (!popup.closed) {
                    popup.close();
                }
                clearInterval(checkPopup);
                reject(new Error('登录超时'));
            }, 5 * 60 * 1000);
        });
    }

    setupCallbackHandler(callback) {
        this.callbackHandler = callback;
        window.addEventListener('message', this.handleMessageEvent);
    }

    handleMessageEvent = (event) => {
        if (!this.validateOrigin(event.origin)) {
            return;
        }

        const { type, data } = event.data;
        if (type === 'oauth2-callback' && this.callbackHandler) {
            this.callbackHandler(data);
            this.cleanupCallbackHandler();
        }
    }

    validateOrigin(origin) {
        const allowedOrigins = [
            window.location.origin,
            new URL(this.redirectUri).origin
        ];
        return allowedOrigins.includes(origin);
    }

    cleanupCallbackHandler() {
        this.callbackHandler = null;
        window.removeEventListener('message', this.handleMessageEvent);
    }

    async handleCallback(params) {
        const { code, state, error, error_description } = params;

        if (error) {
            throw new Error(error_description || error);
        }

        if (!this.sessionManager.validateOAuthState(state)) {
            throw new Error('Invalid state parameter');
        }

        const codeVerifier = this.sessionManager.getPKCEVerifier();
        if (!codeVerifier) {
            throw new Error('Missing code verifier');
        }

        const tokens = await this.exchangeCodeForToken(code, codeVerifier);

        const userId = this.userManager.parseUserIdFromJWT(tokens.accessToken);
        let userInfo = tokens.idToken ? this.userManager.parseUserInfoFromIdToken(tokens.idToken) : null;

        if (!userInfo && userId) {
            userInfo = { id: userId, name: userId };
        }

        if (!userId && !userInfo) {
            throw new Error('Unable to get user information from token');
        }

        const finalUserId = userId || userInfo.id;

        this.userManager.setUser(finalUserId, userInfo);
        this.sessionManager.saveUserId(finalUserId);
        this.sessionManager.saveUserInfo(userInfo);
        this.sessionManager.saveTokens(tokens);

        this.scheduleTokenRefresh(tokens.expiresIn);

        this.emit('authenticated', {
            userId: finalUserId,
            userInfo: userInfo,
            tokens: tokens
        });
    }

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

        const updatedTokens = {
            ...tokens,
            accessToken: newTokens.access_token || tokens.accessToken,
            refreshToken: newTokens.refresh_token || tokens.refreshToken,
            idToken: newTokens.id_token || tokens.idToken,
            expiresIn: newTokens.expires_in
        };

        this.sessionManager.saveTokens(updatedTokens);
        this.scheduleTokenRefresh(newTokens.expires_in);

        return updatedTokens;
    }

    scheduleTokenRefresh(expiresIn) {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }

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

    async generatePKCEParameters() {
        const codeVerifier = this.generateRandomString(64);

        const encoder = new TextEncoder();
        const data = encoder.encode(codeVerifier);
        const digest = await window.crypto.subtle.digest('SHA-256', data);
        const codeChallenge = this.base64UrlEncode(digest);

        return { codeVerifier, codeChallenge };
    }

    generateRandomString(length) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
        const array = new Uint8Array(length);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => charset[byte % charset.length]).join('');
    }

    base64UrlEncode(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        bytes.forEach(byte => binary += String.fromCharCode(byte));
        return btoa(binary)
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }

    generateState() {
        return this.generateRandomString(32);
    }

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

    isAuthenticated() {
        return this.userManager.hasUser() && !this.sessionManager.isTokenExpired();
    }

    async logout() {
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
            this.refreshTimer = null;
        }
        this.sessionManager.clearTokens();
    }

    getAuthParams() {
        const accessToken = this.sessionManager.getAccessToken();
        if (accessToken) {
            return { token: accessToken };
        }
        return {};
    }

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

    destroy() {
        this.cleanupCallbackHandler();
        if (this.refreshTimer) {
            clearTimeout(this.refreshTimer);
        }
        this.eventListeners.clear();
    }
}

// ============================================================
// AuthenticationManager - 认证协调器
// ============================================================
class AuthenticationManager {
    constructor(config = {}) {
        this.config = config;
        this.authType = config.type || 'none';
        this.sessionManager = config.sessionManager;
        this.userManager = config.userManager;

        this.isAuthenticated = false;
        this.isAuthenticating = false;

        this.handler = null;
        this.eventListeners = new Map();

        this.initHandler();
    }

    initHandler() {
        switch (this.authType) {
            case 'oauth2':
                this.handler = new OAuth2Handler({
                    ...this.config.oauth2,
                    sessionManager: this.sessionManager,
                    userManager: this.userManager
                });
                break;
            default:
                this.handler = {
                    authenticate: async () => this.emit('authenticated', {}),
                    getAuthParams: () => {
                        const auth = {};
                        if (this.config.token) auth.token = this.config.token;
                        if (this.config.password) auth.password = this.config.password;
                        return auth;
                    },
                    on: (e, cb) => {},
                    logout: async () => {}
                };
        }

        if (this.handler && this.handler.on) {
            this.handler.on('authenticated', (data) => {
                this.isAuthenticated = true;
                this.isAuthenticating = false;
                this.emit('authenticated', data);
            });

            this.handler.on('error', (error) => {
                this.isAuthenticating = false;
                this.emit('error', error);
            });
        }
    }

    async authenticate() {
        if (this.isAuthenticating) {
            return;
        }

        this.isAuthenticating = true;
        this.emit('authenticating');

        try {
            await this.handler.authenticate();
        } catch (error) {
            this.isAuthenticating = false;
            throw error;
        }
    }

    requiresAuthentication() {
        return this.authType === 'oauth2' || this.authType === 'saml';
    }

    checkAuthenticated() {
        return this.isAuthenticated;
    }

    async restoreSession() {
        if (!this.sessionManager.autoRestore) {
            return false;
        }

        const sessionState = this.sessionManager.getSessionState();
        if (!sessionState.userId || !sessionState.tokens) {
            return false;
        }

        if (this.sessionManager.isTokenExpired()) {
            if (this.handler && this.handler.refreshToken) {
                try {
                    await this.handler.refreshToken();
                    return true;
                } catch (e) {
                    console.error('Failed to refresh token:', e);
                    this.sessionManager.clearSession();
                    return false;
                }
            }
            return false;
        }

        this.userManager.setUser(sessionState.userId, sessionState.userInfo);
        this.isAuthenticated = true;
        this.emit('authenticated', {
            userId: sessionState.userId,
            userInfo: sessionState.userInfo
        });

        return true;
    }

    async logout() {
        if (this.handler && this.handler.logout) {
            await this.handler.logout();
        }

        this.sessionManager.clearSession();
        this.userManager.clearUser();
        this.isAuthenticated = false;

        this.emit('logout');
    }

    getAuthParams() {
        if (this.handler) {
            return this.handler.getAuthParams();
        }
        return {};
    }

    getAccessToken() {
        return this.sessionManager.getAccessToken();
    }

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

    destroy() {
        this.eventListeners.clear();
        if (this.handler && this.handler.destroy) {
            this.handler.destroy();
        }
    }
}

// ============================================================
// OpenClawChatWidget - 主组件类
// ============================================================
class OpenClawChatWidget {
    constructor(options = {}) {
        this.container = typeof options.container === 'string'
            ? document.querySelector(options.container)
            : options.container;

        // 基础配置
        this.gatewayUrl = options.gatewayUrl || 'ws://localhost:18789';
        this.token = options.token || '';
        this.password = options.password || '';
        this.baseSessionKey = options.sessionKey || 'agent:main:main';

        // 认证配置
        this.authConfig = options.auth || { type: 'none' };
        this.sessionConfig = options.session || { persist: true, autoRestore: true };

        // WebSocket 连接
        this.ws = null;
        this.connected = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;

        // 消息处理
        this.messageId = 0;
        this.pendingRequests = new Map();
        this.currentRunId = null;
        this.processedMessages = new Set(); // 跟踪已处理的消息
        this.runIdTimeout = null; // 30秒警告定时器
        this.runIdCleanupTimeout = null; // 5秒清空定时器

        // 文件上传
        this.uploadedFiles = [];
        this.maxFileSize = 100 * 1024; // 100KB (仅支持文本文件，防止超时)

        // 流式消息管理
        this.streamingMessages = new Map(); // runId -> message element

        // 事件监听器
        this.eventListeners = new Map();

        // UI 元素
        this.elements = {};

        // 认证状态
        this.authRequired = false;
        this.isAuthenticated = false;
        this.isAuthenticating = false;
        this.authError = null;

        // 初始化认证管理器
        this.initAuthentication();

        this.init();
    }

    /**
     * 初始化认证管理器
     */
    initAuthentication() {
        // 创建 SessionManager
        this.sessionManager = new SessionManager(this.sessionConfig);

        // 创建 UserManager
        this.userManager = new UserManager({
            baseSessionKey: this.baseSessionKey.split(':').slice(0, 2).join(':'),
            userPrefix: 'direct'
        });

        // 创建 AuthenticationManager
        this.authenticationManager = new AuthenticationManager({
            ...this.authConfig,
            sessionManager: this.sessionManager,
            userManager: this.userManager
        });

        // 监听认证事件
        this.authenticationManager.on('authenticating', () => {
            this.isAuthenticating = true;
            this.authError = null;
            this.updateAuthUI();
        });

        this.authenticationManager.on('authenticated', (data) => {
            this.isAuthenticated = true;
            this.isAuthenticating = false;
            this.authError = null;
            this.updateAuthUI();
            this.emit('authenticated', data);

            // 认证成功后连接 WebSocket
            if (this.authenticationManager.requiresAuthentication()) {
                this.connect();
            }
        });

        this.authenticationManager.on('error', (error) => {
            this.isAuthenticating = false;
            this.authError = error.message || error;
            this.updateAuthUI();
            this.showError('认证失败: ' + this.authError);
        });

        this.authenticationManager.on('logout', () => {
            this.isAuthenticated = false;
            this.authError = null;
            this.updateAuthUI();
            this.emit('logout');
        });

        // 检查是否需要认证
        this.authRequired = this.authenticationManager.requiresAuthentication();
    }

    async init() {
        this.render();
        this.attachEventListeners();

        // 检查是否需要认证
        if (this.authRequired) {
            // 尝试恢复会话
            const restored = await this.authenticationManager.restoreSession();

            if (restored) {
                // 会话恢复成功，连接 WebSocket
                this.connect();
            } else {
                // 需要用户登录
                this.updateAuthUI();
            }
        } else {
            // 不需要认证，直接连接
            this.connect();
        }
    }

    /**
     * 渲染组件 HTML
     */
    render() {
        const html = `
            <div class="openclaw-chat-widget">
                <!-- 登录界面 -->
                <div class="login-screen" style="display: none;">
                    <div class="login-container">
                        <div class="login-avatar">🦀</div>
                        <h2 class="login-title">妙笔助手</h2>
                        <p class="login-description">登录后开始对话</p>

                        <div class="login-error" style="display: none;"></div>

                        <button class="login-btn">
                            <span class="login-spinner" style="display: none;"></span>
                            <span class="login-btn-text">登录</span>
                        </button>
                    </div>
                </div>

                <!-- 聊天界面 -->
                <div class="chat-container">
                    <div class="chat-header">
                        <div class="chat-header-left">
                            <div class="chat-avatar">🦀</div>
                            <div class="chat-title">
                                <h2>妙笔助手</h2>
                                <div class="chat-status">
                                    <span class="status-dot connecting"></span>
                                    <span class="status-text">连接中...</span>
                                </div>
                            </div>
                        </div>
                        <div class="chat-header-actions">
                            <div class="user-info" style="display: none;">
                                <div class="user-avatar"></div>
                                <div class="user-name"></div>
                            </div>
                            <button class="header-btn logout-btn" title="登出" data-action="logout" style="display: none;">🚪</button>
                            <button class="header-btn" title="清空聊天" data-action="clear">🗑️</button>
                            <button class="header-btn" title="重新连接" data-action="reconnect">🔄</button>
                        </div>
                    </div>

                    <div class="chat-messages">
                        <!-- 欢迎消息 -->
                        <div class="message assistant">
                            <div class="message-avatar">🦀</div>
                            <div class="message-content">
                                <div class="message-bubble">
                                    你好！我是妙笔助手。有什么可以帮助你的吗？
                                </div>
                                <div class="message-time">${this.formatTime(new Date())}</div>
                            </div>
                        </div>
                    </div>

                    <div class="chat-input-area">
                        <div class="file-upload-bar" id="fileUploadBar" style="display: none;">
                            <div class="file-upload-actions">
                                <button class="file-upload-btn" id="fileUploadBtn" title="上传文件">
                                    📎 上传文件
                                </button>
                                <input type="file" id="fileInput" class="file-input" multiple>
                            </div>
                            <div class="file-list" id="fileList"></div>
                        </div>
                        <div class="input-wrapper">
                            <textarea
                                class="chat-input"
                                placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
                                rows="1"
                            ></textarea>
                            <button class="send-btn" disabled>发送</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this.container.innerHTML = html;

        // 缓存 DOM 元素引用
        this.elements = {
            widget: this.container.querySelector('.openclaw-chat-widget'),
            loginScreen: this.container.querySelector('.login-screen'),
            loginBtn: this.container.querySelector('.login-btn'),
            loginError: this.container.querySelector('.login-error'),
            loginSpinner: this.container.querySelector('.login-spinner'),
            loginBtnText: this.container.querySelector('.login-btn-text'),
            chatContainer: this.container.querySelector('.chat-container'),
            messagesContainer: this.container.querySelector('.chat-messages'),
            input: this.container.querySelector('.chat-input'),
            sendBtn: this.container.querySelector('.send-btn'),
            statusDot: this.container.querySelector('.status-dot'),
            statusText: this.container.querySelector('.status-text'),
            headerBtns: this.container.querySelectorAll('.header-btn'),
            logoutBtn: this.container.querySelector('.logout-btn'),
            userInfo: this.container.querySelector('.user-info'),
            userAvatar: this.container.querySelector('.user-avatar'),
            userName: this.container.querySelector('.user-name')
        };
    }

    /**
     * 更新认证 UI
     */
    updateAuthUI() {
        const { loginScreen, loginBtn, loginError, loginSpinner, loginBtnText, chatContainer, logoutBtn, userInfo, userAvatar, userName } = this.elements;

        if (!this.authRequired) {
            // 不需要认证，显示聊天界面
            loginScreen.style.display = 'none';
            chatContainer.style.display = 'flex';
            return;
        }

        if (this.isAuthenticated) {
            // 已认证，显示聊天界面
            loginScreen.style.display = 'none';
            chatContainer.style.display = 'flex';
            logoutBtn.style.display = 'flex';
            userInfo.style.display = 'flex';

            // 显示用户信息
            const user = this.userManager.getUserInfo();
            if (user) {
                userName.textContent = user.name || user.id;
                if (user.avatar || user.picture) {
                    userAvatar.innerHTML = `<img src="${user.avatar || user.picture}" alt="User" />`;
                } else {
                    userAvatar.innerHTML = '👤';
                }
            }
        } else if (this.isAuthenticating) {
            // 认证中，显示登录界面（禁用按钮）
            loginScreen.style.display = 'flex';
            chatContainer.style.display = 'none';
            loginBtn.disabled = true;
            loginSpinner.style.display = 'inline-block';
            loginBtnText.textContent = '登录中...';
            loginError.style.display = 'none';
        } else {
            // 未认证，显示登录界面
            loginScreen.style.display = 'flex';
            chatContainer.style.display = 'none';
            loginBtn.disabled = false;
            loginSpinner.style.display = 'none';
            loginBtnText.textContent = this.getLoginButtonText();

            // 显示错误信息
            if (this.authError) {
                loginError.textContent = this.authError;
                loginError.style.display = 'block';
            } else {
                loginError.style.display = 'none';
            }
        }
    }

    /**
     * 获取登录按钮文本
     */
    getLoginButtonText() {
        switch (this.authConfig.type) {
            case 'oauth2':
                return this.authConfig.oauth2?.loginButtonText || '使用 OAuth2 登录';
            case 'saml':
                return this.authConfig.saml?.loginButtonText || '使用 SSO 登录';
            default:
                return '登录';
        }
    }

    /**
     * 绑定事件监听器
     */
    attachEventListeners() {
        const { input, sendBtn, headerBtns, loginBtn } = this.elements;

        // 登录按钮
        loginBtn.addEventListener('click', () => {
            if (!this.isAuthenticating) {
                this.authenticationManager.authenticate().catch(err => {
                    console.error('Authentication error:', err);
                });
            }
        });

        // 输入框事件
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        input.addEventListener('input', () => {
            this.updateSendButton();
            this.autoResizeInput();
        });

        // 发送按钮
        sendBtn.addEventListener('click', () => this.sendMessage());

        // 文件上传
        this.initFileUpload();

        // 头部按钮
        headerBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                if (action === 'clear') {
                    this.clearMessages();
                } else if (action === 'reconnect') {
                    this.connect();
                } else if (action === 'logout') {
                    this.logout();
                }
            });
        });
    }

    /**
     * 连接 WebSocket
     */
    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }

        this.updateStatus('connecting');
        this.connectNonce = null;
        this.connectSent = false;

        try {
            this.ws = new WebSocket(this.gatewayUrl);
        } catch (e) {
            this.showError('无法连接到 OpenClaw Gateway');
            this.updateStatus('disconnected');
            return;
        }

        this.ws.onopen = () => {
            // 等待 connect.challenge 事件
            console.log('WebSocket connected, waiting for challenge...');
            this.connectTimer = setTimeout(() => {
                if (!this.connectNonce) {
                    this.showError('连接超时：未收到服务器挑战');
                    this.ws?.close();
                }
            }, 10000);
        };

        this.ws.onclose = () => {
            this.connected = false;
            this.updateStatus('disconnected');
            this.emit('disconnected');
            this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.showError('连接错误');
        };

        this.ws.onmessage = (event) => {
            this.handleMessage(event.data);
        };
    }

    /**
     * 尝试重连
     */
    attemptReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            this.showError('无法连接到服务器，请刷新页面重试');
            return;
        }

        this.reconnectAttempts++;
        this.updateStatus('connecting');

        setTimeout(() => {
            this.connect();
        }, this.reconnectDelay);
    }

    /**
     * 处理收到的消息
     */
    handleMessage(data) {
        try {
            const message = JSON.parse(data);
            console.log('Received:', message);

            // 处理 Gateway 事件（connect.challenge 等）
            if (message.type === 'event') {
                this.handleGatewayEvent(message.event, message.payload);
                return;
            }

            // 处理响应帧
            if (message.type === 'res') {
                // 处理 connect 响应
                if (message.id === String(this.messageId) && !this.connected) {
                    if (message.ok) {
                        this.handleConnectOk(message.payload);
                    } else {
                        this.handleConnectError(message.error);
                    }
                    return;
                }

                const pending = this.pendingRequests.get(message.id);
                if (pending) {
                    // 将响应转换为旧格式以保持兼容性
                    const response = {
                        id: message.id,
                        result: message.ok ? message.payload : undefined,
                        error: message.ok ? undefined : message.error
                    };
                    pending.resolve(response);
                    this.pendingRequests.delete(message.id);
                }
                return;
            }

            // 处理旧格式事件通知（method 字段）
            if (message.method) {
                this.handleEvent(message.method, message.params);
            }

            // 处理旧格式响应（没有 type 字段但有 id）
            if (!message.type && message.id !== undefined) {
                const pending = this.pendingRequests.get(message.id);
                if (pending) {
                    pending.resolve(message);
                    this.pendingRequests.delete(message.id);
                }
            }
        } catch (e) {
            console.error('Failed to parse message:', e);
        }
    }

    /**
     * 处理 Gateway 事件
     */
    handleGatewayEvent(event, payload) {
        console.log('Gateway event:', event, payload);

        switch (event) {
            case 'connect.challenge':
                this.handleConnectChallenge(payload);
                break;
            case 'connect.ok':
                this.handleConnectOk(payload);
                break;
            case 'connect.error':
                this.handleConnectError(payload);
                break;
            case 'chat':
                this.handleChatEvent(payload);
                break;
            case 'tool':
                this.handleToolEvent(payload);
                break;
        }
    }

    /**
     * 处理 connect.challenge 事件
     */
    handleConnectChallenge(payload) {
        const nonce = payload?.nonce;
        if (!nonce) {
            this.showError('服务器挑战缺少 nonce');
            this.ws?.close(1008, 'missing nonce');
            return;
        }

        this.connectNonce = nonce;
        this.sendConnect();
    }

    /**
     * 发送 connect 消息进行认证
     */
    sendConnect() {
        if (!this.connectNonce || this.connectSent) {
            return;
        }

        this.connectSent = true;

        if (this.connectTimer) {
            clearTimeout(this.connectTimer);
            this.connectTimer = null;
        }

        const auth = this.getAuthParams();
        const connectMsg = {
            type: 'req',
            id: String(++this.messageId),
            method: 'connect',
            params: {
                minProtocol: 3,
                maxProtocol: 3,
                client: {
                    id: 'webchat',
                    displayName: 'OpenClaw Chat Widget',
                    version: '1.0.0',
                    platform: 'web',
                    mode: 'webchat'
                },
                auth: auth.token ? { token: auth.token } : undefined,
                scopes: ['operator.write', 'operator.admin']
            }
        };

        console.log('Sending connect:', JSON.stringify(connectMsg, null, 2));
        this.ws.send(JSON.stringify(connectMsg));
    }

    /**
     * 处理 connect.ok 事件
     */
    handleConnectOk(payload) {
        console.log('Connected to Gateway:', payload);
        this.connected = true;
        this.reconnectAttempts = 0;
        this.updateStatus('connected');
        this.emit('connected');
    }

    /**
     * 处理 connect.error 事件
     */
    handleConnectError(payload) {
        console.error('Connection error:', payload);
        this.showError('认证失败: ' + (payload?.message || '未知错误'));
        this.ws?.close();
    }

    /**
     * 处理服务器推送的事件
     */
    handleEvent(method, params) {
        switch (method) {
            case 'chat':
                this.handleChatEvent(params);
                break;
            case 'tool':
                this.handleToolEvent(params);
                break;
        }
    }

    /**
     * 取消当前正在处理的消息
     */
    cancelCurrentMessage() {
        if (!this.currentRunId) {
            console.warn('⚠️ No active run to cancel');
            return;
        }

        console.log('❌ Cancelling run:', this.currentRunId);

        // 清理状态
        this.currentRunId = null;
        this.clearRunIdTimeout();
        this.hideTypingIndicator();

        // 清理流式消息
        this.streamingMessages.forEach((el, runId) => {
            el.remove();
        });
        this.streamingMessages.clear();

        // 显示取消提示
        this.showWarning('已取消消息');

        // 更新取消按钮状态
        this.updateCancelButton();
    }

    /**
     * 更新取消按钮显示状态
     */
    updateCancelButton() {
        const cancelBtn = document.getElementById('cancelBtn');
        if (cancelBtn) {
            cancelBtn.style.display = this.currentRunId ? 'inline-block' : 'none';
        }
    }

    /**
     * 更新流式消息（delta 状态）
     */
    updateStreamingMessage(runId, deltaContent) {
        const { messagesContainer } = this.elements;

        console.log('🔄 updateStreamingMessage called:', {
            runId,
            deltaContentType: typeof deltaContent,
            deltaContent: deltaContent
        });

        // 查找或创建流式消息元素
        let messageEl = this.streamingMessages.get(runId);

        if (!messageEl) {
            console.log('✨ Creating new streaming message element');
            // 创建新的流式消息
            messageEl = document.createElement('div');
            messageEl.className = 'message assistant streaming';
            messageEl.innerHTML = `
                <div class="message-avatar">🦀</div>
                <div class="message-content">
                    <div class="message-bubble streaming-bubble">
                        <span class="streaming-indicator">✍️</span>
                        <span class="streaming-content"></span>
                    </div>
                </div>
            `;
            messagesContainer.appendChild(messageEl);
            this.streamingMessages.set(runId, messageEl);
        }

        // 更新内容
        const contentEl = messageEl.querySelector('.streaming-content');
        const displayContent = this.formatMessage(deltaContent);

        console.log('🎨 Formatted content:', {
            displayContentLength: displayContent.length,
            displayContentPreview: displayContent.substring(0, 100)
        });

        contentEl.innerHTML = displayContent;

        // 滚动到底部
        messageEl.offsetHeight; // 触发 reflow
        this.scrollToBottom();
    }

    /**
     * 完成流式消息（final 状态）
     */
    finalizeStreamingMessage(runId, finalContent) {
        let messageEl = this.streamingMessages.get(runId);

        if (messageEl) {
            // 更新为最终消息
            const bubble = messageEl.querySelector('.message-bubble');
            bubble.classList.remove('streaming-bubble');
            bubble.innerHTML = this.formatMessage(finalContent);
            bubble.innerHTML += `<div class="message-time">${this.formatTime(new Date())}</div>`;

            // 移除 streaming 状态
            messageEl.classList.remove('streaming');
            this.streamingMessages.delete(runId);
        } else {
            // 没有流式消息，直接添加最终消息
            this.appendMessage('assistant', finalContent);
        }
    }

    /**
     * 处理聊天事件
     */
    handleChatEvent(params) {
        const { state, message, runId, seq, status } = params;
        console.log('📨 Chat event:', {
            state,
            status,
            runId,
            seq,
            seqType: typeof seq,
            hasMessage: !!message,
            messageType: typeof message,
            messageKeys: message ? Object.keys(message) : null,
            messagePreview: message ? JSON.stringify(message).substring(0, 100) : null
        });

        // 处理 ok 状态（run 完成）
        if (status === 'ok') {
            console.log('✅ Run completed with status=ok');
            this.currentRunId = null;
            this.clearRunIdTimeout();
            this.updateCancelButton();
            return;
        }

        // 创建消息唯一标识符
        // 使用内容哈希作为 key（更可靠的去重方式）
        // 确保 message 是字符串类型
        const messageStr = message != null ? String(message) : '';
        const contentHash = messageStr ? `${runId}:${messageStr.substring(0, 100)}` : null;
        const messageKey = runId && seq !== undefined ? `${runId}:${seq}` : null;
        console.log('🔑 Message keys:', { messageKey, contentHash, seq, seqType: typeof seq, messageType: typeof message });

        if (state === 'final' && message) {
            console.log('✅ Processing FINAL message:', {
                runId,
                seq,
                messageKey,
                contentHash: contentHash ? contentHash.substring(0, 50) : 'N/A',
                messageLength: messageStr.length,
                messageType: typeof message
            });

            // 使用内容哈希去重（更可靠）
            if (contentHash && this.processedMessages.has(contentHash)) {
                console.log('⚠️ Skipping duplicate message (by content):', contentHash.substring(0, 50));
                return;
            }

            // 标记消息已处理
            if (contentHash) {
                this.processedMessages.add(contentHash);
                console.log('➕ Added to processed:', contentHash.substring(0, 50), 'Total processed:', this.processedMessages.size);
            }

            // 如果有流式消息，完成它；否则添加新消息
            if (this.streamingMessages.has(runId)) {
                console.log('💬 Finalizing streaming message...');
                this.finalizeStreamingMessage(runId, message);
            } else {
                console.log('💬 Appending FINAL message to UI...');
                this.appendMessage('assistant', message);
            }
            this.hideTypingIndicator();
            this.emit('message', { role: 'assistant', message, runId, seq });

            // 检查是否是最后一个消息（seq 通常从0开始，连续的 final 消息 seq 会递增）
            // 如果这是该 runId 的第一个 final 消息，设置5秒延迟清空
            // 后续的 final 消息会重置这个定时器
            if (this.runIdCleanupTimeout) {
                clearTimeout(this.runIdCleanupTimeout);
            }
            console.log('⏰ Setting runId cleanup timeout (5000ms)');
            this.runIdCleanupTimeout = setTimeout(() => {
                console.log('🔔 Cleanup: Clearing currentRunId');
                this.currentRunId = null;
                this.runIdCleanupTimeout = null;
            }, 5000);
        } else if (state === 'delta' && message) {
            console.log('📖 Processing DELTA message (streaming):', {
                runId,
                messageType: typeof message,
                messageKeys: typeof message === 'object' ? Object.keys(message) : null,
                rawMessage: message
            });
            // 传递原始 message 对象，让 formatMessage 正确处理
            this.updateStreamingMessage(runId, message);
            return;
        } else if (state === 'started' || state === 'in_flight') {
            console.log('🔄 Processing STARTED/IN_FLIGHT state');

            // 如果是同一个 runId，不要重复设置超时
            if (this.currentRunId !== runId) {
                this.currentRunId = runId;
                // 启动30秒超时定时器
                this.startRunIdTimeout();
                this.updateCancelButton();
            } else {
                console.log('⏳ Same runId, skipping timeout reset');
            }
        } else if (state === 'error') {
            console.log('❌ Processing ERROR state');
            this.appendMessage('assistant', '抱歉，发生了错误: ' + (params.errorMessage || '未知错误'));
            this.hideTypingIndicator();
            this.currentRunId = null;
            this.clearRunIdTimeout(); // 清除超时定时器
            this.updateCancelButton();
        }

        console.log('📊 Current state: currentRunId =', this.currentRunId, ', runIdTimeout =', !!this.runIdTimeout);
        console.log('---\n');
    }

    /**
     * 处理工具调用事件
     */
    handleToolEvent(params) {
        // 可以在这里显示工具调用的进度
        this.emit('tool', params);
    }

    /**
     * 发送消息
     */
    async sendMessage(message) {
        const { input } = this.elements;

        // 如果没有传入消息参数，从输入框获取
        if (typeof message !== 'string') {
            message = input.value.trim();
        }

        // 如果有文件附件，附加到消息中
        let displayMessage = message; // 用于显示的消息（不包含 base64）
        if (this.uploadedFiles.length > 0) {
            message = message || '请帮我分析这些文件';

            let fileMessage = message;
            let displayFileMessage = message;

            if (this.uploadedFiles.length === 1) {
                const file = this.uploadedFiles[0];
                // 发送给服务器的消息（包含 base64）
                fileMessage = `${message}\n\n📎 附件: ${file.name}\n📋 类型: ${file.type}\n📦 大小: ${this.formatFileSize(file.size)}\n📄 Base64 数据:\n${file.base64}`;
                // 显示给用户的消息（不包含 base64）
                displayFileMessage = `${message}\n\n📎 附件: ${file.name}\n📋 类型: ${file.type}\n📦 大小: ${this.formatFileSize(file.size)}`;
            } else {
                // 发送给服务器的消息（包含 base64）
                fileMessage = `${message}\n\n📎 附件 (${this.uploadedFiles.length} 个文件):\n\n`;
                // 显示给用户的消息（不包含 base64）
                displayFileMessage = `${message}\n\n📎 附件 (${this.uploadedFiles.length} 个文件):\n\n`;
                this.uploadedFiles.forEach((file, index) => {
                    fileMessage += `${index + 1}. ${file.name}\n   类型: ${file.type}\n   大小: ${this.formatFileSize(file.size)}\n   Base64:\n   ${file.base64}\n\n`;
                    displayFileMessage += `${index + 1}. ${file.name}\n   类型: ${file.type}\n   大小: ${this.formatFileSize(file.size)}\n\n`;
                });
            }

            // 清空已上传文件
            this.uploadedFiles = [];
            this.renderFileList();

            message = fileMessage;
            displayMessage = displayFileMessage;
        }

        if (!message) return;
        if (!this.connected) {
            this.showError('未连接到服务器');
            return;
        }
        if (this.currentRunId) {
            this.showError('请等待当前消息处理完成');
            return;
        }

        // 检查是否需要认证
        if (this.authRequired && !this.isAuthenticated) {
            this.showError('请先登录');
            return;
        }

        // 清空输入框
        input.value = '';
        this.updateSendButton();
        this.autoResizeInput();

        // 清空已处理消息记录
        this.processedMessages.clear();

        // 显示用户消息（使用不包含 base64 的版本）
        this.appendMessage('user', displayMessage);
        this.emit('message', { role: 'user', message: displayMessage });

        // 显示正在输入
        this.showTypingIndicator();

        // 生成唯一 ID 和幂等键
        const id = String(++this.messageId);
        const idempotencyKey = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // 发送 chat.send 请求（认证已通过 connect 完成）
        const request = {
            type: 'req',
            id,
            method: 'chat.send',
            params: {
                sessionKey: this.getSessionKey(),
                message: message,
                idempotencyKey
            }
        };

        try {
            this.ws.send(JSON.stringify(request));

            // 等待响应
            const response = await this.waitForResponse(id);

            if (response.result) {
                const { runId, status } = response.result;

                if (status === 'started') {
                    this.currentRunId = runId;
                    // 启动30秒超时定时器
                    this.startRunIdTimeout();
                    this.updateCancelButton();
                } else if (status === 'in_flight') {
                    this.currentRunId = runId;
                    // 启动30秒超时定时器
                    this.startRunIdTimeout();
                    this.updateCancelButton();
                } else if (status === 'ok') {
                    // 消息已处理完成
                    this.currentRunId = null;
                    this.clearRunIdTimeout();
                    this.updateCancelButton();
                }
            }

            if (response.error) {
                this.hideTypingIndicator();
                this.showError('发送失败: ' + response.error.message);
            }
        } catch (e) {
            this.hideTypingIndicator();
            this.showError('发送消息失败: ' + e.message);
        }
    }

    /**
     * 等待 RPC 响应
     */
    waitForResponse(id, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const timer = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error('请求超时'));
            }, timeout);

            this.pendingRequests.set(id, {
                resolve: (response) => {
                    clearTimeout(timer);
                    resolve(response);
                },
                reject: (error) => {
                    clearTimeout(timer);
                    reject(error);
                }
            });
        });
    }

    /**
     * 启动 RunId 超时定时器（30秒自动恢复）
     */
    startRunIdTimeout() {
        // 清除旧的定时器
        this.clearRunIdTimeout();

        // 设置30秒超时（只警告，不清空 currentRunId）
        this.runIdTimeout = setTimeout(() => {
            if (this.currentRunId) {
                console.warn('⏱️ RunId 处理时间较长:', this.currentRunId);
                this.showWarning('AI 正在思考中，请稍候...');
            }
        }, 30000); // 30秒

        console.log('⏰ 启动 RunId 超时定时器（30秒）');
    }

    /**
     * 清除 RunId 超时定时器
     */
    clearRunIdTimeout() {
        if (this.runIdTimeout) {
            clearTimeout(this.runIdTimeout);
            this.runIdTimeout = null;
            console.log('🔔 清除30秒警告定时器');
        }
        if (this.runIdCleanupTimeout) {
            clearTimeout(this.runIdCleanupTimeout);
            this.runIdCleanupTimeout = null;
            console.log('🔔 清除5秒清空定时器');
        }
    }

    /**
     * 显示警告消息（黄色，非错误）
     */
    showWarning(message) {
        const { messagesContainer } = this.elements;
        if (!messagesContainer) return;

        const warningDiv = document.createElement('div');
        warningDiv.className = 'message warning-message';
        warningDiv.innerHTML = `
            <div class="message-content">
                <div class="message-bubble warning-bubble">
                    ⚠️ ${this.escapeHtml(message)}
                </div>
            </div>
        `;

        messagesContainer.appendChild(warningDiv);
        this.scrollToBottom();

        // 5秒后自动移除
        setTimeout(() => {
            if (warningDiv.parentNode) {
                warningDiv.parentNode.removeChild(warningDiv);
            }
        }, 5000);
    }

    /**
     * 加载聊天历史
     */
    async loadHistory(limit = 50) {
        if (!this.connected) return;

        const id = String(++this.messageId);

        const request = {
            type: 'req',
            id,
            method: 'chat.history',
            params: {
                sessionKey: this.getSessionKey(),
                limit
            }
        };

        try {
            this.ws.send(JSON.stringify(request));
            const response = await this.waitForResponse(id);

            if (response.result) {
                const { messages } = response.result;
                this.renderHistory(messages);
            }
        } catch (e) {
            console.error('Failed to load history:', e);
        }
    }

    /**
     * 渲染历史消息
     */
    renderHistory(messages) {
        const { messagesContainer } = this.elements;

        // 清空现有消息（保留欢迎消息）
        const welcomeMessage = messagesContainer.querySelector('.message.assistant');
        messagesContainer.innerHTML = '';
        if (welcomeMessage) {
            messagesContainer.appendChild(welcomeMessage);
        }

        // 渲染历史消息
        messages.forEach(msg => {
            const role = msg.role === 'user' ? 'user' : 'assistant';
            this.appendMessage(role, msg, false);
        });

        this.scrollToBottom();
    }

    /**
     * 添加消息到聊天区域
     */
    appendMessage(role, content, scroll = true) {
        const { messagesContainer } = this.elements;

        if (!messagesContainer) {
            console.error('❌ messagesContainer not found!');
            return;
        }

        const messageEl = document.createElement('div');
        messageEl.className = `message ${role}`;

        const avatar = role === 'assistant' ? '🦀' : '👤';
        const displayContent = this.formatMessage(content);

        // 调试日志
        console.log('🎨 appendMessage called:', {
            role,
            contentType: typeof content,
            contentLength: content.length,
            contentPreview: typeof content === 'string' ? content.substring(0, 50) : JSON.stringify(content).substring(0, 100),
            totalMessages: messagesContainer.children.length
        });

        messageEl.innerHTML = `
            <div class="message-avatar">${avatar}</div>
            <div class="message-content">
                <div class="message-bubble">${displayContent}</div>
                <div class="message-time">${this.formatTime(new Date())}</div>
            </div>
        `;

        messagesContainer.appendChild(messageEl);

        console.log('✅ Message appended. Total messages in DOM:', messagesContainer.querySelectorAll('.message').length);

        if (scroll) {
            // 强制浏览器立即渲染，避免批处理
            messageEl.offsetHeight; // 触发 reflow
            this.scrollToBottom();
        }
    }

    /**
     * 格式化消息内容
     */
    formatMessage(content) {
        let text = '';

        // 提取文本内容
        if (typeof content === 'string') {
            text = content;
        } else if (content === null || content === undefined) {
            text = '';
        } else if (typeof content === 'object') {
            // 处理对象类型的消息
            if (Array.isArray(content?.content)) {
                // OpenClaw 标准格式：{ content: [{ type: 'text', text: '...' }] }
                text = content.content.map(block => {
                    if (block.type === 'text') {
                        return block.text || '';
                    }
                    // 跳过非文本块（如图片、文件等）
                    return '';
                }).join('');
            } else if (content.text) {
                // 简单格式：{ text: '...' }
                text = content.text;
            } else if (content.message) {
                // 嵌套格式：{ message: '...' } 或 { message: { text: '...' } }
                text = typeof content.message === 'string'
                    ? content.message
                    : content.message?.text || '';
            } else {
                // 未知格式，尝试提取有用信息
                console.warn('⚠️ Unknown message format:', content);
                text = '[无法显示的消息内容]';
            }
        } else {
            // 其他类型（数字、布尔等）
            text = String(content);
        }

        // 渲染 Markdown
        if (typeof marked !== 'undefined') {
            try {
                const html = marked.parse(text);
                // 高亮代码块
                if (typeof hljs !== 'undefined') {
                    setTimeout(() => {
                        const codeBlocks = document.querySelectorAll('.message-bubble pre code');
                        codeBlocks.forEach((block) => {
                            hljs.highlightElement(block);
                        });
                    }, 0);
                }
                return html;
            } catch (e) {
                console.error('Markdown parse error:', e);
                return this.escapeHtml(text);
            }
        }

        // 如果 marked 不可用，返回纯文本
        return this.escapeHtml(text);
    }

    /**
     * 显示正在输入指示器
     */
    showTypingIndicator() {
        const { messagesContainer } = this.elements;

        let indicator = messagesContainer.querySelector('.typing-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'message assistant typing-message';
            indicator.innerHTML = `
                <div class="message-avatar">🦀</div>
                <div class="message-content">
                    <div class="message-bubble">
                        <div class="typing-indicator">
                            <span class="typing-dot"></span>
                            <span class="typing-dot"></span>
                            <span class="typing-dot"></span>
                        </div>
                    </div>
                </div>
            `;
            messagesContainer.appendChild(indicator);
        }

        this.scrollToBottom();
    }

    /**
     * 隐藏正在输入指示器
     */
    hideTypingIndicator() {
        const { messagesContainer } = this.elements;
        const indicator = messagesContainer.querySelector('.typing-message');
        if (indicator) {
            indicator.remove();
        }
    }

    /**
     * 清空所有消息
     */
    clearMessages() {
        const { messagesContainer } = this.elements;
        const welcomeMessage = messagesContainer.querySelector('.message.assistant');
        messagesContainer.innerHTML = '';
        if (welcomeMessage) {
            messagesContainer.appendChild(welcomeMessage);
        }
    }

    /**
     * 更新连接状态显示
     */
    updateStatus(status) {
        const { statusDot, statusText, sendBtn } = this.elements;

        statusDot.className = 'status-dot';

        switch (status) {
            case 'connected':
                statusDot.classList.add('connected');
                statusText.textContent = '已连接';
                sendBtn.disabled = false;
                break;
            case 'connecting':
                statusDot.classList.add('connecting');
                statusText.textContent = '连接中...';
                sendBtn.disabled = true;
                break;
            case 'disconnected':
                statusDot.classList.add('disconnected');
                statusText.textContent = '未连接';
                sendBtn.disabled = true;
                break;
        }
    }

    /**
     * 更新发送按钮状态
     */
    updateSendButton() {
        const { input, sendBtn } = this.elements;
        sendBtn.disabled = !input.value.trim() || !this.connected;
    }

    /**
     * 自动调整输入框高度
     */
    autoResizeInput() {
        const { input } = this.elements;
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    }

    /**
     * 滚动到底部
     */
    scrollToBottom() {
        const { messagesContainer } = this.elements;
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    /**
     * 显示错误提示
     */
    showError(message) {
        const existing = document.querySelector('.error-toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'error-toast';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.remove(), 5000);
    }

    /**
     * 格式化时间
     */
    formatTime(date) {
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    /**
     * 转义 HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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

    /**
     * 移除事件监听
     */
    off(event, callback) {
        if (!this.eventListeners.has(event)) return;
        const listeners = this.eventListeners.get(event);
        const index = listeners.indexOf(callback);
        if (index > -1) {
            listeners.splice(index, 1);
        }
    }

    /**
     * 触发事件
     */
    emit(event, data) {
        if (!this.eventListeners.has(event)) return;
        this.eventListeners.get(event).forEach(callback => callback(data));
    }

    /**
     * 断开连接
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
        }
    }

    /**
     * 销毁组件
     */
    destroy() {
        this.disconnect();
        if (this.authenticationManager) {
            this.authenticationManager.destroy();
        }
        if (this.container) {
            this.container.innerHTML = '';
        }
    }

    /**
     * 登出
     */
    async logout() {
        try {
            await this.authenticationManager.logout();
            this.disconnect();
        } catch (e) {
            console.error('Logout error:', e);
            this.showError('登出失败: ' + e.message);
        }
    }

    /**
     * 获取当前 sessionKey
     */
    getSessionKey() {
        if (this.userManager && this.userManager.hasUser()) {
            return this.userManager.getSessionKey();
        }
        return this.baseSessionKey;
    }

    /**
     * 获取认证参数
     */
    getAuthParams() {
        if (this.authenticationManager) {
            const authParams = this.authenticationManager.getAuthParams();
            if (Object.keys(authParams).length > 0) {
                return authParams;
            }
        }

        // 向后兼容：使用旧的配置
        const auth = {};
        if (this.token) auth.token = this.token;
        if (this.password) auth.password = this.password;
        return auth;
    }

    // ============================================================
    // 文件上传功能
    // ============================================================

    /**
     * 初始化文件上传功能
     */
    initFileUpload() {
        const fileUploadBar = this.elements.widget?.querySelector('#fileUploadBar');
        const fileUploadBtn = this.elements.widget?.querySelector('#fileUploadBtn');
        const fileInput = this.elements.widget?.querySelector('#fileInput');
        const fileList = this.elements.widget?.querySelector('#fileList');

        if (!fileUploadBar || !fileUploadBtn || !fileInput) {
            console.warn('文件上传元素未找到');
            return;
        }

        // 显示文件上传区域
        fileUploadBar.style.display = 'block';

        // 点击上传按钮
        fileUploadBtn.addEventListener('click', () => {
            fileInput.click();
        });

        // 文件选择事件
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files);
            }
            fileInput.value = ''; // 清空，允许重复选择
        });

        // 拖拽上传
        const inputWrapper = this.elements.widget?.querySelector('.input-wrapper');
        if (inputWrapper) {
            inputWrapper.addEventListener('dragover', (e) => {
                e.preventDefault();
                inputWrapper.style.borderColor = '#667eea';
                inputWrapper.style.backgroundColor = '#f0f4ff';
            });

            inputWrapper.addEventListener('dragleave', () => {
                inputWrapper.style.borderColor = '';
                inputWrapper.style.backgroundColor = '';
            });

            inputWrapper.addEventListener('drop', (e) => {
                e.preventDefault();
                inputWrapper.style.borderColor = '';
                inputWrapper.style.backgroundColor = '';

                if (e.dataTransfer.files.length > 0) {
                    this.handleFileSelect(e.dataTransfer.files);
                }
            });
        }

        console.log('✅ 文件上传功能已初始化');
    }

    /**
     * 处理文件选择
     */
    async handleFileSelect(files) {
        for (const file of files) {
            // 检查文件大小
            if (file.size > this.maxFileSize) {
                this.showError(`文件 "${file.name}" 太大（最大 100KB）。目前仅支持小型文本文件。`);
                continue;
            }

            try {
                const fileData = await this.fileToBase64(file);
                this.uploadedFiles.push(fileData);
                this.renderFileList();
            } catch (error) {
                console.error('文件读取失败:', error);
                this.showError(`文件 "${file.name}" 读取失败`);
            }
        }
    }

    /**
     * 将文件转换为 Base64
     */
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve({
                name: file.name,
                size: file.size,
                type: file.type,
                base64: reader.result.split(',')[1]
            });
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }

    /**
     * 渲染文件列表
     */
    renderFileList() {
        const fileList = this.elements.widget?.querySelector('#fileList');
        if (!fileList) return;

        if (this.uploadedFiles.length === 0) {
            fileList.innerHTML = '';
            return;
        }

        fileList.innerHTML = this.uploadedFiles.map((file, index) => `
            <div class="file-item">
                <div class="file-item-info">
                    <span class="file-item-icon">${this.getFileIcon(file.type)}</span>
                    <div class="file-item-details">
                        <div class="file-item-name">${this.escapeHtml(file.name)}</div>
                        <div class="file-item-size">${this.formatFileSize(file.size)}</div>
                    </div>
                </div>
                <button class="file-item-remove" data-index="${index}" title="移除文件">✕</button>
            </div>
        `).join('');

        // 添加删除按钮事件监听
        fileList.querySelectorAll('.file-item-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                this.removeFile(index);
            });
        });

        console.log(`📎 当前已上传 ${this.uploadedFiles.length} 个文件`);
    }

    /**
     * 移除文件
     */
    removeFile(index) {
        this.uploadedFiles.splice(index, 1);
        this.renderFileList();
    }

    /**
     * 获取文件图标
     */
    getFileIcon(mimeType) {
        const icons = {
            'image/png': '🖼️',
            'image/jpeg': '🖼️',
            'image/gif': '🖼️',
            'image/webp': '🖼️',
            'application/pdf': '📄',
            'text/plain': '📝',
            'text/html': '🌐',
            'text/csv': '📊',
            'application/json': '📋',
            'default': '📎'
        };
        return icons[mimeType] || icons['default'];
    }

    /**
     * 格式化文件大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * HTML 转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// 导出到全局
window.OpenClawChatWidget = OpenClawChatWidget;
