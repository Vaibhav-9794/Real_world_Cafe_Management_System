const net = require('net');

const host = 'aws-1-ap-northeast-1.pooler.supabase.com';
const ports = [5432, 6543];

function testPort(port) {
  return new Promise((resolve) => {
    console.log(`Connecting to ${host}:${port}...`);
    const socket = new net.Socket();
    const startTime = Date.now();

    socket.setTimeout(5000);

    socket.connect(port, host, () => {
      console.log(`✅ SUCCESS: Connected to ${host}:${port} in ${Date.now() - startTime}ms`);
      socket.destroy();
      resolve(true);
    });

    socket.on('error', (err) => {
      console.log(`❌ FAILED: Connection to ${host}:${port} failed (${err.message})`);
      socket.destroy();
      resolve(false);
    });

    socket.on('timeout', () => {
      console.log(`❌ TIMEOUT: Connection to ${host}:${port} timed out after 5000ms`);
      socket.destroy();
      resolve(false);
    });
  });
}

async function main() {
  for (const port of ports) {
    await testPort(port);
  }
}

main();
