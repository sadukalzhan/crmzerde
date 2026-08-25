// Заголовок Content-Disposition для файлов с русскими именами.
// В значение HTTP-заголовка нельзя класть не-ASCII: Node отвергает такой ответ
// с «Invalid character in header content». Поэтому отдаём ASCII-запасной вариант
// и полное имя в filename* по RFC 5987 — браузеры берут второе.
export function attachment(filename: string): string {
  const ascii = filename.replace(/[^\x20-\x7E]/g, '_').replace(/["\\]/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`;
}
