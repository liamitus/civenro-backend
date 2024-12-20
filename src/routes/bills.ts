// src/routes/bills.ts

import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const router = Router();
const prisma = new PrismaClient();

interface GovTrackApiBill {
  display_number?: string;
  number?: number;
  title_without_number?: string;
  title?: string;
  introduced_date?: string;
  current_status?: string;
  current_status_date?: string;
  current_chamber?: string;
  bill_type?: string;
  link?: string;
}

interface GovTrackBillApiResponse {
  objects: GovTrackApiBill[];
}

// Fetch bills from API and cache in database
router.get('/', async (req, res) => {
  console.log('Retrieving bills...');

  // Extract query parameters with default values
  const {
    page = '1',
    limit = '20',
    chamber,
    status,
    sortBy = 'introducedDate',
    order = 'desc',
    search,
  } = req.query;

  // Convert page and limit to numbers
  const pageNumber = parseInt(page as string, 10);
  const pageSize = parseInt(limit as string, 10);
  const skip = (pageNumber - 1) * pageSize;

  // Build Prisma query filters
  const filters: Record<string, unknown> = {};

  // Filtering by chamber
  if (chamber && chamber !== 'both') {
    filters.currentChamber = chamber.toString().toLowerCase();
  }

  // Filtering by status
  if (status) {
    filters.currentStatus = status.toString().toLowerCase();
  }

  // Search by title
  if (search) {
    filters.title = {
      contains: search.toString(),
      mode: 'insensitive',
    };
  }

  // Build sorting option
  const sortOptions: Record<string, unknown> = {};
  sortOptions[sortBy as string] = order as string;

  try {
    // Check if bills are already in the database
    let billsCount = await prisma.bill.count({ where: filters });

    // Fetch bills from the database with pagination, filtering, sorting, and search
    let bills = await prisma.bill.findMany({
      where: filters,
      skip,
      take: pageSize,
      orderBy: sortOptions,
    });

    // If no bills are found in the database, fetch from the GovTrack API
    if (bills.length === 0 && pageNumber === 1) {
      // Fetch bills from the GovTrack API
      const response = await axios.get<GovTrackBillApiResponse>(
        'https://www.govtrack.us/api/v2/bill',
        {
          params: {
            congress: '118', // Current Congress session
            order_by: `-${sortBy}`, // Latest bills first
            limit: 1000, // Fetch more bills to populate the database
          },
        }
      );

      // Process and save bills to the database
      const billsData = response.data.objects;
      const processedBills = billsData.map((bill: GovTrackApiBill) => ({
        billId:
          bill.display_number ??
          (bill.number ? bill.number.toString() : 'UnknownBillId'),
        title: bill.title_without_number ?? bill.title ?? 'No title available.',
        summary: bill.title_without_number ?? 'No summary available.',
        date: new Date(bill.introduced_date ?? '1970-01-01'),
        introducedDate: new Date(bill.introduced_date ?? '1970-01-01'),
        currentStatus: bill.current_status ?? 'unknown',
        currentStatusDate: new Date(bill.current_status_date ?? '1970-01-01'),
        currentChamber: bill.current_chamber?.toLowerCase() ?? 'unknown',
        billType: bill.bill_type ?? 'unknown',
        link: bill.link ?? '',
      }));

      // Save the bills to the database using Prisma's createMany
      await prisma.bill.createMany({
        data: processedBills,
        skipDuplicates: true, // Avoids error if the bill already exists
      });

      // Retrieve the bills again from the database
      billsCount = await prisma.bill.count({ where: filters });
      bills = await prisma.bill.findMany({
        where: filters,
        skip,
        take: pageSize,
        orderBy: sortOptions,
      });
    }

    // Send the bills and total count for pagination
    res.json({
      total: billsCount,
      page: pageNumber,
      pageSize,
      bills,
    });
  } catch (error: unknown) {
    console.error('Error fetching bills:', error);
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

// Get a single bill by ID
router.get('/:id', async (req, res) => {
  const billId = parseInt(req.params.id);
  try {
    const bill = await prisma.bill.findUnique({
      where: { id: billId },
    });

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    res.json(bill);
  } catch (error: unknown) {
    console.error('Error fetching bill:', error);
    res.status(500).json({ error: 'Failed to fetch bill' });
  }
});

export default router;
