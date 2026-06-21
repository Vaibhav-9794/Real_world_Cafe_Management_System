const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://raw.githubusercontent.com/emjose/coffee-counter/master/coffee.mp4';
const dest = path.join(__dirname, '../public/videos/hero-video.mp4');

// Ensure folder exists
const dir = path.dirname(dest);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

console.log(`Downloading premium coffee video from: ${url}`);
console.log(`Saving to: ${dest}`);

const file = fs.createWriteStream(dest);
const options = {
  rejectUnauthorized: false,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  }
};

const request = https.get(url, options, (response) => {
  if (response.statusCode !== 200) {
    console.error(`❌ Failed to download: Server returned status code ${response.statusCode}`);
    process.exit(1);
  }

  response.pipe(file);

  file.on('finish', () => {
    file.close();
    console.log('✅ Premium coffee video download completed successfully!');
    process.exit(0);
  });
});

request.on('error', (err) => {
  fs.unlink(dest, () => {});
  console.error(`❌ Download failed: ${err.message}`);
  process.exit(1);
});
