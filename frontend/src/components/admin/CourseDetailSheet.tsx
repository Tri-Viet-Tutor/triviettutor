import { useEffect, useRef } from "react";
import { CourseClassesPanel } from "@/components/admin/CourseClassesPanel";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING } from "@/constants/classNames";
import { DEFAULT_DURATION_MINUTES, coursePriceTiers, gradeLabel, subjectLabel } from "@/constants/management";
import { CourseCover } from "@/components/admin/CourseCover";
import type { CourseDetailSheetProps } from "@/interfaces/admin";
import type { CourseResponse } from "@/interfaces/api";
import { formatVnd } from "@/utils/currency";

/**
 * Ngăn chi tiết khóa học trượt từ cạnh phải (thẻ <dialog> gốc: giữ tiêu điểm trong ngăn, Esc để đóng).
 * Gồm: tên khóa và thao tác (sửa, mở / ngừng bán), thông số, mô tả, thang học phí theo sĩ số và các lớp của khóa.
 * Các hộp thoại tạo lớp / đổi trạng thái mở chồng lên trên ngăn này.
 */
export function CourseDetailSheet({ course, onClose, toggling, onEdit, onToggle, onCreateClass, onChangeStatus }: CourseDetailSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = course !== null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={course ? `Khóa ${course.name}` : "Chi tiết khóa học"}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-dvh w-full max-w-[640px] border-0 bg-transparent p-0 backdrop:bg-brand-navyDeep/35 backdrop:backdrop-blur-[1px] open:animate-[sheet-in_220ms_cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:open:animate-none"
    >
      <style>{"@keyframes sheet-in{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}"}</style>
      {course && (
        <SheetBody
          course={course}
          onClose={onClose}
          toggling={toggling}
          onEdit={onEdit}
          onToggle={onToggle}
          onCreateClass={onCreateClass}
          onChangeStatus={onChangeStatus}
        />
      )}
    </dialog>
  );
}

function SheetBody({
  course,
  onClose,
  toggling,
  onEdit,
  onToggle,
  onCreateClass,
  onChangeStatus,
}: Omit<CourseDetailSheetProps, "course"> & { course: CourseResponse }) {
  return (
    <div className="flex h-full flex-col bg-white text-brand-ink shadow-[-30px_0_80px_-30px_rgba(8,42,102,0.45)]">
      {/* Đầu ngăn: luôn hiển thị khi cuộn */}
      <header className="shrink-0 border-b border-brand-sandLine p-6">
        <div className="flex items-start gap-4">
          <CourseCover subject={course.subject} gradeLevel={course.gradeLevel} size="lg" muted={!course.active} />
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[12px] font-bold uppercase tracking-[0.06em] text-brand-muted">
              {subjectLabel(course.subject)} · {gradeLabel(course.gradeLevel)}
            </p>
            <h2 className="mt-1 text-[20px] font-bold leading-snug text-brand-navy">{course.name}</h2>
            <p className="mt-1 text-[13.5px] text-brand-muted">
              {course.durationMinutes} phút/buổi · số buổi đặt theo từng lớp
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className={`-mr-2 -mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-brand-sand hover:text-brand-navy ${FOCUS_RING}`}
          >
            <Icon name="close" className="text-[22px]" />
          </button>
        </div>

        {/* Công tắc bán và nút sửa trên cùng một hàng */}
        <div className="mt-5 flex items-center justify-between gap-3 rounded-2xl bg-brand-sand/60 py-2 pl-3 pr-2">
          <SaleSwitch active={course.active} disabled={toggling} onToggle={() => onToggle(course)} />
          <button
            type="button"
            onClick={() => onEdit(course)}
            className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-brand-sandLine bg-white px-3.5 text-[14px] font-semibold text-brand-navy transition-colors hover:border-brand-navy/40 hover:bg-brand-tint ${FOCUS_RING}`}
          >
            <Icon name="edit" className="text-[18px]" />
            Sửa thông tin
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="space-y-6 px-6 py-6">
          {course.description && (
            <p className="max-w-[60ch] whitespace-pre-line text-[14.5px] leading-[1.7] text-brand-ink/80">{course.description}</p>
          )}

          {course.durationMinutes !== DEFAULT_DURATION_MINUTES && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 text-[13.5px] leading-relaxed text-amber-900">
              <Icon name="warning" className="mt-px text-[18px]" />
              <span>
                Khóa đang để {course.durationMinutes} phút mỗi buổi nên chưa tạo lớp được (ca học cố định {DEFAULT_DURATION_MINUTES} phút).
                Bấm <strong>Sửa thông tin</strong> rồi lưu lại để chuyển về {DEFAULT_DURATION_MINUTES} phút.
              </span>
            </p>
          )}

          <PriceLadder course={course} />
        </div>

        <CourseClassesPanel course={course} onCreate={() => onCreateClass(course)} onChangeStatus={onChangeStatus} />
      </div>
    </div>
  );
}

/** Công tắc mở / ngừng bán */
function SaleSwitch({ active, disabled, onToggle }: { active: boolean; disabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled}
      onClick={onToggle}
      className={`flex min-w-0 items-center gap-3 rounded-xl py-1 text-left disabled:opacity-50 ${FOCUS_RING}`}
    >
      <span
        aria-hidden="true"
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${active ? "bg-emerald-500" : "bg-slate-300"}`}
      >
        <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-[left] ${active ? "left-6" : "left-1"}`} />
      </span>
      <span className="text-[14px] font-semibold text-brand-ink">{active ? "Đang mở bán" : "Ngừng bán"}</span>
    </button>
  );
}

/**
 * Học phí mỗi học viên theo sĩ số lúc đăng ký: 4 thẻ ngang hàng (2 cột trên điện thoại),
 * mỗi thẻ ghi sĩ số, số tiền và mức giảm so với giá gốc 1 kèm 1.
 */
function PriceLadder({ course }: { course: CourseResponse }) {
  return (
    <section aria-labelledby="price-ladder-title">
      <h3 id="price-ladder-title" className="text-[15px] font-bold text-brand-navy">
        Học phí mỗi học viên / buổi
      </h3>
      <dl className="mt-3 grid grid-cols-2 overflow-hidden rounded-xl border border-brand-sandLine sm:grid-cols-4">
        {coursePriceTiers(course).map((tier, index) => (
          <div
            key={tier.size}
            className={`px-4 py-3 ${index > 0 ? "border-l border-brand-sandLine" : ""} ${index === 2 ? "max-sm:border-l-0 max-sm:border-t" : ""} ${index === 3 ? "max-sm:border-t" : ""}`}
          >
            <dt className="text-[12.5px] text-brand-muted">
              {tier.size}
              {index > 0 && <span className="text-emerald-700"> · −{Math.round(tier.discountRate * 100)}%</span>}
            </dt>
            <dd className="mt-0.5 text-[15px] font-bold tabular-nums text-brand-ink">{formatVnd(tier.price)}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
