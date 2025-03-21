import React, { useEffect } from 'react';
import { useAuth } from '../store/auth';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { loadUser, setUser } = useAuth();

  useEffect(() => {
    // Initial load
    loadUser().catch(console.error);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        toast.success('Signed out successfully');
      } else if (event === 'SIGNED_IN' && session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email!,
          role: (session.user.user_metadata?.role as 'user' | 'admin') || 'user',
          created_at: session.user.created_at
        };
        setUser(userData);
        toast.success('Signed in successfully');
      } else if (event === 'USER_UPDATED' && session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email!,
          role: (session.user.user_metadata?.role as 'user' | 'admin') || 'user',
          created_at: session.user.created_at
        };
        setUser(userData);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUser, setUser]);

  return <>{children}</>;
}