import { useId } from "react";
import type { AntMascotProps } from "@/interfaces/portal";

const LINE = "#D9620C"; // màu viền cam đậm

const DARK = "#3A2011"; // màu nâu sẫm của mắt, miệng, giày

// Linh vật của khu học viên: chú kiến cam kiểu chibi — đầu to, mặt sáng, mắt long lanh, má hồng.
// Hình vẽ riêng của dự án (SVG), chỉ để trang trí. Mỗi hình có bộ màu chuyển riêng (useId) nên đặt
// nhiều chú trên cùng một trang không bị lẫn.
export function AntMascot({ variant = "leaf", className = "" }: AntMascotProps) {
  // Tiền tố id riêng cho các gradient (bỏ dấu ":" để dùng được trong url(#…))
  const id = useId().replace(/:/g, "");
  const skin = `url(#${id}-skin)`;
  const belly = `url(#${id}-belly)`;
  const eye = `url(#${id}-eye)`;
  const leaf = `url(#${id}-leaf)`;

  return (
    <svg viewBox="0 0 150 156" aria-hidden="true" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <radialGradient id={`${id}-skin`} cx="0.36" cy="0.28" r="0.85">
          <stop offset="0" stopColor="#FFD596" />
          <stop offset="0.55" stopColor="#FCA23A" />
          <stop offset="1" stopColor="#EE7C14" />
        </radialGradient>
        <radialGradient id={`${id}-belly`} cx="0.4" cy="0.25" r="0.9">
          <stop offset="0" stopColor="#FFC57A" />
          <stop offset="0.6" stopColor="#F8922A" />
          <stop offset="1" stopColor="#E06F10" />
        </radialGradient>
        <linearGradient id={`${id}-eye`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#24130A" />
          <stop offset="1" stopColor="#7A3D16" />
        </linearGradient>
        <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A5E05C" />
          <stop offset="1" stopColor="#3F9E2E" />
        </linearGradient>
      </defs>

      {
        // Bóng dưới chân
      }
      <ellipse cx="75" cy="152.5" rx="34" ry="3.2" fill="#0B2A66" opacity="0.12" />

      {
        // Chiếc lá làm ô: phiến lá nằm sau đầu, cuống cầm trong tay
      }
      {variant === "leaf" && (
        <>
          <path d="M121 103 C131 80 130 52 112 28" stroke="#3F8E2A" strokeWidth="3.6" />
          <path
            d="M8 34 C26 8 76 -4 118 8 C132 12 142 22 146 34 C120 30 98 34 78 36 C52 38 30 40 8 34 Z"
            fill={leaf}
            stroke="#2F7D22"
            strokeWidth="1.8"
          />
          <path d="M10 33.5 C48 26 104 20 144 33" stroke="#E4F7C4" strokeWidth="1.6" opacity="0.9" />
          <path
            d="M34 29.5 L42 17 M56 26 L66 11 M80 23.5 L92 9 M104 23 L115 12 M124 26 L132 18"
            stroke="#E4F7C4"
            strokeWidth="1.2"
            opacity="0.8"
          />
        </>
      )}

      {
        // Cây bút chì to dựng bên cạnh
      }
      {variant === "pen" && (
        <g transform="rotate(8 118 96)">
          <rect x="111" y="52" width="15" height="92" rx="2.5" fill="#FFCB3D" stroke="#D99A00" strokeWidth="1.4" />
          <rect x="116" y="52" width="5" height="92" fill="#FFE07A" opacity="0.8" />
          <rect x="111" y="132" width="15" height="12" rx="2.5" fill="#FF9DB0" stroke="#D96A82" strokeWidth="1.4" />
          <rect x="111" y="126" width="15" height="6.5" fill="#C9D3E6" stroke="#9AA8C2" strokeWidth="1.2" />
          <path d="M111 52 L118.5 32 L126 52 Z" fill="#FFE7BF" stroke="#D99A00" strokeWidth="1.4" />
          <path d="M115.8 39.4 L118.5 32 L121.2 39.4 Z" fill="#2B2F45" />
        </g>
      )}

      {
        // Chân và giày
      }
      <path d="M65 143 L63 150 M85 143 L87 150" stroke="#EE7C14" strokeWidth="5.5" />
      <ellipse cx="60.5" cy="151" rx="8.5" ry="4.2" fill={DARK} />
      <ellipse cx="89.5" cy="151" rx="8.5" ry="4.2" fill={DARK} />
      <ellipse cx="58" cy="149.6" rx="3" ry="1.2" fill="#fff" opacity="0.35" />
      <ellipse cx="87" cy="149.6" rx="3" ry="1.2" fill="#fff" opacity="0.35" />

      {
        // Bụng tròn có sọc và ngực
      }
      <ellipse cx="75" cy="130" rx="23" ry="18.5" fill={belly} stroke={LINE} strokeWidth="1.6" />
      <path d="M54.5 125 Q75 134 95.5 125" stroke="#D9620C" strokeWidth="4.2" opacity="0.75" />
      <path d="M56.5 136 Q75 145 93.5 136" stroke="#D9620C" strokeWidth="4.2" opacity="0.75" />
      <ellipse cx="75" cy="110" rx="14.5" ry="11.5" fill={belly} stroke={LINE} strokeWidth="1.6" />

      {
        // Tay — tùy dáng
      }
      {variant === "leaf" && (
        <>
          <path d="M62 108 Q44 106 36 92" stroke="#F48A1E" strokeWidth="6.5" />
          <circle cx="35" cy="90" r="5.6" fill={skin} stroke={LINE} strokeWidth="1.4" />
          <path d="M88 108 Q106 114 119 105" stroke="#F48A1E" strokeWidth="6.5" />
          <circle cx="121" cy="103.5" r="5.8" fill={skin} stroke={LINE} strokeWidth="1.4" />
        </>
      )}
      {variant === "pen" && (
        <>
          <path d="M62 108 Q46 112 42 124" stroke="#F48A1E" strokeWidth="6.5" />
          <circle cx="42" cy="126" r="5.6" fill={skin} stroke={LINE} strokeWidth="1.4" />
          <path d="M88 107 Q104 104 113 110" stroke="#F48A1E" strokeWidth="6.5" />
          <circle cx="115" cy="111" r="5.8" fill={skin} stroke={LINE} strokeWidth="1.4" />
        </>
      )}
      {variant === "book" && (
        <>
          {
            // Quyển sách mở nâng trước ngực
          }
          <path d="M43 109 L75 116 L107 109 L109 134 L75 142 L41 134 Z" fill="#0B3A8C" stroke="#082A66" strokeWidth="1.6" />
          <path d="M46 111 L75 117.5 L75 138.5 L44.5 131.5 Z" fill="#fff" />
          <path d="M104 111 L75 117.5 L75 138.5 L105.5 131.5 Z" fill="#F1F5FC" />
          <path d="M75 117.5 L75 138.5" stroke="#C7D5EC" strokeWidth="1.4" />
          <path d="M50 117 L70 121.4 M50 122.4 L70 126.8 M50 127.8 L64 130.8" stroke="#B5C2DA" strokeWidth="1.3" />
          <path d="M100 117 L80 121.4 M100 122.4 L80 126.8 M100 127.8 L86 130.8" stroke="#B5C2DA" strokeWidth="1.3" />
          <path d="M95 109.8 L101 108.6 L102.2 121 L98.8 118.4 L96.4 120.6 Z" fill="#F5A00F" />
          <path d="M60 106 Q44 110 42 124" stroke="#F48A1E" strokeWidth="6.5" />
          <circle cx="42" cy="127" r="5.8" fill={skin} stroke={LINE} strokeWidth="1.4" />
          <path d="M90 106 Q106 110 108 124" stroke="#F48A1E" strokeWidth="6.5" />
          <circle cx="108" cy="127" r="5.8" fill={skin} stroke={LINE} strokeWidth="1.4" />
        </>
      )}

      {
        // Râu
      }
      <path d="M58 28 Q54 12 44 9" stroke={LINE} strokeWidth="3" />
      <path d="M92 28 Q96 12 106 9" stroke={LINE} strokeWidth="3" />
      <circle cx="42.5" cy="8.5" r="5.6" fill={skin} stroke={LINE} strokeWidth="1.4" />
      <circle cx="107.5" cy="8.5" r="5.6" fill={skin} stroke={LINE} strokeWidth="1.4" />
      <circle cx="40.8" cy="6.8" r="1.7" fill="#fff" opacity="0.85" />
      <circle cx="105.8" cy="6.8" r="1.7" fill="#fff" opacity="0.85" />

      {
        // Đầu to, mặt sáng
      }
      <ellipse cx="75" cy="62" rx="45" ry="39" fill={skin} stroke={LINE} strokeWidth="1.8" />
      <ellipse cx="75" cy="72" rx="34" ry="24" fill="#FFEFD9" opacity="0.92" />
      <ellipse cx="52" cy="36" rx="11" ry="4.6" transform="rotate(-28 52 36)" fill="#fff" opacity="0.7" />
      <circle cx="68" cy="29" r="2.2" fill="#fff" opacity="0.7" />

      {
        // Má hồng
      }
      <ellipse cx="46" cy="81" rx="7" ry="4.6" fill="#FF8C8C" opacity="0.6" />
      <ellipse cx="104" cy="81" rx="7" ry="4.6" fill="#FF8C8C" opacity="0.6" />

      {
        // Mắt và miệng — tùy nét mặt
      }
      {variant === "book" ? (
        <>
          {
            // Cười tít mắt
          }
          <path d="M49 69 Q58 59 67 69" stroke={DARK} strokeWidth="3.4" />
          <path d="M83 69 Q92 59 101 69" stroke={DARK} strokeWidth="3.4" />
          <path d="M47.5 66 L44.5 63.5 M102.5 66 L105.5 63.5" stroke={DARK} strokeWidth="2.2" />
          <path d="M68 82 Q75 89 82 82" stroke={DARK} strokeWidth="2.8" />
        </>
      ) : (
        <>
          <ellipse cx="58" cy="67" rx="9.6" ry="11.6" fill={eye} />
          <circle cx="54.6" cy="62.4" r="3.9" fill="#fff" />
          <circle cx="61.4" cy="72" r="1.9" fill="#fff" opacity="0.9" />
          <path d="M48.6 60 L45 57 M51.5 56.6 L49 52.8" stroke={DARK} strokeWidth="2" />
          {variant === "pen" ? (
            <>
              {
                // Nháy mắt, lè lưỡi tinh nghịch
              }
              <path d="M83 68 Q92 61 101 68" stroke={DARK} strokeWidth="3.4" />
              <path d="M102.5 65 L106 62.5" stroke={DARK} strokeWidth="2.2" />
              <path d="M67 81 Q75 88.5 83 81" stroke={DARK} strokeWidth="2.8" />
              <path d="M72.4 85.2 Q75.6 92.4 79.6 85.6 Z" fill="#FF7E93" stroke="#D9516A" strokeWidth="1" />
            </>
          ) : (
            <>
              <ellipse cx="92" cy="67" rx="9.6" ry="11.6" fill={eye} />
              <circle cx="88.6" cy="62.4" r="3.9" fill="#fff" />
              <circle cx="95.4" cy="72" r="1.9" fill="#fff" opacity="0.9" />
              <path d="M101.4 60 L105 57 M98.5 56.6 L101 52.8" stroke={DARK} strokeWidth="2" />
              {
                // Cười tươi thấy lưỡi
              }
              <path d="M65.5 80.5 Q75 95 84.5 80.5 Q75 84 65.5 80.5 Z" fill="#A2341F" stroke={DARK} strokeWidth="1.4" />
              <path d="M70.4 87.2 Q75 92 79.6 87.2 Q75 85 70.4 87.2 Z" fill="#FF8FA3" />
            </>
          )}
        </>
      )}

      {
        // Lấp lánh quanh từng chú
      }
      {variant === "pen" && <path d="M134 22 L135.8 27.2 L141 29 L135.8 30.8 L134 36 L132.2 30.8 L127 29 L132.2 27.2 Z" fill="#F5A00F" />}
      {variant === "book" && (
        <>
          <path
            d="M22 96 C22 92 28 92 28 96 C28 92 34 92 34 96 C34 100.6 28 104 28 104 C28 104 22 100.6 22 96 Z"
            fill="#FF6B7D"
            transform="rotate(-14 28 98)"
          />
          <path d="M122 92 L123.4 96 L127.4 97.4 L123.4 98.8 L122 102.8 L120.6 98.8 L116.6 97.4 L120.6 96 Z" fill="#F5A00F" />
        </>
      )}
    </svg>
  );
}
