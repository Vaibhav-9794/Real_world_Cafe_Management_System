const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf8');
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const equalIdx = trimmed.indexOf('=');
    if (equalIdx === -1) return;
    const key = trimmed.slice(0, equalIdx).trim();
    let val = trimmed.slice(equalIdx + 1).trim();
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    } else if (val.startsWith("'") && val.endsWith("'")) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  });
}

// Load env files
loadEnvFile(path.join(__dirname, '../.env'));
loadEnvFile(path.join(__dirname, '../.env.local'));

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Please specify a command to run.");
  process.exit(1);
}

const cmd = args[0];
const cmdArgs = args.slice(1);

const child = spawn(cmd, cmdArgs, { stdio: 'inherit', shell: true });
child.on('close', code => {
  process.exit(code);
});
