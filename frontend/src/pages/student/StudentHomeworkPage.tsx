import { useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { FilterTabs } from "@/components/dashboard/FilterTabs";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { AttachmentField } from "@/components/ui/AttachmentField";
import { Icon } from "@/components/ui/Icon";
import { attachmentName } from "@/services/fileService";
import { AUTH_ERROR, FOCUS_RING, PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY, PORTAL_CARD, PORTAL_INPUT, PORTAL_LABEL } from "@/constants/classNames";
import type { StudentHomeworkResponse, SubmissionResponse } from "@/interfaces/api";
import { listMyHomeworks, saveHomeworkDraft, startHomework, submitHomework } from "@/services/homeworkService";
import { getTuitionClass } from "@/services/tuitionPaymentService";
import { displayCode } from "@/utils/classes";
import { portalErrorMessage } from "@/utils/errors";

type Tab = "TODO" | "SUBMITTED" | "GRADED";

const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" });

const tabOf = (item: StudentHomeworkResponse): Tab =>
  item.submission.status === "GRADED" ? "GRADED" : item.submission.status === "SUBMITTED" ? "SUBMITTED" : "TODO";

/**
 * Bài tập của học viên (/student/homework): các bài gia sư đã giao ở những lớp đang học.
 * Chia Cần làm / Đã nộp / Đã chấm; bấm một bài để làm, lưu nháp, nộp, hoặc xem điểm và nhận xét.
 */
export function StudentHomeworkPage() {
  const homeworks = useQuery({ queryKey: ["my-homeworks"], queryFn: () => listMyHomeworks() });
  const [tab, setTab] = useState<Tab>("TODO");
  const [openId, setOpenId] = useState<number | null>(null);
  const all = homeworks.data?.content ?? [];
  const shown = all.filter((item) => tabOf(item) === tab);

  // Tên khóa của từng lớp
  const classIds = [...new Set(all.map((item) => item.classGroupId))];
  const classes = useQueries({
    queries: classIds.map((id) => ({ queryKey: ["catalog-class", id], queryFn: () => getTuitionClass(id), staleTime: 5 * 60_000, retry: false })),
  });
  const courseName = (id: number) => classes[classIds.indexOf(id)]?.data?.courseName ?? `Lớp ${displayCode("class", id)}`;
  const count = (value: Tab) => all.filter((item) => tabOf(item) === value).length;

  return (
    <div>
      <PortalPageHeader icon="assignment" title="Bài tập" description="Bài gia sư giao cho các lớp bạn đang học." />
      <div className="mb-4">
        <FilterTabs
          label="Trạng thái bài tập"
          value={tab}
          onChange={setTab}
          tabs={[
            { value: "TODO", label: "Cần làm", count: count("TODO") },
            { value: "SUBMITTED", label: "Đã nộp", count: count("SUBMITTED") },
            { value: "GRADED", label: "Đã chấm", count: count("GRADED") },
          ]}
        />
      </div>

      {homeworks.isPending ? (
        <PortalLoading label="Đang tải bài tập" rows={3} />
      ) : homeworks.isError ? (
        <PortalError message="Không tải được bài tập." onRetry={() => void homeworks.refetch()} />
      ) : shown.length === 0 ? (
        <PortalEmpty
          icon="assignment_turned_in"
          title={tab === "TODO" ? "Không có bài cần làm." : tab === "SUBMITTED" ? "Chưa có bài chờ chấm." : "Chưa có bài được chấm."}
          description="Bài tập gia sư giao sẽ hiện ở đây."
        />
      ) : (
        <ul className="space-y-3">
          {shown.map((item) => (
            <HomeworkCard
              key={item.homework.id}
              item={item}
              course={courseName(item.classGroupId)}
              open={openId === item.homework.id}
              onToggle={() => setOpenId(openId === item.homework.id ? null : item.homework.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function HomeworkCard({ item, course, open, onToggle }: { item: StudentHomeworkResponse; course: string; open: boolean; onToggle: () => void }) {
  const { homework, submission } = item;
  const overdue = new Date(homework.dueAt) <= new Date();
  const status = submission.status;
  const badge =
    status === "GRADED"
      ? { text: `${submission.score}/${homework.maxScore} điểm`, className: "bg-emerald-50 text-emerald-800" }
      : status === "SUBMITTED"
        ? { text: "Đã nộp", className: "bg-brand-tint text-brand-navy" }
        : overdue
          ? { text: "Quá hạn", className: "bg-red-50 text-red-700" }
          : status === "IN_PROGRESS"
            ? { text: "Đang làm", className: "bg-amber-50 text-amber-800" }
            : { text: "Chưa làm", className: "bg-slate-100 text-slate-700" };

  return (
    <li className={`overflow-hidden ${PORTAL_CARD}`}>
      <button type="button" onClick={onToggle} aria-expanded={open} className={`flex w-full items-start gap-3 p-4 text-left ${FOCUS_RING}`}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand-navy">
          <Icon name="assignment" className="text-[21px]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15.5px] font-bold text-brand-ink">{homework.title}</span>
          <span className="block truncate text-[13px] text-brand-muted">
            {course} - Hạn nộp {dateTime(homework.dueAt)}
          </span>
        </span>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold ${badge.className}`}>{badge.text}</span>
        <Icon name={open ? "expand_less" : "expand_more"} className="shrink-0 text-[22px] text-brand-muted" />
      </button>
      {open && (
        <div className="space-y-4 border-t border-brand-sandLine px-4 py-4">
          <div>
            <p className="whitespace-pre-line text-[14px] leading-relaxed text-brand-ink">{homework.instructions}</p>
            {homework.resourceUrl && (
              <a
                href={homework.resourceUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-[13.5px] font-semibold text-brand-navy hover:text-brand-navyDeep"
              >
                <Icon name="attach_file" className="text-[17px]" />
                {attachmentName(homework.resourceUrl)}
              </a>
            )}
            <p className="mt-2 text-[12.5px] text-brand-muted">Điểm tối đa {homework.maxScore}</p>
          </div>
          <WorkArea item={item} overdue={overdue} />
        </div>
      )}
    </li>
  );
}

/** Phần làm bài: bắt đầu → lưu nháp / nộp; đã chấm thì hiện điểm và nhận xét */
function WorkArea({ item, overdue }: { item: StudentHomeworkResponse; overdue: boolean }) {
  const queryClient = useQueryClient();
  const { homework } = item;
  const [submission, setSubmission] = useState<SubmissionResponse>(item.submission);
  const [content, setContent] = useState(item.submission.content ?? "");
  const [link, setLink] = useState(item.submission.resourceUrl ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const accepting = homework.status === "PUBLISHED" && !overdue;
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["my-homeworks"] });

  const fail = (failure: unknown, fallback: string) => {
    setNotice(null);
    setError(portalErrorMessage(failure, fallback));
  };
  const start = useMutation({
    mutationFn: () => startHomework(homework.id),
    onSuccess: (saved) => {
      setSubmission(saved);
      setError(null);
    },
    onError: (failure) => fail(failure, "Chưa bắt đầu được."),
  });
  const body = () => ({ content: content.trim() || undefined, resourceUrl: link.trim() || undefined, version: submission.version ?? 0 });
  const draft = useMutation({
    mutationFn: () => saveHomeworkDraft(homework.id, body()),
    onSuccess: (saved) => {
      setSubmission(saved);
      setError(null);
      setNotice("Đã lưu nháp.");
    },
    onError: (failure) => fail(failure, "Chưa lưu được nháp."),
  });
  const submit = useMutation({
    mutationFn: () => submitHomework(homework.id, body()),
    onSuccess: (saved) => {
      setSubmission(saved);
      setError(null);
      setNotice("Đã nộp bài.");
      void refresh();
    },
    onError: (failure) => fail(failure, "Chưa nộp được bài."),
  });

  if (submission.status === "GRADED") {
    return (
      <div className="rounded-xl bg-emerald-50 p-4">
        <p className="text-[15px] font-bold text-emerald-900">
          {submission.score}/{homework.maxScore} điểm
        </p>
        {submission.feedback && <p className="mt-1 whitespace-pre-line text-[14px] text-emerald-900">Nhận xét: {submission.feedback}</p>}
        {submission.content && <p className="mt-2 whitespace-pre-line text-[13.5px] text-brand-ink">{submission.content}</p>}
        {submission.resourceUrl && (
          <a href={submission.resourceUrl} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-[13px] font-semibold text-brand-navy hover:text-brand-navyDeep">
            <Icon name="attach_file" className="text-[16px]" />
            {attachmentName(submission.resourceUrl)}
          </a>
        )}
      </div>
    );
  }

  if (submission.status === "NOT_STARTED") {
    return accepting ? (
      <div>
        <button type="button" onClick={() => start.mutate()} disabled={start.isPending} className={PORTAL_BTN_PRIMARY}>
          <Icon name="edit" className="text-[18px]" />
          {start.isPending ? "Đang mở…" : "Bắt đầu làm"}
        </button>
        {error && <p className={AUTH_ERROR}>{error}</p>}
      </div>
    ) : (
      <p className="text-[13.5px] text-brand-muted">{overdue ? "Đã quá hạn nộp." : "Bài tập này không còn nhận bài."}</p>
    );
  }

  const editable = accepting;
  return (
    <div className="space-y-3">
      <div>
        <label htmlFor={`hw-answer-${homework.id}`} className={PORTAL_LABEL}>
          Bài làm
        </label>
        <textarea
          id={`hw-answer-${homework.id}`}
          rows={6}
          value={content}
          disabled={!editable}
          onChange={(event) => setContent(event.target.value)}
          className={`${PORTAL_INPUT} h-auto py-2 leading-relaxed`}
          placeholder="Nhập bài làm của bạn"
        />
      </div>
      <AttachmentField
        id={`hw-link-${homework.id}`}
        label="File / link bài làm (ảnh chụp, PDF, Word…)"
        value={link}
        onChange={setLink}
        disabled={!editable}
      />
      {submission.status === "SUBMITTED" && (
        <p className="text-[13px] text-brand-muted">
          Đã nộp {submission.submittedAt ? dateTime(submission.submittedAt) : ""}. {editable ? "Bạn vẫn sửa và nộp lại được trước hạn." : ""}
        </p>
      )}
      {notice && <p className="text-[13px] font-semibold text-emerald-700">{notice}</p>}
      {error && <p className={AUTH_ERROR}>{error}</p>}
      {editable && (
        <div className="flex flex-wrap justify-end gap-2">
          {submission.status === "IN_PROGRESS" && (
            <button type="button" onClick={() => draft.mutate()} disabled={draft.isPending} className={PORTAL_BTN_SECONDARY}>
              {draft.isPending ? "Đang lưu…" : "Lưu nháp"}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              if (!content.trim() && !link.trim()) return setError("Hãy nhập bài làm hoặc dán link trước khi nộp.");
              if (link.trim() && !/^(https:\/\/|\/api\/v1\/files\/)\S+$/.test(link.trim()))
                return setError("Link phải bắt đầu bằng https://");
              submit.mutate();
            }}
            disabled={submit.isPending}
            className={PORTAL_BTN_PRIMARY}
          >
            <Icon name="send" className="text-[18px]" />
            {submit.isPending ? "Đang nộp…" : submission.status === "SUBMITTED" ? "Nộp lại" : "Nộp bài"}
          </button>
        </div>
      )}
    </div>
  );
}
