/**
 * SAMLHandler - SAML 2.0 认证处理器
 * 实现 SAML 2.0 SSO (单点登录)
 *
 * 注意：SAML 认证通常需要后端支持，因为：
 * 1. 需要验证 SAML 断言签名
 * 2. 需要解密加密的断言
 * 3. 客户端无法安全存储私钥
 *
 * 此处理器主要用于与后端 SAML 服务交互
 */
class SAMLHandler {
    constructor(config) {
        this.sessionManager = config.sessionManager;
        this.userManager = config.userManager;

        // SAML 配置
        this.ssoUrl = config.ssoUrl; // IdP SSO 登录 URL
        this.sloUrl = config.sloUrl; // IdP SSO 登出 URL (可选)
        this.spEntityId = config.spEntityId; // Service Provider 实体 ID
        this.acsUrl = config.acsUrl; // Assertion Consumer Service URL
        this relayState = config.relayState; // 中继状态 (可选)

        // 后端 API 配置 (用于处理 SAML 响应)
        this.backendApi = config.backendApi;

        // 事件监听器
        this.eventListeners = new Map();

        // 回调监听器
        this.callbackHandler = null;
    }

    /**
     * 开始 SAML 认证流程
     */
    async authenticate() {
        // 生成中继状态
        const relayState = this.relayState || this.generateRelayState();

        // 保存中继状态
        this.sessionManager.saveOAuthState(relayState);

        // 构建认证 URL 并重定向
        const authUrl = this.buildSAMLUrl(relayState);

        if (this.usePopup) {
            await this.authenticateWithPopup(authUrl, relayState);
        } else {
            window.location.href = authUrl;
        }
    }

    /**
     * 构建 SAML 认证 URL
     */
    buildSAMLUrl(relayState) {
        // 通常需要向 SP 后端请求生成 SAML AuthnRequest
        // 这里简化为直接重定向到 IdP
        const params = new URLSearchParams({
            SAMLRequest: this.generateAuthnRequest(),
            RelayState: relayState
        });

        return `${this.ssoUrl}?${params.toString()}`;
    }

    /**
     * 生成 SAML AuthnRequest (简化版)
     * 实际应用中应该由后端生成并签名
     */
    generateAuthnRequest() {
        // 这是一个简化的示例，实际应该由后端生成
        const authnRequest = `
            <samlp:AuthnRequest
                xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                ID="${this.generateId()}"
                Version="2.0"
                ProtocolBinding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
                AssertionConsumerServiceURL="${this.acsUrl}"
                Destination="${this.ssoUrl}">
                <saml:Issuer>${this.spEntityId}</saml:Issuer>
                <samlp:NameIDPolicy Format="urn:oasis:names:tc:SAML:1.1:nameid-format:unspecified"/>
            </samlp:AuthnRequest>
        `;

        // 实际需要 Base64 编码并可能需要 deflate
        return btoa(authnRequest);
    }

    /**
     * 使用弹窗进行认证
     */
    authenticateWithPopup(authUrl, relayState) {
        return new Promise((resolve, reject) => {
            const width = 500;
            const height = 600;
            const left = (window.screen.width - width) / 2;
            const top = (window.screen.height - height) / 2;

            const popup = window.open(
                authUrl,
                'saml-popup',
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

    /**
     * 设置回调处理器
     */
    setupCallbackHandler(callback) {
        this.callbackHandler = callback;
        window.addEventListener('message', this.handleMessageEvent);
    }

    /**
     * 处理来自弹窗的消息
     */
    handleMessageEvent = (event) => {
        if (!this.validateOrigin(event.origin)) {
            return;
        }

        const { type, data } = event.data;
        if (type === 'saml-callback' && this.callbackHandler) {
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
            new URL(this.acsUrl).origin
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
     * 处理 SAML 回调
     */
    async handleCallback(params) {
        const { SAMLResponse, RelayState, error } = params;

        // 检查错误
        if (error) {
            throw new Error(error);
        }

        // 验证 relay state
        if (!this.sessionManager.validateOAuthState(RelayState)) {
            throw new Error('Invalid relay state');
        }

        // 将 SAML 响应发送到后端进行验证和解析
        const userInfo = await this.validateSAMLResponse(SAMLResponse);

        // 设置用户
        this.userManager.setUser(userInfo.id, userInfo);

        // 保存会话
        this.sessionManager.saveUserId(userInfo.id);
        this.sessionManager.saveUserInfo(userInfo);

        // 保存后端返回的 token (如果有)
        if (userInfo.tokens) {
            this.sessionManager.saveTokens(userInfo.tokens);
        }

        // 触发认证成功事件
        this.emit('authenticated', {
            userId: userInfo.id,
            userInfo: userInfo
        });
    }

    /**
     * 验证 SAML 响应 (需要后端支持)
     */
    async validateSAMLResponse(samlResponse) {
        if (!this.backendApi) {
            throw new Error('SAML 认证需要配置后端 API');
        }

        const response = await fetch(this.backendApi + '/saml/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                SAMLResponse: samlResponse
            })
        });

        if (!response.ok) {
            throw new Error('SAML validation failed');
        }

        return await response.json();
    }

    /**
     * 生成唯一 ID
     */
    generateId() {
        return '_' + this.generateRandomString(32);
    }

    /**
     * 生成随机字符串
     */
    generateRandomString(length) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const array = new Uint8Array(length);
        window.crypto.getRandomValues(array);
        return Array.from(array, byte => charset[byte % charset.length]).join('');
    }

    /**
     * 生成中继状态
     */
    generateRelayState() {
        return this.generateRandomString(32);
    }

    /**
     * 检查是否已认证
     */
    isAuthenticated() {
        return this.userManager.hasUser();
    }

    /**
     * 登出
     */
    async logout() {
        const userId = this.userManager.getUserId();
        const sessionIndex = this.sessionManager.getSessionData()?.sessionIndex;

        if (this.sloUrl && userId) {
            // 构建 SAML LogoutRequest
            const logoutUrl = this.buildLogoutUrl(userId, sessionIndex);

            // 清除本地会话
            this.sessionManager.clearSession();
            this.userManager.clearUser();

            // 重定向到 IdP 登出
            if (this.usePopup) {
                window.open(logoutUrl, 'saml-logout', 'width=500,height=600');
            } else {
                window.location.href = logoutUrl;
            }
        } else {
            // 仅清除本地会话
            this.sessionManager.clearSession();
            this.userManager.clearUser();
        }
    }

    /**
     * 构建 SAML 登出 URL
     */
    buildLogoutUrl(userId, sessionIndex) {
        const logoutRequest = `
            <samlp:LogoutRequest
                xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                ID="${this.generateId()}"
                Version="2.0"
                Destination="${this.sloUrl}">
                <saml:Issuer>${this.spEntityId}</saml:Issuer>
                <samlp:SessionIndex>${sessionIndex || ''}</samlp:SessionIndex>
            </samlp:LogoutRequest>
        `;

        const params = new URLSearchParams({
            SAMLRequest: btoa(logoutRequest)
        });

        return `${this.sloUrl}?${params.toString()}`;
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
        this.eventListeners.clear();
    }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SAMLHandler;
}
