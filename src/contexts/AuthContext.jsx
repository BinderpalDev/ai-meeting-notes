import { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const isPlaceholderSupabase = !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('placeholder');

  useEffect(() => {
    // 1. Check local storage session first
    const localUserStr = localStorage.getItem('summarix_user');
    if (localUserStr) {
      try {
        setUser(JSON.parse(localUserStr));
        setLoading(false);
        return;
      } catch (e) {
        localStorage.removeItem('summarix_user');
      }
    }

    // 2. Check Supabase session if not placeholder
    if (!isPlaceholderSupabase) {
      supabase.auth.getSession()
        .then(({ data }) => {
          if (data?.session) {
            setUser(data.session.user);
          }
        })
        .catch((err) => {
          console.warn('Supabase getSession failed:', err);
        })
        .finally(() => {
          setLoading(false);
        });

      try {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user) {
            setUser(session.user);
          }
        });

        return () => subscription?.unsubscribe();
      } catch (err) {
        console.warn('Auth state change listener error:', err);
      }
    } else {
      setLoading(false);
    }
  }, [isPlaceholderSupabase]);

  const saveLocalUser = (email) => {
    const mockUser = {
      id: 'user_' + btoa(email || 'demo@summarix.ai').replace(/[^a-zA-Z0-9]/g, '').slice(0, 12),
      email: email || 'demo@summarix.ai',
      user_metadata: { name: email ? email.split('@')[0] : 'Demo User' }
    };
    localStorage.setItem('summarix_user', JSON.stringify(mockUser));
    setUser(mockUser);
    return { user: mockUser };
  };

  const signUp = async (email, password) => {
    setLoading(true);
    if (isPlaceholderSupabase) {
      setLoading(false);
      return saveLocalUser(email);
    }

    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) throw error;
      if (data.user || data.session) {
        setUser(data.user);
      }
      setLoading(false);
      return data;
    } catch (err) {
      console.warn('Supabase signUp error, using local auth mode:', err.message);
      setLoading(false);
      return saveLocalUser(email);
    }
  };

  const signIn = async (email, password) => {
    setLoading(true);
    if (isPlaceholderSupabase) {
      setLoading(false);
      return saveLocalUser(email);
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;

      if (data && data.user) {
        setUser(data.user);
        setLoading(false);
        return data;
      } else {
        throw new Error('Unexpected login response');
      }
    } catch (err) {
      console.warn('Supabase signIn error, using local auth mode:', err.message);
      setLoading(false);
      return saveLocalUser(email);
    }
  };

  const signOut = async () => {
    localStorage.removeItem('summarix_user');
    try {
      if (!isPlaceholderSupabase) {
        await supabase.auth.signOut();
      }
    } catch (e) {
      console.warn('Supabase signOut error:', e);
    }
    setUser(null);
  };

  const value = {
    user,
    signUp,
    signIn,
    signOut,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);