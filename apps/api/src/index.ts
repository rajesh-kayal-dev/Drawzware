import { createApp } from './app';
import { connectDB } from './config/db';
import { config } from './config';

const app = createApp();

async function startServer() {
  await connectDB(config.mongoUri);

  app.listen(config.port, () => {
    console.log(
      `Drawzware Collaboration API listening on port ${config.port} (environment: ${config.nodeEnv})`
    );
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
