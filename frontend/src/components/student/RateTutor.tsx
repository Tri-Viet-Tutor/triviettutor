import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";
import { PortalDialog } from "@/components/dashboard/PortalDialog";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY, PORTAL_INPUT } from "@/constants/classNames";
import { subjectLabel } from "@/constants/management";
import type { StudentTutor } from "@/interfaces/dto";
import { createRating, deleteRating, fetchMyRating, fetchRatingSummary, updateRating } from "@/services/ratingService";
import { displayCode } from "@/utils/classes";
import { portalErrorMessage } from "@/utils/errors";

const STAR_HINT = ["", "Chưa hài lòng", "Tạm được", "Bình thường", "Tốt", "Rất tốt"];

// Chọn số sao 1-5; rê chuột xem trước
// Tên gia sư kèm điểm trung bình "★ 4.5 (3 đánh giá)" nếu đã có đánh giá
export function TutorRatingBadge({ tutorId }: { tutorId: number }) {
  const summary = useQuery({ queryKey: ["rating-summary", tutorId], queryFn: () => fetchRatingSummary(tutorId), retry: false });
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

function StarPicker({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex" role="radiogroup" aria-label="Số sao" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            role="radio"
            aria-checked={value === star}
            aria-label={`${star} sao`}
            onMouseEnter={() => setHover(star)}
            onClick={() => onChange(star)}
            className="p-1 transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-navy"
          >
            <Icon name="star" className={`text-[40px] [font-variation-settings:'FILL'_1] ${star <= shown ? "text-amber-400" : "text-slate-200"}`} />
          </button>
        ))}
      </div>
      <span className="h-5 text-[14px] font-semibold text-brand-ink">{STAR_HINT[shown]}</span>
    </div>
  );
}

// Khung bật lên để chấm sao gia sư: 1-5 sao, nhận xét không bắt buộc.
// Chưa đánh giá thì gửi mới (POST /tutors/{id}/ratings); đã có thì sửa (PUT /ratings/{id}) hoặc xóa.
export function RateTutorDialog({
  tutor,
  classGroupId,
  onClose,
}: {
  tutor: StudentTutor | null;
  // Lớp được đánh giá; bỏ trống mà gia sư chỉ dạy tôi một lớp thì lấy lớp đó
  classGroupId?: number | null;
  onClose: () => void;
}) {
  const cache = useQueryClient();
  const tutorId = tutor?.id ?? 0;
  const classId = classGroupId ?? (tutor?.classes.length === 1 ? tutor.classes[0].id : undefined);
  const mine = useQuery({
    queryKey: ["my-rating", tutorId, classId ?? "all"],
    queryFn: () => fetchMyRating(tutorId, classId),
    retry: false,
    enabled: tutor !== null,
  });
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [done, setDone] = useState("");

  // Mở khung: điền sẵn đánh giá cũ (nếu có)
  useEffect(() => {
    if (!tutor) return;
    setDone("");
    setStars(mine.data ? Math.round(Number(mine.data.rating)) : 0);
    setComment(mine.data?.comment ?? "");
  }, [tutor, mine.data]);

  // Tải lại đánh giá của tôi, điểm trung bình và thông tin lớp sau khi lưu
  const refresh = () => {
    void cache.invalidateQueries({ queryKey: ["my-rating", tutorId] });
    void cache.invalidateQueries({ queryKey: ["rating-summary", tutorId] });
    void cache.invalidateQueries({ queryKey: ["catalog-class"] });
  };
  const save = useMutation({
    mutationFn: () => {
      const input = { rating: stars, ...(comment.trim() ? { comment: comment.trim() } : {}) };
      return mine.data ? updateRating(mine.data.id, input) : createRating(tutorId, { ...input, ...(classId ? { classGroupId: classId } : {}) });
    },
    onSuccess: () => {
      setDone(mine.data ? "Đã cập nhật đánh giá." : "Cảm ơn bạn đã đánh giá!");
      refresh();
    },
  });
  const remove = useMutation({
    mutationFn: () => deleteRating(mine.data!.id),
    onSuccess: () => {
      refresh();
      onClose();
    },
  });

  // Gửi đánh giá khi đã chọn số sao
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (stars > 0) save.mutate();
  }
  // Đóng khung đánh giá và xóa trạng thái gửi
  function close() {
    save.reset();
    remove.reset();
    onClose();
  }

  const subjects = tutor ? [...new Set(tutor.classes.map((item) => item.subject))] : [];

  return (
    <PortalDialog open={tutor !== null} onClose={close} title={mine.data ? "Sửa đánh giá" : "Đánh giá gia sư"} widthClassName="max-w-[480px]">
      {tutor && (
        <div className="text-center">
          <div className="flex flex-col items-center">
            <UserAvatar userId={tutor.id} name={tutor.name} size={68} />
            <p className="mt-2 text-[18px] font-extrabold text-brand-ink">{tutor.name}</p>
            <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">
              {subjects.map((subject) => (
                <span key={subject} className="rounded-full bg-brand-tint px-2.5 py-0.5 text-[12px] font-bold text-brand-navy">
                  {subjectLabel(subject)}
                </span>
              ))}
            </div>
          </div>

          {done ? (
            <div className="mt-6 flex flex-col items-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Icon name="favorite" className="text-[30px] [font-variation-settings:'FILL'_1]" />
              </span>
              <p className="text-[16px] font-bold text-brand-ink">{done}</p>
              <button type="button" onClick={close} className={PORTAL_BTN_PRIMARY}>
                Đóng
              </button>
            </div>
          ) : mine.isPending ? (
            <p className="mt-6 text-[14px] text-brand-muted">Đang tải…</p>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-4 text-left">
              <p className="text-center text-[14.5px] font-semibold text-brand-muted">Bạn thấy thầy cô dạy thế nào?</p>
              <StarPicker value={stars} onChange={setStars} />
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                maxLength={2000}
                rows={3}
                placeholder="Nhận xét thêm (không bắt buộc): cách giảng bài, sự nhiệt tình, điều muốn thầy cô cải thiện…"
                className={`${PORTAL_INPUT} h-auto py-2 leading-relaxed`}
              />
              {(save.error || remove.error) && (
                <p className="text-[13px] text-red-700">{portalErrorMessage(save.error ?? remove.error, "Chưa gửi được đánh giá. Vui lòng thử lại.")}</p>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                {mine.data ? (
                  <button
                    type="button"
                    onClick={() => remove.mutate()}
                    disabled={remove.isPending}
                    className={`${PORTAL_BTN_SECONDARY} text-red-700 hover:border-red-300 hover:bg-red-50`}
                  >
                    <Icon name="delete" className="text-[17px]" />
                    Xóa đánh giá
                  </button>
                ) : (
                  <span />
                )}
                <button type="submit" disabled={stars === 0 || save.isPending} className={PORTAL_BTN_PRIMARY}>
                  <Icon name="send" className="text-[17px]" />
                  {save.isPending ? "Đang gửi…" : mine.data ? "Lưu đánh giá" : "Gửi đánh giá"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </PortalDialog>
  );
}
