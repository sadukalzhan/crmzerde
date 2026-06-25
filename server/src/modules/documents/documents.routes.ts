import { Router } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticate } from '../../middleware/auth';
import { asyncHandler, badRequest, forbidden } from '../../middleware/error';
import { upload, fileUrl, deleteFile } from '../../lib/storage';

const router = Router();
router.use(authenticate);

const DOC_TYPES = ['TTN', 'UPD', 'ACT', 'INVOICE', 'OTHER'] as const;

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const orderId = req.query.orderId as string | undefined;
    const where = orderId
      ? { orderId }
      : req.user!.role === 'CLIENT'
        ? { order: { client: { userId: req.user!.id } } }
        : {};
    res.json(
      await prisma.document.findMany({
        where,
        include: { uploadedBy: { select: { fullName: true } }, order: { select: { number: true } } },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }),
);

// Загрузка файла (multipart/form-data): file + orderId + type + name?
router.post(
  '/',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('Файл не передан');
    const { orderId, type, name } = req.body as { orderId?: string; type?: string; name?: string };
    if (!orderId || !type || !DOC_TYPES.includes(type as never)) {
      deleteFile(req.file.filename);
      throw badRequest('Укажите orderId и корректный тип документа');
    }

    // Клиент может загружать только АКТ и только по своей заявке.
    if (req.user!.role === 'CLIENT') {
      const profile = await prisma.client.findUnique({ where: { userId: req.user!.id } });
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order || order.clientId !== profile?.id || type !== 'ACT') {
        deleteFile(req.file.filename);
        throw forbidden('Клиент может загрузить только акт по своей заявке');
      }
    }

    const doc = await prisma.document.create({
      data: {
        orderId,
        type,
        name: name || req.file.originalname,
        fileUrl: fileUrl(req.file.filename),
        uploadedById: req.user!.id,
      },
    });
    res.status(201).json(doc);
  }),
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (!['MANAGER', 'ADMIN'].includes(req.user!.role)) throw forbidden();
    const doc = await prisma.document.findUniqueOrThrow({ where: { id: req.params.id } });
    const filename = decodeURIComponent(doc.fileUrl.split('/').pop() ?? '');
    if (filename) deleteFile(filename);
    await prisma.document.delete({ where: { id: doc.id } });
    res.json({ ok: true });
  }),
);

export default router;
