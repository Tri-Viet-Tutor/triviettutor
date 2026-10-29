import { useState } from "react";
import { Link } from "react-router-dom";
import { Pager } from "@/components/dashboard/Pager";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING, PORTAL_BTN_ACCENT, PORTAL_CARD } from "@/constants/classNames";
import { HOMEWORK_STATUS } from "@/constants/labels";
import { ROUTES, homeworkPath } from "@/constants/routes";
import { useTutorHomeworks } from "@/hooks/useHomeworkData";
import { formatDate, parseIsoDate } from "@/utils/date";
import { formatDateTime } from "@/utils/homework";

/**
 * Trang Bài tập của gia sư: mọi bài tập của các buổi đang dạy, hạn nộp mới nhất trước,
 * kèm số bài chờ chấm. Bấm một bài để sửa, công bố, đóng hoặc chấm.
 */
export function TutorHomeworksPage() {
  const [page, setPage] = useState(0);
  const homeworks = useTutorHomeworks(page);
  const createLink = (
    <Link to={ROUTES.tutorHomeworkNew} className={PORTAL_BTN_ACCENT}>
      <Icon name="add" className="text-[19px]" />
      Tạo bài tập
    </Link>
  );

  return (
    <>
      <PortalPageHeader
        icon="assignment"
        title="Bài tập"
        description="Tạo bài tập, bài kiểm tra trắc nghiệm / tự luận cho từng buổi, đặt giờ mở, hạn nộp, mật khẩu và chấm bài học viên nộp."
        action={createLink}
      />

      {homeworks.isPending && <PortalLoading label="Đang tải bài tập" />}
      {homeworks.isError && <PortalError message="Chưa tải được danh sách bài tập." onRetry={() => void homeworks.refetch()} />}
      {homeworks.data?.content.length === 0 && (
        <PortalEmpty
          icon="assignment_add"
          title="Bạn chưa tạo bài tập nào"
          description="Tạo bài tập cho một buổi học, công bố để học viên của lớp thấy đường dẫn và vào làm."
          action={createLink}
        />
      )}

      {homeworks.data && homeworks.data.content.length > 0 && (
        <ul className="space-y-3">
          {homeworks.data.content.map(({ homework, classGroupId, sessionNumber, sessionDate, submittedCount, gradedCount }) => {
            const status = HOMEWORK_STATUS[homework.status];
            return (
              <li key={homework.id}>
                <Link
                  to={homeworkPath(homework.id, "tutor")}
                  className={`flex flex-col gap-3 p-4 transition-colors hover:border-brand-navy/40 sm:flex-row sm:items-center sm:justify-between sm:p-5 ${PORTAL_CARD} ${FOCUS_RING}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-bold text-brand-navy">{homework.title}</p>
                    <p className="mt-0.5 text-[14px] text-brand-muted">
                      Lớp #{classGroupId}, buổi {sessionNumber} ({formatDate(parseIsoDate(sessionDate))}) · Hạn nộp{" "}
                      {formatDateTime(homework.dueAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {submittedCount > 0 && (
                      <StatusChip tone="amber" icon="pending_actions">
                        {submittedCount} bài chờ chấm
                      </StatusChip>
                    )}
                    {gradedCount > 0 && <StatusChip tone="slate">{gradedCount} đã chấm</StatusChip>}
                    {homework.passwordProtected && (
                      <StatusChip tone="navy" icon="key">
                        Có mật khẩu
                      </StatusChip>
                    )}
                    <StatusChip tone={status.tone} icon={status.icon}>
                      {status.label}
                    </StatusChip>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {homeworks.data && <Pager page={page} totalPages={homeworks.data.totalPages} onChange={setPage} label="Trang danh sách bài tập" />}
    </>
  );
}
