import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { RateTutorDialog } from "@/components/student/RateTutor";
import { type StudentTutor, useMyRating, useStudentTutors } from "@/hooks/useRatingData";
import { Icon } from "@/components/ui/Icon";
import { StarRating } from "@/components/ui/StarRating";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { PORTAL_BTN_ACCENT, PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY, PORTAL_CARD } from "@/constants/classNames";
import { subjectLabel } from "@/constants/management";
import { ROUTES } from "@/constants/routes";
import { fetchRatingSummary } from "@/services/ratingService";

/**
 * Trang Đánh giá (/student/feedback): mỗi gia sư đang dạy học viên là một thẻ (môn, khóa, điểm trung bình,
 * đánh giá của mình); bấm "Đánh giá" / "Sửa" mở khung bật lên để chấm sao (RateTutorDialog).
 */
export function StudentFeedbackPage() {
  const { tutors, isPending, isError, refetch } = useStudentTutors();
  const [rating, setRating] = useState<StudentTutor | null>(null);

  return (
    <div>
      <PortalPageHeader icon="reviews" title="Đánh giá gia sư" description="Chấm sao và góp ý cho thầy cô đang dạy bạn. Đánh giá giúp trung tâm nâng chất lượng giảng dạy." />

      {isPending ? (
        <PortalLoading label="Đang tải gia sư của bạn" rows={3} />
      ) : isError ? (
        <PortalError message="Không tải được lớp của bạn." onRetry={refetch} />
      ) : tutors.length === 0 ? (
        <PortalEmpty
          icon="reviews"
          title="Bạn chưa có gia sư nào để đánh giá."
          description="Khi bạn học một lớp, thầy cô phụ trách sẽ hiện ở đây."
          action={
            <Link to={ROUTES.studentCatalog} className={PORTAL_BTN_ACCENT}>
              Xem khóa học đang mở
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {tutors.map((tutor) => (
            <TutorCard key={tutor.id} tutor={tutor} onRate={() => setRating(tutor)} />
          ))}
        </ul>
      )}

      <RateTutorDialog tutor={rating} onClose={() => setRating(null)} />
    </div>
  );
}

function TutorCard({ tutor, onRate }: { tutor: StudentTutor; onRate: () => void }) {
  const mine = useMyRating(tutor.id);
  const summary = useQuery({ queryKey: ["rating-summary", tutor.id], queryFn: () => fetchRatingSummary(tutor.id), retry: false });
  const subjects = [...new Set(tutor.classes.map((item) => item.subject))];
  const average = summary.data?.averageRating;

  return (
    <li className={`flex flex-col p-5 ${PORTAL_CARD}`}>
      <div className="flex items-start gap-3.5">
        <UserAvatar userId={tutor.id} name={tutor.name} size={52} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-extrabold text-brand-ink">{tutor.name}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[13px] text-brand-muted">
            {average != null && summary.data && summary.data.totalRatings > 0 ? (
              <>
                <StarRating value={Number(average)} />
                <strong className="text-brand-ink">{Number(average).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}</strong>({summary.data.totalRatings} đánh giá)
              </>
            ) : (
              "Chưa có ai đánh giá."
            )}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {subjects.map((subject) => (
              <span key={subject} className="rounded-full bg-brand-tint px-2.5 py-0.5 text-[12px] font-bold text-brand-navy">
                {subjectLabel(subject)}
              </span>
            ))}
          </div>
        </div>
      </div>
      <ul className="mt-3 space-y-1 text-[13px] text-brand-muted">
        {tutor.classes.map((item) => (
          <li key={item.id} className="flex items-center gap-1.5">
            <Icon name="menu_book" className="text-[15px]" />
            <span className="truncate">{item.courseName}</span>
          </li>
        ))}
      </ul>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-dashed border-brand-sandLine pt-4">
        {mine.data ? (
          <>
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-brand-ink">
              Bạn đã chấm <StarRating value={Number(mine.data.rating)} />
            </span>
            <button type="button" onClick={onRate} className={PORTAL_BTN_SECONDARY}>
              <Icon name="edit" className="text-[17px]" />
              Sửa
            </button>
          </>
        ) : (
          <>
            <span className="text-[13px] text-brand-muted">{mine.isPending ? "Đang tải…" : "Bạn chưa đánh giá."}</span>
            <button type="button" onClick={onRate} className={PORTAL_BTN_PRIMARY}>
              <Icon name="star" className="text-[17px]" />
              Đánh giá
            </button>
          </>
        )}
      </div>
    </li>
  );
}
