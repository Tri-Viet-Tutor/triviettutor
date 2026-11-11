import { useState } from "react";
import { Link } from "react-router-dom";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { SessionSchedule } from "@/components/dashboard/SessionSchedule";
import { SessionDetail } from "@/components/student/SessionDetail";
import { StudentTimetable } from "@/components/student/StudentTimetable";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING } from "@/constants/classNames";
import { ROUTES } from "@/constants/routes";
import { useNow } from "@/hooks/useNow";

// Liên kết dạng nút chính
const PRIMARY_LINK =
  "inline-flex h-11 items-center justify-center rounded-xl bg-brand-navy px-6 text-[15px] font-semibold text-white transition-colors hover:bg-brand-navyDeep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

type View = "timetable" | "list";

// Trang Lịch học của học viên: mặc định là thời khóa biểu tuần dạng "đảo nổi"; chế độ Danh sách giữ các buổi
// sắp tới / đã qua gom theo tháng. Bấm một buổi để xem chi tiết, điểm danh và xin nghỉ.
export function StudentSchedulePage() {
  const now = useNow();
  const [view, setView] = useState<View>("timetable");

  const switcher = (
    <div role="tablist" aria-label="Cách xem lịch" className="flex rounded-xl bg-slate-100 p-1">
      {(
        [
          { value: "timetable", label: "Thời khóa biểu", icon: "calendar_view_week" },
          { value: "list", label: "Danh sách", icon: "view_agenda" },
        ] as const
      ).map((option) => (
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
          title="Lịch học"
          now={now}
          emptyTitle="Bạn chưa có buổi học nào."
          emptyDescription="Lịch học sẽ hiện ở đây sau khi trung tâm xếp bạn vào lớp."
          emptyAction={
            <Link to={ROUTES.studentCatalog} className={PRIMARY_LINK}>
              Xem các khóa học
            </Link>
          }
          renderDetail={(session, hasPendingLeave) => <SessionDetail session={session} now={now} hasPendingLeave={hasPendingLeave} />}
        />
      </div>
    );
  }

  return (
    <div>
      <PortalPageHeader
        icon="calendar_month"
        title="Lịch học"
        description="Thời khóa biểu tuần của bạn. Bấm vào một buổi để xem chi tiết, vào lớp hoặc xin nghỉ."
        action={switcher}
      />
      <StudentTimetable now={now} />
    </div>
  );
}
