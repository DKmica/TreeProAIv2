import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { useSession } from '../contexts/SessionContext';
import SpinnerIcon from '../../components/icons/SpinnerIcon';

const Login: React.FC = () => {
  const { session } = useSession();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (session) {
      navigate('/dashboard');
    }
  }, [session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let authResponse;
      if (isSignUp) {
        authResponse = await supabase.auth.signUp({ email, password });
      } else {
        authResponse = await supabase.auth.signInWithPassword({ email, password });
      }

      if (authResponse.error) {
        throw authResponse.error;
      }
      
      if (isSignUp && authResponse.data.user) {
        alert('Sign up successful! Please check your email for a confirmation link.');
      }

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-navy-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-8 text-center">
          <img src="/logo.jpg" alt="TreePro AI Logo" className="mx-auto h-16 w-16 rounded-full" />
          <h1 className="mt-4 text-2xl font-bold text-brand-navy-900">Welcome to TreePro AI</h1>
          <p className="mt-2 text-sm text-brand-navy-600">
            {isSignUp ? 'Create an account to get started' : 'Sign in to manage your business'}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-brand-navy-700">
              Email address
            </label>
            <div className="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full appearance-none rounded-md border border-brand-navy-300 px-3 py-2 placeholder-brand-navy-400 shadow-sm focus:border-brand-cyan-500 focus:outline-none focus:ring-brand-cyan-500 sm:text-sm"
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-brand-navy-700">
              Password
            </label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full appearance-none rounded-md border border-brand-navy-300 px-3 py-2 placeholder-brand-navy-400 shadow-sm focus:border-brand-cyan-500 focus:outline-none focus:ring-brand-cyan-500 sm:text-sm"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md border border-transparent bg-brand-cyan-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-cyan-700 focus:outline-none focus:ring-2 focus:ring-brand-cyan-500 focus:ring-offset-2 disabled:bg-brand-navy-300"
            >
              {loading ? <SpinnerIcon className="h-5 w-5" /> : (isSignUp ? 'Sign Up' : 'Sign In')}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-brand-navy-600">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button onClick={() => { setIsSignUp(!isSignUp); setError(null); }} className="font-medium text-brand-cyan-600 hover:text-brand-cyan-500">
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;