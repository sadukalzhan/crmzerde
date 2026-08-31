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
    // Express отдаёт параметр уже раскодированным, а в базе ссылка хранится
    // закодированной — сравнивать надо в том же виде, иначе доступ не находится.
    const name = req.params.name;
    const url = `/api/files/${encodeURIComponent(name)}`;

    if (req.user!.role === 'CLIENT') {
      const profile = await prisma.client.findUnique({ where: { userId: req.user!.id } });
      const clientId = profile?.id ?? '__none__';

      // Файл может быть как документом заявки, так и сканом спецификации:
      // раньше проверялись только документы, и подписанные спецификации
      // клиенту не отдавались.
      const [doc, spec] = await Promise.all([
        prisma.document.findFirst({ where: { fileUrl: url, order: { clientId } } }),
        prisma.specification.findFirst({
          where: {
            OR: [{ managerFileUrl: url }, { clientFileUrl: url }],
            order: { clientId },
          },
        }),
      ]);
      if (!doc && !spec) throw forbidden('Нет доступа к файлу');
    }

    const abs = filePath(decodeURIComponent(name));
    if (!fs.existsSync(abs)) throw notFound('Файл не найден');
    res.sendFile(abs);
  }),
);

export default router;
