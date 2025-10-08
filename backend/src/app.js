import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import router from './routes/index.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandlers.js';
import { loadEnv } from './utils/env.js';

const app = express();

loadEnv();

const normalizeOrigin = (origin) => {
  if (!origin) return origin;
  try {
    const { protocol, host } = new URL(origin);
    return `${protocol}//${host}`;
  } catch (error) {
    return origin.replace(/\/+$/, '');
  }
};

const allowedOriginsRaw = (process.env.ALLOWED_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOriginsNormalized = Array.from(
  new Set(allowedOriginsRaw.map((origin) => normalizeOrigin(origin)))
);

const allowAllOrigins = allowedOriginsNormalized.length === 0;

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowAllOrigins || allowedOriginsNormalized.includes('*')) {
        return callback(null, true);
      }
      const normalizedOrigin = normalizeOrigin(origin);
      if (allowedOriginsNormalized.includes(normalizedOrigin)) {
        return callback(null, true);
      }
      const corsError = new Error('Not allowed by CORS');
      corsError.status = 403;
      return callback(corsError);
    },
    credentials: true
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use('/api', router);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
