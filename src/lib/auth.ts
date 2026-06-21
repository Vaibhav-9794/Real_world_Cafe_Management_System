import { createSupabaseBrowserClient } from './supabase';

export interface UserProfile {
  id: string;
  user_id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'MANAGER' | string;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | string;
  last_login?: string;
  created_at?: string;
}

// Browser-side auth actions
export async function signInStaff(email: string, pin: string) {
  const supabase = createSupabaseBrowserClient();

  // Use email and the PIN as the login password in Supabase Auth
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: pin,
  });

  if (error) {
    throw new Error(error.message);
  }

  // Retrieve user settings profile
  const { data: profile, error: profileError } = await supabase
    .from('staff_profiles')
    .select('*')
    .eq('user_id', data.user?.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    throw new Error('Staff profile registration record not found.');
  }

  if (profile.status === 'SUSPENDED') {
    await supabase.auth.signOut();
    throw new Error('This account has been suspended by the Owner.');
  }

  if (profile.status === 'INACTIVE') {
    await supabase.auth.signOut();
    throw new Error('This account is currently inactive.');
  }

  // Update last login
  await supabase
    .from('staff_profiles')
    .update({ last_login: new Date().toISOString() })
    .eq('id', profile.id);

  return { session: data.session, user: data.user, profile: profile as UserProfile };
}

export async function signOutStaff() {
  const supabase = createSupabaseBrowserClient();
  await supabase.auth.signOut();
}

export async function getBrowserSession() {
  const supabase = createSupabaseBrowserClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const { data: profile } = await supabase
    .from('staff_profiles')
    .select('*')
    .eq('user_id', session.user.id)
    .single();

  return { session, user: session.user, profile: profile as UserProfile };
}
