import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SpinnerIcon from './icons/SpinnerIcon';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-gray-900 via-brand-gray-800 to-brand-gray-950">
        <div className="text-center">
          <SpinnerIcon className="w-10 h-10 animate-spin text-brand-cyan-400 mx-auto mb-3" />
          <p className="text-brand-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated ? <Outlet /> : <Navigate to="/login" replace />;
};

export default ProtectedRoute;