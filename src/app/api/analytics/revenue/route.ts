import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth-server';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'OWNER') {
      return NextResponse.json({ success: false, message: 'Unauthorized. Owner privileges required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId') || undefined;

    // Retrieve PAID reservations
    const reservations = await prisma.reservation.findMany({
      where: {
        paymentStatus: 'PAID',
        branchId
      }
    });

    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const oneWeek = 7 * oneDay;
    const oneMonth = 30 * oneDay;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date(now - oneWeek);
    const monthStart = new Date(now - oneMonth);

    // Sum totals
    const todayRevenue = reservations
      .filter((r: any) => r.createdAt >= todayStart)
      .reduce((sum: number, r: any) => sum + r.paymentAmount, 0);

    const weeklyRevenue = reservations
      .filter((r: any) => r.createdAt >= weekStart)
      .reduce((sum: number, r: any) => sum + r.paymentAmount, 0);

    const monthlyRevenue = reservations
      .filter((r: any) => r.createdAt >= monthStart)
      .reduce((sum: number, r: any) => sum + r.paymentAmount, 0);

    // Compare with previous month for growth
    const prevMonthStart = new Date(now - 2 * oneMonth);
    const prevMonthRevenue = reservations
      .filter((r: any) => r.createdAt >= prevMonthStart && r.createdAt < monthStart)
      .reduce((sum: number, r: any) => sum + r.paymentAmount, 0);

    const growthRate = prevMonthRevenue > 0 
      ? ((monthlyRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 
      : 0;

    // Daily chart data
    const dailyChart: { date: string; amount: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * oneDay);
      const dateStr = d.toISOString().split('T')[0];
      const startOfDay = new Date(d);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(d);
      endOfDay.setHours(23, 59, 59, 999);

      const dayAmount = reservations
        .filter((r: any) => r.createdAt >= startOfDay && r.createdAt <= endOfDay)
        .reduce((sum: number, r: any) => sum + r.paymentAmount, 0);

      dailyChart.push({ date: dateStr, amount: dayAmount });
    }

    return NextResponse.json({
      success: true,
      metrics: {
        todayRevenue,
        weeklyRevenue,
        monthlyRevenue,
        growthRate: parseFloat(growthRate.toFixed(1)),
        dailyChart
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
