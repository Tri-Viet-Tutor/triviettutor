import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, UserRole } from '@/types';
import { CURRENT_STUDENT, DEMO_USERS } from '@/constants/data';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, role?: UserRole) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: 'student' | 'tutor' | 'admin') => void;
}

const AuthContext = createContext<AuthContextType>({
  user: CURRENT_STUDENT,
  isAuthenticated: true,
  isLoading: false,
  login: async () => true,
  logout: () => {},
  switchRole: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(CURRENT_STUDENT);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const login = async (email: string, role: UserRole = 'ROLE_STUDENT'): Promise<boolean> => {
    setIsLoading(true);
    // Giả lập xác thực nhanh và lưu trạng thái
    await new Promise((resolve) => setTimeout(resolve, 500));
    const foundUser: User = {
      id: 'usr-current',
      fullName: email.split('@')[0] || 'Học viên VietTri',
      email,
      role,
      gradeLevel: 'GRADE_12',
    };
    setUser(foundUser);
    setIsLoading(false);
    return true;
  };

  const logout = () => {
    setUser(null);
  };

  const switchRole = (role: 'student' | 'tutor' | 'admin') => {
    setUser(DEMO_USERS[role] || CURRENT_STUDENT);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
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
