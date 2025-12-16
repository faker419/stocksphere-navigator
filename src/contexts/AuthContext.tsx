import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { clearTokens, User, Privilege } from '@/lib/api';

// Mock user data for development
const MOCK_USERS = [
  {
    username: 'admin',
    password: 'password',
    user: {
      id: '1',
      username: 'admin',
      email: 'admin@dsms.com',
      full_name: 'System Administrator',
      role_id: '1',
      role_name: 'Administrator',
      is_active: true,
      created_at: new Date().toISOString(),
    },
    privileges: [
      { id: '1', name: 'can_view_requests', description: 'View requests' },
      { id: '2', name: 'can_approve_requests', description: 'Approve requests' },
      { id: '3', name: 'can_fulfill_requests', description: 'Fulfill requests' },
      { id: '4', name: 'can_view_stock', description: 'View stock' },
      { id: '5', name: 'can_adjust_stock', description: 'Adjust stock' },
      { id: '6', name: 'can_view_machinery', description: 'View machinery' },
      { id: '7', name: 'can_manage_users', description: 'Manage users' },
      { id: '8', name: 'can_manage_roles', description: 'Manage roles' },
    ],
  },
];

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

  useEffect(() => {
    // Check for stored session on mount
    const storedUser = localStorage.getItem('dsms_user');
    const storedPrivileges = localStorage.getItem('dsms_privileges');
    
    if (storedUser && storedPrivileges) {
      setUser(JSON.parse(storedUser));
      setPrivileges(JSON.parse(storedPrivileges));
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string) => {
    // Mock authentication
    const mockUser = MOCK_USERS.find(
      u => u.username === username && u.password === password
    );

    if (!mockUser) {
      throw new Error('Invalid credentials');
    }

    // Store in localStorage for persistence
    localStorage.setItem('dsms_user', JSON.stringify(mockUser.user));
    localStorage.setItem('dsms_privileges', JSON.stringify(mockUser.privileges));
    localStorage.setItem('dsms_access_token', 'mock_token');

    setUser(mockUser.user);
    setPrivileges(mockUser.privileges);
  };

  const logout = () => {
    clearTokens();
    localStorage.removeItem('dsms_user');
    localStorage.removeItem('dsms_privileges');
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
