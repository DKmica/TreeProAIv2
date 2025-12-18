import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SpinnerIcon from './icons/SpinnerIcon';

interface RoleProtectedRouteProps {
  allowedRoles: string[];
  redirectTo?: string;
  children?: React.ReactNode;
}

const RoleProtectedRoute: React.FC<RoleProtectedRouteProps> = ({ 
  allowedRoles, 
  redirectTo = '/dashboard',
  children 
}) => {
  const { isAuthenticated, isLoading, hasAnyRole } = useAuth();

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

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!hasAnyRole(allowedRoles)) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
          <p className="text-brand-gray-400 mb-6">
            You don't have permission to access this page. Contact your administrator if you believe this is an error.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-brand-cyan-600 hover:bg-brand-cyan-500 text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return children ? <>{children}</> : <Outlet />;
};

export default RoleProtectedRoute;
