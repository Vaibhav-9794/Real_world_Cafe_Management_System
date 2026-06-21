import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth-server';
import { logAuditEvent } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'OWNER') {
      return new Response('Unauthorized. Owner privileges required.', { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'reservations';

    let csvContent = '';
    let filename = '';

    if (type === 'reservations') {
      filename = 'reservations_export.csv';
      const items = await prisma.reservation.findMany({
        orderBy: { createdAt: 'desc' }
      });
      csvContent = 'ID,Name,Email,Phone,Type,Guests,Date,Time,Status,PaymentStatus,PaymentAmount,CreatedAt\n';
      items.forEach((r: any) => {
        const row = [
          r.id,
          `"${r.name.replace(/"/g, '""')}"`,
          r.email,
          r.phone,
          r.type,
          r.guests,
          r.date,
          r.time,
          r.status,
          r.paymentStatus,
          r.paymentAmount,
          r.createdAt.toISOString()
        ].join(',');
        csvContent += row + '\n';
      });
    } else if (type === 'customers') {
      filename = 'customers_export.csv';
      const items = await prisma.customer.findMany({
        orderBy: { totalSpent: 'desc' }
      });
      csvContent = 'ID,Name,Email,Phone,VisitCount,TotalSpent,Points,VIPStatus,MembershipTier,Birthday,Dietary,CreatedAt\n';
      items.forEach((c: any) => {
        const row = [
          c.id,
          `"${c.name.replace(/"/g, '""')}"`,
          c.email,
          c.phone,
          c.visitCount,
          c.totalSpent,
          c.points,
          c.vipStatus,
          c.membershipTier,
          c.birthday || '',
          `"${(c.dietaryRestrictions || '').replace(/"/g, '""')}"`,
          c.createdAt.toISOString()
        ].join(',');
        csvContent += row + '\n';
      });
    } else if (type === 'payments') {
      filename = 'payments_export.csv';
      const items = await prisma.payment.findMany({
        orderBy: { createdAt: 'desc' },
        include: { reservation: true }
      });
      csvContent = 'PaymentID,Amount,Status,Gateway,TransactionID,ReservationID,CustomerName,CustomerEmail,CreatedAt\n';
      items.forEach((p: any) => {
        const row = [
          p.id,
          p.amount,
          p.status,
          p.gateway,
          p.transactionId || '',
          p.reservationId || '',
          p.reservation ? `"${p.reservation.name.replace(/"/g, '""')}"` : '',
          p.reservation ? p.reservation.email : '',
          p.createdAt.toISOString()
        ].join(',');
        csvContent += row + '\n';
      });
    } else if (type === 'audit') {
      filename = 'audit_logs_export.csv';
      const items = await prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' }
      });
      csvContent = 'ID,ActorEmail,ActorRole,Action,Details,TargetID,CreatedAt\n';
      items.forEach((a: any) => {
        const row = [
          a.id,
          a.actorEmail,
          a.actorRole,
          a.action,
          `"${a.details.replace(/"/g, '""')}"`,
          a.targetId || '',
          a.createdAt.toISOString()
        ].join(',');
        csvContent += row + '\n';
      });
    } else {
      return new Response('Invalid export type requested.', { status: 400 });
    }

    await logAuditEvent(session.email, session.role, 'DATA_EXPORT', `Exported CSV dataset for: ${type}`);

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename=${filename}`,
      }
    });
  } catch (error: any) {
    return new Response(`Failed to export data: ${error.message}`, { status: 500 });
  }
}
