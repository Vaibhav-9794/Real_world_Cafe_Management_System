import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';
import { sendContactFormAlertEmail } from '@/lib/email/emailTemplates';

export async function GET() {
  try {
    const leads = await prisma.lead.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ success: true, leads });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, email, phone, type, source, notes } = await request.json();

    if (!name || !email || !phone || !type) {
      return NextResponse.json({ success: false, message: 'Missing required parameters.' }, { status: 400 });
    }

    const lead = await prisma.lead.create({
      data: {
        name,
        email,
        phone,
        type, // RESERVATION, EVENT, CORPORATE, CONTACT
        source: source || 'Website',
        notes
      }
    });

    const receiverEmail = process.env.CONTACT_RECEIVER_EMAIL || 'hs142636@gmail.com';
    try {
      await sendContactFormAlertEmail(receiverEmail, { name, email, phone, type, notes });
    } catch (err) {
      console.error('Failed to send contact form email:', err);
    }

    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { id, status, notes } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ success: false, message: 'ID and Status are required.' }, { status: 400 });
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: {
        status, // NEW, CONTACTED, RESERVED, LOST
        notes
      }
    });

    return NextResponse.json({ success: true, lead: updated });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
