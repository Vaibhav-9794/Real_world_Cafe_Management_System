import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth-server';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || (session.role !== 'OWNER' && session.role !== 'MANAGER')) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Staff privileges required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId') || undefined;

    const reservations = await prisma.reservation.findMany({
      where: branchId ? { branchId } : {},
      include: { tables: true }
    });

    const totalTables = await prisma.table.count({
      where: branchId ? { branchId } : {}
    });

    const total = reservations.length;
    const pending = reservations.filter((r: any) => r.booking_status === 'PENDING').length;
    const confirmed = reservations.filter((r: any) => ['CONFIRMED', 'ARRIVED', 'COMPLETED'].includes(r.booking_status)).length;
    const cancelled = reservations.filter((r: any) => r.booking_status === 'CANCELLED').length;
    const completed = reservations.filter((r: any) => r.booking_status === 'COMPLETED').length;

    const conversionRate = total > 0 
      ? ((confirmed + completed) / total) * 100 
      : 0;

    // Table utilization
    let tableUtilization = 0;
    if (totalTables > 0 && total > 0) {
      const totalAllocatedTables = reservations.reduce((sum: number, r: any) => sum + r.tables.length, 0);
      tableUtilization = (totalAllocatedTables / (totalTables * total)) * 100;
    }

    // Occupancy percentage (today's active tables relative to total tables)
    const today = new Date().toISOString().split('T')[0];
    const todayRes = reservations.filter((r: any) => r.reservation_date === today && ['CONFIRMED', 'ARRIVED'].includes(r.booking_status));
    const occupiedTablesToday = new Set<string>();
    todayRes.forEach((r: any) => r.tables.forEach((t: any) => occupiedTablesToday.add(t.id)));
    const occupancyPercentage = totalTables > 0 
      ? (occupiedTablesToday.size / totalTables) * 100 
      : 0;

    return NextResponse.json({
      success: true,
      metrics: {
        total,
        pending,
        confirmed,
        cancelled,
        conversionRate: parseFloat(conversionRate.toFixed(1)),
        tableUtilization: parseFloat(tableUtilization.toFixed(1)),
        occupancyPercentage: parseFloat(occupancyPercentage.toFixed(1))
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
