import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { getServerSession } from '../../../lib/auth-server';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'OWNER') {
      return NextResponse.json({ success: false, message: 'Unauthorized. Owner privileges required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const period = searchParams.get('period') || 'monthly'; // daily, weekly, monthly

    // Date range calculations
    const now = new Date();
    let startDate: string;

    if (period === 'daily') {
      startDate = now.toISOString().split('T')[0];
    } else if (period === 'weekly') {
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);
      startDate = weekAgo.toISOString().split('T')[0];
    } else {
      const monthAgo = new Date(now);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      startDate = monthAgo.toISOString().split('T')[0];
    }

    const where: any = {
      reservation_date: { gte: startDate }
    };
    if (branchId) where.branchId = branchId;

    // Fetch reservations in the period
    const reservations = await prisma.reservation.findMany({
      where,
      include: { tables: true, branch: true }
    });

    const totalTables = await prisma.table.count({
      where: branchId ? { branchId } : {}
    });

    // Metric Calculations
    const totalReservations = reservations.length;
    const approvedCount = reservations.filter(r => ['CONFIRMED', 'ARRIVED', 'COMPLETED'].includes(r.booking_status)).length;
    const pendingCount = reservations.filter(r => r.booking_status === 'PENDING').length;
    const rejectedCount = reservations.filter(r => r.booking_status === 'REJECTED').length;
    const cancelledCount = reservations.filter(r => r.booking_status === 'CANCELLED').length;
    const completedCount = reservations.filter(r => r.booking_status === 'COMPLETED').length;

    // Rates
    const approvalRate = totalReservations > 0 ? ((approvedCount / totalReservations) * 100).toFixed(1) : '0.0';
    const rejectionRate = totalReservations > 0 ? ((rejectedCount / totalReservations) * 100).toFixed(1) : '0.0';

    // Revenue calculation
    const totalRevenue = reservations.reduce((sum, r) => sum + r.paymentAmount, 0);

    // Event revenue breakdown
    const eventRevenue: Record<string, { count: number; revenue: number }> = {};
    const eventTypes = ['TABLE', 'BIRTHDAY', 'ANNIVERSARY', 'CORPORATE', 'FULL_CAFE'];
    for (const et of eventTypes) {
      const filtered = reservations.filter(r => r.type === et);
      eventRevenue[et] = {
        count: filtered.length,
        revenue: filtered.reduce((s, r) => s + r.paymentAmount, 0)
      };
    }

    // Popular time slots (Peak hours)
    const timeSlotCounts: Record<string, number> = {};
    reservations.forEach(r => {
      timeSlotCounts[r.start_time] = (timeSlotCounts[r.start_time] || 0) + 1;
    });
    const popularTimes = Object.entries(timeSlotCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([time, count]) => ({ time, count }));

    // Peak Days calculation
    const weekdayCounts: Record<string, number> = {
      'Monday': 0, 'Tuesday': 0, 'Wednesday': 0, 'Thursday': 0,
      'Friday': 0, 'Saturday': 0, 'Sunday': 0
    };
    reservations.forEach(r => {
      const dateObj = new Date(r.reservation_date);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'long' });
      if (weekdayCounts[dayName] !== undefined) {
        weekdayCounts[dayName]++;
      }
    });
    const peakDays = Object.entries(weekdayCounts).map(([day, count]) => ({ day, count }));

    // Popular tables
    const tableUsage: Record<string, { number: string; count: number }> = {};
    reservations.forEach(r => {
      r.tables.forEach(t => {
        if (!tableUsage[t.id]) tableUsage[t.id] = { number: t.number, count: 0 };
        tableUsage[t.id].count++;
      });
    });
    const popularTables = Object.values(tableUsage)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Average table utilization rate
    let tableUtilization = 0;
    if (totalTables > 0 && totalReservations > 0) {
      const totalAllocatedTables = reservations.reduce((sum, r) => sum + r.tables.length, 0);
      // Table utilization over the capacity of slots
      tableUtilization = (totalAllocatedTables / (totalTables * Math.max(1, totalReservations))) * 100;
    }

    // Top customers
    const customers = await prisma.customer.findMany({
      orderBy: { totalSpent: 'desc' },
      take: 5
    });

    // Daily revenue chart data (last 7 days)
    const dailyRevenue: { date: string; revenue: number; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayRes = reservations.filter(r => r.reservation_date === dateStr);
      dailyRevenue.push({
        date: dateStr,
        revenue: dayRes.reduce((s, r) => s + r.paymentAmount, 0),
        count: dayRes.length
      });
    }

    // Monthly trends (last 6 months)
    const monthlyTrends: { month: string; count: number; revenue: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const monthName = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      const startOfMonth = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];

      const monthRes = await prisma.reservation.findMany({
        where: {
          branchId: branchId || undefined,
          reservation_date: { gte: startOfMonth, lte: endOfMonth },
          booking_status: { in: ['CONFIRMED', 'ARRIVED', 'COMPLETED'] }
        }
      });

      monthlyTrends.push({
        month: monthName,
        count: monthRes.length,
        revenue: monthRes.reduce((s, r) => s + r.paymentAmount, 0)
      });
    }

    // Coupon analytics
    const coupons = await prisma.coupon.findMany();
    const couponAnalytics = coupons.map(c => ({
      code: c.code,
      type: c.type,
      value: c.value,
      usageCount: c.usageCount,
      usageLimit: c.usageLimit,
      utilizationRate: c.usageLimit > 0 ? ((c.usageCount / c.usageLimit) * 100).toFixed(1) : '0'
    }));

    // Waitlist stats
    const waitlistCount = await prisma.waitlist.count({
      where: { status: 'WAITING' }
    });

    // Lead pipeline
    const leadStats = {
      new: await prisma.lead.count({ where: { status: 'NEW' } }),
      contacted: await prisma.lead.count({ where: { status: 'CONTACTED' } }),
      reserved: await prisma.lead.count({ where: { status: 'RESERVED' } }),
      lost: await prisma.lead.count({ where: { status: 'LOST' } })
    };

    return NextResponse.json({
      success: true,
      analytics: {
        period,
        totalRevenue,
        totalReservations,
        approvedCount,
        pendingCount,
        rejectedCount,
        cancelledCount,
        completedCount,
        approvalRate,
        rejectionRate,
        tableUtilization: tableUtilization.toFixed(1),
        peakDays,
        monthlyTrends,
        eventRevenue,
        popularTimes,
        popularTables,
        topCustomers: customers,
        dailyRevenue,
        couponAnalytics,
        waitlistCount,
        leadStats
      }
    });
  } catch (error: any) {
    console.error('Analytics route error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
