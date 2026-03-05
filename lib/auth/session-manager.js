/**
 * SessionManager - 会话持久化管理
 * 负责用户会话的 localStorage 存储和恢复
 */
class SessionManager {
    constructor(config = {}) {
        this.storagePrefix = config.storagePrefix || 'openclaw';
        this.enabled = config.persist !== false; // 默认启用持久化
        this.autoRestore = config.autoRestore !== false; // 默认启用自动恢复

        // 存储键名
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

    /**
     * 保存用户ID
     */
    saveUserId(userId) {
        if (!this.enabled) return;
        try {
            localStorage.setItem(this.STORAGE_KEYS.USER_ID, userId);
        } catch (e) {
            console.error('Failed to save user ID:', e);
        }
    }

    /**
     * 获取保存的用户ID
     */
    getUserId() {
        if (!this.enabled) return null;
        try {
            return localStorage.getItem(this.STORAGE_KEYS.USER_ID);
        } catch (e) {
            console.error('Failed to get user ID:', e);
            return null;
        }
    }

    /**
     * 保存用户信息
     */
    saveUserInfo(userInfo) {
        if (!this.enabled) return;
        try {
            localStorage.setItem(this.STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
        } catch (e) {
            console.error('Failed to save user info:', e);
        }
    }

    /**
     * 获取保存的用户信息
     */
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

    /**
     * 保存 token
     */
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

    /**
     * 获取保存的 token
     */
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

    /**
     * 获取 access token
     */
    getAccessToken() {
        const tokens = this.getTokens();
        return tokens ? tokens.accessToken : null;
    }

    /**
     * 检查 token 是否过期
     */
    isTokenExpired() {
        const tokens = this.getTokens();
        if (!tokens || !tokens.expiresAt) return true;
        // 提前5分钟认为token已过期
        return Date.now() >= (tokens.expiresAt - 5 * 60 * 1000);
    }

    /**
     * 保存会话数据
     */
    saveSessionData(sessionData) {
        if (!this.enabled) return;
        try {
            localStorage.setItem(this.STORAGE_KEYS.SESSION_DATA, JSON.stringify(sessionData));
        } catch (e) {
            console.error('Failed to save session data:', e);
        }
    }

    /**
     * 获取会话数据
     */
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

    /**
     * 保存 PKCE code_verifier
     */
    savePKCEVerifier(verifier) {
        if (!this.enabled) return;
        try {
            localStorage.setItem(this.STORAGE_KEYS.PKCE_VERIFIER, verifier);
        } catch (e) {
            console.error('Failed to save PKCE verifier:', e);
        }
    }

    /**
     * 获取并清除 PKCE code_verifier
     */
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

    /**
     * 保存 OAuth state 参数
     */
    saveOAuthState(state) {
        if (!this.enabled) return;
        try {
            localStorage.setItem(this.STORAGE_KEYS.OAUTH_STATE, state);
        } catch (e) {
            console.error('Failed to save OAuth state:', e);
        }
    }

    /**
     * 验证并获取 OAuth state
     */
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

    /**
     * 清除所有会话数据
     */
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

    /**
     * 清除 token 数据
     */
    clearTokens() {
        if (!this.enabled) return;
        try {
            localStorage.removeItem(this.STORAGE_KEYS.TOKENS);
        } catch (e) {
            console.error('Failed to clear tokens:', e);
        }
    }

    /**
     * 检查是否有已保存的会话
     */
    hasSession() {
        return this.getUserId() !== null && this.getTokens() !== null;
    }

    /**
     * 获取完整的会话状态
     */
    getSessionState() {
        return {
            userId: this.getUserId(),
            userInfo: this.getUserInfo(),
            tokens: this.getTokens(),
            sessionData: this.getSessionData()
        };
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SessionManager;
}
