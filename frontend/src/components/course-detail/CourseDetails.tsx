import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, CalendarX, Check, ChevronRight, ShoppingCart } from "lucide-react";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { FOCUS_RING, PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY, PORTAL_CARD } from "@/constants/classNames";
import { GRADE_OPTIONS, GRADE_RANGE_LABEL, DELIVERY_MODE_OPTIONS, SCHEDULE_PATTERN_OPTIONS } from "@/constants/classOptions";
import { SESSION_STATUS } from "@/constants/labels";
import { ROUTES } from "@/constants/routes";
import type { Course } from "@/interfaces/course";
import type { GradeLevel, TuitionClass } from "@/interfaces/dto";
import { listTuitionClasses, getTuitionClass } from "@/services/tuitionPaymentService";
import { useAuthStore } from "@/stores/authStore";
import { useCart, useCartMutations } from "@/hooks/useCart";
import { useSubjects } from "@/hooks/useManagementData";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { formatVnd } from "@/utils/currency";
import { formatDate, parseIsoDate, startOfToday } from "@/utils/date";

// Ngày dạng dd/mm/yyyy, chưa có thì hiện "Đang cập nhật"
const dateLabel = (date?: string | null) => (date ? formatDate(parseIsoDate(date)) : "Đang cập nhật");
// Tên lịch học của lớp (ví dụ Thứ 2 - 4 - 6)
const scheduleLabel = (group: TuitionClass) =>
  SCHEDULE_PATTERN_OPTIONS.find((item) => item.value === group.schedulePattern)?.label ?? "Đang cập nhật";
// Hình thức học của lớp (trực tuyến / tại trung tâm)
const modeLabel = (group: TuitionClass) =>
  DELIVERY_MODE_OPTIONS.find((item) => item.value === group.deliveryMode)?.label ?? "Đang cập nhật";
// Lớp không đăng ký được: hết chỗ, ngừng tuyển sinh hoặc quá hạn
const unavailable = (group: TuitionClass) =>
  group.status !== "ENROLLING" ||
  group.spotsLeft < 1 ||
  Boolean(group.full) ||
  Boolean(group.enrollmentDeadline && parseIsoDate(group.enrollmentDeadline) < startOfToday());

// Trang chi tiết khóa học: giới thiệu, chọn khối, chọn lớp, xem lịch và đăng ký
export function CourseDetails({ course, backTo }: { course: Course; backTo: string }) {
  const user = useAuthStore((state) => state.user);
  const authenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();
  // Giỏ hàng lưu ở máy chủ theo tài khoản học viên; môn được thêm theo id trong bảng subjects
  const cart = useCart();
  const { add } = useCartMutations();
  const subjectId = useSubjects().data?.find((item) => item.code === course.subject)?.id;
  const inCart = cart.data?.items.some((item) => item.subjectName === course.subject) ?? false;
  const [grade, setGrade] = useState<GradeLevel>("GRADE_10");
  const [page, setPage] = useState(0);
  const [classId, setClassId] = useState<number | null>(null);
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [course.id]);
  const classes = useQuery({
    queryKey: ["course-detail-classes", user?.id, course.subject, grade, page],
    queryFn: () => listTuitionClasses({ subject: course.subject, gradeLevel: grade, page, size: 6 }),
    retry: false,
  });
  const detail = useQuery({
    queryKey: ["tuition-class", user?.id, classId],
    queryFn: () => getTuitionClass(classId!),
    enabled: classId !== null,
    retry: false,
  });
  const selected = detail.data?.subject === course.subject && detail.data.gradeLevel === grade ? detail.data : undefined;
  const sessions = selected?.sessions ?? [];
  const endDate = sessions
    .filter((session) => session.status !== "CANCELLED")
    .map((session) => session.date)
    .sort()
    .slice(-1)[0];
  const blocked = !selected || unavailable(selected) || detail.isError || detail.isFetching;
  const isStudent = authenticated && user?.role === "ROLE_STUDENT";
  // Thêm môn của khóa vào giỏ; khách thì đăng nhập trước rồi quay lại trang này
  function addToCart() {
    if (!authenticated) {
      navigate(ROUTES.login, { state: { returnTo: ROUTES.studentCatalog } });
      return;
    }
    if (subjectId !== undefined) add.mutate(subjectId);
  }

  // Đăng ký lớp đã chọn: chưa đăng nhập thì sang đăng nhập rồi quay lại thanh toán
  function register() {
    if (blocked || !selected) return;
    // Khách chưa đăng nhập: đăng nhập xong quay lại đúng trang thanh toán của lớp đã chọn
    if (!authenticated) {
      navigate(ROUTES.login, { state: { returnTo: `${ROUTES.studentCheckout}?classId=${selected.id}` } });
      return;
    }
    if (!isStudent) return;
    // "Đăng ký" chỉ mua đúng lớp đã chọn, không đụng tới giỏ hàng
    navigate(
      ROUTES.studentCheckout +
        "?" +
        new URLSearchParams({ lop: String(selected.id), subject: selected.subject, gradeLevel: selected.gradeLevel }),
    );
  }

  return (
    <div className="space-y-8">
      <nav aria-label="Đường dẫn" className="flex flex-wrap items-center gap-2 text-sm text-brand-muted">
        <Link to={backTo} className={"rounded hover:text-brand-navy " + FOCUS_RING}>
          Mua khóa học
        </Link>
        <ChevronRight aria-hidden="true" className="h-4 w-4" />
        <span aria-current="page">{course.name}</span>
      </nav>
      <header className="relative overflow-hidden rounded-3xl bg-brand-navy p-7 text-white sm:p-10">
        <BookOpen aria-hidden="true" className="pointer-events-none absolute -right-4 -top-4 h-44 w-44 -rotate-12 opacity-10" />
        <p className="relative text-sm font-semibold uppercase tracking-widest text-white/80">
          {course.subjectLabel} - {GRADE_RANGE_LABEL}
        </p>
        <h1 className="relative mt-3 text-3xl font-extrabold sm:text-4xl">{course.name}</h1>
        <p className="relative mt-4 max-w-2xl text-base leading-relaxed text-white/90">{course.summary}</p>
        <div className="relative mt-6 flex flex-wrap gap-3">
          <a href="#chon-lop" className={"rounded-lg bg-white px-5 py-3 text-sm font-bold text-brand-navy " + FOCUS_RING}>
            Xem lớp đang mở
          </a>
          <a href="#noi-dung" className={"rounded-lg border border-white/40 px-5 py-3 text-sm font-semibold " + FOCUS_RING}>
            Khám phá lộ trình
          </a>
        </div>
      </header>
      <div className="grid items-start gap-7 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-7">
          <section className={PORTAL_CARD + " p-6 sm:p-7"}>
            <h2 className="text-xl font-bold text-brand-navy">Giới thiệu khóa học</h2>
            <p className="mt-3 leading-relaxed text-brand-muted">
              {course.summary} Chọn khối lớp phù hợp để xem các lớp đang nhận đăng ký và lịch học cụ thể.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {GRADE_OPTIONS.map((item) => (
                <span key={item.value} className="rounded-full bg-brand-tint px-3 py-1 text-sm font-semibold text-brand-navy">
                  {item.label}
                </span>
              ))}
            </div>
          </section>
          <section id="noi-dung" className={PORTAL_CARD + " scroll-mt-32 p-6 sm:p-7"}>
            <h2 className="text-xl font-bold text-brand-navy">Bạn sẽ học gì?</h2>
            <p className="mt-2 text-sm text-brand-muted">
              Lộ trình tổng quan của {course.name}. Nội dung theo từng khối sẽ được triển khai trong lớp học.
            </p>
            <ol className="mt-6 space-y-5">
              {course.steps.map((step, index) => (
                <li key={step} className="flex items-start gap-4">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-tint font-bold text-brand-navy">
                    {index + 1}
                  </span>
                  <div className="pt-1.5 font-semibold leading-relaxed text-brand-ink">{step}</div>
                </li>
              ))}
            </ol>
          </section>
          <section className={PORTAL_CARD + " p-6 sm:p-7"}>
            <h2 className="text-xl font-bold text-brand-navy">Đội ngũ gia sư bộ môn</h2>
            <p className="mt-2 text-sm text-brand-muted">Gia sư phụ trách từng lớp sẽ được trung tâm xác nhận khi phân công.</p>
            <div className="mt-5 space-y-5">
              {course.tutors.map((tutor) => (
                <article key={tutor.name} className="flex gap-4">
                  <img
                    src={tutor.image}
                    alt={tutor.name}
                    loading="lazy"
                    className="h-16 w-16 shrink-0 rounded-2xl bg-brand-tint object-cover object-top"
                  />
                  <div className="min-w-0">
                    <h3 className="font-bold text-brand-navy">{tutor.name}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-brand-muted">{tutor.bio}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {tutor.specialties.map((item) => (
                        <span key={item} className="rounded-md bg-slate-50 px-2 py-1 text-xs text-brand-muted">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
          <section id="chon-lop" className={PORTAL_CARD + " scroll-mt-32 p-6 sm:p-7"} aria-labelledby="class-heading">
            <h2 id="class-heading" className="text-xl font-bold text-brand-navy">
              Chọn lớp để đăng ký
            </h2>
            <p className="mt-2 text-sm text-brand-muted">Chọn khối, sau đó chọn lớp để xem lịch từng buổi và học phí.</p>
            <fieldset className="mt-5">
              <legend className="mb-2 text-sm font-semibold">Khối lớp</legend>
              <div className="flex flex-wrap gap-2">
                {GRADE_OPTIONS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    aria-pressed={grade === item.value}
                    onClick={() => {
                      setGrade(item.value);
                      setPage(0);
                      setClassId(null);
                    }}
                    className={
                      "rounded-lg border px-5 py-2 text-sm font-semibold " +
                      FOCUS_RING +
                      (grade === item.value
                        ? " border-brand-navy bg-brand-navy text-white"
                        : " border-slate-200 bg-white text-brand-navy hover:bg-brand-tint")
                    }
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </fieldset>
            <>
              <div className="mt-5" aria-live="polite">
                {classes.isPending && <p className="py-6 text-brand-muted">Đang tải các lớp đang mở…</p>}
                {classes.isError && (
                  <AuthNotice tone="error">
                    Không tải được danh sách lớp.{" "}
                    <button type="button" onClick={() => void classes.refetch()} className="font-semibold underline">
                      Thử lại
                    </button>
                  </AuthNotice>
                )}
                {classes.isSuccess && classes.data.content.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center">
                    <CalendarX aria-hidden="true" className="mx-auto h-8 w-8 text-brand-muted" />
                    <p className="mt-2 font-semibold">Chưa có lớp đang mở cho khối này.</p>
                    <p className="mt-1 text-sm text-brand-muted">Bạn có thể chọn khối khác hoặc liên hệ trung tâm để được tư vấn.</p>
                    <Link to={ROUTES.contactForm} className="mt-3 inline-block text-sm font-semibold text-brand-navy underline">
                      Liên hệ tư vấn
                    </Link>
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-3">
                {classes.data?.content.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    aria-pressed={classId === group.id}
                    disabled={unavailable(group)}
                    onClick={() => setClassId(group.id)}
                    className={
                      "w-full rounded-xl border p-5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 " +
                      FOCUS_RING +
                      (classId === group.id
                        ? " border-brand-navy bg-brand-tint ring-1 ring-brand-navy"
                        : " border-slate-200 hover:border-brand-navy")
                    }
                  >
                    <span className="flex flex-wrap items-start justify-between gap-2">
                      <strong className="text-brand-navy">
                        {group.courseName} - {group.classCode}
                      </strong>
                      <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800">
                        {unavailable(group) ? "Ngừng nhận đăng ký" : "Còn " + group.spotsLeft + " chỗ"}
                      </span>
                    </span>
                    {group.tutorName && (
                      <span className="mt-3 flex items-center gap-2 text-sm font-semibold text-brand-ink">
                        <UserAvatar userId={group.tutorId} name={group.tutorName} size={24} />
                        Gia sư {group.tutorName}
                      </span>
                    )}
                    <span className={(group.tutorName ? "mt-1" : "mt-3") + " block text-sm"}>
                      {scheduleLabel(group)} - {group.timeSlotLabel}
                    </span>
                    <span className="mt-1 block text-sm text-brand-muted">
                      Khai giảng {dateLabel(group.startDate)} - {modeLabel(group)}
                    </span>
                    <span className="mt-1 block text-sm text-brand-muted">
                      {group.totalSessions} buổi - Tối đa {group.maxStudents} học viên
                    </span>
                    <span className="mt-3 flex flex-wrap justify-between gap-2 text-sm font-bold text-brand-navy">
                      <span>{formatVnd(group.basePrice1on1)} / khóa</span>
                      <span>{classId === group.id ? "Đã chọn - Xem lịch bên dưới" : "Chọn lớp và xem lịch →"}</span>
                    </span>
                  </button>
                ))}
              </div>
              {classes.data && classes.data.totalPages > 1 && (
                <nav aria-label="Phân trang lớp học" className="mt-5 flex items-center justify-between gap-3">
                  <button
                    className={PORTAL_BTN_SECONDARY}
                    disabled={page === 0 || classes.isFetching}
                    onClick={() => {
                      setPage(page - 1);
                      setClassId(null);
                    }}
                  >
                    Trước
                  </button>
                  <span className="text-sm">
                    Trang {page + 1}/{classes.data.totalPages}
                  </span>
                  <button
                    className={PORTAL_BTN_SECONDARY}
                    disabled={page + 1 >= classes.data.totalPages || classes.isFetching}
                    onClick={() => {
                      setPage(page + 1);
                      setClassId(null);
                    }}
                  >
                    Sau
                  </button>
                </nav>
              )}
            </>
            {classId !== null && (
              <section className="mt-6 border-t border-slate-200 pt-6" aria-live="polite">
                <h3 className="font-bold text-brand-navy">Lịch học từng buổi</h3>
                {detail.isPending && <p className="mt-3 text-sm text-brand-muted">Đang tải lịch lớp đã chọn…</p>}
                {detail.isError && (
                  <AuthNotice tone="error">
                    Không tải được thông tin lớp hoặc lớp không còn công bố.{" "}
                    <button onClick={() => void detail.refetch()} className="underline">
                      Thử lại
                    </button>
                  </AuthNotice>
                )}
                {selected && (
                  <>
                    <p className="mt-2 text-sm text-brand-muted">
                      {selected.classCode} - Kết thúc dự kiến {dateLabel(endDate)}
                    </p>
                    {unavailable(selected) && (
                      <p role="alert" className="mt-3 text-sm text-red-700">
                        Lớp đã hết chỗ hoặc ngừng nhận đăng ký. Vui lòng chọn lớp khác.
                      </p>
                    )}
                    {sessions.length ? (
                      <ol className="mt-4 max-h-80 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200 px-4">
                        {sessions.map((session, index) => (
                          <li key={session.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                            <span>
                              <strong>Buổi {session.sessionNumber ?? index + 1}</strong> - {dateLabel(session.date)}
                              <span className="mt-1 block text-brand-muted">
                                {session.startTime.slice(0, 5)} – {session.endTime.slice(0, 5)}
                              </span>
                            </span>
                            {session.status && (
                              <span className="rounded-full bg-slate-100 px-2 py-1 text-xs">
                                {SESSION_STATUS[session.status]?.label ?? session.status}
                              </span>
                            )}
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="mt-3 text-sm text-brand-muted">Lịch từng buổi đang được trung tâm cập nhật.</p>
                    )}
                  </>
                )}
              </section>
            )}
          </section>
        </div>
        <aside className={PORTAL_CARD + " space-y-5 p-6 lg:sticky lg:top-32"} aria-label="Thông tin đăng ký">
          <h2 className="text-lg font-bold text-brand-navy">Lớp bạn chọn</h2>
          {selected ? (
            <>
              <p className="font-semibold">
                {selected.courseName}
                <span className="mt-1 block text-sm font-normal text-brand-muted">{selected.classCode}</span>
              </p>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt>Hình thức</dt>
                  <dd className="text-right font-semibold">{modeLabel(selected)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Số buổi</dt>
                  <dd className="font-semibold">{selected.totalSessions} buổi</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Khai giảng</dt>
                  <dd className="font-semibold">{dateLabel(selected.startDate)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Hạn đăng ký</dt>
                  <dd className="font-semibold">{dateLabel(selected.enrollmentDeadline)}</dd>
                </div>
              </dl>
              <div className="border-t border-slate-200 pt-4">
                {
                  // Đăng ký trả đủ học phí; lớp nhóm được hoàn phần giảm theo sĩ số vào ví khi lớp chốt
                }
                <p className="text-sm text-brand-muted">Học phí trọn khóa</p>
                <p className="mt-1 text-2xl font-extrabold text-brand-navy">{formatVnd(selected.estimatedFee ?? selected.basePrice1on1)}</p>
                {selected.classType !== "ONE_ON_ONE" && (
                  <p className="mt-1 text-[13px] leading-relaxed text-emerald-700">
                    Khi lớp chốt sĩ số, bạn được hoàn vào ví: 2–3 người 20%, 4–5 người 35%, 6–8 người 40% học phí.
                  </p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm leading-relaxed text-brand-muted">Chọn một lớp để xem lịch và học phí chính xác trước khi đăng ký.</p>
          )}
          <button
            type="button"
            disabled={blocked || (authenticated && !isStudent)}
            onClick={register}
            className={PORTAL_BTN_PRIMARY + " w-full"}
          >
            {authenticated ? "Đăng ký lớp này" : "Đăng nhập để đăng ký"} <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </button>
          {authenticated && !isStudent && <p className="text-sm text-brand-muted">Chỉ tài khoản học viên được đăng ký lớp.</p>}
          <button
            type="button"
            onClick={addToCart}
            disabled={inCart || add.isPending || (authenticated && (!isStudent || subjectId === undefined))}
            className={PORTAL_BTN_SECONDARY + " w-full"}
          >
            {inCart ? <Check aria-hidden="true" className="h-4 w-4" /> : <ShoppingCart aria-hidden="true" className="h-4 w-4" />}
            {inCart ? "Đã trong giỏ" : add.isPending ? "Đang thêm…" : "Thêm môn vào giỏ"}
          </button>
          {inCart && (
            <Link
              to={ROUTES.studentCart}
              className="block text-center text-sm font-semibold text-brand-navy underline-offset-4 hover:underline"
            >
              Xem giỏ hàng
            </Link>
          )}
          {add.isError && <p className="text-sm text-red-700">Chưa thêm được vào giỏ. Vui lòng thử lại.</p>}
          <p className="text-xs leading-relaxed text-brand-muted">
            Bạn sẽ kiểm tra lại thông tin ở bước thanh toán. Chỗ học được kiểm tra lại khi đăng ký; chọn lớp tại đây chưa giữ chỗ.
          </p>
        </aside>
      </div>
    </div>
  );
}
