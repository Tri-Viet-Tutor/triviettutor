import { useInView } from "@/hooks/useInView";
import type { CrawlingAntProps } from "@/interfaces/home";

/**
 * Con kiến nhỏ bò qua bò lại; bò được 7 giây thì hiện câu nói trên đầu.
 * Đặt trong một phần tử có `relative`: kiến bò dọc mép trên của phần tử đó.
 * Chuyển động nằm ở các lớp .ant-* trong styles/index.css và chỉ bắt đầu khi kiến vào màn hình.
 */
export function CrawlingAnt({ message, className = "", color = "#3B2414" }: CrawlingAntProps) {
  // Kiến chỉ bắt đầu bò khi đã vào màn hình
  const [laneRef, inView] = useInView<HTMLDivElement>({ threshold: 0.6 });

  return (
    <div
      ref={laneRef}
      aria-hidden="true"
      className={`ant-lane pointer-events-none absolute bottom-full h-[52px] ${inView ? "is-active" : ""} ${className}`}
    >
      <div className="ant-walker absolute bottom-0 flex -translate-x-1/2 flex-col items-center">
        {message && (
        <span className="ant-bubble relative mb-1.5 whitespace-nowrap rounded-full bg-brand-navyDeep px-3 py-1.5 text-[12px] font-bold leading-none text-white shadow-[0_6px_12px_-6px_rgba(8,42,102,0.6)] after:absolute after:left-1/2 after:top-full after:-ml-[5px] after:border-x-[5px] after:border-t-[6px] after:border-x-transparent after:border-t-brand-navyDeep">
          {message}
        </span>
        )}
        <svg viewBox="0 0 30 18" className="ant-body block h-[18px] w-[30px]" fill="none" strokeLinecap="round">
          <g stroke={color} strokeWidth="1.2">
            {/* Ba chân bước trước, ba chân bước sau — đổi nhịp liên tục */}
            <g className="ant-legs-a">
              <path d="M17.5 12 L20.5 17.2" />
              <path d="M14 12 L10.5 17.2" />
              <path d="M15.8 12.4 L16.6 17.2" opacity="0.6" />
            </g>
            <g className="ant-legs-b">
              <path d="M15.5 12.4 L15 17.2" />
              <path d="M17 12 L19.4 17.2" opacity="0.6" />
              <path d="M14.4 12 L11.8 17.2" opacity="0.6" />
            </g>
            {/* Râu */}
            <path d="M23.6 7.2 Q26 3.4 28.6 3.8" />
            <path d="M22.4 6.8 Q23.4 2.8 26 1.6" />
          </g>
          {/* Bụng, ngực, đầu */}
          <ellipse cx="7" cy="10" rx="6" ry="4.2" fill={color} />
          <ellipse cx="15.5" cy="10.6" rx="3.5" ry="2.7" fill={color} />
          <circle cx="22" cy="9.6" r="3.2" fill={color} />
          <circle cx="23.3" cy="9" r="0.8" fill="#fff" />
        </svg>
      </div>
    </div>
  );
}
