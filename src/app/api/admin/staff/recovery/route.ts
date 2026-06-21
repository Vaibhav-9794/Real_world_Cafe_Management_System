import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth-server';
import { logAuditEvent } from '@/lib/audit';
import { sendStaffRecoveryApprovedEmail, sendStaffRecoveryRejectedEmail } from '@/lib/email/emailTemplates';
import bcrypt from 'bcryptjs';

/**
 * GET /api/admin/staff/recovery
 * Owner retrieves all pending staff recovery requests.
 */
export async function GET() {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'OWNER') {
      return NextResponse.json({ success: false, message: 'Unauthorized. Owner access required.' }, { status: 403 });
    }

    // Get all unread RECOVERY_REQUEST notifications
    const notifications = await prisma.notification.findMany({
      where: {
        type: 'RECOVERY_REQUEST',
        isRead: false
      },
      orderBy: { createdAt: 'desc' }
    });

    // Parse message JSON for each notification
    const requests = notifications.map(n => {
      let details: any = {};
      try {
        details = JSON.parse(n.message);
      } catch {
        details = { name: n.userId, email: n.userId };
      }
      return {
        notificationId: n.id,
        staffEmail: n.userId,
        staffName: details.name || n.userId,
        staffId: details.staffId,
        role: details.role,
        branchName: details.branchName,
        requestedAt: details.requestedAt || n.createdAt.toISOString(),
        createdAt: n.createdAt
      };
    });

    return NextResponse.json({ success: true, requests });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/staff/recovery
 * Owner approves or rejects a PIN recovery request.
 * Body: { notificationId, action: 'APPROVE' | 'REJECT' }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'OWNER') {
      return NextResponse.json({ success: false, message: 'Unauthorized. Owner access required.' }, { status: 403 });
    }

    const { notificationId, action } = await request.json();

    if (!notificationId || !action) {
      return NextResponse.json({ success: false, message: 'Notification ID and action are required.' }, { status: 400 });
    }

    if (action !== 'APPROVE' && action !== 'REJECT') {
      return NextResponse.json({ success: false, message: 'Action must be APPROVE or REJECT.' }, { status: 400 });
    }

    // Find the recovery notification
    const notification = await prisma.notification.findUnique({
      where: { id: notificationId }
    });

    if (!notification || notification.type !== 'RECOVERY_REQUEST') {
      return NextResponse.json({ success: false, message: 'Recovery request not found.' }, { status: 404 });
    }

    if (notification.isRead) {
      return NextResponse.json({ success: false, message: 'This recovery request has already been processed.' }, { status: 400 });
    }

    // Parse staff details from notification
    let staffDetails: any = {};
    try {
      staffDetails = JSON.parse(notification.message);
    } catch {
      staffDetails = {};
    }

    const staffEmail = notification.userId;

    // Mark notification as read (processed)
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });

    if (action === 'REJECT') {
      // Send rejection email to staff
      try {
        await sendStaffRecoveryRejectedEmail(staffEmail);
      } catch (mailErr) {
        console.error('Failed to send rejection email:', mailErr);
      }

      await logAuditEvent(
        session.email,
        'OWNER',
        'STAFF_RECOVERY_REJECTED',
        `Rejected PIN recovery request for ${staffEmail}`
      );

      return NextResponse.json({
        success: true,
        message: `Recovery request for ${staffEmail} has been rejected and the user has been notified.`
      });
    }

    // APPROVE: Generate a new secure PIN
    const staff = await prisma.staff.findUnique({
      where: { email: staffEmail }
    });

    if (!staff) {
      return NextResponse.json({ success: false, message: 'Staff member not found in database.' }, { status: 404 });
    }

    // Generate a random 6-digit PIN
    const newPin = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedPin = bcrypt.hashSync(newPin, 10);

    // Update staff PIN
    await prisma.staff.update({
      where: { id: staff.id },
      data: { pin: hashedPin }
    });

    // Send approval email with new PIN
    try {
      await sendStaffRecoveryApprovedEmail(staffEmail, newPin);
    } catch (mailErr) {
      console.error('Failed to send approval email:', mailErr);
    }

    await logAuditEvent(
      session.email,
      'OWNER',
      'STAFF_RECOVERY_APPROVED',
      `Approved PIN recovery for ${staffEmail} and issued new access code`
    );

    return NextResponse.json({
      success: true,
      message: `New PIN issued for ${staff.name}. Recovery email dispatched to ${staffEmail}.`
    });
  } catch (error: any) {
    console.error('Staff recovery approval error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
