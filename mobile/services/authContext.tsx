import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { User } from '@/types';
import {
  getStoredToken,
  removeStoredToken,
  getStoredUser,
  removeStoredUser,
  loginWithApi,
  onAuthExpired,
} from './api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Đăng nhập thật qua POST /auth/login; sai thông tin thì trả về câu báo lỗi */
  login: (email: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  login: async () => ({ ok: false }),
  logout: async () => {},
});

/**
 * Trạng thái đăng nhập của app. Không còn tài khoản demo hay token giả:
 * mở app lần đầu là khách (vẫn xem được danh mục lớp), muốn xem lịch học thì đăng nhập bằng tài khoản thật.
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Khôi phục phiên đã lưu trong SecureStore
  useEffect(() => {
    let isMounted = true;

    async function loadStoredAuth() {
      try {
        const storedToken = await getStoredToken();
        const storedUser = await getStoredUser();
        if (isMounted && storedToken && storedUser) {
          setTokenState(storedToken);
          setUser(storedUser);
        }
      } catch (err) {
        console.warn('Failed restoring stored credentials:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadStoredAuth();

    // Token hết hạn (API trả 401): về trạng thái khách
    const unsubscribe = onAuthExpired(() => {
      setUser(null);
      setTokenState(null);
      Alert.alert(
        'Phiên đăng nhập hết hạn',
        'Phiên làm việc của bạn đã kết thúc. Vui lòng đăng nhập lại để tiếp tục sử dụng hệ thống.'
      );
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<{ ok: boolean; message?: string }> => {
    setIsLoading(true);
    try {
      const result = await loginWithApi(email.trim(), password);
      setUser(result.user);
      setTokenState(result.accessToken);
      return { ok: true };
    } catch (error: any) {
      const message = String(error?.message ?? '');
      if (message.includes('Network request failed')) {
        return { ok: false, message: 'Không kết nối được máy chủ. Kiểm tra mạng hoặc địa chỉ EXPO_PUBLIC_API_BASE_URL.' };
      }
      return { ok: false, message: message.startsWith('HTTP') || !message ? 'Email hoặc mật khẩu không đúng.' : message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    await removeStoredToken();
    await removeStoredUser();
    setUser(null);
    setTokenState(null);
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
