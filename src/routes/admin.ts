// src/routes/admin.ts

import { Router } from 'express';
import { fetchBillsFunction } from '../scripts/fetchBills';
import { fetchRepresentativesFunction } from '../scripts/fetchRepresentatives';
import { fetchVotesFunction } from '../scripts/fetchVotes';

const router = Router();

// Basic authentication or token check (Pseudo-code)
router.use((req, res, next) => {
  const token = req.headers['x-api-key'];
  if (token !== process.env.ADMIN_API_KEY) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  next();
});

router.post('/fetch-bills', async (req, res) => {
  try {
    await fetchBillsFunction();
    res.json({ message: 'Bills fetched successfully.' });
  } catch (error: any) {
    console.error('Error in fetch-bills endpoint:', error.message);
    res.status(500).json({ error: 'Failed to fetch bills.' });
  }
});

router.post('/fetch-representatives', async (req, res) => {
  try {
    await fetchRepresentativesFunction();
    res.json({ message: 'Representatives fetched successfully.' });
  } catch (error: any) {
    console.error('Error in fetch-representatives endpoint:', error.message);
    res.status(500).json({ error: 'Failed to fetch representatives.' });
  }
});

router.post('/fetch-votes', async (req, res) => {
  try {
    await fetchVotesFunction();
    res.json({ message: 'Votes fetched successfully.' });
  } catch (error: any) {
    console.error('Error in fetch-votes endpoint:', error.message);
    res.status(500).json({ error: 'Failed to fetch votes.' });
  }
});

export default router;
