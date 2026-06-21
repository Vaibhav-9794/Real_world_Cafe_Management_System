import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth-server';
import { logAuditEvent } from '@/lib/audit';
import bcrypt from 'bcryptjs';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || (session.role !== 'OWNER' && session.role !== 'MANAGER')) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 403 });
    }

    const staff = await prisma.staff.findMany({
      include: { branch: true },
      orderBy: { createdAt: 'desc' }
    });

    // Remove PIN hashes from response for security
    const sanitizedStaff = staff.map(({ pin, ...s }: { pin: string; [key: string]: any }) => s);

    return NextResponse.json({ success: true, staff: sanitizedStaff });
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

    const { name, email, role, pin, branchId } = await request.json();
    if (!name || !email || !role || !pin) {
      return NextResponse.json({ success: false, message: 'Missing required staff fields.' }, { status: 400 });
    }

    // Check if staff email already exists
    const existing = await prisma.staff.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ success: false, message: 'Staff email already registered.' }, { status: 400 });
    }

    const hashedPin = bcrypt.hashSync(pin.toString(), 10);

    const staff = await prisma.staff.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        role,
        pin: hashedPin,
        status: 'ACTIVE',
        branchId: branchId || null
      }
    });

    await logAuditEvent(session.email, session.role, 'STAFF_CREATE', `Created staff profile for ${name} (${email}) with role ${role}`);

    return NextResponse.json({ success: true, staff: { id: staff.id, name: staff.name, email: staff.email, role: staff.role } });
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

    const { id, name, email, role, status, pin, branchId } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, message: 'Staff ID is required.' }, { status: 400 });
    }

    const data: any = {};
    if (name) data.name = name;
    if (email) data.email = email.toLowerCase().trim();
    if (role) data.role = role;
    if (status) data.status = status;
    if (branchId !== undefined) data.branchId = branchId || null;
    if (pin) {
      data.pin = bcrypt.hashSync(pin.toString(), 10);
    }

    const updated = await prisma.staff.update({
      where: { id },
      data
    });

    let actionMsg = `Updated staff profile attributes for ${updated.name}`;
    if (status) actionMsg = `Changed staff ${updated.name} status to ${status}`;
    if (pin) actionMsg = `Reset authentication PIN code for staff ${updated.name}`;

    await logAuditEvent(session.email, session.role, status ? 'STAFF_STATUS_UPDATE' : 'STAFF_UPDATE', actionMsg);

    return NextResponse.json({ success: true, staff: { id: updated.id, name: updated.name, email: updated.email, role: updated.role, status: updated.status } });
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
      return NextResponse.json({ success: false, message: 'Staff ID is required.' }, { status: 400 });
    }

    const staff = await prisma.staff.findUnique({ where: { id } });
    if (!staff) {
      return NextResponse.json({ success: false, message: 'Staff member not found.' }, { status: 404 });
    }

    await prisma.staff.delete({ where: { id } });

    await logAuditEvent(session.email, session.role, 'STAFF_DELETE', `Deleted staff profile for ${staff.name} (${staff.email})`);

    return NextResponse.json({ success: true, message: 'Staff deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
