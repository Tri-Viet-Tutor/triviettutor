import { useState } from "react";
import { FilterTabs } from "@/components/dashboard/FilterTabs";
import { Pager } from "@/components/dashboard/Pager";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { StudentHomeworkCard } from "@/components/student/StudentHomeworkCard";
import { SUBMISSION_STATUS } from "@/constants/labels";
import { useStudentHomeworks } from "@/hooks/useLearningData";
import { useNow } from "@/hooks/useNow";
import type { SubmissionStatus } from "@/interfaces/learning";
import { portalErrorMessage } from "@/utils/errors";

/** Số bài mỗi trang */
const PAGE_SIZE = 20;

/**
 * Bài tập về nhà ở các lớp tôi đang học (GET /student/homeworks): làm, lưu nháp, nộp bài trước hạn và xem điểm.
 * Lọc theo trạng thái bài làm của tôi; sắp xếp theo hạn nộp.
 */
export function StudentHomeworkPage() {
  const now = useNow();
  const [filter, setFilter] = useState<SubmissionStatus | "ALL">("ALL");
  const [page, setPage] = useState(0);
  const homeworks = useStudentHomeworks({ status: filter === "ALL" ? undefined : filter, page, size: PAGE_SIZE });
  const items = homeworks.data?.content ?? [];

  return (
    <div>
      <PortalPageHeader
        icon="assignment"
        title="Bài tập"
        description="Bài tập gia sư giao ở các lớp bạn đang học. Nộp trước hạn để được chấm điểm."
      />

      <div className="mb-5">
        <FilterTabs
          label="Trạng thái bài làm"
          value={filter}
          onChange={(value) => {
            setFilter(value);
            setPage(0);
          }}
          tabs={[
            { value: "ALL", label: "Tất cả" },
            { value: "NOT_STARTED", label: SUBMISSION_STATUS.NOT_STARTED.label },
            { value: "IN_PROGRESS", label: SUBMISSION_STATUS.IN_PROGRESS.label },
            { value: "SUBMITTED", label: SUBMISSION_STATUS.SUBMITTED.label },
            { value: "GRADED", label: SUBMISSION_STATUS.GRADED.label },
          ]}
        />
      </div>

      {homeworks.isPending ? (
        <PortalLoading label="Đang tải bài tập" rows={3} />
      ) : homeworks.isError ? (
        <PortalError
          message={portalErrorMessage(homeworks.error, "Không tải được danh sách bài tập.")}
          onRetry={() => void homeworks.refetch()}
        />
      ) : items.length === 0 ? (
        <PortalEmpty
          icon="assignment"
          title={filter === "ALL" ? "Chưa có bài tập nào" : "Không có bài tập ở trạng thái này"}
          description="Bài tập sẽ hiện ở đây khi gia sư công bố bài cho buổi học của bạn."
        />
      ) : (
        <>
          <ul className="space-y-4">
            {items.map((item) => (
              <StudentHomeworkCard key={item.homework.id} item={item} now={now} />
            ))}
          </ul>
          <Pager page={page} totalPages={homeworks.data.totalPages} onChange={setPage} label="Phân trang bài tập" />
        </>
      )}
    </div>
  );
}
