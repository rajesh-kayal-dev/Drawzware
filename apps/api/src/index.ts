import { createApp } from './app';
import { config } from './config';

const app = createApp();

app.listen(config.port, () => {
  console.log(`Drawzware Collaboration API listening on port ${config.port} (environment: ${config.nodeEnv})`);
});
