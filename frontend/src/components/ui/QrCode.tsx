import { useMemo } from "react";
import { encodeQr } from "@/utils/qrcode";
import type { QrCodeProps } from "@/interfaces/ui";

const QUIET_ZONE = 4;

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
