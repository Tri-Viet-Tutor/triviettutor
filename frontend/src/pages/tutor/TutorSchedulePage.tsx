import { SessionSchedule } from "@/components/dashboard/SessionSchedule";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { needsAttendance, teacherOf } from "@/utils/sessions";
import { useUserId } from "@/hooks/usePortalData";
import { TutorSessionDetail } from "@/components/tutor/TutorSessionDetail";
import { useNow } from "@/hooks/useNow";

/**
 * Trang Lịch dạy của gia sư: các buổi sắp tới và đã qua, gom theo tháng.
 * Bấm một buổi để xem chi tiết, điểm danh cả lớp và xin nghỉ dạy. Mở kèm ?buoi=<mã buổi> thì buổi đó được mở sẵn.
 */
export function TutorSchedulePage() {
  const now = useNow();
  const tutorId = useUserId();
  return (
    <SessionSchedule
      title="Lịch dạy"
      now={now}
      emptyTitle="Bạn chưa có buổi dạy nào"
      emptyDescription="Lịch dạy sẽ hiện ở đây sau khi trung tâm phân công lớp cho bạn."
      // Nhãn phụ: cần điểm danh, hoặc buổi đã có người dạy thay
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
  );
}
