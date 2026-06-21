import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth-server';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'OWNER') {
      return NextResponse.json({ success: false, message: 'Unauthorized. Owner privileges required.' }, { status: 403 });
    }

    const customers = await prisma.customer.findMany();

    const total = customers.length;
    const returnCustomers = customers.filter((c: any) => c.visitCount > 1).length;
    const returnRate = total > 0 ? (returnCustomers / total) * 100 : 0;

    const totalSpent = customers.reduce((sum: number, c: any) => sum + c.totalSpent, 0);
    const averageSpent = total > 0 ? totalSpent / total : 0;

    const vipCount = customers.filter((c: any) => c.vipStatus).length;

    const tiers = {
      Bronze: customers.filter((c: any) => c.membershipTier === 'Bronze').length,
      Silver: customers.filter((c: any) => c.membershipTier === 'Silver').length,
      Gold: customers.filter((c: any) => c.membershipTier === 'Gold').length,
      Platinum: customers.filter((c: any) => c.membershipTier === 'Platinum').length
    };

    // Referrals count
    const referredCount = customers.filter((c: any) => c.referredBy !== null).length;

    return NextResponse.json({
      success: true,
      metrics: {
        total,
        returnRate: parseFloat(returnRate.toFixed(1)),
        averageSpent: parseFloat(averageSpent.toFixed(2)),
        vipCount,
        tiers,
        referredCount
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
