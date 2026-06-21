import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { isOverlapping, timeToMinutes } from '../../../utils/tableMatcher';
import { createPaymentSession } from '../../../lib/payments/paymentFactory';
import { getServerSession } from '../../../lib/auth-server';
import { logAuditEvent } from '../../../lib/audit';
import { 
  sendReservationReceivedEmail, 
  sendReservationApprovedEmail, 
  sendReservationRejectedEmail, 
  sendReservationCancelledEmail,
  sendOwnerNewReservationAlertEmail
} from '../../../lib/email/emailTemplates';

// Helper to map PostgreSQL reservation model to Prisma compatibility format for the frontend
function mapPostgresReservationToPrisma(res: any, tables: any[] = [], branch: any = null, coupon: any = null) {
  if (!res) return null;
  return {
    ...res,
    tables,
    branch,
    coupon,
    branchId: res.branch_id,
    reservationDate: res.reservation_date,
    startTime: res.start_time,
    endTime: res.end_time,
    bookingStatus: res.booking_status,
    specialRequests: res.special_requests,
    approvalStatus: res.approval_status,
    approvedBy: res.approved_by,
    approvedAt: res.approved_at,
    rejectionReason: res.rejection_reason,
    isFullCafeBooking: res.is_full_cafe_booking,
    heldUntil: res.held_until,
    sessionId: res.session_id,
    paymentStatus: res.payment_status,
    paymentId: res.payment_id,
    paymentAmount: res.payment_amount,
    paymentGateway: res.payment_gateway,
    createdAt: res.created_at,
    couponCode: res.coupon_code,
    pointsAwarded: res.points_awarded
  };
}

// Smart table allocation using Supabase HTTP REST API
async function allocateTablesSupabase(
  branchId: string,
  date: string,
  startTime: string,
  guests: number,
  isFullCafe = false
) {
  const endTimeMins = timeToMinutes(startTime) + 120; // Default 2 hours duration
  const endTime = `${Math.floor(endTimeMins / 60).toString().padStart(2, '0')}:${(endTimeMins % 60).toString().padStart(2, '0')}`;

  // 1. Fetch all tables for the branch
  const { data: allTables, error: allTablesError } = await supabaseAdmin
    .from('tables')
    .select('*')
    .eq('branch_id', branchId)
    .order('capacity', { ascending: true });

  if (allTablesError || !allTables || allTables.length === 0) {
    return { success: false, tables: [], message: 'No tables configured for this branch.' };
  }

  // 2. Fetch active reservations & holds for the branch on the given date
  const { data: reservationsOnDate, error: resError } = await supabaseAdmin
    .from('reservations')
    .select('*')
    .eq('branch_id', branchId)
    .eq('reservation_date', date);

  if (resError) {
    return { success: false, tables: [], message: 'Failed to check active reservations.' };
  }

  const now = new Date();
  const activeReservations = (reservationsOnDate || []).filter(res => {
    const isStatusMatch = ['CONFIRMED', 'ARRIVED', 'PENDING'].includes(res.booking_status);
    const isHeldMatch = res.booking_status === 'HELD' && res.held_until && new Date(res.held_until) > now;
    return isStatusMatch || isHeldMatch;
  }).map(res => {
    const associatedTables = (allTables || []).filter(t => 
      res.table_number !== null && t.number === String(res.table_number)
    );
    return {
      ...res,
      tables: associatedTables
    };
  });

  // Filter overlapping reservations
  const overlapping = activeReservations.filter(res => 
    isOverlapping(res.start_time, res.end_time, startTime, endTime)
  );

  // Check for full cafe buyout conflict
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
    res.tables.forEach((table: any) => {
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
  const allocatedTables: any[] = [];

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

// Get reservations with optional filters
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get('branchId');
    const status = searchParams.get('status');
    const date = searchParams.get('date');

    const filterObj: any = {};
    if (branchId) filterObj.branch_id = branchId;
    if (status) filterObj.booking_status = status;
    if (date) filterObj.reservation_date = date;

    const { data: rawReservations, error: getResError } = await supabaseAdmin
      .from('reservations')
      .select('*, branch:branches(*), coupon:coupons(*)')
      .match(filterObj)
      .order('created_at', { ascending: false });

    if (getResError) {
      console.error('GET reservations error:', getResError);
      throw new Error(`Failed to query reservations: ${getResError.message}`);
    }

    const { data: allTables, error: getTablesError } = await supabaseAdmin
      .from('tables')
      .select('*');

    if (getTablesError) {
      console.error('GET tables error:', getTablesError);
      throw new Error(`Failed to query tables: ${getTablesError.message}`);
    }

    // Map each reservation to its tables and format fields for Prisma compatibility
    const reservations = (rawReservations || []).map(res => {
      const associatedTables = (allTables || []).filter(t => 
        res.table_number !== null && t.number === String(res.table_number)
      );
      return mapPostgresReservationToPrisma(res, associatedTables, res.branch, res.coupon);
    });

    return NextResponse.json({ success: true, reservations });
  } catch (error: any) {
    console.error('GET reservations exception:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Create new reservation with validation & holds
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name, email, phone, type, date, time, guests,
      notes, branchId, paymentMethod, couponCode, selectedTableIds
    } = body;

    if (!name || !email || !phone || !type || !date || !time || !guests || !branchId) {
      return NextResponse.json({ success: false, message: 'All required fields must be provided.' }, { status: 400 });
    }

    const guestCount = parseInt(guests);
    const isFullCafe = type === 'FULL_CAFE';

    // 1. Fetch Branch info to verify it exists and get details
    const { data: branch, error: branchErr } = await supabaseAdmin
      .from('branches')
      .select('*')
      .eq('id', branchId)
      .single();

    if (branchErr || !branch) {
      console.error('Branch not found check failed:', branchErr);
      return NextResponse.json({ success: false, message: 'Branch not found or database unreachable.' }, { status: 400 });
    }

    // 2. Conflict Detection: Blocked Dates Check
    const { data: blocks, error: blocksError } = await supabaseAdmin
      .from('blocked_dates')
      .select('*')
      .eq('date', date);

    if (blocksError) {
      console.error('Blocked dates check error:', blocksError);
      throw new Error(`Failed to check blocked dates: ${blocksError.message}`);
    }

    const block = (blocks || []).find(b => {
      if (!b.start_time || !b.end_time) return true; // Full day block
      return b.start_time <= time && b.end_time >= time;
    });

    if (block) {
      return NextResponse.json({ 
        success: false, 
        message: `Lounge booking is closed on ${date} due to: ${block.reason || 'Private Event'}` 
      }, { status: 400 });
    }

    // Calculate end time
    const [hours, minutes] = time.split(':').map(Number);
    const endHour = hours + 2;
    const endTime = `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;

    // 3. Smart Table Allocation or direct selection validation
    let allocatedTablesList = [];
    let allocationMessage = '';

    if (selectedTableIds && selectedTableIds.length > 0) {
      const { data: tables, error: tablesError } = await supabaseAdmin
        .from('tables')
        .select('*')
        .in('id', selectedTableIds)
        .eq('branch_id', branchId);

      if (tablesError || !tables || tables.length !== selectedTableIds.length) {
        return NextResponse.json({ success: false, message: 'Invalid table selection.' }, { status: 400 });
      }

      // Check overlaps
      const { data: reservationsOnDate, error: resError } = await supabaseAdmin
        .from('reservations')
        .select('*')
        .eq('branch_id', branchId)
        .eq('reservation_date', date);

      if (resError) {
        throw new Error(`Failed to query reservations: ${resError.message}`);
      }

      const now = new Date();
      const activeReservations = (reservationsOnDate || []).filter(res => {
        const isStatusMatch = ['CONFIRMED', 'ARRIVED', 'PENDING'].includes(res.booking_status);
        const isHeldMatch = res.booking_status === 'HELD' && res.held_until && new Date(res.held_until) > now;
        return isStatusMatch || isHeldMatch;
      }).map(res => {
        const associatedTables = (tables || []).filter(t => 
          res.table_number !== null && t.number === String(res.table_number)
        );
        return {
          ...res,
          tables: associatedTables
        };
      });

      const overlapping = activeReservations.filter(res =>
        isOverlapping(res.start_time, res.end_time, time, endTime)
      );

      const occupiedTableIds = new Set<string>();
      overlapping.forEach(res => {
        res.tables.forEach((t: any) => occupiedTableIds.add(t.id));
      });

      const conflicted = tables.some(t => occupiedTableIds.has(t.id));
      if (conflicted) {
        return NextResponse.json({ success: false, message: 'One or more selected tables are already reserved.' }, { status: 409 });
      }

      allocatedTablesList = tables;
      allocationMessage = `Direct Seating: Table ${tables.map(t => t.number).join(', ')}`;
    } else {
      const allocation = await allocateTablesSupabase(branchId, date, time, guestCount, isFullCafe);
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

    // 4. Calculate advance deposit
    const advanceDeposit = isFullCafe ? 500.00 : 25.00; // Fixed deposit: $25 for tables, $500 for full cafe

    // 5. Apply coupon if provided
    let discountAmount = 0;
    let finalCoupon = null;

    if (couponCode) {
      const { data: coupon, error: couponError } = await supabaseAdmin
        .from('coupons')
        .select('*')
        .eq('code', couponCode.toUpperCase())
        .single();

      if (!couponError && coupon) {
        const today = new Date().toISOString().split('T')[0];
        if (today >= coupon.start_date && today <= coupon.end_date && coupon.usage_count < coupon.usage_limit) {
          if (coupon.type === 'PERCENTAGE' || coupon.type === 'WEEKEND' || coupon.type === 'FESTIVAL') {
            discountAmount = (advanceDeposit * coupon.value) / 100;
          } else if (coupon.type === 'FIXED') {
            discountAmount = coupon.value;
          }
          if (discountAmount > advanceDeposit) discountAmount = advanceDeposit;

          // Increment usage count
          await supabaseAdmin
            .from('coupons')
            .update({ usage_count: coupon.usage_count + 1 })
            .eq('code', coupon.code);
          
          finalCoupon = coupon;
        }
      }
    }

    const finalAmount = Math.max(0, advanceDeposit - discountAmount);

    // 6. Process Payment (Sandbox or Real)
    const paymentResult = await createPaymentSession({
      amount: finalAmount,
      currency: 'INR',
      reservationId: 'pending',
      method: paymentMethod || 'STRIPE',
      customerName: name,
      customerEmail: email,
      customerPhone: phone
    });

    if (!paymentResult.success) {
      return NextResponse.json({
        success: false,
        message: `Payment failed: ${paymentResult.message}`
      }, { status: 402 });
    }

    // 7. Create Reservation Record in Supabase
    const { data: reservation, error: createResError } = await supabaseAdmin
      .from('reservations')
      .insert({
        id: crypto.randomUUID(),
        name,
        email,
        phone,
        type,
        booking_type: isFullCafe ? 'EVENT' : 'TABLE',
        table_number: allocatedTablesList[0]?.number ? parseInt(allocatedTablesList[0].number) : null,
        table_capacity: allocatedTablesList.reduce((sum, t) => sum + t.capacity, 0),
        guest_count: guestCount,
        reservation_date: date,
        start_time: time,
        end_time: endTime,
        booking_status: 'PENDING',
        special_requests: notes || null,
        approval_status: 'PENDING',
        is_full_cafe_booking: isFullCafe,
        
        // Backward compatibility fields
        date,
        time,
        guests: guestCount,
        notes: notes || null,
        status: 'PENDING_APPROVAL',
        payment_status: 'PAID',
        payment_id: paymentResult.paymentId,
        payment_amount: finalAmount,
        payment_gateway: paymentMethod || 'STRIPE',
        branch_id: branchId,
        coupon_code: couponCode ? couponCode.toUpperCase() : null,
      })
      .select('*')
      .single();

    if (createResError || !reservation) {
      console.error('Reservation creation failed in Supabase:', createResError);
      throw new Error(`Failed to create reservation: ${createResError?.message}`);
    }

    // 8. Upsert customer CRM record in Supabase
    const { data: existingCustomer } = await supabaseAdmin
      .from('customers')
      .select('*')
      .eq('email', email)
      .maybeSingle();

    if (existingCustomer) {
      await supabaseAdmin
        .from('customers')
        .update({
          visit_count: (existingCustomer.visit_count || 0) + 1,
          total_spent: (existingCustomer.total_spent || 0) + finalAmount,
          points: (existingCustomer.points || 0) + Math.floor(finalAmount)
        })
        .eq('email', email);
    } else {
      try {
        await supabaseAdmin
          .from('customers')
          .insert({
            id: crypto.randomUUID(),
            name,
            email,
            phone,
            visit_count: 1,
            total_spent: finalAmount,
            points: Math.floor(finalAmount)
          });
      } catch (crmErr) {
        // Ignore duplicate crm entries
      }
    }

    // 9. Send Customer Confirmation Email
    await sendReservationReceivedEmail(email, {
      name,
      id: reservation.id,
      branchName: branch.name,
      date,
      time,
      guests: guestCount,
      type,
      amount: finalAmount
    });

    // 10. Send Owner New Reservation Alert Email
    await sendOwnerNewReservationAlertEmail('owner@bohocafe.com', {
      id: reservation.id,
      name,
      email,
      phone,
      branchName: branch.name,
      date,
      time,
      guests: guestCount,
      type,
      specialRequests: notes,
      tables: allocatedTablesList.map(t => `Table ${t.number}`)
    });

    // 11. Create Lead entry
    await supabaseAdmin
      .from('leads')
      .insert({
        id: crypto.randomUUID(),
        name,
        email,
        phone,
        type: isFullCafe ? 'EVENT' : 'RESERVATION',
        source: 'Website',
        notes: `Reservation ${reservation.id.substring(0, 8)} - ${type} for ${guestCount} on ${date} at ${time}`,
        status: 'CONTACTED'
      });

    return NextResponse.json({
      success: true,
      reservation: {
        id: reservation.id,
        status: reservation.booking_status,
        paymentStatus: reservation.payment_status,
        paymentId: reservation.payment_id,
        isSandbox: paymentResult.isSandbox,
        tables: allocatedTablesList.map(t => `Table ${t.number} (${t.capacity} seats)`),
        allocationMessage: allocationMessage,
        totalPaid: finalAmount,
        discount: discountAmount
      }
    });
  } catch (error: any) {
    console.error('Reservation create error:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

// Update reservation status (Approve / Reject / Arrived / Complete / Cancel)
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthenticated.' }, { status: 401 });
    }

    const { id, status, rejectionReason } = await request.json();

    if (!id || !status) {
      return NextResponse.json({ success: false, message: 'Reservation ID and status are required.' }, { status: 400 });
    }

    // Role Enforcement: Only Owner can Approve/Reject reservations.
    if ((status === 'APPROVED' || status === 'REJECTED') && session.role !== 'OWNER') {
      return NextResponse.json({ 
        success: false, 
        message: 'Access Denied: Only the Owner can approve or reject reservations.' 
      }, { status: 403 });
    }

    const { data: reservation, error: resFindErr } = await supabaseAdmin
      .from('reservations')
      .select('*, branch:branches(*)')
      .eq('id', id)
      .single();

    if (resFindErr || !reservation) {
      return NextResponse.json({ success: false, message: 'Reservation not found.' }, { status: 404 });
    }

    const { data: allTables, error: tablesErr } = await supabaseAdmin
      .from('tables')
      .select('*')
      .eq('branch_id', reservation.branch_id);

    const associatedTables = (allTables || []).filter(t => 
      reservation.table_number !== null && t.number === String(reservation.table_number)
    );

    // Map status into correct fields
    const updateData: any = {};
    if (status === 'APPROVED') {
      updateData.booking_status = 'CONFIRMED';
      updateData.status = 'APPROVED';
      updateData.approval_status = 'APPROVED';
      updateData.approved_by = session.name;
      updateData.approved_at = new Date().toISOString();
    } else if (status === 'REJECTED') {
      updateData.booking_status = 'REJECTED';
      updateData.status = 'REJECTED';
      updateData.approval_status = 'REJECTED';
      updateData.rejection_reason = rejectionReason || 'Declined by host';
    } else if (status === 'ARRIVED') {
      updateData.booking_status = 'ARRIVED';
      updateData.status = 'ARRIVED';
    } else if (status === 'COMPLETED') {
      updateData.booking_status = 'COMPLETED';
      updateData.status = 'COMPLETED';
    } else if (status === 'CANCELLED') {
      updateData.booking_status = 'CANCELLED';
      updateData.status = 'CANCELLED';
    }

    const { data: updatedReservation, error: updateErr } = await supabaseAdmin
      .from('reservations')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (updateErr) {
      console.error('PATCH update reservation error:', updateErr);
      throw new Error(`Failed to update reservation: ${updateErr.message}`);
    }

    // Update physical tables statuses in floor plan
    const newTableStatus = status === 'ARRIVED' ? 'OCCUPIED' : (status === 'APPROVED' ? 'RESERVED' : (['COMPLETED', 'CANCELLED', 'REJECTED'].includes(status) ? 'AVAILABLE' : null));
    if (newTableStatus) {
      for (const table of associatedTables) {
        await supabaseAdmin
          .from('tables')
          .update({ status: newTableStatus })
          .eq('id', table.id);
      }
    }

    // Trigger emails based on new status
    if (status === 'APPROVED') {
      await sendReservationApprovedEmail(reservation.email, {
        name: reservation.name,
        id: reservation.id,
        branchName: reservation.branch.name,
        date: reservation.reservation_date,
        time: reservation.start_time,
        guests: reservation.guest_count,
        tables: associatedTables.map(t => t.number)
      });
      await logAuditEvent(session.email, session.role, 'RESERVATION_APPROVE', `Approved reservation ${id}`);
    } else if (status === 'REJECTED') {
      await sendReservationRejectedEmail(reservation.email, {
        name: reservation.name,
        id: reservation.id,
        branchName: reservation.branch.name,
        date: reservation.reservation_date,
        time: reservation.start_time,
        refundAmount: reservation.payment_amount
      });
      await logAuditEvent(session.email, session.role, 'RESERVATION_REJECT', `Rejected reservation ${id}: ${rejectionReason || 'No reason specified'}`);
    } else if (status === 'CANCELLED') {
      await sendReservationCancelledEmail(reservation.email, {
        name: reservation.name,
        id: reservation.id,
        branchName: reservation.branch.name,
        date: reservation.reservation_date,
        time: reservation.start_time,
        refundAmount: reservation.payment_amount
      });
      await logAuditEvent(session.email, session.role, 'RESERVATION_CANCEL', `Cancelled reservation ${id}`);
    }

    const finalMappedReservation = mapPostgresReservationToPrisma(updatedReservation, associatedTables, reservation.branch);

    return NextResponse.json({ success: true, reservation: finalMappedReservation });
  } catch (error: any) {
    console.error('PATCH reservation exception:', error);
    return NextResponse.json({ success: false, message: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
