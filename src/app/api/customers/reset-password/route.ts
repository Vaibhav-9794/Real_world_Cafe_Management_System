import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendCustomerPasswordResetConfirmationEmail } from '@/lib/email/emailTemplates';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { token, newPassword } = await request.json();

    if (!token || !newPassword) {
      return NextResponse.json({ success: false, message: 'Reset token and new password are required.' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ success: false, message: 'Password must be at least 6 characters long.' }, { status: 400 });
    }

    // Find customer by reset token
    const customer = await prisma.customer.findFirst({
      where: { resetToken: token }
    });

    if (!customer) {
      return NextResponse.json({ success: false, message: 'Invalid or expired password reset link.' }, { status: 400 });
    }

    // Verify token expiry
    const now = new Date();
    if (!customer.resetTokenExpires || customer.resetTokenExpires < now) {
      return NextResponse.json({ success: false, message: 'This password reset link has expired.' }, { status: 400 });
    }

    // Hash new password
    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    // Update customer in database
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpires: null
      }
    });

    // Send confirmation email
    try {
      await sendCustomerPasswordResetConfirmationEmail(customer.email);
    } catch (mailErr) {
      console.error('Failed to send customer password reset confirmation email:', mailErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Your password has been reset successfully. You can now log in.'
    });
  } catch (error: any) {
    console.error('Reset password API error:', error);
    return NextResponse.json({ success: false, message: 'Server error processing request.' }, { status: 500 });
  }
}
