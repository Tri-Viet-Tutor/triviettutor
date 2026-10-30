import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { Icon } from "@/components/ui/Icon";
import {
  AUTH_ERROR,
  PORTAL_BTN_ACCENT,
  PORTAL_BTN_PRIMARY,
  PORTAL_BTN_SECONDARY,
  PORTAL_CARD,
  PORTAL_INPUT,
  PORTAL_LABEL,
  PORTAL_TEXT_LINK,
} from "@/constants/classNames";
import { SUBMISSION_STATUS } from "@/constants/labels";
import { learningKeys } from "@/hooks/useLearningData";
import { useUserId } from "@/hooks/usePortalData";
import type { PageResponse } from "@/interfaces/api";
import type { StudentHomeworkCardProps, StudentHomeworkResponse, SubmissionResponse } from "@/interfaces/learning";
import { saveSubmissionDraft, startSubmission, submitSubmission } from "@/services/learningService";
import { formatDate, formatDateTime, parseIsoDate } from "@/utils/date";
import { portalErrorMessage } from "@/utils/errors";

/** Thao tác ghi bài làm */
type SaveAction = "draft" | "submit";

/**
 * Một bài tập của học viên: đề bài, hạn nộp, bài làm của tôi.
 * Chưa làm → Bắt đầu làm; đang làm → lưu nháp / nộp bài; đã nộp → sửa và nộp lại trước hạn khi chưa chấm;
 * đã chấm → xem điểm và nhận xét. Hết hạn hoặc bài đã đóng thì chỉ xem.
 */
export function StudentHomeworkCard({ item, now }: StudentHomeworkCardProps) {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const { homework } = item;
  const submission = item.submission;
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const due = new Date(homework.dueAt);
  const accepting = homework.status === "PUBLISHED" && due.getTime() > now.getTime();
  const style = SUBMISSION_STATUS[submission.status];

  /**
   * Ghi bài làm mới vào ngay danh sách đang xem (thay vì tải lại) để thẻ không biến mất khỏi bộ lọc hiện tại
   * và trình soạn / thông báo vẫn còn; các danh sách lọc khác đang không hiển thị thì bỏ cache để lần mở sau tải lại.
   */
  function onDone(updated: SubmissionResponse, message: string | null) {
    setNotice(message);
    const listKey = learningKeys.studentHomeworksAll(userId);
    queryClient.setQueriesData<PageResponse<StudentHomeworkResponse>>(
      { queryKey: listKey },
      (page) =>
        page && {
          ...page,
          content: page.content.map((row) => (row.homework.id === homework.id ? { ...row, submission: updated } : row)),
        },
    );
    queryClient.removeQueries({ queryKey: listKey, type: "inactive" });
  }

  function openEditor(from: SubmissionResponse) {
    setContent(from.content ?? "");
    setResourceUrl(from.resourceUrl ?? "");
    setError(null);
    setNotice(null);
    setEditing(true);
  }

  const start = useMutation({
    mutationFn: () => startSubmission(homework.id),
    onSuccess: (updated) => {
      onDone(updated, null);
      openEditor(updated);
    },
    onError: (err) => setError(portalErrorMessage(err, "Chưa bắt đầu được bài tập. Vui lòng thử lại.")),
  });

  const save = useMutation({
    mutationFn: (action: SaveAction) => {
      const request = {
        ...(content.trim() ? { content: content.trim() } : {}),
        ...(resourceUrl.trim() ? { resourceUrl: resourceUrl.trim() } : {}),
        version: submission.version as number,
      };
      return action === "submit" ? submitSubmission(homework.id, request) : saveSubmissionDraft(homework.id, request);
    },
    onSuccess: (updated, action) => {
      if (action === "submit") setEditing(false);
      onDone(updated, action === "submit" ? "Đã nộp bài." : "Đã lưu bản nháp.");
    },
    onError: (err) => setError(portalErrorMessage(err, "Chưa lưu được bài làm. Vui lòng thử lại.")),
  });

  function handleSave(action: SaveAction) {
    if (action === "submit" && !content.trim() && !resourceUrl.trim()) {
      return setError("Hãy nhập bài làm hoặc dán link bài làm trước khi nộp.");
    }
    setError(null);
    save.mutate(action);
  }

  const closedNote = !accepting ? (homework.status === "CLOSED" ? "Bài tập đã đóng." : "Đã quá hạn nộp.") : null;

  return (
    <li className={`${PORTAL_CARD} px-5 py-4`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[12.5px] font-bold uppercase tracking-wide text-brand-orangeHover">
            Lớp #{item.classGroupId} · buổi {formatDate(parseIsoDate(item.sessionDate))}
          </p>
          <h2 className="text-[17px] font-bold text-brand-ink">{homework.title}</h2>
          <p className={`text-[13.5px] ${accepting ? "text-brand-muted" : "text-red-700"}`}>
            Hạn nộp {formatDateTime(due)}
            {closedNote && ` · ${closedNote}`} · Tối đa {homework.maxScore} điểm
          </p>
        </div>
        <StatusChip tone={style.tone} icon={style.icon}>
          {style.label}
        </StatusChip>
      </div>

      <p className="mt-3 whitespace-pre-wrap text-[14.5px] text-brand-ink">{homework.instructions}</p>
      {homework.resourceUrl && (
        <a href={homework.resourceUrl} target="_blank" rel="noreferrer noopener" className={`${PORTAL_TEXT_LINK} text-[14px]`}>
          Mở tài liệu đính kèm
        </a>
      )}

      {submission.status === "GRADED" && (
        <div className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-[14.5px] text-emerald-900">
          <p className="font-bold">
            Điểm: {submission.score}/{homework.maxScore}
          </p>
          {submission.feedback && <p className="mt-1 whitespace-pre-wrap">Nhận xét của gia sư: {submission.feedback}</p>}
        </div>
      )}

      {!editing && (submission.content || submission.resourceUrl) && (
        <div className="mt-3 rounded-xl bg-brand-sand px-4 py-3 text-[14px]">
          <p className="mb-1 font-semibold text-brand-muted">
            {submission.status === "IN_PROGRESS" ? "Bản nháp của bạn" : "Bài bạn đã nộp"}
            {submission.submittedAt && ` (lúc ${formatDateTime(new Date(submission.submittedAt))})`}
          </p>
          {submission.content && <p className="whitespace-pre-wrap text-brand-ink">{submission.content}</p>}
          {submission.resourceUrl && (
            <a href={submission.resourceUrl} target="_blank" rel="noreferrer noopener" className={PORTAL_TEXT_LINK}>
              Mở link bài làm
            </a>
          )}
        </div>
      )}

      {editing && accepting && (
        <div className="mt-4 space-y-3">
          <div>
            <label htmlFor={`hw-content-${homework.id}`} className={PORTAL_LABEL}>
              Bài làm
            </label>
            <textarea
              id={`hw-content-${homework.id}`}
              rows={6}
              maxLength={20000}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className={`${PORTAL_INPUT} h-auto py-2`}
            />
          </div>
          <div>
            <label htmlFor={`hw-url-${homework.id}`} className={PORTAL_LABEL}>
              Link bài làm (không bắt buộc, https)
            </label>
            <input
              id={`hw-url-${homework.id}`}
              type="url"
              maxLength={2048}
              placeholder="https://…"
              value={resourceUrl}
              onChange={(event) => setResourceUrl(event.target.value)}
              className={PORTAL_INPUT}
            />
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className={`${AUTH_ERROR} mt-3 flex items-center gap-1.5`}>
          <Icon name="error" className="text-[17px]" />
          {error}
        </p>
      )}
      {notice && !error && (
        <p role="status" className="mt-3 flex items-center gap-1.5 text-[13.5px] font-medium text-emerald-700">
          <Icon name="check_circle" className="text-[17px]" />
          {notice}
        </p>
      )}

      {accepting && submission.status !== "GRADED" && (
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          {submission.status === "NOT_STARTED" && (
            <button type="button" disabled={start.isPending} onClick={() => start.mutate()} className={PORTAL_BTN_ACCENT}>
              <Icon name="edit" className="text-[19px]" />
              {start.isPending ? "Đang mở…" : "Bắt đầu làm"}
            </button>
          )}
          {submission.status !== "NOT_STARTED" && !editing && (
            <button type="button" onClick={() => openEditor(submission)} className={PORTAL_BTN_SECONDARY}>
              <Icon name="edit" className="text-[19px]" />
              {submission.status === "SUBMITTED" ? "Sửa và nộp lại" : "Tiếp tục làm"}
            </button>
          )}
          {editing && (
            <>
              <button type="button" onClick={() => setEditing(false)} className={PORTAL_BTN_SECONDARY}>
                Đóng
              </button>
              {submission.status === "IN_PROGRESS" && (
                <button type="button" disabled={save.isPending} onClick={() => handleSave("draft")} className={PORTAL_BTN_SECONDARY}>
                  Lưu nháp
                </button>
              )}
              <button type="button" disabled={save.isPending} onClick={() => handleSave("submit")} className={PORTAL_BTN_PRIMARY}>
                {save.isPending ? "Đang lưu…" : submission.status === "SUBMITTED" ? "Nộp lại" : "Nộp bài"}
              </button>
            </>
          )}
        </div>
      )}
    </li>
  );
}
