import { createApp } from './app.js';
import { config } from './config.js';
import { migrate } from './db/migrate.js';
import { processOutbox, applyRetention } from './services/jobs.js';

await migrate();
createApp().listen(config.port, () => console.log(`Bolo API listening on :${config.port}`));
setInterval(() => processOutbox().catch(console.error), 30 * 1000);
setInterval(() => applyRetention().catch(console.error), 24 * 3600 * 1000);
