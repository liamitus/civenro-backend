// src/scripts/fetchBills.ts

import axios from 'axios';
import { PrismaClient, Bill } from '@prisma/client';
import dayjs from 'dayjs';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});
const BASE_URL = 'https://www.govtrack.us/api/v2';

export async function fetchBillsFunction() {
  try {
    let lastBill = await prisma.bill.findFirst({
      orderBy: { introducedDate: 'desc' },
    });
    const startDate = lastBill
      ? dayjs(lastBill.introducedDate).subtract(6, 'months')
      : dayjs('1980-01-01');
    const endDate = dayjs();
    let currentDate = startDate;

    while (currentDate.isBefore(endDate)) {
      const nextDate = currentDate.add(1, 'month');
      const params = {
        introduced_date__gte: currentDate.format('YYYY-MM-DD'),
        introduced_date__lt: nextDate.format('YYYY-MM-DD'),
        limit: 1000,
        order_by: '-introduced_date',
      };

      const response = await axios.get(`${BASE_URL}/bill`, { params });
      const bills = response.data.objects;

      console.log(
        `Fetched ${bills.length} bills from ${currentDate.format(
          'YYYY-MM-DD'
        )} to ${nextDate.format('YYYY-MM-DD')}`
      );

      for (const bill of bills) {
        // Construct billId
        const billId = `${bill.bill_type}-${bill.number}-${bill.congress}`; // e.g., "senate_bill-5342-118"
        console.log(`Processing bill ${billId}`);
        try {
          await prisma.bill.upsert({
            where: { billId },
            update: {
              title: bill.title_without_number,
              date: new Date(bill.introduced_date),
              billType: bill.bill_type,
              currentChamber: bill.current_chamber,
              currentStatus: bill.current_status,
              currentStatusDate: new Date(bill.current_status_date),
              introducedDate: new Date(bill.introduced_date),
              link: bill.link,
            },
            create: {
              billId,
              title: bill.title_without_number,
              date: new Date(bill.introduced_date),
              billType: bill.bill_type,
              currentChamber: bill.current_chamber,
              currentStatus: bill.current_status,
              currentStatusDate: new Date(bill.current_status_date),
              introducedDate: new Date(bill.introduced_date),
              link: bill.link,
            },
          });

          console.log(`Upserted bill ${billId}`);
        } catch (error: any) {
          console.error(`Error upserting bill ${billId}:`, error.message);
        }
      }

      // Add a delay to respect API rate limits
      await new Promise((resolve) => setTimeout(resolve, 500)); // 500ms delay

      currentDate = nextDate;
    }

    console.log('Bills fetched and stored successfully.');
  } catch (error: any) {
    console.error('Error fetching bills:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}
