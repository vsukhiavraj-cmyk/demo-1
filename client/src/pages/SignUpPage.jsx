import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Input from '../components/ui/input.jsx';
import Button from '../components/ui/button.jsx';
import { useAuth } from '../hooks/useAuth.js';

export default function SignUpPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signup, isAuthenticated, isReady } = useAuth();

  // Scroll to top when page loads
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isReady && isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isReady, isAuthenticated, navigate]);

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signup(form);
      navigate('/dashboard');
    } catch (err) {
      console.error('Signup error:', err);
      setError(err.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-black min-h-screen w-full">
      <div className="min-h-screen flex items-center justify-center p-4">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-md bg-deepTeal p-8 rounded-xl shadow-lg"
        >
          <h2 className="text-2xl font-bold text-snow mb-6">Sign Up</h2>
          {error && <p className="text-coral mb-4">{error}</p>}
          <Input
            label="Name"
            type="text"
            value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            required
            className="mb-4"
            disabled={loading}
          />
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
            {loading ? 'Creating Account...' : 'Sign Up'}
          </Button>
          <p className="mt-4 text-grayMed text-sm">
            Already have an account?{' '}
            <Link to="/auth/signin" className="text-cyan hover:text-solar">
              Sign In
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
} 