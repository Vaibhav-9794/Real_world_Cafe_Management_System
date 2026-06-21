import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendOwnerEmailVerificationEmail } from '@/lib/email/emailTemplates';
import crypto from 'crypto';

/**
 * POST /api/owner/verify-email
 * Step 1: Initiates owner email change by sending a verification email.
 * Body: { currentEmail, newEmail }
 * Stores pending change in CMSConfig table.
 */
export async function POST(request: Request) {
  try {
    const { currentEmail, newEmail } = await request.json();

    if (!currentEmail || !newEmail) {
      return NextResponse.json({ success: false, message: 'Current email and new email are required.' }, { status: 400 });
    }

    const cleanNew = newEmail.trim().toLowerCase();
    const cleanCurrent = currentEmail.trim().toLowerCase();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanNew)) {
      return NextResponse.json({ success: false, message: 'Invalid email address format.' }, { status: 400 });
    }

    // Check that the owner exists with the current email
    const owner = await prisma.staff.findUnique({ where: { email: cleanCurrent } });
    if (!owner || owner.role !== 'OWNER') {
      return NextResponse.json({ success: false, message: 'Current email not found for Owner account.' }, { status: 404 });
    }

    // Check if new email is already in use
    if (cleanNew !== cleanCurrent) {
      const existing = await prisma.staff.findUnique({ where: { email: cleanNew } });
      if (existing) {
        return NextResponse.json({ success: false, message: 'This email address is already in use.' }, { status: 400 });
      }
    }

    // Generate a secure verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Store pending change in CMSConfig
    const pendingChange = {
      ownerId: owner.id,
      currentEmail: cleanCurrent,
      newEmail: cleanNew,
      token,
      expires: expires.toISOString()
    };

    await prisma.cMSConfig.upsert({
      where: { key: 'pending_email_change' },
      create: { key: 'pending_email_change', value: JSON.stringify(pendingChange) },
      update: { value: JSON.stringify(pendingChange) }
    });

    // Send verification email to the NEW email address
    const verifyLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/owner/verify-email?token=${token}`;
    try {
      await sendOwnerEmailVerificationEmail(cleanNew, verifyLink);
    } catch (mailErr) {
      console.error('Failed to send owner email verification:', mailErr);
    }

    return NextResponse.json({
      success: true,
      message: `A verification email has been sent to ${cleanNew}. Click the link in that email to confirm the change.`
    });
  } catch (error: any) {
    console.error('Owner email verification initiation error:', error);
    return NextResponse.json({ success: false, message: 'Server error processing request.' }, { status: 500 });
  }
}

/**
 * GET /api/owner/verify-email?token=xxx
 * Step 2: Confirm the email change by validating the token.
 * Redirects to /owner with a success or error message.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return new Response(null, {
        status: 302,
        headers: { Location: '/owner?email_verify=error&reason=missing_token' }
      });
    }

    // Retrieve pending change from CMSConfig
    const config = await prisma.cMSConfig.findUnique({
      where: { key: 'pending_email_change' }
    });

    if (!config) {
      return new Response(null, {
        status: 302,
        headers: { Location: '/owner?email_verify=error&reason=no_pending' }
      });
    }

    let pendingChange: any;
    try {
      pendingChange = JSON.parse(config.value);
    } catch {
      return new Response(null, {
        status: 302,
        headers: { Location: '/owner?email_verify=error&reason=invalid_state' }
      });
    }

    // Validate token
    if (pendingChange.token !== token) {
      return new Response(null, {
        status: 302,
        headers: { Location: '/owner?email_verify=error&reason=invalid_token' }
      });
    }

    // Check expiry
    const expires = new Date(pendingChange.expires);
    if (expires < new Date()) {
      // Clean up expired pending change
      await prisma.cMSConfig.delete({ where: { key: 'pending_email_change' } });
      return new Response(null, {
        status: 302,
        headers: { Location: '/owner?email_verify=error&reason=expired' }
      });
    }

    // Apply the email change
    await prisma.staff.update({
      where: { id: pendingChange.ownerId },
      data: { email: pendingChange.newEmail }
    });

    // Clean up pending change record
    await prisma.cMSConfig.delete({ where: { key: 'pending_email_change' } });

    return new Response(null, {
      status: 302,
      headers: { Location: `/owner?email_verify=success&new_email=${encodeURIComponent(pendingChange.newEmail)}` }
    });
  } catch (error: any) {
    console.error('Owner email verification error:', error);
    return new Response(null, {
      status: 302,
      headers: { Location: '/owner?email_verify=error&reason=server_error' }
    });
  }
}
