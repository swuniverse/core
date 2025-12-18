import express from 'express';
import prisma from '../lib/prisma';

const router = express.Router();

// Get all factions
router.get('/', async (req, res) => {
  try {
    const factions = await prisma.faction.findMany({
      orderBy: { id: 'asc' },
    });
    res.json(factions);
  } catch (error) {
    console.error('Error fetching factions:', error);
    res.status(500).json({ error: 'Failed to fetch factions' });
  }
});

export default router;
