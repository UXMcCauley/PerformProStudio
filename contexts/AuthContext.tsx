'use client';

import { createContext, useContext, ReactNode } from 'react';
import { SessionProvider, useSession, signIn as nextAuthSignIn, signOut as nextAuthSignOut } from 'next-auth/react';

interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
}

interface AuthError {
  message: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  signUp: (email: string, password: string, metadata?: { displayName?: string }) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<{ error: AuthError | null }>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function AuthContextProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const loading = status === 'loading';

  const user: AuthUser | null = session?.user ? {
    id: session.user.id,
    email: session.user.email!,
    name: session.user.name,
  } : null;

  const signUp = async (email: string, password: string, metadata?: { displayName?: string }) => {
    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          displayName: metadata?.displayName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: { message: data.error || 'Signup failed' } };
      }

      // Auto sign in after signup
      const signInResult = await nextAuthSignIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        return { error: { message: signInResult.error } };
      }

      return { error: null };
    } catch (error) {
      return { error: { message: 'An unexpected error occurred' } };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const result = await nextAuthSignIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        return { error: { message: result.error } };
      }

      return { error: null };
    } catch (error) {
      return { error: { message: 'An unexpected error occurred' } };
    }
  };

  const signOut = async () => {
    try {
      await nextAuthSignOut({ redirect: false });
      return { error: null };
    } catch (error) {
      return { error: { message: 'Failed to sign out' } };
    }
  };

  const resetPassword = async (email: string) => {
    // Note: Password reset requires an email service.
    // For now, this is a placeholder that will need to be implemented
    // with a service like SendGrid, Resend, or AWS SES.
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: { message: data.error || 'Password reset failed' } };
      }

      return { error: null };
    } catch (error) {
      return { error: { message: 'Password reset is not currently available' } };
    }
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <AuthContextProvider>{children}</AuthContextProvider>
    </SessionProvider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
