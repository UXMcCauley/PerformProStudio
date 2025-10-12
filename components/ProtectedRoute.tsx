'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import AuthModal from './AuthModal';
import LandingPage from './LandingPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
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
      <>
        <LandingPage onGetStarted={() => setShowAuthModal(true)} />

        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </>
    );
  }

  return <>{children}</>;
}
