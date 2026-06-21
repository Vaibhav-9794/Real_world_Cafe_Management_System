import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export async function GET() {
  try {
    const branches = await prisma.branch.findMany({
      include: {
        tables: true
      }
    });

    // Format JSON opening hours for the frontend
    const formatted = branches.map(b => ({
      ...b,
      openingHours: JSON.parse(b.openingHours)
    }));

    return NextResponse.json(
      { success: true, branches: formatted },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600'
        }
      }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
