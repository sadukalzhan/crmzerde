import { Router } from 'express';
import fs from 'fs';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';
import { asyncHandler, forbidden, notFound } from '../../middleware/error';
import { filePath } from '../../lib/storage';

const router = Router();
router.use(authenticate);

// Защищённая выдача файлов: клиент получает только файлы по своим заявкам.
router.get(
  '/:name',
  asyncHandler(async (req, res) => {
    const name = req.params.name;
    const url = `/api/files/${name}`;

    if (req.user!.role === 'CLIENT') {
      const profile = await prisma.client.findUnique({ where: { userId: req.user!.id } });
      const doc = await prisma.document.findFirst({
        where: { fileUrl: url, order: { clientId: profile?.id ?? '__none__' } },
      });
      if (!doc) throw forbidden('Нет доступа к файлу');
    }

    const abs = filePath(decodeURIComponent(name));
    if (!fs.existsSync(abs)) throw notFound('Файл не найден');
    res.sendFile(abs);
  }),
);

export default router;
