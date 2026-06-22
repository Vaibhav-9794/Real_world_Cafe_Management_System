import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth-server';
import { logAuditEvent } from '@/lib/audit';
import { sendStaffRecoveryApprovedEmail, sendStaffRecoveryRejectedEmail } from '@/lib/email/emailTemplates';
import { supabaseAdmin } from '@/lib/supabase-admin';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

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

    // Get all RECOVERY_REQUEST notifications
    const notifications = await prisma.notification.findMany({
      where: {
        type: 'RECOVERY_REQUEST'
      },
      orderBy: { createdAt: 'desc' }
    });

    // Fetch recovery logs via supabaseAdmin to bypass local Prisma port block
    const { data: logs } = await supabaseAdmin
      .from('staff_recovery_logs')
      .select('*')
      .order('created_at', { ascending: false });

    // Parse message JSON for each notification
    const requests = notifications.map(n => {
      let details: any = {};
      try {
        details = JSON.parse(n.message);
      } catch {
        details = { name: n.userId, email: n.userId };
      }

      // Find if there is an existing log for this email
      const associatedLog = (logs || []).find((l: any) => l.staff_email === n.userId);

      return {
        notificationId: n.id,
        staffEmail: n.userId,
        staffName: details.name || n.userId,
        staffId: details.staffId,
        role: details.role,
        branchName: details.branchName,
        requestedAt: details.requestedAt || n.createdAt.toISOString(),
        createdAt: n.createdAt,
        logId: associatedLog ? associatedLog.id : null,
        tempPin: associatedLog ? associatedLog.temp_pin : null,
        emailStatus: associatedLog ? associatedLog.email_status : null,
        errorMessage: associatedLog ? associatedLog.error_message : null,
        isRead: n.isRead
      };
    }).filter(r => {
      // Keep in queue if notification is unread (not yet approved/rejected)
      // OR if it is read but the associated log has status 'FAILED' (needs retry or manual copy)
      return !r.isRead || r.emailStatus === 'FAILED';
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
        message: `Recovery request for ${staffEmail} has been rejected.`
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

    // Set initial email variables
    const logId = crypto.randomUUID();
    let emailStatus = 'PENDING';
    let errorMessage: string | null = null;

    // Send approval email with new PIN
    try {
      await sendStaffRecoveryApprovedEmail(staffEmail, newPin);
      emailStatus = 'SENT';
    } catch (mailErr: any) {
      console.error('Failed to send approval email:', mailErr);
      emailStatus = 'FAILED';
      errorMessage = mailErr.message || String(mailErr) || 'Resend error';
    }

    // Insert staff recovery log record directly into Supabase (bypassing local Prisma port limits)
    const { error: insertError } = await supabaseAdmin
      .from('staff_recovery_logs')
      .insert({
        id: logId,
        staff_id: staff.id,
        staff_email: staffEmail,
        temp_pin: newPin,
        email_status: emailStatus,
        error_message: errorMessage,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Failed to write staff_recovery_logs row:', insertError.message);
    }

    await logAuditEvent(
      session.email,
      'OWNER',
      'STAFF_RECOVERY_APPROVED',
      `Approved PIN recovery for ${staffEmail} (Email status: ${emailStatus})`
    );

    return NextResponse.json({
      success: true,
      message: emailStatus === 'SENT'
        ? `PIN recovery approved. Temporary PIN has been emailed to ${staffEmail}.`
        : `PIN recovery approved, but email delivery failed: ${errorMessage}. PIN displayed on dashboard.`,
      logId,
      tempPin: newPin,
      emailStatus,
      errorMessage
    });
  } catch (error: any) {
    console.error('Staff recovery approval error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/staff/recovery
 * Owner retries email delivery for a generated PIN.
 * Body: { logId }
 */
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'OWNER') {
      return NextResponse.json({ success: false, message: 'Unauthorized. Owner access required.' }, { status: 403 });
    }

    const { logId, action } = await request.json();
    if (!logId) {
      return NextResponse.json({ success: false, message: 'Log ID is required.' }, { status: 400 });
    }

    // Fetch recovery log using supabaseAdmin
    const { data: log, error: fetchError } = await supabaseAdmin
      .from('staff_recovery_logs')
      .select('*')
      .eq('id', logId)
      .single();

    if (fetchError || !log) {
      return NextResponse.json({ success: false, message: 'Recovery log record not found.' }, { status: 404 });
    }

    if (action === 'DISMISS') {
      // Update email_status to DISMISSED
      const { error: updateError } = await supabaseAdmin
        .from('staff_recovery_logs')
        .update({
          email_status: 'DISMISSED',
          updated_at: new Date().toISOString()
        })
        .eq('id', logId);

      if (updateError) {
        console.error('Failed to dismiss recovery log:', updateError.message);
        return NextResponse.json({ success: false, message: updateError.message }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Recovery request cleared from dashboard.'
      });
    }

    let emailStatus = 'SENT';
    let errorMessage: string | null = null;

    try {
      await sendStaffRecoveryApprovedEmail(log.staff_email, log.temp_pin);
    } catch (mailErr: any) {
      console.error('Retry email failed:', mailErr);
      emailStatus = 'FAILED';
      errorMessage = mailErr.message || String(mailErr) || 'Resend error';
    }

    // Update status in database using supabaseAdmin
    const { error: updateError } = await supabaseAdmin
      .from('staff_recovery_logs')
      .update({
        email_status: emailStatus,
        error_message: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', logId);

    if (updateError) {
      console.error('Failed to update recovery log status:', updateError.message);
    }

    return NextResponse.json({
      success: true,
      emailStatus,
      errorMessage,
      message: emailStatus === 'SENT'
        ? `Email successfully sent to ${log.staff_email}.`
        : `Email delivery failed: ${errorMessage}.`
    });
  } catch (error: any) {
    console.error('Staff recovery retry error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
