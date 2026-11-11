// Thuộc tính nét vẽ dùng chung cho các hình vẽ tay trang trí.

// Thuộc tính nét vẽ dùng chung cho các hình vẽ tay bằng SVG (nét tròn đầu, màu theo chữ)
export const DOODLE_STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;
