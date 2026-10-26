import { StatusChip } from "@/components/dashboard/StatusChip";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_BTN_GHOST } from "@/constants/classNames";
import { CLASS_STATUS, CLASS_TYPE_LABEL } from "@/constants/labels";
import { patternLabel } from "@/constants/management";
import { useAdminClasses } from "@/hooks/useManagementData";
import type { CourseClassesPanelProps } from "@/interfaces/admin";
import { formatDate, parseIsoDate } from "@/utils/date";

/** Số lớp tối đa hiện trong một khóa (backend cho tối đa 100 mỗi trang) */
const LIMIT = 50;

/**
 * Các lớp đã mở từ một khóa học (GET /admin/classes?courseId=…), hiện ngay dưới thẻ khóa ở trang Khóa học:
 * mã lớp, lịch, khai giảng, sĩ số, trạng thái; có nút tạo lớp mới cho khóa và đổi trạng thái từng lớp.
 * Lớp mới tạo ở trạng thái Nháp — chuyển sang "Đang tuyển sinh" thì học viên mới thấy.
 */
export function CourseClassesPanel({ course, onCreate, onChangeStatus }: CourseClassesPanelProps) {
  const classes = useAdminClasses({ courseId: course.id, size: LIMIT });
  const items = classes.data?.content ?? [];
  const drafts = items.filter((item) => item.status === "DRAFT" || item.status === "PUBLISHED").length;

  return (
    <div className="border-t border-brand-sandLine bg-brand-sand/40 px-4 py-4 sm:px-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[14px] font-bold text-brand-navy">
          Lớp của khóa
          {classes.data && <span className="ml-1.5 font-semibold text-brand-muted">({classes.data.totalElements})</span>}
        </p>
        <button
          type="button"
          onClick={onCreate}
          disabled={!course.active}
          title={course.active ? undefined : "Mở bán khóa trước khi tạo lớp"}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-navy px-3.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-navyDeep disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          <Icon name="add" className="text-[18px]" />
          Tạo lớp
        </button>
      </div>

      {!course.active && (
        <p className="mb-3 flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-2 text-[13px] text-slate-600">
          <Icon name="info" className="text-[16px]" />
          Khóa đang ngừng bán — bật "Mở bán" để tạo lớp và để học viên thấy các lớp của khóa.
        </p>
      )}
      {drafts > 0 && (
        <p className="mb-3 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
          <Icon name="visibility_off" className="text-[16px]" />
          {drafts} lớp chưa mở tuyển sinh — học viên chưa thấy. Bấm "Đổi trạng thái" để chuyển sang Đang tuyển sinh.
        </p>
      )}

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
        <div className="rounded-xl border border-dashed border-brand-sandLine bg-white/70 px-4 py-6 text-center">
          <Icon name="school" className="text-[30px] text-brand-navy/40" />
          <p className="mt-1 text-[14px] font-semibold text-brand-ink">Khóa này chưa có lớp nào</p>
          <p className="text-[13px] text-brand-muted">Tạo lớp để chọn lịch học, ngày khai giảng và bắt đầu tuyển sinh.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => {
            const style = CLASS_STATUS[item.status];
            const closed = item.status === "COMPLETED" || item.status === "CANCELLED";
            return (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-brand-sandLine bg-white px-3.5 py-2.5 text-[13px]"
              >
                <div className="min-w-[150px] flex-1">
                  <p className="font-mono text-[12.5px] font-semibold text-brand-orangeHover">{item.classCode}</p>
                  <p className="text-brand-muted">
                    {CLASS_TYPE_LABEL[item.classType]} · {item.deliveryMode === "ONLINE" ? "Trực tuyến" : "Tại trung tâm"}
                  </p>
                </div>
                <div className="min-w-[150px] text-brand-ink">
                  <p className="flex items-center gap-1">
                    <Icon name="calendar_month" className="text-[15px] text-brand-navy" />
                    {patternLabel(item.schedulePattern)} · {item.timeSlotLabel}
                  </p>
                  <p className="flex items-center gap-1 text-brand-muted">
                    <Icon name="flag" className="text-[15px] text-brand-orange" />
                    Khai giảng {formatDate(parseIsoDate(item.startDate))}
                  </p>
                </div>
                <p className="w-[92px] font-semibold tabular-nums text-brand-ink">
                  {item.currentStudents}/{item.maxStudents} học viên
                </p>
                <StatusChip tone={style.tone} icon={style.icon}>
                  {style.label}
                </StatusChip>
                {item.status === "FAILED_TO_OPEN" ? (
                  <button type="button" onClick={() => onChangeStatus(item, "reopen")} className={PORTAL_BTN_GHOST}>
                    <Icon name="restart_alt" className="text-[17px]" />
                    Mở lại
                  </button>
                ) : (
                  !closed && (
                    <button type="button" onClick={() => onChangeStatus(item, "status")} className={PORTAL_BTN_GHOST}>
                      <Icon name="swap_horiz" className="text-[17px]" />
                      Đổi trạng thái
                    </button>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
