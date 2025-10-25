import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const { session } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      navigate('/dashboard');
    }
  }, [session, navigate]);

  if (session) {
    return null; // Or a loading indicator
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-green-50 to-brand-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-4xl font-extrabold text-brand-gray-900">
            TreePro AI
          </h2>
          <p className="mt-2 text-center text-sm text-brand-gray-600">
            Professional Tree Service Management
          </p>
        </div>
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={[]}
            theme="light"
          />
        </div>
      </div>
    </div>
  );
};

export default Login;