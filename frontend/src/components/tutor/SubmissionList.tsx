import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { PortalDialog } from "@/components/dashboard/PortalDialog";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { Icon } from "@/components/ui/Icon";
import {
  AUTH_ERROR,
  PORTAL_BTN_GHOST,
  PORTAL_BTN_PRIMARY,
  PORTAL_BTN_SECONDARY,
  PORTAL_INPUT,
  PORTAL_LABEL,
  PORTAL_TEXT_LINK,
} from "@/constants/classNames";
import { SUBMISSION_STATUS } from "@/constants/labels";
import { learningKeys, useHomeworkSubmissions } from "@/hooks/useLearningData";
import { useUserId } from "@/hooks/usePortalData";
import type { SubmissionListProps, SubmissionResponse } from "@/interfaces/learning";
import { gradeSubmission } from "@/services/learningService";
import { formatDateTime } from "@/utils/date";
import { portalErrorMessage } from "@/utils/errors";
import { studentLabel } from "@/utils/sessions";

/**
 * Bài đã nộp của một bài tập (GET /homeworks/{id}/submissions — không gồm bản nháp của học viên)
 * và hộp thoại chấm điểm (PATCH /submissions/{id}/grade). Bài đã chấm thì gia sư chỉ xem, không sửa điểm được.
 */
export function SubmissionList({ homework }: SubmissionListProps) {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const submissions = useHomeworkSubmissions(homework.id);
  const [grading, setGrading] = useState<SubmissionResponse | null>(null);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState<string | null>(null);

  const grade = useMutation({
    mutationFn: (submission: SubmissionResponse) =>
      gradeSubmission(submission.id as number, {
        score: Number(score),
        ...(feedback.trim() ? { feedback: feedback.trim() } : {}),
        version: submission.version as number,
      }),
    onSuccess: () => {
      setGrading(null);
      void queryClient.invalidateQueries({ queryKey: learningKeys.submissions(userId, homework.id) });
    },
    onError: (err) => setError(portalErrorMessage(err, "Chưa lưu được điểm. Vui lòng thử lại.")),
  });

  function openGrading(submission: SubmissionResponse) {
    setScore("");
    setFeedback("");
    setError(null);
    setGrading(submission);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!grading) return;
    const value = Number(score);
    if (score.trim() === "" || Number.isNaN(value) || value < 0 || value > homework.maxScore) {
      return setError(`Điểm phải từ 0 đến ${homework.maxScore}.`);
    }
    setError(null);
    grade.mutate(grading);
  }

  if (submissions.isPending) return <p className="text-[14px] text-brand-muted">Đang tải bài nộp…</p>;
  if (submissions.isError) {
    return <p className="text-[14px] text-brand-muted">{portalErrorMessage(submissions.error, "Không tải được bài nộp.")}</p>;
  }
  const items = submissions.data.content;
  if (items.length === 0) return <p className="text-[14px] text-brand-muted">Chưa có học viên nào nộp bài.</p>;

  return (
    <>
      <ul className="divide-y divide-brand-sandLine rounded-xl border border-brand-sandLine bg-white">
        {items.map((submission) => {
          const style = SUBMISSION_STATUS[submission.status];
          return (
            <li key={submission.id} className="space-y-1.5 px-3.5 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[14.5px] font-semibold text-brand-ink">{studentLabel(submission.studentId)}</span>
                <span className="flex flex-wrap items-center gap-2">
                  <StatusChip tone={style.tone} icon={style.icon}>
                    {submission.status === "GRADED" ? `${submission.score}/${homework.maxScore} điểm` : style.label}
                  </StatusChip>
                  {submission.status === "SUBMITTED" && (
                    <button type="button" onClick={() => openGrading(submission)} className={PORTAL_BTN_GHOST}>
                      <Icon name="grading" className="text-[18px]" />
                      Chấm điểm
                    </button>
                  )}
                </span>
              </div>
              {submission.submittedAt && (
                <p className="text-[13px] text-brand-muted">Nộp lúc {formatDateTime(new Date(submission.submittedAt))}</p>
              )}
              {submission.content && <p className="whitespace-pre-wrap text-[14px] text-brand-ink">{submission.content}</p>}
              {submission.resourceUrl && (
                <a href={submission.resourceUrl} target="_blank" rel="noreferrer noopener" className={`${PORTAL_TEXT_LINK} text-[14px]`}>
                  Mở link bài làm
                </a>
              )}
              {submission.feedback && <p className="text-[13.5px] text-brand-muted">Nhận xét: {submission.feedback}</p>}
            </li>
          );
        })}
      </ul>

      <PortalDialog
        open={grading !== null}
        onClose={() => setGrading(null)}
        title="Chấm điểm bài làm"
        description={grading ? `${studentLabel(grading.studentId)} · ${homework.title}. Điểm đã chấm không sửa lại được.` : undefined}
      >
        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="grade-score" className={PORTAL_LABEL}>
              Điểm (0 – {homework.maxScore})
            </label>
            <input
              id="grade-score"
              type="number"
              min={0}
              max={homework.maxScore}
              step={0.01}
              value={score}
              onChange={(event) => setScore(event.target.value)}
              className={PORTAL_INPUT}
            />
          </div>
          <div>
            <label htmlFor="grade-feedback" className={PORTAL_LABEL}>
              Nhận xét (không bắt buộc)
            </label>
            <textarea
              id="grade-feedback"
              rows={4}
              maxLength={5000}
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              className={`${PORTAL_INPUT} h-auto py-2`}
            />
          </div>
          {error && (
            <p role="alert" className={`${AUTH_ERROR} flex items-center gap-1.5`}>
              <Icon name="error" className="text-[17px]" />
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setGrading(null)} className={PORTAL_BTN_SECONDARY}>
              Hủy
            </button>
            <button type="submit" disabled={grade.isPending} className={PORTAL_BTN_PRIMARY}>
              {grade.isPending ? "Đang lưu…" : "Lưu điểm"}
            </button>
          </div>
        </form>
      </PortalDialog>
    </>
  );
}
