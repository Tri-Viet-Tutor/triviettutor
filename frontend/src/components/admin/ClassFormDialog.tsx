import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { PortalDialog } from "@/components/dashboard/PortalDialog";
import { Icon } from "@/components/ui/Icon";
import { AUTH_ERROR, FOCUS_RING, PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY, PORTAL_INPUT, PORTAL_LABEL } from "@/constants/classNames";
import { DELIVERY_MODE_OPTIONS, SCHEDULE_PATTERN_OPTIONS, TIME_SLOT_OPTIONS } from "@/constants/classOptions";
import { weekdayMatchesPattern, patternWeekdayLabel } from "@/utils/classes";
import { coursePricePerSession, gradeLabel, subjectLabel } from "@/constants/management";
import { useAdminUsers } from "@/hooks/useAdminData";
import { useAdminCourses } from "@/hooks/useManagementData";
import { createClass } from "@/services/managementService";
import { estimatedEndDate } from "@/utils/classes";
import { formatVnd } from "@/utils/currency";
import { addDays, formatDate, parseIsoDate, startOfToday, toIsoDate } from "@/utils/date";
import { portalErrorMessage } from "@/utils/errors";
import type { AdminClassResponse, ClassType, CreateClassRequest, DeliveryMode, SchedulePattern, TimeSlot } from "@/interfaces/api";
import type { ClassFormDialogProps } from "@/interfaces/admin";
import { DateField } from "@/components/ui/DateField";

const CLASS_TYPE_OPTIONS: { value: ClassType; label: string; hint: string }[] = [
  { value: "GROUP", label: "Lớp nhóm", hint: "2 – 8 học viên" },
  { value: "ONE_ON_ONE", label: "1 kèm 1", hint: "1 học viên" },
];

/** Nhóm nút chọn một (segmented control); có `hint` thì hiện dòng phụ nhỏ bên dưới */
function Segmented<T extends string>({
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
  const columns = { 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-2 sm:grid-cols-4" }[options.length] ?? "grid-cols-2";
  return (
    <fieldset className="min-w-0">
      <legend className={PORTAL_LABEL}>{label}</legend>
      <div role="radiogroup" aria-label={label} className={`grid gap-1 rounded-xl bg-slate-100 p-1 ${columns}`}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={`min-w-0 rounded-lg px-2 py-1.5 text-center transition-colors ${FOCUS_RING} ${
                selected ? "bg-white text-brand-navy shadow-sm ring-1 ring-brand-navy/15" : "text-brand-muted hover:text-brand-navy"
              }`}
            >
              <span className="block truncate text-[13.5px] font-semibold">{option.label}</span>
              {option.hint && <span className="block truncate text-[11.5px] font-normal opacity-80">{option.hint}</span>}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

/** Tiêu đề nhóm trường trong form */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4">
      <h3 className="text-[12px] font-bold uppercase tracking-wide text-brand-navy/70">{title}</h3>
      {children}
    </section>
  );
}

/** Hộp thoại mở lớp mới từ một khóa học đang bán (POST /admin/classes), kèm gia sư phụ trách. */
export function ClassFormDialog({ open, onClose, onSaved, initialCourseId }: ClassFormDialogProps) {
  const courses = useAdminCourses({ active: true, size: 100 });
  const tutors = useAdminUsers({ role: "ROLE_TUTOR", size: 100 });
  const defaultStart = toIsoDate(addDays(startOfToday(), 14));
  const [courseId, setCourseId] = useState<number | "">("");
  const [tutorId, setTutorId] = useState<number | "">("");
  const [classType, setClassType] = useState<ClassType>("GROUP");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode>("OFFLINE");
  const [pattern, setPattern] = useState<SchedulePattern>("MON_WED_FRI");
  const [slot, setSlot] = useState<TimeSlot>("SLOT_EVENING");
  const [startDate, setStartDate] = useState(defaultStart);
  const [deadline, setDeadline] = useState(() => toIsoDate(addDays(parseIsoDate(defaultStart), -3)));
  // Chưa tự chọn hạn đăng ký thì hạn đi theo ngày khai giảng (3 ngày trước)
  const [deadlineTouched, setDeadlineTouched] = useState(false);
  const [meetingUrl, setMeetingUrl] = useState("");
  /** Số buổi của lớp (chuỗi để gõ tự do; kiểm tra 1 – 200 khi lưu) */
  const [sessions, setSessions] = useState("24");
  const [formError, setFormError] = useState<string | null>(null);

  // Mở lại thì xoá lỗi cũ; mở từ một khóa cụ thể thì khóa luôn vào khóa đó, không cho đổi
  useEffect(() => {
    if (!open) return;
    setFormError(null);
    if (initialCourseId !== undefined) setCourseId(initialCourseId);
  }, [open, initialCourseId]);
  // Mở từ "Tạo lớp đầu tiên ngay sau khi lưu" ở form khóa học: đã biết sẵn khóa, không cần chọn lại
  const lockedToCourse = initialCourseId !== undefined;

  const course = courses.data?.content.find((item) => item.id === courseId);
  const sessionCount = Number(sessions) || 0;
  const endDate = useMemo(
    () => (startDate && sessionCount > 0 ? estimatedEndDate(startDate, pattern, sessionCount) : null),
    [startDate, pattern, sessionCount],
  );
  const classPrice = course && sessionCount > 0 ? Math.round(coursePricePerSession(course) * sessionCount) : null;

  function changeStart(value: string) {
    setStartDate(value);
    if (!deadlineTouched && value) setDeadline(toIsoDate(addDays(parseIsoDate(value), -3)));
  }

  const save = useMutation({
    mutationFn: (request: CreateClassRequest) => createClass(request),
    onSuccess: (saved: AdminClassResponse) => onSaved(saved),
    onError: (error) => setFormError(portalErrorMessage(error, "Chưa mở được lớp. Vui lòng thử lại.")),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (courseId === "") return setFormError("Hãy chọn khóa học.");
    if (tutorId === "") return setFormError("Hãy chọn gia sư phụ trách lớp.");
    if (!Number.isInteger(sessionCount) || sessionCount < 1 || sessionCount > 200) return setFormError("Số buổi phải từ 1 đến 200.");
    if (!startDate) return setFormError("Hãy chọn ngày khai giảng.");
    if (!weekdayMatchesPattern(startDate, pattern)) {
      return setFormError(`Ngày khai giảng phải rơi vào ${patternWeekdayLabel(pattern)} (đúng lịch học đã chọn).`);
    }
    if (deadline && deadline >= startDate) return setFormError("Hạn đăng ký phải trước ngày khai giảng.");
    if (meetingUrl && !/^https:\/\/\S+$/.test(meetingUrl.trim())) return setFormError("Link lớp học phải bắt đầu bằng https://");
    setFormError(null);
    save.mutate({
      courseId,
      tutorId,
      totalSessions: sessionCount,
      classType,
      deliveryMode,
      schedulePattern: pattern,
      timeSlot: slot,
      startDate,
      enrollmentDeadline: deadline || undefined,
      meetingUrl: deliveryMode === "ONLINE" ? meetingUrl.trim() || undefined : undefined,
    });
  }

  return (
    <PortalDialog
      open={open}
      onClose={onClose}
      title="Mở lớp mới"
      description="Lớp được lưu ở trạng thái Bản nháp."
      widthClassName="max-w-[600px]"
    >
      <form onSubmit={handleSubmit} noValidate className="font-admin space-y-6">
        <Section title="Khóa học & gia sư">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <label htmlFor="class-course" className={PORTAL_LABEL}>
                Khóa học
              </label>
              {lockedToCourse ? (
                <div className={`${PORTAL_INPUT} flex items-center bg-brand-sand/50 text-brand-ink`}>
                  {course ? `${course.name} - ${subjectLabel(course.subject)} ${gradeLabel(course.gradeLevel)}` : "Đang tải…"}
                </div>
              ) : (
                <select
                  id="class-course"
                  value={courseId}
                  onChange={(event) => setCourseId(event.target.value ? Number(event.target.value) : "")}
                  className={PORTAL_INPUT}
                >
                  <option value="">{courses.isPending ? "Đang tải…" : "Chọn khóa học"}</option>
                  {courses.data?.content.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name} - {subjectLabel(item.subject)} {gradeLabel(item.gradeLevel)}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div className="min-w-0">
              <label htmlFor="class-tutor" className={PORTAL_LABEL}>
                Gia sư phụ trách
              </label>
              <select
                id="class-tutor"
                value={tutorId}
                onChange={(event) => setTutorId(event.target.value ? Number(event.target.value) : "")}
                className={PORTAL_INPUT}
              >
                <option value="">{tutors.isPending ? "Đang tải…" : "Chọn gia sư"}</option>
                {tutors.data?.content.map((tutor) => (
                  <option key={tutor.id} value={tutor.id}>
                    {tutor.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Segmented label="Loại lớp" value={classType} onChange={setClassType} options={CLASS_TYPE_OPTIONS} />
            <Segmented
              label="Hình thức"
              value={deliveryMode}
              onChange={setDeliveryMode}
              options={DELIVERY_MODE_OPTIONS.map(({ value, label }) => ({ value, label }))}
            />
          </div>
          {deliveryMode === "ONLINE" && (
            <div>
              <label htmlFor="class-url" className={PORTAL_LABEL}>
                Link phòng học <span className="font-normal">(không bắt buộc)</span>
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
        </Section>

        <Section title="Lịch học">
          <Segmented
            label="Ngày học trong tuần"
            value={pattern}
            onChange={setPattern}
            options={SCHEDULE_PATTERN_OPTIONS.map(({ value, label }) => ({ value, label }))}
          />
          <Segmented label="Ca học" value={slot} onChange={setSlot} options={TIME_SLOT_OPTIONS} />
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="class-sessions" className={PORTAL_LABEL}>
                Số buổi
              </label>
              <input
                id="class-sessions"
                type="number"
                inputMode="numeric"
                min={1}
                max={200}
                value={sessions}
                onChange={(event) => setSessions(event.target.value.replace(/\D/g, "").slice(0, 3))}
                className={PORTAL_INPUT}
              />
            </div>
            <div>
              <label htmlFor="class-start" className={PORTAL_LABEL}>
                Ngày khai giảng
              </label>
              <DateField
                id="class-start"
                value={startDate}
                min={toIsoDate(addDays(startOfToday(), 1))}
                onChange={(value) => changeStart(value)}
                className={PORTAL_INPUT}
              />
              {startDate && !weekdayMatchesPattern(startDate, pattern) && (
                <p className="mt-1 text-[12px] font-medium text-amber-700">
                  Ngày này không rơi vào {patternWeekdayLabel(pattern)} — buổi đầu sẽ tự dời sang ngày khớp gần nhất.
                </p>
              )}
            </div>
            <div>
              <label htmlFor="class-deadline" className={PORTAL_LABEL}>
                Hạn đăng ký
              </label>
              <DateField
                id="class-deadline"
                value={deadline}
                min={toIsoDate(startOfToday())}
                max={startDate || undefined}
                onChange={(value) => {
                  setDeadline(value);
                  setDeadlineTouched(true);
                }}
                className={PORTAL_INPUT}
              />
              {!deadlineTouched && <p className="mt-1 text-[12px] text-brand-muted">Mặc định 3 ngày trước khai giảng</p>}
            </div>
          </div>
        </Section>

        {sessionCount > 0 && (
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-brand-tint px-3 py-2.5 text-[13.5px] text-brand-ink">
            <Icon name="event_note" className="text-[18px] text-brand-navy" />
            <strong className="font-semibold">{sessionCount} buổi</strong>
            {endDate && <span>- dự kiến kết thúc {formatDate(parseIsoDate(endDate))}</span>}
            {classPrice !== null && (
              <span>
                - học phí 1 kèm 1 <strong className="font-semibold">{formatVnd(classPrice)}</strong>
              </span>
            )}
          </p>
        )}

        {formError && (
          <p role="alert" className={`${AUTH_ERROR} flex items-center gap-1.5`}>
            <Icon name="error" className="text-[17px]" />
            {formError}
          </p>
        )}

        <div className="sticky bottom-0 -mx-6 -mb-6 flex justify-end gap-2 border-t border-brand-sandLine bg-white/95 px-6 py-4 backdrop-blur">
          <button type="button" onClick={onClose} className={PORTAL_BTN_SECONDARY}>
            Hủy
          </button>
          <button type="submit" disabled={save.isPending} className={PORTAL_BTN_PRIMARY}>
            {save.isPending ? "Đang mở lớp…" : "Mở lớp"}
          </button>
        </div>
      </form>
    </PortalDialog>
  );
}
