import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import Input from '../components/ui/input.jsx';
import Button from '../components/ui/button.jsx';

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { login, isAuthenticated, isReady, isLoading: authLoading } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (location.pathname === "/auth") {
      navigate("/auth/signin", { replace: true });
    }
  }, [location.pathname, navigate]);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    // Only redirect if we're sure the user is authenticated and auth check is complete
    if (isReady && isAuthenticated && location.pathname !== '/dashboard') {
      navigate('/dashboard', { replace: true });
    }
  }, [isReady, isAuthenticated, navigate, location.pathname]);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // console.log('About to send', form); // DEBUG: should show your typed values

    try {
      await login(form);
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while checking authentication
  if (authLoading) {
    return (
      <div className="bg-black min-h-screen w-full">
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan mx-auto mb-4"></div>
            <p className="text-snow">Checking authentication...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-black min-h-screen w-full">
      <div className="min-h-screen flex items-center justify-center p-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-deepTeal/80 p-8 rounded-xl shadow-lg"
        >
          <h2 className="text-2xl font-bold text-snow mb-6">Sign In</h2>
          {error && <p className="text-coral mb-4">{error}</p>}
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            required
            className="mb-4"
            disabled={loading}
          />
          <Input
            label="Password"
            type="password"
            value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            required
            disabled={loading}
          />
          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full mt-6"
            disabled={loading}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>
          <p className="mt-4 text-grayMed text-sm">
            Don't have an account?{' '}
            <Link to="/auth/signup" className="text-cyan hover:text-solar">
              Sign Up
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
} 