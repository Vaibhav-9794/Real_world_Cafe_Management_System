import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export async function POST(request: Request) {
  try {
    const { pin } = await request.json();

    if (!pin) {
      return NextResponse.json({ success: false, message: 'PIN code is required' }, { status: 400 });
    }

    const staff = await prisma.staff.findFirst({
      where: { pin },
      include: { branch: true }
    });

    if (!staff) {
      return NextResponse.json({ success: false, message: 'Access denied. Invalid PIN.' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: staff.id,
        name: staff.name,
        email: staff.email,
        role: staff.role, // OWNER, MANAGER, STAFF
        branchId: staff.branchId,
        branchName: staff.branch?.name || 'All Branches'
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
