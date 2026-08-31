// Абстракция хранилища файлов. По умолчанию — локальный диск (dev).
// Для production: STORAGE_DRIVER=s3 (S3-совместимое, напр. MinIO).
//
// S3-драйвер вынесен в seam: требует пакет @aws-sdk/client-s3
// (не входит в зависимости по умолчанию, чтобы не утяжелять локальный запуск).
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { env } from './env';

// Гарантируем наличие папки загрузок (local).
if (env.storageDriver === 'local' && !fs.existsSync(env.uploadDir)) {
  fs.mkdirSync(env.uploadDir, { recursive: true });
}

/**
 * Multer отдаёт имя файла из multipart как latin1, поэтому русские названия
 * приезжают кракозябрами («Ð Ð°ÑÐ¸Ð¼Ð¼Ð°.docx»). Возвращаем их в UTF-8.
 *
 * Признак искажения — в строке нет ни одного символа выше U+00FF: настоящая
 * кириллица туда не помещается, а мусор от неверной раскодировки состоит
 * ровно из таких символов. Уже корректное имя не трогаем.
 */
export function decodeOriginalName(name: string): string {
  if ([...name].some((ch) => ch.codePointAt(0)! > 0xff)) return name;
  const restored = Buffer.from(name, 'latin1').toString('utf8');
  return restored.includes('\uFFFD') ? name : restored;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, env.uploadDir),
  filename: (_req, file, cb) => {
    const safe = decodeOriginalName(file.originalname).replace(/[^\w.\-а-яА-ЯёЁ]+/g, '_');
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${safe}`);
  },
});

export const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

/** Публичный URL файла (через защищённый эндпоинт /api/files). */
export function fileUrl(filename: string): string {
  return `/api/files/${encodeURIComponent(filename)}`;
}

/** Абсолютный путь файла на диске (local). */
export function filePath(filename: string): string {
  return path.join(env.uploadDir, path.basename(filename));
}

export function deleteFile(filename: string): void {
  try {
    fs.unlinkSync(filePath(filename));
  } catch {
    /* файл уже отсутствует — игнорируем */
  }
}
