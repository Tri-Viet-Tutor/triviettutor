import { AUTH_LABEL } from "@/features/auth/components/AuthField";
import { SESSION_STATUS } from "@/features/portal/data/labels";
import { PORTAL_BTN_SECONDARY, PORTAL_CARD, PORTAL_INPUT } from "@/features/portal/data/ui";
import type { AdminUserResponse, SessionStatus } from "@/types/api";

export interface SessionFilterValues {
  /** Ngày dạng yyyy-MM-dd; chuỗi rỗng là không giới hạn */
  from: string;
  to: string;
  status: SessionStatus | "";
  /** Mã lớp và mã gia sư ở dạng chữ; chuỗi rỗng là không lọc */
  classId: string;
  tutorId: string;
}

interface SessionFiltersProps {
  values: SessionFilterValues;
  tutors: AdminUserResponse[];
  onChange: (patch: Partial<SessionFilterValues>) => void;
  onReset: () => void;
}

const STATUS_OPTIONS = Object.keys(SESSION_STATUS) as SessionStatus[];

/** Bộ lọc của trang Buổi học: khoảng ngày, trạng thái, lớp, gia sư (các tham số của GET /admin/sessions). */
export function SessionFilters({ values, tutors, onChange, onReset }: SessionFiltersProps) {
  return (
    <form
      aria-label="Lọc buổi học"
      onSubmit={(event) => event.preventDefault()}
      className={`grid grid-cols-2 items-end gap-x-3 gap-y-3 p-4 sm:grid-cols-3 lg:grid-cols-[repeat(5,minmax(0,1fr))_auto] ${PORTAL_CARD}`}
    >
      <div>
        <label htmlFor="filter-from" className={`mb-1.5 ${AUTH_LABEL}`}>
          Từ ngày
        </label>
        <input id="filter-from" type="date" value={values.from} max={values.to || undefined} onChange={(event) => onChange({ from: event.target.value })} className={PORTAL_INPUT} />
      </div>
      <div>
        <label htmlFor="filter-to" className={`mb-1.5 ${AUTH_LABEL}`}>
          Đến ngày
        </label>
        <input id="filter-to" type="date" value={values.to} min={values.from || undefined} onChange={(event) => onChange({ to: event.target.value })} className={PORTAL_INPUT} />
      </div>
      <div>
        <label htmlFor="filter-status" className={`mb-1.5 ${AUTH_LABEL}`}>
          Trạng thái
        </label>
        <select id="filter-status" value={values.status} onChange={(event) => onChange({ status: event.target.value as SessionStatus | "" })} className={PORTAL_INPUT}>
          <option value="">Tất cả</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {SESSION_STATUS[status].label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="filter-tutor" className={`mb-1.5 ${AUTH_LABEL}`}>
          Gia sư
        </label>
        <select id="filter-tutor" value={values.tutorId} onChange={(event) => onChange({ tutorId: event.target.value })} className={PORTAL_INPUT}>
          <option value="">Tất cả</option>
          {tutors.map((tutor) => (
            <option key={tutor.id} value={tutor.id}>
              {tutor.fullName} (#{tutor.id})
            </option>
          ))}
        </select>
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
