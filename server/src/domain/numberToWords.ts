// Сумма прописью по-русски — обязательный реквизит спецификации.
const ONES_M = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
const ONES_F = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
const TEENS = [
  'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать',
  'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать',
];
const TENS = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
const HUNDREDS = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];

/** Форма слова для числа: 1 → [0], 2-4 → [1], иначе [2]. */
function plural(n: number, forms: [string, string, string]): string {
  const mod100 = n % 100;
  const mod10 = n % 10;
  if (mod100 >= 11 && mod100 <= 19) return forms[2];
  if (mod10 === 1) return forms[0];
  if (mod10 >= 2 && mod10 <= 4) return forms[1];
  return forms[2];
}

function tripletToWords(n: number, feminine: boolean): string[] {
  const out: string[] = [];
  const h = Math.floor(n / 100);
  const t = Math.floor((n % 100) / 10);
  const o = n % 10;
  if (h) out.push(HUNDREDS[h]);
  if (t === 1) {
    out.push(TEENS[o]);
  } else {
    if (t) out.push(TENS[t]);
    if (o) out.push((feminine ? ONES_F : ONES_M)[o]);
  }
  return out;
}

const SCALES: { forms: [string, string, string]; feminine: boolean }[] = [
  { forms: ['', '', ''], feminine: false }, // единицы — форма задаётся валютой
  { forms: ['тысяча', 'тысячи', 'тысяч'], feminine: true },
  { forms: ['миллион', 'миллиона', 'миллионов'], feminine: false },
  { forms: ['миллиард', 'миллиарда', 'миллиардов'], feminine: false },
];

export interface CurrencyWords {
  /** формы основной единицы: тенге / рубль */
  major: [string, string, string];
  /** формы разменной единицы: тиын / копейка */
  minor: [string, string, string];
  minorFeminine: boolean;
}

export const CURRENCY_WORDS: Record<string, CurrencyWords> = {
  KZT: { major: ['тенге', 'тенге', 'тенге'], minor: ['тиын', 'тиына', 'тиын'], minorFeminine: false },
  RUB: { major: ['рубль', 'рубля', 'рублей'], minor: ['копейка', 'копейки', 'копеек'], minorFeminine: true },
};

/** Целое число прописью (без названия валюты). */
function intToWords(value: number, feminineUnits: boolean): string {
  if (value === 0) return 'ноль';
  const triplets: number[] = [];
  let rest = value;
  while (rest > 0) {
    triplets.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }
  const parts: string[] = [];
  for (let i = triplets.length - 1; i >= 0; i--) {
    const t = triplets[i];
    if (!t) continue;
    const scale = SCALES[i] ?? SCALES[SCALES.length - 1];
    const feminine = i === 0 ? feminineUnits : scale.feminine;
    parts.push(...tripletToWords(t, feminine));
    if (i > 0) parts.push(plural(t, scale.forms));
  }
  return parts.join(' ');
}

/**
 * Сумма прописью: 6448464 KZT →
 * «шесть миллионов четыреста сорок восемь тысяч четыреста шестьдесят четыре тенге 00 тиын».
 */
export function amountInWords(amount: number, currency = 'KZT'): string {
  const words = CURRENCY_WORDS[currency] ?? CURRENCY_WORDS.KZT;
  const major = Math.floor(Math.abs(amount));
  const minor = Math.round((Math.abs(amount) - major) * 100);
  const majorWords = intToWords(major, false);
  const text = `${majorWords} ${plural(major, words.major)} ${String(minor).padStart(2, '0')} ${plural(minor, words.minor)}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}
