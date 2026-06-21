import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { getServerSession } from '../../../lib/auth-server';
import { logAuditEvent } from '../../../lib/audit';

export async function GET(request: Request) {
  try {
    const blocked = await prisma.blockedDate.findMany({
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }]
    });
    return NextResponse.json({ success: true, blockedDates: blocked });
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

    const { date, startTime, endTime, reason, type } = await request.json();
    if (!date) {
      return NextResponse.json({ success: false, message: 'Date is required.' }, { status: 400 });
    }

    // Check if block already exists
    const existing = await prisma.blockedDate.findFirst({
      where: {
        date,
        startTime: startTime || null,
        endTime: endTime || null
      }
    });

    if (existing) {
      return NextResponse.json({ success: false, message: 'This date/time block is already configured.' }, { status: 400 });
    }

    const blocked = await prisma.blockedDate.create({
      data: {
        date,
        startTime: startTime || null,
        endTime: endTime || null,
        reason: reason || null,
        type: type || 'HOLIDAY'
      }
    });

    await logAuditEvent(session.email, session.role, 'BLOCKED_DATE_CREATE', `Blocked date ${date} (Time: ${startTime || 'Full Day'} - ${endTime || 'Full Day'})`);

    return NextResponse.json({ success: true, blockedDate: blocked });
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, message: 'Blocked date ID is required.' }, { status: 400 });
    }

    const blocked = await prisma.blockedDate.findUnique({ where: { id } });
    if (!blocked) {
      return NextResponse.json({ success: false, message: 'Blocked date not found.' }, { status: 404 });
    }

    await prisma.blockedDate.delete({ where: { id } });

    await logAuditEvent(session.email, session.role, 'BLOCKED_DATE_DELETE', `Unblocked date ${blocked.date} (ID: ${id})`);

    return NextResponse.json({ success: true, message: 'Date unblocked successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
