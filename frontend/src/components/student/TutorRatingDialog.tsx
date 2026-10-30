import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";
import { PortalDialog } from "@/components/dashboard/PortalDialog";
import { Icon } from "@/components/ui/Icon";
import { AUTH_ERROR, PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY, PORTAL_INPUT, PORTAL_LABEL } from "@/constants/classNames";
import { learningKeys, useMyTutorRating, useTutorRatingSummary } from "@/hooks/useLearningData";
import { useUserId } from "@/hooks/usePortalData";
import type { TutorRatingBadgeProps, TutorRatingDialogProps, TutorRatingRequest } from "@/interfaces/learning";
import { createTutorRating, updateTutorRating } from "@/services/learningService";
import { portalErrorMessage } from "@/utils/errors";
import { displayCode } from "@/utils/classes";

/** Độ dài tối đa của nhận xét */
const MAX_COMMENT = 2000;

/** Tên gia sư (chưa tải được thì "Gia sư #mã") kèm điểm trung bình "★ 4.5 (3 đánh giá)" nếu đã có đánh giá. */
export function TutorRatingBadge({ tutorId }: TutorRatingBadgeProps) {
  const summary = useTutorRatingSummary(tutorId);
  const data = summary.data;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 text-[14px] text-brand-ink">
      <span className="font-semibold">{data?.tutorName || `Gia sư ${displayCode("tutor", tutorId)}`}</span>
      {data && data.totalRatings > 0 && (
        <span className="inline-flex items-center gap-1 text-[13px] font-semibold">
          <Icon name="star" className="text-[17px] text-brand-orange" />
          {Number(data.averageRating).toFixed(1)}
          <span className="font-normal text-brand-muted">({data.totalRatings} đánh giá)</span>
        </span>
      )}
    </span>
  );
}

/**
 * Hộp thoại "Đánh giá gia sư": chọn 1–5 sao và viết nhận xét.
 * Đã đánh giá trước đó thì điền sẵn và lưu bằng PUT /ratings/{id}; chưa thì tạo mới bằng POST /tutors/{id}/ratings.
 */
export function TutorRatingDialog({ tutorId, onClose }: TutorRatingDialogProps) {
  const userId = useUserId();
  const queryClient = useQueryClient();
  const mine = useMyTutorRating(tutorId);
  const summary = useTutorRatingSummary(tutorId);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const existing = mine.data ?? null;

  // Mở hộp thoại hoặc tải xong đánh giá cũ thì điền lại form
  useEffect(() => {
    setError(null);
    setStars(existing ? Math.round(Number(existing.rating)) : 0);
    setComment(existing?.comment ?? "");
  }, [tutorId, existing]);

  const save = useMutation({
    mutationFn: (request: TutorRatingRequest) =>
      existing ? updateTutorRating(existing.id, request) : createTutorRating(tutorId as number, request),
    onSuccess: (saved) => {
      queryClient.setQueryData(learningKeys.myRating(userId, saved.tutorId), saved);
      void queryClient.invalidateQueries({ queryKey: learningKeys.ratingSummary(saved.tutorId) });
      onClose();
    },
    onError: (err) => setError(portalErrorMessage(err, "Chưa lưu được đánh giá. Vui lòng thử lại.")),
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (stars < 1) return setError("Hãy chọn số sao.");
    setError(null);
    save.mutate({ rating: stars, ...(comment.trim() ? { comment: comment.trim() } : {}) });
  }

  return (
    <PortalDialog
      open={tutorId !== null}
      onClose={onClose}
      title={summary.data?.tutorName ? `Đánh giá gia sư ${summary.data.tutorName}` : "Đánh giá gia sư"}
      description={existing ? "Bạn đã đánh giá gia sư này; có thể sửa lại bất cứ lúc nào." : "Chia sẻ cảm nhận của bạn về gia sư."}
      widthClassName="max-w-[480px]"
    >
      {mine.isPending ? (
        <p className="text-[14.5px] text-brand-muted">Đang tải…</p>
      ) : mine.isError ? (
        <p className="text-[14.5px] text-brand-muted">{portalErrorMessage(mine.error, "Không tải được đánh giá của bạn.")}</p>
      ) : (
        <form noValidate onSubmit={handleSubmit} className="space-y-4">
          <div>
            <span id="rating-stars" className={PORTAL_LABEL}>
              Mức độ hài lòng
            </span>
            <div role="radiogroup" aria-labelledby="rating-stars" className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={stars === value}
                  aria-label={`${value} sao`}
                  onClick={() => setStars(value)}
                  className="rounded-lg p-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-navy"
                >
                  <Icon
                    name="star"
                    className={`text-[32px] ${value <= stars ? "text-brand-orange [font-variation-settings:'FILL'_1]" : "text-slate-300"}`}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="rating-comment" className={PORTAL_LABEL}>
              Nhận xét (không bắt buộc)
            </label>
            <textarea
              id="rating-comment"
              rows={4}
              maxLength={MAX_COMMENT}
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              className={`${PORTAL_INPUT} h-auto py-2`}
            />
            <p className="mt-1 text-right text-[12.5px] tabular-nums text-brand-muted">
              {comment.length}/{MAX_COMMENT}
            </p>
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
              {save.isPending ? "Đang lưu…" : existing ? "Lưu thay đổi" : "Gửi đánh giá"}
            </button>
          </div>
        </form>
      )}
    </PortalDialog>
  );
}
