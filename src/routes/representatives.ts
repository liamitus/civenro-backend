// src/routes/representatives.ts

import { Router, Request, Response } from 'express';
import { getRepresentativesByAddress } from '../utils/civicApi';
import prisma from '../prismaClient';

const router = Router();

type Representative = {
  bioguideId: string;
  name: string;
  party: string;
  office: string;
  chamber: string;
};

// POST /api/representatives/by-address
router.post('/by-address', async (req: Request, res: Response) => {
  const { address, billId } = req.body;

  if (!address || !billId) {
    return res.status(400).json({ error: 'Address and billId are required' });
  }

  try {
    const data = await getRepresentativesByAddress(address);

    // Process the data to extract representatives
    const { officials } = data;

    const extractBioguideId = (photoUrl: string): string => {
      const match = photoUrl?.match(
        /bioguide\.congress\.gov\/[A-Z]\/([A-Z0-9]+)\.jpg$/
      );
      return match ? match[1] : '';
    };

    const reps: Representative[] = officials.map(
      (official: Record<string, unknown>) => ({
        name: official.name,
        party: official.party,
        office: official.officeName || '',
        bioguideId:
          official.bioguideId ||
          (typeof official.photoUrl === 'string'
            ? extractBioguideId(official.photoUrl)
            : 'unknown'),
        chamber: official.chamber || '',
      })
    );

    // Fetch the bill from the database
    const bill = await prisma.bill.findUnique({
      where: { id: parseInt(billId) },
    });

    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    // Determine relevant chambers based on bill type
    const relevantChambers: string[] = [];

    if (bill.billType.startsWith('house_')) {
      relevantChambers.push('representative');
    } else if (bill.billType.startsWith('senate_')) {
      relevantChambers.push('senator');
    }

    // Include other chamber if the bill has passed the current chamber
    if (bill.currentStatus === 'passed_house') {
      relevantChambers.push('senator');
    } else if (bill.currentStatus === 'passed_senate') {
      relevantChambers.push('representative');
    }

    // For each representative, fetch their vote on the bill
    const repsWithVotes = await Promise.all(
      reps.map(async (rep) => {
        // If the Civic API provides bioguideId, use it
        const bioguideId = rep.bioguideId;

        let dbRep;

        if (bioguideId) {
          dbRep = await prisma.representative.findUnique({
            where: { bioguideId },
          });
        } else {
          // Normalize names
          const normalizeName = (name: string) =>
            name.toLowerCase().replace(/[^a-z]/g, '');
          const officialFirstName = normalizeName(rep.name.split(' ')[0]);
          const officialLastName = normalizeName(
            rep.name.split(' ').slice(1).join(' ')
          );

          dbRep = await prisma.representative.findFirst({
            where: {
              firstName: { contains: officialFirstName, mode: 'insensitive' },
              lastName: { contains: officialLastName, mode: 'insensitive' },
            },
          });
        }

        if (dbRep) {
          // Get their vote on the bill
          const repVote = await prisma.representativeVote.findUnique({
            where: {
              representativeId_billId: {
                representativeId: dbRep.id,
                billId: parseInt(billId),
              },
            },
          });

          return {
            ...rep,
            ...dbRep,
            vote: repVote?.vote || 'No vote recorded',
            imageUrl: dbRep.imageUrl,
            link: dbRep.link,
          };
        } else {
          return {
            ...rep,
            vote: 'Representative not found in database',
            imageUrl: null, // Or provide a default image URL
            link: null, // Or provide a default link
          };
        }
      })
    );

    // Filter representatives based on relevant chambers
    const filteredReps = repsWithVotes.filter((rep) =>
      relevantChambers.includes(rep.chamber)
    );

    res.status(200).json({ representatives: filteredReps });
  } catch (error) {
    console.error('Error fetching representatives:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
