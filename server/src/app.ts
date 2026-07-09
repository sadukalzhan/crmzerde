import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import fs from 'fs';
import { env } from './lib/env';
import { errorHandler } from './middleware/error';

import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import clientsRoutes from './modules/clients/clients.routes';
import productsRoutes from './modules/products/products.routes';
import ordersRoutes from './modules/orders/orders.routes';
import refsRoutes from './modules/refs/refs.routes';
import specificationsRoutes from './modules/specifications/specifications.routes';
import contractsRoutes from './modules/contracts/contracts.routes';
import documentsRoutes from './modules/documents/documents.routes';
import filesRoutes from './modules/files/files.routes';
import productionRoutes from './modules/production/production.routes';
import inventoryRoutes from './modules/inventory/inventory.routes';
import reservationsRoutes from './modules/reservations/reservations.routes';
import claimsRoutes from './modules/claims/claims.routes';
import notificationsRoutes from './modules/notifications/notifications.routes';
import analyticsRoutes from './modules/analytics/analytics.routes';
import settingsRoutes from './modules/settings/settings.routes';
import metaRoutes from './modules/meta/meta.routes';

export function createApp() {
  const app = express();

  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(express.json({ limit: '2mb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

  app.use('/api/auth', authRoutes);
  app.use('/api/meta', metaRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/clients', clientsRoutes);
  app.use('/api/products', productsRoutes);
  app.use('/api/orders', ordersRoutes);
  app.use('/api/refs', refsRoutes);
  app.use('/api/specifications', specificationsRoutes);
  app.use('/api/contracts', contractsRoutes);
  app.use('/api/documents', documentsRoutes);
  app.use('/api/files', filesRoutes);
  app.use('/api/production', productionRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/reservations', reservationsRoutes);
  app.use('/api/claims', claimsRoutes);
  app.use('/api/notifications', notificationsRoutes);
  app.use('/api/analytics', analyticsRoutes);

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Маршрут не найден' }));

  // Продакшен (Render): один сервис — Express отдаёт собранный фронтенд + SPA-fallback.
  const clientDist = path.resolve(__dirname, '../../client/dist');
  if (env.isProd && fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use(errorHandler);

  return app;
}
