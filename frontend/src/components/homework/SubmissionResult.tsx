import { StatusChip } from "@/components/dashboard/StatusChip";
import { AttachmentList } from "@/components/homework/AttachmentList";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_CARD, PORTAL_LABEL, PORTAL_TEXT_LINK } from "@/constants/classNames";
import { SUBMISSION_STATUS } from "@/constants/labels";
import { formatDateTime, formatDuration, formatScore } from "@/utils/homework";
import type { SubmissionResultProps } from "@/interfaces/homework";

const OPTION_LETTERS = "ABCDEFGHIJ";

/** Bài đã nộp của học viên: điểm và nhận xét (khi đã chấm), thời điểm nộp, câu trả lời và ảnh đã gửi. */
export function SubmissionResult({ homework, submission }: SubmissionResultProps) {
  const graded = submission.status === "GRADED";
  const status = SUBMISSION_STATUS[submission.status];
  const questions = homework.questions ?? [];

  return (
    <div className="space-y-5">
      <section className={`p-5 sm:p-6 ${PORTAL_CARD}`} aria-label="Kết quả">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip tone={status.tone} icon={status.icon}>
            {status.label}
          </StatusChip>
          {submission.lateSeconds !== undefined && (
            <StatusChip tone="red" icon="alarm">
              Nộp trễ {formatDuration(submission.lateSeconds)}
            </StatusChip>
          )}
        </div>
        {submission.submittedAt && (
          <p className="mt-2 text-[14.5px] text-brand-muted">Đã nộp lúc {formatDateTime(submission.submittedAt)}</p>
        )}
        {graded ? (
          <>
            <p className="mt-4 text-[15px] text-brand-ink">Điểm của bạn</p>
            <p className="text-[40px] font-extrabold leading-tight text-brand-navy">
              {formatScore(submission.score ?? 0)}
              <span className="text-[22px] font-bold text-brand-muted"> / {formatScore(homework.maxScore)}</span>
            </p>
            {submission.feedback && (
              <div className="mt-3 rounded-xl border border-brand-sandLine bg-brand-sand/60 p-3.5">
                <p className="flex items-center gap-1.5 text-[14px] font-bold text-brand-navy">
                  <Icon name="rate_review" className="text-[18px]" />
                  Nhận xét của gia sư
                </p>
                <p className="mt-1 whitespace-pre-line text-[14.5px] leading-relaxed text-brand-ink">{submission.feedback}</p>
              </div>
            )}
          </>
        ) : (
          <p className="mt-3 text-[14.5px] text-brand-ink">
            {submission.autoScore !== undefined
              ? "Phần trắc nghiệm đã được chấm tự động; gia sư đang chấm phần tự luận. Bạn sẽ nhận thông báo khi có điểm."
              : "Gia sư đang chấm bài. Bạn sẽ nhận thông báo khi có điểm."}
          </p>
        )}
      </section>

      {questions.length > 0 && (
        <section className={`p-5 sm:p-6 ${PORTAL_CARD}`} aria-label="Bài làm của bạn">
          <ol className="space-y-3">
            {questions.map((question, index) => {
              const answer = submission.answers?.find((item) => item.questionId === question.id);
              return (
                <li key={question.id} className="rounded-xl border border-brand-sandLine bg-brand-sand/40 p-3.5 text-[14.5px]">
                  <p className="font-semibold text-brand-ink">
                    Câu {index + 1}. <span className="whitespace-pre-line font-normal">{question.prompt}</span>
                  </p>
                  <p className="mt-1.5 whitespace-pre-line text-brand-ink">
                    {question.type === "MULTIPLE_CHOICE"
                      ? answer?.selectedOption !== undefined
                        ? `Bạn chọn ${OPTION_LETTERS[answer.selectedOption]}. ${question.options?.[answer.selectedOption] ?? ""}`
                        : "Bỏ trống"
                      : (answer?.textAnswer ?? "Không viết (xem ảnh đã gửi)")}
                  </p>
                  {graded && (
                    <p className="mt-1 font-semibold text-brand-navy">
                      {formatScore(answer?.score ?? 0)} / {formatScore(question.points)} điểm
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      )}

      {(submission.content || submission.resourceUrl || (submission.attachments?.length ?? 0) > 0) && (
        <section className={`space-y-3 p-5 sm:p-6 ${PORTAL_CARD}`} aria-label="Bài đã gửi">
          {submission.content && <p className="whitespace-pre-line text-[14.5px] leading-relaxed text-brand-ink">{submission.content}</p>}
          {submission.resourceUrl && (
            <a href={submission.resourceUrl} target="_blank" rel="noreferrer noopener" className={`text-[14.5px] ${PORTAL_TEXT_LINK}`}>
              Link bài làm
            </a>
          )}
          {submission.attachments && submission.attachments.length > 0 && (
            <div>
              <p className={PORTAL_LABEL}>Ảnh / tệp đã gửi</p>
              <AttachmentList attachments={submission.attachments} />
            </div>
          )}
        </section>
      )}
    </div>
  );
}
