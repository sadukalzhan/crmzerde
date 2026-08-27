import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { attachment } from '../../lib/download';
import { authenticate } from '../../middleware/auth';
import { requireRole } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { ApiError, asyncHandler, badRequest, forbidden } from '../../middleware/error';
import { notify } from '../../lib/notify';
import { renderPdf } from '../../lib/pdf';
import { buildSpecificationPdf } from './specification.pdf';
import { boxes as calcBoxes, pallets as calcPallets } from '../../domain/packaging';
import { DELIVERY_TERMS, SHIPMENT_TERMS, SPEC_PAYMENT_TERMS } from '../../domain/specTerms';
import { upload, fileUrl, deleteFile } from '../../lib/storage';

const router = Router();
router.use(authenticate);

/** Сквозная нумерация спецификаций, начиная с первой. */
async function nextSpecNumber(): Promise<string> {
  const specs = await prisma.specification.findMany({ select: { number: true } });
  const max = specs.reduce((m, s) => {
    const n = parseInt(String(s.number).replace(/\D/g, ''), 10);
    return Number.isFinite(n) && n > m ? n : m;
  }, 0);
  return String(max + 1);
}

async function assertOrderAccess(orderId: string, userId: string, role: string) {
  if (role === 'CLIENT') {
    const profile = await prisma.client.findUnique({ where: { userId } });
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.clientId !== profile?.id) throw forbidden();
  }
}

// Список спецификаций (по заявке или все — для раздела «Спецификации»).
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const orderId = req.query.orderId as string | undefined;
    if (orderId) await assertOrderAccess(orderId, req.user!.id, req.user!.role);

    const where = orderId
      ? { orderId }
      : req.user!.role === 'CLIENT'
        ? { order: { client: { userId: req.user!.id } } }
        : {};

    res.json(
      await prisma.specification.findMany({
        where,
        include: { items: true, order: { select: { number: true, status: true, client: { select: { companyName: true } } } } },
        orderBy: { createdAt: 'desc' },
      }),
    );
  }),
);

router.post(
  '/',
  requireRole('MANAGER', 'SALES_HEAD'),
  validateBody(
    z.object({
      orderId: z.string(),
      number: z.string().optional(),
      fileUrl: z.string().optional(),
      // Шапка и условия печатной формы.
      contractNumber: z.string().optional(),
      contractDate: z.string().optional(),
      city: z.string().optional(),
      currency: z.enum(['KZT', 'RUB']).default('KZT'),
      includesVat: z.boolean().default(true),
      // Поставка и сроки фиксированы регламентом, менеджер выбирает оплату.
      paymentTerms: z.enum(SPEC_PAYMENT_TERMS).default('PREPAYMENT'),
      items: z
        .array(
          z.object({
            productId: z.string().optional(),
            name: z.string(),
            format: z.string().default('60x60'),
            toneCaliber: z.string().optional(),
            grade: z.string().optional(), // для расчёта упаковки
            quantity: z.number().positive(),
            pallets: z.number().int().nonnegative().optional(),
            boxes: z.number().int().nonnegative().optional(),
            unit: z.enum(['PALLET', 'M2']).default('M2'),
            price: z.number().nonnegative(),
            // Сумму менеджер может проставить вручную (скидка, округление);
            // если не передана — считаем как количество × цена.
            sum: z.number().nonnegative().optional(),
          }),
        )
        .min(1),
    }),
  ),
  asyncHandler(async (req, res) => {
    // Паллеты и коробки считаются из объёма и формата, но менеджер может
    // переопределить их вручную — в документе печатается то, что отгружается.
    type ItemInput = {
      productId?: string;
      name: string;
      format: string;
      toneCaliber?: string;
      grade?: string;
      quantity: number;
      pallets?: number;
      boxes?: number;
      unit: string;
      price: number;
      sum?: number;
    };
    const items = (req.body.items as ItemInput[]).map((i) => {
      const grade = i.grade ?? 'A';
      // grade в позицию не пишем — он нужен только для расчёта упаковки.
      const { grade: _g, ...rest } = { ...i, grade };
      return {
        ...rest,
        pallets: i.pallets ?? calcPallets(i.quantity, i.format, grade),
        boxes: i.boxes ?? calcBoxes(i.quantity, i.format, grade),
        sum: i.sum ?? i.quantity * i.price,
      };
    });
    const total = items.reduce((s: number, i: { sum: number }) => s + i.sum, 0);
    const spec = await prisma.specification.create({
      data: {
        orderId: req.body.orderId,
        number: req.body.number || (await nextSpecNumber()),
        fileUrl: req.body.fileUrl,
        contractNumber: req.body.contractNumber,
        contractDate: req.body.contractDate ? new Date(req.body.contractDate) : null,
        city: req.body.city || undefined,
        currency: req.body.currency,
        includesVat: req.body.includesVat,
        deliveryTerms: DELIVERY_TERMS,
        shipmentTerms: SHIPMENT_TERMS,
        paymentTerms: req.body.paymentTerms,
        total,
        items: { create: items },
      },
      include: { items: true },
    });

    // Условие оплаты — одно и то же решение для спецификации и заявки:
    // от него зависит, пустят ли заявку в отгрузку без поступившей оплаты.
    await prisma.order.update({
      where: { id: req.body.orderId },
      data: { paymentTerm: req.body.paymentTerms },
    });

    // Уведомить клиента — нужна подпись.
    const order = await prisma.order.findUnique({ where: { id: req.body.orderId }, include: { client: true } });
    if (order?.client.userId) {
      await notify({
        userId: order.client.userId,
        type: 'SIGNATURE',
        title: `Спецификация по заявке #${order.number}`,
        body: 'Менеджер подпишет и выложит скан — после этого потребуется ваша подпись',
        orderId: order.id,
      });
    }
    res.status(201).json(spec);
  }),
);

/**
 * Выкладывание подписанного скана. Продавец подписывает первым: скачивает PDF,
 * ставит подпись и печать, загружает обратно. Затем то же делает клиент —
 * поверх файла продавца. Двусторонней спецификация считается только когда
 * выложены оба скана: галочка в интерфейсе документом не является.
 */
router.post(
  '/:id/upload-signed',
  upload.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest('Файл не передан');
    const spec = await prisma.specification.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { order: true },
    });
    const role = req.user!.role;
    const url = fileUrl(req.file.filename);

    if (role === 'MANAGER' || role === 'SALES_HEAD' || role === 'ADMIN') {
      await prisma.specification.update({
        where: { id: spec.id },
        data: { managerFileUrl: url, managerSigned: true, managerSignedAt: new Date() },
      });
      if (spec.order.clientId) {
        const client = await prisma.client.findUnique({ where: { id: spec.order.clientId } });
        if (client?.userId) {
          await notify({
            userId: client.userId,
            type: 'SIGNATURE',
            title: `Спецификация №${spec.number} подписана продавцом`,
            body: 'Скачайте файл, подпишите со своей стороны и загрузите обратно',
            orderId: spec.orderId,
          });
        }
      }
    } else if (role === 'CLIENT') {
      await assertOrderAccess(spec.orderId, req.user!.id, role);
      if (!spec.managerSigned) {
        deleteFile(req.file.filename);
        throw badRequest('Сначала спецификацию подписывает продавец');
      }
      await prisma.specification.update({
        where: { id: spec.id },
        data: { clientFileUrl: url, clientSigned: true, clientSignedAt: new Date() },
      });
      if (spec.order.managerId) {
        await notify({
          userId: spec.order.managerId,
          type: 'SIGNATURE',
          title: `Клиент подписал спецификацию №${spec.number}`,
          body: 'Спецификация двусторонняя — заявку можно вести к отгрузке',
          orderId: spec.orderId,
        });
      }
    } else {
      deleteFile(req.file.filename);
      throw forbidden();
    }

    res.json(await prisma.specification.findUniqueOrThrow({ where: { id: spec.id }, include: { items: true } }));
  }),
);

// Печатная форма спецификации в PDF.
router.get(
  '/:id/pdf',
  asyncHandler(async (req, res) => {
    const spec = await prisma.specification.findUniqueOrThrow({
      where: { id: req.params.id },
      include: { items: true, order: { include: { client: true } } },
    });
    await assertOrderAccess(spec.orderId, req.user!.id, req.user!.role);

    // Причину сбоя показываем в ответе: это внутренний инструмент, и «внутренняя
    // ошибка сервера» без деталей не даёт менеджеру понять, что не так.
    let pdf: Buffer;
    try {
      pdf = await renderPdf(
        buildSpecificationPdf({
          number: spec.number,
          contractNumber: spec.contractNumber,
          contractDate: spec.contractDate,
          city: spec.city,
          issuedAt: spec.issuedAt,
          currency: spec.currency,
          includesVat: spec.includesVat,
          deliveryTerms: spec.deliveryTerms,
          shipmentTerms: spec.shipmentTerms,
          paymentTerms: spec.paymentTerms,
          total: spec.total,
          items: spec.items,
          dealer: spec.order.client,
        }),
      );
    } catch (err) {
      console.error('[SPEC PDF]', err);
      throw new ApiError(500, `Не удалось сформировать PDF: ${(err as Error)?.message ?? String(err)}`);
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', attachment(`Спецификация ${spec.number}.pdf`));
    res.send(pdf);
  }),
);

export default router;
