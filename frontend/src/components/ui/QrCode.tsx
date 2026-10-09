import { useMemo } from "react";
import { encodeQr } from "@/lib/qrcode";

/** Viền trắng quanh mã, tính theo số ô — chuẩn QR yêu cầu ít nhất 4 */
const QUIET_ZONE = 4;

interface QrCodeProps {
  /** Nội dung mã hoá trong mã QR */
  value: string;
  /** Mô tả mã cho trình đọc màn hình */
  label: string;
  className?: string;
}

/** Vẽ một mã QR bằng SVG (ô đen trên nền trắng), co giãn theo khung chứa. */
export function QrCode({ value, label, className = "" }: QrCodeProps) {
  const { path, size } = useMemo(() => {
    const modules = encodeQr(value);
    const commands: string[] = [];
    modules.forEach((row, y) => {
      row.forEach((dark, x) => {
        if (dark) commands.push(`M${x + QUIET_ZONE} ${y + QUIET_ZONE}h1v1h-1z`);
      });
    });
    return { path: commands.join(""), size: modules.length + QUIET_ZONE * 2 };
  }, [value]);

  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" className={className}>
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill="#000" />
    </svg>
  );
}
