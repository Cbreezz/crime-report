import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const email = process.argv[2]?.trim().toLowerCase();

if (!email) {
  console.error("Usage: npm run promote:admin -- someone@example.com");
  process.exit(1);
}

const prisma = new PrismaClient();

try {
  const user = await prisma.user.update({
    where: { email },
    data: { role: "ADMIN" },
    select: { id: true, email: true, name: true, role: true },
  });
  console.log(`Promoted ${user.email} (${user.name}) to ${user.role}.`);
} catch (error) {
  if (error?.code === "P2025") {
    console.error(`No user found with email ${email}. Create the account first.`);
    process.exitCode = 1;
  } else {
    throw error;
  }
} finally {
  await prisma.$disconnect();
}
