import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabase-admin';

// Helper to convert HH:MM to minutes since midnight
function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
}

// Helper to convert minutes to HH:MM
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

// Parse opening hours string into minutes range
interface ParsedHours {
  open: number;
  close: number;
}

function getOpeningHoursForDay(openingHoursStr: string, dateStr: string): ParsedHours {
  const defaultHours = { open: 660, close: 1320 }; // 11:00 AM - 10:00 PM
  try {
    const hoursArr = JSON.parse(openingHoursStr);
    const date = new Date(dateStr);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }); // e.g. "Monday"

    let matchStr = '';
    if (dayName === 'Sunday') {
      matchStr = 'Sunday';
    } else if (dayName === 'Saturday' || dayName === 'Friday') {
      matchStr = 'Fri - Sat';
    } else {
      matchStr = 'Mon - Thu';
    }

    // Try finding day in array
    const dayConfig = hoursArr.find((h: any) => h.days.toLowerCase().includes(dayName.toLowerCase()) || h.days.toLowerCase().includes(matchStr.toLowerCase()));
    if (!dayConfig) return defaultHours;

    const [openStr, closeStr] = dayConfig.hours.split(' - ');
    
    // Parse time like "11:00 AM" or "10:00 PM"
    const parseTime12h = (tStr: string) => {
      const [time, modifier] = tStr.split(' ');
      let [hours, minutes] = time.split(':').map(Number);
      if (modifier === 'PM' && hours !== 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    return {
      open: parseTime12h(openStr),
      close: parseTime12h(closeStr)
    };
  } catch {
    return defaultHours;
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const date = searchParams.get('date'); // YYYY-MM-DD
    const time = searchParams.get('time'); // HH:MM (optional)
    const guestsParam = searchParams.get('guests');
    const isFullCafe = searchParams.get('isFullCafe') === 'true';

    if (!branchId || !date) {
      return NextResponse.json({ success: false, message: 'Branch ID and date parameters are required.' }, { status: 400 });
    }

    const guests = guestsParam ? parseInt(guestsParam) : 1;

    // 1. Fetch Branch info for opening hours
    const { data: branch, error: branchError } = await supabaseAdmin
      .from('branches')
      .select('*')
      .eq('id', branchId)
      .single();

    if (branchError || !branch) {
      console.error('Availability API error [Branch Fetch]:', branchError);
      return NextResponse.json({ success: false, message: 'Branch not found or database unreachable.' }, { status: 404 });
    }

    const hours = getOpeningHoursForDay(branch.opening_hours, date);

    // 2. Conflict Detection: Blocked Dates Check
    const { data: blocks, error: blocksError } = await supabaseAdmin
      .from('blocked_dates')
      .select('*')
      .eq('date', date);

    if (blocksError) {
      console.error('Availability API error [Blocked Dates Fetch]:', blocksError);
      throw new Error(`Failed to fetch blocked dates: ${blocksError.message}`);
    }
    
    // Check if target time range is within a block
    const isBlocked = (startTimeMins: number, endTimeMins: number) => {
      for (const block of (blocks || [])) {
        if (!block.start_time || !block.end_time) {
          // Full day block
          return { blocked: true, reason: block.reason || 'Holiday / Private Event' };
        }
        const blockStart = timeToMinutes(block.start_time);
        const blockEnd = timeToMinutes(block.end_time);
        // Overlaps if block start is before requested end and block end is after requested start
        if (blockStart < endTimeMins && blockEnd > startTimeMins) {
          return { blocked: true, reason: block.reason || 'Private Event' };
        }
      }
      return { blocked: false, reason: '' };
    };

    // 3. Fetch all active reservations for this branch and date
    const { data: activeReservations, error: reservationsError } = await supabaseAdmin
      .from('reservations')
      .select('*')
      .eq('branch_id', branchId)
      .eq('reservation_date', date)
      .in('booking_status', ['CONFIRMED', 'ARRIVED', 'PENDING']);

    if (reservationsError) {
      console.error('Availability API error [Reservations Fetch]:', reservationsError);
      throw new Error(`Failed to fetch reservations: ${reservationsError.message}`);
    }

    const { data: allTables, error: tablesError } = await supabaseAdmin
      .from('tables')
      .select('*')
      .eq('branch_id', branchId)
      .order('capacity', { ascending: true });

    if (tablesError) {
      console.error('Availability API error [Tables Fetch]:', tablesError);
      throw new Error(`Failed to fetch tables: ${tablesError.message}`);
    }

    // Map reservations to include their occupied tables
    const mappedReservations = (activeReservations || []).map(res => {
      const associatedTables = (allTables || []).filter(t => 
        res.table_number !== null && t.number === String(res.table_number)
      );
      return {
        ...res,
        tables: associatedTables
      };
    });

    // Helper to evaluate slot availability
    const checkSlotAvailability = (slotTime: string) => {
      const startMins = timeToMinutes(slotTime);
      const endMins = startMins + 120; // 2 hour duration

      // A. Closed hours check
      if (startMins < hours.open || endMins > hours.close) {
        return { success: false, conflict: 'CLOSED_HOURS', message: 'Lounge is closed at the requested time.' };
      }

      // B. Blocked date check
      const blockCheck = isBlocked(startMins, endMins);
      if (blockCheck.blocked) {
        return { success: false, conflict: 'BLOCKED_DATE', message: `Blocked period: ${blockCheck.reason}` };
      }

      // C. Overlapping reservations
      const overlapping = mappedReservations.filter(res => {
        const resStart = timeToMinutes(res.start_time);
        const resEnd = timeToMinutes(res.end_time);
        return resStart < endMins && resEnd > startMins;
      });

      // D. Full cafe buyout check
      const hasFullCafeBuyout = overlapping.some(res => res.is_full_cafe_booking);
      if (hasFullCafeBuyout) {
        return { success: false, conflict: 'FULL_CAFE_OVERLAP', message: 'Lounge is fully booked for a private event during this time.' };
      }

      if (isFullCafe) {
        // If client is booking full cafe, any existing booking blocks it
        if (overlapping.length > 0) {
          return { success: false, conflict: 'FULL_CAFE_OVERLAP', message: 'Lounge cannot be booked for a private event: existing bookings overlap.' };
        }
        return {
          success: true,
          availableTables: allTables || [],
          occupiedTables: [],
          remainingCapacity: (allTables || []).reduce((sum, t) => sum + t.capacity, 0),
        };
      }

      // E. Calculate occupied and available tables
      const occupiedTableIds = new Set<string>();
      overlapping.forEach(res => {
        res.tables.forEach((t: any) => occupiedTableIds.add(t.id));
      });

      const availableTables = (allTables || []).filter(t => !occupiedTableIds.has(t.id));
      const occupiedTables = (allTables || []).filter(t => occupiedTableIds.has(t.id));
      const remainingCapacity = availableTables.reduce((sum, t) => sum + t.capacity, 0);

      if (remainingCapacity < guests) {
        return {
          success: false,
          conflict: 'CAPACITY_OVERFLOW',
          message: `Lounge is fully booked. Only ${remainingCapacity} seats remaining.`,
          availableTables,
          occupiedTables,
          remainingCapacity
        };
      }

      return {
        success: true,
        availableTables,
        occupiedTables,
        remainingCapacity
      };
    };

    // If time is provided, evaluate that specific slot
    if (time) {
      const slotResult = checkSlotAvailability(time);

      // Calculate next available slots (up to 3)
      const nextSlots: string[] = [];
      let checkMins = timeToMinutes(time) + 30; // Check slots in 30 min intervals
      while (nextSlots.length < 3 && checkMins < hours.close - 120) {
        const checkTimeStr = minutesToTime(checkMins);
        const checkRes = checkSlotAvailability(checkTimeStr);
        if (checkRes.success) {
          nextSlots.push(checkTimeStr);
        }
        checkMins += 30;
      }

      return NextResponse.json({
        success: slotResult.success,
        conflict: slotResult.success ? null : (slotResult as any).conflict,
        message: slotResult.success ? 'Slot is available.' : (slotResult as any).message,
        availableTables: (slotResult as any).availableTables || [],
        occupiedTables: (slotResult as any).occupiedTables || [],
        remainingCapacity: (slotResult as any).remainingCapacity ?? 0,
        nextAvailableSlots: nextSlots
      });
    }

    // If time is NOT provided, scan the entire day for availability
    const allDaySlots: { time: string; success: boolean; remainingCapacity: number }[] = [];
    let currentMins = hours.open;
    while (currentMins <= hours.close - 120) {
      const timeStr = minutesToTime(currentMins);
      const res = checkSlotAvailability(timeStr);
      allDaySlots.push({
        time: timeStr,
        success: res.success,
        remainingCapacity: (res as any).remainingCapacity ?? 0
      });
      currentMins += 30;
    }

    return NextResponse.json({
      success: true,
      dayOpeningHours: `${minutesToTime(hours.open)} - ${minutesToTime(hours.close)}`,
      slots: allDaySlots
    });

  } catch (error: any) {
    console.error('Availability API error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
