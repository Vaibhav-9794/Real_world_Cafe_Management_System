import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth-server';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    const where: any = {
      OR: [
        { userId: session.email },
        { userId: session.role },
        { userId: 'ALL' }
      ]
    };

    if (unreadOnly) {
      where.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return NextResponse.json({ success: true, notifications });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { userId, title, message, type } = await request.json();
    if (!userId || !title || !message) {
      return NextResponse.json({ success: false, message: 'Missing notification parameters.' }, { status: 400 });
    }

    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type: type || 'INFO',
        isRead: false
      }
    });

    return NextResponse.json({ success: true, notification });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 401 });
    }

    const { id, markAll } = await request.json();

    if (markAll) {
      await prisma.notification.updateMany({
        where: {
          OR: [
            { userId: session.email },
            { userId: session.role },
            { userId: 'ALL' }
          ]
        },
        data: { isRead: true }
      });
      return NextResponse.json({ success: true, message: 'All notifications marked as read.' });
    }

    if (!id) {
      return NextResponse.json({ success: false, message: 'Notification ID is required.' }, { status: 400 });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    return NextResponse.json({ success: true, notification: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
