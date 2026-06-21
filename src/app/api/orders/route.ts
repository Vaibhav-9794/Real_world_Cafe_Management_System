import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { logAuditEvent } from '../../../lib/audit';

// Get orders with optional filters (branchId, reservationId, customerEmail)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const reservationId = searchParams.get('reservationId');
    const customerEmail = searchParams.get('customerEmail');
    const customerPhone = searchParams.get('customerPhone');

    const where: any = {};
    if (branchId) where.branchId = branchId;
    if (reservationId) where.reservationId = reservationId;
    
    // Support customer lookup
    if (customerEmail || customerPhone) {
      const conditions: any[] = [];
      if (customerEmail) conditions.push({ customerEmail });
      if (customerPhone) conditions.push({ customerPhone });
      
      // If they have reservations, find their reservation IDs and fetch those orders too
      if (customerEmail) {
        const reservations = await prisma.reservation.findMany({
          where: { email: customerEmail },
          select: { id: true }
        });
        const resIds = reservations.map(r => r.id);
        if (resIds.length > 0) {
          conditions.push({ reservationId: { in: resIds } });
        }
      }
      where.OR = conditions;
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true,
        reservation: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// Create new QR table order
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      branchId,
      tableNumber,
      reservationId,
      customerEmail,
      customerPhone,
      items,
      totalAmount
    } = body;

    if (!branchId || !tableNumber || !items || items.length === 0) {
      return NextResponse.json({ success: false, message: 'Missing required parameters.' }, { status: 400 });
    }

    // Start a transaction to create Order and OrderItems
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          tableNumber: parseInt(tableNumber),
          branchId,
          reservationId: reservationId || null,
          customerEmail: customerEmail || null,
          customerPhone: customerPhone || null,
          status: 'PENDING',
          totalAmount: parseFloat(totalAmount || 0)
        }
      });

      // Create items
      for (const item of items) {
        await tx.orderItem.create({
          data: {
            orderId: newOrder.id,
            itemId: item.itemId,
            itemName: item.itemName,
            quantity: parseInt(item.quantity),
            price: parseFloat(item.price)
          }
        });
      }

      return newOrder;
    });

    // Log the event
    await logAuditEvent(
      customerEmail || 'Guest QR Code',
      'CUSTOMER',
      'ORDER_CREATE',
      `Placed order ${order.id} for table ${tableNumber} at branch ${branchId}. Amount: ₹${totalAmount}`
    );

    // Also notify manager of new order if notification is configured
    try {
      await prisma.notification.create({
        data: {
          userId: 'MANAGER',
          title: 'New Table Order Placed',
          message: `Table ${tableNumber} has submitted a new order for ₹${totalAmount}.`,
          type: 'SUCCESS'
        }
      });
    } catch {
      // ignore notification errors
    }

    // Retrieve complete order details
    const completeOrder = await prisma.order.findUnique({
      where: { id: order.id },
      include: { items: true }
    });

    return NextResponse.json({ success: true, order: completeOrder });
  } catch (error: any) {
    console.error('Order creation error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// Update order status (KDS states: PENDING -> PREPARING -> READY -> SERVED -> COMPLETED)
export async function PATCH(request: Request) {
  try {
    const { id, status } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ success: false, message: 'Order ID and status are required.' }, { status: 400 });
    }

    // Validate states
    const validStatuses = ['PENDING', 'PREPARING', 'READY', 'SERVED', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` }, { status: 400 });
    }

    const order = await prisma.order.update({
      where: { id },
      data: { status },
      include: { items: true }
    });

    // Audit log
    await logAuditEvent(
      'Manager Console',
      'MANAGER',
      'ORDER_STATUS_UPDATE',
      `Updated order ${id} status to ${status}`
    );

    return NextResponse.json({ success: true, order });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
