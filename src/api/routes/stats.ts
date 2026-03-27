import { Router, Request, Response } from 'express';
import { storageService } from '../../services/storageService';
import { getAllBaselines } from '../../core/rules/anomalyRules';

const router = Router();

// GET /api/stats — system-wide stats
router.get('/', (_req: Request, res: Response) => {
  const stats = storageService.getStats();
  const baselines = getAllBaselines();
  return res.json({ ...stats, baselines });
});

export default router;
