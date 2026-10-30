import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PortalDialog } from "@/components/dashboard/PortalDialog";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { HomeworkFormDialog } from "@/components/tutor/HomeworkFormDialog";
import { SubmissionList } from "@/components/tutor/SubmissionList";
import { Icon } from "@/components/ui/Icon";
import { AUTH_ERROR, PORTAL_BTN_GHOST, PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY, PORTAL_TEXT_LINK } from "@/constants/classNames";
import { HOMEWORK_STATUS } from "@/constants/labels";
import { learningKeys, useSessionHomeworks } from "@/hooks/useLearningData";
import { useNow } from "@/hooks/useNow";
import { useUserId } from "@/hooks/usePortalData";
import type { HomeworkPanelProps, HomeworkResponse, HomeworkStatusRequest } from "@/interfaces/learning";
import { changeHomeworkStatus } from "@/services/learningService";
import { formatDateTime } from "@/utils/date";
import { portalErrorMessage } from "@/utils/errors";

/** Một thao tác đổi trạng thái đang chờ xác nhận */
interface PendingStatus {
  homework: HomeworkResponse;
  status: HomeworkStatusRequest["status"];
}

/**
 * Mục "Bài tập" trong chi tiết buổi dạy: giao bài (nháp), sửa, công bố, đóng bài và xem / chấm bài nộp.
 * Quy tắc theo backend: chỉ sửa / công bố khi chưa quá hạn nộp; bài đã đóng không mở lại được; đóng bài vẫn chấm tiếp được.
 */
export function HomeworkPanel({ sessionId, cancelled }: HomeworkPanelProps) {
  const userId = useUserId();
  const now = useNow();
  const queryClient = useQueryClient();
  const homeworks = useSessionHomeworks(sessionId);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HomeworkResponse | null>(null);
  const [pending, setPending] = useState<PendingStatus | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const changeStatus = useMutation({
    mutationFn: ({ homework, status }: PendingStatus) => changeHomeworkStatus(homework.id, { status, version: homework.version }),
    onSuccess: () => {
      setPending(null);
      void queryClient.invalidateQueries({ queryKey: learningKeys.sessionHomeworks(userId, sessionId) });
    },
    onError: (err) => setError(portalErrorMessage(err, "Chưa đổi được trạng thái bài tập. Vui lòng thử lại.")),
  });

  function openForm(homework: HomeworkResponse | null) {
    setEditing(homework);
    setFormOpen(true);
  }

  function askStatus(homework: HomeworkResponse, status: PendingStatus["status"]) {
    setError(null);
    setPending({ homework, status });
  }

  const items = homeworks.data?.content ?? [];

  return (
    <section className="mt-5" aria-label="Bài tập">
      <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[15.5px] font-bold text-brand-navy">Bài tập</h3>
        {!cancelled && (
          <button type="button" onClick={() => openForm(null)} className={PORTAL_BTN_SECONDARY}>
            <Icon name="add" className="text-[19px]" />
            Giao bài tập
          </button>
        )}
      </div>

      {homeworks.isPending ? (
        <p className="text-[14.5px] text-brand-muted">Đang tải bài tập…</p>
      ) : homeworks.isError ? (
        <p className="text-[14.5px] text-brand-muted">{portalErrorMessage(homeworks.error, "Không tải được bài tập của buổi này.")}</p>
      ) : items.length === 0 ? (
        <p className="text-[14.5px] text-brand-muted">Buổi này chưa có bài tập nào.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((homework) => {
            const style = HOMEWORK_STATUS[homework.status];
            const beforeDeadline = new Date(homework.dueAt).getTime() > now.getTime();
            const editable = !cancelled && homework.status !== "CLOSED" && beforeDeadline;
            const open = expanded === homework.id;
            return (
              <li key={homework.id} className="rounded-xl border border-brand-sandLine bg-white px-3.5 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-brand-ink">{homework.title}</p>
                    <p className="text-[13px] text-brand-muted">
                      Hạn nộp {formatDateTime(new Date(homework.dueAt))}
                      {!beforeDeadline && " (đã quá hạn)"} - Tối đa {homework.maxScore} điểm
                    </p>
                  </div>
                  <StatusChip tone={style.tone} icon={style.icon}>
                    {style.label}
                  </StatusChip>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-[14px] text-brand-ink">{homework.instructions}</p>
                {homework.resourceUrl && (
                  <a href={homework.resourceUrl} target="_blank" rel="noreferrer noopener" className={`${PORTAL_TEXT_LINK} text-[14px]`}>
                    Mở tài liệu đính kèm
                  </a>
                )}
                <div className="mt-2 flex flex-wrap gap-1">
                  {editable && (
                    <button type="button" onClick={() => openForm(homework)} className={PORTAL_BTN_GHOST}>
                      <Icon name="edit" className="text-[18px]" />
                      Sửa
                    </button>
                  )}
                  {homework.status === "DRAFT" && editable && (
                    <button type="button" onClick={() => askStatus(homework, "PUBLISHED")} className={PORTAL_BTN_GHOST}>
                      <Icon name="campaign" className="text-[18px]" />
                      Công bố
                    </button>
                  )}
                  {homework.status !== "CLOSED" && (
                    <button
                      type="button"
                      onClick={() => askStatus(homework, "CLOSED")}
                      className={`${PORTAL_BTN_GHOST} text-red-600 hover:bg-red-50`}
                    >
                      <Icon name="lock" className="text-[18px]" />
                      Đóng bài
                    </button>
                  )}
                  {homework.publishedAt && (
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setExpanded(open ? null : homework.id)}
                      className={PORTAL_BTN_GHOST}
                    >
                      <Icon name={open ? "expand_less" : "expand_more"} className="text-[18px]" />
                      Bài nộp
                    </button>
                  )}
                </div>
                {open && (
                  <div className="mt-2">
                    <SubmissionList homework={homework} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <HomeworkFormDialog open={formOpen} sessionId={sessionId} homework={editing} onClose={() => setFormOpen(false)} />

      <PortalDialog
        open={pending !== null}
        onClose={() => setPending(null)}
        title={pending?.status === "PUBLISHED" ? "Công bố bài tập?" : "Đóng bài tập?"}
        description={
          pending?.status === "PUBLISHED"
            ? "Học viên trong lớp sẽ thấy bài và bắt đầu làm được. Sau khi công bố chỉ lùi được hạn nộp hoặc tăng điểm tối đa."
            : "Học viên không nộp thêm được nữa và bài không mở lại được. Bạn vẫn chấm được các bài đã nộp."
        }
      >
        {error && (
          <p role="alert" className={`${AUTH_ERROR} mb-4 flex items-center gap-1.5`}>
            <Icon name="error" className="text-[17px]" />
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => setPending(null)} className={PORTAL_BTN_SECONDARY}>
            Để sau
          </button>
          <button
            type="button"
            disabled={changeStatus.isPending}
            onClick={() => pending && changeStatus.mutate(pending)}
            className={PORTAL_BTN_PRIMARY}
          >
            {changeStatus.isPending ? "Đang lưu…" : pending?.status === "PUBLISHED" ? "Công bố" : "Đóng bài"}
          </button>
        </div>
      </PortalDialog>
    </section>
  );
}
