import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";
import { PortalDialog } from "@/components/dashboard/PortalDialog";
import { Icon } from "@/components/ui/Icon";
import { AUTH_ERROR, PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY, PORTAL_INPUT, PORTAL_LABEL } from "@/constants/classNames";
import { learningKeys } from "@/hooks/useLearningData";
import { useUserId } from "@/hooks/usePortalData";
import type { HomeworkFormDialogProps, HomeworkRequest } from "@/interfaces/learning";
import { createHomework, updateHomework } from "@/services/learningService";
import { addDays, toDateTimeLocal } from "@/utils/date";
import { portalErrorMessage } from "@/utils/errors";
import { isValidScore, parseScore } from "@/utils/text";

/** Giá trị đang nhập trong form */
interface HomeworkDraft {
  title: string;
  instructions: string;
  resourceUrl: string;
  dueAt: string;
  maxScore: string;
}

/**
 * Hộp thoại giao bài tập mới (bản nháp) hoặc sửa bài đã có.
 * Bài đã công bố chỉ được lùi hạn nộp hoặc tăng điểm tối đa — các ô còn lại bị khóa và gửi lại nguyên giá trị cũ.
 */
export function HomeworkFormDialog({ open, sessionId, homework, onClose }: HomeworkFormDialogProps) {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<HomeworkDraft>({ title: "", instructions: "", resourceUrl: "", dueAt: "", maxScore: "10" });
  const [error, setError] = useState<string | null>(null);
  const published = homework?.status === "PUBLISHED";

  // Mỗi lần mở thì điền lại form theo bài đang sửa (hoặc để trống, hạn nộp mặc định 7 ngày sau)
  useEffect(() => {
    if (!open) return;
    setError(null);
    setDraft(
      homework
        ? {
            title: homework.title,
            instructions: homework.instructions,
            resourceUrl: homework.resourceUrl ?? "",
            dueAt: toDateTimeLocal(new Date(homework.dueAt)),
            maxScore: String(homework.maxScore),
          }
        : { title: "", instructions: "", resourceUrl: "", dueAt: toDateTimeLocal(addDays(new Date(), 7)), maxScore: "10" },
    );
  }, [open, homework]);

  const save = useMutation({
    mutationFn: (request: HomeworkRequest) =>
      homework ? updateHomework(homework.id, { ...request, version: homework.version }) : createHomework(sessionId, request),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: learningKeys.all(userId) });
      onClose();
    },
    onError: (err) => setError(portalErrorMessage(err, "Chưa lưu được bài tập. Vui lòng thử lại.")),
  });

  /** Sửa một ô trong form */
  function set<K extends keyof HomeworkDraft>(key: K, value: HomeworkDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Ô datetime-local bỏ mất giây: không đổi hạn nộp thì giữ nguyên giá trị cũ để bài đã công bố không bị coi là rút hạn
    const unchangedDue = homework !== null && draft.dueAt === toDateTimeLocal(new Date(homework.dueAt));
    const due = unchangedDue ? new Date(homework.dueAt) : new Date(draft.dueAt);
    const maxScore = parseScore(draft.maxScore);
    if (!draft.title.trim() || !draft.instructions.trim()) return setError("Hãy nhập tiêu đề và nội dung bài tập.");
    if (Number.isNaN(due.getTime()) || due.getTime() <= Date.now()) return setError("Hạn nộp phải ở tương lai.");
    if (!isValidScore(draft.maxScore) || !(maxScore > 0)) {
      return setError("Điểm tối đa phải lớn hơn 0, tối đa 2 chữ số thập phân.");
    }
    if (homework && published) {
      if (due.getTime() < new Date(homework.dueAt).getTime()) return setError("Bài đã công bố chỉ được lùi hạn nộp, không được rút ngắn.");
      if (maxScore < homework.maxScore) return setError("Bài đã công bố không được giảm điểm tối đa.");
    }
    setError(null);
    save.mutate({
      title: draft.title.trim(),
      instructions: draft.instructions.trim(),
      ...(draft.resourceUrl.trim() ? { resourceUrl: draft.resourceUrl.trim() } : {}),
      dueAt: unchangedDue ? homework.dueAt : due.toISOString(),
      maxScore,
    });
  }

  return (
    <PortalDialog
      open={open}
      onClose={onClose}
      title={homework ? "Sửa bài tập" : "Giao bài tập"}
      description={
        published
          ? "Bài đã công bố: chỉ lùi được hạn nộp hoặc tăng điểm tối đa."
          : homework
            ? "Bài đang là bản nháp, học viên chưa thấy."
            : "Bài mới được lưu ở dạng nháp; bấm Công bố để học viên thấy."
      }
    >
      <form noValidate onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="homework-title" className={PORTAL_LABEL}>
            Tiêu đề
          </label>
          <input
            id="homework-title"
            maxLength={200}
            value={draft.title}
            disabled={published}
            onChange={(event) => set("title", event.target.value)}
            className={PORTAL_INPUT}
          />
        </div>
        <div>
          <label htmlFor="homework-instructions" className={PORTAL_LABEL}>
            Nội dung, yêu cầu
          </label>
          <textarea
            id="homework-instructions"
            rows={5}
            maxLength={20000}
            value={draft.instructions}
            disabled={published}
            onChange={(event) => set("instructions", event.target.value)}
            className={`${PORTAL_INPUT} h-auto py-2`}
          />
        </div>
        <div>
          <label htmlFor="homework-resource" className={PORTAL_LABEL}>
            Link tài liệu (không bắt buộc, https)
          </label>
          <input
            id="homework-resource"
            type="url"
            maxLength={2048}
            placeholder="https://…"
            value={draft.resourceUrl}
            disabled={published}
            onChange={(event) => set("resourceUrl", event.target.value)}
            className={PORTAL_INPUT}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="homework-due" className={PORTAL_LABEL}>
              Hạn nộp
            </label>
            <input
              id="homework-due"
              type="datetime-local"
              value={draft.dueAt}
              onChange={(event) => set("dueAt", event.target.value)}
              className={PORTAL_INPUT}
            />
          </div>
          <div>
            <label htmlFor="homework-max" className={PORTAL_LABEL}>
              Điểm tối đa
            </label>
            <input
              id="homework-max"
              type="number"
              min={0.01}
              step={0.01}
              value={draft.maxScore}
              onChange={(event) => set("maxScore", event.target.value)}
              className={PORTAL_INPUT}
            />
          </div>
        </div>
        {error && (
          <p role="alert" className={`${AUTH_ERROR} flex items-center gap-1.5`}>
            <Icon name="error" className="text-[17px]" />
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className={PORTAL_BTN_SECONDARY}>
            Hủy
          </button>
          <button type="submit" disabled={save.isPending} className={PORTAL_BTN_PRIMARY}>
            {save.isPending ? "Đang lưu…" : homework ? "Lưu thay đổi" : "Lưu bản nháp"}
          </button>
        </div>
      </form>
    </PortalDialog>
  );
}
