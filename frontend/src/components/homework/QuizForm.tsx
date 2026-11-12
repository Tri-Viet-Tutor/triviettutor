import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type ChangeEvent, useRef, useState } from "react";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { PortalDialog } from "@/components/dashboard/PortalDialog";
import { AttachmentList } from "@/components/homework/AttachmentList";
import { AttachmentField } from "@/components/ui/AttachmentField";
import { QuestionMedia } from "@/components/homework/QuestionMedia";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_BTN_ACCENT, PORTAL_BTN_SECONDARY, PORTAL_CARD, PORTAL_INPUT, PORTAL_LABEL } from "@/constants/classNames";
import { homeworkKeys } from "@/hooks/useHomeworkData";
import { useNow } from "@/hooks/useNow";
import { useUserId } from "@/hooks/usePortalData";
import { removeAttachment, saveDraft, submitHomework, uploadAttachment } from "@/services/homeworkService";
import { portalErrorMessage } from "@/utils/errors";
import { formatDuration, formatScore, pickedOptions, prepareUpload } from "@/utils/homework";
import type { AnswerInput, AttachmentResponse, QuizFormProps, SubmissionInput, SubmissionResponse } from "@/interfaces/homework";

const OPTION_LETTERS = "ABCDEFGHIJ";
const MAX_ATTACHMENTS = 10;

/**
 * Bài làm đang làm dở của học viên: chọn đáp án trắc nghiệm, viết tự luận, chụp ảnh bài làm trên giấy
 * (mở thẳng camera trên điện thoại) hoặc chọn ảnh / PDF, lưu tạm và nộp bài.
 */
export function QuizForm({ homework, submission, onDone }: QuizFormProps) {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const now = useNow();
  const questions = homework.questions ?? [];
  const acceptsFiles = questions.length === 0 || questions.some((question) => question.type === "ESSAY");
  // Đã nộp, chưa chấm: đang sửa để nộp lại trước hạn; ảnh đã gửi giữ nguyên
  const resubmitting = submission.status === "SUBMITTED";

  const [answers, setAnswers] = useState<Record<number, AnswerInput>>(() =>
    Object.fromEntries(
      (submission.answers ?? []).map((answer) => [answer.questionId, { ...answer, selectedOptions: pickedOptions(answer) }]),
    ),
  );
  const [content, setContent] = useState(submission.content ?? "");
  const [resourceUrl, setResourceUrl] = useState(submission.resourceUrl ?? "");
  const [version, setVersion] = useState(submission.version as number);
  const [attachments, setAttachments] = useState<AttachmentResponse[]>(submission.attachments ?? []);
  const [confirming, setConfirming] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const overdueSeconds = Math.floor((now.getTime() - new Date(homework.dueAt).getTime()) / 1000);
  const unanswered = questions.filter((question) => {
    const answer = answers[question.id];
    return question.type === "MULTIPLE_CHOICE" ? pickedOptions(answer).length === 0 : !answer?.textAnswer?.trim();
  }).length;

  /** Dữ liệu gửi backend cho cả lưu tạm lẫn nộp */
  function payload(): SubmissionInput {
    return {
      version,
      content: content.trim() || undefined,
      resourceUrl: resourceUrl.trim() || undefined,
      answers: questions.length
        ? questions.map((question) => {
            const picks = pickedOptions(answers[question.id]);
            return {
              questionId: question.id,
              selectedOption: picks[0],
              selectedOptions: picks.length ? picks : undefined,
              textAnswer: answers[question.id]?.textAnswer?.trim() || undefined,
            };
          })
        : undefined,
    };
  }

  function refresh(next: SubmissionResponse) {
    queryClient.setQueryData(homeworkKeys.mine(userId, homework.id), next);
    void queryClient.invalidateQueries({ queryKey: homeworkKeys.all(userId) });
  }

  const draft = useMutation({
    mutationFn: () => saveDraft(homework.id, payload()),
    onSuccess: (next) => {
      setVersion(next.version as number);
      setSavedAt(new Date());
    },
  });
  const submit = useMutation({
    mutationFn: () => submitHomework(homework.id, payload()),
    onSuccess: (next) => {
      refresh(next);
      onDone?.();
    },
  });
  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      // Gửi lần lượt để thứ tự ảnh giữ đúng thứ tự trang bài làm
      for (const file of files) {
        const { blob, name } = await prepareUpload(file);
        const saved = await uploadAttachment(homework.id, blob, name);
        setAttachments((current) => [...current, saved]);
      }
    },
  });
  const remove = useMutation({
    mutationFn: (attachment: AttachmentResponse) => removeAttachment(homework.id, attachment.id),
    onSuccess: (_, attachment) => setAttachments((current) => current.filter((item) => item.id !== attachment.id)),
  });

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, MAX_ATTACHMENTS - attachments.length);
    event.target.value = "";
    if (files.length) upload.mutate(files);
  }

  function setAnswer(questionId: number, change: Partial<AnswerInput>) {
    setAnswers((current) => ({ ...current, [questionId]: { ...current[questionId], questionId, ...change } }));
  }

  const busy = draft.isPending || submit.isPending || upload.isPending;
  const error = draft.error ?? submit.error ?? upload.error ?? remove.error;

  return (
    <div className="space-y-5">
      {questions.length > 0 && (
        <ol className="space-y-4">
          {questions.map((question, index) => (
            <li key={question.id} className={`p-5 ${PORTAL_CARD}`}>
              <p className="text-[15px] font-semibold text-brand-ink">
                Câu {index + 1}. <span className="whitespace-pre-line font-normal">{question.prompt}</span>{" "}
                <span className="text-[13.5px] text-brand-muted">({formatScore(question.points)} điểm)</span>
              </p>
              <QuestionMedia question={question} index={index} />
              {question.type === "MULTIPLE_CHOICE" ? (
                <fieldset className="mt-3 space-y-2">
                  {(() => {
                    const selectCount = question.selectCount ?? 1;
                    const picks = pickedOptions(answers[question.id]);
                    return (
                      <>
                        <legend className={selectCount > 1 ? "mb-1" : "sr-only"}>
                          {selectCount > 1 ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-[13px] font-semibold text-amber-800 ring-1 ring-amber-200">
                              <Icon name="checklist" className="text-[16px]" />
                              Chọn {selectCount} đáp án · đã chọn {picks.length}/{selectCount}
                            </span>
                          ) : (
                            `Chọn một đáp án cho câu ${index + 1}`
                          )}
                        </legend>
                        {question.options?.map((option, optionIndex) => {
                          const checked = picks.includes(optionIndex);
                          // Câu nhiều đáp án: chọn đủ số rồi thì khóa các phương án còn lại (bỏ chọn bớt để đổi)
                          const full = selectCount > 1 && !checked && picks.length >= selectCount;
                          return (
                            <label
                              key={optionIndex}
                              className={`flex items-start gap-3 rounded-xl border px-3.5 py-2.5 text-[14.5px] transition-colors ${
                                checked ? "border-brand-navy bg-brand-tint" : "border-brand-sandLine bg-white hover:border-brand-navy/40"
                              } ${full ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}
                            >
                              <input
                                type={selectCount > 1 ? "checkbox" : "radio"}
                                name={`q-${question.id}`}
                                checked={checked}
                                disabled={full}
                                onChange={() =>
                                  setAnswer(question.id, {
                                    selectedOptions:
                                      selectCount > 1
                                        ? checked
                                          ? picks.filter((i) => i !== optionIndex)
                                          : [...picks, optionIndex].sort((a, b) => a - b)
                                        : [optionIndex],
                                    selectedOption: undefined,
                                  })
                                }
                                className="mt-1 h-4 w-4 shrink-0 accent-brand-navy"
                              />
                              <span>
                                <b className="mr-1">{OPTION_LETTERS[optionIndex]}.</b>
                                {option}
                              </span>
                            </label>
                          );
                        })}
                      </>
                    );
                  })()}
                </fieldset>
              ) : (
                <textarea
                  aria-label={`Trả lời câu ${index + 1}`}
                  rows={4}
                  maxLength={20000}
                  value={answers[question.id]?.textAnswer ?? ""}
                  onChange={(event) => setAnswer(question.id, { textAnswer: event.target.value })}
                  placeholder="Viết câu trả lời, hoặc làm ra giấy rồi chụp ảnh gửi ở phần bên dưới."
                  className={`${PORTAL_INPUT} mt-3 h-auto resize-y py-2.5 leading-relaxed`}
                />
              )}
            </li>
          ))}
        </ol>
      )}

      {questions.length === 0 && (
        <section className={`space-y-4 p-5 ${PORTAL_CARD}`} aria-label="Bài làm">
          <div>
            <label htmlFor="work-content" className={PORTAL_LABEL}>
              Bài làm
            </label>
            <textarea
              id="work-content"
              rows={6}
              maxLength={20000}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              className={`${PORTAL_INPUT} h-auto resize-y py-2.5 leading-relaxed`}
            />
          </div>
          <AttachmentField
            id="work-link"
            label="File / link bài làm (PDF, Word, ảnh… hoặc link https)"
            value={resourceUrl}
            onChange={setResourceUrl}
          />
        </section>
      )}

      {resubmitting && attachments.length > 0 && (
        <AuthNotice tone="info">Ảnh đã gửi được giữ nguyên, bạn chỉ sửa được phần viết.</AuthNotice>
      )}

      {acceptsFiles && !resubmitting && (
        <section className={`p-5 ${PORTAL_CARD}`} aria-labelledby="photos-title">
          <h2 id="photos-title" className="text-[16px] font-bold text-brand-navy">
            Ảnh chụp bài làm
          </h2>
          <p className="mb-3 mt-1 text-[14px] text-brand-muted">
            Làm phần tự luận ra giấy rồi chụp từng trang. Nhận ảnh JPG, PNG, WEBP hoặc PDF, tối đa {MAX_ATTACHMENTS} tệp.
          </p>
          <AttachmentList
            attachments={attachments}
            onRemove={(attachment) => remove.mutate(attachment)}
            removingId={remove.variables?.id}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFiles} />
            <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={handleFiles} />
            <button
              type="button"
              disabled={busy || attachments.length >= MAX_ATTACHMENTS}
              onClick={() => cameraRef.current?.click()}
              className={PORTAL_BTN_ACCENT}
            >
              <Icon name="photo_camera" className="text-[19px]" />
              Chụp ảnh bài làm
            </button>
            <button
              type="button"
              disabled={busy || attachments.length >= MAX_ATTACHMENTS}
              onClick={() => fileRef.current?.click()}
              className={PORTAL_BTN_SECONDARY}
            >
              <Icon name="upload_file" className="text-[19px]" />
              Chọn ảnh / PDF
            </button>
            {upload.isPending && <span className="self-center text-[14px] text-brand-muted">Đang gửi ảnh…</span>}
          </div>
        </section>
      )}

      {error && <AuthNotice tone="error">{portalErrorMessage(error, "Có lỗi xảy ra. Vui lòng thử lại.")}</AuthNotice>}
      {savedAt && !draft.isPending && <AuthNotice tone="success">Đã lưu tạm lúc {savedAt.toLocaleTimeString("vi-VN")}.</AuthNotice>}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {resubmitting ? (
          <button type="button" disabled={busy} onClick={() => onDone?.()} className={PORTAL_BTN_SECONDARY}>
            Hủy
          </button>
        ) : (
          <button type="button" disabled={busy} onClick={() => draft.mutate()} className={PORTAL_BTN_SECONDARY}>
            {draft.isPending ? "Đang lưu…" : "Lưu tạm"}
          </button>
        )}
        <button type="button" disabled={busy} onClick={() => setConfirming(true)} className={PORTAL_BTN_ACCENT}>
          <Icon name="send" className="text-[18px]" />
          {resubmitting ? "Nộp lại" : "Nộp bài"}
        </button>
      </div>

      <PortalDialog open={confirming} title="Nộp bài" onClose={() => setConfirming(false)} widthClassName="max-w-[460px]">
        <div className="space-y-3 text-[14.5px] leading-relaxed text-brand-ink">
          <p>
            {questions.length > 0 && !acceptsFiles
              ? "Bài được chấm ngay khi nộp và không sửa được nữa."
              : "Sau khi nộp, bạn vẫn sửa và nộp lại được trước hạn nếu gia sư chưa chấm."}
          </p>
          {unanswered > 0 && <p className="font-semibold text-amber-800">Còn {unanswered} câu chưa trả lời.</p>}
          {overdueSeconds > 0 && (
            <p className="font-semibold text-red-700">
              Đã quá hạn {formatDuration(overdueSeconds)}. Bài sẽ được ghi là nộp trễ và gia sư sẽ được báo.
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setConfirming(false)} className={PORTAL_BTN_SECONDARY}>
              Làm tiếp
            </button>
            <button
              type="button"
              disabled={submit.isPending}
              onClick={() => {
                setConfirming(false);
                submit.mutate();
              }}
              className={PORTAL_BTN_ACCENT}
            >
              Nộp bài
            </button>
          </div>
        </div>
      </PortalDialog>
    </div>
  );
}
