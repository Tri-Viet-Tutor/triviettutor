import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING, PORTAL_BTN_SECONDARY } from "@/constants/classNames";
import { HOMEWORK_STATUS } from "@/constants/labels";
import { ROUTES, homeworkPath } from "@/constants/routes";
import { homeworkKeys } from "@/hooks/useHomeworkData";
import { useUserId } from "@/hooks/usePortalData";
import { listSessionHomeworks } from "@/services/homeworkService";
import { formatDateTime } from "@/utils/homework";

/**
 * Bài tập của một buổi (khu gia sư): danh sách bài và lối giao bài mới.
 * Soạn câu hỏi, công bố và chấm bài nằm ở trang riêng của từng bài.
 */
export function SessionHomework({ sessionId }: { sessionId: number }) {
  const userId = useUserId();
  const homeworks = useQuery({
    queryKey: [...homeworkKeys.all(userId), "session", sessionId],
    queryFn: () => listSessionHomeworks(sessionId),
  });
  const items = homeworks.data?.content ?? [];

  return (
    <div className="space-y-3">
      {homeworks.isPending && <p className="text-[14px] text-brand-muted">Đang tải bài tập…</p>}
      {homeworks.isError && <p className="text-[14px] text-brand-muted">Chưa tải được bài tập của buổi này.</p>}
      {homeworks.isSuccess && items.length === 0 && <p className="text-[14px] text-brand-muted">Buổi này chưa có bài tập.</p>}
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((homework) => {
            const status = HOMEWORK_STATUS[homework.status];
            return (
              <li key={homework.id}>
                <Link
                  to={homeworkPath(homework.id, "tutor")}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3.5 py-2.5 ring-1 ring-brand-sandLine transition-colors hover:ring-brand-navy/40 ${FOCUS_RING}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[14.5px] font-semibold text-brand-navy">{homework.title}</span>
                    <span className="block text-[13px] text-brand-muted">Hạn nộp {formatDateTime(homework.dueAt)}</span>
                  </span>
                  <StatusChip tone={status.tone} icon={status.icon}>
                    {status.label}
                  </StatusChip>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      <Link to={`${ROUTES.tutorHomeworkNew}?buoi=${sessionId}`} className={PORTAL_BTN_SECONDARY}>
        <Icon name="assignment_add" className="text-[19px]" />
        Giao bài tập
      </Link>
    </div>
  );
}
