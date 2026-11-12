import { useState } from "react";
import { Link } from "react-router-dom";
import { AttendanceEditor } from "@/components/dashboard/AttendanceEditor";
import { SessionHomework } from "@/components/tutor/SessionHomework";
import { SessionMaterials } from "@/components/tutor/SessionMaterials";
import { SessionRecordingPlayer } from "@/components/dashboard/SessionRecordingPlayer";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING, PORTAL_BTN_SECONDARY } from "@/constants/classNames";
import { ROUTES } from "@/constants/routes";
import { formatClockTime, parseIsoDate, weekdayName } from "@/utils/date";
import {
  attendanceDeadlinePassed,
  canJoinNow,
  canRequestLeave,
  formatLongDate,
  formatTimeRange,
  isRecordable,
  joinOpensAt,
  joinOpensLater,
  sessionStart,
  teacherOf,
} from "@/utils/sessions";
import type { TutorSessionDetailProps } from "@/interfaces/portal";
import { displayCode } from "@/utils/classes";

type DetailTab = "attendance" | "homework" | "materials";

// Chi tiết một buổi dạy: ngày giờ, link lớp trực tuyến, điểm danh cả lớp (chỉ khi tôi là người dạy buổi đó)
// lối xin nghỉ dạy và mục bài tập (giao, công bố, đóng, chấm bài nộp).
export function TutorSessionDetail({ session, now, tutorId, hasPendingLeave }: TutorSessionDetailProps) {
  // Tôi là người dạy thật sự (gia sư chính hoặc người dạy thay)
  const isTeacher = teacherOf(session) === tutorId;
  const started = sessionStart(session).getTime() <= now.getTime();
  // Còn ghi / sửa điểm danh được (kể cả buổi đã hoàn tất) cho tới 24 giờ sau khi kết thúc, nếu chưa bị khóa
  const editable = isRecordable(session, now) && !attendanceDeadlinePassed(session, now);
  const readOnlyNote = attendanceDeadlinePassed(session, now) ? "Đã quá 24 giờ sau buổi học nên không sửa được nữa." : undefined;

  const day = parseIsoDate(session.date);
  const showTabs = isTeacher && session.status !== "CANCELLED";
  const [tab, setTab] = useState<DetailTab>("attendance");

  const tabs: { value: DetailTab; label: string; icon: string }[] = [
    { value: "attendance", label: "Điểm danh", icon: "fact_check" },
    { value: "homework", label: "Bài tập", icon: "assignment" },
    { value: "materials", label: "Tài liệu", icon: "folder" },
  ];

  return (
    <div className="space-y-5">
      {
        // Tóm tắt buổi
      }
      <div className="flex flex-wrap items-stretch gap-3">
        <div className="flex w-[74px] shrink-0 flex-col items-center justify-center rounded-2xl bg-brand-navy py-2 text-white">
          <span className="text-[11.5px] font-bold uppercase text-white/75">{weekdayName(day, true)}</span>
          <span className="text-[28px] font-extrabold leading-none">{day.getDate()}</span>
          <span className="text-[11px] font-semibold text-white/75">Th {day.getMonth() + 1}</span>
        </div>
        <dl className="grid min-w-0 flex-1 grid-cols-2 gap-2">
          {[
            { icon: "schedule", label: "Giờ dạy", value: formatTimeRange(session) },
            { icon: "event", label: "Ngày", value: formatLongDate(day) },
            { icon: "tag", label: "Lớp", value: displayCode("class", session.classGroupId) },
            { icon: "format_list_numbered", label: "Buổi", value: `Buổi số ${session.sessionNumber}${session.originalSessionId !== null ? " (học bù)" : ""}` },
          ].map((fact) => (
            <div key={fact.label} className="rounded-xl bg-brand-sand/60 px-3 py-2">
              <dt className="flex items-center gap-1 text-[11.5px] font-semibold text-brand-muted">
                <Icon name={fact.icon} className="text-[14px]" />
                {fact.label}
              </dt>
              <dd className="truncate text-[14px] font-bold text-brand-ink">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {!isTeacher && (
        <p className="flex items-center gap-2 rounded-xl bg-brand-tint px-3.5 py-2.5 text-[14px] text-brand-navy">
          <Icon name="swap_horiz" className="text-[19px]" />
          Buổi này đã có gia sư khác dạy thay bạn.
        </p>
      )}
      {isTeacher && session.scheduledTutorId !== null && session.scheduledTutorId !== tutorId && (
        <p className="flex items-center gap-2 rounded-xl bg-brand-tint px-3.5 py-2.5 text-[14px] text-brand-navy">
          <Icon name="swap_horiz" className="text-[19px]" />
          Bạn dạy thay buổi này.
        </p>
      )}

      {isTeacher && (
        <div className="flex flex-wrap items-center gap-2.5">
          {
            // Phòng học chỉ mở từ 15 phút trước giờ dạy đến 15 phút sau khi kết thúc, và chỉ cho người dạy thật sự
          }
          {canJoinNow(session, now) && (
            <Link
              to={`/classroom/${session.sessionId}`}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-brand-orange px-4 text-[14px] font-semibold text-brand-navyDeep transition-colors hover:bg-brand-orangeHover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
            >
              <Icon name="videocam" className="text-[19px]" />
              Vào phòng học trực tuyến
            </Link>
          )}
          {joinOpensLater(session, now) && (
            <StatusChip tone="slate" icon="videocam">
              Phòng học mở lúc {formatClockTime(joinOpensAt(session))}
            </StatusChip>
          )}
          {hasPendingLeave ? (
            <StatusChip tone="amber" icon="hourglass_top">
              Đơn xin nghỉ đang chờ duyệt
            </StatusChip>
          ) : (
            canRequestLeave(session, now) && (
              <Link to={`${ROUTES.tutorLeave}?buoi=${session.sessionId}`} className={PORTAL_BTN_SECONDARY}>
                <Icon name="event_busy" className="text-[18px]" />
                Xin nghỉ dạy buổi này
              </Link>
            )
          )}
        </div>
      )}

      {started && session.status !== "CANCELLED" && (
        <SessionRecordingPlayer sessionId={session.sessionId} />
      )}

      {showTabs && (
        <section className="rounded-2xl border border-brand-sandLine bg-brand-sand/30 p-4">
          {
            // Chi tiết buổi học: Điểm danh / Bài tập / Tài liệu
          }
          <div role="tablist" aria-label="Chi tiết buổi học" className="mb-4 flex flex-wrap gap-1.5 rounded-xl bg-white p-1 shadow-sm">
            {tabs.map((option) => (
              <button
                key={option.value}
                type="button"
                role="tab"
                aria-selected={tab === option.value}
                onClick={() => setTab(option.value)}
                className={`inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13.5px] font-semibold transition-colors ${FOCUS_RING} ${
                  tab === option.value ? "bg-brand-navy text-white shadow-sm" : "text-brand-muted hover:text-brand-navy"
                }`}
              >
                <Icon name={option.icon} className="text-[17px]" />
                {option.label}
              </button>
            ))}
          </div>

          {tab === "attendance" &&
            (session.status === "PENDING_RESCHEDULE" ? (
              <p className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-3 text-[14px] text-brand-muted">
                <Icon name="event_busy" className="text-[18px]" />
                Buổi đang chờ xếp lại lịch nên chưa điểm danh được.
              </p>
            ) : started ? (
              <AttendanceEditor sessionId={session.sessionId} editable={editable} readOnlyNote={readOnlyNote} />
            ) : (
              <p className="flex items-center gap-2 rounded-xl bg-white px-3.5 py-3 text-[14px] text-brand-muted">
                <Icon name="hourglass_empty" className="text-[18px]" />
                Buổi dạy chưa bắt đầu nên chưa điểm danh được.
              </p>
            ))}

          {tab === "homework" && <SessionHomework sessionId={session.sessionId} />}

          {tab === "materials" && <SessionMaterials sessionId={session.sessionId} />}
        </section>
      )}
    </div>
  );
}
