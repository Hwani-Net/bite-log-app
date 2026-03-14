'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { getFirebaseAuth, isFirebaseReady } from '@/lib/firebase';

const googleProvider = new GoogleAuthProvider();

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      // Firebase not configured — stay in local-only mode
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState({ user: null, loading: false, error: null });
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setState({ user, loading: false, error: null });
    });
    return () => unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setState((prev) => ({ ...prev, error: 'Firebase not configured' }));
      return;
    }
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setState((prev) => ({ ...prev, loading: false, error: message }));
    }
  }, []);

  const signOut = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    try {
      await firebaseSignOut(auth);
    } catch (err) {
      console.error('Sign out error:', err);
    }
  }, []);

  return {
    user: state.user,
    loading: state.loading,
    error: state.error,
    signInWithGoogle,
    signOut,
    isLoggedIn: !!state.user,
    isFirebaseConfigured: isFirebaseReady(),
  };
}
