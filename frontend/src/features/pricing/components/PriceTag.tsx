import { type CSSProperties } from "react";
import { Icon } from "@/components/ui/Icon";
import { PRICE_TAG_POINTS } from "@/features/pricing/data/pricing";

/* Đồng xu trôi quanh thẻ giá: vị trí theo % khung, cỡ theo px */
const COINS = [
  { left: 2, top: 20, size: 54, delay: 0 },
  { left: 84, top: 46, size: 42, delay: -1.8 },
  { left: 10, top: 76, size: 34, delay: -3.1 },
];

const SPARKLES = [
  { left: 86, top: 14, size: 22, delay: 0.2 },
  { left: 0, top: 54, size: 14, delay: 1.2 },
  { left: 78, top: 84, size: 18, delay: 0.8 },
];

/**
 * Thẻ giá treo dây đung đưa — ảnh mở đầu trang "Bảng học phí".
 * Trên thẻ ghi một khóa gồm những gì (số buổi, thời lượng, sĩ số) thay cho một con số tiền.
 */
export function PriceTag() {
  return (
    <div className="relative mx-auto h-[440px] w-full max-w-[440px] sm:h-[480px]">
      {/* Quầng sáng sau thẻ */}
      <div
        aria-hidden="true"
        className="absolute left-1/2 top-[56%] aspect-square w-[92%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.9),transparent_68%)]"
      />

      <div aria-hidden="true" className="absolute inset-0">
        {COINS.map((coin) => (
          <span
            key={coin.left}
            className="float-soft absolute flex items-center justify-center rounded-full bg-[radial-gradient(circle_at_32%_28%,#FFE2A6,#F5A00F_75%)] font-extrabold text-brand-navyDeep shadow-[0_12px_20px_-10px_rgba(222,139,0,0.95)] ring-2 ring-inset ring-white/50"
            style={{
              left: `${coin.left}%`,
              top: `${coin.top}%`,
              width: coin.size,
              height: coin.size,
              fontSize: coin.size * 0.46,
              animationDelay: `${coin.delay}s`,
            }}
          >
            ₫
          </span>
        ))}
        {SPARKLES.map((sparkle) => (
          <svg
            key={sparkle.left}
            viewBox="0 0 24 24"
            className="twinkle absolute fill-brand-navy/50"
            style={
              {
                left: `${sparkle.left}%`,
                top: `${sparkle.top}%`,
                width: sparkle.size,
                "--twinkle-delay": `${sparkle.delay}s`,
              } as CSSProperties
            }
          >
            <path d="M12 1c1 7 4 10 11 11-7 1-10 4-11 11-1-7-4-10-11-11 7-1 10-4 11-11z" />
          </svg>
        ))}
      </div>

      {/* Thẻ giá: đung đưa quanh lỗ xỏ dây */}
      <div className="tag-swing absolute left-1/2 top-0 w-[270px] -translate-x-1/2 sm:w-[290px]">
        {/* Sợi dây từ mép trên xuống lỗ thẻ */}
        <svg aria-hidden="true" viewBox="0 0 290 70" fill="none" className="absolute inset-x-0 top-0 w-full">
          <path d="M150 0c-10 18-12 34-5 52" className="stroke-brand-orangeHover" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <div className="relative mt-[26px] drop-shadow-[0_26px_28px_rgba(8,42,102,0.38)]">
          {/* Thân thẻ: vát hai góc trên, có lỗ xỏ dây */}
          <svg
            aria-hidden="true"
            viewBox="0 0 290 400"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full fill-brand-navy"
          >
            <path
              fillRule="evenodd"
              d="M72 0h146l72 72v300a28 28 0 0 1-28 28H28a28 28 0 0 1-28-28V72zM145 26a14 14 0 1 0 0 28 14 14 0 0 0 0-28z"
            />
          </svg>
          <div className="relative px-7 pb-8 pt-[86px] text-white">
            <p className="flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-brand-marker">
              <Icon name="sell" className="text-[16px]" />
              Học phí
            </p>
            <p className="mt-1.5 text-[42px] font-extrabold leading-none tracking-tight sm:text-[46px]">Theo khóa</p>
            <ul className="mt-6 space-y-3 border-t-2 border-dashed border-white/25 pt-5">
              {PRICE_TAG_POINTS.map((point) => (
                <li key={point} className="flex items-center gap-2.5 text-[15px] font-semibold">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-orange text-brand-navyDeep">
                    <Icon name="check" className="text-[15px] font-bold" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
