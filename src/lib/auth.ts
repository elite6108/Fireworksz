import { supabase } from './supabase';
import { User } from '../types';

export async function signUp(email: string, password: string, role: 'user' | 'admin' = 'user') {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role,
      }
    }
  });
  
  return { data, error };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  return { data, error };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser(): Promise<User | null> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session?.user) return null;
  
  const user = session.user;
  return {
    id: user.id,
    email: user.email!,
    role: (user.user_metadata?.role as 'user' | 'admin') || 'user',
    created_at: user.created_at
  };
}

export async function promoteToAdmin(userId: string) {
  const { data, error } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: { role: 'admin' }
  });
  
  if (error) throw error;
  return data;
}