import { useEffect, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { PortalDialog } from "@/components/dashboard/PortalDialog";
import { Icon } from "@/components/ui/Icon";
import { AUTH_ERROR, PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY, PORTAL_INPUT, PORTAL_LABEL } from "@/constants/classNames";
import { GRADE_OPTIONS } from "@/constants/classOptions";
import { DEFAULT_DURATION_MINUTES, DEFAULT_TOTAL_SESSIONS, SUBJECT_OPTIONS } from "@/constants/management";
import { createCourse, updateCourse } from "@/services/managementService";
import { portalErrorMessage } from "@/utils/errors";
import type { CourseRequest, GradeLevel } from "@/interfaces/api";
import type { CourseFormDialogProps } from "@/interfaces/admin";

/** Giá trị trống của form (chuỗi để ô số nhập được tự do) */
const EMPTY = {
  name: "",
  subject: SUBJECT_OPTIONS[0]?.value ?? "MATH",
  gradeLevel: "GRADE_10" as GradeLevel,
  basePrice1on1: "",
  totalSessions: String(DEFAULT_TOTAL_SESSIONS),
  durationMinutes: String(DEFAULT_DURATION_MINUTES),
  description: "",
};

/** Hộp thoại tạo / sửa khóa học (POST /admin/courses, PUT /admin/courses/{id}). */
export function CourseFormDialog({ open, course, onClose, onSaved }: CourseFormDialogProps) {
  const [values, setValues] = useState(EMPTY);
  const [formError, setFormError] = useState<string | null>(null);

  // Mỗi lần mở: điền sẵn khóa đang sửa hoặc để trống
  useEffect(() => {
    if (!open) return;
    setFormError(null);
    setValues(
      course
        ? {
            name: course.name,
            subject: course.subject,
            gradeLevel: course.gradeLevel,
            basePrice1on1: String(course.basePrice1on1),
            totalSessions: String(course.totalSessions),
            durationMinutes: String(course.durationMinutes),
            description: course.description ?? "",
          }
        : EMPTY,
    );
  }, [open, course]);

  const save = useMutation({
    mutationFn: (request: CourseRequest) => (course ? updateCourse(course.id, request) : createCourse(request)),
    onSuccess: (saved) => onSaved(saved),
    onError: (error) => setFormError(portalErrorMessage(error, "Chưa lưu được khóa học. Vui lòng thử lại.")),
  });

  function set<K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const price = Number(values.basePrice1on1);
    const sessions = Number(values.totalSessions);
    const minutes = Number(values.durationMinutes);
    if (!values.name.trim()) return setFormError("Hãy nhập tên khóa học.");
    if (!Number.isFinite(price) || price <= 0) return setFormError("Học phí phải là số lớn hơn 0.");
    if (!Number.isInteger(sessions) || sessions <= 0) return setFormError("Số buổi phải là số nguyên lớn hơn 0.");
    if (!Number.isInteger(minutes) || minutes <= 0) return setFormError("Thời lượng mỗi buổi phải là số nguyên lớn hơn 0.");
    setFormError(null);
    save.mutate({
      name: values.name.trim(),
      subject: values.subject,
      gradeLevel: values.gradeLevel,
      basePrice1on1: price,
      totalSessions: sessions,
      durationMinutes: minutes,
      description: values.description.trim() || undefined,
    });
  }

  return (
    <PortalDialog
      open={open}
      onClose={onClose}
      title={course ? "Sửa khóa học" : "Thêm khóa học"}
      description={course ? `Mã khóa #${course.id}` : "Khóa học là khung chương trình; lớp học được mở từ khóa học."}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <div>
          <label htmlFor="course-name" className={PORTAL_LABEL}>
            Tên khóa học
          </label>
          <input
            id="course-name"
            value={values.name}
            onChange={(event) => set("name", event.target.value)}
            placeholder="Ví dụ: Toán 12 – Tổng ôn thi Tốt nghiệp"
            className={PORTAL_INPUT}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="course-subject" className={PORTAL_LABEL}>
              Môn học
            </label>
            <select
              id="course-subject"
              value={values.subject}
              onChange={(event) => set("subject", event.target.value)}
              className={PORTAL_INPUT}
            >
              {SUBJECT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <span className={PORTAL_LABEL}>Khối lớp</span>
            <div role="radiogroup" aria-label="Khối lớp" className="grid grid-cols-3 gap-1.5">
              {GRADE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={values.gradeLevel === option.value}
                  onClick={() => set("gradeLevel", option.value)}
                  className={`h-10 rounded-xl border text-[14px] font-semibold transition-colors ${
                    values.gradeLevel === option.value
                      ? "border-brand-navy bg-brand-navy text-white"
                      : "border-brand-sandLine bg-white text-brand-muted hover:border-brand-navy/40"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="course-price" className={PORTAL_LABEL}>
              Học phí 1 kèm 1 (đồng)
            </label>
            <input
              id="course-price"
              inputMode="numeric"
              value={values.basePrice1on1}
              onChange={(event) => set("basePrice1on1", event.target.value.replace(/[^\d]/g, ""))}
              placeholder="3000000"
              className={`${PORTAL_INPUT} tabular-nums`}
            />
          </div>
          <div>
            <label htmlFor="course-sessions" className={PORTAL_LABEL}>
              Số buổi
            </label>
            <input
              id="course-sessions"
              inputMode="numeric"
              value={values.totalSessions}
              onChange={(event) => set("totalSessions", event.target.value.replace(/[^\d]/g, ""))}
              className={`${PORTAL_INPUT} tabular-nums`}
            />
          </div>
          <div>
            <label htmlFor="course-minutes" className={PORTAL_LABEL}>
              Phút mỗi buổi
            </label>
            <input
              id="course-minutes"
              inputMode="numeric"
              value={values.durationMinutes}
              onChange={(event) => set("durationMinutes", event.target.value.replace(/[^\d]/g, ""))}
              className={`${PORTAL_INPUT} tabular-nums`}
            />
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
            className={`${PORTAL_INPUT} h-auto py-2 leading-relaxed`}
          />
        </div>

        {formError && (
          <p role="alert" className={`${AUTH_ERROR} flex items-center gap-1.5`}>
            <Icon name="error" className="text-[17px]" />
            {formError}
          </p>
        )}

        <div className="flex justify-end gap-2 border-t border-brand-sandLine pt-4">
          <button type="button" onClick={onClose} className={PORTAL_BTN_SECONDARY}>
            Hủy
          </button>
          <button type="submit" disabled={save.isPending} className={PORTAL_BTN_PRIMARY}>
            <Icon name="save" className="text-[18px]" />
            {save.isPending ? "Đang lưu…" : course ? "Lưu thay đổi" : "Tạo khóa học"}
          </button>
        </div>
      </form>
    </PortalDialog>
  );
}
