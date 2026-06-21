import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key') || 'homepage';

    const cmsConfig = await prisma.cMSConfig.findUnique({
      where: { key }
    });

    if (!cmsConfig) {
      return NextResponse.json({ success: false, message: `No CMS Config found for key: ${key}` }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        data: JSON.parse(cmsConfig.value)
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=120'
        }
      }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { key, value } = await request.json();

    if (!key || !value) {
      return NextResponse.json({ success: false, message: 'Key and Value are required' }, { status: 400 });
    }

    const valueString = typeof value === 'string' ? value : JSON.stringify(value);

    const updated = await prisma.cMSConfig.upsert({
      where: { key },
      update: { value: valueString },
      create: { key, value: valueString }
    });

    return NextResponse.json({
      success: true,
      data: JSON.parse(updated.value)
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
