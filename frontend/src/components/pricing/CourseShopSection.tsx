import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ClassTicket } from "@/components/pricing/ClassTicket";
import { CourseOfferList } from "@/components/pricing/CourseOfferList";
import { Icon } from "@/components/ui/Icon";
import { CONTAINER, FOCUS_RING, PORTAL_SURFACE } from "@/constants/classNames";
import { DELIVERY_MODE_OPTIONS, GRADE_OPTIONS, SCHEDULE_PATTERN_OPTIONS } from "@/constants/classOptions";
import { PURCHASE_STEPS } from "@/constants/pricing";
import { ROUTES } from "@/constants/routes";
import { useCart, useCartMutations } from "@/hooks/useCart";
import { cartCourseKey, preferredCartClass, preferredCartCourse, rememberCartCourse } from "@/utils/cartPreference";
import type { CourseResponse, DeliveryMode, GradeLevel, SchedulePattern, TuitionClass } from "@/interfaces/api";
import type { ClassShopFilters, ClassShopSort, CourseShopSectionProps } from "@/interfaces/pricing";
import { listCatalogCourses, listTuitionClasses } from "@/services/tuitionPaymentService";
import { useAuthStore } from "@/stores/authStore";
import { normalizeText } from "@/utils/text";
import { Select } from "@/components/ui/Select";

/** Số lớp hiện mỗi lần; còn nữa thì có nút "Xem thêm" */
const PAGE_SIZE = 6;
/** Backend cho tối đa 100 lớp mỗi trang */
const CATALOG_LIMIT = 100;

const DEFAULT_FILTERS: ClassShopFilters = { query: "", subject: "", grade: "", mode: "", schedule: "", tutor: "" };

const SORT_OPTIONS: { value: ClassShopSort; label: string }[] = [
  { value: "DEFAULT", label: "Mặc định" },
  { value: "START_ASC", label: "Khai giảng sớm nhất" },
  { value: "FEE_ASC", label: "Học phí thấp đến cao" },
  { value: "FEE_DESC", label: "Học phí cao đến thấp" },
];

const SELECT =
  "mt-2 h-10 w-full rounded-md border border-slate-300 bg-white pl-3 pr-9 text-[14.5px] font-semibold text-brand-ink outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy";

function filterClasses(items: TuitionClass[], filters: ClassShopFilters): TuitionClass[] {
  const keyword = normalizeText(filters.query);
  return items.filter(
    (item) =>
      (!filters.subject || item.subject === filters.subject) &&
      (!filters.grade || item.gradeLevel === filters.grade) &&
      (!filters.mode || item.deliveryMode === filters.mode) &&
      (!filters.schedule || item.schedulePattern === filters.schedule) &&
      (!filters.tutor || String(item.tutorId ?? "") === filters.tutor) &&
      (!keyword || normalizeText(`${item.courseName} ${item.classCode} ${item.subject} ${item.tutorName ?? ""}`).includes(keyword)),
  );
}

function sortClasses(items: TuitionClass[], sort: ClassShopSort): TuitionClass[] {
  if (sort === "DEFAULT") return items;
  return [...items].sort((first, second) => {
    if (sort === "START_ASC") return first.startDate.localeCompare(second.startDate);
    return sort === "FEE_ASC" ? first.estimatedFee - second.estimatedFee : second.estimatedFee - first.estimatedFee;
  });
}

/**
 * Danh sách lớp đang mở bán để mua: lấy trực tiếp các lớp admin mở đăng ký (GET /catalog/classes),
 * có ô tìm, bộ lọc (môn, khối, hình thức, thứ học) và sắp xếp. Bấm "Đăng ký ngay" sang trang thanh toán
 * với lớp đã chọn sẵn (?lop=<id>).
 * API danh mục yêu cầu đăng nhập, nên khách chưa đăng nhập được mời đăng nhập để xem lớp.
 * `variant="student"`: nhúng trong khu học viên — bỏ tiêu đề và các bước mua, dùng nền của khu học viên.
 */
export function CourseShopSection({ variant = "public" }: CourseShopSectionProps) {
  const inStudentArea = variant === "student";
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const isStudent = user?.role === "ROLE_STUDENT";
  const cart = useCart();
  const { add } = useCartMutations();
  const cartSubjects = new Set((cart.data?.items ?? []).map((cartItem) => cartItem.subjectName));

  // Đổi khi học viên chọn khóa / lớp khác cho môn đã có trong giỏ (lựa chọn nằm trong bộ nhớ trình duyệt)
  const [, setCartPick] = useState(0);

  /**
   * Giỏ hàng của backend giữ theo môn, nên thêm khóa Toán 10 thì môn Toán vào giỏ — không được đánh dấu
   * mọi khóa Toán khác là "Đã trong giỏ". Nhớ đúng khóa (và lớp, nếu thêm từ một lớp) học viên đã chọn;
   * chọn khóa khác cùng môn thì chỉ đổi lựa chọn, không thêm dòng giỏ mới.
   * Khách chưa đăng nhập thì đăng nhập rồi quay lại danh mục.
   */
  function addToCart(subjectId: number | undefined, item?: TuitionClass, course?: CourseResponse) {
    if (!user) return navigate(ROUTES.login, { state: { returnTo: ROUTES.studentCatalog } });
    if (item) rememberCartCourse(user.id, item.subject, cartCourseKey(item.courseName, item.subject, item.gradeLevel), item.id);
    else if (course) rememberCartCourse(user.id, course.subject, cartCourseKey(course.name, course.subject, course.gradeLevel));
    setCartPick((value) => value + 1);
    const subject = item?.subject ?? course?.subject;
    if (subjectId !== undefined && !(subject && cartSubjects.has(subject))) add.mutate(subjectId);
  }

  /** Khóa trong giỏ = khóa đã nhớ cho môn; giỏ cũ chưa nhớ khóa thì suy từ lớp đã nhớ */
  function pickedCourse(subject: string): string | undefined {
    const remembered = preferredCartCourse(user?.id, subject);
    if (remembered) return remembered;
    const classId = preferredCartClass(user?.id, subject);
    const group = classes.find((item) => item.id === classId);
    return group ? cartCourseKey(group.courseName, group.subject, group.gradeLevel) : undefined;
  }
  const isCourseInCart = (key: string) => {
    const subject = key.split("|")[0];
    return cartSubjects.has(subject) && pickedCourse(subject) === key;
  };
  const isClassInCart = (item: TuitionClass) =>
    cartSubjects.has(item.subject) && preferredCartClass(user?.id, item.subject) === item.id;
  const addingSubjectId = add.isPending ? add.variables : undefined;

  const [filters, setFilters] = useState<ClassShopFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<ClassShopSort>("DEFAULT");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const catalog = useQuery({
    queryKey: ["catalog-classes", user?.id],
    queryFn: () => listTuitionClasses({ page: 0, size: CATALOG_LIMIT }),
  });
  const classes = useMemo(() => catalog.data?.content ?? [], [catalog.data]);

  // Khu học viên hiện thẻ khóa đang bán, nên bộ lọc môn lấy cả môn của các khóa (cùng khóa cache với CourseOfferList)
  const courses = useQuery({
    queryKey: ["catalog-courses", user?.id],
    queryFn: () => listCatalogCourses({ size: CATALOG_LIMIT }),
    enabled: inStudentArea,
  });
  const subjects = useMemo(
    () => [...new Set([...classes.map((item) => item.subject), ...(courses.data?.content ?? []).map((course) => course.subject)])].sort(),
    [classes, courses.data],
  );
  /** Thầy cô đang phụ trách các lớp đang mở, để học viên lọc theo gia sư mình muốn */
  const tutors = useMemo(() => {
    const byId = new Map<number, string>();
    for (const item of classes) if (item.tutorId && item.tutorName) byId.set(item.tutorId, item.tutorName);
    return [...byId].map(([id, name]) => ({ id, name })).sort((first, second) => first.name.localeCompare(second.name, "vi"));
  }, [classes]);
  const results = useMemo(() => sortClasses(filterClasses(classes, filters), sort), [classes, filters, sort]);
  const hasFilters = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  function updateFilters(patch: Partial<ClassShopFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
    setVisibleCount(PAGE_SIZE);
  }

  /** Mua đúng một lớp; khách chưa đăng nhập thì đăng nhập xong quay lại trang thanh toán của lớp đó */
  function buy(item: TuitionClass) {
    const checkout = `${ROUTES.studentCheckout}?lop=${item.id}`;
    if (!user) navigate(ROUTES.login, { state: { returnTo: checkout } });
    else navigate(checkout);
  }

  return (
    <section id="course-shop" className={inStudentArea ? "" : "scroll-mt-[120px] bg-[#F5F1E9] pb-16 pt-12 lg:pb-20 lg:pt-16"}>
      <div className={inStudentArea ? "" : CONTAINER}>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className={inStudentArea ? "hidden" : ""}>
            <h2 className="text-[28px] font-extrabold leading-tight tracking-tight text-brand-navy lg:text-[36px]">Chọn Khóa Học</h2>
            <ol className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13.5px] text-brand-muted">
              {PURCHASE_STEPS.map((step, index) => (
                <li key={step} className="flex items-center gap-2">
                  {index > 0 && <Icon name="chevron_right" className="text-[17px]" />}
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-navy text-[11.5px] font-semibold text-white">
                    {index + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </div>

          {user && (
            <label className="flex h-[52px] w-full items-center gap-3 rounded-full border-2 border-brand-navy bg-white pl-5 pr-2 shadow-[0_14px_28px_-20px_rgba(8,42,102,0.7)] focus-within:ring-2 focus-within:ring-brand-orange lg:max-w-[460px]">
              <Icon name="search" className="text-[23px] text-brand-navy" />
              <span className="sr-only">Tìm lớp học</span>
              <input
                type="search"
                value={filters.query}
                onChange={(event) => updateFilters({ query: event.target.value })}
                placeholder={inStudentArea ? "Tên khóa, môn học hoặc gia sư" : "Tên khóa, mã lớp, môn hoặc gia sư"}
                className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[15.5px] text-brand-ink outline-none placeholder:text-slate-400 focus:ring-0"
              />
              {filters.query && (
                <button
                  type="button"
                  onClick={() => updateFilters({ query: "" })}
                  aria-label="Xóa chữ đang tìm"
                  className={`flex h-9 w-9 items-center justify-center rounded-full text-brand-muted hover:bg-slate-100 hover:text-brand-navy ${FOCUS_RING}`}
                >
                  <Icon name="close" className="text-[20px]" />
                </button>
              )}
            </label>
          )}
        </div>

        {!user && (
          <div className="mt-8 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[16px] font-bold text-brand-navy">Đăng nhập để đăng ký lớp</p>
              <p className="mt-0.5 text-[14px] text-brand-muted">
                Bạn vẫn xem được lịch học, học phí và số chỗ còn lại của mọi lớp đang mở.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link
                to={ROUTES.login}
                state={{ returnTo: ROUTES.studentCatalog }}
                className={`inline-flex h-11 items-center rounded-md bg-brand-navy px-6 text-[15px] font-semibold text-white hover:bg-brand-navyDeep ${FOCUS_RING}`}
              >
                Đăng nhập
              </Link>
              <Link
                to={ROUTES.register}
                state={{ resumeCheckout: true }}
                className={`inline-flex h-11 items-center rounded-md border border-brand-navy px-6 text-[15px] font-semibold text-brand-navy hover:bg-brand-navy hover:text-white ${FOCUS_RING}`}
              >
                Tạo tài khoản học viên
              </Link>
            </div>
          </div>
        )}
        <div className={`grid grid-cols-1 items-start gap-6 lg:grid-cols-[264px_1fr] lg:gap-8 ${inStudentArea ? "mt-6" : "mt-8"}`}>
          <aside className={`rounded-2xl border border-slate-200 bg-white p-5 lg:sticky ${inStudentArea ? "lg:top-24" : "lg:top-[150px]"}`}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-[16px] font-bold text-brand-navy">Bộ lọc</h3>
              {hasFilters && (
                <button
                  type="button"
                  onClick={() => updateFilters(DEFAULT_FILTERS)}
                  className={`rounded text-[13.5px] font-semibold text-brand-navy underline-offset-4 hover:underline ${FOCUS_RING}`}
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>
            <label className="mt-5 block text-[13.5px] font-semibold text-brand-ink">
              Môn học
              <Select value={filters.subject} onChange={(event) => updateFilters({ subject: event.target.value })} className={SELECT}>
                <option value="">Tất cả môn</option>
                {subjects.map((subject) => (
                  <option key={subject} value={subject}>
                    {subject}
                  </option>
                ))}
              </Select>
            </label>
            {tutors.length > 0 && (
              <label className="mt-5 block text-[13.5px] font-semibold text-brand-ink">
                Gia sư
                <Select value={filters.tutor} onChange={(event) => updateFilters({ tutor: event.target.value })} className={SELECT}>
                  <option value="">Tất cả thầy cô</option>
                  {tutors.map((tutor) => (
                    <option key={tutor.id} value={String(tutor.id)}>
                      {tutor.name}
                    </option>
                  ))}
                </Select>
              </label>
            )}
            <label className="mt-5 block text-[13.5px] font-semibold text-brand-ink">
              Khối lớp
              <Select
                value={filters.grade}
                onChange={(event) => updateFilters({ grade: event.target.value as GradeLevel | "" })}
                className={SELECT}
              >
                <option value="">Tất cả</option>
                {GRADE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="mt-5 block text-[13.5px] font-semibold text-brand-ink">
              Hình thức
              <Select
                value={filters.mode}
                onChange={(event) => updateFilters({ mode: event.target.value as DeliveryMode | "" })}
                className={SELECT}
              >
                <option value="">Tất cả</option>
                {DELIVERY_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
            <label className="mt-5 block text-[13.5px] font-semibold text-brand-ink">
              Học thứ mấy
              <Select
                value={filters.schedule}
                onChange={(event) => updateFilters({ schedule: event.target.value as SchedulePattern | "" })}
                className={SELECT}
              >
                <option value="">Thứ nào cũng được</option>
                {SCHEDULE_PATTERN_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </label>
          </aside>

          {inStudentArea ? (
            <div>
              {user && !isStudent && (
                <p className="mb-4 rounded-lg bg-brand-orange/15 px-4 py-3 text-[14px] text-brand-navyDeep">
                  Bạn đang xem bằng tài khoản không phải học viên — chỉ tài khoản học viên mới đăng ký được lớp.
                </p>
              )}
              {catalog.isError && (
                <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-[14px] text-red-800">
                  Không tải được danh sách lớp.{" "}
                  <button type="button" onClick={() => void catalog.refetch()} className="font-semibold underline">
                    Thử lại
                  </button>
                </p>
              )}
              <CourseOfferList
                classes={results}
                classesLoading={catalog.isPending}
                filters={filters}
                canBuy={isStudent || !user}
                onBuy={buy}
                onAddToCart={addToCart}
                cartSubjects={cartSubjects}
                isCourseInCart={isCourseInCart}
                isClassInCart={isClassInCart}
                addingSubjectId={addingSubjectId}
                surfaceClassName={PORTAL_SURFACE}
                onResetFilters={() => updateFilters(DEFAULT_FILTERS)}
              />
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p aria-live="polite" className="text-[14.5px] text-brand-muted">
                  <strong className="text-[18px] font-bold text-brand-navy">{results.length}</strong> lớp đang mở
                </p>
                <label className="flex items-center gap-2.5 text-[14px] text-brand-muted">
                  Sắp xếp
                  <Select
                    value={sort}
                    onChange={(event) => setSort(event.target.value as ClassShopSort)}
                    className="h-10 rounded-md border border-slate-300 bg-white pl-3 pr-9 text-[14.5px] font-semibold text-brand-ink outline-none focus:border-brand-navy focus:ring-1 focus:ring-brand-navy"
                  >
                    {SORT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </label>
              </div>

              {user && !isStudent && (
                <p className="mt-4 rounded-lg bg-brand-orange/15 px-4 py-3 text-[14px] text-brand-navyDeep">
                  Bạn đang xem bằng tài khoản không phải học viên — chỉ tài khoản học viên mới đăng ký được lớp.
                </p>
              )}

              {catalog.isPending && <p className="mt-6 text-brand-muted">Đang tải các lớp đang mở…</p>}

              {catalog.isError && (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-6 py-6 text-center text-[14.5px] text-red-800">
                  Không tải được danh sách lớp.{" "}
                  <button type="button" onClick={() => void catalog.refetch()} className="font-semibold underline">
                    Thử lại
                  </button>
                </div>
              )}

              {catalog.isSuccess &&
                (results.length > 0 ? (
                  <ul className="mt-4 space-y-4">
                    {results.slice(0, visibleCount).map((item, index) => (
                      <li key={item.id}>
                        <ClassTicket
                          item={item}
                          index={index}
                          canBuy={isStudent || !user}
                          onBuy={() => buy(item)}
                          onAddToCart={item.subjectId !== undefined ? () => addToCart(item.subjectId, item) : undefined}
                          inCart={isClassInCart(item)}
                          adding={add.isPending && add.variables === item.subjectId}
                          surfaceClassName={inStudentArea ? PORTAL_SURFACE : undefined}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="mt-4 rounded-2xl border border-dashed border-brand-navy/30 px-6 py-12 text-center">
                    <Icon name="search_off" className="text-[44px] text-brand-navy/40" />
                    <p className="mt-2 text-[17px] font-bold text-brand-navy">
                      {classes.length === 0 ? "Hiện chưa có lớp nào mở đăng ký." : "Không có lớp phù hợp."}
                    </p>
                    {hasFilters && (
                      <button
                        type="button"
                        onClick={() => updateFilters(DEFAULT_FILTERS)}
                        className={`mt-4 inline-flex h-10 items-center rounded-md bg-brand-navy px-5 text-[14.5px] font-semibold text-white transition-colors hover:bg-brand-navyDeep ${FOCUS_RING}`}
                      >
                        Xóa bộ lọc
                      </button>
                    )}
                  </div>
                ))}

              {results.length > visibleCount && (
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                    className={`inline-flex h-11 items-center gap-2 rounded-md border border-brand-navy px-6 text-[14.5px] font-semibold text-brand-navy transition-colors hover:bg-brand-navy hover:text-white ${FOCUS_RING}`}
                  >
                    Xem thêm {Math.min(PAGE_SIZE, results.length - visibleCount)} lớp
                    <Icon name="expand_more" className="text-[19px]" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
