#!/usr/bin/env bash
# Сборка для Render (один web-сервис: backend + собранный frontend).
set -e

echo "==> Установка зависимостей"
npm install --prefix server --include=dev
npm install --prefix client --include=dev

echo "==> Переключение Prisma на PostgreSQL"
node server/scripts/set-db-provider.js postgresql

echo "==> Сборка фронтенда"
npm run build --prefix client

echo "==> Сборка бэкенда"
npm run build --prefix server

echo "==> Применение схемы к БД + генерация клиента Prisma"
cd server
npx prisma generate
npx prisma db push --skip-generate --accept-data-loss

echo "==> Сид демо-данными (только если БД пустая)"
npx tsx scripts/seed-if-empty.ts

echo "==> Готово"
