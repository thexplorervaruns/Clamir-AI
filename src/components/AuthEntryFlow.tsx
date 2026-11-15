import React, { useState } from 'react';
import { ArrowLeft, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { ClamirLogo } from './ClamirLogo.tsx';
import { UserProfile, Workspace } from '../types/clamir.ts';

interface AuthEntryFlowProps {
  initialMode?: 'login' | 'signup';
  onSuccess: (payload: { token: string; user: UserProfile; workspaces: Workspace[] }) => void;
  onBackToLanding: () => void;
}

export const AuthEntryFlow: React.FC<AuthEntryFlowProps> = ({
  initialMode = 'login',
  onSuccess,
  onBackToLanding,
}) => {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const validateEmail = (val: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setInfoMessage(null);

    if (mode === 'forgot') {
      if (!validateEmail(email.trim())) {
        setError('Please enter a valid email address to reset your password.');
        return;
      }
      setLoading(true);
      try {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Unable to process password reset request.');
        } else {
          setInfoMessage(data.message || 'Password reset instructions have been generated for your account.');
        }
      } catch {
        setError('Network error while requesting password reset.');
      } finally {
        setLoading(false);
      }
      return;
    }

    if (!validateEmail(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        setError('Please enter your full name.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match. Please verify your confirmation password.');
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          password,
          rememberMe,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Authentication failed. Please check your credentials.');
      } else {
        onSuccess(data);
      }
    } catch {
      setError('Unable to reach authentication server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoAccess = async (asOwner = false) => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asOwner }),
      });
      const data = await res.json();
      if (res.ok) {
        onSuccess(data);
      } else {
        setError(data.error || 'Quick login failed.');
      }
    } catch {
      setError('Unable to sign into workspace.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] text-[#111827] flex flex-col justify-between p-4 sm:p-6">
      <div>
        <button
          type="button"
          onClick={onBackToLanding}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B7280] hover:text-[#111827] transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Clamir AI Home</span>
        </button>
      </div>

      <div className="w-full max-w-md mx-auto bg-white border border-[#E5E7EB] rounded-lg p-6 sm:p-8 my-8">
        <div className="flex flex-col items-center text-center">
          <ClamirLogo size="lg" />
          <h1 className="mt-5 text-xl font-bold text-[#111827]">
            {mode === 'login' && 'Sign in to your workspace'}
            {mode === 'signup' && 'Create your Clamir AI account'}
            {mode === 'forgot' && 'Reset your password'}
          </h1>
          <p className="mt-1.5 text-xs text-[#6B7280]">
            {mode === 'login' && 'Access your audience simulations, personas, and AI research agent.'}
            {mode === 'signup' && 'Start simulating customer reactions and testing product hypotheses.'}
            {mode === 'forgot' && 'Enter your account email to receive a password reset verification.'}
          </p>
        </div>

        {error && (
          <div className="mt-5 p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
            {error}
          </div>
        )}

        {infoMessage && (
          <div className="mt-5 p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-md text-xs text-[#111827]">
            {infoMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#6B7280] absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Rivera"
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000]"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#6B7280] absolute left-3 top-2.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full pl-9 pr-3.5 py-2 text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000]"
              />
            </div>
          </div>

          {mode !== 'forgot' && (
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#6B7280] absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-[#6B7280] hover:text-[#111827] cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#6B7280] absolute left-3 top-2.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 text-sm bg-white border border-[#E5E7EB] rounded-md focus:outline-none focus:border-[#000000]"
                />
              </div>
            </div>
          )}

          {mode === 'login' && (
            <div className="flex items-center justify-between text-xs">
              <label className="inline-flex items-center gap-2 text-[#6B7280] cursor-pointer">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-[#E5E7EB] text-[#000000] focus:ring-0"
                />
                <span>Remember me</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setInfoMessage(null);
                  setMode('forgot');
                }}
                className="font-medium text-[#111827] hover:underline cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 text-xs sm:text-sm font-semibold text-white bg-[#000000] rounded-md hover:bg-neutral-800 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {loading
              ? 'Processing...'
              : mode === 'login'
              ? 'Login'
              : mode === 'signup'
              ? 'Create Account'
              : 'Send Reset Instructions'}
          </button>
        </form>

        {/* Instant Workspace Entry Option */}
        <div className="mt-5 pt-5 border-t border-[#E5E7EB] space-y-2">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleQuickDemoAccess(true)}
            className="w-full py-2 px-3 text-xs font-medium text-[#111827] bg-[#F9FAFB] border border-[#E5E7EB] rounded-md hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Instant Workspace Access (Verified Owner Session)
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-[#6B7280]">
          {mode === 'login' ? (
            <p>
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setInfoMessage(null);
                  setMode('signup');
                }}
                className="font-semibold text-[#111827] hover:underline cursor-pointer"
              >
                Create an account
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setInfoMessage(null);
                  setMode('login');
                }}
                className="font-semibold text-[#111827] hover:underline cursor-pointer"
              >
                Back to Login
              </button>
            </p>
          )}
        </div>
      </div>

      <div className="text-center text-xs text-[#6B7280]">
        Secured with scrypt salted password hashing · Workspace data isolated
      </div>
    </div>
  );
};
