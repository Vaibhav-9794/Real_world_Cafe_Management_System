const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1200';
const dest = path.join(__dirname, '../public/images/hero-poster.jpg');

// Ensure folder exists
const dir = path.dirname(dest);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

console.log(`Downloading poster from: ${url}`);
console.log(`Saving to: ${dest}`);

const file = fs.createWriteStream(dest);
const options = {
  rejectUnauthorized: false,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
};

const request = https.get(url, options, (response) => {
  if (response.statusCode === 301 || response.statusCode === 302) {
    console.log(`Redirected to: ${response.headers.location}`);
    file.close();
    fs.unlink(dest, () => {});
    // Fetch from redirect location
    https.get(response.headers.location, options, (redirectRes) => {
      redirectRes.pipe(fs.createWriteStream(dest)).on('finish', () => {
        console.log('✅ Poster download completed successfully via redirect!');
        process.exit(0);
      });
    });
    return;
  }

  if (response.statusCode !== 200) {
    console.error(`❌ Failed to download: Server returned status code ${response.statusCode}`);
    process.exit(1);
  }

  response.pipe(file);

  file.on('finish', () => {
    file.close();
    console.log('✅ Poster download completed successfully!');
    process.exit(0);
  });
});

request.on('error', (err) => {
  fs.unlink(dest, () => {});
  console.error(`❌ Download failed: ${err.message}`);
  process.exit(1);
});
