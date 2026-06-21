import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/email-retry
 * Cron job to retry FAILED email log entries.
 * Must be called with the secret header: x-cron-secret: <CRON_SECRET>
 * Retries emails that have failed and have fewer than 5 attempts.
 */
export async function GET(request: Request) {
  // Validate cron secret for security
  if (CRON_SECRET) {
    const authHeader = request.headers.get('x-cron-secret');
    if (authHeader !== CRON_SECRET) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }
  }

  try {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, message: 'Resend API key not configured.' }, { status: 400 });
    }

    // Find failed emails with fewer than 5 attempts
    const failedEmails = await prisma.emailLog.findMany({
      where: {
        status: 'FAILED',
        attempts: { lt: 5 }
      },
      orderBy: { createdAt: 'asc' },
      take: 20 // Process max 20 at a time
    });

    if (failedEmails.length === 0) {
      return NextResponse.json({ success: true, message: 'No failed emails to retry.', processed: 0 });
    }

    let successCount = 0;
    let failCount = 0;

    for (const log of failedEmails) {
      // Mark as RETRYING
      await prisma.emailLog.update({
        where: { id: log.id },
        data: { status: 'RETRYING', attempts: log.attempts + 1 }
      });

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            from: `BOHO Cafe <notifications@resend.dev>`,
            to: [log.to],
            subject: log.subject,
            html: log.body
          })
        });

        if (res.ok) {
          await prisma.emailLog.update({
            where: { id: log.id },
            data: { status: 'SENT', errorMessage: null }
          });
          successCount++;
        } else {
          const errorData = await res.json();
          await prisma.emailLog.update({
            where: { id: log.id },
            data: { status: 'FAILED', errorMessage: JSON.stringify(errorData) }
          });
          failCount++;
        }
      } catch (err: any) {
        await prisma.emailLog.update({
          where: { id: log.id },
          data: { status: 'FAILED', errorMessage: err.message || String(err) }
        });
        failCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Email retry complete. ${successCount} sent, ${failCount} still failing.`,
      processed: failedEmails.length,
      successCount,
      failCount
    });
  } catch (error: any) {
    console.error('Email retry cron error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
