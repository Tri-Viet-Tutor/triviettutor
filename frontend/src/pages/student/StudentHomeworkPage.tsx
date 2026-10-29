import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { PortalDialog } from "@/components/dashboard/PortalDialog";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { HomeworkInfo } from "@/components/homework/HomeworkInfo";
import { QuizForm } from "@/components/homework/QuizForm";
import { SubmissionResult } from "@/components/homework/SubmissionResult";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_BTN_ACCENT, PORTAL_BTN_SECONDARY, PORTAL_CARD, PORTAL_INPUT, PORTAL_LABEL, PORTAL_MORE_LINK } from "@/constants/classNames";
import { ROUTES } from "@/constants/routes";
import { homeworkKeys, useHomework, useMySubmission } from "@/hooks/useHomeworkData";
import { useNow } from "@/hooks/useNow";
import { useUserId } from "@/hooks/usePortalData";
import { startHomework } from "@/services/homeworkService";
import { portalErrorMessage } from "@/utils/errors";
import { acceptsWork, formatDateTime, homeworkPhase } from "@/utils/homework";

/**
 * Trang làm một bài của học viên. Chưa bắt đầu: xem thông tin bài rồi bấm "Bắt đầu làm bài"
 * (bài có mật khẩu thì nhập mật khẩu gia sư cung cấp). Đang làm: làm và nộp. Đã nộp: xem bài, điểm và nhận xét.
 */
export function StudentHomeworkPage() {
  const homeworkId = Number(useParams().homeworkId);
  const now = useNow();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const homework = useHomework(homeworkId);
  const mine = useMySubmission(homeworkId);
  const [starting, setStarting] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const start = useMutation({
    mutationFn: () => startHomework(homeworkId, password.trim() || undefined),
    onSuccess: (submission) => {
      setStarting(false);
      queryClient.setQueryData(homeworkKeys.mine(userId, homeworkId), submission);
      // Câu hỏi chỉ trả về sau khi đã bắt đầu
      void queryClient.invalidateQueries({ queryKey: homeworkKeys.detail(userId, homeworkId) });
      void queryClient.invalidateQueries({ queryKey: homeworkKeys.all(userId) });
    },
  });

  if (homework.isPending || mine.isPending) return <PortalLoading label="Đang tải bài tập" />;
  if (homework.isError || mine.isError)
    return (
      <PortalError
        message={portalErrorMessage(homework.error ?? mine.error, "Chưa tải được bài tập.")}
        onRetry={() => {
          void homework.refetch();
          void mine.refetch();
        }}
      />
    );

  const data = homework.data;
  const submission = mine.data;
  const canWork = acceptsWork(data, now);
  const phase = homeworkPhase(data, now);

  function handleStart(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    start.mutate();
  }

  return (
    <>
      <Link to={ROUTES.studentHomeworks} className={`mb-3 text-[14px] ${PORTAL_MORE_LINK}`}>
        <Icon name="arrow_back" className="text-[18px]" />
        Tất cả bài tập
      </Link>
      <PortalPageHeader icon="assignment" title={data.title} />

      <div className="space-y-5">
        <HomeworkInfo homework={data} now={now} />

        {submission.status === "NOT_STARTED" && (
          <section className={`flex flex-col items-start gap-3 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6 ${PORTAL_CARD}`}>
            <p className="text-[14.5px] text-brand-ink">
              {canWork
                ? "Số lần làm bài: 1. Khi bắt đầu, bài làm được lưu lại để bạn làm tiếp nếu lỡ thoát ra."
                : phase === "upcoming"
                  ? `Bài mở lúc ${data.openAt ? formatDateTime(data.openAt) : ""}.`
                  : "Bài không còn nhận bài làm."}
            </p>
            <button type="button" disabled={!canWork} onClick={() => setStarting(true)} className={PORTAL_BTN_ACCENT}>
              <Icon name="play_arrow" className="text-[19px]" />
              Bắt đầu làm bài
            </button>
          </section>
        )}

        {submission.status === "IN_PROGRESS" &&
          (canWork ? (
            // Câu hỏi chỉ có sau khi bắt đầu: chờ lượt tải lại xong rồi mới hiện form
            data.questions !== undefined || !homework.isFetching ? (
              <QuizForm key={submission.id} homework={data} submission={submission} />
            ) : (
              <PortalLoading label="Đang tải câu hỏi" />
            )
          ) : (
            <AuthNotice tone="info">Bài không còn nhận bài làm nên bản lưu tạm của bạn không nộp được nữa.</AuthNotice>
          ))}

        {(submission.status === "SUBMITTED" || submission.status === "GRADED") && (
          <SubmissionResult homework={data} submission={submission} />
        )}
      </div>

      <PortalDialog open={starting} title="Bắt đầu làm bài" onClose={() => setStarting(false)} widthClassName="max-w-[480px]">
        <form onSubmit={handleStart} className="space-y-4">
          {data.passwordProtected && (
            <div>
              <h3 className="text-[17px] font-bold text-brand-navy">Mật khẩu</h3>
              <p className="mt-1 text-[14.5px] text-brand-ink">Để làm bài này, bạn cần mật khẩu do gia sư cung cấp.</p>
              <label htmlFor="hw-start-password" className={`mt-3 ${PORTAL_LABEL}`}>
                Mật khẩu bài tập
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="hw-start-password"
                  type={showPassword ? "text" : "password"}
                  required
                  autoFocus
                  autoComplete="off"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={PORTAL_INPUT}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-brand-orange hover:bg-brand-sand"
                >
                  <Icon name={showPassword ? "visibility_off" : "visibility"} className="text-[21px]" />
                </button>
              </div>
            </div>
          )}
          <div className={data.passwordProtected ? "border-t border-brand-sandLine pt-4" : ""}>
            <h3 className="text-[17px] font-bold text-brand-navy">Thời gian</h3>
            <p className="mt-1 text-[14.5px] leading-relaxed text-brand-ink">
              Hạn nộp: {formatDateTime(data.dueAt)}.{" "}
              {data.allowLateSubmission ? "Nộp sau hạn vẫn được nhận nhưng sẽ bị ghi là nộp trễ." : "Sau hạn không nộp được nữa."} Bạn có
              chắc muốn bắt đầu ngay?
            </p>
          </div>
          {start.error && <AuthNotice tone="error">{portalErrorMessage(start.error, "Chưa bắt đầu được. Vui lòng thử lại.")}</AuthNotice>}
          <div className="flex justify-end gap-2 border-t border-brand-sandLine pt-4">
            <button type="button" onClick={() => setStarting(false)} className={PORTAL_BTN_SECONDARY}>
              Hủy
            </button>
            <button type="submit" disabled={start.isPending} className={PORTAL_BTN_ACCENT}>
              {start.isPending ? "Đang mở…" : "Bắt đầu làm bài"}
            </button>
          </div>
        </form>
      </PortalDialog>
    </>
  );
}
