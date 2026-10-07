import express from 'express';
import cors from 'cors';
import { initDatabase } from './db/init.js';
import authRoutes from './routes/auth.js';
import batchRoutes from './routes/batches.js';
import jobRoutes from './routes/jobs.js';
import claimRoutes from './routes/claims.js';
import summaryRoutes from './routes/summary.js';
import auditRoutes from './routes/audit.js';
import ruleRoutes from './routes/rules.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

async function start() {
  // Initialize database
  await initDatabase();

  // Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/batches', batchRoutes);
  app.use('/api/jobs', jobRoutes);
  app.use('/api/claims', claimRoutes);
  app.use('/api/summary', summaryRoutes);
  app.use('/api/audit', auditRoutes);
  app.use('/api/rules', ruleRoutes);

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', backend: 'local' });
  });

  // Error handler
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Error:', err);
    res.status(err.status || 500).json({
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Internal server error',
      detail: err.detail,
    });
  });

  app.listen(PORT, () => {
    console.log(`Bridge API listening on port ${PORT}`);
    console.log(`Backend mode: local-gnucobol`);
  });
}

start().catch(console.error);
