import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { PortalDialog } from "@/components/dashboard/PortalDialog";
import { Icon } from "@/components/ui/Icon";
import { Combobox } from "@/components/ui/Combobox";
import { AUTH_ERROR, FOCUS_RING, PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY, PORTAL_INPUT, PORTAL_LABEL } from "@/constants/classNames";
import { GRADE_OPTIONS } from "@/constants/classOptions";
import {
  COURSE_PRICE_TIERS,
  DEFAULT_DURATION_MINUTES,
  DURATION_MAX,
  DURATION_MIN,
  DURATION_STEP,
  SUBJECT_OPTIONS,
  coursePricePerSession,
  subjectOptionsFrom,
} from "@/constants/management";
import { useSubjects } from "@/hooks/useManagementData";
import { createCourse, updateCourse } from "@/services/managementService";
import { formatVnd } from "@/utils/currency";
import { requireText, validateCoursePrice, validateDuration } from "@/utils/validation";
import { portalErrorMessage } from "@/utils/errors";
import type { CourseRequest, GradeLevel } from "@/interfaces/dto";
import type { CourseFormDialogProps } from "@/interfaces/admin";

// Giá trị trống của form
const EMPTY = {
  name: "",
  subject: SUBJECT_OPTIONS[0]?.value ?? "MATH",
  gradeLevel: "GRADE_10" as GradeLevel,
  // Chỉ chứa chữ số, hiển thị có dấu chấm ngăn hàng nghìn
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

// "6000000" → "6.000.000"
const groupDigits = (digits: string) => (digits ? new Intl.NumberFormat("vi-VN").format(Number(digits)) : "");

// Kiểm tra toàn form; trả về tab có lỗi và câu báo lỗi
function validate(values: Values): { tab: Tab; message: string } | null {
  const name = requireText(values.name, "Tên khóa học", 200);
  if (name) return { tab: "general", message: name };
  const subject = requireText(values.subject, "Môn học", 100);
  if (subject) return { tab: "general", message: subject };
  const price = validateCoursePrice(Number(values.basePrice1on1));
  if (price) return { tab: "pricing", message: price };
  const duration = validateDuration(values.durationMinutes);
  if (duration) return { tab: "general", message: duration };
  return null;
}

// Hộp thoại tạo / sửa khóa học hai tab (POST /admin/courses, PUT /admin/courses/{id}):
// Thông tin chung (tên, môn, khối, số buổi, phút / buổi, mô tả) và Cấu hình học phí
// (học phí gốc 1 kèm 1 + xem trước giá lớp nhóm theo sĩ số). Chuyển tab tự do, lưu ở tab nào cũng được;
// thiếu thông tin thì tự mở tab chứa lỗi.
// Nút cộng trừ nhảy về bội số gần nhất của bước, nên khóa cũ để 110 phút bấm một cái là về 105 hoặc 120
function stepDuration(current: number, direction: 1 | -1): number {
  const base = current || DURATION_MIN;
  const snapped = direction > 0 ? Math.floor(base / DURATION_STEP) : Math.ceil(base / DURATION_STEP);
  const next = (snapped + direction) * DURATION_STEP;
  return Math.min(DURATION_MAX, Math.max(DURATION_MIN, next));
}

// Hộp thêm / sửa khóa học, chia tab thông tin chung và học phí, có thể mở lớp đầu tiên ngay
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
            durationMinutes: course.durationMinutes,
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

  // Sửa một ô trong form và xóa lỗi đang hiện
  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }));
    setFormError(null);
  }

  // Kiểm tra form, báo lỗi đúng tab, hợp lệ thì lưu khóa học
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
      widthClassName="max-w-[760px]"
    >
      <form onSubmit={handleSubmit} noValidate>
        {
          // Thanh tab
        }
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
              {
                // Chọn môn có sẵn trong danh sách gợi ý hoặc gõ tên môn mới (backend tự tạo môn)
              }
              <Combobox
                id="course-subject"
                value={values.subject}
                options={subjectOptions}
                onChange={(value) => set("subject", value)}
                placeholder="Chọn hoặc nhập môn học"
                className={`${PORTAL_INPUT} h-12 text-[15px]`}
              />
              <div className="mt-2 flex flex-wrap gap-1.5">
                {subjectOptions.slice(0, 6).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => set("subject", option.value)}
                    className={`rounded-xl border px-3 py-1 text-[12.5px] font-semibold transition-colors ${
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

            <div className="grid gap-6 sm:grid-cols-2">
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
                <label htmlFor="course-duration" className={PORTAL_LABEL}>
                  Thời lượng mỗi buổi
                </label>
                <div className="flex max-w-[220px] items-stretch overflow-hidden rounded-xl border border-brand-sandLine bg-white shadow-sm">
                  <button
                    type="button"
                    aria-label={`Giảm ${DURATION_STEP} phút`}
                    disabled={values.durationMinutes <= DURATION_MIN}
                    onClick={() => set("durationMinutes", stepDuration(values.durationMinutes, -1))}
                    className="flex w-11 shrink-0 items-center justify-center text-brand-muted transition hover:bg-brand-sand/60 hover:text-brand-ink disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Icon name="remove" className="text-[19px]" />
                  </button>
                  <div className="flex flex-1 items-center justify-center gap-1.5 border-x border-brand-sandLine px-2">
                    <input
                      id="course-duration"
                      type="number"
                      inputMode="numeric"
                      min={DURATION_MIN}
                      max={DURATION_MAX}
                      step={1}
                      value={values.durationMinutes || ""}
                      onChange={(event) => {
                        const digits = event.target.value.replace(/\D/g, "").slice(0, 3);
                        set("durationMinutes", digits ? Number(digits) : 0);
                      }}
                      onBlur={(event) => {
                        const n = Number(event.target.value);
                        if (n) set("durationMinutes", Math.min(DURATION_MAX, Math.max(DURATION_MIN, n)));
                      }}
                      className="w-12 appearance-none bg-transparent text-center text-[15px] font-semibold text-brand-ink outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="text-[13.5px] font-medium text-brand-muted">phút</span>
                  </div>
                  <button
                    type="button"
                    aria-label={`Tăng ${DURATION_STEP} phút`}
                    disabled={values.durationMinutes >= DURATION_MAX}
                    onClick={() => set("durationMinutes", stepDuration(values.durationMinutes, 1))}
                    className="flex w-11 shrink-0 items-center justify-center text-brand-muted transition hover:bg-brand-sand/60 hover:text-brand-ink disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Icon name="add" className="text-[19px]" />
                  </button>
                </div>
                <p className="mt-2 text-[13px] text-brand-muted">
                  Từ {DURATION_MIN} đến {DURATION_MAX} phút, bước {DURATION_STEP} phút. Số buổi đặt khi mở từng lớp.
                </p>
              </div>
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
                Học phí 1 buổi học
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
                Học viên đóng đủ giá 1 kèm 1 khi đăng ký. Khi lớp nhóm chốt sĩ số, phần giảm theo bảng trên được hoàn tự động vào ví
                của từng học viên.
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

        <div className="sticky bottom-0 -mx-6 -mb-6 mt-8 flex items-center justify-between gap-2 border-t border-brand-sandLine bg-white/95 px-6 py-4 backdrop-blur">
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

// Chip chọn một trong nhiều (môn, khối)
function ChoiceButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl border px-4 text-[14px] font-semibold transition-colors ${FOCUS_RING} ${
        selected
          ? "border-brand-navy bg-brand-navy text-white"
          : "border-brand-sandLine bg-white text-brand-muted hover:border-brand-navy/40 hover:text-brand-navy"
      }`}
    >
      {children}
    </button>
  );
}

