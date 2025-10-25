import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!sessionStorage.getItem('authToken'));
  const navigate = useNavigate();

  const login = async (email: string, pass: string): Promise<void> => {
    // Demo mode: Accept any email/password combination
    // In production, this would make an API call to verify credentials
    if (email && pass) {
      const authToken = `demo-token-${Date.now()}`;
      sessionStorage.setItem('authToken', authToken);
      sessionStorage.setItem('userEmail', email);
      setIsAuthenticated(true);
      navigate('/dashboard');
      return Promise.resolve();
    } else {
      return Promise.reject(new Error('Please enter both email and password.'));
    }
  };

  const logout = () => {
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userEmail');
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
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