import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { SessionSchedule } from "@/components/dashboard/SessionSchedule";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { TutorClassList } from "@/components/tutor/TutorClassList";
import { TutorClassRoster } from "@/components/tutor/TutorClassRoster";
import { TutorSessionDetail } from "@/components/tutor/TutorSessionDetail";
import { TutorTimetable } from "@/components/tutor/TutorTimetable";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING, PORTAL_BTN_GHOST } from "@/constants/classNames";
import { ROUTES } from "@/constants/routes";
import { useUserId } from "@/hooks/usePortalData";
import { useNow } from "@/hooks/useNow";
import { displayCode } from "@/utils/classes";
import { needsAttendance, teacherOf } from "@/utils/sessions";

type ClassSubView = "sessions" | "roster";

type View = "timetable" | "list";

const VIEWS: { value: View; label: string; icon: string }[] = [
  { value: "timetable", label: "Thời khóa biểu", icon: "calendar_view_week" },
  { value: "list", label: "Danh sách", icon: "view_agenda" },
];

// Trang Lịch dạy của gia sư: mặc định là thời khóa biểu theo tuần (mọi lớp đang dạy, tô màu theo lớp);
// chế độ Danh sách giữ các buổi sắp tới / đã qua gom theo tháng. Bấm một buổi để xem chi tiết, điểm danh và xin nghỉ.
export function TutorSchedulePage({ initialView = "timetable" }: { initialView?: View }) {
  const now = useNow();
  const tutorId = useUserId();
  const navigate = useNavigate();
  const [view, setView] = useState<View>(initialView);
  // Tầng "Lớp học" trong chế độ Danh sách: chưa chọn lớp (null) thì hiện danh sách lớp trước
  const [selectedClass, setSelectedClass] = useState<number | null>(null);
  const [classSubView, setClassSubView] = useState<ClassSubView>("sessions");

  const switcher = (
    <div role="tablist" aria-label="Cách xem lịch" className="flex rounded-xl bg-slate-100 p-1">
      {VIEWS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={view === option.value}
          onClick={() => {
            setView(option.value);
            navigate(option.value === "list" ? ROUTES.tutorClasses : ROUTES.tutorSessions, { replace: true });
          }}
          className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13.5px] font-semibold transition-colors ${FOCUS_RING} ${
            view === option.value ? "bg-white text-brand-navy shadow-sm" : "text-brand-muted hover:text-brand-navy"
          }`}
        >
          <Icon name={option.icon} className="text-[18px]" />
          {option.label}
        </button>
      ))}
    </div>
  );

  if (view === "list") {
    // Chưa chọn lớp: hiện tầng "Lớp học" trước, bấm vào một lớp mới xuống "Danh sách buổi học" của lớp đó
    if (selectedClass === null) {
      return (
        <div>
          <PortalPageHeader
            icon="school"
            title="Lớp học"
            description="Chọn một lớp để xem danh sách buổi học, điểm danh, bài tập và tài liệu của lớp đó."
            action={switcher}
          />
          <TutorClassList now={now} onSelect={setSelectedClass} />
        </div>
      );
    }

    const classBack = (
      <button
        type="button"
        onClick={() => {
          setSelectedClass(null);
          setClassSubView("sessions");
        }}
        className={PORTAL_BTN_GHOST}
      >
        <Icon name="arrow_back" className="text-[18px]" />
        Lớp học
      </button>
    );
    const classTabs = (
      <div role="tablist" aria-label="Nội dung lớp" className="flex rounded-xl bg-slate-100 p-1">
        {([
          { value: "sessions" as const, label: "Danh sách buổi học", icon: "view_agenda" },
          { value: "roster" as const, label: "Danh sách học viên", icon: "groups" },
        ]).map((option) => (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={classSubView === option.value}
            onClick={() => setClassSubView(option.value)}
            className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13.5px] font-semibold transition-colors ${FOCUS_RING} ${
              classSubView === option.value ? "bg-white text-brand-navy shadow-sm" : "text-brand-muted hover:text-brand-navy"
            }`}
          >
            <Icon name={option.icon} className="text-[17px]" />
            {option.label}
          </button>
        ))}
      </div>
    );

    if (classSubView === "roster") {
      return (
        <div>
          <PortalPageHeader
            icon="groups"
            title={`Danh sách học viên lớp ${displayCode("class", selectedClass)}`}
            action={
              <div className="flex flex-wrap items-center gap-2">
                {classBack}
                {classTabs}
              </div>
            }
          />
          <TutorClassRoster classGroupId={selectedClass} now={now} />
        </div>
      );
    }

    return (
      <div>
        <SessionSchedule
          title={`Danh sách buổi học lớp ${displayCode("class", selectedClass)}`}
          now={now}
          classGroupId={selectedClass}
          emptyTitle="Lớp này chưa có buổi dạy nào."
          emptyDescription="Lịch dạy sẽ hiện ở đây sau khi trung tâm xếp buổi cho lớp."
          headerExtra={
            <>
              {classBack}
              {classTabs}
            </>
          }
          renderBadge={(session) =>
            needsAttendance(session, tutorId, now) ? (
              <StatusChip tone="amber" icon="fact_check">
                Cần điểm danh
              </StatusChip>
            ) : teacherOf(session) !== tutorId ? (
              <StatusChip tone="slate">Có người dạy thay</StatusChip>
            ) : null
          }
          renderDetail={(session, hasPendingLeave) => (
            <div className="border-t border-brand-sandLine px-4 py-4 sm:px-5">
              <TutorSessionDetail session={session} now={now} tutorId={tutorId} hasPendingLeave={hasPendingLeave} />
            </div>
          )}
        />
      </div>
    );
  }

  return (
    <div>
      <PortalPageHeader
        icon="calendar_month"
        title="Lịch dạy"
        description="Thời khóa biểu các lớp bạn đang dạy. Bấm vào một buổi để xem chi tiết, điểm danh hoặc xin nghỉ."
        action={switcher}
      />
      <TutorTimetable now={now} tutorId={tutorId} />
    </div>
  );
}
