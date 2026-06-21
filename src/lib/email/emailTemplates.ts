import { BRANDING } from '../../config/branding';
import { generateActionLink } from '../reservationSecurity';
import { prisma } from '../db';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends an email using Resend API.
 * Logs dispatch to EmailLog table for delivery status tracking and auto-retry.
 */
export async function sendEmail(payload: EmailPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;

  // 1. Create a log in the database with PENDING status
  let emailLog: any = null;
  try {
    emailLog = await prisma.emailLog.create({
      data: {
        to: payload.to,
        subject: payload.subject,
        body: payload.html,
        status: 'PENDING',
        attempts: 1
      }
    });
  } catch (err) {
    console.error('Failed to write EmailLog row:', err);
  }

  if (!apiKey) {
    console.log('\n--- [EMAIL RESEND SANDBOX] ---');
    console.log(`To: ${payload.to}`);
    console.log(`Subject: ${payload.subject}`);
    console.log('Body Preview (HTML):');
    console.log(payload.html.substring(0, 500) + '...\n-----------------------------\n');

    if (emailLog) {
      try {
        await prisma.emailLog.update({
          where: { id: emailLog.id },
          data: { status: 'SENT' }
        });
      } catch (err) {
        console.error('Failed to update EmailLog status to SENT in sandbox:', err);
      }
    }
    return true;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: `${BRANDING.name} <notifications@resend.dev>`, // Default Resend testing sender
        to: [payload.to],
        subject: payload.subject,
        html: payload.html
      })
    });

    const isOk = res.ok;
    const data = await res.json();

    if (emailLog) {
      await prisma.emailLog.update({
        where: { id: emailLog.id },
        data: {
          status: isOk ? 'SENT' : 'FAILED',
          errorMessage: isOk ? null : JSON.stringify(data)
        }
      });
    }
    return isOk;
  } catch (error: any) {
    console.error('Failed to send email via Resend:', error);
    if (emailLog) {
      try {
        await prisma.emailLog.update({
          where: { id: emailLog.id },
          data: {
            status: 'FAILED',
            errorMessage: error.message || String(error)
          }
        });
      } catch (err) {
        console.error('Failed to update EmailLog status to FAILED:', err);
      }
    }
    return false;
  }
}

/**
 * Base email HTML wrapper for luxury branding.
 */
function emailTemplateWrapper(content: string, preheader: string = ''): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${BRANDING.name}</title>
        <style>
          body {
            font-family: 'Playfair Display', Georgia, serif;
            background-color: #0d0a08;
            color: #f5f2eb;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 600px;
            margin: 40px auto;
            background-color: #120f0d;
            border: 1px solid #251f1a;
            border-radius: 8px;
            overflow: hidden;
          }
          .header {
            padding: 40px;
            text-align: center;
            border-bottom: 1px solid #251f1a;
          }
          .logo {
            font-size: 24px;
            color: #c5a880;
            letter-spacing: 4px;
            text-decoration: none;
            font-weight: bold;
          }
          .body {
            padding: 40px;
            line-height: 1.6;
            font-family: 'Inter', Arial, sans-serif;
            font-size: 15px;
            color: #d1cbc4;
          }
          h1 {
            color: #c5a880;
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 22px;
            margin-top: 0;
            margin-bottom: 20px;
            text-align: center;
          }
          .btn {
            display: block;
            width: fit-content;
            margin: 30px auto;
            padding: 12px 30px;
            background-color: #c5a880;
            color: #0d0a08;
            text-decoration: none;
            font-weight: bold;
            border-radius: 4px;
            text-transform: uppercase;
            font-size: 13px;
            letter-spacing: 2px;
          }
          .details-card {
            background-color: #0d0a08;
            border: 1px solid #251f1a;
            border-radius: 6px;
            padding: 20px;
            margin: 20px 0;
          }
          .details-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            border-bottom: 1px dashed #251f1a;
            padding-bottom: 10px;
          }
          .details-row:last-child {
            border-bottom: none;
            margin-bottom: 0;
            padding-bottom: 0;
          }
          .label {
            color: #a8a29e;
            font-weight: bold;
          }
          .value {
            color: #f5f2eb;
          }
          .footer {
            padding: 30px;
            text-align: center;
            border-top: 1px solid #251f1a;
            font-size: 12px;
            color: #a8a29e;
            font-family: 'Inter', Arial, sans-serif;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">${BRANDING.logo}</div>
          </div>
          <div class="body">
            ${content}
          </div>
          <div class="footer">
            <p>${BRANDING.name} &bull; ${BRANDING.branches[0].address}</p>
            <p>If you have any questions, contact us via Phone or WhatsApp: ${BRANDING.branches[0].phone}</p>
            <p>&copy; ${new Date().getFullYear()} ${BRANDING.name}. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Sends email for Reservation Received
 */
export async function sendReservationReceivedEmail(email: string, details: {
  name: string;
  id: string;
  branchName: string;
  date: string;
  time: string;
  guests: number;
  type: string;
  amount: number;
}) {
  const html = emailTemplateWrapper(`
    <h1>Reservation Request Received</h1>
    <p>Dear ${details.name},</p>
    <p>Thank you for choosing ${BRANDING.name}. We have received your reservation request. Our team is currently verifying table availability and will confirm shortly.</p>
    
    <div class="details-card">
      <div class="details-row"><span class="label">Reservation ID:</span><span class="value">${details.id.substring(0, 8)}</span></div>
      <div class="details-row"><span class="label">Branch:</span><span class="value">${details.branchName}</span></div>
      <div class="details-row"><span class="label">Reservation Type:</span><span class="value">${details.type}</span></div>
      <div class="details-row"><span class="label">Date:</span><span class="value">${details.date}</span></div>
      <div class="details-row"><span class="label">Time:</span><span class="value">${details.time}</span></div>
      <div class="details-row"><span class="label">Guests:</span><span class="value">${details.guests} People</span></div>
      <div class="details-row"><span class="label">Advance Deposit:</span><span class="value">₹${details.amount.toFixed(2)} (Paid)</span></div>
    </div>
    
    <p style="text-align: center;">We will send another notification as soon as your booking is approved by the host.</p>
  `);

  await sendEmail({
    to: email,
    subject: `[Received] Your Reservation Request at ${BRANDING.name}`,
    html
  });
}

/**
 * Sends email for Reservation Approved
 */
export async function sendReservationApprovedEmail(email: string, details: {
  name: string;
  id: string;
  branchName: string;
  date: string;
  time: string;
  guests: number;
  tables: string[];
}) {
  const html = emailTemplateWrapper(`
    <h1>Reservation Confirmed ✦</h1>
    <p>Dear ${details.name},</p>
    <p>We are delighted to inform you that your reservation at ${BRANDING.name} has been **Approved**. Your table is ready for you!</p>
    
    <div class="details-card">
      <div class="details-row"><span class="label">Reservation ID:</span><span class="value">${details.id.substring(0, 8)}</span></div>
      <div class="details-row"><span class="label">Branch:</span><span class="value">${details.branchName}</span></div>
      <div class="details-row"><span class="label">Date:</span><span class="value">${details.date}</span></div>
      <div class="details-row"><span class="label">Time:</span><span class="value">${details.time}</span></div>
      <div class="details-row"><span class="label">Guests:</span><span class="value">${details.guests} People</span></div>
      <div class="details-row"><span class="label">Assigned Table(s):</span><span class="value">${details.tables.join(', ')}</span></div>
    </div>
    
    <p>Please arrive 10 minutes prior to your booking. Your table will be held for a maximum of 15 minutes past your scheduled reservation time.</p>
    <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/menu" class="btn">Explore Digital Menu</a>
  `);

  await sendEmail({
    to: email,
    subject: `[Confirmed] Your Reservation at ${BRANDING.name} is APPROVED!`,
    html
  });
}

/**
 * Sends email for Reservation Rejected
 */
export async function sendReservationRejectedEmail(email: string, details: {
  name: string;
  id: string;
  branchName: string;
  date: string;
  time: string;
  refundAmount: number;
}) {
  const html = emailTemplateWrapper(`
    <h1>Reservation Update: Declined</h1>
    <p>Dear ${details.name},</p>
    <p>We regret to inform you that we are unable to accommodate your reservation request for **${details.date} at ${details.time}** due to fully booked capacities or private events.</p>
    
    <div class="details-card">
      <div class="details-row"><span class="label">Reservation ID:</span><span class="value">${details.id.substring(0, 8)}</span></div>
      <div class="details-row"><span class="label">Branch:</span><span class="value">${details.branchName}</span></div>
      <div class="details-row"><span class="label">Date:</span><span class="value">${details.date}</span></div>
      <div class="details-row"><span class="label">Time:</span><span class="value">${details.time}</span></div>
    </div>
    
    <p>**Refund Information:**</p>
    <p>Your advance booking deposit of **₹${details.refundAmount.toFixed(2)}** has been automatically voided and initiated for refund. It should reflect in your source account within 5-7 business days.</p>
    
    <p>We apologize for the inconvenience and hope to serve you in the future.</p>
  `);

  await sendEmail({
    to: email,
    subject: `[Refund Initiated] Reservation Update at ${BRANDING.name}`,
    html
  });
}

/**
 * Sends email for Event Booking Confirmation
 */
export async function sendEventConfirmationEmail(email: string, details: {
  name: string;
  id: string;
  packageName: string;
  branchName: string;
  date: string;
  guests: number;
  amountPaid: number;
}) {
  const html = emailTemplateWrapper(`
    <h1>Event Booking Confirmed!</h1>
    <p>Dear ${details.name},</p>
    <p>Congratulations! Your exclusive event booking at ${BRANDING.name} is officially confirmed. Our event manager will reach out shortly to align on custom menu options and styling arrangements.</p>
    
    <div class="details-card">
      <div class="details-row"><span class="label">Booking ID:</span><span class="value">${details.id.substring(0, 8)}</span></div>
      <div class="details-row"><span class="label">Event Package:</span><span class="value">${details.packageName}</span></div>
      <div class="details-row"><span class="label">Branch:</span><span class="value">${details.branchName}</span></div>
      <div class="details-row"><span class="label">Date:</span><span class="value">${details.date}</span></div>
      <div class="details-row"><span class="label">Guests:</span><span class="value">${details.guests} People</span></div>
      <div class="details-row"><span class="label">Deposit Paid:</span><span class="value">₹${details.amountPaid.toFixed(2)}</span></div>
    </div>
    
    <p>Thank you for choosing us to host your special day. We look forward to creating unforgettable memories for you and your guests.</p>
  `);

  await sendEmail({
    to: email,
    subject: `[Confirmed] Event Booking: ${details.packageName} at ${BRANDING.name}`,
    html
  });
}

/**
 * Sends email for Reservation Reminder
 */
export async function sendReservationReminderEmail(email: string, details: {
  name: string;
  id: string;
  branchName: string;
  date: string;
  time: string;
  guests: number;
  tables: string[];
}) {
  const html = emailTemplateWrapper(`
    <h1>Upcoming Reservation Reminder ✦</h1>
    <p>Dear ${details.name},</p>
    <p>This is a friendly reminder that you have an upcoming reservation at **${BRANDING.name}**.</p>
    
    <div class="details-card">
      <div class="details-row"><span class="label">Reservation ID:</span><span class="value">${details.id.substring(0, 8)}</span></div>
      <div class="details-row"><span class="label">Branch:</span><span class="value">${details.branchName}</span></div>
      <div class="details-row"><span class="label">Date:</span><span class="value">${details.date}</span></div>
      <div class="details-row"><span class="label">Time:</span><span class="value">${details.time}</span></div>
      <div class="details-row"><span class="label">Guests:</span><span class="value">${details.guests} People</span></div>
      <div class="details-row"><span class="label">Assigned Table(s):</span><span class="value">${details.tables.join(', ')}</span></div>
    </div>
    
    <p>If you need to make changes or cancel your booking, please do so at least 4 hours in advance. We look forward to serving you tonight!</p>
    <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/menu" class="btn">View Digital Menu</a>
  `);

  await sendEmail({
    to: email,
    subject: `[Reminder] Your Reservation at ${BRANDING.name} is soon!`,
    html
  });
}

/**
 * Sends email for Reservation Cancelled
 */
export async function sendReservationCancelledEmail(email: string, details: {
  name: string;
  id: string;
  branchName: string;
  date: string;
  time: string;
  refundAmount?: number;
}) {
  const html = emailTemplateWrapper(`
    <h1>Reservation Cancelled</h1>
    <p>Dear ${details.name},</p>
    <p>This email confirms that your reservation at **${BRANDING.name}** has been **Cancelled**.</p>
    
    <div class="details-card">
      <div class="details-row"><span class="label">Reservation ID:</span><span class="value">${details.id.substring(0, 8)}</span></div>
      <div class="details-row"><span class="label">Branch:</span><span class="value">${details.branchName}</span></div>
      <div class="details-row"><span class="label">Date:</span><span class="value">${details.date}</span></div>
      <div class="details-row"><span class="label">Time:</span><span class="value">${details.time}</span></div>
    </div>
    
    ${details.refundAmount && details.refundAmount > 0 ? `
    <p>**Refund Information:**</p>
    <p>Your booking deposit of **₹${details.refundAmount.toFixed(2)}** has been queued for a refund. It should reflect in your source account within 5-7 business days.</p>
    ` : ''}
    
    <p>We hope to welcome you back to Boho Cafe & Lounge in the future.</p>
  `);

  await sendEmail({
    to: email,
    subject: `[Cancelled] Reservation Cancelled at ${BRANDING.name}`,
    html
  });
}

/**
 * Sends Owner New Reservation Alert Email (Includes secure approval/rejection links)
 */
export async function sendOwnerNewReservationAlertEmail(ownerEmail: string, details: {
  id: string;
  name: string;
  email: string;
  phone: string;
  branchName: string;
  date: string;
  time: string;
  guests: number;
  type: string;
  specialRequests?: string;
  tables: string[];
}) {
  const approveLink = generateActionLink(details.id, 'approve');
  const rejectLink = generateActionLink(details.id, 'reject');

  const html = emailTemplateWrapper(`
    <h1>New Reservation Pending Host Approval</h1>
    <p>A new reservation has been requested and requires owner authorization:</p>
    
    <div class="details-card">
      <div class="details-row"><span class="label">Reservation ID:</span><span class="value">${details.id.substring(0, 8)}</span></div>
      <div class="details-row"><span class="label">Customer Name:</span><span class="value">${details.name}</span></div>
      <div class="details-row"><span class="label">Email:</span><span class="value">${details.email}</span></div>
      <div class="details-row"><span class="label">Phone:</span><span class="value">${details.phone}</span></div>
      <div class="details-row"><span class="label">Branch:</span><span class="value">${details.branchName}</span></div>
      <div class="details-row"><span class="label">Date & Time:</span><span class="value">${details.date} @ ${details.time}</span></div>
      <div class="details-row"><span class="label">Guests:</span><span class="value">${details.guests} People</span></div>
      <div class="details-row"><span class="label">Type:</span><span class="value">${details.type}</span></div>
      <div class="details-row"><span class="label">Suggested Tables:</span><span class="value">${details.tables.join(', ')}</span></div>
      ${details.specialRequests ? `<div class="details-row"><span class="label">Special Requests:</span><span class="value">${details.specialRequests}</span></div>` : ''}
    </div>
    
    <h2 style="color: #c5a880; font-size: 16px; text-align: center; margin-top: 30px;">AUTHORIZE RESERVATION</h2>
    <p style="text-align: center; margin: 20px 0;">
      <a href="${approveLink}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; margin-right: 15px; text-transform: uppercase; font-size: 13px; letter-spacing: 1px;">Approve Booking</a>
      <a href="${rejectLink}" style="display: inline-block; padding: 12px 24px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; text-transform: uppercase; font-size: 13px; letter-spacing: 1px;">Reject / Decline</a>
    </p>
    <p style="font-size: 11px; color: #a8a29e; text-align: center; margin-top: 10px;">Note: These secure quick-action authorization links expire in 48 hours.</p>
  `);

  await sendEmail({
    to: ownerEmail,
    subject: `[New Alert] Reservation Pending: ${details.name} (${details.guests} Guests)`,
    html
  });
}

/**
 * Sends Owner Pending Approval Reminder Alert Email
 */
export async function sendOwnerPendingApprovalAlertEmail(ownerEmail: string, pendingCount: number) {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/owner`;
  
  const html = emailTemplateWrapper(`
    <h1>Pending Approval Warning</h1>
    <p>Hello Aria,</p>
    <p>This is a reminder that there are currently **${pendingCount} reservations** waiting for your approval in the queue.</p>
    <p>Please log in to the Owner Dashboard to review and approve these bookings before they conflict with current table inventories.</p>
    
    <a href="${dashboardUrl}" class="btn">Access Owner Dashboard</a>
  `);

  await sendEmail({
    to: ownerEmail,
    subject: `[Queue Alert] ${pendingCount} Reservations Awaiting Approval`,
    html
  });
}

/**
 * Sends Owner Daily Reservation Summary Email
 */
export async function sendOwnerDailySummaryEmail(ownerEmail: string, details: {
  date: string;
  totalBookings: number;
  approvedCount: number;
  rejectedCount: number;
  capacityUtilization: number;
  peakHour: string;
  revenueEstimate: number;
}) {
  const html = emailTemplateWrapper(`
    <h1>Daily Reservations Summary</h1>
    <p>Hello Aria,</p>
    <p>Here is your reservation metrics summary for date **${details.date}**:</p>
    
    <div class="details-card">
      <div class="details-row"><span class="label">Total Inquiries:</span><span class="value">${details.totalBookings}</span></div>
      <div class="details-row"><span class="label">Approved / Confirmed:</span><span class="value">${details.approvedCount}</span></div>
      <div class="details-row"><span class="label">Rejected / Cancelled:</span><span class="value">${details.rejectedCount}</span></div>
      <div class="details-row"><span class="label">Table Capacity Utilization:</span><span class="value">${details.capacityUtilization.toFixed(1)}%</span></div>
      <div class="details-row"><span class="label">Peak Booking Hour:</span><span class="value">${details.peakHour}</span></div>
      <div class="details-row"><span class="label">Estimated Covers Revenue:</span><span class="value">₹${details.revenueEstimate.toFixed(2)}</span></div>
    </div>
    
    <p>For fully interactive timelines and live customer notes, access the administration dashboard.</p>
    <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/owner" class="btn">View Analytics Dashboard</a>
  `);

  await sendEmail({
    to: ownerEmail,
    subject: `[Summary] Daily Reservations Report - ${details.date}`,
    html
  });
}

/**
 * Sends Customer OTP verification code
 */
export async function sendCustomerOtpEmail(email: string, otp: string) {
  const html = emailTemplateWrapper(`
    <h1>Verification Code</h1>
    <p>Use the secure verification code below to access your BOHO Account Portal:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <div style="display: inline-block; padding: 18px 36px; background-color: #0d0a08; border: 1px solid #c5a880; border-radius: 8px; font-size: 28px; font-weight: 700; letter-spacing: 6px; color: #c5a880; font-family: monospace;">
        ${otp}
      </div>
    </div>
    
    <p style="text-align: center; font-size: 13px; color: #a8a29e;">This code will expire in 10 minutes. If you did not request this code, please ignore this email.</p>
  `);

  await sendEmail({
    to: email,
    subject: `[BOHO] Verification Code: ${otp}`,
    html
  });
}

/**
 * Sends Contact Form Alert Email to Owner/Manager
 */
export async function sendContactFormAlertEmail(receiverEmail: string, details: {
  name: string;
  email: string;
  phone: string;
  type: string;
  notes?: string;
}) {
  const html = emailTemplateWrapper(`
    <h1>New Contact Form Submission</h1>
    <p>A new customer lead/inquiry has been received through the website:</p>
    
    <div class="details-card">
      <div class="details-row"><span class="label">Name:</span><span class="value">${details.name}</span></div>
      <div class="details-row"><span class="label">Email:</span><span class="value">${details.email}</span></div>
      <div class="details-row"><span class="label">Phone:</span><span class="value">${details.phone}</span></div>
      <div class="details-row"><span class="label">Inquiry Type:</span><span class="value">${details.type}</span></div>
      ${details.notes ? `<div class="details-row"><span class="label">Message/Notes:</span><span class="value">${details.notes}</span></div>` : ''}
    </div>
    
    <p style="text-align: center;">Please review this inquiry and follow up within 24 hours.</p>
  `);

  await sendEmail({
    to: receiverEmail,
    subject: `[New Inquiry] ${details.type}: ${details.name}`,
    html
  });
}

/**
 * Sends Newsletter Confirmation Email to Customer
 */
export async function sendNewsletterConfirmationEmail(email: string) {
  const html = emailTemplateWrapper(`
    <h1>Welcome to the BOHO Club ✦</h1>
    <p>Thank you for subscribing to the BOHO Cafe & Lounge newsletter!</p>
    <p>You are now on our exclusive list. You will be the first to receive updates about our upcoming seasonal menus, special tasting events, live jazz nights, and loyalty member promotions.</p>
    
    <p>We look forward to serving you soon.</p>
    <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/menu" class="btn">Explore Our Menu</a>
  `);

  await sendEmail({
    to: email,
    subject: `Welcome to the BOHO Club!`,
    html
  });
}

/**
 * Sends Customer Password Reset Email
 */
export async function sendCustomerPasswordResetEmail(email: string, link: string) {
  const html = emailTemplateWrapper(`
    <h1>Reset Your BOHO Password</h1>
    <p>We received a request to reset your password for your BOHO account.</p>
    <p>Click the secure button below to choose a new password. This link is valid for 1 hour:</p>
    
    <a href="${link}" class="btn">Reset Password</a>
    
    <p style="font-size: 11px; color: #a8a29e; text-align: center;">If you did not request a password reset, you can safely ignore this email. Your account remains secure.</p>
  `);

  await sendEmail({
    to: email,
    subject: `Reset your BOHO Account Password`,
    html
  });
}

/**
 * Sends Customer Password Reset Confirmation Email
 */
export async function sendCustomerPasswordResetConfirmationEmail(email: string) {
  const html = emailTemplateWrapper(`
    <h1>Password Updated Successfully</h1>
    <p>This email confirms that the password for your BOHO customer portal account has been updated successfully.</p>
    <p>If you did not authorize this change, please contact our support team immediately.</p>
    
    <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/account" class="btn">Access Portal</a>
  `);

  await sendEmail({
    to: email,
    subject: `Your BOHO Password was updated`,
    html
  });
}

/**
 * Sends Staff Recovery Alert Email to Owner
 */
export async function sendStaffRecoveryAlertEmail(ownerEmail: string, details: {
  id: string;
  name: string;
  email: string;
  role: string;
}) {
  const dashboardUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/owner/staff`;
  const html = emailTemplateWrapper(`
    <h1>Staff PIN Recovery Request</h1>
    <p>A staff member is requesting access code recovery:</p>
    
    <div class="details-card">
      <div class="details-row"><span class="label">Staff Name:</span><span class="value">${details.name}</span></div>
      <div class="details-row"><span class="label">Email:</span><span class="value">${details.email}</span></div>
      <div class="details-row"><span class="label">Role:</span><span class="value">${details.role}</span></div>
    </div>
    
    <p style="text-align: center;">You can authorize a new access PIN or reject this request from the staff panel:</p>
    <a href="${dashboardUrl}" class="btn">View Recovery Queue</a>
  `);

  await sendEmail({
    to: ownerEmail,
    subject: `[Action Required] PIN Recovery Request from ${details.name}`,
    html
  });
}

/**
 * Sends Staff Recovery Approved Email
 */
export async function sendStaffRecoveryApprovedEmail(staffEmail: string, newPin: string) {
  const html = emailTemplateWrapper(`
    <h1>PIN Recovery Approved</h1>
    <p>Your Cafe Owner has approved your PIN recovery request. Your new temporary access code is listed below:</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <div style="display: inline-block; padding: 14px 28px; background-color: #0d0a08; border: 1px solid #10b981; border-radius: 6px; font-size: 24px; font-weight: 700; color: #10b981; font-family: monospace; letter-spacing: 2px;">
        ${newPin}
      </div>
    </div>
    
    <p>Please log in using your new code and update your security settings immediately.</p>
    <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/staff-login" class="btn">Staff Login Portal</a>
  `);

  await sendEmail({
    to: staffEmail,
    subject: `Your BOHO Staff PIN has been reset`,
    html
  });
}

/**
 * Sends Staff Recovery Rejected Email
 */
export async function sendStaffRecoveryRejectedEmail(staffEmail: string) {
  const html = emailTemplateWrapper(`
    <h1>PIN Recovery Request Declined</h1>
    <p>Your PIN recovery request has been reviewed and **Declined** by the Cafe Owner.</p>
    <p>If you believe this is a mistake, please contact your manager or system administrator directly.</p>
  `);

  await sendEmail({
    to: staffEmail,
    subject: `BOHO PIN Recovery Request Declined`,
    html
  });
}

/**
 * Sends Owner Recovery Email
 */
export async function sendOwnerRecoveryEmail(ownerEmail: string, link: string) {
  const html = emailTemplateWrapper(`
    <h1>Owner Account Recovery</h1>
    <p>A request has been initiated to recover the Owner account for ${BRANDING.name}.</p>
    <p>Click the secure button below to reset your Owner credentials. This link is valid for 1 hour:</p>
    
    <a href="${link}" class="btn">Recover Owner Account</a>
    
    <p style="font-size: 11px; color: #a8a29e; text-align: center;">If you did not request this recovery, please notify security immediately.</p>
  `);

  await sendEmail({
    to: ownerEmail,
    subject: `Reset your BOHO Owner Account`,
    html
  });
}

/**
 * Sends Owner Email Verification Email
 */
export async function sendOwnerEmailVerificationEmail(newEmail: string, link: string) {
  const html = emailTemplateWrapper(`
    <h1>Verify Your New Email Address</h1>
    <p>A request was received in the Owner settings panel to change the primary email address to: **${newEmail}**.</p>
    <p>Click the button below to verify this email address and complete the transfer:</p>
    
    <a href="${link}" class="btn">Verify Email Address</a>
    
    <p style="font-size: 11px; color: #a8a29e; text-align: center;">If you did not initiate this change, please ignore this email.</p>
  `);

  await sendEmail({
    to: newEmail,
    subject: `Verify your new BOHO Owner Email`,
    html
  });
}

