import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/lib/supabase';
import bcrypt from 'bcryptjs';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isRateLimited } from '@/lib/rateLimit';
import { logAuditEvent } from '@/lib/audit';
import { prisma } from '@/lib/db';

export async function POST(request: Request) {
  // 1. IP Rate Limiting
  const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
  if (isRateLimited(ip, 5, 60000)) {
    return NextResponse.json({ success: false, message: 'Too many login attempts. Please try again in a minute.' }, { status: 429 });
  }

  // 2. CSRF Referrer Verification
  const referer = request.headers.get('referer');
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  const allowedOrigins = [siteUrl];
  if (host) {
    allowedOrigins.push(`http://${host}`);
    allowedOrigins.push(`https://${host}`);
  }

  const isOriginValid = !origin || allowedOrigins.some(allowed => origin.startsWith(allowed));
  const isRefererValid = !referer || allowedOrigins.some(allowed => referer.startsWith(allowed));

  if (!isOriginValid || !isRefererValid) {
    return NextResponse.json({ success: false, message: 'CSRF security check failed.' }, { status: 403 });
  }

  try {
    const { email, pin } = await request.json();
    
    // 3. Input Sanitization
    if (!email || !pin) {
      return NextResponse.json({ success: false, message: 'Email and PIN credentials are required.' }, { status: 400 });
    }
    const cleanEmail = email.trim().toLowerCase();
    const cleanPin = pin.trim();

    // Check email structure format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json({ success: false, message: 'Invalid email address format.' }, { status: 400 });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const isMockMode = !serviceRoleKey || serviceRoleKey.includes('dummy');

    // 4. Try Supabase Auth first (if not in mock mode)
    if (!isMockMode) {
      try {
        const cookieStore = await cookies();
        const supabase = createSupabaseServerClient(cookieStore);

        // Sign in using Supabase Auth with the email and using PIN as password
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: cleanPin,
        });

        if (authError) {
          await logAuditEvent(cleanEmail, 'ANONYMOUS', 'LOGIN_FAIL', `Login failed via Supabase Auth: ${authError.message}`);
          return NextResponse.json({ success: false, message: 'Invalid email or PIN code.' }, { status: 401 });
        }

        if (authData.user) {
          // Retrieve settings profile from PostgreSQL using bypass client
          const { data: profile, error: profileError } = await supabaseAdmin
            .from('staff_profiles')
            .select('*')
            .eq('user_id', authData.user.id)
            .single();

          if (profileError || !profile) {
            await logAuditEvent(cleanEmail, 'ANONYMOUS', 'LOGIN_FAIL', 'Staff profile missing in Supabase.');
            return NextResponse.json({ success: false, message: 'Staff profile not found.' }, { status: 403 });
          }

          if (profile.status === 'SUSPENDED') {
            await supabase.auth.signOut();
            await logAuditEvent(cleanEmail, profile.role, 'LOGIN_FAIL', 'Suspended account attempted login.');
            return NextResponse.json({ success: false, message: 'This account has been suspended by the Owner.' }, { status: 403 });
          }

          if (profile.status === 'INACTIVE') {
            await supabase.auth.signOut();
            await logAuditEvent(cleanEmail, profile.role, 'LOGIN_FAIL', 'Inactive account attempted login.');
            return NextResponse.json({ success: false, message: 'This account is currently inactive.' }, { status: 403 });
          }

          // Update last login
          await supabaseAdmin
            .from('staff_profiles')
            .update({ last_login: new Date().toISOString() })
            .eq('id', profile.id);

          await logAuditEvent(cleanEmail, profile.role, 'LOGIN_SUCCESS', 'Logged in successfully via Supabase Auth.');

          return NextResponse.json({
            success: true,
            user: {
              id: profile.id,
              name: profile.name,
              email: profile.email,
              role: profile.role,
              branchId: profile.branchId,
              branchName: 'All Branches'
            }
          });
        }
      } catch (err: any) {
        console.error("Supabase auth integration lookup failed:", err);
        return NextResponse.json({ success: false, message: 'Authentication service error.' }, { status: 500 });
      }
    }

    // ==========================================
    // SANDBOX FALLBACK (SQLite Database)
    // ==========================================
    // Find staff in Prisma database by email
    const staffMember = await prisma.staff.findUnique({
      where: { email: cleanEmail },
      include: { branch: true }
    });

    if (!staffMember) {
      await logAuditEvent(cleanEmail, 'ANONYMOUS', 'LOGIN_FAIL', 'Invalid email or PIN credentials in local sandbox.');
      return NextResponse.json({ success: false, message: 'Invalid email or PIN code.' }, { status: 401 });
    }

    // Compare hashed PIN using bcrypt
    const isPinValid = bcrypt.compareSync(cleanPin, staffMember.pin);
    if (!isPinValid) {
      await logAuditEvent(cleanEmail, 'ANONYMOUS', 'LOGIN_FAIL', 'Invalid email or PIN credentials in local sandbox.');
      return NextResponse.json({ success: false, message: 'Invalid email or PIN code.' }, { status: 401 });
    }

    // Check account status
    if (staffMember.status === 'SUSPENDED') {
      await logAuditEvent(cleanEmail, staffMember.role, 'LOGIN_FAIL', 'Suspended account login attempt rejected in sandbox.');
      return NextResponse.json({ success: false, message: 'This account has been suspended by the Owner.' }, { status: 403 });
    }

    if (staffMember.status === 'INACTIVE') {
      await logAuditEvent(cleanEmail, staffMember.role, 'LOGIN_FAIL', 'Inactive account login attempt rejected in sandbox.');
      return NextResponse.json({ success: false, message: 'This account is currently inactive.' }, { status: 403 });
    }

    // Set cookie session for local fallback
    const cookieStore = await cookies();
    cookieStore.set('mock-auth-session', JSON.stringify({
      id: staffMember.id,
      user_id: staffMember.id,
      name: staffMember.name,
      email: staffMember.email,
      role: staffMember.role, // OWNER, MANAGER, STAFF
      status: staffMember.status,
      branchId: staffMember.branchId,
      branchName: staffMember.branch?.name || 'All Branches'
    }), {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    await logAuditEvent(cleanEmail, staffMember.role, 'LOGIN_SUCCESS', 'Logged in successfully via local sandbox fallback.');

    return NextResponse.json({
      success: true,
      user: {
        id: staffMember.id,
        name: staffMember.name,
        email: staffMember.email,
        role: staffMember.role,
        branchId: staffMember.branchId,
        branchName: staffMember.branch?.name || 'All Branches'
      }
    });
  } catch (err: any) {
    console.error('Login route error:', err);
    return NextResponse.json({ success: false, message: 'Server internal error.' }, { status: 500 });
  }
}
