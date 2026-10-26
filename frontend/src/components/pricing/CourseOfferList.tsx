import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ClassTicket } from "@/components/pricing/ClassTicket";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING } from "@/constants/classNames";
import { DELIVERY_MODE_OPTIONS, GRADE_OPTIONS, SCHEDULE_PATTERN_OPTIONS } from "@/constants/classOptions";
import { SUBJECT_OPTIONS, gradeLabel, subjectIcon, subjectLabel } from "@/constants/management";
import type { CourseResponse, TuitionClass } from "@/interfaces/api";
import type { CourseOfferListProps } from "@/interfaces/pricing";
import { listCatalogCourses } from "@/services/tuitionPaymentService";
import { useAuthStore } from "@/stores/authStore";
import { formatVnd } from "@/utils/currency";
import { formatDayMonth, parseIsoDate } from "@/utils/date";
import { normalizeText } from "@/utils/text";

/** Số khóa hiện mỗi lần; còn nữa thì có nút "Xem thêm" */
const PAGE_SIZE = 8;
/** Backend cho tối đa 100 khóa mỗi trang */
const CATALOG_LIMIT = 100;
/** Còn từ bấy nhiêu chỗ trở xuống thì báo "Sắp hết chỗ" */
const FEW_SPOTS = 3;

/** Màu nhấn theo môn, xoay vòng theo thứ tự môn trong SUBJECT_OPTIONS */
const SUBJECT_TONES = [
  { tile: "bg-brand-navy text-white", band: "from-[#E3ECFB]", eyebrow: "text-brand-navy" },
  { tile: "bg-[#F5A00F] text-brand-navyDeep", band: "from-[#FFF1D6]", eyebrow: "text-[#B36F00]" },
  { tile: "bg-[#2E8B6E] text-white", band: "from-[#DDF2EA]", eyebrow: "text-[#1F6B53]" },
  { tile: "bg-[#C2552D] text-white", band: "from-[#FBE4D9]", eyebrow: "text-[#9A3F1E]" },
  { tile: "bg-[#6A55B8] text-white", band: "from-[#ECE7FA]", eyebrow: "text-[#54429A]" },
];

/** Khóa nhận diện một khóa học từ dữ liệu lớp (lớp không trả courseId) */
const courseKey = (name: string, subject: string, grade: string) => `${subject}|${grade}|${name}`;

const labelOf = <T extends string>(options: { value: T; label: string }[], value: T) =>
  options.find((option) => option.value === value)?.label ?? value;

function toneOf(subject: string) {
  const index = SUBJECT_OPTIONS.findIndex((option) => option.value === subject);
  return SUBJECT_TONES[(index === -1 ? SUBJECT_OPTIONS.length : index) % SUBJECT_TONES.length];
}

/** Xếp theo thứ tự môn rồi theo khối */
function sortCourses(courses: CourseResponse[]): CourseResponse[] {
  const subjects = SUBJECT_OPTIONS.map((option) => option.value);
  const grades = GRADE_OPTIONS.map((option) => option.value as string);
  const rank = (list: string[], value: string) => (list.includes(value) ? list.indexOf(value) : list.length);
  return [...courses].sort(
    (first, second) =>
      rank(subjects, first.subject) - rank(subjects, second.subject) ||
      rank(grades, first.gradeLevel) - rank(grades, second.gradeLevel) ||
      first.name.localeCompare(second.name),
  );
}

/** Tóm tắt các lớp đang mở của một khóa để hiện trên thẻ */
function summarize(classes: TuitionClass[]) {
  if (classes.length === 0) return null;
  const minFee = Math.min(...classes.map((item) => item.estimatedFee));
  const maxDiscount = Math.max(...classes.map((item) => item.discountRate));
  const spots = classes.reduce((sum, item) => sum + Math.max(item.spotsLeft, 0), 0);
  const earliest = [...classes].sort((first, second) => first.startDate.localeCompare(second.startDate))[0];
  const modes = [...new Set(classes.map((item) => item.deliveryMode))].map((mode) => labelOf(DELIVERY_MODE_OPTIONS, mode));
  const patterns = [...new Set(classes.map((item) => item.schedulePattern))].map((pattern) => labelOf(SCHEDULE_PATTERN_OPTIONS, pattern));
  const slots = [...new Set(classes.map((item) => item.timeSlotLabel))];
  return { minFee, maxDiscount, spots, earliest, modes, patterns, slots };
}

/** Khung xương lúc đang tải */
function OfferSkeleton() {
  return (
    <ul className="mt-4 space-y-4" aria-hidden="true">
      {[0, 1, 2].map((key) => (
        <li key={key} className="animate-pulse overflow-hidden rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex gap-4">
            <div className="h-14 w-14 rounded-2xl bg-slate-200" />
            <div className="flex-1 space-y-2.5">
              <div className="h-3 w-32 rounded bg-slate-200" />
              <div className="h-5 w-2/3 rounded bg-slate-200" />
              <div className="h-3 w-full rounded bg-slate-100" />
              <div className="flex gap-2 pt-1">
                <div className="h-7 w-20 rounded-lg bg-slate-100" />
                <div className="h-7 w-24 rounded-lg bg-slate-100" />
                <div className="h-7 w-28 rounded-lg bg-slate-100" />
              </div>
            </div>
            <div className="hidden w-[200px] rounded-xl bg-slate-100 sm:block" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * Thẻ các khóa học admin đang bật bán (GET /catalog/courses) trong khu học viên.
 * Admin bật / tắt bán khóa là thẻ của khóa đó hiện / ẩn. Mỗi thẻ tóm tắt các lớp đang mở của khóa
 * (học phí thấp nhất, ưu đãi, khai giảng sớm nhất, lịch, hình thức, số chỗ còn);
 * bấm "Chọn lớp" mở các lớp của khóa (đã áp bộ lọc hình thức, thứ học, sắp xếp) để đăng ký.
 */
export function CourseOfferList({ classes, filters, canBuy, onBuy, surfaceClassName, onResetFilters }: CourseOfferListProps) {
  const user = useAuthStore((state) => state.user);
  // Khóa đang mở danh sách lớp
  const [expanded, setExpanded] = useState<number | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const courses = useQuery({
    queryKey: ["catalog-courses", user?.id],
    queryFn: () => listCatalogCourses({ size: CATALOG_LIMIT }),
    enabled: Boolean(user),
  });

  // Lớp của từng khóa (đã lọc / sắp xếp sẵn từ CourseShopSection)
  const classesByCourse = useMemo(() => {
    const map = new Map<string, TuitionClass[]>();
    for (const item of classes) {
      const key = courseKey(item.courseName, item.subject, item.gradeLevel);
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return map;
  }, [classes]);

  // Khóa khớp ô tìm, môn và khối
  const results = useMemo(() => {
    const keyword = normalizeText(filters.query);
    return sortCourses(courses.data?.content ?? []).filter(
      (course) =>
        (!filters.subject || course.subject === filters.subject) &&
        (!filters.grade || course.gradeLevel === filters.grade) &&
        (!keyword || normalizeText(`${course.name} ${course.subject} ${subjectLabel(course.subject)}`).includes(keyword)),
    );
  }, [courses.data, filters.query, filters.subject, filters.grade]);

  const openClassTotal = useMemo(
    () =>
      results.reduce(
        (sum, course) => sum + (classesByCourse.get(courseKey(course.name, course.subject, course.gradeLevel))?.length ?? 0),
        0,
      ),
    [results, classesByCourse],
  );

  if (courses.isPending) return <OfferSkeleton />;

  if (courses.isError)
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center">
        <Icon name="cloud_off" className="text-[40px] text-red-400" />
        <p className="text-[16px] font-bold text-red-800">Không tải được danh sách khóa học</p>
        <p className="max-w-md text-[14px] text-red-700">Kết nối tới máy chủ đang gặp sự cố. Bạn thử tải lại sau ít phút nhé.</p>
        <button
          type="button"
          onClick={() => void courses.refetch()}
          className={`inline-flex h-10 items-center gap-1.5 rounded-md bg-red-700 px-5 text-[14px] font-semibold text-white hover:bg-red-800 ${FOCUS_RING}`}
        >
          <Icon name="refresh" className="text-[18px]" />
          Thử lại
        </button>
      </div>
    );

  const noCoursesAtAll = (courses.data?.content.length ?? 0) === 0;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p aria-live="polite" className="text-[14.5px] text-brand-muted">
          <strong className="text-[18px] font-bold text-brand-navy">{results.length}</strong> khóa học đang bán
          {results.length > 0 && (
            <>
              {" · "}
              <strong className="font-semibold text-brand-ink">{openClassTotal}</strong> lớp đang tuyển sinh
            </>
          )}
        </p>
        <p className="hidden items-center gap-1.5 text-[13px] text-brand-muted sm:flex">
          <Icon name="info" className="text-[16px]" />
          Học nhóm đông người được giảm học phí
        </p>
      </div>

      {results.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-brand-navy/30 bg-white/60 px-6 py-12 text-center">
          <Icon name={noCoursesAtAll ? "inventory_2" : "search_off"} className="text-[44px] text-brand-navy/40" />
          <p className="mt-2 text-[17px] font-bold text-brand-navy">
            {noCoursesAtAll ? "Hiện chưa có khóa học nào đang bán" : "Không có khóa học phù hợp"}
          </p>
          <p className="mt-1 text-[14px] text-brand-muted">
            {noCoursesAtAll ? "Trung tâm sẽ sớm mở bán khóa mới, bạn quay lại sau nhé." : "Thử bỏ bớt bộ lọc hoặc tìm bằng từ khóa khác."}
          </p>
          {!noCoursesAtAll && (
            <button
              type="button"
              onClick={onResetFilters}
              className={`mt-4 inline-flex h-10 items-center rounded-md bg-brand-navy px-5 text-[14.5px] font-semibold text-white transition-colors hover:bg-brand-navyDeep ${FOCUS_RING}`}
            >
              Xóa bộ lọc
            </button>
          )}
        </div>
      ) : (
        <ul className="mt-4 space-y-5">
          {results.slice(0, visibleCount).map((course) => {
            const courseClasses = classesByCourse.get(courseKey(course.name, course.subject, course.gradeLevel)) ?? [];
            const summary = summarize(courseClasses);
            const open = expanded === course.id;
            const panelId = `course-classes-${course.id}`;
            const tone = toneOf(course.subject);
            const totalHours = Math.round((course.totalSessions * course.durationMinutes) / 60);
            const fee = summary?.minFee ?? course.basePrice1on1;
            const discounted = summary !== null && summary.minFee < course.basePrice1on1;
            const perSession = Math.round(fee / Math.max(course.totalSessions, 1) / 1000) * 1000;
            const filtered = Boolean(filters.mode || filters.schedule);

            const status = !summary
              ? {
                  label: filtered ? "Không có lớp hợp bộ lọc" : "Sắp mở lớp",
                  icon: "schedule",
                  className: "bg-amber-50 text-amber-800 ring-amber-200",
                }
              : summary.spots <= FEW_SPOTS
                ? {
                    label: `Sắp hết chỗ · còn ${summary.spots}`,
                    icon: "local_fire_department",
                    className: "bg-orange-50 text-orange-700 ring-orange-200",
                  }
                : { label: "Đang tuyển sinh", icon: "how_to_reg", className: "bg-emerald-50 text-emerald-800 ring-emerald-200" };

            return (
              <li
                key={course.id}
                className={`overflow-hidden rounded-2xl border bg-white transition-shadow ${
                  open
                    ? "border-brand-navy/40 shadow-[0_24px_48px_-30px_rgba(8,42,102,0.55)]"
                    : "border-slate-200 shadow-[0_18px_40px_-34px_rgba(8,42,102,0.5)] hover:shadow-[0_24px_48px_-30px_rgba(8,42,102,0.45)]"
                }`}
              >
                <article className="flex flex-col lg:flex-row">
                  {/* Thông tin khóa */}
                  <div className={`min-w-0 flex-1 bg-gradient-to-br ${tone.band} via-white to-white p-5 sm:p-6`}>
                    <div className="flex items-start gap-4">
                      <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-sm ${tone.tile}`}>
                        <Icon name={subjectIcon(course.subject)} className="text-[28px]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={`text-[12.5px] font-bold uppercase tracking-[0.12em] ${tone.eyebrow}`}>
                            {subjectLabel(course.subject)} · {gradeLabel(course.gradeLevel)}
                          </p>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ring-1 ${status.className}`}
                          >
                            <Icon name={status.icon} className="text-[14px]" />
                            {status.label}
                          </span>
                        </div>
                        <h3 className="mt-1 text-[19px] font-extrabold leading-snug tracking-tight text-brand-ink">{course.name}</h3>
                        {course.description && (
                          <p className="mt-1.5 line-clamp-2 text-[14px] leading-relaxed text-brand-muted">{course.description}</p>
                        )}
                      </div>
                    </div>

                    {/* Thông số của khóa */}
                    <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {[
                        { icon: "event_repeat", label: "Số buổi", value: `${course.totalSessions} buổi` },
                        { icon: "timer", label: "Mỗi buổi", value: `${course.durationMinutes} phút` },
                        { icon: "hourglass_bottom", label: "Tổng thời lượng", value: `${totalHours} giờ` },
                        { icon: "school", label: "Khối lớp", value: gradeLabel(course.gradeLevel) },
                      ].map((spec) => (
                        <div key={spec.label} className="rounded-xl border border-slate-200/80 bg-white/80 px-3 py-2">
                          <dt className="flex items-center gap-1 text-[11.5px] font-semibold uppercase tracking-wide text-brand-muted">
                            <Icon name={spec.icon} className="text-[15px] text-brand-navy" />
                            {spec.label}
                          </dt>
                          <dd className="mt-0.5 text-[15px] font-bold tabular-nums text-brand-ink">{spec.value}</dd>
                        </div>
                      ))}
                    </dl>

                    {/* Tóm tắt các lớp đang mở */}
                    {summary ? (
                      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13.5px] text-brand-ink">
                        <li className="flex items-center gap-1.5">
                          <Icon name="rocket_launch" className="text-[17px] text-brand-navy" />
                          Khai giảng sớm nhất{" "}
                          <strong className="font-semibold">{formatDayMonth(parseIsoDate(summary.earliest.startDate))}</strong>
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Icon name="calendar_month" className="text-[17px] text-brand-navy" />
                          {summary.patterns.join(" / ")}
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Icon name="schedule" className="text-[17px] text-brand-navy" />
                          {summary.slots.join(" / ")}
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Icon name="location_on" className="text-[17px] text-brand-navy" />
                          {summary.modes.join(" / ")}
                        </li>
                        <li className="flex items-center gap-1.5">
                          <Icon name="event_seat" className="text-[17px] text-brand-navy" />
                          Còn <strong className="font-semibold">{summary.spots}</strong> chỗ trong {courseClasses.length} lớp
                        </li>
                      </ul>
                    ) : (
                      <p className="mt-4 flex items-start gap-1.5 rounded-xl bg-amber-50/70 px-3 py-2.5 text-[13.5px] text-amber-900">
                        <Icon name="notifications_active" className="mt-px text-[17px]" />
                        {filtered
                          ? "Khóa này chưa có lớp theo hình thức hoặc lịch bạn đang lọc. Thử đổi bộ lọc để xem các lớp khác."
                          : "Trung tâm đang xếp lịch cho khóa này. Lớp mới sẽ hiện ở đây ngay khi mở đăng ký."}
                      </p>
                    )}
                  </div>

                  {/* Học phí và nút chọn lớp */}
                  <div className="flex shrink-0 flex-col justify-between gap-4 border-t border-slate-200 bg-brand-sand/50 p-5 sm:p-6 lg:w-[250px] lg:border-l lg:border-t-0">
                    <div>
                      <p className="text-[12.5px] font-semibold uppercase tracking-wide text-brand-muted">
                        {summary ? "Học phí chỉ từ" : "Học phí gốc"}
                      </p>
                      {discounted && (
                        <p className="mt-1 text-[13.5px] text-brand-muted line-through tabular-nums">{formatVnd(course.basePrice1on1)}</p>
                      )}
                      <p className="text-[26px] font-extrabold leading-tight tracking-tight text-brand-navy tabular-nums">
                        {formatVnd(fee)}
                      </p>
                      <p className="mt-0.5 text-[13px] text-brand-muted">
                        cả khóa · khoảng <span className="font-semibold tabular-nums text-brand-ink">{formatVnd(perSession)}</span> / buổi
                      </p>
                      {summary && summary.maxDiscount > 0 && (
                        <p className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[12.5px] font-bold text-emerald-800">
                          <Icon name="sell" className="text-[15px]" />
                          Giảm đến {Math.round(summary.maxDiscount * 100)}% khi học nhóm
                        </p>
                      )}
                    </div>

                    {summary ? (
                      <button
                        type="button"
                        aria-expanded={open}
                        aria-controls={panelId}
                        onClick={() => setExpanded(open ? null : course.id)}
                        className={`inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg px-4 text-[14.5px] font-semibold transition-colors ${FOCUS_RING} ${
                          open
                            ? "border border-brand-navy bg-white text-brand-navy hover:bg-brand-tint"
                            : "bg-brand-navy text-white hover:bg-brand-navyDeep"
                        }`}
                      >
                        {open ? "Thu gọn" : `Chọn lớp (${courseClasses.length})`}
                        <Icon name={open ? "expand_less" : "expand_more"} className="text-[20px]" />
                      </button>
                    ) : (
                      <span className="inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white text-[14px] font-semibold text-brand-muted">
                        <Icon name="hourglass_top" className="text-[18px]" />
                        Chưa có lớp
                      </span>
                    )}
                  </div>
                </article>

                {open && summary && (
                  <section
                    id={panelId}
                    aria-label={`Các lớp của ${course.name}`}
                    className="border-t border-slate-200 bg-brand-sand/60 p-4 sm:p-5"
                  >
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[15px] font-bold text-brand-navy">Chọn lớp có lịch hợp với bạn</p>
                      <p className="text-[13px] text-brand-muted">Học phí đã tính ưu đãi theo sĩ số hiện tại của lớp</p>
                    </div>
                    <ul className="space-y-4">
                      {courseClasses.map((item, index) => (
                        <li key={item.id}>
                          <ClassTicket
                            item={item}
                            index={index}
                            canBuy={canBuy}
                            onBuy={() => onBuy(item)}
                            surfaceClassName={surfaceClassName}
                          />
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {results.length > visibleCount && (
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            className={`inline-flex h-11 items-center gap-2 rounded-md border border-brand-navy px-6 text-[14.5px] font-semibold text-brand-navy transition-colors hover:bg-brand-navy hover:text-white ${FOCUS_RING}`}
          >
            Xem thêm {Math.min(PAGE_SIZE, results.length - visibleCount)} khóa
            <Icon name="expand_more" className="text-[19px]" />
          </button>
        </div>
      )}
    </>
  );
}
