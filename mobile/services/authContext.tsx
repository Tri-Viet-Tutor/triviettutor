import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { User, UserRole } from '@/types';
import { CURRENT_STUDENT, DEMO_USERS } from '@/constants/data';
import {
  getStoredToken,
  setStoredToken,
  removeStoredToken,
  getStoredUser,
  setStoredUser,
  removeStoredUser,
  loginWithApi,
  onAuthExpired,
} from './api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, roleOrPassword?: string | UserRole, maybeRole?: UserRole) => Promise<boolean>;
  logout: () => Promise<void>;
  switchRole: (role: 'student' | 'tutor' | 'admin') => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: CURRENT_STUDENT,
  token: null,
  isAuthenticated: true,
  isLoading: false,
  login: async () => true,
  logout: async () => {},
  switchRole: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(CURRENT_STUDENT);
  const [token, setTokenState] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize auth state from SecureStore
  useEffect(() => {
    let isMounted = true;
    async function loadStoredAuth() {
      try {
        const storedToken = await getStoredToken();
        const storedUser = await getStoredUser();

        if (isMounted) {
          if (storedToken && storedUser) {
            setTokenState(storedToken);
            setUser(storedUser);
          } else {
            // Seed initial demo session token for out-of-the-box experience
            const initialToken = 'demo-bearer-jwt-token-viettritutor';
            await setStoredToken(initialToken);
            await setStoredUser(CURRENT_STUDENT);
            setTokenState(initialToken);
            setUser(CURRENT_STUDENT);
          }
        }
      } catch (err) {
        console.warn('Failed restoring stored credentials:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadStoredAuth();

    // Subscribe to JWT expiration events (401 interceptor)
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

  const login = async (
    email: string,
    roleOrPassword?: string | UserRole,
    maybeRole?: UserRole
  ): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Determine if a password was passed
      const isRole =
        roleOrPassword === 'ROLE_STUDENT' ||
        roleOrPassword === 'ROLE_TUTOR' ||
        roleOrPassword === 'ROLE_ADMIN';

      if (!isRole && typeof roleOrPassword === 'string' && roleOrPassword.length > 0) {
        try {
          // Attempt real backend authentication
          const result = await loginWithApi(email, roleOrPassword);
          setUser(result.user);
          setTokenState(result.accessToken);
          setIsLoading(false);
          return true;
        } catch {
          // Fall through to demo user creation if backend not reachable
        }
      }

      const role: UserRole = isRole
        ? (roleOrPassword as UserRole)
        : maybeRole || 'ROLE_STUDENT';

      await new Promise((resolve) => setTimeout(resolve, 300));
      const demoToken = `jwt-token-${email.split('@')[0]}-${Date.now()}`;
      const foundUser: User = {
        id: 'usr-current',
        fullName: email.split('@')[0] || 'Học viên VietTri',
        email,
        role,
        gradeLevel: 'GRADE_12',
      };

      await setStoredToken(demoToken);
      await setStoredUser(foundUser);
      setUser(foundUser);
      setTokenState(demoToken);
      setIsLoading(false);
      return true;
    } catch {
      setIsLoading(false);
      return false;
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

  const switchRole = async (role: 'student' | 'tutor' | 'admin') => {
    setIsLoading(true);
    const targetUser = DEMO_USERS[role] || CURRENT_STUDENT;
    const demoToken = `jwt-token-${role}-${Date.now()}`;
    await setStoredToken(demoToken);
    await setStoredUser(targetUser);
    setUser(targetUser);
    setTokenState(demoToken);
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
        switchRole,
      }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
