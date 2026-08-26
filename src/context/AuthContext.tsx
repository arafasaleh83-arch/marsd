import React, { createContext, useContext, useState, useEffect } from 'react';

export type UserRole = 'presidential' | 'editor';

interface AuthContextType {
  isAuthenticated: boolean;
  role: UserRole | null;
  username: string;
  isReadOnly: boolean;
  login: (role: UserRole, passcode: string, customUsername?: string) => { success: boolean; message?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const UNIFIED_PASSCODE = '0000';
const ACCEPTED_PASSCODES = ['0000', 'presidential2026', 'editor2026', '123456'];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('libya_auth_granted') === 'true';
    } catch {
      return false;
    }
  });

  const [role, setRole] = useState<UserRole | null>(() => {
    try {
      const savedRole = sessionStorage.getItem('libya_auth_role');
      return (savedRole === 'presidential' || savedRole === 'editor') ? savedRole : null;
    } catch {
      return null;
    }
  });

  const [username, setUsername] = useState<string>(() => {
    try {
      return sessionStorage.getItem('libya_auth_username') || '';
    } catch {
      return '';
    }
  });

  const login = (selectedRole: UserRole, passcode: string, customUsername?: string) => {
    const cleanPass = passcode.trim();
    
    if (cleanPass === UNIFIED_PASSCODE || ACCEPTED_PASSCODES.includes(cleanPass)) {
      if (selectedRole === 'presidential') {
        const name = customUsername?.trim() || 'المكتب الرئاسي - العرض الفوري';
        sessionStorage.setItem('libya_auth_granted', 'true');
        sessionStorage.setItem('libya_auth_role', 'presidential');
        sessionStorage.setItem('libya_auth_username', name);
        
        setIsAuthenticated(true);
        setRole('presidential');
        setUsername(name);
        return { success: true };
      } else {
        const name = customUsername?.trim() || 'مُدخِل ومُحلل بيانات - غرفة التشغيل';
        sessionStorage.setItem('libya_auth_granted', 'true');
        sessionStorage.setItem('libya_auth_role', 'editor');
        sessionStorage.setItem('libya_auth_username', name);

        setIsAuthenticated(true);
        setRole('editor');
        setUsername(name);
        return { success: true };
      }
    } else {
      return { success: false, message: 'رمز الدخول غير صحيح، يرجى المحاولة مرة أخرى.' };
    }
  };

  const logout = () => {
    try {
      sessionStorage.removeItem('libya_auth_granted');
      sessionStorage.removeItem('libya_auth_role');
      sessionStorage.removeItem('libya_auth_username');
    } catch (e) {
      console.error(e);
    }
    setIsAuthenticated(false);
    setRole(null);
    setUsername('');
  };

  const isReadOnly = role === 'presidential';

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        role,
        username,
        isReadOnly,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
