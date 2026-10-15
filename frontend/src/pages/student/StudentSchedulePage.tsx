import { Link } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { SessionSchedule } from "@/components/dashboard/SessionSchedule";
import { SessionDetail } from "@/components/student/SessionDetail";
import { useNow } from "@/hooks/useNow";

/** Liên kết dạng nút chính */
const PRIMARY_LINK =
  "inline-flex h-11 items-center justify-center rounded-md bg-brand-navy px-6 text-[15px] font-semibold text-white transition-colors hover:bg-brand-navyDeep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

/**
 * Trang Lịch học của học viên: các buổi sắp tới và đã qua, gom theo tháng.
 * Bấm một buổi để xem chi tiết, điểm danh và xin nghỉ. Mở kèm buoi=<mã buổi> thì buổi đó được mở sẵn.
 */
export function StudentSchedulePage() {
  const now = useNow();
  return (
    <SessionSchedule
      title="Lịch học"
      now={now}
      emptyTitle="Bạn chưa có buổi học nào"
      emptyDescription="Lịch học sẽ hiện ở đây sau khi trung tâm xếp bạn vào lớp."
      emptyAction={
        <Link to={ROUTES.studentCatalog} className={PRIMARY_LINK}>
          Xem các khóa học
        </Link>
      }
      renderDetail={(session, hasPendingLeave) => <SessionDetail session={session} now={now} hasPendingLeave={hasPendingLeave} />}
    />
  );
}
