import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '../../../../lib/db';

// Get customer favorite dish IDs
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('customer-auth-session');

    if (!sessionCookie) {
      return NextResponse.json({ success: false, message: 'Unauthenticated' }, { status: 401 });
    }

    const sessionData = JSON.parse(sessionCookie.value);
    const favorites = await prisma.customerFavorite.findMany({
      where: { customerId: sessionData.id },
      select: { itemId: true }
    });

    const itemIds = favorites.map(f => f.itemId);
    return NextResponse.json({ success: true, favorites: itemIds });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

// Add or remove a favorite dish ID
export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('customer-auth-session');

    if (!sessionCookie) {
      return NextResponse.json({ success: false, message: 'Unauthenticated' }, { status: 401 });
    }

    const sessionData = JSON.parse(sessionCookie.value);
    const { itemId, action } = await request.json();

    if (!itemId || !action || (action !== 'ADD' && action !== 'REMOVE')) {
      return NextResponse.json({ success: false, message: 'Item ID and valid action (ADD/REMOVE) are required.' }, { status: 400 });
    }

    if (action === 'ADD') {
      // Upsert favorite
      await prisma.customerFavorite.upsert({
        where: {
          customerId_itemId: {
            customerId: sessionData.id,
            itemId
          }
        },
        create: {
          customerId: sessionData.id,
          itemId
        },
        update: {} // do nothing if already exists
      });
    } else {
      // Delete favorite
      await prisma.customerFavorite.deleteMany({
        where: {
          customerId: sessionData.id,
          itemId
        }
      });
    }

    return NextResponse.json({ success: true, message: `Favorite successfully ${action === 'ADD' ? 'added' : 'removed'}.` });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
