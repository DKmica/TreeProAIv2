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
    // In a real app, you'd make an API call here.
    // For this demo, we'll use a hardcoded user.
    if (email === 'admin@tree-pro.ai') {
      const authToken = 'fake-jwt-token';
      sessionStorage.setItem('authToken', authToken);
      setIsAuthenticated(true);
      navigate('/dashboard');
      return Promise.resolve();
    } else {
      return Promise.reject(new Error('Invalid email or password.'));
    }
  };

  const logout = () => {
    sessionStorage.removeItem('authToken');
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
