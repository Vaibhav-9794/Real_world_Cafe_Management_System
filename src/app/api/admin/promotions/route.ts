import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth-server';
import { logAuditEvent } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'OWNER') {
      return NextResponse.json({ success: false, message: 'Unauthorized. Owner privileges required.' }, { status: 403 });
    }

    const coupons = await prisma.coupon.findMany({
      orderBy: { code: 'asc' }
    });

    return NextResponse.json({ success: true, coupons });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'OWNER') {
      return NextResponse.json({ success: false, message: 'Unauthorized. Owner privileges required.' }, { status: 403 });
    }

    const { code, type, value, minSpend, startDate, endDate, usageLimit } = await request.json();
    if (!code || !type || value === undefined || !startDate || !endDate) {
      return NextResponse.json({ success: false, message: 'Missing required coupon fields.' }, { status: 400 });
    }

    // Check if exists
    const existing = await prisma.coupon.findUnique({ where: { code } });
    if (existing) {
      return NextResponse.json({ success: false, message: 'Coupon code already exists.' }, { status: 400 });
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: code.toUpperCase().trim(),
        type,
        value: parseFloat(value),
        minSpend: parseFloat(minSpend || '0'),
        startDate,
        endDate,
        usageLimit: parseInt(usageLimit || '100'),
        usageCount: 0
      }
    });

    await logAuditEvent(session.email, session.role, 'PROMOTION_CREATE', `Created promotion code ${coupon.code} (${coupon.type}: ${coupon.value})`);

    return NextResponse.json({ success: true, coupon });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'OWNER') {
      return NextResponse.json({ success: false, message: 'Unauthorized. Owner privileges required.' }, { status: 403 });
    }

    const { code, type, value, minSpend, startDate, endDate, usageLimit } = await request.json();
    if (!code) {
      return NextResponse.json({ success: false, message: 'Coupon code is required.' }, { status: 400 });
    }

    const data: any = {};
    if (type) data.type = type;
    if (value !== undefined) data.value = parseFloat(value);
    if (minSpend !== undefined) data.minSpend = parseFloat(minSpend);
    if (startDate) data.startDate = startDate;
    if (endDate) data.endDate = endDate;
    if (usageLimit !== undefined) data.usageLimit = parseInt(usageLimit);

    const updated = await prisma.coupon.update({
      where: { code },
      data
    });

    await logAuditEvent(session.email, session.role, 'PROMOTION_UPDATE', `Updated promotion details for coupon ${code}`);

    return NextResponse.json({ success: true, coupon: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || session.role !== 'OWNER') {
      return NextResponse.json({ success: false, message: 'Unauthorized. Owner privileges required.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    if (!code) {
      return NextResponse.json({ success: false, message: 'Coupon code is required.' }, { status: 400 });
    }

    await prisma.coupon.delete({ where: { code } });

    await logAuditEvent(session.email, session.role, 'PROMOTION_DELETE', `Deleted promotion code ${code}`);

    return NextResponse.json({ success: true, message: 'Coupon deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
