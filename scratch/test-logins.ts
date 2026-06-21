const BASE_URL = 'http://localhost:3000';

async function testLogins() {
  console.log("==================================================");
  console.log("🧪 RUNNING TARGETED LOGIN ENDPOINTS DIAGNOSTIC");
  console.log("==================================================\n");

  const credentials = [
    { email: 'owner@bohocafe.com', pin: '8888', label: 'Owner login (Correct)' },
    { email: 'manager@bohocafe.com', pin: '7777', label: 'Manager login (Correct)' },
    { email: 'owner@bohocafe.com', pin: '1234', label: 'Owner login (Incorrect)' }
  ];

  for (const cred of credentials) {
    console.log(`--- Testing: ${cred.label} ---`);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cred.email, pin: cred.pin })
      });
      const data = await res.json();
      console.log(`Status: ${res.status}`);
      console.log("Response:", JSON.stringify(data, null, 2));
    } catch (err: any) {
      console.error("Login Exception:", err.message);
    }
    console.log("");
  }

  console.log("==================================================");
  console.log("🏁 LOGIN DIAGNOSTIC COMPLETED");
  console.log("==================================================");
}

testLogins();
