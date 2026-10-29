import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useMemo, useState } from "react";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { QuestionBuilder } from "@/components/homework/QuestionBuilder";
import { PORTAL_BTN_ACCENT, PORTAL_BTN_SECONDARY, PORTAL_CARD, PORTAL_INPUT, PORTAL_LABEL } from "@/constants/classNames";
import { useMySessions, useUserId } from "@/hooks/usePortalData";
import { createHomework, updateHomework } from "@/services/homeworkService";
import { portalErrorMessage } from "@/utils/errors";
import { fromLocalInput, questionDraftError, toLocalInput, toQuestionDrafts, toQuestionInputs, totalPoints } from "@/utils/homework";
import { sessionOptionLabel, teacherOf } from "@/utils/sessions";
import type { HomeworkEditorProps, HomeworkInput, QuestionDraft } from "@/interfaces/homework";

/**
 * Form tạo / sửa bài tập của gia sư: buổi học, đề bài, giờ mở + hạn nộp, mật khẩu vào làm,
 * cho phép nộp trễ và bộ câu hỏi trắc nghiệm / tự luận. Bài đã công bố chỉ sửa được phần thời gian,
 * mật khẩu và nộp trễ (backend giữ nguyên đề để không ảnh hưởng học viên đang làm).
 */
export function HomeworkEditor({ homework, initialSessionId, onSaved, onCancel }: HomeworkEditorProps) {
  const userId = useUserId();
  const sessions = useMySessions();
  const published = homework !== undefined && homework.status !== "DRAFT";

  const [sessionId, setSessionId] = useState(String(homework?.sessionId ?? initialSessionId ?? ""));
  const [title, setTitle] = useState(homework?.title ?? "");
  const [instructions, setInstructions] = useState(homework?.instructions ?? "");
  const [resourceUrl, setResourceUrl] = useState(homework?.resourceUrl ?? "");
  const [openAt, setOpenAt] = useState(toLocalInput(homework?.openAt));
  const [dueAt, setDueAt] = useState(toLocalInput(homework?.dueAt));
  const [password, setPassword] = useState("");
  const [removePassword, setRemovePassword] = useState(false);
  const [allowLate, setAllowLate] = useState(homework?.allowLateSubmission ?? true);
  const [questions, setQuestions] = useState<QuestionDraft[]>(() => toQuestionDrafts(homework?.questions));
  const [maxScore, setMaxScore] = useState(String(homework?.maxScore ?? 10));
  const [formError, setFormError] = useState<string | null>(null);

  // Buổi tôi đang dạy, chưa hủy — gắn bài tập mới vào một buổi
  const teachingSessions = useMemo(
    () => (sessions.data ?? []).filter((session) => teacherOf(session) === userId && session.status !== "CANCELLED"),
    [sessions.data, userId],
  );

  const save = useMutation({
    mutationFn: (input: HomeworkInput) =>
      homework ? updateHomework(homework.id, { ...input, version: homework.version }) : createHomework(Number(sessionId), input),
    onSuccess: onSaved,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    if (!homework && !sessionId) return setFormError("Hãy chọn buổi học cho bài tập.");
    if (!dueAt) return setFormError("Hãy nhập hạn nộp.");
    if (openAt && new Date(openAt) >= new Date(dueAt)) return setFormError("Giờ mở bài phải trước hạn nộp.");
    if (password && password.trim().length < 4) return setFormError("Mật khẩu cần từ 4 ký tự trở lên.");
    const questionError = questionDraftError(questions);
    if (questionError) return setFormError(questionError);
    save.mutate({
      title: title.trim(),
      instructions: instructions.trim(),
      resourceUrl: resourceUrl.trim() || undefined,
      openAt: fromLocalInput(openAt),
      dueAt: fromLocalInput(dueAt) as string,
      maxScore: questions.length ? totalPoints(questions) : Number(maxScore),
      // Không gửi = giữ mật khẩu cũ; chuỗi rỗng = bỏ mật khẩu
      accessPassword: removePassword ? "" : password.trim() || undefined,
      allowLateSubmission: allowLate,
      // Bài đã công bố: không gửi câu hỏi để backend giữ nguyên
      questions: published ? undefined : toQuestionInputs(questions),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <section className={`space-y-4 p-5 sm:p-6 ${PORTAL_CARD}`} aria-label="Đề bài">
        {published && (
          <AuthNotice tone="info">
            Bài đã công bố: chỉ gia hạn nộp, mở sớm hơn, đổi mật khẩu hoặc chế độ nộp trễ được. Đề bài và câu hỏi giữ nguyên.
          </AuthNotice>
        )}
        <div>
          <label htmlFor="hw-session" className={PORTAL_LABEL}>
            Buổi học
          </label>
          <select
            id="hw-session"
            required
            disabled={Boolean(homework)}
            value={sessionId}
            onChange={(event) => setSessionId(event.target.value)}
            className={PORTAL_INPUT}
          >
            <option value="">{sessions.isPending ? "Đang tải lịch dạy…" : "Chọn buổi học"}</option>
            {homework && !teachingSessions.some((session) => session.sessionId === homework.sessionId) && (
              <option value={homework.sessionId}>Buổi #{homework.sessionId}</option>
            )}
            {teachingSessions.map((session) => (
              <option key={session.sessionId} value={session.sessionId}>
                {sessionOptionLabel(session)}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[13px] text-brand-muted">
            Học viên đang học lớp của buổi này sẽ thấy bài và nhận thông báo khi bạn công bố.
          </p>
        </div>
        <div>
          <label htmlFor="hw-title" className={PORTAL_LABEL}>
            Tên bài
          </label>
          <input
            id="hw-title"
            required
            maxLength={200}
            readOnly={published}
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Ví dụ: Kiểm tra 15 phút - Hàm số bậc hai"
            className={PORTAL_INPUT}
          />
        </div>
        <div>
          <label htmlFor="hw-instructions" className={PORTAL_LABEL}>
            Hướng dẫn / đề bài
          </label>
          <textarea
            id="hw-instructions"
            required
            rows={4}
            maxLength={20000}
            readOnly={published}
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder="Làm trong 15 phút. Phần tự luận trình bày ra giấy rồi chụp ảnh gửi kèm."
            className={`${PORTAL_INPUT} h-auto resize-y py-2.5 leading-relaxed`}
          />
        </div>
        <div>
          <label htmlFor="hw-resource" className={PORTAL_LABEL}>
            Link tài liệu (không bắt buộc, https)
          </label>
          <input
            id="hw-resource"
            type="url"
            maxLength={2048}
            readOnly={published}
            value={resourceUrl}
            onChange={(event) => setResourceUrl(event.target.value)}
            placeholder="https://"
            className={PORTAL_INPUT}
          />
        </div>
      </section>

      <section className={`grid gap-4 p-5 sm:grid-cols-2 sm:p-6 ${PORTAL_CARD}`} aria-label="Thời gian và quyền vào làm">
        <div>
          <label htmlFor="hw-open" className={PORTAL_LABEL}>
            Mở bài lúc (để trống = mở ngay khi công bố)
          </label>
          <input
            id="hw-open"
            type="datetime-local"
            value={openAt}
            onChange={(event) => setOpenAt(event.target.value)}
            className={PORTAL_INPUT}
          />
        </div>
        <div>
          <label htmlFor="hw-due" className={PORTAL_LABEL}>
            Hạn nộp
          </label>
          <input
            id="hw-due"
            type="datetime-local"
            required
            value={dueAt}
            onChange={(event) => setDueAt(event.target.value)}
            className={PORTAL_INPUT}
          />
        </div>
        <div>
          <label htmlFor="hw-password" className={PORTAL_LABEL}>
            {homework?.passwordProtected ? "Mật khẩu mới (để trống = giữ mật khẩu cũ)" : "Mật khẩu vào làm (để trống = không cần)"}
          </label>
          <input
            id="hw-password"
            type="text"
            autoComplete="off"
            maxLength={100}
            disabled={removePassword}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Ví dụ: AiTA"
            className={PORTAL_INPUT}
          />
          {homework?.passwordProtected && (
            <label className="mt-2 flex items-center gap-2 text-[14px] text-brand-ink">
              <input
                type="checkbox"
                checked={removePassword}
                onChange={(event) => setRemovePassword(event.target.checked)}
                className="h-4 w-4 accent-brand-navy"
              />
              Bỏ mật khẩu
            </label>
          )}
          <p className="mt-1 text-[13px] text-brand-muted">Mật khẩu được mã hóa khi lưu, hãy tự ghi nhớ để đọc cho học viên.</p>
        </div>
        <div className="flex flex-col justify-center gap-3">
          <label className="flex items-start gap-2 text-[14.5px] text-brand-ink">
            <input
              type="checkbox"
              checked={allowLate}
              onChange={(event) => setAllowLate(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-brand-navy"
            />
            <span>
              Cho phép nộp trễ
              <span className="block text-[13px] text-brand-muted">
                Học viên vẫn làm và nộp sau hạn; bạn nhận thông báo kèm thời gian trễ.
              </span>
            </span>
          </label>
          {questions.length === 0 && (
            <div>
              <label htmlFor="hw-max" className={PORTAL_LABEL}>
                Điểm tối đa
              </label>
              <input
                id="hw-max"
                type="number"
                min="0.01"
                step="0.25"
                required
                value={maxScore}
                onChange={(event) => setMaxScore(event.target.value)}
                className={`${PORTAL_INPUT} max-w-[140px]`}
              />
            </div>
          )}
        </div>
      </section>

      <section className={`p-5 sm:p-6 ${PORTAL_CARD}`} aria-labelledby="hw-questions-title">
        <h2 id="hw-questions-title" className="text-[17px] font-bold text-brand-navy">
          Câu hỏi
        </h2>
        <p className="mb-4 mt-1 text-[14px] text-brand-muted">
          Không thêm câu hỏi thì đây là bài tự do: học viên viết bài, dán link hoặc chụp ảnh nộp. Bài chỉ có trắc nghiệm được chấm điểm ngay
          khi nộp; có câu tự luận thì phần trắc nghiệm tự chấm, phần tự luận chờ bạn chấm.
        </p>
        <QuestionBuilder questions={questions} onChange={setQuestions} readOnly={published} />
      </section>

      {formError && <AuthNotice tone="error">{formError}</AuthNotice>}
      {save.error && <AuthNotice tone="error">{portalErrorMessage(save.error, "Chưa lưu được bài tập. Vui lòng thử lại.")}</AuthNotice>}

      <div className="flex flex-wrap justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className={PORTAL_BTN_SECONDARY}>
            Hủy
          </button>
        )}
        <button type="submit" disabled={save.isPending} className={PORTAL_BTN_ACCENT}>
          {save.isPending ? "Đang lưu…" : homework ? "Lưu thay đổi" : "Lưu bản nháp"}
        </button>
      </div>
    </form>
  );
}
