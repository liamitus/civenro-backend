// src/scripts/fetchVotes.ts

import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
const BASE_URL = 'https://www.govtrack.us/api/v2';

interface GovTrackBillData {
  bill_type: string;
  number: number;
  congress: number;
  introduced_date: string;
  current_chamber: string | null;
  current_status: string;
  current_status_date: string;
  link: string;
  title_without_number: string;
}

export async function fetchVotesFunction() {
  try {
    // Retrieve last fetched date or default to 2 years ago
    const lastFetchedSetting = await prisma.setting.findUnique({
      where: { key: 'lastFetched' },
    });
    const startDate = lastFetchedSetting
      ? dayjs(lastFetchedSetting.value)
      : dayjs().subtract(2, 'year');

    const endDate = dayjs();
    let currentDate = startDate;

    // Implement a cache for bills to avoid redundant API calls
    const billCache: Record<number, GovTrackBillData> = {};

    while (currentDate.isBefore(endDate)) {
      const nextDate = currentDate.add(1, 'day');
      const params = {
        created__gte: currentDate.format('YYYY-MM-DD'),
        created__lt: nextDate.format('YYYY-MM-DD'),
        limit: 1000,
        order_by: '-created',
      };

      const response = await axios.get(`${BASE_URL}/vote_voter`, { params });
      const voteVoters = response.data.objects;

      console.log(
        `Fetched ${voteVoters.length} votes from ${currentDate.format(
          'YYYY-MM-DD'
        )}`
      );

      for (const voteVoter of voteVoters) {
        try {
          const person = voteVoter.person;
          const vote = voteVoter.vote;

          // Use bioguideId to find the representative
          const bioguideId = person.bioguideid;

          if (!bioguideId) {
            console.warn(`No bioguideId for person: ${person.name}`);
            continue;
          }

          const representative = await prisma.representative.findUnique({
            where: { bioguideId },
          });

          if (!representative) {
            console.warn(`Representative not found: ${person.name}`);
            continue;
          }

          // Check if the vote is related to a bill
          const relatedBillId = vote.related_bill;

          if (!relatedBillId) {
            // Skip votes that are not related to a bill
            continue;
          }

          // Fetch bill data if not already in cache
          let billData = billCache[relatedBillId];

          if (!billData) {
            const billResponse = await axios.get(
              `${BASE_URL}/bill/${relatedBillId}`
            );
            billData = billResponse.data as GovTrackBillData;
            billCache[relatedBillId] = billData; // Cache the bill data
          }

          // Construct billId
          const billId = `${billData.bill_type}-${billData.number}-${billData.congress}`;

          // Find or create the bill in the database
          const bill = await prisma.bill.upsert({
            where: { billId },
            update: {
              title: billData.title_without_number,
              date: new Date(billData.introduced_date),
              billType: billData.bill_type,
              currentChamber: billData.current_chamber,
              currentStatus: billData.current_status,
              currentStatusDate: new Date(billData.current_status_date),
              introducedDate: new Date(billData.introduced_date),
              link: billData.link,
            },
            create: {
              billId,
              title: billData.title_without_number,
              date: new Date(billData.introduced_date),
              billType: billData.bill_type,
              currentChamber: billData.current_chamber,
              currentStatus: billData.current_status,
              currentStatusDate: new Date(billData.current_status_date),
              introducedDate: new Date(billData.introduced_date),
              link: billData.link,
            },
          });

          // Upsert the representative's vote
          await prisma.representativeVote.upsert({
            where: {
              representativeId_billId: {
                representativeId: representative.id,
                billId: bill.id,
              },
            },
            update: {
              vote: voteVoter.option.value,
            },
            create: {
              representativeId: representative.id,
              billId: bill.id,
              vote: voteVoter.option.value,
            },
          });
        } catch (error: unknown) {
          console.error('Error processing vote:', (error as Error).message);
        }
      }

      currentDate = nextDate;
    }

    await prisma.setting.upsert({
      where: { key: 'lastFetched' },
      update: { value: endDate.toISOString() },
      create: { key: 'lastFetched', value: endDate.toISOString() },
    });

    console.log('Votes fetched and stored successfully.');
  } catch (error: unknown) {
    console.error('Error fetching votes:', (error as Error).message);
  } finally {
    await prisma.$disconnect();
  }
}
