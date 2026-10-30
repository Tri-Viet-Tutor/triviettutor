import { useState } from "react";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { SessionSchedule } from "@/components/dashboard/SessionSchedule";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { TutorSessionDetail } from "@/components/tutor/TutorSessionDetail";
import { TutorTimetable } from "@/components/tutor/TutorTimetable";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING } from "@/constants/classNames";
import { useUserId } from "@/hooks/usePortalData";
import { useNow } from "@/hooks/useNow";
import { needsAttendance, teacherOf } from "@/utils/sessions";

type View = "timetable" | "list";

const VIEWS: { value: View; label: string; icon: string }[] = [
  { value: "timetable", label: "Thời khóa biểu", icon: "calendar_view_week" },
  { value: "list", label: "Danh sách", icon: "view_agenda" },
];

/**
 * Trang Lịch dạy của gia sư: mặc định là thời khóa biểu theo tuần (mọi lớp đang dạy, tô màu theo lớp);
 * chế độ Danh sách giữ các buổi sắp tới / đã qua gom theo tháng. Bấm một buổi để xem chi tiết, điểm danh và xin nghỉ.
 */
export function TutorSchedulePage() {
  const now = useNow();
  const tutorId = useUserId();
  const [view, setView] = useState<View>("timetable");

  const switcher = (
    <div role="tablist" aria-label="Cách xem lịch" className="flex rounded-xl bg-slate-100 p-1">
      {VIEWS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={view === option.value}
          onClick={() => setView(option.value)}
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
    return (
      <div>
        <div className="mb-4 flex justify-end">{switcher}</div>
        <SessionSchedule
          title="Lịch dạy"
          now={now}
          emptyTitle="Bạn chưa có buổi dạy nào"
          emptyDescription="Lịch dạy sẽ hiện ở đây sau khi trung tâm phân công lớp cho bạn."
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
            <TutorSessionDetail session={session} now={now} tutorId={tutorId} hasPendingLeave={hasPendingLeave} />
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
