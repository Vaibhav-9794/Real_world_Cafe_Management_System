import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export async function GET() {
  try {
    const customers = await prisma.customer.findMany({
      orderBy: { totalSpent: 'desc' }
    });

    return NextResponse.json({ success: true, customers });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, vipStatus, membershipTier, notes, birthday, dietaryRestrictions, preferredTable } = await request.json();

    if (!id) {
      return NextResponse.json({ success: false, message: 'Customer ID is required.' }, { status: 400 });
    }

    const data: any = {};
    if (vipStatus !== undefined) data.vipStatus = vipStatus;
    if (membershipTier) data.membershipTier = membershipTier;
    if (notes !== undefined) data.notes = notes;
    if (birthday !== undefined) data.birthday = birthday;
    if (dietaryRestrictions !== undefined) data.dietaryRestrictions = dietaryRestrictions;
    if (preferredTable !== undefined) data.preferredTable = preferredTable;

    const customer = await prisma.customer.update({
      where: { id },
      data
    });

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
