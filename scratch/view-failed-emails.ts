import { prisma } from '../src/lib/db';

async function main() {
  console.log("Checking failed emails in SQLite...");
  const failedEmails = await prisma.emailLog.findMany({
    where: {
      status: 'FAILED'
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  console.log(`Found ${failedEmails.length} failed emails.`);
  failedEmails.forEach(e => {
    console.log(`- ID: ${e.id}`);
    console.log(`  To: ${e.to}`);
    console.log(`  Subject: ${e.subject}`);
    console.log(`  Status: ${e.status}`);
    console.log(`  Error: ${e.errorMessage}`);
    console.log(`  Created At: ${e.createdAt}`);
    console.log("-----------------------------------------");
  });
}

main().catch(console.error);
