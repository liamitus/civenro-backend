// src/scripts/fetchBillText.ts

import { PrismaClient } from '@prisma/client';
import axios from 'axios';
import dayjs from 'dayjs';
import { BillTextService } from '../services/BillTextService';
import { parseBillId } from '../utils/parseBillId';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

/**
 * Main function to fetch the *latest* text for bills that don’t yet have text
 */
export async function fetchBillTextFunction() {
  try {
    // 1. Find bills that have no associated text yet (or a specific one for testing)
    const billsNeedingText = await prisma.bill.findMany({
      where: {
        billId: 'house_bill-9326-118', // For example
      },
      // limit the number of bills each run to manage rate limits
      take: 10,
    });
    // const billsNeedingText = await prisma.bill.findMany({
    //   where: {
    //     billTexts: {
    //       none: {},
    //     },
    //   },
    //   // limit the number of bills each run to manage rate limits
    //   take: 10,
    // });

    console.log(`Found ${billsNeedingText.length} bills needing text.`);

    // 2. Iterate through each bill and retrieve text
    for (const bill of billsNeedingText) {
      try {
        const { congress, apiBillType, billNumber } = parseBillId(bill.billId);
        if (!congress || !apiBillType || !billNumber) {
          console.warn(`Skipping bill ${bill.billId} — invalid parse.`);
          continue;
        }

        console.log(`Fetching text versions for Bill: ${bill.billId}`);

        // 3. Get the latest version via BillTextService
        const latestVersion = await BillTextService.fetchLatestTextVersion(
          congress,
          apiBillType,
          billNumber
        );

        if (!latestVersion) {
          console.warn(`No textVersions found for ${bill.billId}.`);
          continue;
        }

        // 4. Download the formatted XML & raw text
        const { rawXml, rawText } = await BillTextService.downloadTextFormats(
          latestVersion,
          bill.billId
        );
        if (!rawXml) {
          console.warn(`XML response was empty for ${bill.billId}. Skipping.`);
          continue;
        }

        // 5. Parse the XML to get section data
        const sections = await BillTextService.parseXmlIntoSections(rawXml);

        debugger;

        // // 6. Store the sections
        // for (const sec of sections) {
        //   const { heading, content } = sec;
        //   if (!content || content.trim().length < 20) {
        //     continue; // skip near-empty sections
        //   }
        //   await prisma.billText.create({
        //     data: {
        //       billId: bill.id, // numeric PK from Bill
        //       heading,
        //       text: content,
        //     },
        //   });
        // }

        console.log(
          `Saved ${sections.length} sections of text for Bill ${bill.billId}.`
        );
      } catch (error: any) {
        console.error(`Error processing bill ${bill.billId}:`, error?.message);
      }

      // 7. Respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.log('Finished fetching bill texts.');
  } catch (error: any) {
    console.error('Error in fetchBillText:', error?.message);
  } finally {
    await prisma.$disconnect();
  }
}

// For direct CLI invocation:
if (require.main === module) {
  fetchBillTextFunction();
}
