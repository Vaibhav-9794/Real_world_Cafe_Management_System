import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { sendStaffRecoveryAlertEmail } from '@/lib/email/emailTemplates';

/**
 * POST /api/auth/recovery
 * Staff or Manager requests a PIN recovery.
 * Creates a RECOVERY_REQUEST notification for Owner review,
 * and sends an alert email to the Owner.
 */
export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ success: false, message: 'Email address is required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Find the staff member
    const staff = await prisma.staff.findUnique({
      where: { email: cleanEmail },
      include: { branch: true }
    });

    if (!staff) {
      // Do not reveal whether email exists for security
      return NextResponse.json({
        success: true,
        message: 'If this email is registered, a recovery request has been submitted for Owner review.'
      });
    }

    if (staff.role === 'OWNER') {
      return NextResponse.json({
        success: false,
        message: 'Owner accounts must use the owner recovery system.'
      }, { status: 400 });
    }

    if (staff.status === 'INACTIVE' || staff.status === 'SUSPENDED') {
      return NextResponse.json({
        success: false,
        message: 'This account is suspended. Please contact your manager directly.'
      }, { status: 400 });
    }

    // Check if there's already a pending recovery request (in last 24h)
    const recentRequest = await prisma.notification.findFirst({
      where: {
        userId: cleanEmail,
        type: 'RECOVERY_REQUEST',
        isRead: false,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }
    });

    if (recentRequest) {
      return NextResponse.json({
        success: true,
        message: 'A recovery request has already been submitted. Please wait for Owner review (up to 24 hours).'
      });
    }

    // Create recovery request notification for Owner
    await prisma.notification.create({
      data: {
        userId: cleanEmail,
        title: `PIN Recovery Request: ${staff.name}`,
        message: JSON.stringify({
          staffId: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role,
          branchId: staff.branchId,
          branchName: staff.branch?.name || 'All Branches',
          requestedAt: new Date().toISOString()
        }),
        type: 'RECOVERY_REQUEST',
        isRead: false
      }
    });

    // Alert the Owner via email
    const owner = await prisma.staff.findFirst({
      where: { role: 'OWNER', status: 'ACTIVE' }
    });

    if (owner) {
      try {
        await sendStaffRecoveryAlertEmail(owner.email, {
          id: staff.id,
          name: staff.name,
          email: staff.email,
          role: staff.role
        });
      } catch (mailErr) {
        console.error('Failed to send staff recovery alert email:', mailErr);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Your PIN recovery request has been submitted. The Owner will review and approve shortly, and you will receive an email with your new access code.'
    });
  } catch (error: any) {
    console.error('Staff recovery request error:', error);
    return NextResponse.json({ success: false, message: 'Server error processing recovery request.' }, { status: 500 });
  }
}
