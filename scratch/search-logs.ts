import * as fs from 'fs';
import * as readline from 'readline';

async function main() {
  const logPath = 'C:\\Users\\vs242\\.gemini\\antigravity\\brain\\a4322c36-a32f-4ac7-8d1b-4c4fc8af688b\\.system_generated\\logs\\transcript_full.jsonl';
  
  if (!fs.existsSync(logPath)) {
    console.error("Log file not found!");
    return;
  }

  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineCount = 0;
  for await (const line of rl) {
    lineCount++;
    if (line.toLowerCase().includes('postgresql://') || line.toLowerCase().includes('postgres://') || line.toLowerCase().includes('database_url')) {
      console.log(`Found on Line ${lineCount}:`);
      console.log(line.substring(0, 1000));
    }
  }
  console.log("Search finished.");
}

main().catch(console.error);
