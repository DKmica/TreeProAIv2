import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const { login, signup } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const success = mode === 'login'
      ? await login(email.trim(), password)
      : await signup({ email: email.trim(), password, firstName: firstName.trim(), lastName: lastName.trim() });

    if (success) {
      navigate('/');
    } else {
      setError(mode === 'login' ? 'Unable to sign in with those credentials.' : 'Unable to create your account.');
    }

    setIsSubmitting(false);
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
          <div className="flex justify-center space-x-2 bg-brand-gray-50 p-1 rounded-full">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`flex-1 py-2 text-sm font-medium rounded-full transition-colors ${mode === 'login' ? 'bg-white text-brand-cyan-600 shadow' : 'text-brand-gray-500 hover:text-brand-cyan-600'}`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2 text-sm font-medium rounded-full transition-colors ${mode === 'signup' ? 'bg-white text-brand-cyan-600 shadow' : 'text-brand-gray-500 hover:text-brand-cyan-600'}`}
            >
              Create Account
            </button>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === 'signup' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-brand-gray-700 mb-1" htmlFor="firstName">
                    First name
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-3 py-2 border border-brand-gray-200 rounded-md focus:ring-2 focus:ring-brand-cyan-500 focus:border-brand-cyan-500 text-gray-900 placeholder-gray-400"
                    placeholder="Alex"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-brand-gray-700 mb-1" htmlFor="lastName">
                    Last name
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-brand-gray-200 rounded-md focus:ring-2 focus:ring-brand-cyan-500 focus:border-brand-cyan-500 text-gray-900 placeholder-gray-400"
                    placeholder="Johnson"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-brand-gray-700 mb-1" htmlFor="email">
                Work email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-brand-gray-200 rounded-md focus:ring-2 focus:ring-brand-cyan-500 focus:border-brand-cyan-500 text-gray-900 placeholder-gray-400"
                placeholder="you@example.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-brand-gray-700 mb-1" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-brand-gray-200 rounded-md focus:ring-2 focus:ring-brand-cyan-500 focus:border-brand-cyan-500 text-gray-900 placeholder-gray-400 appearance-none"
                style={{ color: 'rgb(17, 24, 39)' }}
                placeholder="••••••••"
                required
                minLength={8}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-cyan-600 hover:bg-brand-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-cyan-500 transition-colors disabled:opacity-70"
            >
              {isSubmitting ? 'Please wait...' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </button>

            <p className="text-xs text-brand-gray-500 text-center">
              Passwords are stored securely. Sessions use encrypted cookies for protection.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
