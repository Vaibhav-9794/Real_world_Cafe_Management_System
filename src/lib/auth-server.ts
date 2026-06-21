import { cookies } from 'next/headers';
import { createSupabaseServerClient } from './supabase';
import { supabaseAdmin } from './supabase-admin';

export interface ServerSessionUser {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'MANAGER' | 'STAFF' | string;
  status?: string;
  branchId?: string | null;
}

export async function getServerSession(): Promise<ServerSessionUser | null> {
  const cookieStore = await cookies();

  // 1. Mock Sandbox Session Check
  const mockSessionCookie = cookieStore.get('mock-auth-session');
  if (mockSessionCookie) {
    try {
      const profile = JSON.parse(mockSessionCookie.value);
      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        status: profile.status,
        branchId: profile.branchId,
      };
    } catch {
      return null;
    }
  }

  // 2. Production Supabase Session Check
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isMockMode = !serviceRoleKey || serviceRoleKey.includes('dummy');
  if (isMockMode) return null;

  try {
    const supabase = createSupabaseServerClient(cookieStore);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('staff_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return null;
    }

    return {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      role: profile.role,
      status: profile.status,
      branchId: profile.branchId,
    };
  } catch {
    return null;
  }
}
