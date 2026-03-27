import { Router, Request, Response } from 'express';
import { param, query, validationResult } from 'express-validator';
import { storageService } from '../../services/storageService';
import { sanitizeIP } from '../../utils/ipUtils';

const router = Router();

// GET /api/alerts — list recent alerts
router.get(
  '/',
  [
    query('limit').optional().isInt({ min: 1, max: 500 }).toInt(),
    query('offset').optional().isInt({ min: 0 }).toInt(),
  ],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const limit = (req.query.limit as unknown as number) || 100;
    const offset = (req.query.offset as unknown as number) || 0;

    const alerts = storageService.getRecentAlerts(limit, offset);
    return res.json({ alerts, count: alerts.length });
  }
);

// GET /api/alerts/ip/:ip — get alerts for a specific IP
router.get(
  '/ip/:ip',
  [param('ip').notEmpty()],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const ip = sanitizeIP(req.params.ip);
    const alerts = storageService.getAlertsByIP(ip);
    return res.json({ alerts, ip });
  }
);

// PATCH /api/alerts/:id/acknowledge — acknowledge an alert
router.patch(
  '/:id/acknowledge',
  [param('id').isUUID()],
  (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const success = storageService.acknowledgeAlert(req.params.id);
    if (!success) return res.status(404).json({ error: 'Alert not found' });
    return res.json({ success: true });
  }
);

export default router;
