import { Router, Request, Response } from 'express';
import { query, validationResult } from 'express-validator';
import { storageService } from '../../services/storageService';

const router = Router();

// GET /api/events — list recent events
router.get(
  '/',
  [
    query('limit').optional().isInt({ min: 1, max: 500 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
    query('type').optional().isString().trim(),
  ],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const limit = (req.query.limit as unknown as number) || 100;
    const offset = (req.query.offset as unknown as number) || 0;
    const type = req.query.type as string | undefined;

    const events = type
      ? storageService.getEventsByType(type, limit)
      : storageService.getRecentEvents(limit, offset);

    return res.json({ events, count: events.length });
  }
);

export default router;
