import { AUTH_LABEL, PORTAL_BTN_SECONDARY, PORTAL_INPUT } from "@/constants/classNames";
import { SESSION_STATUS } from "@/constants/labels";
import type { SessionFiltersProps } from "@/interfaces/admin";
import type { SessionStatus } from "@/interfaces/dto";
import { DateField } from "@/components/ui/DateField";
import { Select } from "@/components/ui/Select";

// Mọi trạng thái buổi học, theo thứ tự khai báo nhãn
const STATUS_OPTIONS = Object.keys(SESSION_STATUS) as SessionStatus[];

// Bộ lọc của trang Buổi học: khoảng ngày, trạng thái, lớp, gia sư (các tham số của GET /admin/sessions).
export function SessionFilters({ values, tutors, onChange, onReset }: SessionFiltersProps) {
  return (
    <form
      aria-label="Lọc buổi học"
      onSubmit={(event) => event.preventDefault()}
      className="grid grid-cols-2 items-end gap-x-3 gap-y-3 rounded-sm border border-brand-sandLine bg-white p-4 sm:grid-cols-3 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto]"
    >
      <div>
        <label htmlFor="filter-from" className={`mb-1.5 ${AUTH_LABEL}`}>
          Từ ngày
        </label>
        <DateField
          id="filter-from"
          value={values.from}
          max={values.to || undefined}
          onChange={(value) => onChange({ from: value })}
          className={PORTAL_INPUT}
        />
      </div>
      <div>
        <label htmlFor="filter-to" className={`mb-1.5 ${AUTH_LABEL}`}>
          Đến ngày
        </label>
        <DateField
          id="filter-to"
          value={values.to}
          min={values.from || undefined}
          onChange={(value) => onChange({ to: value })}
          className={PORTAL_INPUT}
        />
      </div>
      <div>
        <label htmlFor="filter-status" className={`mb-1.5 ${AUTH_LABEL}`}>
          Trạng thái
        </label>
        <Select
          id="filter-status"
          value={values.status}
          onChange={(event) => onChange({ status: event.target.value as SessionStatus | "" })}
          className={PORTAL_INPUT}
        >
          <option value="">Tất cả</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {SESSION_STATUS[status].label}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label htmlFor="filter-tutor" className={`mb-1.5 ${AUTH_LABEL}`}>
          Gia sư
        </label>
        <Select
          id="filter-tutor"
          value={values.tutorId}
          onChange={(event) => onChange({ tutorId: event.target.value })}
          className={PORTAL_INPUT}
        >
          <option value="">Tất cả</option>
          {tutors.map((tutor) => (
            <option key={tutor.id} value={tutor.id}>
              {tutor.fullName}
            </option>
          ))}
        </Select>
      </div>
      <div>
        <label htmlFor="filter-class" className={`mb-1.5 ${AUTH_LABEL}`}>
          Mã lớp
        </label>
        <input
          id="filter-class"
          type="text"
          inputMode="numeric"
          placeholder="Ví dụ: 3"
          value={values.classId}
          onChange={(event) => onChange({ classId: event.target.value.replace(/\D/g, "") })}
          className={PORTAL_INPUT}
        />
      </div>
      <button type="button" onClick={onReset} className={PORTAL_BTN_SECONDARY}>
        Xóa lọc
      </button>
    </form>
  );
}
