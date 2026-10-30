import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { PortalDialog } from "@/components/dashboard/PortalDialog";
import { Icon } from "@/components/ui/Icon";
import { AUTH_ERROR, FOCUS_RING, PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY, PORTAL_INPUT, PORTAL_LABEL } from "@/constants/classNames";
import { GRADE_OPTIONS } from "@/constants/classOptions";
import {
  COURSE_PRICE_TIERS,
  DEFAULT_DURATION_MINUTES,
  MIN_COURSE_PRICE,
  SUBJECT_OPTIONS,
  coursePricePerSession,
  subjectOptionsFrom,
} from "@/constants/management";
import { useSubjects } from "@/hooks/useManagementData";
import { createCourse, updateCourse } from "@/services/managementService";
import { formatVnd } from "@/utils/currency";
import { portalErrorMessage } from "@/utils/errors";
import type { CourseRequest, GradeLevel } from "@/interfaces/api";
import type { CourseFormDialogProps } from "@/interfaces/admin";

/** Giá trị trống của form */
const EMPTY = {
  name: "",
  subject: SUBJECT_OPTIONS[0]?.value ?? "MATH",
  gradeLevel: "GRADE_10" as GradeLevel,
  /** Chỉ chứa chữ số, hiển thị có dấu chấm ngăn hàng nghìn */
  basePrice1on1: "",
  durationMinutes: DEFAULT_DURATION_MINUTES,
  description: "",
};

type Values = typeof EMPTY;
type Tab = "general" | "pricing";

const TABS: { value: Tab; label: string; icon: string }[] = [
  { value: "general", label: "Thông tin chung", icon: "info" },
  { value: "pricing", label: "Cấu hình học phí", icon: "payments" },
];

/** "6000000" → "6.000.000" */
const groupDigits = (digits: string) => (digits ? new Intl.NumberFormat("vi-VN").format(Number(digits)) : "");

/** Kiểm tra toàn form; trả về tab có lỗi và câu báo lỗi */
function validate(values: Values): { tab: Tab; message: string } | null {
  if (!values.name.trim()) return { tab: "general", message: "Nhập tên khóa học." };
  if (values.name.trim().length > 200) return { tab: "general", message: "Tên khóa học tối đa 200 ký tự." };
  if (!values.subject.trim()) return { tab: "general", message: "Chọn hoặc nhập môn học." };
  if (values.subject.trim().length > 100) return { tab: "general", message: "Tên môn học tối đa 100 ký tự." };
  if (!values.basePrice1on1 || Number(values.basePrice1on1) < MIN_COURSE_PRICE)
    return { tab: "pricing", message: `Học phí 1 kèm 1 mỗi buổi tối thiểu ${formatVnd(MIN_COURSE_PRICE)}.` };
  return null;
}

/**
 * Hộp thoại tạo / sửa khóa học hai tab (POST /admin/courses, PUT /admin/courses/{id}):
 * Thông tin chung (tên, môn, khối, số buổi, phút / buổi, mô tả) và Cấu hình học phí
 * (học phí gốc 1 kèm 1 + xem trước giá lớp nhóm theo sĩ số). Chuyển tab tự do, lưu ở tab nào cũng được;
 * thiếu thông tin thì tự mở tab chứa lỗi.
 */
export function CourseFormDialog({ open, course, onClose, onSaved }: CourseFormDialogProps) {
  const [values, setValues] = useState<Values>(EMPTY);
  const [tab, setTab] = useState<Tab>("general");
  const [createClass, setCreateClass] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const editing = course !== null;
  const subjectOptions = subjectOptionsFrom(useSubjects().data?.map((item) => item.code));

  // Mỗi lần mở: điền sẵn khóa đang sửa hoặc để trống, về tab đầu
  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setTab("general");
    setCreateClass(true);
    setValues(
      course
        ? {
            name: course.name,
            subject: course.subject,
            gradeLevel: course.gradeLevel,
            // Khóa cũ lưu giá cả khóa: quy về giá một buổi
            basePrice1on1: String(Math.round(coursePricePerSession(course))),
            // Ca học cố định 2 tiếng: khóa cũ lưu số khác vẫn được lưu lại thành 120 để tạo lớp được
            durationMinutes: DEFAULT_DURATION_MINUTES,
            description: course.description ?? "",
          }
        : EMPTY,
    );
  }, [open, course]);

  const save = useMutation({
    mutationFn: (request: CourseRequest) => (course ? updateCourse(course.id, request) : createCourse(request)),
    onSuccess: (saved) => onSaved(saved, { createClass: !editing && createClass && saved.active }),
    onError: (error) => setFormError(portalErrorMessage(error, "Chưa lưu được khóa học. Kiểm tra lại thông tin rồi thử lại.")),
  });

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setFormError(null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const problem = validate(values);
    if (problem) {
      setTab(problem.tab);
      setFormError(problem.message);
      return;
    }
    save.mutate({
      name: values.name.trim(),
      subject: values.subject.trim(),
      gradeLevel: values.gradeLevel,
      basePrice1on1: Number(values.basePrice1on1),
      durationMinutes: values.durationMinutes,
      description: values.description.trim() || undefined,
    });
  }

  const price = Number(values.basePrice1on1) || 0;

  return (
    <PortalDialog
      open={open}
      onClose={onClose}
      title={editing ? "Sửa khóa học" : "Thêm khóa học"}
      description={course ? course.name : "Khóa học là khung chương trình; các lớp học được mở từ khóa."}
      widthClassName="max-w-[640px]"
    >
      <form onSubmit={handleSubmit} noValidate>
        {/* Thanh tab */}
        <div role="tablist" aria-label="Phần thông tin" className="-mt-2 mb-6 flex gap-1 rounded-xl bg-brand-sand/70 p-1">
          {TABS.map((item) => {
            const selected = tab === item.value;
            return (
              <button
                key={item.value}
                type="button"
                role="tab"
                id={`course-tab-${item.value}`}
                aria-selected={selected}
                aria-controls={`course-panel-${item.value}`}
                onClick={() => setTab(item.value)}
                className={`flex h-10 flex-1 items-center justify-center gap-2 rounded-lg text-[14px] font-semibold transition-colors ${FOCUS_RING} ${
                  selected ? "bg-white text-brand-navy shadow-[0_1px_3px_rgba(20,33,61,0.12)]" : "text-brand-muted hover:text-brand-navy"
                }`}
              >
                <Icon name={item.icon} className="text-[18px]" />
                {item.label}
              </button>
            );
          })}
        </div>

        {tab === "general" && (
          <div id="course-panel-general" role="tabpanel" aria-labelledby="course-tab-general" className="space-y-6">
            <div>
              <label htmlFor="course-name" className={PORTAL_LABEL}>
                Tên khóa học
              </label>
              <input
                id="course-name"
                autoFocus
                value={values.name}
                onChange={(event) => set("name", event.target.value)}
                placeholder="Ví dụ: Toán 12 – Tổng ôn thi tốt nghiệp"
                className={`${PORTAL_INPUT} h-12 text-[15px]`}
              />
            </div>

            <div>
              <label htmlFor="course-subject" className={PORTAL_LABEL}>
                Môn học
              </label>
              {/* Chọn môn có sẵn trong danh sách gợi ý hoặc gõ tên môn mới (backend tự tạo môn) */}
              <input
                id="course-subject"
                list="course-subject-options"
                value={subjectOptions.find((option) => option.value === values.subject)?.label ?? values.subject}
                onChange={(event) => {
                  const text = event.target.value;
                  const match = subjectOptions.find(
                    (option) =>
                      option.label.toLowerCase() === text.trim().toLowerCase() || option.value.toLowerCase() === text.trim().toLowerCase(),
                  );
                  set("subject", match ? match.value : text);
                }}
                placeholder="Chọn hoặc nhập môn học"
                autoComplete="off"
                className={`${PORTAL_INPUT} h-12 text-[15px]`}
              />
              <datalist id="course-subject-options">
                {subjectOptions.map((option) => (
                  <option key={option.value} value={option.label} />
                ))}
              </datalist>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {subjectOptions.slice(0, 6).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => set("subject", option.value)}
                    className={`rounded-full border px-3 py-1 text-[12.5px] font-semibold transition-colors ${
                      values.subject === option.value
                        ? "border-brand-navy bg-brand-navy text-white"
                        : "border-brand-sandLine bg-white text-brand-muted hover:border-brand-navy/40 hover:text-brand-navy"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <fieldset>
              <legend className={PORTAL_LABEL}>Khối lớp</legend>
              <div role="radiogroup" aria-label="Khối lớp" className="flex flex-wrap gap-2">
                {GRADE_OPTIONS.map((option) => (
                  <ChoiceButton
                    key={option.value}
                    selected={values.gradeLevel === option.value}
                    onClick={() => set("gradeLevel", option.value)}
                  >
                    {option.label}
                  </ChoiceButton>
                ))}
              </div>
            </fieldset>

            <div>
              <div>
                <div>
                  <span className={PORTAL_LABEL}>Thời lượng mỗi buổi</span>
                  <div className="flex h-11 items-center justify-between rounded-xl border border-brand-sandLine bg-brand-sand/50 px-4">
                    <span className="text-[16px] font-bold tabular-nums text-brand-ink">
                      {DEFAULT_DURATION_MINUTES} <span className="text-[13.5px] font-normal text-brand-muted">phút</span>
                    </span>
                    <span className="text-[12.5px] text-brand-muted">Cố định theo ca học 2 tiếng</span>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-[13px] text-brand-muted">Số buổi đặt khi mở từng lớp.</p>
            </div>

            <div>
              <label htmlFor="course-description" className={PORTAL_LABEL}>
                Mô tả <span className="font-normal">(không bắt buộc)</span>
              </label>
              <textarea
                id="course-description"
                rows={3}
                value={values.description}
                onChange={(event) => set("description", event.target.value)}
                placeholder="Học viên sẽ học gì, phù hợp với ai"
                className={`${PORTAL_INPUT} h-auto py-2 leading-relaxed`}
              />
            </div>
          </div>
        )}

        {tab === "pricing" && (
          <div id="course-panel-pricing" role="tabpanel" aria-labelledby="course-tab-pricing" className="space-y-6">
            <div>
              <label htmlFor="course-price" className={PORTAL_LABEL}>
                Học phí 1 kèm 1 cho mỗi buổi
              </label>
              <div className="relative">
                <input
                  id="course-price"
                  autoFocus
                  inputMode="numeric"
                  value={groupDigits(values.basePrice1on1)}
                  onChange={(event) => set("basePrice1on1", event.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 15))}
                  placeholder="300.000"
                  className={`${PORTAL_INPUT} h-14 pr-16 text-[20px] font-bold tabular-nums text-brand-navy`}
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[14px] font-semibold text-brand-muted">
                  VNĐ
                </span>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-baseline justify-between gap-4">
                <p className="text-[14px] font-semibold text-brand-ink">Giá lớp nhóm theo sĩ số</p>
                <p className="text-[12px] text-brand-muted">Mỗi học viên, mỗi buổi</p>
              </div>
              <div className="overflow-hidden rounded-xl border border-brand-sandLine">
                <table className="w-full text-left text-[14px]">
                  <thead className="bg-brand-sand/50 text-[12px] font-semibold text-brand-muted">
                    <tr>
                      <th scope="col" className="px-4 py-2 font-semibold">
                        Sĩ số
                      </th>
                      <th scope="col" className="px-4 py-2 text-right font-semibold">
                        Giảm
                      </th>
                      <th scope="col" className="px-4 py-2 text-right font-semibold">
                        Học phí / buổi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-sandLine">
                    {COURSE_PRICE_TIERS.map((tier, index) => (
                      <tr key={tier.size} className={index === 0 ? "bg-brand-tint/50" : undefined}>
                        <td className="px-4 py-2 font-medium text-brand-ink">{tier.size}</td>
                        <td className="px-4 py-2 text-right tabular-nums text-brand-muted">
                          {index === 0 ? "Giá gốc" : `${Math.round((1 - tier.rate) * 100)}%`}
                        </td>
                        <td className="px-4 py-2 text-right font-semibold tabular-nums text-brand-ink">
                          {price ? formatVnd(Math.round(price * tier.rate)) : "–"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-2 flex items-start gap-2 text-[12.5px] leading-relaxed text-brand-muted">
                <Icon name="info" className="mt-px text-[16px]" />
                Mức giảm áp dụng chung cho mọi khóa và được tính tự động khi học viên thanh toán. Giá đã trả được chốt theo sĩ số lúc đăng
                ký.
              </p>
            </div>

            {!editing && (
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-brand-sandLine p-4 hover:bg-brand-tint/50">
                <input
                  type="checkbox"
                  checked={createClass}
                  onChange={(event) => setCreateClass(event.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-[#0B3A8C]"
                />
                <span>
                  <span className="block text-[14px] font-semibold text-brand-ink">Tạo lớp đầu tiên ngay sau khi lưu</span>
                  <span className="block text-[13px] text-brand-muted">Chọn lịch học, ca học và ngày khai giảng.</span>
                </span>
              </label>
            )}
          </div>
        )}

        {formError && (
          <p role="alert" className={`${AUTH_ERROR} mt-4 flex items-center gap-2`}>
            <Icon name="error" className="text-[17px]" />
            {formError}
          </p>
        )}

        <div className="mt-8 flex items-center justify-between gap-2 border-t border-brand-sandLine pt-4">
          <button type="button" onClick={onClose} className={PORTAL_BTN_SECONDARY}>
            Hủy
          </button>
          <div className="flex gap-2">
            {tab === "general" && (
              <button type="button" onClick={() => setTab("pricing")} className={PORTAL_BTN_SECONDARY}>
                Cấu hình học phí
                <Icon name="arrow_forward" className="text-[18px]" />
              </button>
            )}
            <button type="submit" disabled={save.isPending} className={PORTAL_BTN_PRIMARY}>
              {save.isPending ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Tạo khóa học"}
            </button>
          </div>
        </div>
      </form>
    </PortalDialog>
  );
}

/** Chip chọn một trong nhiều (môn, khối) */
function ChoiceButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-full border px-4 text-[14px] font-semibold transition-colors ${FOCUS_RING} ${
        selected
          ? "border-brand-navy bg-brand-navy text-white"
          : "border-brand-sandLine bg-white text-brand-muted hover:border-brand-navy/40 hover:text-brand-navy"
      }`}
    >
      {children}
    </button>
  );
}

