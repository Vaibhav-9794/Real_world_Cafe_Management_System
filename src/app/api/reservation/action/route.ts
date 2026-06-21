import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { verifyActionToken } from '../../../../lib/reservationSecurity';
import { logAuditEvent } from '../../../../lib/audit';
import { sendReservationApprovedEmail, sendReservationRejectedEmail } from '../../../../lib/email/emailTemplates';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action') as 'approve' | 'reject';
  const id = searchParams.get('id');
  const expiresStr = searchParams.get('expires');
  const token = searchParams.get('token');

  const errorHtml = (msg: string) => `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Boho Cafe & Lounge — Authorization Error</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #0d0a08; color: #f5f2eb; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
          .card { background-color: #120f0d; border: 1px solid #251f1a; border-radius: 8px; padding: 40px; text-align: center; max-width: 450px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
          h1 { color: #ef4444; font-size: 22px; margin-top: 0; margin-bottom: 20px; font-weight: 600; letter-spacing: 0.5px; }
          p { color: #d1cbc4; font-size: 15px; line-height: 1.6; margin-bottom: 0; }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Authorization Link Error</h1>
          <p>${msg}</p>
        </div>
      </body>
    </html>
  `;

  if (!action || !id || !expiresStr || !token) {
    return new NextResponse(errorHtml('Invalid quick-action request parameters.'), { headers: { 'Content-Type': 'text/html' } });
  }

  const expires = parseInt(expiresStr);
  const isValid = verifyActionToken(id, action, expires, token);

  if (!isValid) {
    return new NextResponse(errorHtml('This quick-action link has expired or the security signature is invalid.'), { headers: { 'Content-Type': 'text/html' } });
  }

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: { tables: true, branch: true }
    });

    if (!reservation) {
      return new NextResponse(errorHtml('The requested reservation record was not found.'), { headers: { 'Content-Type': 'text/html' } });
    }

    if (reservation.booking_status !== 'PENDING' && reservation.booking_status !== 'HELD') {
      return new NextResponse(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Boho Cafe & Lounge — Action Complete</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #0d0a08; color: #f5f2eb; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
              .card { background-color: #120f0d; border: 1px solid #251f1a; border-radius: 8px; padding: 40px; text-align: center; max-width: 450px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
              h1 { color: #c5a880; font-size: 22px; margin-top: 0; margin-bottom: 20px; font-weight: 600; }
              p { color: #d1cbc4; font-size: 15px; line-height: 1.6; margin-bottom: 0; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Action Already Processed</h1>
              <p>This reservation has already been handled.<br/>Current Status: <strong>${reservation.booking_status}</strong></p>
            </div>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } });
    }

    // Process Action
    if (action === 'approve') {
      // Update reservation
      await prisma.reservation.update({
        where: { id },
        data: {
          booking_status: 'CONFIRMED',
          status: 'APPROVED',
          approval_status: 'APPROVED',
          approved_by: 'Aria Vance (Email Action)',
          approved_at: new Date()
        }
      });

      // Reserve tables
      for (const table of reservation.tables) {
        await prisma.table.update({
          where: { id: table.id },
          data: { status: 'RESERVED' }
        });
      }

      // Notify customer
      await sendReservationApprovedEmail(reservation.email, {
        name: reservation.name,
        id: reservation.id,
        branchName: reservation.branch.name,
        date: reservation.reservation_date,
        time: reservation.start_time,
        guests: reservation.guest_count,
        tables: reservation.tables.map(t => t.number)
      });

      await logAuditEvent('owner@bohocafe.com', 'OWNER', 'RESERVATION_APPROVE', `Approved reservation ${id} via email quick-link`);

      return new NextResponse(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Reservation Approved</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #0d0a08; color: #f5f2eb; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
              .card { background-color: #120f0d; border: 1px solid #251f1a; border-radius: 8px; padding: 40px; text-align: center; max-width: 450px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
              h1 { color: #10b981; font-size: 22px; margin-top: 0; margin-bottom: 20px; font-weight: 600; }
              p { color: #d1cbc4; font-size: 15px; line-height: 1.6; margin-bottom: 0; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Reservation Approved Successfully</h1>
              <p>Reservation for <strong>${reservation.name}</strong> (${reservation.guest_count} guests) on ${reservation.reservation_date} at ${reservation.start_time} has been approved.<br/>Customer notified automatically via email.</p>
            </div>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } });

    } else {
      // Reject Action
      await prisma.reservation.update({
        where: { id },
        data: {
          booking_status: 'REJECTED',
          status: 'REJECTED',
          approval_status: 'REJECTED',
          rejection_reason: 'Declined via email quick-link'
        }
      });

      // Free tables
      for (const table of reservation.tables) {
        await prisma.table.update({
          where: { id: table.id },
          data: { status: 'AVAILABLE' }
        });
      }

      // Notify customer
      await sendReservationRejectedEmail(reservation.email, {
        name: reservation.name,
        id: reservation.id,
        branchName: reservation.branch.name,
        date: reservation.reservation_date,
        time: reservation.start_time,
        refundAmount: reservation.paymentAmount
      });

      await logAuditEvent('owner@bohocafe.com', 'OWNER', 'RESERVATION_REJECT', `Rejected reservation ${id} via email quick-link`);

      return new NextResponse(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Reservation Declined</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #0d0a08; color: #f5f2eb; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
              .card { background-color: #120f0d; border: 1px solid #251f1a; border-radius: 8px; padding: 40px; text-align: center; max-width: 450px; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
              h1 { color: #ef4444; font-size: 22px; margin-top: 0; margin-bottom: 20px; font-weight: 600; }
              p { color: #d1cbc4; font-size: 15px; line-height: 1.6; margin-bottom: 0; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>Reservation Declined</h1>
              <p>Reservation for <strong>${reservation.name}</strong> has been rejected.<br/>Advance deposit of ₹${reservation.paymentAmount.toFixed(2)} refunded. Customer notified automatically.</p>
            </div>
          </body>
        </html>
      `, { headers: { 'Content-Type': 'text/html' } });
    }

  } catch (error: any) {
    console.error('Reservation action link execution error:', error);
    return new NextResponse(errorHtml('Server error executing authorization action.'), { headers: { 'Content-Type': 'text/html' } });
  }
}
