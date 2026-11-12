import { useQueries, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { Icon } from "@/components/ui/Icon";
import { StarRating } from "@/components/ui/StarRating";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { PORTAL_CARD } from "@/constants/classNames";
import { useUserDirectory } from "@/hooks/useAdminData";
import { fetchRatingSummary, fetchTutorRatings } from "@/services/ratingService";
import { displayCode } from "@/utils/classes";
import { normalizeText } from "@/utils/text";
import { Select } from "@/components/ui/Select";

type Sort = "BEST" | "WORST" | "MOST";

const one = (value: number) => value.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const starsOf = (value: number) => Math.min(5, Math.max(1, Math.round(Number(value))));

/**
 * Trang Đánh giá gia sư của quản trị (/admin/reviews): bảng xếp hạng mọi gia sư theo điểm trung bình / số lượt,
 * bấm một gia sư để xem phân bố sao và từng nhận xét (kèm tên học viên). Gia sư đang chọn nằm ở ?gs=<id>.
 * Dữ liệu: GET /admin/users (gia sư), GET /tutors/{id}/ratings/summary và /tutors/{id}/ratings.
 */
export function AdminReviewsPage() {
  const [params, setParams] = useSearchParams();
  const { tutors, nameOf } = useUserDirectory();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<Sort>("BEST");
  const summaries = useQueries({
    queries: tutors.map((tutor) => ({ queryKey: ["rating-summary", tutor.id], queryFn: () => fetchRatingSummary(tutor.id), retry: false })),
  });
  const selectedId = Number(params.get("gs")) || null;
  const detail = useQuery({
    queryKey: ["tutor-ratings", selectedId],
    queryFn: () => fetchTutorRatings(selectedId!),
    enabled: selectedId !== null,
  });

  const rows = tutors.map((tutor, index) => {
    const data = summaries[index]?.data;
    return { id: tutor.id, name: tutor.fullName, email: tutor.email, average: data?.averageRating != null ? Number(data.averageRating) : null, total: data?.totalRatings ?? 0 };
  });
  const keyword = normalizeText(search);
  const visible = rows
    .filter((row) => !keyword || normalizeText(`${row.name} ${row.email}`).includes(keyword))
    .sort((a, b) =>
      sort === "MOST"
        ? b.total - a.total
        : sort === "WORST"
          ? (a.average ?? 9) - (b.average ?? 9) || b.total - a.total
          : (b.average ?? -1) - (a.average ?? -1) || b.total - a.total,
    );
  const rated = rows.filter((row) => row.total > 0);
  const totalReviews = rated.reduce((sum, row) => sum + row.total, 0);
  const overall = totalReviews ? rated.reduce((sum, row) => sum + (row.average ?? 0) * row.total, 0) / totalReviews : null;
  const low = rated.filter((row) => (row.average ?? 5) < 3.5).length;
  const loading = summaries.some((query) => query.isPending);
  const selected = rows.find((row) => row.id === selectedId) ?? null;

  return (
    <div>
      <PortalPageHeader icon="reviews" title="Đánh giá gia sư" description="Học viên chấm sao cho thầy cô. Theo dõi chất lượng giảng dạy và đọc từng nhận xét." />

      {/* Chỉ số chung */}
      <dl className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { icon: "star", label: "Điểm trung bình chung", value: overall != null ? one(overall) : "–" },
          { icon: "rate_review", label: "Tổng lượt đánh giá", value: String(totalReviews) },
          { icon: "badge", label: "Gia sư đã được đánh giá", value: `${rated.length}/${rows.length}` },
          { icon: "trending_down", label: "Gia sư dưới 3,5 sao", value: String(low), warn: low > 0 },
        ].map((stat) => (
          <div key={stat.label} className={`flex items-center gap-3 p-4 ${PORTAL_CARD}`}>
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${stat.warn ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"}`}>
              <Icon name={stat.icon} className="text-[22px] [font-variation-settings:'FILL'_1]" />
            </span>
            <div className="min-w-0">
              <dt className="truncate text-[12.5px] font-semibold text-brand-muted">{stat.label}</dt>
              <dd className={`text-[22px] font-extrabold leading-tight tabular-nums ${stat.warn ? "text-red-700" : "text-brand-ink"}`}>{stat.value}</dd>
            </div>
          </div>
        ))}
      </dl>

      {tutors.length === 0 && !loading ? (
        <PortalEmpty icon="badge" title="Chưa có gia sư nào." />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Bảng xếp hạng gia sư */}
          <section className={`overflow-hidden ${PORTAL_CARD}`}>
            <div className="flex flex-wrap items-center gap-2 border-b border-brand-sandLine p-3.5">
              <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-xl bg-brand-sand/70 px-3 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-navy/30">
                <Icon name="search" className="text-[20px] text-brand-muted" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm gia sư"
                  aria-label="Tìm gia sư"
                  className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] outline-none focus:ring-0"
                />
              </label>
              <Select
                value={sort}
                onChange={(event) => setSort(event.target.value as Sort)}
                aria-label="Sắp xếp"
                className="h-10 rounded-xl border border-brand-sandLine bg-white pl-3 pr-8 text-[13.5px] font-semibold outline-none focus:border-brand-navy"
              >
                <option value="BEST">Điểm cao nhất</option>
                <option value="WORST">Điểm thấp nhất</option>
                <option value="MOST">Nhiều đánh giá nhất</option>
              </Select>
            </div>
            {loading ? (
              <div className="p-4">
                <PortalLoading label="Đang tải đánh giá" rows={4} />
              </div>
            ) : (
              <ul className="max-h-[620px] divide-y divide-brand-sandLine overflow-y-auto">
                {visible.map((row, index) => {
                  const active = row.id === selectedId;
                  return (
                    <li key={row.id}>
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => setParams({ gs: String(row.id) })}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${active ? "bg-brand-tint" : "hover:bg-brand-sand/40"}`}
                      >
                        <span className="w-6 shrink-0 text-center text-[13px] font-bold tabular-nums text-brand-muted">{index + 1}</span>
                        <UserAvatar userId={row.id} name={row.name} size={36} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[14.5px] font-bold text-brand-ink">{row.name}</span>
                          <span className="block text-[12px] text-brand-muted">{displayCode("tutor", row.id)}</span>
                        </span>
                        {row.total > 0 ? (
                          <span className="shrink-0 text-right">
                            <span className="flex items-center justify-end gap-1.5">
                              <StarRating value={row.average ?? 0} />
                              <strong className={`text-[14px] tabular-nums ${(row.average ?? 5) < 3.5 ? "text-red-700" : "text-brand-ink"}`}>{one(row.average ?? 0)}</strong>
                            </span>
                            <span className="block text-[12px] text-brand-muted">{row.total} đánh giá</span>
                          </span>
                        ) : (
                          <span className="shrink-0 text-[12.5px] text-brand-muted">Chưa có đánh giá</span>
                        )}
                        <Icon name="chevron_right" className="shrink-0 text-[20px] text-brand-muted" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Chi tiết một gia sư */}
          <section className="lg:sticky lg:top-24">
            {!selected ? (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-brand-navy/25 bg-white/60 px-6 py-16 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
                  <Icon name="reviews" className="text-[30px]" />
                </span>
                <p className="mt-3 text-[16px] font-extrabold text-brand-navy">Chọn một gia sư để xem nhận xét.</p>
              </div>
            ) : (
              <div className={`p-5 ${PORTAL_CARD}`}>
                <div className="flex items-center gap-3.5">
                  <UserAvatar userId={selected.id} name={selected.name} size={52} />
                  <div className="min-w-0">
                    <p className="truncate text-[18px] font-extrabold text-brand-ink">{selected.name}</p>
                    <p className="text-[13px] text-brand-muted">{selected.email}</p>
                  </div>
                </div>
                {detail.isPending ? (
                  <p className="mt-5 text-[14px] text-brand-muted">Đang tải nhận xét…</p>
                ) : detail.isError ? (
                  <div className="mt-5">
                    <PortalError message="Không tải được nhận xét." onRetry={() => void detail.refetch()} />
                  </div>
                ) : (detail.data ?? []).length === 0 ? (
                  <p className="mt-5 rounded-xl bg-brand-sand/50 px-4 py-6 text-center text-[14px] text-brand-muted">Gia sư này chưa có đánh giá nào.</p>
                ) : (
                  <>
                    <div className="mt-5 flex items-center gap-5 rounded-2xl bg-brand-sand/50 p-4">
                      <div className="text-center">
                        <p className="text-[40px] font-extrabold leading-none tabular-nums text-brand-navy">{one(selected.average ?? 0)}</p>
                        <StarRating value={selected.average ?? 0} />
                        <p className="mt-1 text-[12px] text-brand-muted">{selected.total} đánh giá</p>
                      </div>
                      <ul className="flex-1 space-y-1.5">
                        {[5, 4, 3, 2, 1].map((star) => {
                          const count = (detail.data ?? []).filter((item) => starsOf(item.rating) === star).length;
                          const total = detail.data?.length ?? 0;
                          return (
                            <li key={star} className="flex items-center gap-2 text-[12.5px]">
                              <span className="w-6 font-bold text-brand-ink">{star}★</span>
                              <span className="h-2 flex-1 overflow-hidden rounded-full bg-white">
                                <span className="block h-full rounded-full bg-amber-400" style={{ width: `${total ? (count / total) * 100 : 0}%` }} />
                              </span>
                              <span className="w-5 text-right tabular-nums text-brand-muted">{count}</span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <ul className="mt-4 max-h-[420px] space-y-2.5 overflow-y-auto pr-1">
                      {[...(detail.data ?? [])]
                        .sort((a, b) => (b.updatedAt ?? b.createdAt).localeCompare(a.updatedAt ?? a.createdAt))
                        .map((item) => (
                          <li key={item.id} className="rounded-xl border border-brand-sandLine px-3.5 py-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="flex items-center gap-2">
                                <UserAvatar userId={item.studentId} name={nameOf(item.studentId) ?? "Học viên"} size={26} />
                                <span className="text-[13.5px] font-bold text-brand-ink">{nameOf(item.studentId) ?? `Học viên ${displayCode("student", item.studentId)}`}</span>
                                <StarRating value={Number(item.rating)} />
                              </span>
                              <span className="text-[12px] text-brand-muted">{new Date(item.updatedAt ?? item.createdAt).toLocaleDateString("vi-VN")}</span>
                            </div>
                            {/* Thông tin lớp học và môn học */}
                            {((item.classCode || item.classGroupId) || item.subjectName) && (
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                {(item.classCode || item.classGroupId) && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-brand-tint px-2 py-0.5 text-[11.5px] font-semibold text-brand-navy">
                                    <Icon name="menu_book" className="text-[13px]" />
                                    Lớp: {item.classCode || (item.classGroupId ? displayCode("class", item.classGroupId) : "")}
                                  </span>
                                )}
                                {item.subjectName && (
                                  <span className="inline-flex items-center gap-1 rounded-md bg-brand-sand px-2 py-0.5 text-[11.5px] font-medium text-brand-ink">
                                    <Icon name="school" className="text-[13px]" />
                                    {item.subjectName}
                                  </span>
                                )}
                              </div>
                            )}
                            {item.comment?.trim() ? (
                              <p className="mt-2 text-[13.5px] leading-relaxed text-brand-ink">“{item.comment}”</p>
                            ) : (
                              <p className="mt-1.5 text-[12.5px] italic text-brand-muted">Không có nhận xét.</p>
                            )}
                          </li>
                        ))}
                    </ul>
                  </>
                )}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
