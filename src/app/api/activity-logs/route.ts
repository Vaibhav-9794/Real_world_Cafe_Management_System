import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getServerSession } from '@/lib/auth-server';

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    if (!session || (session.role !== 'OWNER' && session.role !== 'MANAGER')) {
      return NextResponse.json({ success: false, message: 'Unauthorized.' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.max(1, parseInt(searchParams.get('limit') || '50'));
    const skip = (page - 1) * limit;

    const totalCount = await prisma.auditLog.count();

    const logs = await prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    return NextResponse.json({ 
      success: true, 
      logs,
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
