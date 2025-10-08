import { loadEnv } from './utils/env.js';
import app from './app.js';
import { ensureSuperAdmin } from './services/bootstrap.js';

loadEnv();

const PORT = process.env.PORT || 4000;

async function start() {
  await ensureSuperAdmin();
  // eslint-disable-next-line no-console
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`PICCO backend listening on port ${PORT}`);
  });
}

start().catch((error) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start server', error);
  process.exit(1);
});
