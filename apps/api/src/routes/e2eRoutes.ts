import express from 'express';
import { resetE2EDatabase, seedE2EDatabase } from '../controllers/E2EController';

const router = express.Router();

// Middleware to verify E2E secret token
const verifyE2EToken = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void => {
  const token = req.header('X-E2E-Secret');
  const expectedToken = process.env.E2E_SECRET_TOKEN;

  if (!expectedToken) {
    res.status(503).json({ error: 'E2E endpoints not configured' });
    return;
  }

  if (token !== expectedToken) {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  next();
};

// Only enable in non-production environments
if (process.env.NODE_ENV !== 'production') {
  router.post('/reset', verifyE2EToken, resetE2EDatabase);
  router.post('/seed', verifyE2EToken, seedE2EDatabase);
}

export default router;
