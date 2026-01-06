import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '../types/auth';

// 平台管理员认证上下文类型
interface PlatformAuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
    logout: () => void;
}

// 创建平台认证上下文
const PlatformAuthContext = createContext<PlatformAuthContextType | undefined>(undefined);

// 平台认证提供者组件
interface PlatformAuthProviderProps {
    children: ReactNode;
}

// 🆕 使用独立的存储键，与普通教师登录分离
const PLATFORM_TOKEN_KEY = 'platform_auth_token';
const PLATFORM_USER_KEY = 'platform_auth_user';

export const PlatformAuthProvider: React.FC<PlatformAuthProviderProps> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const isAuthenticated = Boolean(user && token);

    // 检查平台管理员认证状态
    const checkAuth = async () => {
        setIsLoading(true);
        try {
            const storedToken = localStorage.getItem(PLATFORM_TOKEN_KEY);
            const storedUser = localStorage.getItem(PLATFORM_USER_KEY);

            if (storedToken && storedUser) {
                const response = await fetch('/api/auth/me', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${storedToken}`,
                        'Content-Type': 'application/json',
                    },
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.user) {
                        // 验证是否为平台管理员
                        if (data.user.role === 'PLATFORM_ADMIN') {
                            setToken(storedToken);
                            const normalizedUser = { ...data.user, id: data.user.id || data.user.userId };
                            setUser(normalizedUser);
                        } else {
                            // 不是平台管理员，清除
                            localStorage.removeItem(PLATFORM_TOKEN_KEY);
                            localStorage.removeItem(PLATFORM_USER_KEY);
                        }
                    } else {
                        localStorage.removeItem(PLATFORM_TOKEN_KEY);
                        localStorage.removeItem(PLATFORM_USER_KEY);
                    }
                } else {
                    localStorage.removeItem(PLATFORM_TOKEN_KEY);
                    localStorage.removeItem(PLATFORM_USER_KEY);
                }
            }
        } catch (error) {
            console.error('Platform auth check error:', error);
            localStorage.removeItem(PLATFORM_TOKEN_KEY);
            localStorage.removeItem(PLATFORM_USER_KEY);
        } finally {
            setIsLoading(false);
        }
    };

    // 平台管理员登录
    const login = async (username: string, password: string): Promise<{ success: boolean; message?: string }> => {
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (data.success && data.token && data.user) {
                // 验证角色是否为平台管理员
                if (data.user.role !== 'PLATFORM_ADMIN') {
                    return { success: false, message: '该账号不是平台管理员，请使用正确的账号登录' };
                }

                setToken(data.token);
                const normalizedUser = { ...data.user, id: data.user.id || data.user.userId };
                setUser(normalizedUser);

                // 🆕 使用独立的存储键
                localStorage.setItem(PLATFORM_TOKEN_KEY, data.token);
                localStorage.setItem(PLATFORM_USER_KEY, JSON.stringify(normalizedUser));

                return { success: true };
            } else {
                return { success: false, message: data.message || '登录失败' };
            }
        } catch (error) {
            console.error('Platform login error:', error);
            return { success: false, message: '网络错误，请稍后重试' };
        }
    };

    // 平台管理员登出
    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem(PLATFORM_TOKEN_KEY);
        localStorage.removeItem(PLATFORM_USER_KEY);
    };

    useEffect(() => {
        checkAuth();
    }, []);

    const contextValue: PlatformAuthContextType = {
        user,
        token,
        isLoading,
        isAuthenticated,
        login,
        logout,
    };

    return (
        <PlatformAuthContext.Provider value={contextValue}>
            {children}
        </PlatformAuthContext.Provider>
    );
};

// 使用平台认证上下文的 Hook
export const usePlatformAuth = (): PlatformAuthContextType => {
    const context = useContext(PlatformAuthContext);
    if (context === undefined) {
        throw new Error('usePlatformAuth must be used within a PlatformAuthProvider');
    }
    return context;
};

export default PlatformAuthContext;
