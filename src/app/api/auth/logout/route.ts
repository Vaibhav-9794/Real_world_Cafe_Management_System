import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';
import { logAuditEvent } from '@/lib/audit';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const mockSession = cookieStore.get('mock-auth-session');

  // 1. Local Mock Sandbox Logout
  if (mockSession) {
    try {
      const user = JSON.parse(mockSession.value);
      await logAuditEvent(user.email, user.role, 'LOGOUT', 'Logged out successfully from sandbox session.');
    } catch {
      // Ignore parse failure
    }
    cookieStore.delete('mock-auth-session');
    return NextResponse.json({ success: true, message: 'Sandbox session cleared.' });
  }

  // 2. Production Supabase Logout
  try {
    const supabase = createSupabaseServerClient(cookieStore);
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      // Find role from profile if possible, fallback to standard audit
      await logAuditEvent(user.email || 'unknown', 'STAFF', 'LOGOUT', 'Logged out successfully from Supabase session.');
      await supabase.auth.signOut();
    }
    
    return NextResponse.json({ success: true, message: 'Supabase session terminated.' });
  } catch (err: any) {
    console.error('Logout error:', err);
    return NextResponse.json({ success: false, message: 'Server error during logout.' }, { status: 500 });
  }
}
