import { StatusChip } from "@/components/dashboard/StatusChip";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING } from "@/constants/classNames";
import { CLASS_STATUS } from "@/constants/labels";
import { patternLabel } from "@/constants/management";
import { useAdminClasses } from "@/hooks/useManagementData";
import type { CourseClassesPanelProps } from "@/interfaces/admin";
import { classStatusActions } from "@/utils/classes";
import { formatDate, parseIsoDate } from "@/utils/date";

// Số lớp tối đa hiện trong một khóa (backend cho tối đa 100 mỗi trang)
const LIMIT = 50;

// Các lớp đã mở từ một khóa (GET /admin/classes?courseId=…), mỗi lớp một dòng gọn:
// mã lớp, lịch, khai giảng, sĩ số, trạng thái và nút đổi trạng thái / mở lại. Có nút tạo lớp mới cho khóa.
export function CourseClassesPanel({ course, onCreate, onChangeStatus }: CourseClassesPanelProps) {
  const classes = useAdminClasses({ courseId: course.id, size: LIMIT });
  const items = classes.data?.content ?? [];

  return (
    <section className="border-t border-brand-sandLine px-6 py-6">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-bold text-brand-navy">
          Lớp của khóa
          {classes.data && <span className="ml-1.5 font-semibold text-brand-muted">{classes.data.totalElements}</span>}
        </h3>
        <button
          type="button"
          onClick={onCreate}
          disabled={!course.active}
          title={course.active ? undefined : "Mở bán khóa trước khi tạo lớp"}
          className={`inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-navy px-3.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-navyDeep disabled:cursor-not-allowed disabled:bg-slate-300 ${FOCUS_RING}`}
        >
          <Icon name="add" className="text-[18px]" />
          Tạo lớp
        </button>
      </div>

      {classes.isPending ? (
        <p className="py-3 text-[13.5px] text-brand-muted">Đang tải lớp…</p>
      ) : classes.isError ? (
        <p className="py-3 text-[13.5px] text-red-700">
          Không tải được lớp của khóa.{" "}
          <button type="button" onClick={() => void classes.refetch()} className="font-semibold underline">
            Thử lại
          </button>
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-brand-sandLine px-4 py-5 text-center text-[13.5px] text-brand-muted">
          {course.active ? "Khóa này chưa có lớp nào." : "Mở bán khóa để tạo lớp."}
        </p>
      ) : (
        <ul className="divide-y divide-brand-sandLine rounded-xl border border-brand-sandLine">
          {items.map((item) => {
            const style = CLASS_STATUS[item.status];
            const closed = item.status === "COMPLETED" || item.status === "CANCELLED";
            const reopen = item.status === "FAILED_TO_OPEN";
            return (
              <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-semibold text-brand-ink">{item.classCode}</p>
                  <p className="text-[12.5px] text-brand-muted">
                    {patternLabel(item.schedulePattern)} - {item.timeSlotLabel} - khai giảng {formatDate(parseIsoDate(item.startDate))}
                  </p>
                </div>
                <span className="shrink-0 text-[13px] font-semibold tabular-nums text-brand-ink">
                  {item.currentStudents}/{item.maxStudents}
                </span>
                <StatusChip tone={style.tone} icon={style.icon}>
                  {style.label}
                </StatusChip>
                {!closed && (reopen || classStatusActions(item, new Date()).length > 0) && (
                  <button
                    type="button"
                    onClick={() => onChangeStatus(item, reopen ? "reopen" : "status")}
                    aria-label={`${reopen ? "Mở lại" : "Cập nhật"} lớp ${item.classCode}`}
                    title={reopen ? "Mở lại lớp" : "Cập nhật lớp"}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-brand-muted hover:bg-brand-tint hover:text-brand-navy ${FOCUS_RING}`}
                  >
                    <Icon name={reopen ? "restart_alt" : "update"} className="text-[19px]" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
