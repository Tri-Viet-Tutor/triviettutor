import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { FilterTabs } from "@/components/dashboard/FilterTabs";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING, PORTAL_BTN_SECONDARY } from "@/constants/classNames";
import { HOMEWORK_STATUS } from "@/constants/labels";
import { ROUTES, homeworkPath } from "@/constants/routes";
import { homeworkKeys } from "@/hooks/useHomeworkData";
import { useUserId } from "@/hooks/usePortalData";
import { fetchSubmissions, listSessionHomeworks } from "@/services/homeworkService";
import { formatDateTime } from "@/utils/homework";

type GradingFilter = "all" | "pending" | "done";
type DueFilter = "all" | "overdue" | "open";

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
  const [gradingFilter, setGradingFilter] = useState<GradingFilter>("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");

  // Bài đã giao (PUBLISHED/CLOSED) mới có bài nộp — tải nhẹ, chỉ lấy bài SUBMITTED (chưa chấm) để biết lớp còn bài cần chấm hay không
  const gradableItems = items.filter((homework) => homework.status !== "DRAFT");
  const pendingQueries = useQueries({
    queries: gradableItems.map((homework) => ({
      queryKey: homeworkKeys.submissions(userId, homework.id),
      queryFn: () => fetchSubmissions(homework.id),
    })),
  });
  const pendingCountByHomework = useMemo(() => {
    const map = new Map<number, number>();
    gradableItems.forEach((homework, index) => {
      const submissions = pendingQueries[index]?.data?.content ?? [];
      map.set(homework.id, submissions.filter((submission) => submission.status === "SUBMITTED").length);
    });
    return map;
  }, [gradableItems, pendingQueries]);

  const now = Date.now();
  const filteredItems = items.filter((homework) => {
    if (dueFilter === "overdue" && new Date(homework.dueAt).getTime() > now) return false;
    if (dueFilter === "open" && new Date(homework.dueAt).getTime() <= now) return false;
    if (gradingFilter === "pending" && (pendingCountByHomework.get(homework.id) ?? 0) === 0) return false;
    if (gradingFilter === "done" && homework.status === "DRAFT") return false;
    if (gradingFilter === "done" && (pendingCountByHomework.get(homework.id) ?? 0) > 0) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      {homeworks.isPending && <p className="text-[14px] text-brand-muted">Đang tải bài tập…</p>}
      {homeworks.isError && <p className="text-[14px] text-brand-muted">Chưa tải được bài tập của buổi này.</p>}
      {homeworks.isSuccess && items.length === 0 && <p className="text-[14px] text-brand-muted">Buổi này chưa có bài tập.</p>}

      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <FilterTabs
            label="Lọc theo trạng thái chấm điểm"
            value={gradingFilter}
            onChange={setGradingFilter}
            tabs={[
              { value: "all", label: "Tất cả" },
              { value: "pending", label: "Còn bài chưa chấm" },
              { value: "done", label: "Không còn bài chưa chấm" },
            ]}
          />
          <FilterTabs
            label="Lọc theo hạn nộp"
            value={dueFilter}
            onChange={setDueFilter}
            tabs={[
              { value: "all", label: "Mọi hạn nộp" },
              { value: "open", label: "Còn hạn" },
              { value: "overdue", label: "Quá hạn" },
            ]}
          />
        </div>
      )}
      {items.length > 0 && filteredItems.length === 0 && (
        <p className="text-[13.5px] text-brand-muted">Không có bài tập nào khớp bộ lọc.</p>
      )}

      {filteredItems.length > 0 && (
        <ul className="space-y-2">
          {filteredItems.map((homework) => {
            const status = HOMEWORK_STATUS[homework.status];
            const pendingCount = pendingCountByHomework.get(homework.id) ?? 0;
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
                  <span className="flex shrink-0 items-center gap-1.5">
                    {pendingCount > 0 && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11.5px] font-bold text-amber-800">
                        {pendingCount} bài chưa chấm
                      </span>
                    )}
                    <StatusChip tone={status.tone} icon={status.icon}>
                      {status.label}
                    </StatusChip>
                  </span>
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
