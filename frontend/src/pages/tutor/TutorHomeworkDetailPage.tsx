import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { FilterTabs } from "@/components/dashboard/FilterTabs";
import { PortalDialog } from "@/components/dashboard/PortalDialog";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { HomeworkEditor } from "@/components/homework/HomeworkEditor";
import { HomeworkInfo } from "@/components/homework/HomeworkInfo";
import { QuestionBuilder } from "@/components/homework/QuestionBuilder";
import { SubmissionGrader } from "@/components/homework/SubmissionGrader";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_BTN_ACCENT, PORTAL_BTN_SECONDARY, PORTAL_CARD, PORTAL_INPUT, PORTAL_MORE_LINK } from "@/constants/classNames";
import { HOMEWORK_STATUS } from "@/constants/labels";
import { ROUTES, homeworkPath } from "@/constants/routes";
import { homeworkKeys, useHomework, useSubmissions } from "@/hooks/useHomeworkData";
import { useNow } from "@/hooks/useNow";
import { useUserId } from "@/hooks/usePortalData";
import { changeHomeworkStatus } from "@/services/homeworkService";
import { portalErrorMessage } from "@/utils/errors";
import { toQuestionDrafts } from "@/utils/homework";
import type { HomeworkStatus } from "@/interfaces/homework";

type SubmissionTab = "pending" | "graded" | "all";

/**
 * Một bài tập của gia sư: xem / sửa, công bố (học viên nhận thông báo kèm đường dẫn), đóng bài,
 * và chấm các bài đã nộp — bài nộp trễ có ghi rõ trễ bao lâu.
 */
export function TutorHomeworkDetailPage() {
  const homeworkId = Number(useParams().homeworkId);
  const now = useNow();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const homework = useHomework(homeworkId);
  const submissions = useSubmissions(homeworkId, homework.data?.status !== "DRAFT");
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<HomeworkStatus | null>(null);
  const [tab, setTab] = useState<SubmissionTab>("pending");
  const [copied, setCopied] = useState(false);

  const status = useMutation({
    mutationFn: (target: HomeworkStatus) => changeHomeworkStatus(homeworkId, target, homework.data?.version as number),
    onSuccess: (next) => {
      setConfirm(null);
      queryClient.setQueryData(homeworkKeys.detail(userId, homeworkId), (current: typeof next | undefined) => ({ ...current, ...next }));
      void queryClient.invalidateQueries({ queryKey: homeworkKeys.all(userId) });
    },
  });

  if (homework.isPending) return <PortalLoading label="Đang tải bài tập" />;
  if (homework.isError)
    return <PortalError message={portalErrorMessage(homework.error, "Chưa tải được bài tập.")} onRetry={() => void homework.refetch()} />;

  const data = homework.data;
  const style = HOMEWORK_STATUS[data.status];
  const studentLink = `${window.location.origin}${homeworkPath(data.id, "student")}`;
  const all = submissions.data?.content ?? [];
  const pending = all.filter((item) => item.status === "SUBMITTED" || (item.autoGraded && item.gradedBy === undefined));
  const graded = all.filter((item) => item.status === "GRADED");
  const shown = tab === "pending" ? pending : tab === "graded" ? graded : all;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(studentLink);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <Link to={ROUTES.tutorHomeworks} className={`mb-3 text-[14px] ${PORTAL_MORE_LINK}`}>
        <Icon name="arrow_back" className="text-[18px]" />
        Tất cả bài tập
      </Link>
      <PortalPageHeader
        icon="assignment"
        title={data.title}
        action={
          <>
            <StatusChip tone={style.tone} icon={style.icon}>
              {style.label}
            </StatusChip>
            {data.status !== "CLOSED" && !editing && (
              <button type="button" onClick={() => setEditing(true)} className={PORTAL_BTN_SECONDARY}>
                <Icon name="edit" className="text-[18px]" />
                Sửa
              </button>
            )}
            {data.status === "DRAFT" && (
              <button type="button" onClick={() => setConfirm("PUBLISHED")} className={PORTAL_BTN_ACCENT}>
                <Icon name="campaign" className="text-[18px]" />
                Công bố
              </button>
            )}
            {data.status === "PUBLISHED" && (
              <button type="button" onClick={() => setConfirm("CLOSED")} className={PORTAL_BTN_SECONDARY}>
                <Icon name="lock" className="text-[18px]" />
                Đóng bài
              </button>
            )}
          </>
        }
      />

      {editing ? (
        <HomeworkEditor
          homework={data}
          onCancel={() => setEditing(false)}
          onSaved={(next) => {
            setEditing(false);
            queryClient.setQueryData(homeworkKeys.detail(userId, homeworkId), next);
            void queryClient.invalidateQueries({ queryKey: homeworkKeys.all(userId) });
          }}
        />
      ) : (
        <div className="space-y-5">
          {data.status !== "DRAFT" && (
            <section className={`p-4 sm:p-5 ${PORTAL_CARD}`} aria-label="Đường dẫn cho học viên">
              <p className="text-[14px] font-semibold text-brand-muted">
                Đường dẫn làm bài cho học viên (học viên trong lớp cũng thấy bài ở mục Bài tập)
              </p>
              <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  value={studentLink}
                  onFocus={(event) => event.target.select()}
                  className={PORTAL_INPUT}
                  aria-label="Đường dẫn làm bài"
                />
                <button type="button" onClick={() => void copyLink()} className={PORTAL_BTN_SECONDARY}>
                  <Icon name={copied ? "check" : "content_copy"} className="text-[18px]" />
                  {copied ? "Đã chép" : "Chép đường dẫn"}
                </button>
              </div>
            </section>
          )}

          <HomeworkInfo homework={data} now={now} />

          {(data.questions?.length ?? 0) > 0 && (
            <section className={`p-5 sm:p-6 ${PORTAL_CARD}`} aria-labelledby="questions-title">
              <h2 id="questions-title" className="mb-4 text-[17px] font-bold text-brand-navy">
                Câu hỏi và đáp án
              </h2>
              <QuestionBuilder questions={toQuestionDrafts(data.questions)} onChange={() => undefined} readOnly />
            </section>
          )}

          {data.status === "DRAFT" ? (
            <AuthNotice tone="info">Bài đang là bản nháp nên học viên chưa thấy. Bấm Công bố khi đã sẵn sàng.</AuthNotice>
          ) : (
            <section aria-labelledby="submissions-title">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 id="submissions-title" className="text-[19px] font-extrabold text-brand-navy">
                  Bài làm đã nộp
                </h2>
                <FilterTabs
                  label="Lọc bài làm"
                  value={tab}
                  onChange={setTab}
                  tabs={[
                    { value: "pending", label: "Chờ chấm", count: pending.length },
                    { value: "graded", label: "Đã chấm", count: graded.length },
                    { value: "all", label: "Tất cả", count: all.length },
                  ]}
                />
              </div>
              {submissions.isPending && <PortalLoading label="Đang tải bài làm" />}
              {submissions.isError && <PortalError message="Chưa tải được bài làm." onRetry={() => void submissions.refetch()} />}
              {submissions.isSuccess && shown.length === 0 && (
                <PortalEmpty
                  icon="inbox"
                  title={tab === "pending" ? "Không có bài nào chờ chấm" : "Chưa có bài làm"}
                  description="Khi học viên nộp bài, bạn sẽ nhận thông báo ở chuông góc trên (kèm thời gian trễ nếu nộp sau hạn)."
                />
              )}
              <div className="space-y-4">
                {shown.map((submission) => (
                  <SubmissionGrader key={`${submission.id}-${submission.version}`} homework={data} submission={submission} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <PortalDialog
        open={confirm !== null}
        title={confirm === "PUBLISHED" ? "Công bố bài tập" : "Đóng bài tập"}
        onClose={() => setConfirm(null)}
        widthClassName="max-w-[480px]"
      >
        <div className="space-y-3 text-[14.5px] leading-relaxed text-brand-ink">
          {confirm === "PUBLISHED" ? (
            <p>
              Học viên của lớp sẽ thấy bài và nhận thông báo kèm đường dẫn. Sau khi công bố, đề bài và câu hỏi không sửa được nữa (vẫn gia
              hạn, đổi mật khẩu được).
            </p>
          ) : (
            <p>Học viên sẽ không bắt đầu hay nộp bài được nữa và không mở lại được. Bạn vẫn chấm được các bài đã nộp.</p>
          )}
          {status.error && (
            <AuthNotice tone="error">{portalErrorMessage(status.error, "Chưa đổi được trạng thái. Vui lòng thử lại.")}</AuthNotice>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setConfirm(null)} className={PORTAL_BTN_SECONDARY}>
              Hủy
            </button>
            <button
              type="button"
              disabled={status.isPending}
              onClick={() => confirm && status.mutate(confirm)}
              className={PORTAL_BTN_ACCENT}
            >
              {confirm === "PUBLISHED" ? "Công bố" : "Đóng bài"}
            </button>
          </div>
        </div>
      </PortalDialog>
    </>
  );
}
