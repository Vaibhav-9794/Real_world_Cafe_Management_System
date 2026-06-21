import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function GET() {
  const cookieStore = await cookies();

  // 1. Mock Sandbox Session Check
  const mockSessionCookie = cookieStore.get('mock-auth-session');
  if (mockSessionCookie) {
    try {
      const profile = JSON.parse(mockSessionCookie.value);
      return NextResponse.json({ success: true, user: profile });
    } catch {
      return NextResponse.json({ success: false, message: 'Invalid session.' }, { status: 401 });
    }
  }

  // 2. Production Supabase Session Check
  try {
    const supabase = createSupabaseServerClient(cookieStore);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ success: false, message: 'Unauthenticated.' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('staff_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ success: false, message: 'Profile missing.' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        role: profile.role,
        branchId: profile.branchId
      }
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: 'Server error retrieving session.' }, { status: 500 });
  }
}
