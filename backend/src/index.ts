import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import pino from 'pino';

import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './routes/auth.routes.js';
import { userRouter } from './routes/user.routes.js';
import { chatRouter } from './routes/chat.routes.js';
import { adminRouter, seedAdmin } from './routes/admin.routes.js';

const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
});

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());
app.use(
  pinoHttp({
    logger,
    // evitamos loggear cuerpo de mensajes por privacidad (RD-06)
    serializers: {
      req: (req) => ({ method: req.method, url: req.url, id: req.id }),
    },
  })
);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRouter);
app.use('/api/user', userRouter);
app.use('/api/chat', chatRouter);
app.use('/api/admin', adminRouter);

app.use(errorHandler);

app.listen(env.PORT, async () => {
  logger.info(`UNIA backend listening on http://localhost:${env.PORT}`);
  // Auto-seed admin account on first run
  await seedAdmin().catch((err) => logger.error(err, 'Failed to seed admin'));
});
