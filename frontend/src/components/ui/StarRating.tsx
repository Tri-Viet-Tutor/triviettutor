// Đường viền một ngôi sao (viewBox 0 0 24 24)
const STAR_PATH =
  "M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55L2.48 9.42l6.58-.96L12 2.5z";

// 5 ngôi sao vàng tô theo điểm trung bình (1 – 5), tô được cả phần lẻ (ví dụ 4,3 sao).
// `value` null: chưa có đánh giá, hiện 5 sao xám.
export function StarRating({ value, size = 16, className = "" }: { value: number | null | undefined; size?: number; className?: string }) {
  const score = value == null ? 0 : Math.max(0, Math.min(5, value));
  return (
    <span
      role="img"
      aria-label={value == null ? "Chưa có đánh giá" : `${score.toLocaleString("vi-VN", { maximumFractionDigits: 1 })} trên 5 sao`}
      className={`inline-flex items-center gap-px ${className}`}
    >
      {[0, 1, 2, 3, 4].map((index) => {
        const fill = Math.max(0, Math.min(1, score - index));
        return (
          <span key={index} className="relative inline-block" style={{ width: size, height: size }} aria-hidden="true">
            <svg viewBox="0 0 24 24" width={size} height={size} className="absolute inset-0 text-slate-300">
              <path d={STAR_PATH} fill="currentColor" />
            </svg>
            {fill > 0 && (
              <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <svg viewBox="0 0 24 24" width={size} height={size} className="text-amber-400">
                  <path d={STAR_PATH} fill="currentColor" />
                </svg>
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
