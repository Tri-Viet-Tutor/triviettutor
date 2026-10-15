import { SCHEDULE_PATTERN_OPTIONS } from "@/constants/classOptions";
import { ENROLLMENT_FILTER_OPTIONS, FEE_RANGE, SHOP_SUBJECTS } from "@/constants/pricing";
import type { SchedulePattern } from "@/interfaces/api";
import type { ShopFilterPanelProps } from "@/interfaces/pricing";
import { formatVnd } from "@/utils/currency";

/** Ô chọn sổ xuống của bộ lọc */
const SELECT =
  "mt-2 h-10 w-full rounded-md border border-slate-300 bg-white pl-3 pr-9 text-[14.5px] font-semibold text-brand-ink outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy";

/** Bộ lọc bên cạnh danh sách khóa: môn học, đợt đăng ký, các thứ học trong tuần và học phí tối đa. */
export function ShopFilterPanel({
  subject,
  enrollment,
  schedule,
  maxFee,
  onSubjectChange,
  onEnrollmentChange,
  onScheduleChange,
  onMaxFeeChange,
  canReset,
  onReset,
}: ShopFilterPanelProps) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[16px] font-bold text-brand-navy">Bộ lọc</h3>
        {canReset && (
          <button
            type="button"
            onClick={onReset}
            className="rounded text-[13.5px] font-semibold text-brand-navy underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      <div className="mt-5">
        <label htmlFor="shop-subject" className="text-[13.5px] font-semibold text-brand-ink">
          Môn học
        </label>
        <select id="shop-subject" value={subject} onChange={(event) => onSubjectChange(event.target.value)} className={SELECT}>
          <option value="">Tất cả môn</option>
          {SHOP_SUBJECTS.map((item) => (
            <option key={item.subject} value={item.subject}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="mt-6">
        <legend className="text-[13.5px] font-semibold text-brand-ink">Đợt đăng ký</legend>
        <div className="mt-2 grid grid-cols-3 gap-1 rounded-lg bg-[#F3F6FC] p-1">
          {ENROLLMENT_FILTER_OPTIONS.map((option) => {
            const checked = option.value === enrollment;
            return (
              <label
                key={option.value}
                className={`cursor-pointer rounded-md px-1 py-1.5 text-center text-[13.5px] font-semibold transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-brand-navy ${
                  checked ? "bg-white text-brand-navy shadow-[0_1px_3px_rgba(8,42,102,0.2)]" : "text-brand-muted hover:text-brand-navy"
                }`}
              >
                <input
                  type="radio"
                  name="enrollmentFilter"
                  value={option.value}
                  checked={checked}
                  onChange={() => onEnrollmentChange(option.value)}
                  className="sr-only"
                />
                {option.label}
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="mt-6">
        <label htmlFor="shop-schedule" className="text-[13.5px] font-semibold text-brand-ink">
          Học thứ mấy
        </label>
        <select
          id="shop-schedule"
          value={schedule}
          onChange={(event) => onScheduleChange(event.target.value as SchedulePattern | "")}
          className={SELECT}
        >
          <option value="">Thứ nào cũng được</option>
          {SCHEDULE_PATTERN_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Chỉ hiện thanh trượt khi các khóa có mức phí khác nhau */}
      {FEE_RANGE.max > FEE_RANGE.min && (
        <div className="mt-6">
          <label htmlFor="shop-max-fee" className="flex items-baseline justify-between gap-2 text-[13.5px] font-semibold text-brand-ink">
            Học phí tối đa
            <span className="text-[14.5px] font-bold text-brand-navy">{formatVnd(maxFee)}</span>
          </label>
          <input
            id="shop-max-fee"
            type="range"
            min={FEE_RANGE.min}
            max={FEE_RANGE.max}
            step={FEE_RANGE.step}
            value={maxFee}
            onChange={(event) => onMaxFeeChange(Number(event.target.value))}
            className="mt-3 w-full accent-brand-navy"
          />
          <p className="mt-1 flex justify-between text-[12.5px] text-brand-muted">
            <span>{formatVnd(FEE_RANGE.min)}</span>
            <span>{formatVnd(FEE_RANGE.max)}</span>
          </p>
        </div>
      )}
    </div>
  );
}
