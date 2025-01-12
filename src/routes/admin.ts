// src/routes/admin.ts

import { Router } from 'express';
import { fetchBillsFunction } from '../scripts/fetchBills';
import { fetchRepresentativesFunction } from '../scripts/fetchRepresentatives';
import { fetchVotesFunction } from '../scripts/fetchVotes';
import { fetchBillTextFunction } from '../scripts/fetchBillText';

const router = Router();

// Basic authentication or token check (Pseudo-code)
router.use((req, res, next) => {
  const token = req.headers['x-api-key'];
  if (
    process.env.NODE_ENV !== 'development' &&
    token !== process.env.ADMIN_API_KEY
  ) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});

router.post('/fetch-bills', async (req, res) => {
  try {
    await fetchBillsFunction();
    res.json({ message: 'Bills fetched successfully.' });
  } catch (error: unknown) {
    console.error('Error in fetch-bills endpoint:', (error as Error).message);
    res.status(500).json({ error: 'Failed to fetch bills.' });
  }
});

router.post('/fetch-representatives', async (req, res) => {
  try {
    await fetchRepresentativesFunction();
    res.json({ message: 'Representatives fetched successfully.' });
  } catch (error: unknown) {
    console.error(
      'Error in fetch-representatives endpoint:',
      (error as Error).message
    );
    res.status(500).json({ error: 'Failed to fetch representatives.' });
  }
});

router.post('/fetch-votes', async (req, res) => {
  try {
    await fetchVotesFunction();
    res.json({ message: 'Votes fetched successfully.' });
  } catch (error: unknown) {
    console.error('Error in fetch-votes endpoint:', (error as Error).message);
    res.status(500).json({ error: 'Failed to fetch votes.' });
  }
});

router.post('/fetch-bill-text', async (req, res) => {
  try {
    await fetchBillTextFunction();
    res.json({ message: 'Bill text fetched successfully.' });
  } catch (error: unknown) {
    console.error(
      'Error in fetch-bill-text endpoint:',
      (error as Error).message
    );
    res.status(500).json({ error: 'Failed to fetch bill text.' });
  }
});

export default router;
