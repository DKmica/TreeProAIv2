import React, { useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { useSession } from '../contexts/SessionContext';

const Login: React.FC = () => {
  const { session } = useSession();
  const navigate = useNavigate();

  useEffect(() => {
    if (session) {
      navigate('/dashboard');
    }
  }, [session, navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-navy-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <img src="/logo.jpg" alt="TreePro AI Logo" className="mx-auto h-16 w-16 rounded-full" />
          <h1 className="mt-4 text-2xl font-bold text-brand-navy-900">Welcome to TreePro AI</h1>
          <p className="mt-2 text-sm text-brand-navy-600">Sign in to manage your business</p>
        </div>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]}
          theme="light"
        />
      </div>
    </div>
  );
};

export default Login;