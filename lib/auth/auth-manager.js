/**
 * AuthenticationManager - 认证协调器
 * 负责协调不同的认证方式 (token, password, oauth2, saml)
 */
class AuthenticationManager {
    constructor(config = {}) {
        this.config = config;
        this.authType = config.type || 'none';
        this.sessionManager = config.sessionManager;
        this.userManager = config.userManager;

        // 认证状态
        this.isAuthenticated = false;
        this.isAuthenticating = false;

        // 当前认证处理器
        this.handler = null;

        // 事件监听器
        this.eventListeners = new Map();

        this.initHandler();
    }

    /**
     * 初始化认证处理器
     */
    initHandler() {
        switch (this.authType) {
            case 'oauth2':
                this.handler = new OAuth2Handler({
                    ...this.config.oauth2,
                    sessionManager: this.sessionManager,
                    userManager: this.userManager
                });
                break;
            case 'saml':
                this.handler = new SAMLHandler({
                    ...this.config.saml,
                    sessionManager: this.sessionManager,
                    userManager: this.userManager
                });
                break;
            case 'token':
            case 'password':
                this.handler = new TokenAuthHandler({
                    authType: this.authType,
                    token: this.config.token,
                    password: this.config.password
                });
                break;
            default:
                this.handler = new NoneAuthHandler();
        }

        // 转发处理器事件
        if (this.handler) {
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

    /**
     * 开始认证流程
     */
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

    /**
     * 检查是否需要认证
     */
    requiresAuthentication() {
        return this.authType === 'oauth2' || this.authType === 'saml';
    }

    /**
     * 检查是否已认证
     */
    checkAuthenticated() {
        return this.isAuthenticated;
    }

    /**
     * 尝试从存储恢复会话
     */
    async restoreSession() {
        if (!this.sessionManager.autoRestore) {
            return false;
        }

        const sessionState = this.sessionManager.getSessionState();
        if (!sessionState.userId || !sessionState.tokens) {
            return false;
        }

        // 检查 token 是否过期
        if (this.sessionManager.isTokenExpired()) {
            // 尝试刷新 token
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

        // 恢复用户信息
        this.userManager.setUser(sessionState.userId, sessionState.userInfo);
        this.isAuthenticated = true;
        this.emit('authenticated', {
            userId: sessionState.userId,
            userInfo: sessionState.userInfo
        });

        return true;
    }

    /**
     * 登出
     */
    async logout() {
        if (this.handler && this.handler.logout) {
            await this.handler.logout();
        }

        this.sessionManager.clearSession();
        this.userManager.clearUser();
        this.isAuthenticated = false;

        this.emit('logout');
    }

    /**
     * 获取认证参数 (用于 WebSocket 连接)
     */
    getAuthParams() {
        if (this.handler) {
            return this.handler.getAuthParams();
        }
        return {};
    }

    /**
     * 获取 access token
     */
    getAccessToken() {
        return this.sessionManager.getAccessToken();
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
        this.eventListeners.clear();
        if (this.handler && this.handler.destroy) {
            this.handler.destroy();
        }
    }
}

/**
 * TokenAuthHandler - Token/Password 认证处理器
 */
class TokenAuthHandler {
    constructor(config) {
        this.authType = config.authType;
        this.token = config.token;
        this.password = config.password;
        this.eventListeners = new Map();
    }

    async authenticate() {
        // Token/Password 认证不需要额外流程
        this.emit('authenticated', {});
    }

    getAuthParams() {
        const auth = {};
        if (this.token) auth.token = this.token;
        if (this.password) auth.password = this.password;
        return auth;
    }

    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    emit(event, data) {
        if (!this.eventListeners.has(event)) return;
        this.eventListeners.get(event).forEach(callback => callback(data));
    }
}

/**
 * NoneAuthHandler - 无认证处理器
 */
class NoneAuthHandler {
    constructor() {
        this.eventListeners = new Map();
    }

    async authenticate() {
        this.emit('authenticated', {});
    }

    getAuthParams() {
        return {};
    }

    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    emit(event, data) {
        if (!this.eventListeners.has(event)) return;
        this.eventListeners.get(event).forEach(callback => callback(data));
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AuthenticationManager, TokenAuthHandler, NoneAuthHandler };
}
