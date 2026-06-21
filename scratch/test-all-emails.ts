import {
  sendReservationReceivedEmail,
  sendReservationApprovedEmail,
  sendReservationRejectedEmail,
  sendEventConfirmationEmail,
  sendReservationReminderEmail,
  sendReservationCancelledEmail,
  sendOwnerNewReservationAlertEmail,
  sendOwnerPendingApprovalAlertEmail,
  sendOwnerDailySummaryEmail,
  sendCustomerOtpEmail,
  sendContactFormAlertEmail,
  sendNewsletterConfirmationEmail,
  sendCustomerPasswordResetEmail,
  sendCustomerPasswordResetConfirmationEmail,
  sendStaffRecoveryAlertEmail,
  sendStaffRecoveryApprovedEmail,
  sendStaffRecoveryRejectedEmail,
  sendOwnerRecoveryEmail,
  sendOwnerEmailVerificationEmail
} from '../src/lib/email/emailTemplates';
import { prisma } from '../src/lib/db';

const targetEmail = "hs142636@gmail.com";

async function runAllEmailTests() {
  console.log("==========================================");
  console.log("📧 STARTING LIVE RESEND E2E TEST RUNNER...");
  console.log(`Recipient Email: ${targetEmail}`);
  console.log(`Resend API Key Configured: ${process.env.RESEND_API_KEY ? 'Yes (starts with ' + process.env.RESEND_API_KEY.substring(0, 6) + ')' : 'No'}`);
  console.log("==========================================\n");

  const results: { [key: string]: { success: boolean; status: string; error?: string } } = {};

  const detailsMock = {
    id: "test-reservation-uuid-12345678",
    name: "Aria Sterling",
    email: targetEmail,
    phone: "+91 98765 43210",
    branchName: "Boho Cafe Downtown",
    date: "2026-06-25",
    time: "19:30",
    guests: 4,
    type: "TABLE",
    amount: 1500.00,
    amountPaid: 1500.00,
    refundAmount: 1500.00,
    tables: ["Table 4", "Table 5"],
    packageName: "Golden Birthday Soiree",
    specialRequests: "Window seat and flower decorations please.",
    role: "MANAGER"
  };

  const templates = [
    {
      name: "sendCustomerOtpEmail",
      fn: () => sendCustomerOtpEmail(targetEmail, "984210")
    },
    {
      name: "sendContactFormAlertEmail",
      fn: () => sendContactFormAlertEmail(targetEmail, {
        name: "Aria Sterling",
        email: targetEmail,
        phone: "+91 98765 43210",
        type: "CONTACT",
        notes: "I want to book the venue for a private video shoot next Tuesday."
      })
    },
    {
      name: "sendNewsletterConfirmationEmail",
      fn: () => sendNewsletterConfirmationEmail(targetEmail)
    },
    {
      name: "sendCustomerPasswordResetEmail",
      fn: () => sendCustomerPasswordResetEmail(targetEmail, "http://localhost:3000/account/reset-password?token=mock_token_123")
    },
    {
      name: "sendCustomerPasswordResetConfirmationEmail",
      fn: () => sendCustomerPasswordResetConfirmationEmail(targetEmail)
    },
    {
      name: "sendStaffRecoveryAlertEmail",
      fn: () => sendStaffRecoveryAlertEmail(targetEmail, {
        id: "staff-uuid-111",
        name: "Staff John",
        email: targetEmail,
        role: "STAFF"
      })
    },
    {
      name: "sendStaffRecoveryApprovedEmail",
      fn: () => sendStaffRecoveryApprovedEmail(targetEmail, "4321")
    },
    {
      name: "sendStaffRecoveryRejectedEmail",
      fn: () => sendStaffRecoveryRejectedEmail(targetEmail)
    },
    {
      name: "sendOwnerRecoveryEmail",
      fn: () => sendOwnerRecoveryEmail(targetEmail, "http://localhost:3000/owner/recovery?token=mock_owner_token_999")
    },
    {
      name: "sendOwnerEmailVerificationEmail",
      fn: () => sendOwnerEmailVerificationEmail(targetEmail, "http://localhost:3000/api/owner/verify-email?token=mock_verify_token_888")
    },
    {
      name: "sendReservationReceivedEmail",
      fn: () => sendReservationReceivedEmail(targetEmail, detailsMock)
    },
    {
      name: "sendReservationApprovedEmail",
      fn: () => sendReservationApprovedEmail(targetEmail, detailsMock)
    },
    {
      name: "sendReservationRejectedEmail",
      fn: () => sendReservationRejectedEmail(targetEmail, detailsMock)
    },
    {
      name: "sendEventConfirmationEmail",
      fn: () => sendEventConfirmationEmail(targetEmail, detailsMock)
    },
    {
      name: "sendReservationReminderEmail",
      fn: () => sendReservationReminderEmail(targetEmail, detailsMock)
    },
    {
      name: "sendReservationCancelledEmail",
      fn: () => sendReservationCancelledEmail(targetEmail, detailsMock)
    },
    {
      name: "sendOwnerNewReservationAlertEmail",
      fn: () => sendOwnerNewReservationAlertEmail(targetEmail, detailsMock)
    },
    {
      name: "sendOwnerPendingApprovalAlertEmail",
      fn: () => sendOwnerPendingApprovalAlertEmail(targetEmail, 5)
    },
    {
      name: "sendOwnerDailySummaryEmail",
      fn: () => sendOwnerDailySummaryEmail(targetEmail, {
        date: "2026-06-21",
        totalBookings: 12,
        approvedCount: 8,
        rejectedCount: 2,
        capacityUtilization: 78.4,
        peakHour: "20:00",
        revenueEstimate: 14500.00
      })
    }
  ];

  for (const template of templates) {
    console.log(`\n==========================================`);
    console.log(`Sending: ${template.name}...`);
    console.log(`==========================================`);
    
    // Get last log before calling
    const lastLogBefore = await prisma.emailLog.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    try {
      // Small pause to prevent hitting Resend API rate limits
      await new Promise(resolve => setTimeout(resolve, 800));
      
      await template.fn();
      
      // Fetch the log that was just created
      const lastLogAfter = await prisma.emailLog.findFirst({
        orderBy: { createdAt: 'desc' }
      });

      if (lastLogAfter && (!lastLogBefore || lastLogAfter.id !== lastLogBefore.id)) {
        const success = lastLogAfter.status === 'SENT';
        results[template.name] = {
          success,
          status: lastLogAfter.status,
          error: lastLogAfter.errorMessage || undefined
        };
        console.log(`DB Log ID: ${lastLogAfter.id}`);
        console.log(`Status in DB: ${lastLogAfter.status}`);
        if (lastLogAfter.errorMessage) {
          console.log(`Error in DB: ${lastLogAfter.errorMessage}`);
        }
      } else {
        results[template.name] = {
          success: false,
          status: 'NO_LOG_CREATED',
          error: 'No new EmailLog row was found in the database.'
        };
        console.log(`❌ Error: No new EmailLog row created.`);
      }
    } catch (error: any) {
      results[template.name] = {
        success: false,
        status: 'EXCEPTION',
        error: error.message || String(error)
      };
      console.error(`💥 Exception: ${error.message}`);
    }
  }

  console.log("\n==========================================");
  console.log("📊 SUMMARY OF E2E TEST RUN:");
  console.log("==========================================");
  let allPass = true;
  for (const [name, res] of Object.entries(results)) {
    const icon = res.success ? "🟢" : "🔴";
    console.log(`${icon} ${name} -> Status: ${res.status}${res.error ? ' | Error: ' + res.error : ''}`);
    if (!res.success) allPass = false;
  }
  console.log("==========================================");

  process.exit(allPass ? 0 : 1);
}

runAllEmailTests().catch(err => {
  console.error("Test runner crashed:", err);
  process.exit(1);
});
