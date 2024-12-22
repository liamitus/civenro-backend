// scripts/seed.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create a test user
  const user = await prisma.user.create({
    data: {
      username: 'seeduser',
      email: 'seed@example.com',
      password: 'hashedDummyPassword123', // Use a dummy hashed password if your logic requires hashing
    },
  });

  // Create a test bill
  const bill = await prisma.bill.create({
    data: {
      billId: 'hr-1',
      title: 'Test Bill for E2E',
      date: new Date(),
      billType: 'HR',
      currentStatus: 'introduced',
      currentStatusDate: new Date(),
      introducedDate: new Date(),
      link: 'http://example.com/bills/hr-1',
    },
  });

  // Create a representative
  const representative = await prisma.representative.create({
    data: {
      bioguideId: 'A000360',
      firstName: 'Jane',
      lastName: 'Smith',
      state: 'CA',
      district: '12',
      party: 'D',
      chamber: 'house',
    },
  });

  // Create a representative vote
  await prisma.representativeVote.create({
    data: {
      representativeId: representative.id,
      billId: bill.id,
      vote: 'Yea',
    },
  });

  // Create a user vote on the bill
  await prisma.vote.create({
    data: {
      userId: user.id,
      billId: bill.id,
      voteType: 'For',
    },
  });

  // Create a comment
  await prisma.comment.create({
    data: {
      content: 'This is a test comment',
      userId: user.id,
      billId: bill.id,
      date: new Date(),
    },
  });

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
