import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '../../../../lib/db';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('customer-auth-session');

    if (!sessionCookie) {
      return NextResponse.json({ success: false, message: 'Unauthenticated.' }, { status: 401 });
    }

    const sessionData = JSON.parse(sessionCookie.value);
    
    // 1. Fetch customer details
    const customer = await prisma.customer.findUnique({
      where: { id: sessionData.id }
    });

    if (!customer) {
      return NextResponse.json({ success: false, message: 'Profile not found.' }, { status: 404 });
    }

    // 2. Fetch reservations matching email or phone
    const reservations = await prisma.reservation.findMany({
      where: {
        OR: [
          { email: customer.email },
          { phone: customer.phone }
        ]
      },
      include: {
        tables: true,
        branch: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // 3. Fetch orders matching email or phone or connected reservations
    const resIds = reservations.map(r => r.id);
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { customerEmail: customer.email },
          { customerPhone: customer.phone },
          ...(resIds.length > 0 ? [{ reservationId: { in: resIds } }] : [])
        ]
      },
      include: {
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // 4. Fetch customer favorites
    const favorites = await prisma.customerFavorite.findMany({
      where: { customerId: customer.id }
    });

    // Return aggregated data
    return NextResponse.json({
      success: true,
      profile: customer,
      reservations,
      orders,
      favorites: favorites.map(f => f.itemId)
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
