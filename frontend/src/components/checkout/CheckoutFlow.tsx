import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { DELIVERY_MODE_OPTIONS, GRADE_OPTIONS, SCHEDULE_PATTERN_OPTIONS } from "@/constants/classOptions";
import { PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY, PORTAL_CARD, PORTAL_INPUT } from "@/constants/classNames";
import { portalKeys } from "@/hooks/usePortalData";
import { formatClock, useCountdown } from "@/hooks/useCountdown";
import type { DeliveryMode, GradeLevel, VnpayRedirect } from "@/interfaces/api";
import type { CheckoutFlowProps, SeatHoldProps, StudentPaymentProps } from "@/interfaces/checkout";
import { getApiError } from "@/services/api";
import { saveCheckoutReturn } from "@/utils/checkoutReturn";
import {
  cancelIntent,
  getIntent,
  getTuitionClass,
  listTuitionClasses,
  quoteTuition,
  startVnpay,
  verifyVnpayReturn,
} from "@/services/tuitionPaymentService";
import { useAuthStore } from "@/stores/authStore";
import { formatVnd } from "@/utils/currency";
import { Icon } from "@/components/ui/Icon";
import { walletService } from "@/services/walletService";
import { walletError } from "@/utils/wallet";

/** Câu báo cho các mã lỗi thanh toán thường gặp */
const PAYMENT_ERRORS: Record<string, string> = {
  PAYMENT_GATEWAY_DISABLED: "VNPay Sandbox chưa được cấu hình. Vui lòng liên hệ trung tâm.",
  CLASS_FULL: "Lớp đã hết chỗ. Vui lòng chọn lớp khác.",
  CLASS_NOT_ENROLLING: "Lớp đã ngừng nhận đăng ký.",
  CLASS_PAYMENT_NOT_READY: "Lớp chưa có lịch học đầy đủ để đăng ký.",
  STUDENT_SCHEDULE_CONFLICT: "Lịch lớp này trùng với lớp bạn đã đăng ký hoặc đang giữ chỗ.",
  PAYMENT_RESERVATION_EXISTS: "Bạn đang giữ chỗ ở lớp này. Hãy tiếp tục yêu cầu thanh toán trước.",
  ENROLLMENT_ALREADY_EXISTS: "Bạn đã ghi danh vào lớp này.",
  PAYMENT_INTENT_EXPIRED: "Yêu cầu đã hết hạn. Vui lòng tạo thanh toán mới.",
  PAYMENT_PRICE_CHANGED: "Học phí đã thay đổi. Vui lòng tạo thanh toán mới.",
  PAYMENT_GATEWAY_ERROR: "Chưa kết nối được VNPay. Vui lòng thử lại sau.",
  PAYMENT_INTENT_NOT_PENDING: "Yêu cầu này đã kết thúc. Vui lòng tạo thanh toán mới.",
  INVALID_PAYMENT_SIGNATURE: "Không xác minh được kết quả VNPay. Hãy kiểm tra lại trạng thái yêu cầu.",
  WALLET_INSUFFICIENT_FUNDS: "Số dư ví chưa đủ. Bạn có thể nạp thêm hoặc thanh toán trực tiếp bằng VNPay.",
  PAYMENT_PROVIDER_CONFLICT: "Yêu cầu đã bắt đầu bằng phương thức khác. Hãy tiếp tục tại VNPay hoặc hủy để tạo yêu cầu mới.",
};

/** Câu báo lỗi thanh toán dễ đọc */
function errorMessage(error: unknown): string {
  return PAYMENT_ERRORS[getApiError(error).errorCode ?? ""] ?? "Chưa xử lý được yêu cầu. Vui lòng thử lại.";
}

/** Mã yêu cầu thanh toán đang dở của học viên (lưu trong sessionStorage) */
function storedIntent(userId: number): number | null {
  try {
    const value = Number(sessionStorage.getItem(`tuition-intent-${userId}`));
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

/** Đồng hồ đếm ngược thời gian giữ chỗ */
function SeatHold({ expiresAt }: SeatHoldProps) {
  const [left] = useCountdown(Math.max(0, Math.floor((Date.parse(expiresAt) - Date.now()) / 1000)));
  return (
    <p className="text-sm font-semibold text-brand-navy" role="timer">
      {left > 0 ? `Yêu cầu còn hiệu lực trong ${formatClock(left)}` : "Đã hết thời gian giữ chỗ"}
    </p>
  );
}

/**
 * Đăng ký lớp và thanh toán học phí qua VNPay Sandbox. Chỉ tài khoản học viên mới đăng ký được:
 * chọn lớp → giữ chỗ → sang VNPay; quay về thì kiểm tra kết quả và ghi danh.
 */
export function CheckoutFlow({ shopTo = ROUTES.pricing }: CheckoutFlowProps) {
  const user = useAuthStore((state) => state.user);
  const { search } = useLocation();
  // Đăng nhập / đăng ký xong quay lại đúng lớp đã chọn
  const returnTo = `${ROUTES.studentCheckout}${search}`;
  return user?.role === "ROLE_STUDENT" ? (
    <StudentPayment key={user.id} userId={user.id} shopTo={shopTo} />
  ) : (
    <section className={`${PORTAL_CARD} space-y-4 p-6`}>
      <h1 className="text-2xl font-bold text-brand-navy">Đăng ký lớp học</h1>
      <p>Đăng nhập tài khoản học viên đã xác thực để chọn lớp và thanh toán qua VNPay Sandbox.</p>
      {!user ? (
        <div className="flex gap-3">
          <Link
            to={ROUTES.login}
            state={{ resumeCheckout: true, returnTo }}
            onClick={() => saveCheckoutReturn(returnTo)}
            className={PORTAL_BTN_PRIMARY}
          >
            Đăng nhập
          </Link>
          <Link
            to={ROUTES.register}
            state={{ resumeCheckout: true }}
            onClick={() => saveCheckoutReturn(returnTo)}
            className={PORTAL_BTN_SECONDARY}
          >
            Tạo tài khoản
          </Link>
        </div>
      ) : (
        <AuthNotice tone="info">Chỉ tài khoản học viên được đăng ký lớp.</AuthNotice>
      )}
    </section>
  );
}

/** Phần đăng ký và thanh toán của học viên đã đăng nhập */
function StudentPayment({ userId, shopTo }: StudentPaymentProps) {
  const cache = useQueryClient();
  const navigate = useNavigate();
  const { search } = useLocation();
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState<GradeLevel | "">("");
  const [mode, setMode] = useState<DeliveryMode | "">("");
  const [page, setPage] = useState(0);
  // Bấm "Đăng ký ngay" ở trang "Mua khóa học" (?lop=<id>): chỉ thanh toán đúng lớp đó
  const lopParam = Number(new URLSearchParams(search).get("lop"));
  const lockedClassId = Number.isSafeInteger(lopParam) && lopParam > 0 ? lopParam : null;
  const [classId, setClassId] = useState<number | null>(lockedClassId);
  const [activeId, setActiveId] = useState(() => storedIntent(userId));
  const [redirect, setRedirect] = useState<VnpayRedirect | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"VNPAY" | "WALLET">("VNPAY");
  const wallet = useQuery({ queryKey: ["wallet", userId], queryFn: walletService.getWallet });
  const attempt = useRef<{ classId: number; key: string; intentId?: number } | null>(null);
  const params = new URLSearchParams(search);
  const returning = params.has("vnp_TxnRef") || params.has("vnp_SecureHash");
  const returned = useQuery({
    queryKey: ["tuition-return", userId, search],
    queryFn: () => verifyVnpayReturn(search),
    enabled: returning,
    retry: false,
  });
  const intentId = returning ? returned.data?.intent.intentId : activeId;
  const detail = useQuery({
    queryKey: ["tuition-intent", userId, intentId],
    queryFn: () => getIntent(intentId!),
    enabled: Boolean(intentId),
    retry: false,
    refetchInterval: (query) => (query.state.data?.intent.status === "PENDING" ? 3000 : false),
  });
  const state = detail.data ?? returned.data;
  const enrollmentStatus = state?.enrollment?.status;
  useEffect(() => {
    if (enrollmentStatus) {
      void cache.invalidateQueries({ queryKey: portalKeys.sessions(userId) });
      void cache.invalidateQueries({ queryKey: ["me", userId, "enrollments"] });
      void cache.invalidateQueries({ queryKey: ["wallet", userId] });
      void cache.invalidateQueries({ queryKey: ["wallet-history", userId] });
    }
  }, [enrollmentStatus, cache, userId]);
  const pending = state?.intent.status === "PENDING";
  const returnNotice =
    returned.data && pending
      ? params.get("vnp_ResponseCode") === "00"
        ? "VNPay đã trả kết quả thành công. Hệ thống đang chờ xác nhận giao dịch trước khi ghi danh."
        : params.get("vnp_ResponseCode") === "24"
          ? "Bạn đã hủy thanh toán trên VNPay. Bạn có thể hủy yêu cầu bên dưới để giải phóng chỗ."
          : "VNPay chưa xác nhận thanh toán thành công. Hãy kiểm tra trạng thái hoặc hủy yêu cầu để thử lại."
      : null;
  const catalog = useQuery({
    queryKey: ["tuition-classes", userId, subject, grade, mode, page],
    queryFn: () =>
      listTuitionClasses({
        subject: subject.trim() || undefined,
        gradeLevel: grade || undefined,
        deliveryMode: mode || undefined,
        page,
        size: 10,
      }),
    enabled: !pending && !returning && !lockedClassId,
  });
  const summaryClassId = classId ?? state?.intent.classGroupId;
  const selected = useQuery({
    queryKey: ["tuition-class", userId, summaryClassId],
    queryFn: () => getTuitionClass(summaryClassId!),
    enabled: Boolean(summaryClassId),
  });

  function saveIntent(id: number | null) {
    setActiveId(id);
    try {
      if (id === null) sessionStorage.removeItem(`tuition-intent-${userId}`);
      else sessionStorage.setItem(`tuition-intent-${userId}`, String(id));
    } catch {
      /* Recovery still works through the signed return URL. */
    }
  }
  const start = useMutation({
    mutationFn: async () => {
      if (classId === null) throw new Error("Select a class");
      if (!attempt.current || attempt.current.classId !== classId) attempt.current = { classId, key: crypto.randomUUID() };
      if (!attempt.current.intentId) {
        const quote = await quoteTuition(classId, attempt.current.key);
        attempt.current.intentId = quote.intentId;
        saveIntent(quote.intentId);
      }
      if (paymentMethod === "WALLET") {
        await walletService.payTuition(attempt.current.intentId, `wallet-payment-${attempt.current.intentId}`);
        return { detail: await getIntent(attempt.current.intentId), redirect: null };
      }
      return { detail: null, redirect: await startVnpay(attempt.current.intentId) };
    },
    onSuccess: (value) => {
      setRedirect(value.redirect);
      if (value.detail) cache.setQueryData(["tuition-intent", userId, value.detail.intent.intentId], value.detail);
      void cache.invalidateQueries({ queryKey: ["tuition-intent"] });
      void cache.invalidateQueries({ queryKey: ["tuition-classes"] });
      if (value.redirect) window.location.assign(value.redirect.paymentUrl);
    },
  });
  const cancel = useMutation({
    mutationFn: () => cancelIntent(intentId!),
    onSuccess: (value) => {
      setRedirect(null);
      attempt.current = null;
      cache.setQueryData(["tuition-intent", userId, intentId], value);
      void cache.invalidateQueries({ queryKey: ["tuition-classes"] });
    },
  });
  const resume = useMutation({
    mutationFn: () => startVnpay(intentId!),
    onSuccess: (value) => {
      setRedirect(value);
      void cache.invalidateQueries({ queryKey: ["tuition-classes"] });
      window.location.assign(value.paymentUrl);
    },
  });
  const payWallet = useMutation({
    mutationFn: async () => {
      await walletService.payTuition(intentId!, `wallet-payment-${intentId}`);
      return getIntent(intentId!);
    },
    onSuccess: (value) => {
      cache.setQueryData(["tuition-intent", userId, value.intent.intentId], value);
      void cache.invalidateQueries({ queryKey: ["tuition-classes"] });
      void cache.invalidateQueries({ queryKey: ["wallet", userId] });
    },
  });

  function reset() {
    saveIntent(null);
    setRedirect(null);
    setClassId(null);
    attempt.current = null;
    start.reset();
    resume.reset();
    cancel.reset();
    payWallet.reset();
    navigate(ROUTES.studentCheckout, { replace: true });
    void cache.invalidateQueries({ queryKey: ["tuition-classes"] });
  }
  const paymentError = start.error ?? resume.error ?? payWallet.error ?? cancel.error ?? returned.error ?? detail.error;
  const paid = state?.payment;
  const outcome =
    paid?.status === "REQUIRES_REFUND"
      ? "VNPay đã ghi nhận thanh toán. Yêu cầu cần hoàn tiền; trung tâm sẽ xử lý."
      : paid?.status === "FAILED"
        ? "Thanh toán không thành công. Bạn có thể tạo yêu cầu mới."
        : paid?.status === "REFUNDED"
          ? "Học phí đã được hoàn lại."
          : paid?.status === "PARTIALLY_REFUNDED"
            ? "Học phí đã được hoàn lại một phần."
            : state?.enrollment?.status === "ACTIVE"
              ? "Thanh toán thành công. Bạn đã được ghi danh vào lớp."
              : state?.intent.status === "EXPIRED"
                ? "Yêu cầu đã hết hạn hoặc được hủy; chỗ giữ đã được giải phóng."
                : null;

  return (
    <div className="space-y-6">
      <Link to={shopTo} className="text-sm font-semibold text-brand-navy">
        ← Chọn khóa học
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold text-brand-navy">Thanh toán học phí</h1>
        <span className="rounded-full bg-brand-navy/10 px-3 py-1 text-xs font-semibold text-brand-navy">VNPay Sandbox</span>
      </div>
      <p className="text-brand-muted">Chọn VNPay Sandbox hoặc dùng số dư ví để hoàn tất đăng ký lớp. Đây là môi trường thử nghiệm.</p>
      {!state?.payment && !returning && (
        <fieldset
          className={`${PORTAL_CARD} space-y-3 p-5`}
          disabled={start.isPending || resume.isPending || payWallet.isPending || Boolean(redirect)}
        >
          <legend className="px-2 font-bold text-brand-navy">Phương thức thanh toán</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="payment-method"
              value="VNPAY"
              checked={paymentMethod === "VNPAY"}
              onChange={() => {
                setPaymentMethod("VNPAY");
                payWallet.reset();
              }}
            />
            VNPay Sandbox
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="payment-method"
              value="WALLET"
              checked={paymentMethod === "WALLET"}
              onChange={() => {
                setPaymentMethod("WALLET");
                start.reset();
              }}
            />
            Ví của tôi {wallet.data ? `· ${formatVnd(wallet.data.balance)}` : ""}
          </label>
          {wallet.isError && (
            <p className="text-sm">
              Chưa tải được số dư.{" "}
              <button type="button" onClick={() => void wallet.refetch()} className="underline">
                Thử lại
              </button>
            </p>
          )}
          {paymentMethod === "WALLET" && (
            <p className="text-sm text-brand-muted">
              Trả trọn học phí bằng số dư.{" "}
              <Link to={ROUTES.studentWallet} className="font-semibold text-brand-navy underline">
                Nạp tiền vào ví
              </Link>
            </p>
          )}
        </fieldset>
      )}
      {paymentError && <AuthNotice tone="error">{errorMessage(paymentError)}</AuthNotice>}
      {wallet.isError && paymentMethod === "WALLET" && <AuthNotice tone="error">{walletError(wallet.error)}</AuthNotice>}
      {(intentId || returning) && (
        <section className={`${PORTAL_CARD} space-y-4 p-6`} aria-live="polite">
          {(returned.isFetching || detail.isFetching) && <p>Đang kiểm tra kết quả thanh toán…</p>}
          {state && (
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-brand-sandLine pb-4">
              <div>
                <h2 className="text-lg font-bold text-brand-navy">{selected.data?.courseName ?? `Lớp #${state.intent.classGroupId}`}</h2>
                <p className="mt-1 text-sm text-brand-muted">{selected.data?.classCode ?? `Yêu cầu #${state.intent.intentId}`}</p>
              </div>
              <div>
                <p className="text-sm text-brand-muted">Học phí thanh toán</p>
                <p className="text-2xl font-bold text-brand-navy">{formatVnd(state.intent.amount)}</p>
              </div>
            </div>
          )}
          {outcome && <AuthNotice tone={state?.enrollment?.status === "ACTIVE" ? "success" : "info"}>{outcome}</AuthNotice>}
          {returnNotice && <AuthNotice tone="info">{returnNotice}</AuthNotice>}
          {state?.enrollment?.status === "ACTIVE" && (
            <Link to={ROUTES.studentSchedule} className={PORTAL_BTN_PRIMARY}>
              Xem lịch học
            </Link>
          )}
          {pending && (
            <>
              <SeatHold key={state.intent.intentId} expiresAt={state.intent.expiresAt} />
              <p className="flex items-start gap-2 text-sm text-brand-muted">
                <Icon name="lock" className="text-lg" />
                {paymentMethod === "WALLET"
                  ? "Học phí sẽ được trừ sau khi kiểm tra lại số dư, chỗ học và lịch cá nhân."
                  : redirect
                    ? "Đang chuyển đến cổng VNPay. Nếu trang chưa mở, bấm nút bên dưới."
                    : "Thông tin thẻ và OTP được nhập trực tiếp trên trang VNPay. Kết quả sẽ cập nhật sau khi xác nhận."}
              </p>
              <div className="flex flex-wrap gap-3">
                {paymentMethod === "WALLET" ? (
                  <button
                    onClick={() => payWallet.mutate()}
                    disabled={payWallet.isPending || cancel.isPending || start.isPending}
                    className={PORTAL_BTN_PRIMARY}
                  >
                    {payWallet.isPending ? "Đang thanh toán…" : "Thanh toán bằng ví"}
                  </button>
                ) : redirect && Date.parse(redirect.expiresAt) > Date.now() ? (
                  <a href={redirect.paymentUrl} className={PORTAL_BTN_PRIMARY}>
                    Thanh toán tại VNPay Sandbox
                  </a>
                ) : (
                  <button onClick={() => resume.mutate()} disabled={resume.isPending} className={PORTAL_BTN_PRIMARY}>
                    Tiếp tục thanh toán
                  </button>
                )}
                <button
                  onClick={() => cancel.mutate()}
                  disabled={cancel.isPending || resume.isPending || payWallet.isPending || start.isPending}
                  className={PORTAL_BTN_SECONDARY}
                >
                  Hủy yêu cầu
                </button>
              </div>
            </>
          )}
          {intentId && (
            <button onClick={() => void detail.refetch()} className={PORTAL_BTN_SECONDARY}>
              Kiểm tra trạng thái
            </button>
          )}
          {(!pending || detail.isError || returned.isError) && (
            <button onClick={reset} className={PORTAL_BTN_SECONDARY}>
              Chọn lớp khác
            </button>
          )}
        </section>
      )}
      {!pending && !returning && !state?.payment && (
        <>
          {!lockedClassId && (
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-sm">
                Mã môn
                <input
                  className={PORTAL_INPUT}
                  value={subject}
                  onChange={(event) => {
                    setSubject(event.target.value);
                    setPage(0);
                    setClassId(null);
                  }}
                  placeholder="Ví dụ: MATH"
                />
              </label>
              <label className="text-sm">
                Khối lớp
                <select
                  className={PORTAL_INPUT}
                  value={grade}
                  onChange={(event) => {
                    setGrade(event.target.value as GradeLevel | "");
                    setPage(0);
                    setClassId(null);
                  }}
                >
                  <option value="">Tất cả</option>
                  {GRADE_OPTIONS.map((value) => (
                    <option key={value.value} value={value.value}>
                      {value.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Hình thức
                <select
                  className={PORTAL_INPUT}
                  value={mode}
                  onChange={(event) => {
                    setMode(event.target.value as DeliveryMode | "");
                    setPage(0);
                    setClassId(null);
                  }}
                >
                  <option value="">Tất cả</option>
                  {DELIVERY_MODE_OPTIONS.map((value) => (
                    <option key={value.value} value={value.value}>
                      {value.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}
          {lockedClassId && selected.isPending && <p>Đang tải thông tin lớp…</p>}
          {selected.isError && <AuthNotice tone="error">Không tải được lịch của lớp đã chọn.</AuthNotice>}
          {selected.data && (
            <section className={`${PORTAL_CARD} space-y-3 p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-bold text-brand-navy">{selected.data.courseName}</h2>
                  <p className="text-sm text-brand-muted">
                    Mã lớp {selected.data.classCode} · Khai giảng {selected.data.startDate} · Còn {selected.data.spotsLeft} chỗ
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-brand-muted">Học phí dự kiến</p>
                  <p className="text-2xl font-bold text-brand-navy">{formatVnd(selected.data.estimatedFee)}</p>
                </div>
              </div>
              <h3 className="font-semibold text-brand-navy">Lịch học</h3>
              <ul className="max-h-52 overflow-y-auto text-sm">
                {selected.data.sessions?.map((session) => (
                  <li key={session.id}>
                    {session.date} · {session.startTime.slice(0, 5)} – {session.endTime.slice(0, 5)}
                  </li>
                ))}
              </ul>
              <button
                disabled={
                  start.isPending || Boolean(activeId && !state) || selected.data.status !== "ENROLLING" || selected.data.spotsLeft < 1
                }
                onClick={() => start.mutate()}
                className={PORTAL_BTN_PRIMARY}
              >
                {start.isPending ? "Đang xử lý…" : paymentMethod === "WALLET" ? "Thanh toán bằng ví" : "Thanh toán qua VNPay"}
              </button>
            </section>
          )}
          {!lockedClassId && (
            <>
              {catalog.isError && (
                <AuthNotice tone="error">
                  Không tải được danh sách lớp. <button onClick={() => void catalog.refetch()}>Thử lại</button>
                </AuthNotice>
              )}
              {catalog.isPending && <p>Đang tải lớp học…</p>}
              {catalog.data?.content.length === 0 && <p>Chưa có lớp phù hợp đang mở đăng ký.</p>}
              <div className="grid gap-4 md:grid-cols-2">
                {catalog.data?.content.map((group) => (
                  <button
                    key={group.id}
                    aria-pressed={classId === group.id}
                    onClick={() => {
                      setClassId(group.id);
                      attempt.current = null;
                      start.reset();
                    }}
                    className={`${PORTAL_CARD} space-y-2 p-5 text-left ${classId === group.id ? "ring-2 ring-brand-navy" : "hover:border-brand-navy"}`}
                  >
                    <strong className="block text-brand-navy">
                      {group.courseName} · {group.classCode}
                    </strong>
                    <span className="block text-sm">
                      {SCHEDULE_PATTERN_OPTIONS.find((value) => value.value === group.schedulePattern)?.label} · {group.timeSlotLabel}
                    </span>
                    <span className="block text-sm">
                      Khai giảng {group.startDate} · Còn {group.spotsLeft} chỗ
                    </span>
                    <span className="block font-semibold">Học phí {formatVnd(group.basePrice1on1)}</span>
                  </button>
                ))}
              </div>
              {catalog.data && catalog.data.totalPages > 1 && (
                <div className="flex items-center gap-3">
                  <button disabled={page === 0} onClick={() => setPage(page - 1)} className={PORTAL_BTN_SECONDARY}>
                    Trang trước
                  </button>
                  <span>
                    Trang {page + 1}/{catalog.data.totalPages}
                  </span>
                  <button disabled={page + 1 >= catalog.data.totalPages} onClick={() => setPage(page + 1)} className={PORTAL_BTN_SECONDARY}>
                    Trang sau
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
