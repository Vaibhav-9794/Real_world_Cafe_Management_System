import { NextResponse } from 'next/server';
import { prisma } from '../../../../lib/db';
import { allocateTables, isOverlapping } from '../../../../utils/tableMatcher';

export async function POST(request: Request) {
  try {
    const { branchId, date, time, guests, isFullCafe, sessionId, selectedTableIds } = await request.json();

    if (!branchId || !date || !time || !guests || !sessionId) {
      return NextResponse.json({ success: false, message: 'Missing required parameters.' }, { status: 400 });
    }

    const guestCount = parseInt(guests);

    // 1. Clean up any existing HELD reservations for this session to prevent leakages
    await prisma.reservation.deleteMany({
      where: {
        sessionId,
        booking_status: 'HELD'
      }
    });

    // Calculate end time (2 hours dining duration)
    const [hours, minutes] = time.split(':').map(Number);
    const endHour = hours + 2;
    const endTime = `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    // 2. Call table allocator or validate direct selection
    let allocatedTablesList = [];
    let allocationMessage = '';

    if (selectedTableIds && selectedTableIds.length > 0) {
      const tables = await prisma.table.findMany({
        where: {
          id: { in: selectedTableIds },
          branchId
        }
      });
      if (tables.length !== selectedTableIds.length) {
        return NextResponse.json({ success: false, message: 'Invalid table selection.' }, { status: 400 });
      }

      // Check overlap with other active bookings
      const now = new Date();
      const activeReservations = await prisma.reservation.findMany({
        where: {
          branchId,
          reservation_date: date,
          OR: [
            { booking_status: { in: ['CONFIRMED', 'ARRIVED', 'PENDING'] } },
            {
              booking_status: 'HELD',
              held_until: { gt: now }
            }
          ]
        },
        include: { tables: true }
      });

      const overlapping = activeReservations.filter(res =>
        isOverlapping(res.start_time, res.end_time, time, endTime)
      );

      const occupiedTableIds = new Set<string>();
      overlapping.forEach(res => {
        res.tables.forEach(t => occupiedTableIds.add(t.id));
      });

      const conflicted = tables.some(t => occupiedTableIds.has(t.id));
      if (conflicted) {
        return NextResponse.json({ success: false, message: 'One or more selected tables are already reserved for this slot.' }, { status: 409 });
      }

      allocatedTablesList = tables;
      allocationMessage = `Direct allocation: Table ${tables.map(t => t.number).join(', ')}`;
    } else {
      const allocation = await allocateTables(prisma, branchId, date, time, guestCount, isFullCafe);
      if (!allocation.success) {
        return NextResponse.json({
          success: false,
          fullyBooked: true,
          message: allocation.message
        }, { status: 409 });
      }
      allocatedTablesList = allocation.tables;
      allocationMessage = allocation.message;
    }

    // 3. Create temporary HELD reservation
    const holdExpiration = new Date(Date.now() + 10 * 60000); // 10 minutes from now

    const reservation = await prisma.reservation.create({
      data: {
        name: 'Temporary Hold',
        email: 'hold@bohocafe.com',
        phone: '0000000000',
        type: isFullCafe ? 'FULL_CAFE' : 'TABLE',
        booking_type: 'TABLE',
        table_number: allocatedTablesList[0]?.number ? parseInt(allocatedTablesList[0].number) : null,
        table_capacity: allocatedTablesList.reduce((sum, t) => sum + t.capacity, 0),
        guest_count: guestCount,
        reservation_date: date,
        start_time: time,
        end_time: endTime,
        booking_status: 'HELD',
        approval_status: 'PENDING',
        is_full_cafe_booking: isFullCafe,
        held_until: holdExpiration,
        sessionId,
        
        // Backward compatibility fields
        date,
        time,
        guests: guestCount,
        status: 'PENDING_APPROVAL',
        branchId,
        tables: {
          connect: allocatedTablesList.map(t => ({ id: t.id }))
        }
      },
      include: {
        tables: true
      }
    });

    return NextResponse.json({
      success: true,
      reservationId: reservation.id,
      heldUntil: holdExpiration.toISOString(),
      tables: allocatedTablesList.map(t => t.number),
      allocationMessage
    });
  } catch (error: any) {
    console.error('Reservation hold error:', error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

