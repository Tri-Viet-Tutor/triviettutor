import { Link } from "react-router-dom";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { SessionHomeworkList } from "@/components/student/SessionHomeworkList";
import { SessionRecordingPlayer } from "@/components/dashboard/SessionRecordingPlayer";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ATTENDANCE_STATUS } from "@/constants/labels";
import { ROUTES } from "@/constants/routes";
import { useSessionAttendance } from "@/hooks/usePortalData";
import { formatClockTime, parseIsoDate } from "@/utils/date";
import { useState } from "react";
import {
  canJoinNow,
  canRequestLeave,
  formatLongDate,
  formatTimeRange,
  hasSubstituteTutor,
  joinOpensAt,
  joinOpensLater,
  sessionStart,
  teacherOf,
} from "@/utils/sessions";
import { RateTutorDialog } from "@/components/student/RateTutor";
import { useStudentTutors } from "@/hooks/useRatingData";
import type { StudentTutor } from "@/interfaces/dto";
import type { SessionDetailProps } from "@/interfaces/portal";
import { displayCode } from "@/utils/classes";

// Khung chung của hai nút "Vào lớp" và "Xin nghỉ" (màu thêm ở từng nút)
const LINK =
  "inline-flex h-10 items-center justify-center gap-1.5 rounded-xl px-4 text-[14px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

// Chi tiết một buổi học: ngày giờ, ghi chú (học bù, dạy thay), điểm danh của tôi
// (GET /sessions/{id}/attendance, chỉ tải khi buổi đã bắt đầu), bài tập đã công bố và lối xin nghỉ / vào lớp.
export function SessionDetail({ session, now, hasPendingLeave }: SessionDetailProps) {
  const started = sessionStart(session).getTime() <= now.getTime();
  // Chỉ xem điểm danh khi buổi đã bắt đầu và không bị hủy
  const showAttendance = started && session.status !== "CANCELLED";
  const attendance = useSessionAttendance(session.sessionId, showAttendance);
  // Học viên chỉ nhận về bản ghi của chính mình
  const record = attendance.data?.records[0];
  const recordStyle = record ? ATTENDANCE_STATUS[record.status] : null;
  // Phòng học chỉ mở từ 15 phút trước giờ học đến 15 phút sau khi kết thúc
  const joinNow = canJoinNow(session, now);
  const opensLater = joinOpensLater(session, now);
  // Hiện khu vực vào lớp khi phòng đang mở hoặc sắp mở
  const canJoin = joinNow || opensLater;
  const canLeave = canRequestLeave(session, now);
  // Gia sư dạy buổi này: ưu tiên người dạy thay nếu có (teacherOf), tra tên từ các lớp đang học
  const { tutors } = useStudentTutors();
  const teacherId = teacherOf(session);
  const teacher = tutors.find((item) => item.id === teacherId);
  // Buổi đã học xong: mời chấm sao gia sư dạy buổi đó
  const tutor = session.status === "COMPLETED" ? teacher : undefined;
  const [rating, setRating] = useState<StudentTutor | null>(null);

  return (
    <div className="border-t border-brand-sandLine bg-brand-sand/60/70 px-4 py-4 sm:px-5">
      <dl className="grid grid-cols-1 gap-x-8 gap-y-2.5 text-[14.5px] sm:grid-cols-2">
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-brand-muted">Ngày</dt>
          <dd className="font-medium text-brand-ink">{formatLongDate(parseIsoDate(session.date))}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-brand-muted">Giờ học</dt>
          <dd className="font-medium text-brand-ink">{formatTimeRange(session)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-brand-muted">Gia sư</dt>
          <dd className="min-w-0 font-medium text-brand-ink">
            {teacher ? (
              <span className="flex min-w-0 items-center gap-1.5">
                <UserAvatar userId={teacher.id} name={teacher.name} size={24} />
                <span className="truncate">{teacher.name}</span>
              </span>
            ) : teacherId ? (
              // Gia sư dạy thay không nằm trong danh sách gia sư của các lớp đang học nên chưa tra được tên
              <span className="text-brand-muted">{hasSubstituteTutor(session) ? "Gia sư dạy thay" : "Đang cập nhật"}</span>
            ) : (
              <span className="text-brand-muted">Chưa phân công</span>
            )}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-brand-muted">Lớp</dt>
          <dd className="font-medium text-brand-ink">
            {displayCode("class", session.classGroupId)}, buổi số {session.sessionNumber}
          </dd>
        </div>
        {showAttendance && (
          <div className="flex gap-2">
            <dt className="w-20 shrink-0 text-brand-muted">Điểm danh</dt>
            <dd className="min-w-0">
              {attendance.isPending && <span className="text-brand-muted">Đang tải…</span>}
              {attendance.isError && <span className="text-brand-muted">Chưa xem được điểm danh của buổi này.</span>}
              {attendance.isSuccess && !record && <span className="text-brand-muted">Gia sư chưa điểm danh.</span>}
              {record && recordStyle && (
                <span className="flex flex-wrap items-center gap-2">
                  <StatusChip tone={recordStyle.tone} icon={recordStyle.icon}>
                    {recordStyle.label}
                  </StatusChip>
                  {record.arrivedAt && <span className="text-brand-muted">tới lớp lúc {formatClockTime(new Date(record.arrivedAt))}</span>}
                </span>
              )}
            </dd>
          </div>
        )}
      </dl>

      {record?.note && <p className="mt-3 text-[14.5px] text-brand-ink">Ghi chú của gia sư: {record.note}</p>}

      {(session.originalSessionId !== null || hasSubstituteTutor(session)) && (
        <ul className="mt-3 space-y-1.5 text-[14.5px] text-brand-ink">
          {session.originalSessionId !== null && (
            <li className="flex items-center gap-2">
              <Icon name="event_repeat" className="text-[18px] text-brand-navy" />
              Đây là buổi học bù.
            </li>
          )}
          {hasSubstituteTutor(session) && (
            <li className="flex items-center gap-2">
              <Icon name="swap_horiz" className="text-[18px] text-brand-navy" />
              Buổi này có gia sư dạy thay.
            </li>
          )}
        </ul>
      )}

      <SessionHomeworkList sessionId={session.sessionId} />

      {started && session.status !== "CANCELLED" && (
        <div className="mt-3">
          <SessionRecordingPlayer sessionId={session.sessionId} />
        </div>
      )}

      {(canJoin || canLeave || hasPendingLeave) && (
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          {tutor && (
            <button
              type="button"
              onClick={() => setRating(tutor)}
              className={`${LINK} bg-amber-400 text-brand-navyDeep hover:bg-amber-300`}
            >
              <Icon name="star" className="text-[19px] [font-variation-settings:'FILL'_1]" />
              Đánh giá gia sư
            </button>
          )}
          {joinNow && (
            <Link
              to={`/classroom/${session.sessionId}`}
              className={`${LINK} bg-brand-orange text-brand-navyDeep hover:bg-brand-orangeHover`}
            >
              <Icon name="videocam" className="text-[19px]" />
              Vào phòng học trực tuyến
            </Link>
          )}
          {opensLater && (
            <StatusChip tone="slate" icon="videocam">
              Phòng học mở lúc {formatClockTime(joinOpensAt(session))}
            </StatusChip>
          )}
          {hasPendingLeave ? (
            <StatusChip tone="amber" icon="hourglass_top">
              Đơn xin nghỉ đang chờ duyệt
            </StatusChip>
          ) : (
            canLeave && (
              <Link
                to={`${ROUTES.studentLeave}?buoi=${session.sessionId}`}
                className={`${LINK} border border-brand-sandLine bg-white text-brand-navy hover:border-brand-navy`}
              >
                Xin nghỉ buổi này
              </Link>
            )
          )}
        </div>
      )}
      <RateTutorDialog tutor={rating} onClose={() => setRating(null)} />
    </div>
  );
}
