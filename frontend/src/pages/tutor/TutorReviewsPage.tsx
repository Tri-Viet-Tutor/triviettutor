import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { Icon } from "@/components/ui/Icon";
import { StarRating } from "@/components/ui/StarRating";
import { PORTAL_CARD } from "@/constants/classNames";
import { fetchRatingSummary, fetchTutorRatings } from "@/services/ratingService";
import { useAuthStore } from "@/stores/authStore";
import { displayCode } from "@/utils/classes";

type Filter = 0 | 1 | 2 | 3 | 4 | 5;

// Trang Đánh giá của gia sư (/tutor/reviews): điểm trung bình, phân bố số sao và từng nhận xét học viên gửi,
// mới nhất lên trước, lọc được theo số sao và lớp học. Học viên được giữ ẩn danh.
// Dữ liệu: GET /tutors/{id}/ratings/summary và GET /tutors/{id}/ratings.
export function TutorReviewsPage() {
  const tutorId = useAuthStore((state) => state.user?.id);
  const ratings = useQuery({ queryKey: ["tutor-ratings", tutorId], queryFn: () => fetchTutorRatings(tutorId!), enabled: Boolean(tutorId) });
  const summary = useQuery({ queryKey: ["rating-summary", tutorId], queryFn: () => fetchRatingSummary(tutorId!), enabled: Boolean(tutorId) });
  const [filter, setFilter] = useState<Filter>(0);
  const [selectedClass, setSelectedClass] = useState<string>("ALL");

  const list = [...(ratings.data ?? [])].sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt));
  // Làm tròn điểm về số sao 1 - 5
  const starsOf = (value: number) => Math.min(5, Math.max(1, Math.round(Number(value))));
  const counts = [5, 4, 3, 2, 1].map((star) => ({ star, count: list.filter((item) => starsOf(item.rating) === star).length }));

  const classOptions = Array.from(
    new Map(
      list
        .filter((item) => item.classCode || item.classGroupId)
        .map((item) => {
          const key = item.classCode || String(item.classGroupId);
          const label = item.classCode
            ? `Lớp ${item.classCode}${item.subjectName ? ` - ${item.subjectName}` : ""}`
            : item.classGroupId
              ? `Lớp ${displayCode("class", item.classGroupId)}${item.subjectName ? ` - ${item.subjectName}` : ""}`
              : "Lớp khác";
          return [key, { key, label }];
        })
    ).values()
  );

  const shown = list.filter((item) => {
    const matchStar = !filter || starsOf(item.rating) === filter;
    const itemKey = item.classCode || (item.classGroupId ? String(item.classGroupId) : null);
    const matchClass = selectedClass === "ALL" || itemKey === selectedClass;
    return matchStar && matchClass;
  });

  const total = list.length;
  const average = summary.data?.averageRating != null ? Number(summary.data.averageRating) : null;
  const withComment = list.filter((item) => item.comment?.trim()).length;

  return (
    <div>
      <PortalPageHeader icon="reviews" title="Đánh giá của học viên" description="Học viên chấm sao và góp ý sau khi học với bạn. Tên học viên được giữ ẩn danh." />

      {ratings.isPending || summary.isPending ? (
        <PortalLoading label="Đang tải đánh giá" rows={3} />
      ) : ratings.isError ? (
        <PortalError message="Không tải được đánh giá." onRetry={() => void ratings.refetch()} />
      ) : total === 0 ? (
        <PortalEmpty icon="reviews" title="Bạn chưa có đánh giá nào." description="Khi học viên chấm sao cho bạn, đánh giá sẽ hiện ở đây." />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          {
            // Tổng quan
          }
          <section className={`p-5 lg:sticky lg:top-24 ${PORTAL_CARD}`}>
            <div className="flex items-center gap-4">
              <p className="text-[52px] font-extrabold leading-none tabular-nums text-brand-navy">
                {average != null ? average.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "–"}
              </p>
              <div>
                <StarRating value={average ?? 0} size={22} />
                <p className="mt-1 text-[13px] text-brand-muted">
                  {total} đánh giá - {withComment} nhận xét
                </p>
              </div>
            </div>
            <ul className="mt-5 space-y-2">
              {counts.map(({ star, count }) => (
                <li key={star}>
                  <button
                    type="button"
                    onClick={() => setFilter(filter === star ? 0 : (star as Filter))}
                    aria-pressed={filter === star}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1 text-[13px] transition-colors ${filter === star ? "bg-brand-tint" : "hover:bg-brand-sand/60"}`}
                  >
                    <span className="flex w-9 items-center gap-0.5 font-bold text-brand-ink">
                      {star}
                      <Icon name="star" className="text-[15px] text-amber-400 [font-variation-settings:'FILL'_1]" />
                    </span>
                    <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-brand-sand">
                      <span className="block h-full rounded-full bg-amber-400" style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
                    </span>
                    <span className="w-7 text-right font-semibold tabular-nums text-brand-muted">{count}</span>
                  </button>
                </li>
              ))}
            </ul>
            {filter > 0 && (
              <button type="button" onClick={() => setFilter(0)} className="mt-3 text-[13px] font-semibold text-brand-navy hover:text-brand-navyDeep">
                Xem tất cả đánh giá
              </button>
            )}
          </section>

          {
            // Danh sách nhận xét
          }
          <section>
            <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[14px] text-brand-muted">
                {filter || selectedClass !== "ALL"
                  ? `${shown.length} đánh giá phù hợp`
                  : `${total} đánh giá, mới nhất trước`}
              </p>
              {classOptions.length > 0 && (
                <div className="flex items-center gap-2">
                  <label htmlFor="filter-class" className="text-[13px] font-medium text-brand-muted">
                    Lớp:
                  </label>
                  <select
                    id="filter-class"
                    value={selectedClass}
                    onChange={(e) => setSelectedClass(e.target.value)}
                    className="rounded-xl border border-brand-sandLine bg-white px-2.5 py-1 text-[13px] font-medium text-brand-ink focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
                  >
                    <option value="ALL">Tất cả lớp ({total})</option>
                    {classOptions.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {shown.length === 0 ? (
              <p className={`px-5 py-8 text-center text-[14px] text-brand-muted ${PORTAL_CARD}`}>Không có đánh giá nào phù hợp với bộ lọc.</p>
            ) : (
              <ul className="space-y-3">
                {shown.map((item) => {
                  const classLabel = item.classCode || (item.classGroupId ? displayCode("class", item.classGroupId) : null);
                  return (
                    <li key={item.id} className={`p-4 ${PORTAL_CARD}`}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-2.5">
                          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-tint text-brand-navy">
                            <Icon name="person" className="text-[20px]" />
                          </span>
                          <span>
                            <span className="block text-[14px] font-bold text-brand-ink">Học viên</span>
                            <StarRating value={Number(item.rating)} />
                          </span>
                        </span>
                        <span className="text-[12.5px] text-brand-muted">
                          {new Date(item.updatedAt ?? item.createdAt).toLocaleDateString("vi-VN")}
                          {item.updatedAt && item.updatedAt !== item.createdAt ? " (đã sửa)" : ""}
                        </span>
                      </div>

                      {/* Thông tin lớp học và môn học */}
                      {(classLabel || item.subjectName) && (
                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          {classLabel && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-tint px-2.5 py-1 text-[12px] font-semibold text-brand-navy">
                              <Icon name="menu_book" className="text-[14px]" />
                              Lớp: {classLabel}
                            </span>
                          )}
                          {item.subjectName && (
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-sand px-2.5 py-1 text-[12px] font-medium text-brand-ink">
                              <Icon name="school" className="text-[14px]" />
                              {item.subjectName}
                            </span>
                          )}
                        </div>
                      )}

                      {item.comment?.trim() ? (
                        <p className="mt-3 rounded-xl bg-brand-sand/50 px-3.5 py-2.5 text-[14px] leading-relaxed text-brand-ink">“{item.comment}”</p>
                      ) : (
                        <p className="mt-2 text-[13px] italic text-brand-muted">Không có nhận xét.</p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
