/**
 * Знак «Зерде»: повёрнутый на 45° квадрат с угловой литерой внутри —
 * по мотивам фирменного логотипа, в акцентных цветах интерфейса.
 */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden>
      <defs>
        <linearGradient id="zk-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C061F5" />
          <stop offset="1" stopColor="#EC4899" />
        </linearGradient>
      </defs>
      {/* Скруглённая подложка-ромб */}
      <rect x="9" y="9" width="30" height="30" rx="7" transform="rotate(45 24 24)" fill="url(#zk-grad)" />
      {/* Угловой знак: ломаная, повторяющая начертание на логотипе */}
      <path
        d="M29.5 17.5H21c-1.9 0-3 2.2-1.8 3.7l7.2 8.6c1.2 1.5.1 3.7-1.8 3.7h-6.1"
        stroke="#0B0713"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
