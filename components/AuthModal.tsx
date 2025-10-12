'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const { signIn, signUp, resetPassword } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          setError(error.message);
        } else {
          onClose();
          resetForm();
        }
      } else if (mode === 'signup') {
        const { error } = await signUp(email, password, { displayName });
        if (error) {
          setError(error.message);
        } else {
          setMessage('Check your email for the confirmation link!');
          setTimeout(() => {
            onClose();
            resetForm();
          }, 3000);
        }
      } else if (mode === 'reset') {
        const { error } = await resetPassword(email);
        if (error) {
          setError(error.message);
        } else {
          setMessage('Password reset link sent to your email!');
          setTimeout(() => {
            setMode('signin');
            setMessage('');
          }, 3000);
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setDisplayName('');
    setError('');
    setMessage('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="auth-modal-overlay" onClick={handleClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <div className="auth-modal-header">
          <div className="auth-mode-indicator">
            <div className={`mode-dot ${mode === 'signin' ? 'active' : ''}`}></div>
            <div className={`mode-dot ${mode === 'signup' ? 'active' : ''}`}></div>
            <div className={`mode-dot ${mode === 'reset' ? 'active' : ''}`}></div>
          </div>
          <h2 className="auth-modal-title">
            {mode === 'signin' && 'Welcome Back'}
            {mode === 'signup' && 'Join IntelliPrompter'}
            {mode === 'reset' && 'Reset Password'}
          </h2>
          <p className="auth-modal-subtitle">
            {mode === 'signin' && 'Sign in to access your lyric library'}
            {mode === 'signup' && 'Create your account and start prompting'}
            {mode === 'reset' && "We'll send you a reset link"}
          </p>
          <button
            onClick={handleClose}
            className="auth-modal-close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode === 'signup' && (
            <div className="auth-input-group">
              <label className="auth-label">Display Name</label>
              <div className="auth-input-wrapper">
                <svg className="auth-input-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <input
                  type="text"
                  placeholder="Your name"
                  className="auth-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="auth-input-group">
            <label className="auth-label">Email</label>
            <div className="auth-input-wrapper">
              <svg className="auth-input-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              <input
                type="email"
                placeholder="your@email.com"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          {mode !== 'reset' && (
            <div className="auth-input-group">
              <label className="auth-label">Password</label>
              <div className="auth-input-wrapper">
                <svg className="auth-input-icon" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="auth-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="auth-alert auth-alert-error">
              <svg className="auth-alert-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          )}

          {message && (
            <div className="auth-alert auth-alert-success">
              <svg className="auth-alert-icon" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>{message}</span>
            </div>
          )}

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="auth-spinner"></div>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <span>
                  {mode === 'signin' && 'Sign In'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'reset' && 'Send Reset Link'}
                </span>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </>
            )}
          </button>
        </form>

        <div className="auth-divider">
          <span>or</span>
        </div>

        <div className="auth-footer">
          {mode === 'signin' && (
            <>
              <button
                onClick={() => {
                  setMode('signup');
                  setError('');
                  setMessage('');
                }}
                className="auth-link-btn"
              >
                Don't have an account? <span className="auth-link-accent">Sign up</span>
              </button>
              <button
                onClick={() => {
                  setMode('reset');
                  setError('');
                  setMessage('');
                }}
                className="auth-link-btn auth-link-small"
              >
                Forgot password?
              </button>
            </>
          )}

          {mode === 'signup' && (
            <button
              onClick={() => {
                setMode('signin');
                setError('');
                setMessage('');
              }}
              className="auth-link-btn"
            >
              Already have an account? <span className="auth-link-accent">Sign in</span>
            </button>
          )}

          {mode === 'reset' && (
            <button
              onClick={() => {
                setMode('signin');
                setError('');
                setMessage('');
              }}
              className="auth-link-btn"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
