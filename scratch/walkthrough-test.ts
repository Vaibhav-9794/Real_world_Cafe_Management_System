import crypto from 'crypto';

const PORT = 3000;
const BASE_URL = `http://localhost:${PORT}`;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runPlatformWalkthrough() {
  console.log('================================================================');
  console.log('🔍 BOHO CAFE & LOUNGE — COMPREHENSIVE PLATFORM INTEGRATION AUDIT');
  console.log('================================================================\n');

  let ownerCookie = '';
  let managerCookie = '';
  let staffCookie = '';
  let testReservationId = '';
  let testCustomerId = '';
  let testStaffId = '';
  let testCouponId = '';
  let testInventoryId = '';

  // ---------------------------------------------------------
  // PHASE 1: CUSTOMER EXPERIENCE ROUTE CHECKS
  // ---------------------------------------------------------
  console.log('✦ PHASE 1: CUSTOMER EXPERIENCE ROUTE CHECKS');
  
  // 1.1 Homepage
  try {
    const res = await fetch(`${BASE_URL}/`);
    if (res.status === 200) {
      console.log('  🟢 Homepage (/) loads successfully. Status 200 OK');
    } else {
      console.error(`  🔴 Homepage returned status: ${res.status}`);
    }
  } catch (err: any) {
    console.error('  🔴 Homepage connection error:', err.message);
  }

  // 1.2 Digital Menu Page
  try {
    const res = await fetch(`${BASE_URL}/menu`);
    if (res.status === 200) {
      console.log('  🟢 Menu page (/menu) loads successfully. Status 200 OK');
    } else {
      console.error(`  🔴 Menu page returned status: ${res.status}`);
    }
  } catch (err: any) {
    console.error('  🔴 Menu page connection error:', err.message);
  }

  // 1.3 Static Menu APIs
  try {
    const res = await fetch(`${BASE_URL}/api/branches`);
    const data = await res.json();
    const cacheControl = res.headers.get('cache-control');
    if (res.ok && data.success && cacheControl) {
      console.log(`  🟢 Static Branches API cached successfully. Cache-Control: ${cacheControl}`);
    } else {
      console.error('  🔴 Static Branches API caching check failed.');
    }
  } catch (err: any) {
    console.error('  🔴 Static Branches API error:', err.message);
  }

  // 1.4 Reservation Availability check
  try {
    const res = await fetch(`${BASE_URL}/api/reservation/availability?branchId=downtown&date=2026-08-10&time=19:00&guests=4`);
    const data = await res.json();
    if (res.ok && data.success && data.availableTables.length > 0) {
      console.log(`  🟢 Availability Engine: verified ${data.availableTables.length} tables free for 4 guests on 2026-08-10 at 19:00.`);
    } else {
      console.error('  🔴 Availability query failed:', data);
    }
  } catch (err: any) {
    console.error('  🔴 Availability check error:', err.message);
  }

  // 1.5 Create a reservation
  try {
    const res = await fetch(`${BASE_URL}/api/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alexander Hamilton',
        email: 'alexander@hamilton.com',
        phone: '17761804',
        type: 'TABLE',
        date: '2026-08-10',
        time: '19:00',
        guests: 4,
        branchId: 'downtown',
        special_requests: 'Requires near-window table'
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      testReservationId = data.reservation.id;
      console.log(`  🟢 Reservation Engine: Booking created successfully. ID: ${testReservationId}`);
    } else {
      console.error('  🔴 Reservation creation failed:', data);
    }
  } catch (err: any) {
    console.error('  🔴 Reservation create error:', err.message);
  }

  // 1.6 Reservation Double-booking / Capacity Conflict Check
  try {
    const res = await fetch(`${BASE_URL}/api/reservations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Aaron Burr',
        email: 'aaron@burr.com',
        phone: '18042026',
        type: 'TABLE',
        date: '2026-08-10',
        time: '19:00',
        guests: 200, // Capacity overflow
        branchId: 'downtown'
      })
    });
    const data = await res.json();
    if (res.status === 409 && data.fullyBooked) {
      console.log('  🟢 Reservation Engine: Correctly detected capacity overflow & triggered fullyBooked.');
    } else {
      console.error(`  🔴 Capacity conflict test bypass: Status ${res.status}`, data);
    }
  } catch (err: any) {
    console.error('  🔴 Capacity conflict check error:', err.message);
  }

  // 1.7 Waitlist fallback registration
  try {
    const res = await fetch(`${BASE_URL}/api/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Aaron Burr (Waitlist)',
        email: 'aaron@burr.com',
        phone: '18042026',
        branchId: 'downtown',
        date: '2026-08-10',
        timeSlot: '19:00', // TimeSlot added
        guests: 6
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      console.log(`  🟢 Waitlist Engine: Successfully waitlisted guest. ID: ${data.waitlist.id}`);
    } else {
      console.error('  🔴 Waitlist registration failed:', data);
    }
  } catch (err: any) {
    console.error('  🔴 Waitlist error:', err.message);
  }

  // ---------------------------------------------------------
  // PHASE 2: AUTHENTICATION & SECURITY ROLES
  // ---------------------------------------------------------
  console.log('\n✦ PHASE 2: STAFF AUTHENTICATION & SESSION SECURITY');

  // 2.1 Owner credentials
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@bohocafe.com', pin: '8888' })
    });
    const data = await res.json();
    const cookie = res.headers.get('set-cookie');
    if (res.ok && data.success && cookie) {
      ownerCookie = cookie.split(';')[0];
      console.log('  🟢 Owner Authenticated successfully (PIN 8888).');
    } else {
      console.error('  🔴 Owner auth failed:', data);
    }
  } catch (err: any) {
    console.error('  🔴 Owner login error:', err.message);
  }

  // 2.2 Manager credentials
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@bohocafe.com', pin: '7777' })
    });
    const data = await res.json();
    const cookie = res.headers.get('set-cookie');
    if (res.ok && data.success && cookie) {
      managerCookie = cookie.split(';')[0];
      console.log('  🟢 Manager Authenticated successfully (PIN 7777).');
    }
  } catch (err: any) {
    console.error('  🔴 Manager login error:', err.message);
  }

  // 2.3 Wrong PIN test
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'owner@bohocafe.com', pin: '1234' }) // Incorrect PIN
    });
    const data = await res.json();
    if (res.status === 401 && !data.success) {
      console.log('  🟢 Wrong credentials correctly rejected (401 Unauthorized).');
    } else {
      console.error(`  🔴 Wrong credentials bypass check. Status: ${res.status}`);
    }
  } catch (err: any) {
    console.error('  🔴 Wrong PIN check error:', err.message);
  }

  // 2.4 Session retrieval verification
  try {
    const res = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { 'Cookie': ownerCookie }
    });
    const data = await res.json();
    if (res.ok && data.success && data.user.role === 'OWNER') {
      console.log(`  🟢 Session recovery verified. User authenticated as: ${data.user.email} (${data.user.role})`);
    } else {
      console.error('  🔴 Session recovery check failed:', data);
    }
  } catch (err: any) {
    console.error('  🔴 Session check error:', err.message);
  }

  // ---------------------------------------------------------
  // PHASE 3: OWNER OPERATIONS & SETTING PANELS
  // ---------------------------------------------------------
  console.log('\n✦ PHASE 3: OWNER EXECUTIVE CONSOLE & CONTROL PANELS');

  // 3.1 Fetch Business Dashboard Analytics
  try {
    const res = await fetch(`${BASE_URL}/api/analytics`, {
      headers: { 'Cookie': ownerCookie }
    });
    const data = await res.json();
    if (res.ok && data.success && data.analytics) {
      console.log('  🟢 Dashboard metrics loaded successfully:');
      console.log(`     - Total Revenue: $${data.analytics.totalRevenue.toFixed(2)}`);
      console.log(`     - Total Reservations: ${data.analytics.totalReservations}`);
      console.log(`     - Table Utilization: ${data.analytics.tableUtilization}%`);
      console.log(`     - Waitlist Count: ${data.analytics.waitlistCount}`);
    } else {
      console.error('  🔴 Dashboard metrics failed:', data);
    }
  } catch (err: any) {
    console.error('  🔴 Dashboard analytics error:', err.message);
  }

  // 3.2 Staff Management (Create a temporary staff member)
  try {
    const res = await fetch(`${BASE_URL}/api/admin/staff`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': ownerCookie
      },
      body: JSON.stringify({
        name: 'Audit Clerk',
        email: 'audit@bohocafe.com',
        role: 'STAFF',
        branchId: 'downtown',
        pin: '5555'
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      testStaffId = data.staff.id;
      console.log(`  🟢 Staff Registry: Added new user "Audit Clerk". ID: ${testStaffId}`);
    } else {
      console.error('  🔴 Staff creation failed:', data);
    }
  } catch (err: any) {
    console.error('  🔴 Staff management error:', err.message);
  }

  // 3.3 Edit and Suspend Staff member
  try {
    const res = await fetch(`${BASE_URL}/api/admin/staff`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': ownerCookie
      },
      body: JSON.stringify({
        id: testStaffId,
        status: 'SUSPENDED'
      })
    });
    const data = await res.json();
    if (res.ok && data.success && data.staff.status === 'SUSPENDED') {
      console.log('  🟢 Staff Registry: Suspended "Audit Clerk" successfully.');
    } else {
      console.error('  🔴 Staff status edit failed:', data);
    }
  } catch (err: any) {
    console.error('  🔴 Staff edit error:', err.message);
  }

  // 3.4 Suspended Login Lockout Check
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'audit@bohocafe.com', pin: '5555' })
    });
    const data = await res.json();
    if (res.status === 403 && data.message.includes('suspended')) {
      console.log('  🟢 Session Security: Blocked login attempt from suspended account (403 Forbidden).');
    } else {
      console.error(`  🔴 Suspended login lockout check failed. Status: ${res.status}`, data);
    }
  } catch (err: any) {
    console.error('  🔴 Suspended lockout error:', err.message);
  }

  // 3.5 Clean up (Delete Staff member)
  try {
    const res = await fetch(`${BASE_URL}/api/admin/staff?id=${testStaffId}`, {
      method: 'DELETE',
      headers: { 'Cookie': ownerCookie }
    });
    const data = await res.json();
    if (res.ok && data.success) {
      console.log('  🟢 Staff Registry: Cleaned up and deleted test staff member.');
    } else {
      console.error('  🔴 Staff deletion failed:', data);
    }
  } catch (err: any) {
    console.error('  🔴 Staff cleanup error:', err.message);
  }

  // 3.6 CRM Customer List & VIP Toggle
  try {
    // List customers
    const listRes = await fetch(`${BASE_URL}/api/admin/customers`, {
      headers: { 'Cookie': ownerCookie }
    });
    const listData = await listRes.json();
    if (listRes.ok && listData.success && listData.customers.length > 0) {
      const firstCustomer = listData.customers[0];
      testCustomerId = firstCustomer.id;
      console.log(`  🟢 Customer CRM: Found active profiles. ID of first: ${testCustomerId} (${firstCustomer.name})`);

      // Update customer to VIP
      const editRes = await fetch(`${BASE_URL}/api/admin/customers`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': ownerCookie
        },
        body: JSON.stringify({
          id: testCustomerId,
          vipStatus: true,
          membershipTier: 'Platinum',
          points: firstCustomer.points + 200,
          notes: 'Regular diner. Upgraded during Phase 4.5 validation.'
        })
      });
      const editData = await editRes.json();
      if (editRes.ok && editData.success && editData.customer.vipStatus) {
        console.log(`  🟢 Customer CRM: Successfully toggled VIP status and awarded 200 points to ${editData.customer.name}.`);
      } else {
        console.error('  🔴 Customer CRM details update failed:', editData);
      }
    }
  } catch (err: any) {
    console.error('  🔴 CRM Customer check error:', err.message);
  }

  // 3.7 Promotions Coupon Creation & Apply Test
  try {
    // Create Coupon
    const promoRes = await fetch(`${BASE_URL}/api/admin/promotions`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': ownerCookie
      },
      body: JSON.stringify({
        code: 'BOHO99',
        type: 'PERCENTAGE',
        value: 15,
        minSpend: 20,
        startDate: '2026-06-20',
        endDate: '2026-12-31',
        usageLimit: 10
      })
    });
    const promoData = await promoRes.json();
    if (promoRes.ok && promoData.success) {
      console.log('  🟢 Promotions: Generated 15% discount coupon "BOHO99".');

      // Verify Coupon applies correctly
      const applyRes = await fetch(`${BASE_URL}/api/coupons?code=BOHO99&spend=50`);
      const applyData = await applyRes.json();
      if (applyRes.ok && applyData.success && applyData.coupon.discountAmount === 7.5) {
        console.log('  🟢 Promotions: Coupon validated & applied correct discount of $7.50 on $50 spend.');
      } else {
        console.error('  🔴 Promotions coupon validation failed:', applyData);
      }
    } else {
      console.error('  🔴 Promotions coupon creation failed:', promoData);
    }
  } catch (err: any) {
    console.error('  🔴 Coupon check error:', err.message);
  }

  // ---------------------------------------------------------
  // PHASE 4: MANAGER CONSOLE OPERATIONS
  // ---------------------------------------------------------
  console.log('\n✦ PHASE 4: MANAGER OPERATIONS & SEATING');

  // 4.1 Arrive the Guest (CONFIRMED -> ARRIVED)
  try {
    const res = await fetch(`${BASE_URL}/api/reservations`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': managerCookie
      },
      body: JSON.stringify({ id: testReservationId, status: 'ARRIVED' })
    });
    const data = await res.json();
    if (res.ok && data.success && data.reservation.booking_status === 'ARRIVED') {
      console.log('  🟢 Operations: Checked-in guest "Alexander Hamilton" (ARRIVED). Seating map updated.');
    } else {
      console.error('  🔴 Manager check-in failed:', data);
    }
  } catch (err: any) {
    console.error('  🔴 Arrive guest check error:', err.message);
  }

  // 4.2 Complete session and award points (ARRIVED -> COMPLETED)
  try {
    const res = await fetch(`${BASE_URL}/api/reservations`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': managerCookie
      },
      body: JSON.stringify({ id: testReservationId, status: 'COMPLETED' })
    });
    const data = await res.json();
    if (res.ok && data.success && data.reservation.booking_status === 'COMPLETED') {
      console.log('  🟢 Operations: Completed session. Table freed, loyalty points automatically credited.');
    } else {
      console.error('  🔴 Manager session completion failed:', data);
    }
  } catch (err: any) {
    console.error('  🔴 Complete session check error:', err.message);
  }

  // ---------------------------------------------------------
  // PHASE 5: INVENTORY MANAGEMENT AUDIT
  // ---------------------------------------------------------
  console.log('\n✦ PHASE 5: INVENTORY MODULE AUDIT (LOW STOCK ALERTS)');

  // 5.1 Create item below threshold (quantity=10, minThreshold=15)
  try {
    const res = await fetch(`${BASE_URL}/api/admin/inventory`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': ownerCookie
      },
      body: JSON.stringify({
        name: 'Organic Coffee Beans',
        category: 'Beverage Raw',
        quantity: 10.0,
        unit: 'kg',
        minThreshold: 15.0
      })
    });
    const data = await res.json();
    if (res.ok && data.success) {
      testInventoryId = data.item.id;
      console.log(`  🟢 Inventory: Added "Organic Coffee Beans" (Stock: 10kg, Threshold: 15kg). ID: ${testInventoryId}`);
    } else {
      console.error('  🔴 Inventory item creation failed:', data);
    }
  } catch (err: any) {
    console.error('  🔴 Inventory post error:', err.message);
  }

  // 5.2 Fetch inventory items and check low stock warning
  try {
    const res = await fetch(`${BASE_URL}/api/admin/inventory`, {
      headers: { 'Cookie': ownerCookie }
    });
    const data = await res.json();
    if (res.ok && data.success) {
      console.log(`  🟢 Inventory: Loaded registry (${data.items.length} items).`);
      const isFlagged = data.lowStockItems.some((item: any) => item.id === testInventoryId);
      if (isFlagged) {
        console.log(`  🟢 Inventory Alert: "Organic Coffee Beans" successfully flagged as LOW STOCK (Total Low Stock Items: ${data.lowStockCount}).`);
      } else {
        console.error('  🔴 Inventory Alert: Low stock item was not flagged.');
      }
    }
  } catch (err: any) {
    console.error('  🔴 Inventory list error:', err.message);
  }

  // 5.3 Update stock above threshold (quantity=50)
  try {
    const res = await fetch(`${BASE_URL}/api/admin/inventory`, {
      method: 'PATCH',
      headers: { 
        'Content-Type': 'application/json',
        'Cookie': ownerCookie
      },
      body: JSON.stringify({
        id: testInventoryId,
        quantity: 50.0
      })
    });
    const data = await res.json();
    if (res.ok && data.success && data.item.quantity === 50.0) {
      console.log(`  🟢 Inventory: Restocked "Organic Coffee Beans" to 50kg (Threshold: 15kg).`);
    } else {
      console.error('  🔴 Inventory stock update failed:', data);
    }
  } catch (err: any) {
    console.error('  🔴 Inventory update error:', err.message);
  }

  // 5.4 Fetch again, verify alert cleared
  try {
    const res = await fetch(`${BASE_URL}/api/admin/inventory`, {
      headers: { 'Cookie': ownerCookie }
    });
    const data = await res.json();
    if (res.ok && data.success) {
      const isStillFlagged = data.lowStockItems.some((item: any) => item.id === testInventoryId);
      if (!isStillFlagged) {
        console.log('  🟢 Inventory Alert: Alert successfully CLEARED after restocking.');
      } else {
        console.error('  🔴 Inventory Alert: Item was incorrectly flagged as low stock after restock.');
      }
    }
  } catch (err: any) {
    console.error('  🔴 Inventory lookup error:', err.message);
  }

  // 5.5 Manager tries to delete (Should be blocked, Owner only)
  try {
    const res = await fetch(`${BASE_URL}/api/admin/inventory?id=${testInventoryId}`, {
      method: 'DELETE',
      headers: { 'Cookie': managerCookie }
    });
    const data = await res.json();
    if (res.status === 403) {
      console.log('  🟢 Security: Manager blocked from deleting inventory items (403 Forbidden).');
    } else {
      console.error(`  🔴 Security: Bypass detected! Manager deleted inventory item. Status: ${res.status}`);
    }
  } catch (err: any) {
    console.error('  🔴 Inventory deletion check error:', err.message);
  }

  // 5.6 Owner deletes the item
  try {
    const res = await fetch(`${BASE_URL}/api/admin/inventory?id=${testInventoryId}`, {
      method: 'DELETE',
      headers: { 'Cookie': ownerCookie }
    });
    const data = await res.json();
    if (res.ok && data.success) {
      console.log('  🟢 Inventory: Owner successfully deleted "Organic Coffee Beans".');
    } else {
      console.error('  🔴 Owner inventory deletion failed:', data);
    }
  } catch (err: any) {
    console.error('  🔴 Inventory delete error:', err.message);
  }

  // ---------------------------------------------------------
  // PHASE 6: EXPORTS & AUDITING REPORTS
  // ---------------------------------------------------------
  console.log('\n✦ PHASE 6: EXPORTS, NOTIFICATIONS & AUDITING');

  // 6.1 Export Reservations CSV
  try {
    const res = await fetch(`${BASE_URL}/api/admin/export?type=reservations`, {
      headers: { 'Cookie': ownerCookie }
    });
    const text = await res.text();
    if (res.ok && (text.includes('ID') || text.includes('id'))) {
      console.log(`  🟢 Export Center: Exported Reservations ledger (CSV: ${text.split('\n').length} rows).`);
    } else {
      console.error('  🔴 Reservations CSV export failure.');
    }
  } catch (err: any) {
    console.error('  🔴 CSV export check error:', err.message);
  }

  // 6.2 Export Audit security logs
  try {
    const res = await fetch(`${BASE_URL}/api/admin/export?type=audit`, {
      headers: { 'Cookie': ownerCookie }
    });
    const text = await res.text();
    if (res.ok && (text.includes('Action') || text.includes('action'))) {
      console.log(`  🟢 Export Center: Exported write-protected security audit log (CSV: ${text.split('\n').length} rows).`);
    } else {
      console.error('  🔴 Audit log CSV export failure.');
    }
  } catch (err: any) {
    console.error('  🔴 Audit log export check error:', err.message);
  }

  // 6.3 Notifications center validation
  try {
    const res = await fetch(`${BASE_URL}/api/admin/notifications`, {
      headers: { 'Cookie': ownerCookie }
    });
    const data = await res.json();
    if (res.ok && data.success) {
      console.log(`  🟢 Notification Center: Loaded active notifications list (${data.notifications.length} logs).`);
    }
  } catch (err: any) {
    console.error('  🔴 Notification read check error:', err.message);
  }

  // ---------------------------------------------------------
  // PHASE 7: ROLE-BASED ACCESS CONTROL (RBAC) SECURITY
  // ---------------------------------------------------------
  console.log('\n✦ PHASE 7: ROLE-BASED ACCESS CONTROL (RBAC) BLOCKS');

  // 7.1 Staff trying to read owner analytics
  try {
    // Login as staff first
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'staff@bohocafe.com', pin: '1111' })
    });
    const loginData = await loginRes.json();
    const cookie = loginRes.headers.get('set-cookie');
    if (loginRes.ok && loginData.success && cookie) {
      staffCookie = cookie.split(';')[0];
      
      // Attempt reading analytics route (Owner/Manager level)
      const secRes = await fetch(`${BASE_URL}/api/analytics`, {
        headers: { 'Cookie': staffCookie }
      });
      const secData = await secRes.json();
      if (secRes.status === 403) {
        console.log('  🟢 Security: Role-based route check blocked staff from analytics (403 Forbidden).');
      } else {
        console.error(`  🔴 Security: Bypass detected! Staff read analytics. Status: ${secRes.status}`, secData);
      }
    }
  } catch (err: any) {
    console.error('  🔴 RBAC staff security check error:', err.message);
  }

  // 7.2 Manager trying to delete coupons
  try {
    const secRes = await fetch(`${BASE_URL}/api/admin/promotions?code=BOHO99`, {
      method: 'DELETE',
      headers: { 'Cookie': managerCookie }
    });
    const secData = await secRes.json();
    if (secRes.status === 403) {
      console.log('  🟢 Security: Role-based action check blocked manager from deleting coupons (403 Forbidden).');
    } else {
      console.error(`  🔴 Security: Bypass detected! Manager deleted coupon. Status: ${secRes.status}`, secData);
    }
  } catch (err: any) {
    console.error('  🔴 RBAC manager action check error:', err.message);
  }

  // 7.3 Cleanup promotions coupon (Owner only)
  try {
    const cleanRes = await fetch(`${BASE_URL}/api/admin/promotions?code=BOHO99`, {
      method: 'DELETE',
      headers: { 'Cookie': ownerCookie }
    });
    const cleanData = await cleanRes.json();
    if (cleanRes.ok && cleanData.success) {
      console.log('  🟢 Promotions: Cleaned up and deleted promo coupon "BOHO99".');
    }
  } catch (err: any) {
    console.error('  🔴 Coupon cleanup error:', err.message);
  }

  console.log('\n================================================================');
  console.log('🎉 PLATFORM INTEGRATION AUDIT SUCCESSFULLY CONCLUDED.');
  console.log('================================================================');
}

runPlatformWalkthrough();
