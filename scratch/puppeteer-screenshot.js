const puppeteer = require('puppeteer-core');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const BASE_URL = 'http://localhost:3000';
const artDir = 'C:\\Users\\vs242\\.gemini\\antigravity\\brain\\a4322c36-a32f-4ac7-8d1b-4c4fc8af688b';

async function run() {
  console.log('🚀 Starting Puppeteer browser automation...');
  const browser = await puppeteer.launch({
    executablePath: edgePath,
    headless: true,
    args: ['--no-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });

  // 1. Authenticate Customer & screenshot Portal Logged-In State
  console.log('Step 1: Logging in guest prelaunch_guest@bohocafe.com...');
  await page.goto(`${BASE_URL}/account`, { waitUntil: 'networkidle0' });
  
  // Enter email
  await page.type('input[placeholder*="guest@email.com"]', 'prelaunch_guest@bohocafe.com');
  
  // Click request code
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Request Access Code') || b.textContent.includes('Requesting'));
    if (btn) btn.click();
  });
  
  await new Promise(r => setTimeout(r, 2500));

  // Retrieve OTP code from database
  console.log('Querying OTP code from database...');
  const customer = await prisma.customer.findUnique({
    where: { email: 'prelaunch_guest@bohocafe.com' }
  });
  const otpCode = customer.otpCode;
  console.log(`Retrieved OTP Code: ${otpCode}`);

  if (!otpCode) {
    throw new Error('OTP Code was not generated in database!');
  }

  // Type OTP code
  await page.type('input[placeholder*="verification code"]', otpCode);
  
  // Click Verify Code
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Verify Code') || b.textContent.includes('Verifying'));
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 3000));
  
  // Capture Customer Portal Logged-In State
  console.log('Capturing Customer Portal Logged-In State...');
  await page.screenshot({ path: `${artDir}/screenshot_portal_logged_in.png` });
  console.log('Saved screenshot_portal_logged_in.png');

  // Navigate to Favorites tab
  console.log('Navigating to Favorites tab...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const tab = tabs.find(t => t.textContent.toLowerCase().includes('favorites') || t.textContent.toLowerCase().includes('saved'));
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: `${artDir}/screenshot_portal_favorites.png` });
  console.log('Saved screenshot_portal_favorites.png');

  // 2. QR Ordering Flow
  console.log('Step 2: Testing QR Ordering Flow...');
  // Open QR path to set table cookies/session parameters
  await page.goto(`${BASE_URL}/qr/downtown/3`, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 1500));
  
  // Click Browse Menu
  await page.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    const link = links.find(l => l.textContent.includes('Browse Digital Menu'));
    if (link) link.click();
  });

  await new Promise(r => setTimeout(r, 3000));
  
  // Verify menu loads Table 3 banner and click "Add" to order
  console.log('Adding item to cart...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Add'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1000));

  // Capture cart drawer trigger state
  await page.screenshot({ path: `${artDir}/screenshot_qr_ordering_cart_trigger.png` });
  console.log('Saved screenshot_qr_ordering_cart_trigger.png');

  // Open cart drawer
  console.log('Opening cart drawer...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('View Table Order'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  // Capture cart drawer detail state
  await page.screenshot({ path: `${artDir}/screenshot_qr_ordering_cart_detail.png` });
  console.log('Saved screenshot_qr_ordering_cart_detail.png');

  // Click Send to Kitchen Queue
  console.log('Submitting order to kitchen queue...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Send to Kitchen'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 3000));

  // Capture Order Created State popup
  await page.screenshot({ path: `${artDir}/screenshot_qr_order_created.png` });
  console.log('Saved screenshot_qr_order_created.png');

  // 3. Manager Dashboard & KDS progression
  console.log('Step 3: Logging into Staff Console...');
  await page.goto(`${BASE_URL}/staff-login`, { waitUntil: 'networkidle0' });
  await page.type('input[placeholder*="name@bohocafe.com"]', 'manager@bohocafe.com');
  await page.type('input[placeholder*="access PIN"]', '7777');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Sign In'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 3000));

  // Navigate to KDS Table Orders tab
  console.log('Navigating to KDS tab...');
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const tab = tabs.find(t => t.textContent.includes('KDS Table Orders'));
    if (tab) tab.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  // Screenshot KDS board with PENDING order
  await page.screenshot({ path: `${artDir}/screenshot_kds_pending.png` });
  console.log('Saved screenshot_kds_pending.png');

  // Click Start Preparing
  console.log('Marking KDS as PREPARING...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Start Preparing'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: `${artDir}/screenshot_kds_preparing.png` });
  console.log('Saved screenshot_kds_preparing.png');

  // Click Mark Ready
  console.log('Marking KDS as READY...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Mark Ready'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: `${artDir}/screenshot_kds_ready.png` });
  console.log('Saved screenshot_kds_ready.png');

  // Click Mark Served
  console.log('Marking KDS as SERVED...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Mark Served'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: `${artDir}/screenshot_kds_served.png` });
  console.log('Saved screenshot_kds_served.png');

  // Click Complete Payment
  console.log('Marking KDS as COMPLETED...');
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    const btn = buttons.find(b => b.textContent.includes('Complete Payment'));
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: `${artDir}/screenshot_kds_completed.png` });
  console.log('Saved screenshot_kds_completed.png');

  console.log('Closing browser...');
  await browser.close();
  console.log('All authenticated screenshots captured successfully!');
  process.exit(0);
}

run().catch(err => {
  console.error('Fatal error in script:', err);
  process.exit(1);
});
