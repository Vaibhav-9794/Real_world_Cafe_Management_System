async function run() {
  const url = 'http://localhost:3000/api/reservation/availability?branchId=downtown&date=2026-06-22&time=19:00&guests=2';
  console.log(`Sending GET request to: ${url}...`);

  try {
    const response = await fetch(url);
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
