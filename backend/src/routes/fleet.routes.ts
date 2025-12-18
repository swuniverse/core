import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.get('/', authMiddleware, (req, res) => {
  res.json({ message: 'Get fleets - to be implemented' });
});

router.post('/move', authMiddleware, (req, res) => {
  res.json({ message: 'Move fleet - to be implemented' });
});

export default router;
