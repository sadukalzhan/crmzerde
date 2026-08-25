// Печать PDF. Шрифты берём из ресурсов pdfmake — в них есть кириллица,
// поэтому ничего доустанавливать и класть в репозиторий не нужно.
import type { TDocumentDefinitions } from 'pdfmake/interfaces';

/* eslint-disable @typescript-eslint/no-var-requires */
// Серверная сборка pdfmake экспортируется как CommonJS-конструктор.
const PdfPrinter = require('pdfmake') as new (fonts: Record<string, unknown>) => {
  createPdfKitDocument(def: TDocumentDefinitions): NodeJS.ReadableStream & { end(): void };
};
const vfs: Record<string, string> = require('pdfmake/build/vfs_fonts.js');
/* eslint-enable @typescript-eslint/no-var-requires */

const font = (name: string) => Buffer.from(vfs[name], 'base64');

const printer = new PdfPrinter({
  Roboto: {
    normal: font('Roboto-Regular.ttf'),
    bold: font('Roboto-Medium.ttf'),
    italics: font('Roboto-Italic.ttf'),
    bolditalics: font('Roboto-MediumItalic.ttf'),
  },
});

/** Собирает документ в буфер — его отдаём как файл. */
export function renderPdf(definition: TDocumentDefinitions): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = printer.createPdfKitDocument(definition);
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}
