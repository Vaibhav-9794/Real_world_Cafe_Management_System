import crypto from 'crypto';

const BASE_URL = 'http://localhost:3000';

async function testReservations() {
  console.log("==================================================");
  console.log("🧪 RUNNING TARGETED RESERVATION ENDPOINTS DIAGNOSTIC");
  console.log("==================================================\n");

  // 1. Test Availability API
  console.log("--- 1. Testing Availability API ---");
  try {
    const url = `${BASE_URL}/api/reservation/availability?branchId=downtown&date=2026-08-10&time=19:00&guests=4`;
    console.log(`GET ${url}`);
    const res = await fetch(url);
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error("Availability API Exception:", err.message);
  }
  console.log("");

  // 2. Test Reservation Creation (POST)
  console.log("--- 2. Testing Reservation Creation (POST) ---");
  let createdId = '';
  try {
    const url = `${BASE_URL}/api/reservations`;
    const payload = {
      name: 'Diagnostic User',
      email: `diagnostic-${Date.now()}@example.com`,
      phone: '1234567890',
      type: 'TABLE',
      date: '2026-08-10',
      time: '19:00',
      guests: 4,
      branchId: 'downtown',
      notes: 'Diagnostic test reservation'
    };
    console.log(`POST ${url} with payload:`, JSON.stringify(payload));
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log("Response:", JSON.stringify(data, null, 2));
    if (res.ok && data.success) {
      createdId = data.reservation.id;
    }
  } catch (err: any) {
    console.error("Reservation Creation Exception:", err.message);
  }
  console.log("");

  // 3. Test Admin Reservation View (GET)
  console.log("--- 3. Testing Admin Reservation View (GET) ---");
  try {
    const url = `${BASE_URL}/api/reservations?branchId=downtown&date=2026-08-10`;
    console.log(`GET ${url}`);
    const res = await fetch(url);
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    console.log(`Reservations count: ${data.reservations?.length || 0}`);
    if (data.reservations?.length > 0) {
      console.log("First reservation sample:", JSON.stringify(data.reservations[0], null, 2));
    }
  } catch (err: any) {
    console.error("Admin Reservation View Exception:", err.message);
  }
  console.log("");

  console.log("==================================================");
  console.log("🏁 TARGETED DIAGNOSTIC COMPLETED");
  console.log("==================================================");
}

testReservations();
