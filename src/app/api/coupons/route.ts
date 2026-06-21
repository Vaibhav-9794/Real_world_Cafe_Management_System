import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code')?.trim().toUpperCase();
    const spendStr = searchParams.get('spend') || '0';
    const spend = parseFloat(spendStr);

    if (!code) {
      return NextResponse.json({ success: false, message: 'Coupon code is required' }, { status: 400 });
    }

    const coupon = await prisma.coupon.findUnique({
      where: { code }
    });

    if (!coupon) {
      return NextResponse.json({ success: false, message: 'Invalid coupon code.' }, { status: 404 });
    }

    const today = new Date().toISOString().split('T')[0];

    if (today < coupon.startDate) {
      return NextResponse.json({ success: false, message: 'This coupon is not active yet.' }, { status: 400 });
    }

    if (today > coupon.endDate) {
      return NextResponse.json({ success: false, message: 'This coupon has expired.' }, { status: 400 });
    }

    if (coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json({ success: false, message: 'This coupon has reached its maximum usage limit.' }, { status: 400 });
    }

    if (spend < coupon.minSpend) {
      return NextResponse.json({
        success: false,
        message: `Minimum order value to use this coupon is ₹${coupon.minSpend.toFixed(2)}.`
      }, { status: 400 });
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.type === 'PERCENTAGE' || coupon.type === 'WEEKEND' || coupon.type === 'FESTIVAL') {
      discountAmount = (spend * coupon.value) / 100;
    } else if (coupon.type === 'FIXED') {
      discountAmount = coupon.value;
    } else if (coupon.type === 'BOGO') {
      // Buy One Get One - simulated as 50% discount on total for simplified booking flow
      discountAmount = spend * 0.5;
    }

    // Cap discount at spend
    if (discountAmount > spend) {
      discountAmount = spend;
    }

    return NextResponse.json({
      success: true,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        discountAmount
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { code, type, value, minSpend, startDate, endDate, usageLimit } = await request.json();

    if (!code || !type || value === undefined || !startDate || !endDate) {
      return NextResponse.json({ success: false, message: 'Missing required parameters.' }, { status: 400 });
    }

    const uppercaseCode = code.toUpperCase().trim();

    const existing = await prisma.coupon.findUnique({
      where: { code: uppercaseCode }
    });

    if (existing) {
      return NextResponse.json({ success: false, message: 'A coupon with this code already exists.' }, { status: 409 });
    }

    const newCoupon = await prisma.coupon.create({
      data: {
        code: uppercaseCode,
        type, // PERCENTAGE, FIXED, BOGO, WEEKEND, FESTIVAL
        value: parseFloat(value),
        minSpend: parseFloat(minSpend || 0),
        startDate,
        endDate,
        usageLimit: parseInt(usageLimit || 100)
      }
    });

    return NextResponse.json({ success: true, coupon: newCoupon });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
