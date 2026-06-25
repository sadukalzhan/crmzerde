// Переключает provider в prisma/schema.prisma между sqlite и postgresql.
// Локально схема остаётся на sqlite; на Render билд вызывает: node scripts/set-db-provider.js postgresql
const fs = require('fs');
const path = require('path');

const target = process.argv[2] || 'postgresql';
if (!['sqlite', 'postgresql'].includes(target)) {
  console.error('Использование: node set-db-provider.js <sqlite|postgresql>');
  process.exit(1);
}

const file = path.join(__dirname, '..', 'prisma', 'schema.prisma');
const src = fs.readFileSync(file, 'utf8');
// Меняем только строку datasource (provider = "sqlite"|"postgresql"),
// не трогая generator (provider = "prisma-client-js").
const out = src.replace(/provider = "(sqlite|postgresql)"/, `provider = "${target}"`);
fs.writeFileSync(file, out);
console.log(`Prisma datasource provider → ${target}`);
