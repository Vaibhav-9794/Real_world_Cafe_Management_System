import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth-server';
import { logAuditEvent } from '@/lib/audit';
import { sendOwnerEmailVerificationEmail } from '@/lib/email/emailTemplates';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import crypto from 'crypto';

export async function GET() {
  try {
    const session = await getServerSession();

    if (!session || session.role !== 'OWNER') {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 403 });
    }

    const owner = await prisma.staff.findUnique({
      where: { id: session.id }
    });

    if (!owner) {
      return NextResponse.json({ success: false, message: 'Owner profile not found.' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profile: {
        id: owner.id,
        name: owner.name,
        email: owner.email,
        loginMethod: owner.loginMethod,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'OWNER') {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 403 });
    }

    const { email, pin, loginMethod } = await request.json();

    const owner = await prisma.staff.findUnique({
      where: { id: session.id }
    });

    if (!owner) {
      return NextResponse.json({ success: false, message: 'Owner profile not found.' }, { status: 404 });
    }

    const data: any = {};
    
    // Update email — uses verification flow instead of direct update
    if (email) {
      const cleanEmail = email.toLowerCase().trim();
      if (cleanEmail !== owner.email) {
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
          return NextResponse.json({ success: false, message: 'Invalid email address format.' }, { status: 400 });
        }
        // Check if email already in use
        const existing = await prisma.staff.findUnique({ where: { email: cleanEmail } });
        if (existing && existing.id !== owner.id) {
          return NextResponse.json({ success: false, message: 'Email address already in use.' }, { status: 400 });
        }
        
        // Generate a secure verification token and store pending change
        const verifyToken = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        const pendingChange = {
          ownerId: owner.id,
          currentEmail: owner.email,
          newEmail: cleanEmail,
          token: verifyToken,
          expires: expires.toISOString()
        };
        await prisma.cMSConfig.upsert({
          where: { key: 'pending_email_change' },
          create: { key: 'pending_email_change', value: JSON.stringify(pendingChange) },
          update: { value: JSON.stringify(pendingChange) }
        });
        
        // Send verification email to new address
        try {
          const verifyLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/owner/verify-email?token=${verifyToken}`;
          await sendOwnerEmailVerificationEmail(cleanEmail, verifyLink);
        } catch (mailErr) {
          console.error('Failed to send owner email verification email:', mailErr);
        }
        
        await logAuditEvent(session.email, 'OWNER', 'OWNER_EMAIL_CHANGE_REQUESTED', `Owner requested email change to ${cleanEmail}. Verification email sent.`);
        
        return NextResponse.json({
          success: true,
          message: `A verification email has been sent to ${cleanEmail}. Please click the link in that email to confirm the change.`,
          pendingEmailChange: true
        });
      }
    }

    // Update login method
    if (loginMethod) {
      if (loginMethod !== 'PIN' && loginMethod !== 'PASSWORD') {
        return NextResponse.json({ success: false, message: 'Invalid login method. Must be PIN or PASSWORD.' }, { status: 400 });
      }
      data.loginMethod = loginMethod;
    }

    // Update PIN / Password
    if (pin !== undefined && pin !== '') {
      const targetMethod = loginMethod || owner.loginMethod;
      if (targetMethod === 'PIN') {
        // Must be digits only and between 4 and 6 digits
        const pinRegex = /^\d{4,6}$/;
        if (!pinRegex.test(pin)) {
          return NextResponse.json({ success: false, message: 'PIN must be numeric and between 4 and 6 digits.' }, { status: 400 });
        }
      } else {
        // Password must be at least 6 characters
        if (pin.length < 6) {
          return NextResponse.json({ success: false, message: 'Password must be at least 6 characters long.' }, { status: 400 });
        }
      }
      data.pin = bcrypt.hashSync(pin.toString(), 10);
    }

    // Update DB
    const updated = await prisma.staff.update({
      where: { id: owner.id },
      data
    });

    // Update session cookie if email changed
    if (data.email) {
      const cookieStore = await cookies();
      const mockSessionCookie = cookieStore.get('mock-auth-session');
      if (mockSessionCookie) {
        try {
          const profile = JSON.parse(mockSessionCookie.value);
          profile.email = data.email;
          cookieStore.set('mock-auth-session', JSON.stringify(profile), {
            httpOnly: true,
            secure: true,
            sameSite: 'strict',
            path: '/',
            maxAge: 60 * 60 * 24 // 24 hours
          });
        } catch (e) {
          console.error("Failed to update session cookie: ", e);
        }
      }
    }

    await logAuditEvent(
      session.email,
      'OWNER',
      'OWNER_PROFILE_UPDATE',
      `Owner updated profile settings: ${Object.keys(data).join(', ')}`
    );

    return NextResponse.json({
      success: true,
      message: 'Profile settings updated successfully.',
      profile: {
        id: updated.id,
        name: updated.name,
        email: updated.email,
        loginMethod: updated.loginMethod
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
