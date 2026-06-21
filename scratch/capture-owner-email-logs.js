const puppeteer = require('puppeteer-core');

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:3000';
const artDir = 'C:\\Users\\vs242\\.gemini\\antigravity\\brain\\a4322c36-a32f-4ac7-8d1b-4c4fc8af688b';

async function run() {
  console.log('🚀 Starting Puppeteer browser automation for Owner Settings Email Logs...');
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1200 });

  // Go to staff login page
  console.log('Navigating to staff login...');
  await page.goto(`${BASE_URL}/staff-login`, { waitUntil: 'networkidle0' });

  // Enter owner login details
  console.log('Entering Owner Credentials...');
  await page.type('input[type="email"]', 'hs142636@gmail.com');
  await page.type('input[type="password"]', '8888');

  // Click Sign In
  console.log('Clicking Sign In...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Sign In'));
    if (btn) btn.click();
  });

  // Wait for owner page to load
  await new Promise(r => setTimeout(r, 4000));
  console.log('Current URL after login attempt:', page.url());

  // Navigate to settings page directly
  console.log('Navigating to Settings...');
  await page.goto(`${BASE_URL}/owner/settings`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 5000));

  // Take screenshot of settings page
  console.log('Capturing Settings Page containing Email Logs...');
  await page.screenshot({ 
    path: `${artDir}/screenshot_email_delivery_logs.png`,
    fullPage: true 
  });
  console.log('Saved screenshot_email_delivery_logs.png');

  console.log('Closing browser...');
  await browser.close();
  console.log('Screenshot captured successfully!');
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal error in script:', err);
  process.exit(1);
});
