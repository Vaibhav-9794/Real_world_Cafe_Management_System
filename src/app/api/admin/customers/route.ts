import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth-server';
import { logAuditEvent } from '@/lib/audit';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || (session.role !== 'OWNER' && session.role !== 'MANAGER')) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const tier = searchParams.get('tier') || '';
    const vip = searchParams.get('vip') || '';
    
    // Pagination parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '50'));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } }
      ];
    }
    if (tier) {
      where.membershipTier = tier;
    }
    if (vip === 'true') {
      where.vipStatus = true;
    } else if (vip === 'false') {
      where.vipStatus = false;
    }

    const totalCount = await prisma.customer.count({ where });

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { totalSpent: 'desc' },
      skip,
      take: limit
    });

    return NextResponse.json({ 
      success: true, 
      customers,
      pagination: {
        total: totalCount,
        page,
        limit,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || (session.role !== 'OWNER' && session.role !== 'MANAGER')) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 403 });
    }

    const { name, email, phone, vipStatus, membershipTier, birthday, notes, preferredTable, dietaryRestrictions } = await request.json();
    if (!name || !email || !phone) {
      return NextResponse.json({ success: false, message: 'Missing name, email or phone.' }, { status: 400 });
    }

    const existing = await prisma.customer.findFirst({
      where: { OR: [{ email }, { phone }] }
    });
    if (existing) {
      return NextResponse.json({ success: false, message: 'Customer with this email or phone already exists.' }, { status: 400 });
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        vipStatus: vipStatus || false,
        membershipTier: membershipTier || 'Bronze',
        birthday: birthday || null,
        notes: notes || null,
        preferredTable: preferredTable ? parseInt(preferredTable) : null,
        dietaryRestrictions: dietaryRestrictions || null,
        referralCode: Math.random().toString(36).substring(2, 8).toUpperCase()
      }
    });

    await logAuditEvent(session.email, session.role, 'CUSTOMER_CREATE', `Manually created customer record for ${name} (${email})`);

    return NextResponse.json({ success: true, customer });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || (session.role !== 'OWNER' && session.role !== 'MANAGER')) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 403 });
    }

    const { id, vipStatus, membershipTier, notes, points, preferredTable, dietaryRestrictions } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, message: 'Customer ID is required.' }, { status: 400 });
    }

    const data: any = {};
    if (vipStatus !== undefined) data.vipStatus = vipStatus;
    if (membershipTier) data.membershipTier = membershipTier;
    if (notes !== undefined) data.notes = notes;
    if (points !== undefined) data.points = parseInt(points);
    if (preferredTable !== undefined) data.preferredTable = preferredTable ? parseInt(preferredTable) : null;
    if (dietaryRestrictions !== undefined) data.dietaryRestrictions = dietaryRestrictions;

    const updated = await prisma.customer.update({
      where: { id },
      data
    });

    await logAuditEvent(session.email, session.role, 'CUSTOMER_UPDATE', `Updated CRM record and loyalty details for customer ${updated.name}`);

    return NextResponse.json({ success: true, customer: updated });
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
      return NextResponse.json({ success: false, message: 'Customer ID is required.' }, { status: 400 });
    }

    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) {
      return NextResponse.json({ success: false, message: 'Customer not found.' }, { status: 404 });
    }

    await prisma.customer.delete({ where: { id } });

    await logAuditEvent(session.email, session.role, 'CUSTOMER_DELETE', `Deleted customer record for ${customer.name} (${customer.email})`);

    return NextResponse.json({ success: true, message: 'Customer deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
