import { useEffect, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { PortalDialog } from "@/components/dashboard/PortalDialog";
import { Icon } from "@/components/ui/Icon";
import { AUTH_ERROR, PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY, PORTAL_INPUT, PORTAL_LABEL } from "@/constants/classNames";
import { DELIVERY_MODE_OPTIONS, SCHEDULE_PATTERN_OPTIONS, TIME_SLOT_OPTIONS } from "@/constants/classOptions";
import { CLASS_TYPE_LABEL } from "@/constants/labels";
import { gradeLabel, subjectLabel } from "@/constants/management";
import { useAdminCourses } from "@/hooks/useManagementData";
import { createClass } from "@/services/managementService";
import { addDays, startOfToday, toIsoDate } from "@/utils/date";
import { portalErrorMessage } from "@/utils/errors";
import type { AdminClassResponse, ClassType, CreateClassRequest, DeliveryMode, SchedulePattern, TimeSlot } from "@/interfaces/api";
import type { ClassFormDialogProps } from "@/interfaces/admin";

/** Lựa chọn dạng nút bấm (radio) */
function Choice<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className={PORTAL_LABEL}>{label}</legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fit,minmax(0,1fr))]">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            onClick={() => onChange(option.value)}
            className={`rounded-xl border px-3 py-2 text-left transition-colors ${
              value === option.value
                ? "border-brand-navy bg-brand-tint ring-1 ring-brand-navy"
                : "border-brand-sandLine bg-white hover:border-brand-navy/40"
            }`}
          >
            <span className="block text-[14px] font-semibold text-brand-ink">{option.label}</span>
            {option.hint && <span className="block text-[12px] text-brand-muted">{option.hint}</span>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

/** Hộp thoại mở lớp mới từ một khóa học đang bán (POST /admin/classes). */
export function ClassFormDialog({ open, onClose, onSaved, initialCourseId }: ClassFormDialogProps) {
  const courses = useAdminCourses({ active: true, size: 100 });
  const defaultStart = toIsoDate(addDays(startOfToday(), 14));
  const [courseId, setCourseId] = useState<number | "">("");
  const [classType, setClassType] = useState<ClassType>("GROUP");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("OFFLINE");
  const [pattern, setPattern] = useState<SchedulePattern>("MON_WED_FRI");
  const [slot, setSlot] = useState<TimeSlot>("SLOT_EVENING");
  const [startDate, setStartDate] = useState(defaultStart);
  const [deadline, setDeadline] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Mở lại thì xoá lỗi cũ; mở từ một khóa cụ thể thì chọn sẵn khóa đó
  useEffect(() => {
    if (!open) return;
    setFormError(null);
    if (initialCourseId !== undefined) setCourseId(initialCourseId);
  }, [open, initialCourseId]);

  const save = useMutation({
    mutationFn: (request: CreateClassRequest) => createClass(request),
    onSuccess: (saved: AdminClassResponse) => onSaved(saved),
    onError: (error) => setFormError(portalErrorMessage(error, "Chưa mở được lớp. Vui lòng thử lại.")),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (courseId === "") return setFormError("Hãy chọn khóa học.");
    if (!startDate) return setFormError("Hãy chọn ngày khai giảng.");
    if (deadline && deadline > startDate) return setFormError("Hạn đăng ký phải trước hoặc bằng ngày khai giảng.");
    if (meetingUrl && !/^https:\/\/\S+$/.test(meetingUrl.trim())) return setFormError("Link lớp học phải bắt đầu bằng https://");
    setFormError(null);
    save.mutate({
      courseId,
      classType,
      deliveryMode,
      schedulePattern: pattern,
      timeSlot: slot,
      startDate,
      enrollmentDeadline: deadline || undefined,
      meetingUrl: meetingUrl.trim() || undefined,
    });
  }

  return (
    <PortalDialog
      open={open}
      onClose={onClose}
      title="Mở lớp mới"
      description="Lớp mới ở trạng thái Bản nháp; đăng lớp để sinh lịch các buổi."
      widthClassName="max-w-[640px]"
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <div>
          <label htmlFor="class-course" className={PORTAL_LABEL}>
            Khóa học
          </label>
          <select
            id="class-course"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value ? Number(event.target.value) : "")}
            className={PORTAL_INPUT}
          >
            <option value="">{courses.isPending ? "Đang tải khóa học…" : "Chọn khóa học đang bán"}</option>
            {courses.data?.content.map((course) => (
              <option key={course.id} value={course.id}>
                {course.name} — {subjectLabel(course.subject)}, {gradeLabel(course.gradeLevel)}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Choice
            label="Loại lớp"
            value={classType}
            onChange={setClassType}
            options={(["GROUP", "ONE_ON_ONE"] as ClassType[]).map((value) => ({
              value,
              label: CLASS_TYPE_LABEL[value],
              hint: value === "GROUP" ? "2 – 8 học viên" : "1 học viên",
            }))}
          />
          <Choice label="Hình thức" value={deliveryMode} onChange={setDeliveryMode} options={DELIVERY_MODE_OPTIONS} />
        </div>

        <Choice label="Lịch học trong tuần" value={pattern} onChange={setPattern} options={SCHEDULE_PATTERN_OPTIONS} />
        <Choice label="Ca học" value={slot} onChange={setSlot} options={TIME_SLOT_OPTIONS} />

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="class-start" className={PORTAL_LABEL}>
              Ngày khai giảng
            </label>
            <input
              id="class-start"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className={PORTAL_INPUT}
            />
          </div>
          <div>
            <label htmlFor="class-deadline" className={PORTAL_LABEL}>
              Hạn đăng ký <span className="font-normal">(để trống: theo quy định)</span>
            </label>
            <input
              id="class-deadline"
              type="date"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
              className={PORTAL_INPUT}
            />
          </div>
        </div>

        {deliveryMode === "ONLINE" && (
          <div>
            <label htmlFor="class-url" className={PORTAL_LABEL}>
              Link phòng học trực tuyến <span className="font-normal">(không bắt buộc)</span>
            </label>
            <input
              id="class-url"
              type="url"
              value={meetingUrl}
              onChange={(event) => setMeetingUrl(event.target.value)}
              placeholder="https://meet.google.com/…"
              className={PORTAL_INPUT}
            />
          </div>
        )}

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
            <Icon name="add_circle" className="text-[18px]" />
            {save.isPending ? "Đang mở lớp…" : "Mở lớp"}
          </button>
        </div>
      </form>
    </PortalDialog>
  );
}
