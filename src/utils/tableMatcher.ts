import { PrismaClient, Table } from '@prisma/client';

/**
 * Converts a time string (HH:MM) to minutes since midnight for calculations.
 */
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Checks if two time slots overlap.
 */
export function isOverlapping(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return s1 < e2 && e1 > s2;
}

interface AllocationResult {
  success: boolean;
  tables: Table[];
  message: string;
}

/**
 * Smart table allocation algorithm updated for Phase 3 schema.
 */
export async function allocateTables(
  prisma: PrismaClient,
  branchId: string,
  date: string, // YYYY-MM-DD
  startTime: string, // HH:MM
  guests: number,
  isFullCafe = false
): Promise<AllocationResult> {
  const endTimeMins = timeToMinutes(startTime) + 120; // Default 2 hours duration
  const endTime = `${Math.floor(endTimeMins / 60).toString().padStart(2, '0')}:${(endTimeMins % 60).toString().padStart(2, '0')}`;

  // 1. Fetch all tables for the branch
  const allTables = await prisma.table.findMany({
    where: { branchId },
    orderBy: { capacity: 'asc' } // Sort ascending to help with best-fit
  });

  if (allTables.length === 0) {
    return { success: false, tables: [], message: 'No tables configured for this branch.' };
  }

  // 2. Fetch active reservations & holds for the branch on the given date
  const now = new Date();
  const reservationsOnDate = await prisma.reservation.findMany({
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
    include: {
      tables: true
    }
  });

  // Filter overlapping reservations
  const overlapping = reservationsOnDate.filter(res => 
    isOverlapping(res.start_time, res.end_time, startTime, endTime)
  );

  // Check for full cafe booking conflict
  const hasFullCafeBuyout = overlapping.some(res => res.is_full_cafe_booking);
  if (hasFullCafeBuyout) {
    return { success: false, tables: [], message: 'The lounge is fully booked for a private event during this time.' };
  }

  // If the request is for full cafe buyout, check if there are any existing bookings
  if (isFullCafe) {
    if (overlapping.length > 0) {
      return { success: false, tables: [], message: 'Lounge buyout is unavailable: existing bookings overlap.' };
    }
    return {
      success: true,
      tables: allTables,
      message: 'Full cafe buyout allocated.'
    };
  }

  // Collect IDs of tables that are occupied
  const occupiedTableIds = new Set<string>();
  overlapping.forEach(res => {
    res.tables.forEach(table => {
      occupiedTableIds.add(table.id);
    });
  });

  // Get available tables
  const availableTables = allTables.filter(t => !occupiedTableIds.has(t.id));

  // 3. Find the best single table (closest fit)
  const singleTableFit = availableTables.find(t => t.capacity >= guests);
  if (singleTableFit) {
    return {
      success: true,
      tables: [singleTableFit],
      message: `Table ${singleTableFit.number} allocated (capacity: ${singleTableFit.capacity}).`
    };
  }

  // 4. If no single table fits, combine tables
  const sortedAvailable = [...availableTables].sort((a, b) => b.capacity - a.capacity);
  
  let currentCapacity = 0;
  const allocatedTables: Table[] = [];

  for (const table of sortedAvailable) {
    allocatedTables.push(table);
    currentCapacity += table.capacity;
    if (currentCapacity >= guests) {
      break;
    }
  }

  if (currentCapacity >= guests) {
    const tableNumbers = allocatedTables.map(t => t.number).join(', ');
    return {
      success: true,
      tables: allocatedTables,
      message: `Combined ${allocatedTables.length} tables (${tableNumbers}) for total capacity of ${currentCapacity}.`
    };
  }

  return {
    success: false,
    tables: [],
    message: `Fully booked. Remaining available capacity is only ${currentCapacity} seats.`
  };
}
