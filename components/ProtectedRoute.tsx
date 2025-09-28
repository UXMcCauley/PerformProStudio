'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './AuthModal';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      setShowAuthModal(true);
    } else if (user) {
      setShowAuthModal(false);
    }
  }, [user, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="text-base-content/60">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-6">
            <svg className="w-16 h-16 text-primary" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-base-content">Lyric Teleprompter</h1>
          <p className="text-base-content/60 max-w-md">
            Sign in to access your lyric library and teleprompter features.
          </p>
          <button
            onClick={() => setShowAuthModal(true)}
            className="btn btn-primary btn-lg"
          >
            Sign In to Continue
          </button>
        </div>
        
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => {
            // Don't allow closing the modal if not authenticated
            if (user) {
              setShowAuthModal(false);
            }
          }}
        />
      </div>
    );
  }

  return <>{children}</>;
}
