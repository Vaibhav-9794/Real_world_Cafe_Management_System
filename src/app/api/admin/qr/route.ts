import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth-server';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || (session.role !== 'OWNER' && session.role !== 'MANAGER')) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId') || undefined;

    // Fetch scan log count
    const scanLogs = await prisma.qRScanLog.findMany({
      where: branchId ? { branchId } : {},
      orderBy: { scannedAt: 'desc' }
    });

    // Aggregate scans by table
    const tableCounts: Record<string, number> = {};
    const branchCounts: Record<string, number> = {};

    scanLogs.forEach((log: any) => {
      const tableKey = `Table ${log.tableNumber}`;
      tableCounts[tableKey] = (tableCounts[tableKey] || 0) + 1;
      branchCounts[log.branchId] = (branchCounts[log.branchId] || 0) + 1;
    });

    const topTables = Object.entries(tableCounts)
      .map(([table, count]) => ({ table, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const scansByBranch = Object.entries(branchCounts).map(([branch, count]) => ({ branch, count }));

    return NextResponse.json({
      success: true,
      totalScans: scanLogs.length,
      recentScans: scanLogs.slice(0, 10),
      topTables,
      scansByBranch
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { branchId, tableNumber } = await request.json();
    if (!branchId || !tableNumber) {
      return NextResponse.json({ success: false, message: 'Missing branchId or tableNumber.' }, { status: 400 });
    }

    const scan = await prisma.qRScanLog.create({
      data: {
        branchId,
        tableNumber: tableNumber.toString()
      }
    });

    return NextResponse.json({ success: true, scan });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
