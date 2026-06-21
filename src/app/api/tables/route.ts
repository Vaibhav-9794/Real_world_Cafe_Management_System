import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { getServerSession } from '../../../lib/auth-server';
import { logAuditEvent } from '../../../lib/audit';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    const tables = await prisma.table.findMany({
      where: branchId ? { branchId } : {},
      include: {
        reservations: {
          where: {
            booking_status: { in: ['CONFIRMED', 'ARRIVED', 'PENDING'] }
          }
        }
      },
      orderBy: { number: 'asc' }
    });

    return NextResponse.json({ success: true, tables });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || (session.role !== 'OWNER' && session.role !== 'MANAGER')) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Staff privileges required.' }, { status: 403 });
    }

    const { number, capacity, branchId, x, y } = await request.json();
    if (!number || !capacity || !branchId) {
      return NextResponse.json({ success: false, message: 'Table number, capacity, and branch ID are required.' }, { status: 400 });
    }

    // Check if table number already exists for this branch
    const existingTable = await prisma.table.findFirst({
      where: { branchId, number: number.toString() }
    });
    if (existingTable) {
      return NextResponse.json({ success: false, message: `Table number ${number} already exists for this branch.` }, { status: 400 });
    }

    const table = await prisma.table.create({
      data: {
        number: number.toString(),
        capacity: parseInt(capacity),
        status: 'AVAILABLE',
        x: x ? parseFloat(x) : 0,
        y: y ? parseFloat(y) : 0,
        branchId
      }
    });

    await logAuditEvent(session.email, session.role, 'TABLE_CREATE', `Created table ${number} at branch ${branchId}`);

    return NextResponse.json({ success: true, table });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || (session.role !== 'OWNER' && session.role !== 'MANAGER')) {
      return NextResponse.json({ success: false, message: 'Unauthorized. Staff privileges required.' }, { status: 403 });
    }

    const { id, status, x, y, capacity, number } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, message: 'Table ID is required.' }, { status: 400 });
    }

    const data: any = {};
    if (status) data.status = status;
    if (x !== undefined) data.x = parseFloat(x);
    if (y !== undefined) data.y = parseFloat(y);
    if (capacity !== undefined) data.capacity = parseInt(capacity);
    if (number !== undefined) data.number = number.toString();

    const table = await prisma.table.update({
      where: { id },
      data
    });

    await logAuditEvent(session.email, session.role, 'TABLE_UPDATE', `Updated table ${table.number} attributes`);

    return NextResponse.json({ success: true, table });
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
      return NextResponse.json({ success: false, message: 'Table ID is required.' }, { status: 400 });
    }

    const table = await prisma.table.findUnique({ where: { id } });
    if (!table) {
      return NextResponse.json({ success: false, message: 'Table not found.' }, { status: 404 });
    }

    await prisma.table.delete({ where: { id } });

    await logAuditEvent(session.email, session.role, 'TABLE_DELETE', `Deleted table ${table.number} from branch ${table.branchId}`);

    return NextResponse.json({ success: true, message: 'Table deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
