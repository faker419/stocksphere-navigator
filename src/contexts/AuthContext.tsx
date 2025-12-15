import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi, getTokens, clearTokens, User, Privilege } from '@/lib/api';

interface AuthContextType {
  user: User | null;
  privileges: Privilege[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  hasPrivilege: (privilegeName: string) => boolean;
  hasAnyPrivilege: (privilegeNames: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [privileges, setPrivileges] = useState<Privilege[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserAndPrivileges = useCallback(async () => {
    try {
      const currentUser = await authApi.getCurrentUser();
      setUser(currentUser);
      
      const userPrivileges = await authApi.getUserPrivileges(currentUser.id);
      setPrivileges(userPrivileges);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      clearTokens();
      setUser(null);
      setPrivileges([]);
    }
  }, []);

  useEffect(() => {
    const initAuth = async () => {
      const { accessToken } = getTokens();
      if (accessToken) {
        await fetchUserAndPrivileges();
      }
      setIsLoading(false);
    };

    initAuth();
  }, [fetchUserAndPrivileges]);

  const login = async (username: string, password: string) => {
    await authApi.login(username, password);
    await fetchUserAndPrivileges();
  };

  const logout = () => {
    authApi.logout();
    setUser(null);
    setPrivileges([]);
  };

  const hasPrivilege = useCallback((privilegeName: string) => {
    return privileges.some(p => p.name === privilegeName);
  }, [privileges]);

  const hasAnyPrivilege = useCallback((privilegeNames: string[]) => {
    return privilegeNames.some(name => hasPrivilege(name));
  }, [hasPrivilege]);

  return (
    <AuthContext.Provider
      value={{
        user,
        privileges,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        hasPrivilege,
        hasAnyPrivilege,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
