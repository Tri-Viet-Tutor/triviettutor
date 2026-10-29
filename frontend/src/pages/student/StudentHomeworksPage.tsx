import { useState } from "react";
import { Link } from "react-router-dom";
import { FilterTabs } from "@/components/dashboard/FilterTabs";
import { Pager } from "@/components/dashboard/Pager";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { FOCUS_RING, PORTAL_CARD } from "@/constants/classNames";
import { SUBMISSION_STATUS } from "@/constants/labels";
import { homeworkPath } from "@/constants/routes";
import { useStudentHomeworks } from "@/hooks/useHomeworkData";
import { useNow } from "@/hooks/useNow";
import { formatDateTime, formatScore, homeworkPhase } from "@/utils/homework";
import type { SubmissionStatus } from "@/interfaces/homework";

type StatusTab = SubmissionStatus | "ALL";

const TABS: { value: StatusTab; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "NOT_STARTED", label: "Chưa làm" },
  { value: "IN_PROGRESS", label: "Đang làm" },
  { value: "SUBMITTED", label: "Chờ chấm" },
  { value: "GRADED", label: "Đã có điểm" },
];

/** Trang Bài tập của học viên: bài tập gia sư đã công bố cho các lớp đang học, bấm vào để làm hoặc xem điểm. */
export function StudentHomeworksPage() {
  const now = useNow();
  const [tab, setTab] = useState<StatusTab>("ALL");
  const [page, setPage] = useState(0);
  const homeworks = useStudentHomeworks({ status: tab === "ALL" ? undefined : tab, page, size: 20 });

  return (
    <>
      <PortalPageHeader
        icon="assignment"
        title="Bài tập"
        description="Bài tập và bài kiểm tra gia sư giao cho các lớp bạn đang học. Bài có mật khẩu thì hỏi gia sư trước khi bắt đầu."
      />
      <div className="mb-4">
        <FilterTabs
          label="Lọc theo trạng thái"
          tabs={TABS}
          value={tab}
          onChange={(value) => {
            setTab(value);
            setPage(0);
          }}
        />
      </div>

      {homeworks.isPending && <PortalLoading label="Đang tải bài tập" />}
      {homeworks.isError && <PortalError message="Chưa tải được bài tập." onRetry={() => void homeworks.refetch()} />}
      {homeworks.data?.content.length === 0 && (
        <PortalEmpty
          icon="task_alt"
          title="Không có bài tập nào"
          description="Khi gia sư công bố bài mới, bạn sẽ nhận thông báo ở chuông góc trên."
        />
      )}

      {homeworks.data && homeworks.data.content.length > 0 && (
        <ul className="space-y-3">
          {homeworks.data.content.map(({ homework, classGroupId, submission }) => {
            const style = SUBMISSION_STATUS[submission.status];
            const phase = homeworkPhase(homework, now);
            return (
              <li key={homework.id}>
                <Link
                  to={homeworkPath(homework.id, "student")}
                  className={`flex flex-col gap-3 p-4 transition-colors hover:border-brand-navy/40 sm:flex-row sm:items-center sm:justify-between sm:p-5 ${PORTAL_CARD} ${FOCUS_RING}`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-[16px] font-bold text-brand-navy">{homework.title}</p>
                    <p className="mt-0.5 text-[14px] text-brand-muted">
                      Lớp #{classGroupId} · Hạn nộp {formatDateTime(homework.dueAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {submission.status === "GRADED" && submission.score !== undefined && (
                      <StatusChip tone="green" icon="star">
                        {formatScore(submission.score)} / {formatScore(homework.maxScore)}
                      </StatusChip>
                    )}
                    {submission.lateSeconds !== undefined && <StatusChip tone="red">Nộp trễ</StatusChip>}
                    {(submission.status === "NOT_STARTED" || submission.status === "IN_PROGRESS") && phase === "upcoming" && (
                      <StatusChip tone="slate" icon="schedule">
                        Chưa mở
                      </StatusChip>
                    )}
                    {(submission.status === "NOT_STARTED" || submission.status === "IN_PROGRESS") && phase === "overdue" && (
                      <StatusChip tone="red" icon="alarm">
                        Quá hạn
                      </StatusChip>
                    )}
                    {homework.passwordProtected && submission.status === "NOT_STARTED" && (
                      <StatusChip tone="navy" icon="key">
                        Cần mật khẩu
                      </StatusChip>
                    )}
                    <StatusChip tone={style.tone} icon={style.icon}>
                      {style.label}
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
