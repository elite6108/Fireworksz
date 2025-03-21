import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  loadUser: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  loading: true,

  loadUser: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const userData: User = {
          id: session.user.id,
          email: session.user.email!,
          role: (session.user.user_metadata?.role as 'user' | 'admin') || 'user',
          created_at: session.user.created_at
        };
        set({ user: userData });
      } else {
        set({ user: null });
      }
    } catch (error) {
      console.error('Error loading user:', error);
      set({ user: null });
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    try {
      await supabase.auth.signOut();
      set({ user: null });
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  },

  setUser: (user) => set({ user })
}));