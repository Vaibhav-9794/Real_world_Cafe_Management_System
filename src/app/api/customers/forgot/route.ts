import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendCustomerPasswordResetEmail } from '@/lib/email/emailTemplates';
import crypto from 'crypto';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, message: 'Email address is required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    
    // Find customer by email
    const customer = await prisma.customer.findUnique({
      where: { email: cleanEmail }
    });

    // For security reasons, do not expose whether the email exists.
    // Simply return success but only send email if customer exists.
    if (customer) {
      // Generate a secure random reset token
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

      await prisma.customer.update({
        where: { id: customer.id },
        data: {
          resetToken: token,
          resetTokenExpires: expires
        }
      });

      const resetLink = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/account/reset-password?token=${token}`;
      try {
        await sendCustomerPasswordResetEmail(customer.email, resetLink);
      } catch (mailErr) {
        console.error('Failed to send customer password reset email:', mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'If the email exists in our records, a secure password reset link has been dispatched.'
    });
  } catch (error: any) {
    console.error('Forgot password API error:', error);
    return NextResponse.json({ success: false, message: 'Server error processing request.' }, { status: 500 });
  }
}
