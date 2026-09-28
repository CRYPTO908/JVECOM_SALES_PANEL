import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Profile, Organization } from '@/types';
import { UserRole, EmployeeStatus, OrgStatus } from '@/types';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  organization: Organization | null;
  loading: boolean;
  initialized: boolean;
}

interface AuthContextType extends AuthState {
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  switchDemoRole: (role: UserRole) => void;
  isAdmin: boolean;
  isManager: boolean;
  isSalesRep: boolean;
  isSuperAdmin: boolean;
}

const DEFAULT_ORG: Organization = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Acme Learning Technologies',
  logo_url: null,
  email: 'contact@acmelearning.io',
  phone: '+91 98765 43210',
  industry: 'EdTech & Corporate Training',
  country: 'India',
  currency: 'INR',
  timezone: 'Asia/Kolkata',
  address: 'Indiranagar 100ft Road, Bangalore',
  website: 'https://acmelearning.io',
  status: OrgStatus.ACTIVE,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

const DEMO_PROFILES: Record<string, Profile> = {
  admin: {
    id: '22222222-2222-2222-2222-222222222222',
    organization_id: DEFAULT_ORG.id,
    first_name: 'Abhijith',
    last_name: 'Up',
    email: 'admin@acmelearning.io',
    phone: '+91 98111 22334',
    username: 'rajeshk',
    employee_id: 'EMP001',
    role: UserRole.ORG_ADMIN,
    team_id: null,
    manager_id: null,
    avatar_url: null,
    joining_date: '2026-01-10',
    status: EmployeeStatus.ACTIVE,
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-01-10T00:00:00Z',
    organization: DEFAULT_ORG,
  },
  manager: {
    id: '33333333-3333-3333-3333-333333333331',
    organization_id: DEFAULT_ORG.id,
    first_name: 'Vikram',
    last_name: 'Malhotra',
    email: 'manager@acmelearning.io',
    phone: '+91 98222 33445',
    username: 'vikramm',
    employee_id: 'EMP002',
    role: UserRole.MANAGER,
    team_id: '55555555-5555-5555-5555-555555555551',
    manager_id: null,
    avatar_url: null,
    joining_date: '2026-01-15',
    status: EmployeeStatus.ACTIVE,
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    organization: DEFAULT_ORG,
    team: {
      id: '55555555-5555-5555-5555-555555555551',
      organization_id: DEFAULT_ORG.id,
      name: 'Alpha Squad (North)',
      description: 'North Region Enterprise & Retail Sales',
      manager_id: '33333333-3333-3333-3333-333333333331',
      status: 'ACTIVE' as any,
      created_at: '2026-01-10T00:00:00Z',
      updated_at: '2026-01-10T00:00:00Z',
    },
  },
  rep: {
    id: '44444444-4444-4444-4444-444444444441',
    organization_id: DEFAULT_ORG.id,
    first_name: 'Arjun',
    last_name: 'Nair',
    email: 'rep@acmelearning.io',
    phone: '+91 98333 44556',
    username: 'arjunn',
    employee_id: 'EMP003',
    role: UserRole.SALES_REP,
    team_id: '55555555-5555-5555-5555-555555555551',
    manager_id: '33333333-3333-3333-3333-333333333331',
    avatar_url: null,
    joining_date: '2026-02-01',
    status: EmployeeStatus.ACTIVE,
    created_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
    organization: DEFAULT_ORG,
    team: {
      id: '55555555-5555-5555-5555-555555555551',
      organization_id: DEFAULT_ORG.id,
      name: 'Alpha Squad (North)',
      description: 'North Region Enterprise & Retail Sales',
      manager_id: '33333333-3333-3333-3333-333333333331',
      status: 'ACTIVE' as any,
      created_at: '2026-01-10T00:00:00Z',
      updated_at: '2026-01-10T00:00:00Z',
    },
  },
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => {
    // Check localStorage for saved session
    const savedDemo = localStorage.getItem('salesos_demo_user');
    if (savedDemo && DEMO_PROFILES[savedDemo]) {
      const p = DEMO_PROFILES[savedDemo];
      return {
        session: { access_token: 'demo-token', user: { id: p.id, email: p.email } } as any,
        user: { id: p.id, email: p.email } as any,
        profile: p,
        organization: DEFAULT_ORG,
        loading: false,
        initialized: true,
      };
    }

    // Default to admin for instant exploration
    const defaultProfile = DEMO_PROFILES.admin;
    return {
      session: { access_token: 'demo-token', user: { id: defaultProfile.id, email: defaultProfile.email } } as any,
      user: { id: defaultProfile.id, email: defaultProfile.email } as any,
      profile: defaultProfile,
      organization: DEFAULT_ORG,
      loading: false,
      initialized: true,
    };
  });

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*, organization:organizations(*)')
        .eq('id', userId)
        .single();

      if (error) {
        return null;
      }
      return profile;
    } catch {
      return null;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!state.user) return;
    const profileData = await fetchProfile(state.user.id);
    if (profileData) {
      setState(prev => ({
        ...prev,
        profile: profileData as unknown as Profile,
        organization: (profileData as unknown as { organization: Organization }).organization || null,
      }));
    }
  }, [state.user, fetchProfile]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id).then(profileData => {
          if (profileData) {
            setState({
              session,
              user: session.user,
              profile: profileData as unknown as Profile,
              organization: (profileData as unknown as { organization: Organization }).organization || null,
              loading: false,
              initialized: true,
            });
          }
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const profileData = await fetchProfile(session.user.id);
          if (profileData) {
            setState({
              session,
              user: session.user,
              profile: profileData as unknown as Profile,
              organization: (profileData as unknown as { organization: Organization }).organization || null,
              loading: false,
              initialized: true,
            });
          }
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('salesos_demo_user');
          setState({
            session: null,
            user: null,
            profile: null,
            organization: null,
            loading: false,
            initialized: true,
          });
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const signIn = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true }));

    // 1. Try real Supabase auth first
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (!error && data?.session) {
        const profileData = await fetchProfile(data.session.user.id);
        setState({
          session: data.session,
          user: data.session.user,
          profile: profileData as unknown as Profile,
          organization: profileData
            ? (profileData as unknown as { organization: Organization }).organization || null
            : null,
          loading: false,
          initialized: true,
        });
        return { error: null };
      }
    } catch {
      // Supabase unavailable or invalid credentials
    }

    // 2. Demo accounts fallback
    const normalized = email.toLowerCase().trim();
    let demoKey = 'admin';
    if (normalized.includes('manager')) demoKey = 'manager';
    else if (normalized.includes('rep')) demoKey = 'rep';
    else if (normalized.includes('admin')) demoKey = 'admin';

    const p = DEMO_PROFILES[demoKey];
    localStorage.setItem('salesos_demo_user', demoKey);
    setState({
      session: { access_token: 'demo-token', user: { id: p.id, email: p.email } } as any,
      user: { id: p.id, email: p.email } as any,
      profile: p,
      organization: DEFAULT_ORG,
      loading: false,
      initialized: true,
    });
    return { error: null };
  };

  const switchDemoRole = (role: UserRole) => {
    let key = 'admin';
    if (role === UserRole.MANAGER) key = 'manager';
    if (role === UserRole.SALES_REP) key = 'rep';
    const p = DEMO_PROFILES[key];
    localStorage.setItem('salesos_demo_user', key);
    setState(prev => ({
      ...prev,
      profile: p,
    }));
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    localStorage.removeItem('salesos_demo_user');
    setState({
      session: null,
      user: null,
      profile: null,
      organization: null,
      loading: false,
      initialized: true,
    });
  };

  const resetPassword = async (email: string) => {
    try {
      await supabase.auth.resetPasswordForEmail(email);
    } catch {}
    return { error: null };
  };

  const updatePassword = async (password: string) => {
    try {
      await supabase.auth.updateUser({ password });
    } catch {}
    return { error: null };
  };

  const role = state.profile?.role;
  const isAdmin = role === UserRole.ORG_ADMIN || role === UserRole.SUPER_ADMIN;
  const isManager = role === UserRole.MANAGER;
  const isSalesRep = role === UserRole.SALES_REP;
  const isSuperAdmin = role === UserRole.SUPER_ADMIN;

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signIn,
        signOut,
        resetPassword,
        updatePassword,
        refreshProfile,
        switchDemoRole,
        isAdmin,
        isManager,
        isSalesRep,
        isSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
