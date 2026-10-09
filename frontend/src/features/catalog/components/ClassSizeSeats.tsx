import { CLASS_SIZE } from "@/features/catalog/data/classOptions";

/**
 * Sĩ số một lớp: con số lớn và một hàng "chỗ ngồi" —
 * chỗ chắc chắn có người tô đậm, chỗ có thể có thêm người tô nhạt.
 */
export function ClassSizeSeats() {
  return (
    <div className="flex flex-col items-center text-center lg:items-start lg:text-left">
      <p>
        <span className="block bg-gradient-to-r from-brand-navyDeep to-[#2F6BDB] bg-clip-text text-[84px] font-extrabold leading-none tracking-tight text-transparent lg:text-[108px]">
          {CLASS_SIZE.min} – {CLASS_SIZE.max}
        </span>
        <span className="mt-2 block text-[17px] font-medium text-brand-ink/75">học viên mỗi lớp</span>
      </p>

      <ul aria-hidden="true" className="mt-7 flex gap-2">
        {Array.from({ length: CLASS_SIZE.max }, (_, seat) => (
          <li key={seat} className={seat < CLASS_SIZE.min ? "text-brand-navy" : "text-brand-navy/40"}>
            <svg viewBox="0 0 20 24" className="h-8 w-7 fill-current sm:h-9 sm:w-[30px]">
              <circle cx="10" cy="6" r="5" />
              <path d="M10 13c-5.2 0-9 3.2-9 7.5V22a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-1.5c0-4.3-3.8-7.5-9-7.5z" />
            </svg>
          </li>
        ))}
      </ul>
    </div>
  );
}
