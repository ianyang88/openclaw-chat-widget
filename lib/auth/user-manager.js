/**
 * UserManager - 用户ID管理与sessionKey生成
 * 负责生成用户专属的 sessionKey 并管理用户信息
 */
class UserManager {
    constructor(config = {}) {
        this.userId = null;
        this.userInfo = null;
        this.baseSessionKey = config.baseSessionKey || 'agent:main';
        this.userPrefix = config.userPrefix || 'direct';
    }

    /**
     * 设置当前用户
     * @param {string} userId - 用户唯一标识
     * @param {object} userInfo - 用户信息 {name, email, avatar, etc.}
     */
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

    /**
     * 清除当前用户
     */
    clearUser() {
        this.userId = null;
        this.userInfo = null;
    }

    /**
     * 获取当前用户ID
     */
    getUserId() {
        return this.userId;
    }

    /**
     * 获取当前用户信息
     */
    getUserInfo() {
        return this.userInfo;
    }

    /**
     * 生成用户专属的 sessionKey
     * 格式: agent:main:direct:{userId}
     * @param {string} userId - 用户ID（如果不提供则使用当前用户ID）
     */
    generateSessionKey(userId = null) {
        const targetUserId = userId || this.userId;
        if (!targetUserId) {
            // 如果没有用户ID，返回默认的 sessionKey
            return `${this.baseSessionKey}:main`;
        }
        return `${this.baseSessionKey}:${this.userPrefix}:${targetUserId}`;
    }

    /**
     * 获取当前 sessionKey
     */
    getSessionKey() {
        return this.generateSessionKey();
    }

    /**
     * 检查是否有已登录用户
     */
    hasUser() {
        return this.userId !== null;
    }

    /**
     * 从 JWT token 解析用户ID
     * @param {string} token - JWT access token
     * @param {string} userIdClaim - 用于获取用户ID的claim名称
     */
    parseUserIdFromJWT(token, userIdClaim = 'sub') {
        try {
            // 解析 JWT (不验证签名，前端只做简单解析)
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

    /**
     * 从 IdToken 解析用户信息
     * @param {string} idToken - JWT ID token
     */
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

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserManager;
}
