import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { AttachmentList } from "@/components/homework/AttachmentList";
import { QuestionMedia } from "@/components/homework/QuestionMedia";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_BTN_PRIMARY, PORTAL_CARD, PORTAL_INPUT, PORTAL_LABEL, PORTAL_TEXT_LINK } from "@/constants/classNames";
import { SUBMISSION_STATUS } from "@/constants/labels";
import { homeworkKeys } from "@/hooks/useHomeworkData";
import { useUserId } from "@/hooks/usePortalData";
import { gradeSubmission } from "@/services/homeworkService";
import { portalErrorMessage } from "@/utils/errors";
import { attachmentName } from "@/services/fileService";
import { correctOptionsOf, formatDateTime, formatDuration, formatScore, optionLetters, pickedOptions, sameOptions } from "@/utils/homework";
import type { SubmissionGraderProps } from "@/interfaces/homework";

const OPTION_LETTERS = "ABCDEFGHIJ";

/**
 * Một bài nộp trong trang chấm của gia sư: thời điểm nộp (kèm thời gian trễ), từng câu trả lời,
 * ảnh chụp / PDF, rồi ô chấm điểm tự luận + nhận xét. Bấm chấm là học viên thấy điểm và nhận thông báo.
 */
export function SubmissionGrader({ homework, submission }: SubmissionGraderProps) {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const questions = homework.questions ?? [];
  const essays = questions.filter((question) => question.type === "ESSAY");
  const answerOf = (questionId: number) => submission.answers?.find((answer) => answer.questionId === questionId);

  // Bài trắc nghiệm hệ thống đã chấm nhưng gia sư chưa xem: vẫn được gửi nhận xét một lần
  const awaitingReview = submission.status === "SUBMITTED" || (submission.autoGraded === true && submission.gradedBy === undefined);
  const [essayScores, setEssayScores] = useState<Record<number, string>>(() =>
    Object.fromEntries(essays.map((question) => [question.id, answerOf(question.id)?.score?.toString() ?? ""])),
  );
  const [score, setScore] = useState(submission.score?.toString() ?? "");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [formError, setFormError] = useState<string | null>(null);

  const total = questions.length
    ? (submission.autoScore ?? 0) + essays.reduce((sum, question) => sum + (Number(essayScores[question.id]) || 0), 0)
    : Number(score);

  const grade = useMutation({
    mutationFn: () =>
      gradeSubmission(submission.id as number, {
        version: submission.version as number,
        feedback: feedback.trim() || undefined,
        ...(questions.length
          ? { answerScores: Object.fromEntries(essays.map((question) => [question.id, Number(essayScores[question.id])])) }
          : { score: Number(score) }),
      }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: homeworkKeys.all(userId) }),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    for (const [index, question] of essays.entries()) {
      const value = essayScores[question.id];
      if (value === "" || Number(value) < 0 || Number(value) > question.points)
        return setFormError(`Câu tự luận ${index + 1}: nhập điểm từ 0 đến ${formatScore(question.points)}.`);
    }
    if (!questions.length && (score === "" || Number(score) < 0 || Number(score) > homework.maxScore))
      return setFormError(`Nhập điểm từ 0 đến ${formatScore(homework.maxScore)}.`);
    grade.mutate();
  }

  const status = SUBMISSION_STATUS[submission.status];

  return (
    <article className={`p-5 sm:p-6 ${PORTAL_CARD}`} aria-label={`Bài làm của ${submission.studentName ?? "học viên"}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-[17px] font-bold text-brand-navy">{submission.studentName ?? `Học viên #${submission.studentId}`}</h3>
          {submission.submittedAt && (
            <p className="mt-0.5 text-[14px] text-brand-muted">Nộp lúc {formatDateTime(submission.submittedAt)}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {submission.lateSeconds !== undefined && (
            <StatusChip tone="red" icon="alarm">
              Nộp trễ {formatDuration(submission.lateSeconds)}
            </StatusChip>
          )}
          <StatusChip tone={status.tone} icon={status.icon}>
            {status.label}
          </StatusChip>
        </div>
      </header>

      {questions.length > 0 && (
        <ol className="mt-4 space-y-3">
          {questions.map((question, index) => {
            const answer = answerOf(question.id);
            const picks = pickedOptions(answer);
            const key = correctOptionsOf(question);
            const correct = question.type === "MULTIPLE_CHOICE" && sameOptions(picks, key);
            return (
              <li key={question.id} className="rounded-xl border border-brand-sandLine bg-brand-sand/40 p-3.5">
                <p className="text-[14.5px] font-semibold text-brand-ink">
                  Câu {index + 1}. <span className="whitespace-pre-line font-normal">{question.prompt}</span>{" "}
                  <span className="text-brand-muted">({formatScore(question.points)} điểm)</span>
                </p>
                <QuestionMedia question={question} index={index} />
                {question.type === "MULTIPLE_CHOICE" ? (
                  <p className={`mt-1.5 flex items-center gap-1.5 text-[14px] ${correct ? "text-emerald-700" : "text-red-700"}`}>
                    <Icon name={correct ? "check_circle" : "cancel"} className="text-[18px]" />
                    {picks.length === 1
                      ? `Chọn ${OPTION_LETTERS[picks[0]]}. ${question.options?.[picks[0]] ?? ""}`
                      : picks.length > 1
                        ? `Chọn ${optionLetters(picks)}`
                        : "Bỏ trống"}
                    {!correct && key.length > 0 && <span className="text-brand-muted"> · đáp án {optionLetters(key)}</span>}
                  </p>
                ) : (
                  <>
                    <p className="mt-1.5 whitespace-pre-line text-[14px] text-brand-ink">
                      {answer?.textAnswer ?? <span className="text-brand-muted">Không viết (xem ảnh chụp bên dưới nếu có)</span>}
                    </p>
                    {awaitingReview ? (
                      <label className="mt-2 flex items-center gap-2 text-[14px] text-brand-ink">
                        Điểm câu này
                        <input
                          type="number"
                          min="0"
                          max={question.points}
                          step="0.01"
                          inputMode="decimal"
                          value={essayScores[question.id] ?? ""}
                          onChange={(event) => setEssayScores({ ...essayScores, [question.id]: event.target.value })}
                          className={`${PORTAL_INPUT} w-[100px]`}
                        />
                        / {formatScore(question.points)}
                      </label>
                    ) : (
                      answer?.score !== undefined && (
                        <p className="mt-1.5 text-[14px] font-semibold text-brand-navy">
                          {formatScore(answer.score)} / {formatScore(question.points)} điểm
                        </p>
                      )
                    )}
                  </>
                )}
              </li>
            );
          })}
        </ol>
      )}

      {submission.content && <p className="mt-4 whitespace-pre-line text-[14.5px] leading-relaxed text-brand-ink">{submission.content}</p>}
      {submission.resourceUrl && (
        <a
          href={submission.resourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className={`mt-2 inline-block text-[14.5px] ${PORTAL_TEXT_LINK}`}
        >
          {attachmentName(submission.resourceUrl)}
        </a>
      )}
      {submission.attachments && submission.attachments.length > 0 && (
        <div className="mt-4">
          <p className={PORTAL_LABEL}>Ảnh chụp / tệp bài làm</p>
          <AttachmentList attachments={submission.attachments} />
        </div>
      )}

      {awaitingReview ? (
        <form onSubmit={handleSubmit} className="mt-5 space-y-3 border-t border-brand-sandLine pt-4">
          {questions.length > 0 ? (
            <p className="text-[14.5px] text-brand-ink">
              Trắc nghiệm (tự chấm): <b>{formatScore(submission.autoScore ?? 0)}</b> · Tổng điểm:{" "}
              <b className="text-brand-navy">
                {formatScore(total)} / {formatScore(homework.maxScore)}
              </b>
            </p>
          ) : (
            <label className="flex items-center gap-2 text-[14.5px] text-brand-ink">
              Điểm
              <input
                type="number"
                min="0"
                max={homework.maxScore}
                step="0.01"
                inputMode="decimal"
                value={score}
                onChange={(event) => setScore(event.target.value)}
                className={`${PORTAL_INPUT} w-[110px]`}
              />
              / {formatScore(homework.maxScore)}
            </label>
          )}
          <div>
            <label htmlFor={`feedback-${submission.id}`} className={PORTAL_LABEL}>
              Nhận xét cho học viên
            </label>
            <textarea
              id={`feedback-${submission.id}`}
              rows={3}
              maxLength={5000}
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              className={`${PORTAL_INPUT} h-auto resize-y py-2 leading-relaxed`}
            />
          </div>
          {formError && <AuthNotice tone="error">{formError}</AuthNotice>}
          {grade.error && <AuthNotice tone="error">{portalErrorMessage(grade.error, "Chưa lưu được điểm. Vui lòng thử lại.")}</AuthNotice>}
          <button type="submit" disabled={grade.isPending} className={PORTAL_BTN_PRIMARY}>
            <Icon name="send" className="text-[18px]" />
            {grade.isPending ? "Đang gửi…" : submission.status === "GRADED" ? "Gửi nhận xét" : "Chấm điểm và gửi cho học viên"}
          </button>
        </form>
      ) : (
        <div className="mt-5 border-t border-brand-sandLine pt-4 text-[14.5px] text-brand-ink">
          <p>
            Điểm:{" "}
            <b className="text-brand-navy">
              {formatScore(submission.score ?? 0)} / {formatScore(homework.maxScore)}
            </b>
            {submission.gradedAt && <span className="text-brand-muted"> · chấm lúc {formatDateTime(submission.gradedAt)}</span>}
          </p>
          {submission.feedback && <p className="mt-1.5 whitespace-pre-line">Nhận xét: {submission.feedback}</p>}
        </div>
      )}
    </article>
  );
}
