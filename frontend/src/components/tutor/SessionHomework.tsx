import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { AttachmentField } from "@/components/ui/AttachmentField";
import { AttachmentLink } from "@/components/ui/AttachmentLink";
import { FilterTabs } from "@/components/dashboard/FilterTabs";
import { draftQuestionsToRequest, HomeworkQuestionEditor, HomeworkQuestionList, type DraftQuestion } from "@/components/tutor/HomeworkQuestions";
import { Icon } from "@/components/ui/Icon";
import { AUTH_ERROR, FOCUS_RING, PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY, PORTAL_INPUT, PORTAL_LABEL } from "@/constants/classNames";
import type { HomeworkResponse, SubmissionResponse } from "@/interfaces/api";
import {
  changeHomeworkStatus,
  createHomework,
  gradeSubmission,
  listSessionHomeworks,
  listSubmissions,
} from "@/services/homeworkService";
import { portalErrorMessage } from "@/utils/errors";
import { studentLabel } from "@/utils/sessions";
import { DateField } from "@/components/ui/DateField";
import { TimeField } from "@/components/ui/TimeField";
import { toIsoDate } from "@/utils/date";

type GradingFilter = "all" | "pending" | "done";
type DueFilter = "all" | "overdue" | "open";

const STATUS_STYLE: Record<HomeworkResponse["status"], { label: string; className: string }> = {
  DRAFT: { label: "Nháp", className: "bg-slate-100 text-slate-700" },
  PUBLISHED: { label: "Đã giao", className: "bg-emerald-50 text-emerald-800" },
  CLOSED: { label: "Đã đóng", className: "bg-slate-200 text-slate-600" },
};

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });

/** "2026-11-05T20:00" (giờ máy) mặc định: 3 ngày sau, 20:00 */
function defaultDue(): string {
  const date = new Date();
  date.setDate(date.getDate() + 3);
  date.setHours(20, 0, 0, 0);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Bài tập của một buổi (khu gia sư): giao bài mới, giao / đóng bài, xem bài học viên đã nộp và chấm điểm.
 * API: /sessions/{id}/homeworks, /homeworks/{id}/status, /homeworks/{id}/submissions, /submissions/{id}/grade.
 */
export function SessionHomework({ sessionId }: { sessionId: number }) {
  const queryClient = useQueryClient();
  const key = ["session-homeworks", sessionId];
  const homeworks = useQuery({ queryKey: key, queryFn: () => listSessionHomeworks(sessionId) });
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });

  const status = useMutation({
    mutationFn: ({ homework, next }: { homework: HomeworkResponse; next: "PUBLISHED" | "CLOSED" }) =>
      changeHomeworkStatus(homework.id, next, homework.version),
    onSuccess: () => {
      setError(null);
      void refresh();
    },
    onError: (failure) => {
      setError(portalErrorMessage(failure, "Chưa cập nhật được bài tập."));
      void refresh();
    },
  });

  const items = homeworks.data?.content ?? [];
  const [gradingFilter, setGradingFilter] = useState<GradingFilter>("all");
  const [dueFilter, setDueFilter] = useState<DueFilter>("all");

  // Bài đã giao (PUBLISHED/CLOSED) mới có bài nộp — tải nhẹ, chỉ lấy bài SUBMITTED (chưa chấm) để biết lớp còn bài cần chấm hay không
  const gradableItems = items.filter((homework) => homework.status !== "DRAFT");
  const pendingQueries = useQueries({
    queries: gradableItems.map((homework) => ({
      queryKey: ["homework-submissions", homework.id, "SUBMITTED"],
      queryFn: () => listSubmissions(homework.id, "SUBMITTED"),
    })),
  });
  const pendingCountByHomework = useMemo(() => {
    const map = new Map<number, number>();
    gradableItems.forEach((homework, index) => map.set(homework.id, pendingQueries[index]?.data?.content.length ?? 0));
    return map;
  }, [gradableItems, pendingQueries]);

  const now = Date.now();
  const filteredItems = items.filter((homework) => {
    if (dueFilter === "overdue" && new Date(homework.dueAt).getTime() > now) return false;
    if (dueFilter === "open" && new Date(homework.dueAt).getTime() <= now) return false;
    if (gradingFilter === "pending" && (pendingCountByHomework.get(homework.id) ?? 0) === 0) return false;
    if (gradingFilter === "done" && homework.status === "DRAFT") return false;
    if (gradingFilter === "done" && (pendingCountByHomework.get(homework.id) ?? 0) > 0) return false;
    return true;
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[13.5px] text-brand-muted">{items.length > 0 ? `${items.length} bài tập` : "Chưa giao bài nào cho buổi này."}</p>
        {!creating && (
          <button type="button" onClick={() => setCreating(true)} className={PORTAL_BTN_PRIMARY}>
            <Icon name="add" className="text-[18px]" />
            Giao bài
          </button>
        )}
      </div>

      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <FilterTabs
            label="Lọc theo trạng thái chấm điểm"
            value={gradingFilter}
            onChange={setGradingFilter}
            tabs={[
              { value: "all", label: "Tất cả" },
              { value: "pending", label: "Còn bài chưa chấm" },
              { value: "done", label: "Không còn bài chưa chấm" },
            ]}
          />
          <FilterTabs
            label="Lọc theo hạn nộp"
            value={dueFilter}
            onChange={setDueFilter}
            tabs={[
              { value: "all", label: "Mọi hạn nộp" },
              { value: "open", label: "Còn hạn" },
              { value: "overdue", label: "Quá hạn" },
            ]}
          />
        </div>
      )}

      {creating && (
        <HomeworkForm
          sessionId={sessionId}
          onCancel={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void refresh();
          }}
        />
      )}

      {error && <p className={AUTH_ERROR}>{error}</p>}
      {homeworks.isError && <p className={AUTH_ERROR}>Không tải được bài tập.</p>}
      {items.length > 0 && filteredItems.length === 0 && (
        <p className="text-[13.5px] text-brand-muted">Không có bài tập nào khớp bộ lọc.</p>
      )}

      <ul className="space-y-2">
        {filteredItems.map((homework) => {
          const style = STATUS_STYLE[homework.status];
          const open = openId === homework.id;
          const pendingCount = pendingCountByHomework.get(homework.id) ?? 0;
          return (
            <li key={homework.id} className="rounded-xl border border-brand-sandLine bg-white">
              <div className="flex flex-wrap items-start gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <span className="text-[14.5px] font-semibold text-brand-ink">{homework.title}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-bold ${style.className}`}>{style.label}</span>
                    {pendingCount > 0 && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11.5px] font-bold text-amber-800">
                        {pendingCount} bài chưa chấm
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-[12.5px] text-brand-muted">
                    Hạn nộp {dateTime(homework.dueAt)} - Điểm tối đa {homework.maxScore}
                  </p>
                  {homework.resourceUrl && (
                    <div className="mt-1">
                      <AttachmentLink url={homework.resourceUrl} />
                    </div>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  {homework.status === "DRAFT" && (
                    <button
                      type="button"
                      disabled={status.isPending}
                      onClick={() => status.mutate({ homework, next: "PUBLISHED" })}
                      className={`h-8 rounded-lg bg-brand-navy px-3 text-[13px] font-semibold text-white hover:bg-brand-navyDeep disabled:opacity-50 ${FOCUS_RING}`}
                    >
                      Giao cho học viên
                    </button>
                  )}
                  {homework.status !== "DRAFT" && (
                    <button
                      type="button"
                      onClick={() => setOpenId(open ? null : homework.id)}
                      className={`h-8 rounded-lg border border-brand-sandLine px-3 text-[13px] font-semibold text-brand-navy hover:bg-brand-tint ${FOCUS_RING}`}
                    >
                      {open ? "Ẩn bài nộp" : "Bài nộp & chấm"}
                    </button>
                  )}
                  {homework.status === "PUBLISHED" && (
                    <button
                      type="button"
                      disabled={status.isPending}
                      onClick={() => status.mutate({ homework, next: "CLOSED" })}
                      className={`h-8 rounded-lg px-3 text-[13px] font-semibold text-brand-muted hover:bg-slate-100 disabled:opacity-50 ${FOCUS_RING}`}
                    >
                      Đóng bài
                    </button>
                  )}
                </div>
              </div>
              {open && (
                <div className="border-t border-brand-sandLine bg-brand-sand/30 p-3">
                  <p className="mb-2 whitespace-pre-line text-[13px] text-brand-muted">{homework.instructions}</p>
                  {homework.questions && homework.questions.length > 0 && (
                    <div className="mb-3">
                      <HomeworkQuestionList questions={homework.questions} />
                    </div>
                  )}
                  <SubmissionList homework={homework} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Form giao bài mới: tạo nháp rồi giao luôn nếu chọn "Giao ngay" */
function HomeworkForm({ sessionId, onCancel, onSaved }: { sessionId: number; onCancel: () => void; onSaved: () => void }) {
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [questions, setQuestions] = useState<DraftQuestion[]>([]);
  const [due, setDue] = useState(defaultDue);
  const [maxScore, setMaxScore] = useState("10");
  const [publishNow, setPublishNow] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: async () => {
      const created = await createHomework(sessionId, {
        title: title.trim(),
        instructions: instructions.trim(),
        resourceUrl: resourceUrl.trim() || undefined,
        dueAt: new Date(due).toISOString(),
        maxScore: Number(maxScore),
        questions: draftQuestionsToRequest(questions),
      });
      return publishNow ? changeHomeworkStatus(created.id, "PUBLISHED", created.version) : created;
    },
    onSuccess: onSaved,
    onError: (failure) => setError(portalErrorMessage(failure, "Chưa giao được bài. Vui lòng thử lại.")),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return setError("Nhập tên bài tập.");
    if (!instructions.trim()) return setError("Nhập đề bài / yêu cầu.");
    if (!due || new Date(due) <= new Date()) return setError("Hạn nộp phải ở tương lai.");
    if (!(Number(maxScore) > 0)) return setError("Điểm tối đa phải lớn hơn 0.");
    if (resourceUrl.trim() && !/^(https:\/\/|\/api\/v1\/files\/)\S+$/.test(resourceUrl.trim()))
      return setError("Link tài liệu phải bắt đầu bằng https://");
    setError(null);
    save.mutate();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-3 rounded-xl border border-brand-navy/20 bg-brand-tint/40 p-4">
      <div>
        <label htmlFor="hw-title" className={PORTAL_LABEL}>
          Tên bài tập
        </label>
        <input id="hw-title" value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} className={PORTAL_INPUT} />
      </div>
      <div>
        <label htmlFor="hw-instructions" className={PORTAL_LABEL}>
          Đề bài / yêu cầu
        </label>
        <textarea
          id="hw-instructions"
          rows={4}
          value={instructions}
          onChange={(event) => setInstructions(event.target.value)}
          className={`${PORTAL_INPUT} h-auto py-2 leading-relaxed`}
        />
      </div>
      <AttachmentField id="hw-link" label="File / link tài liệu (không bắt buộc)" value={resourceUrl} onChange={setResourceUrl} />
      <HomeworkQuestionEditor questions={questions} onChange={setQuestions} />
      <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
        <div>
          <label htmlFor="hw-due" className={PORTAL_LABEL}>
            Hạn nộp
          </label>
          {/* Hạn nộp "YYYY-MM-DDTHH:mm": chọn ngày và giờ riêng */}
          <div className="grid grid-cols-[minmax(0,1fr)_112px] gap-2">
            <DateField
              id="hw-due"
              value={due.slice(0, 10)}
              onChange={(value) => setDue(value ? `${value}T${due.slice(11, 16) || "23:59"}` : "")}
              className={PORTAL_INPUT}
            />
            <TimeField
              aria-label="Giờ hạn nộp"
              value={due.slice(11, 16)}
              onChange={(value) => setDue(`${due.slice(0, 10) || toIsoDate(new Date())}T${value}`)}
              className={PORTAL_INPUT}
            />
          </div>
        </div>
        <div>
          <label htmlFor="hw-score" className={PORTAL_LABEL}>
            Điểm tối đa
          </label>
          <input
            id="hw-score"
            inputMode="decimal"
            value={maxScore}
            onChange={(event) => setMaxScore(event.target.value.replace(/[^\d.]/g, ""))}
            className={PORTAL_INPUT}
          />
        </div>
      </div>
      <label className="flex items-center gap-2 text-[13.5px] text-brand-ink">
        <input type="checkbox" checked={publishNow} onChange={(event) => setPublishNow(event.target.checked)} className="accent-[#0B3A8C]" />
        Giao ngay cho học viên (bỏ chọn để lưu nháp)
      </label>
      {error && <p className={AUTH_ERROR}>{error}</p>}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className={PORTAL_BTN_SECONDARY}>
          Hủy
        </button>
        <button type="submit" disabled={save.isPending} className={PORTAL_BTN_PRIMARY}>
          {save.isPending ? "Đang lưu…" : publishNow ? "Giao bài" : "Lưu nháp"}
        </button>
      </div>
    </form>
  );
}

/** Bài học viên đã nộp của một bài tập, kèm ô chấm điểm */
function SubmissionList({ homework }: { homework: HomeworkResponse }) {
  const submissions = useQuery({ queryKey: ["homework-submissions", homework.id], queryFn: () => listSubmissions(homework.id) });
  const items = submissions.data?.content ?? [];
  if (submissions.isPending) return <p className="text-[13px] text-brand-muted">Đang tải bài nộp…</p>;
  if (submissions.isError) return <p className={AUTH_ERROR}>Không tải được bài nộp.</p>;
  if (items.length === 0) return <p className="text-[13px] text-brand-muted">Chưa có học viên nào nộp bài.</p>;
  const graded = items.filter((item) => item.status === "GRADED").length;
  return (
    <div className="space-y-2">
      <p className="text-[12.5px] font-semibold text-brand-muted">
        {items.length} bài đã nộp - {graded} đã chấm
      </p>
      {items.map((submission) => (
        <SubmissionRow key={submission.id} submission={submission} homework={homework} />
      ))}
    </div>
  );
}

function SubmissionRow({ submission, homework }: { submission: SubmissionResponse; homework: HomeworkResponse }) {
  const queryClient = useQueryClient();
  const [score, setScore] = useState(submission.score != null ? String(submission.score) : "");
  const [feedback, setFeedback] = useState(submission.feedback ?? "");
  const [error, setError] = useState<string | null>(null);
  const graded = submission.status === "GRADED";

  const grade = useMutation({
    mutationFn: () => gradeSubmission(submission.id as number, { score: Number(score), feedback: feedback.trim() || undefined, version: submission.version ?? 0 }),
    onSuccess: () => {
      setError(null);
      void queryClient.invalidateQueries({ queryKey: ["homework-submissions", homework.id] });
    },
    onError: (failure) => setError(portalErrorMessage(failure, "Chưa chấm được bài.")),
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    const value = Number(score);
    if (score === "" || Number.isNaN(value) || value < 0 || value > homework.maxScore)
      return setError(`Điểm từ 0 đến ${homework.maxScore}.`);
    grade.mutate();
  }

  return (
    <form onSubmit={submit} className="rounded-lg border border-brand-sandLine bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[13.5px] font-semibold text-brand-ink">{studentLabel(submission.studentId)}</p>
        <p className="text-[12px] text-brand-muted">{submission.submittedAt ? `Nộp lúc ${dateTime(submission.submittedAt)}` : ""}</p>
      </div>
      {submission.content && <p className="mt-1.5 whitespace-pre-line text-[13.5px] text-brand-ink">{submission.content}</p>}
      {submission.resourceUrl && (
        <div className="mt-1">
          <AttachmentLink url={submission.resourceUrl} preview />
        </div>
      )}
      {graded ? (
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-[13.5px] text-emerald-900">
          <strong>
            {submission.score}/{homework.maxScore} điểm
          </strong>
          {submission.feedback && <> - {submission.feedback}</>}
        </p>
      ) : (
        <div className="mt-2 grid gap-2 sm:grid-cols-[110px_1fr_auto]">
          <input
            aria-label="Điểm"
            inputMode="decimal"
            value={score}
            onChange={(event) => setScore(event.target.value.replace(/[^\d.]/g, ""))}
            placeholder={`/${homework.maxScore}`}
            className={`${PORTAL_INPUT} h-9`}
          />
          <input
            aria-label="Nhận xét"
            value={feedback}
            maxLength={5000}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder="Nhận xét (không bắt buộc)"
            className={`${PORTAL_INPUT} h-9`}
          />
          <button type="submit" disabled={grade.isPending} className={`${PORTAL_BTN_PRIMARY} h-9`}>
            {grade.isPending ? "Đang lưu…" : "Chấm"}
          </button>
        </div>
      )}
      {error && <p className={AUTH_ERROR}>{error}</p>}
    </form>
  );
}
