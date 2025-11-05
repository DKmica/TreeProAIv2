import React from 'react';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const { login } = useAuth();

  const handleLogin = () => {
    login();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-gray-900 via-brand-gray-800 to-brand-gray-950 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="flex flex-col items-center">
          <img src="/logo.jpg" alt="TreePro AI" className="h-32 w-32 rounded-full shadow-lg shadow-brand-cyan-500/50 ring-4 ring-brand-cyan-500/30" />
          <h2 className="mt-6 text-center text-4xl font-extrabold text-white">
            TreePro AI
          </h2>
          <p className="mt-2 text-center text-sm text-brand-gray-300">
            Professional Tree Service Management
          </p>
        </div>
        <div className="mt-8 space-y-4 bg-white p-8 rounded-lg shadow-lg">
          <p className="text-center text-brand-gray-700 mb-4">
            Sign in or create an account to get started
          </p>
          
          <div className="space-y-3">
            <button
              onClick={handleLogin}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-cyan-600 hover:bg-brand-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-cyan-500 transition-colors"
            >
              Sign In
            </button>
            
            <button
              onClick={handleLogin}
              className="group relative w-full flex justify-center py-3 px-4 border-2 border-brand-cyan-600 text-sm font-medium rounded-md text-brand-cyan-600 bg-white hover:bg-brand-cyan-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-cyan-500 transition-colors"
            >
              Sign Up
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-brand-gray-500">
              Choose from multiple sign-in options including Google, GitHub, X, Apple, or email/password
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;