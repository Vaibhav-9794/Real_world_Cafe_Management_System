async function run() {
  const url = 'http://localhost:3000/api/reservations';
  const body = {
    name: 'Test Reservation Customer',
    email: 'hs142636@gmail.com',
    phone: '+918400678200',
    type: 'TABLE',
    date: '2026-06-22',
    time: '19:00',
    guests: '2',
    branchId: 'downtown',
    paymentMethod: 'STRIPE'
  };

  console.log(`Sending POST request to: ${url}...`);
  console.log('Payload:', JSON.stringify(body, null, 2));

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    console.log(`Response Status: ${response.status} ${response.statusText}`);
    const bodyText = await response.text();
    console.log('\nResponse Body:');
    try {
      console.log(JSON.stringify(JSON.parse(bodyText), null, 2));
    } catch {
      console.log(bodyText);
    }
  } catch (err) {
    console.error('❌ Request failed:', err.message);
  }
}

run();
