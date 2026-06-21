import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { supabaseAdmin } from './lib/supabase-admin';
import { logAuditEvent } from './lib/audit';

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isOwnerRoute = path.startsWith('/owner');
  const isManagerRoute = path.startsWith('/manager');

  // Only run middleware checks on protected dashboard paths
  if (!isOwnerRoute && !isManagerRoute) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Inject Standard Security Headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://api.qrserver.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; media-src 'self' https:; connect-src 'self' https://*.supabase.co https://api.qrserver.com; font-src 'self' https://fonts.gstatic.com;"
  );
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), interest-cohort=()'
  );

  // ==========================================
  // MOCK SANDBOX SESSION FALLBACK
  // ==========================================
  const mockSessionCookie = request.cookies.get('mock-auth-session');
  if (mockSessionCookie) {
    try {
      const profile = JSON.parse(mockSessionCookie.value);

      if (profile.status === 'SUSPENDED') {
        const redirectRes = NextResponse.redirect(new URL('/staff-login?error=suspended', request.url));
        redirectRes.cookies.delete('mock-auth-session');
        return redirectRes;
      }
      if (profile.status === 'INACTIVE') {
        const redirectRes = NextResponse.redirect(new URL('/staff-login?error=inactive', request.url));
        redirectRes.cookies.delete('mock-auth-session');
        return redirectRes;
      }

      // Check role permissions
      if (isOwnerRoute && profile.role !== 'OWNER') {
        await logAuditEvent(profile.email, profile.role, 'ACCESS_DENIED', `Role ${profile.role} blocked from Owner path: ${path}`);
        return NextResponse.redirect(new URL('/manager?error=access_denied', request.url));
      }
      if (isManagerRoute && profile.role !== 'MANAGER' && profile.role !== 'OWNER') {
        await logAuditEvent(profile.email, profile.role, 'ACCESS_DENIED', `Role ${profile.role} blocked from Manager path: ${path}`);
        return NextResponse.redirect(new URL('/staff-login?error=access_denied', request.url));
      }

      return response;
    } catch {
      // Fallback if parse fails
      const redirectRes = NextResponse.redirect(new URL('/staff-login?error=unauthenticated', request.url));
      redirectRes.cookies.delete('mock-auth-session');
      return redirectRes;
    }
  }

  // ==========================================
  // PRODUCTION MODE (Supabase SSR Auth)
  // ==========================================
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (process.env.NODE_ENV === 'production') {
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Proxy configuration failed: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY.');
    }
  }

  const finalUrl = supabaseUrl || 'https://dummy.supabase.co';
  const finalAnonKey = supabaseAnonKey || '';

  const supabase = createServerClient(finalUrl, finalAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.redirect(new URL('/staff-login?error=unauthenticated', request.url));
  }

  // Retrieve user settings profile bypassing RLS (via service role client)
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('staff_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    const redirectRes = NextResponse.redirect(new URL('/staff-login?error=access_denied', request.url));
    await supabase.auth.signOut();
    return redirectRes;
  }

  // Check account status
  if (profile.status === 'SUSPENDED') {
    const redirectRes = NextResponse.redirect(new URL('/staff-login?error=suspended', request.url));
    await supabase.auth.signOut();
    await logAuditEvent(profile.email, profile.role, 'ACCESS_DENIED', 'Access attempted by suspended user account.');
    return redirectRes;
  }

  if (profile.status === 'INACTIVE') {
    const redirectRes = NextResponse.redirect(new URL('/staff-login?error=inactive', request.url));
    await supabase.auth.signOut();
    await logAuditEvent(profile.email, profile.role, 'ACCESS_DENIED', 'Access attempted by inactive user account.');
    return redirectRes;
  }

  // Check role authorization
  if (isOwnerRoute && profile.role !== 'OWNER') {
    await logAuditEvent(profile.email, profile.role, 'ACCESS_DENIED', `Role ${profile.role} blocked from Owner path: ${path}`);
    return NextResponse.redirect(new URL('/manager?error=access_denied', request.url));
  }
  
  if (isManagerRoute && profile.role !== 'MANAGER' && profile.role !== 'OWNER') {
    await logAuditEvent(profile.email, profile.role, 'ACCESS_DENIED', `Role ${profile.role} blocked from Manager path: ${path}`);
    return NextResponse.redirect(new URL('/staff-login?error=access_denied', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/owner/:path*', '/manager/:path*'],
};
