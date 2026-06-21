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

    const items = await prisma.inventoryItem.findMany({
      orderBy: { name: 'asc' }
    });

    const lowStockItems = items.filter((item: any) => item.quantity <= item.minThreshold);

    return NextResponse.json({
      success: true,
      items,
      lowStockCount: lowStockItems.length,
      lowStockItems
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

    const { name, category, quantity, unit, minThreshold } = await request.json();
    if (!name || !category || quantity === undefined || !unit) {
      return NextResponse.json({ success: false, message: 'Missing required inventory fields.' }, { status: 400 });
    }

    const existing = await prisma.inventoryItem.findUnique({ where: { name } });
    if (existing) {
      return NextResponse.json({ success: false, message: 'Inventory item with this name already exists.' }, { status: 400 });
    }

    const item = await prisma.inventoryItem.create({
      data: {
        name,
        category,
        quantity: parseFloat(quantity),
        unit,
        minThreshold: parseFloat(minThreshold || '5.0'),
        updatedAt: new Date()
      }
    });

    await logAuditEvent(session.email, session.role, 'INVENTORY_CREATE', `Added inventory item ${name} (${quantity} ${unit})`);

    return NextResponse.json({ success: true, item });
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

    const { id, quantity, minThreshold, category, name } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, message: 'Item ID is required.' }, { status: 400 });
    }

    const data: any = {};
    if (name) data.name = name;
    if (category) data.category = category;
    if (quantity !== undefined) data.quantity = parseFloat(quantity);
    if (minThreshold !== undefined) data.minThreshold = parseFloat(minThreshold);
    data.updatedAt = new Date();

    const updated = await prisma.inventoryItem.update({
      where: { id },
      data
    });

    await logAuditEvent(session.email, session.role, 'INVENTORY_UPDATE', `Updated inventory item ${updated.name} (Qty: ${updated.quantity})`);

    return NextResponse.json({ success: true, item: updated });
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
      return NextResponse.json({ success: false, message: 'Inventory ID is required.' }, { status: 400 });
    }

    const item = await prisma.inventoryItem.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ success: false, message: 'Item not found.' }, { status: 404 });
    }

    await prisma.inventoryItem.delete({ where: { id } });

    await logAuditEvent(session.email, session.role, 'INVENTORY_DELETE', `Deleted inventory item ${item.name}`);

    return NextResponse.json({ success: true, message: 'Inventory item deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
