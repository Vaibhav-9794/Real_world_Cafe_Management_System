import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth-server';

/**
 * GET /api/admin/emails
 * Returns paginated email delivery log records for Owner dashboard.
 * Query params: page (default 1), limit (default 50), status (filter by SENT|FAILED|PENDING|RETRYING)
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'OWNER') {
      return NextResponse.json({ success: false, message: 'Unauthorized. Owner access required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const statusFilter = searchParams.get('status');

    const skip = (page - 1) * limit;

    const where: any = {};
    if (statusFilter && ['PENDING', 'SENT', 'FAILED', 'RETRYING'].includes(statusFilter)) {
      where.status = statusFilter;
    }

    const [total, logs] = await Promise.all([
      prisma.emailLog.count({ where }),
      prisma.emailLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          to: true,
          subject: true,
          status: true,
          attempts: true,
          errorMessage: true,
          createdAt: true,
          updatedAt: true
        }
      })
    ]);

    // Compute stats
    const [sentCount, failedCount, pendingCount, retryingCount] = await Promise.all([
      prisma.emailLog.count({ where: { status: 'SENT' } }),
      prisma.emailLog.count({ where: { status: 'FAILED' } }),
      prisma.emailLog.count({ where: { status: 'PENDING' } }),
      prisma.emailLog.count({ where: { status: 'RETRYING' } })
    ]);

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: {
        sent: sentCount,
        failed: failedCount,
        pending: pendingCount,
        retrying: retryingCount,
        total: sentCount + failedCount + pendingCount + retryingCount
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
