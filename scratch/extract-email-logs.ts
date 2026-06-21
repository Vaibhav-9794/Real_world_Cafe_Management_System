import { prisma } from '../src/lib/db';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log("Extracting EmailLog records from SQLite...");
  
  const logs = await prisma.emailLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 25
  });

  console.log(`Found ${logs.length} total email logs in database.`);

  let mdContent = `# BOHO Cafe & Dining - Email Delivery Log Report\n\n`;
  mdContent += `This report lists the email dispatches recorded in the database during the E2E integration test run on the live Resend configuration.\n\n`;
  mdContent += `| # | Subject | Recipient | Status | Attempts | Logged At | DB Log ID |\n`;
  mdContent += `|---|---------|-----------|--------|----------|-----------|-----------|\n`;

  logs.forEach((log, index) => {
    const formattedDate = new Date(log.createdAt).toISOString();
    mdContent += `| ${index + 1} | ${log.subject} | \`${log.to}\` | **${log.status}** | ${log.attempts} | \`${formattedDate}\` | \`${log.id}\` |\n`;
  });

  const artDir = 'C:\\Users\\vs242\\.gemini\\antigravity\\brain\\a4322c36-a32f-4ac7-8d1b-4c4fc8af688b';
  const outPath = path.join(artDir, 'email_delivery_proof_logs.md');
  
  fs.writeFileSync(outPath, mdContent);
  console.log(`Saved email delivery proof logs to: ${outPath}`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
