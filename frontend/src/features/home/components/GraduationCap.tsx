interface GraduationCapProps {
  className?: string;
}

/** Nón tốt nghiệp màu đen, dây tua màu cam */
export function GraduationCap({ className = "" }: GraduationCapProps) {
  return (
    <svg aria-hidden="true" viewBox="0 0 64 64" className={className}>
      {/* Thân nón */}
      <path d="M15 30v13c0 3.9 7.6 7 17 7s17-3.1 17-7V30L32 39z" fill="#262B33" />
      {/* Mặt nón hình thoi */}
      <path d="M32 9 61 24 32 39 3 24z" fill="#0D0F12" />
      <path d="M32 9 61 24 32 39 3 24z" fill="none" stroke="#3B424D" strokeWidth="1" strokeLinejoin="round" />
      {/* Dây tua */}
      <path d="M32 24 54 27.5" fill="none" stroke="#F5A00F" strokeWidth="2.2" strokeLinecap="round" />
      <g className="tassel-sway">
        <path d="M54 27.5V44" fill="none" stroke="#F5A00F" strokeWidth="2.2" strokeLinecap="round" />
        <path d="M51.5 43h5l1.3 11h-7.6z" fill="#F5A00F" />
      </g>
      <circle cx="32" cy="24" r="2.4" fill="#F5A00F" />
    </svg>
  );
}
