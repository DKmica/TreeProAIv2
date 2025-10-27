import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  email: string;
  password: string;
  role: 'owner' | 'admin' | 'user';
  name: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  userEmail: string | null;
  userRole: string | null;
  userName: string | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Authorized users with owner access
const authorizedUsers: User[] = [
  {
    email: 'dakoenig4@gmail.com',
    password: '12Tree45',
    role: 'owner',
    name: 'David Koenig'
  },
  {
    email: 'nullgbow@gmail.com',
    password: '12Tree45',
    role: 'owner',
    name: 'Admin User'
  }
];

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!sessionStorage.getItem('authToken'));
  const [userEmail, setUserEmail] = useState<string | null>(sessionStorage.getItem('userEmail'));
  const [userRole, setUserRole] = useState<string | null>(sessionStorage.getItem('userRole'));
  const [userName, setUserName] = useState<string | null>(sessionStorage.getItem('userName'));
  const navigate = useNavigate();

  const login = async (email: string, pass: string): Promise<void> => {
    if (!email || !pass) {
      return Promise.reject(new Error('Please enter both email and password.'));
    }

    // Find user in authorized users list
    const user = authorizedUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      return Promise.reject(new Error('Invalid email or password. Access denied.'));
    }

    // Verify password
    if (user.password !== pass) {
      return Promise.reject(new Error('Invalid email or password. Access denied.'));
    }

    // Authentication successful
    const authToken = `token-${Date.now()}-${user.email}`;
    sessionStorage.setItem('authToken', authToken);
    sessionStorage.setItem('userEmail', user.email);
    sessionStorage.setItem('userRole', user.role);
    sessionStorage.setItem('userName', user.name);
    
    setIsAuthenticated(true);
    setUserEmail(user.email);
    setUserRole(user.role);
    setUserName(user.name);
    
    navigate('/dashboard');
    return Promise.resolve();
  };

  const logout = () => {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userRole');
    sessionStorage.removeItem('userName');
    setIsAuthenticated(false);
    setUserEmail(null);
    setUserRole(null);
    setUserName(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, userEmail, userRole, userName, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};