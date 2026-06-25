import http from 'http';
import { createApp } from './app';
import { env } from './lib/env';
import { initRealtime } from './lib/realtime';
import { startReminderJobs } from './jobs/reminders';

const app = createApp();
const server = http.createServer(app);

initRealtime(server);
startReminderJobs();

server.listen(env.port, () => {
  console.log(`\n  Зерде Керамика Актобе — CRM API`);
  console.log(`  ➜ http://localhost:${env.port}/api`);
  console.log(`  ➜ БД: ${env.databaseProvider}  |  Хранилище: ${env.storageDriver}\n`);
});
