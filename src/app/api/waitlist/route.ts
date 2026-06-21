import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');

    const waitlist = await prisma.waitlist.findMany({
      where: branchId ? { branchId } : {},
      include: { branch: true },
      orderBy: { createdAt: 'asc' }
    });

    return NextResponse.json({ success: true, waitlist });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, email, phone, guests, date, timeSlot, branchId } = await request.json();

    if (!name || !email || !phone || !guests || !date || !timeSlot || !branchId) {
      return NextResponse.json({ success: false, message: 'All fields are required.' }, { status: 400 });
    }

    // 1. Create waitlist entry
    const entry = await prisma.waitlist.create({
      data: {
        name,
        email,
        phone,
        guests: parseInt(guests),
        date,
        timeSlot,
        branchId
      }
    });

    // 2. Automatically generate a reservation/lead inside the CRM Lead Pipeline
    await prisma.lead.create({
      data: {
        name,
        email,
        phone,
        type: 'RESERVATION',
        source: 'Website',
        notes: `Joined waitlist for Date: ${date}, Time: ${timeSlot}, Guests: ${guests}`,
        status: 'NEW'
      }
    });

    // 3. Increment loyalty/CRM visit check (if email already in database, update notes)
    const existingCustomer = await prisma.customer.findUnique({
      where: { email }
    });

    if (existingCustomer) {
      await prisma.customer.update({
        where: { email },
        data: {
          notes: `${existingCustomer.notes || ''}\n[Waitlist: ${date} ${timeSlot}]`
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully registered to the waitlist. You will be notified as soon as a table opens up!',
      waitlist: entry
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
