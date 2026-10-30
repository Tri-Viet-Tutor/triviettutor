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
  reconcileIntent,
  startVnpay,
  verifyVnpayReturn,
} from "@/services/tuitionPaymentService";
import { useAuthStore } from "@/stores/authStore";
import { formatVnd } from "@/utils/currency";
import { Icon } from "@/components/ui/Icon";
import { walletService } from "@/services/walletService";
import { walletError } from "@/utils/wallet";
import { StarRating } from "@/components/ui/StarRating";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { subjectIcon, subjectLabel } from "@/constants/management";
import { formatDate, formatDayMonth, parseIsoDate, weekdayName } from "@/utils/date";
import { displayCode } from "@/utils/classes";

const labelOf = <T extends string>(options: readonly { value: T; label: string }[], value: T) =>
  options.find((option) => option.value === value)?.label ?? value;

/** Câu báo cho các mã lỗi thanh toán thường gặp */
const PAYMENT_ERRORS: Record<string, string> = {
  PAYMENT_GATEWAY_DISABLED: "Cổng VNPay chưa được cấu hình. Vui lòng liên hệ trung tâm.",
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
      <p>Đăng nhập tài khoản học viên đã xác thực để chọn lớp và thanh toán qua VNPay.</p>
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
  // Bấm "Mua ngay" ở trang "Mua khóa học" (?lop=<id>) hoặc "Đăng ký" ở trang chi tiết khóa (?classId=<id>):
  // chỉ thanh toán đúng lớp đó
  const query = new URLSearchParams(search);
  const lopParam = Number(query.get("lop") ?? query.get("classId"));
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
  // IPN chưa về (máy chủ ngủ, sai URL...): hỏi thẳng VNPay kết quả giao dịch rồi ghi danh như IPN
  const recheck = useMutation({
    mutationFn: () => reconcileIntent(intentId!),
    onSuccess: (value) => {
      cache.setQueryData(["tuition-intent", userId, value.intent.intentId], value);
      void cache.invalidateQueries({ queryKey: ["tuition-classes"] });
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
    recheck.reset();
    navigate(ROUTES.studentCheckout, { replace: true });
    void cache.invalidateQueries({ queryKey: ["tuition-classes"] });
  }
  const paymentError = start.error ?? resume.error ?? payWallet.error ?? cancel.error ?? recheck.error ?? returned.error ?? detail.error;
  // Same cases the backend reconcile can still settle: nothing paid yet, or only a failed VNPay result recorded
  const canRecheck =
    Boolean(intentId) &&
    (state?.payment
      ? state.payment.method === "VNPAY" && state.payment.status === "FAILED"
      : paymentMethod === "VNPAY" && (state?.intent.status === "PENDING" || state?.intent.status === "EXPIRED"));
  const paid = state?.payment;
  const outcome =
    paid?.status === "REQUIRES_REFUND"
      ? "VNPay đã ghi nhận thanh toán. Yêu cầu cần hoàn tiền; trung tâm sẽ xử lý."
      : paid?.status === "FAILED"
        ? "Thanh toán không thành công. Bạn có thể tạo yêu cầu mới, hoặc bấm “Kiểm tra lại” nếu tài khoản đã bị trừ tiền."
        : paid?.status === "REFUNDED"
          ? "Học phí đã được hoàn lại."
          : paid?.status === "PARTIALLY_REFUNDED"
            ? "Học phí đã được hoàn lại một phần."
            : state?.enrollment?.status === "ACTIVE"
              ? "Thanh toán thành công. Bạn đã được ghi danh vào lớp."
              : state?.intent.status === "EXPIRED"
                ? "Yêu cầu đã hết hạn hoặc được hủy; chỗ giữ đã được giải phóng. Nếu bạn đã thanh toán trên VNPay, bấm “Kiểm tra lại”."
                : null;

  const busy = start.isPending || resume.isPending || payWallet.isPending || Boolean(redirect);
  const course = selected.data;
  const fee = state?.intent.amount ?? course?.estimatedFee ?? 0;
  const balance = wallet.data?.balance;
  const walletShort = paymentMethod === "WALLET" && balance !== undefined && balance < fee;
  // Bước hiện tại: 1 chọn lớp, 2 thanh toán, 3 đã ghi danh
  const step = state?.enrollment?.status === "ACTIVE" ? 3 : summaryClassId ? 2 : 1;

  /** Chọn VNPay hoặc ví — hiện khi chưa có kết quả thanh toán */
  const methods = !state?.payment && !returning && (
    <fieldset disabled={busy} className="min-w-0 space-y-2.5">
      <legend className="mb-2.5 text-[13px] font-bold uppercase tracking-wide text-brand-muted">Phương thức thanh toán</legend>
      {[
        {
          value: "VNPAY" as const,
          icon: "credit_card",
          title: "VNPay",
          hint: "Thẻ ATM, thẻ quốc tế hoặc QR",
          onPick: () => {
            setPaymentMethod("VNPAY");
            payWallet.reset();
          },
        },
        {
          value: "WALLET" as const,
          icon: "account_balance_wallet",
          title: "Ví của tôi",
          hint: wallet.isPending ? "Đang tải số dư…" : balance !== undefined ? `Số dư ${formatVnd(balance)}` : "Chưa tải được số dư",
          onPick: () => {
            setPaymentMethod("WALLET");
            start.reset();
          },
        },
      ].map((option) => {
        const checked = paymentMethod === option.value;
        return (
          <label
            key={option.value}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors ${
              checked ? "border-brand-navy bg-brand-tint/60 ring-1 ring-brand-navy" : "border-brand-sandLine bg-white hover:border-brand-navy/40"
            }`}
          >
            <input
              type="radio"
              name="payment-method"
              value={option.value}
              checked={checked}
              onChange={option.onPick}
              className="sr-only"
            />
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                checked ? "bg-brand-navy text-white" : "bg-brand-sand text-brand-navy"
              }`}
            >
              <Icon name={option.icon} className="text-[21px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-bold text-brand-ink">{option.title}</span>
              <span className="block truncate text-[12.5px] text-brand-muted">{option.hint}</span>
            </span>
            <Icon
              name={checked ? "radio_button_checked" : "radio_button_unchecked"}
              className={`text-[22px] ${checked ? "text-brand-navy" : "text-slate-300"}`}
            />
          </label>
        );
      })}
      {wallet.isError && (
        <p className="text-[13px] text-brand-muted">
          Chưa tải được số dư.{" "}
          <button type="button" onClick={() => void wallet.refetch()} className="font-semibold text-brand-navy underline">
            Thử lại
          </button>
        </p>
      )}
      {walletShort && (
        <p className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
          <Icon name="info" className="mt-px text-[17px]" />
          <span>
            Số dư còn thiếu {formatVnd(fee - (balance ?? 0))}.{" "}
            <Link to={ROUTES.studentWallet} className="font-semibold underline">
              Nạp tiền vào ví
            </Link>
          </span>
        </p>
      )}
    </fieldset>
  );

  return (
    <div className="space-y-6">
      <header>
        <Link
          to={shopTo}
          className="inline-flex items-center gap-1 rounded-md text-[14px] font-semibold text-brand-navy hover:text-brand-navyDeep focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-navy"
        >
          <Icon name="arrow_back" className="text-[18px]" />
          Chọn khóa học khác
        </Link>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[28px] font-extrabold tracking-tight text-brand-navy sm:text-[32px]">Thanh toán học phí</h1>
            </div>
            <p className="mt-1 text-[14.5px] text-brand-muted">Kiểm tra lớp và lịch học, chọn cách thanh toán để giữ chỗ và ghi danh.</p>
          </div>
          {/* Các bước đăng ký */}
          <ol className="flex items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold sm:gap-2">
            {["Chọn lớp", "Thanh toán", "Ghi danh"].map((label, index) => {
              const n = index + 1;
              const done = n < step;
              const current = n === step;
              return (
                <li key={label} className="flex items-center gap-2">
                  {index > 0 && <span aria-hidden="true" className={`h-px w-3 sm:w-6 ${done || current ? "bg-brand-navy" : "bg-slate-300"}`} />}
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] ${
                      done ? "bg-emerald-600 text-white" : current ? "bg-brand-navy text-white" : "bg-slate-200 text-brand-muted"
                    }`}
                  >
                    {done ? <Icon name="check" className="text-[15px]" /> : n}
                  </span>
                  <span className={current ? "text-brand-navy" : "text-brand-muted"} aria-current={current ? "step" : undefined}>
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </header>

      {paymentError && <AuthNotice tone="error">{errorMessage(paymentError)}</AuthNotice>}
      {wallet.isError && paymentMethod === "WALLET" && <AuthNotice tone="error">{walletError(wallet.error)}</AuthNotice>}

      {/* Yêu cầu thanh toán đang dở hoặc kết quả từ VNPay */}
      {(intentId || returning) && (
        <section className={`${PORTAL_CARD} overflow-hidden`} aria-live="polite">
          {state && (
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-brand-sandLine bg-brand-sand/50 px-5 py-4 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white">
                  <Icon name={course ? subjectIcon(course.subject) : "receipt_long"} className="text-[22px]" />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-[17px] font-extrabold text-brand-ink">{course?.courseName ?? `Lớp ${displayCode("class", state.intent.classGroupId)}`}</h2>
                  <p className="text-[13px] text-brand-muted">
                    {course?.classCode ?? "Lớp"} - Yêu cầu {displayCode("intent", state.intent.intentId)}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[12.5px] text-brand-muted">Học phí thanh toán</p>
                <p className="text-[24px] font-extrabold tabular-nums text-brand-navy">{formatVnd(state.intent.amount)}</p>
              </div>
            </div>
          )}
          <div className="space-y-4 p-5 sm:p-6">
            {(returned.isFetching || detail.isFetching) && (
              <p className="flex items-center gap-2 text-[14px] text-brand-muted">
                <Icon name="progress_activity" className="animate-spin text-[18px]" />
                Đang kiểm tra kết quả thanh toán…
              </p>
            )}
            {outcome && <AuthNotice tone={state?.enrollment?.status === "ACTIVE" ? "success" : "info"}>{outcome}</AuthNotice>}
            {returnNotice && <AuthNotice tone="info">{returnNotice}</AuthNotice>}
            {pending && (
              <>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-brand-tint/60 px-4 py-3">
                  <Icon name="timer" className="text-[22px] text-brand-navy" />
                  <SeatHold key={state.intent.intentId} expiresAt={state.intent.expiresAt} />
                </div>
                {methods && <div className="max-w-md">{methods}</div>}
                <p className="flex items-start gap-2 text-[13.5px] text-brand-muted">
                  <Icon name="lock" className="text-[18px]" />
                  {paymentMethod === "WALLET"
                    ? "Học phí sẽ được trừ sau khi kiểm tra lại số dư, chỗ học và lịch cá nhân."
                    : redirect
                      ? "Đang chuyển đến cổng VNPay. Nếu trang chưa mở, bấm nút bên dưới."
                      : "Thông tin thẻ và OTP được nhập trực tiếp trên trang VNPay. Kết quả sẽ cập nhật sau khi xác nhận."}
                </p>
              </>
            )}
            <div className="flex flex-wrap gap-3">
              {state?.enrollment?.status === "ACTIVE" && (
                <Link to={ROUTES.studentSchedule} className={PORTAL_BTN_PRIMARY}>
                  <Icon name="calendar_month" className="text-[18px]" />
                  Xem lịch học
                </Link>
              )}
              {pending &&
                (paymentMethod === "WALLET" ? (
                  <button
                    onClick={() => payWallet.mutate()}
                    disabled={payWallet.isPending || cancel.isPending || start.isPending || walletShort}
                    className={PORTAL_BTN_PRIMARY}
                  >
                    {payWallet.isPending ? "Đang thanh toán…" : "Thanh toán bằng ví"}
                  </button>
                ) : redirect && Date.parse(redirect.expiresAt) > Date.now() ? (
                  <a href={redirect.paymentUrl} className={PORTAL_BTN_PRIMARY}>
                    Thanh toán tại VNPay
                  </a>
                ) : (
                  <button onClick={() => resume.mutate()} disabled={resume.isPending} className={PORTAL_BTN_PRIMARY}>
                    Tiếp tục thanh toán
                  </button>
                ))}
              {intentId && (
                <button onClick={() => void detail.refetch()} className={PORTAL_BTN_SECONDARY}>
                  <Icon name="refresh" className="text-[18px]" />
                  Kiểm tra trạng thái
                </button>
              )}
              {pending && (
                <button
                  onClick={() => cancel.mutate()}
                  disabled={cancel.isPending || resume.isPending || payWallet.isPending || start.isPending}
                  className={`${PORTAL_BTN_SECONDARY} text-red-700 hover:border-red-300 hover:bg-red-50`}
                >
                  Hủy yêu cầu
                </button>
              )}
              {canRecheck && (
                <button onClick={() => recheck.mutate()} disabled={recheck.isPending} className={PORTAL_BTN_SECONDARY}>
                  <Icon name="sync" className="text-[18px]" />
                  {recheck.isPending ? "Đang hỏi VNPay…" : "Kiểm tra lại"}
                </button>
              )}
              {(!pending || detail.isError || returned.isError) && (
                <button onClick={reset} className={PORTAL_BTN_SECONDARY}>
                  Chọn lớp khác
                </button>
              )}
            </div>
            {canRecheck && (
              <p className="text-[13px] text-brand-muted">
                {recheck.isSuccess && recheck.data.intent.status !== "COMPLETED"
                  ? "VNPay chưa ghi nhận giao dịch thành công cho yêu cầu này."
                  : "Đã thanh toán nhưng chưa được ghi danh? Hệ thống sẽ hỏi lại VNPay kết quả giao dịch."}
              </p>
            )}
          </div>
        </section>
      )}

      {!pending && !returning && !state?.payment && (
        <>
          {!lockedClassId && (
            <div className={`${PORTAL_CARD} grid gap-3 p-4 sm:grid-cols-3`}>
              <label className="text-[13px] font-semibold text-brand-ink">
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
              <label className="text-[13px] font-semibold text-brand-ink">
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
              <label className="text-[13px] font-semibold text-brand-ink">
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
          {lockedClassId && selected.isPending && (
            <div className="grid animate-pulse gap-6 lg:grid-cols-[minmax(0,1fr)_360px]" aria-hidden="true">
              <div className={`${PORTAL_CARD} h-80`} />
              <div className={`${PORTAL_CARD} h-80`} />
            </div>
          )}
          {selected.isError && <AuthNotice tone="error">Không tải được lịch của lớp đã chọn.</AuthNotice>}
          {course && (
            <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              {/* Thông tin lớp */}
              <section className={`${PORTAL_CARD} overflow-hidden`}>
                <div className="flex items-start gap-4 p-5 sm:p-6">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-navy text-white">
                    <Icon name={subjectIcon(course.subject)} className="text-[28px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-bold uppercase tracking-[0.1em] text-brand-navy/80">
                      {subjectLabel(course.subject)} - {labelOf(GRADE_OPTIONS, course.gradeLevel)} - {course.classType === "ONE_ON_ONE" ? "1 kèm 1" : "Lớp nhóm"}
                    </p>
                    <h2 className="mt-0.5 text-[21px] font-extrabold leading-snug tracking-tight text-brand-ink">{course.courseName}</h2>
                    <p className="mt-0.5 text-[13px] text-brand-muted">Mã lớp {course.classCode}</p>
                    {course.tutorName && (
                      <p className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[14px] text-brand-ink">
                        <UserAvatar userId={course.tutorId} name={course.tutorName} size={28} />
                        Gia sư <strong className="font-semibold">{course.tutorName}</strong>
                        {course.tutorRating != null && (course.tutorRatingCount ?? 0) > 0 && (
                          <span className="flex items-center gap-1 text-[13px] text-brand-muted">
                            <StarRating value={course.tutorRating} />
                            {course.tutorRating.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <dl className="grid grid-cols-2 gap-px border-y border-brand-sandLine bg-brand-sandLine sm:grid-cols-4">
                  {[
                    { icon: "rocket_launch", label: "Khai giảng", value: formatDate(parseIsoDate(course.startDate)) },
                    { icon: "calendar_month", label: "Lịch học", value: labelOf(SCHEDULE_PATTERN_OPTIONS, course.schedulePattern) },
                    { icon: "schedule", label: "Giờ học", value: course.timeSlotLabel },
                    { icon: "location_on", label: "Hình thức", value: labelOf(DELIVERY_MODE_OPTIONS, course.deliveryMode) },
                  ].map((fact) => (
                    <div key={fact.label} className="bg-white px-5 py-3">
                      <dt className="flex items-center gap-1 text-[12px] text-brand-muted">
                        <Icon name={fact.icon} className="text-[16px] text-brand-navy/70" />
                        {fact.label}
                      </dt>
                      <dd className="mt-0.5 text-[14.5px] font-bold text-brand-ink">{fact.value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-[15px] font-bold text-brand-navy">Lịch các buổi học</h3>
                    <p className="text-[13px] text-brand-muted">
                      {course.sessions?.length ?? course.totalSessions} buổi - còn {course.spotsLeft}/{course.maxStudents} chỗ
                    </p>
                  </div>
                  {course.sessions && course.sessions.length > 0 ? (
                    <ol className="mt-3 grid max-h-[300px] grid-cols-1 gap-2 overflow-y-auto pr-1 min-[420px]:grid-cols-2 sm:grid-cols-3 xl:grid-cols-4">
                      {course.sessions.map((session, index) => {
                        const day = parseIsoDate(session.date);
                        return (
                          <li key={session.id} className="flex items-center gap-2.5 rounded-xl border border-brand-sandLine bg-brand-sand/40 px-3 py-2">
                            <span className="flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg bg-white text-brand-navy shadow-sm">
                              <span className="text-[10px] font-bold leading-none">{weekdayName(day, true)}</span>
                              <span className="text-[13px] font-extrabold leading-tight">{day.getDate()}</span>
                            </span>
                            <span className="min-w-0 text-[12.5px] leading-tight">
                              <span className="block font-semibold text-brand-ink">
                                Buổi {session.sessionNumber ?? index + 1} - {formatDayMonth(day)}
                              </span>
                              <span className="text-brand-muted">
                                {session.startTime.slice(0, 5)} – {session.endTime.slice(0, 5)}
                              </span>
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  ) : (
                    <p className="mt-3 text-[13.5px] text-brand-muted">Lịch chi tiết sẽ có khi trung tâm xếp xong các buổi.</p>
                  )}
                </div>
              </section>

              {/* Tóm tắt thanh toán */}
              <aside className={`${PORTAL_CARD} p-5 sm:p-6 lg:sticky lg:top-24`}>
                <h2 className="text-[16px] font-extrabold text-brand-navy">Tóm tắt thanh toán</h2>
                <dl className="mt-4 space-y-2 text-[14px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-brand-muted">
                      Học phí {course.totalSessions} buổi
                      {course.pricePerSession ? ` × ${formatVnd(course.pricePerSession)}` : ""}
                    </dt>
                    <dd className="font-semibold tabular-nums text-brand-ink">{formatVnd(course.estimatedFee)}</dd>
                  </div>
                  <div className="border-t border-dashed border-brand-sandLine pt-3">
                    <dt className="text-[13px] font-semibold text-brand-muted">Tổng thanh toán</dt>
                    <dd className="mt-0.5 text-[28px] font-extrabold leading-tight tabular-nums text-brand-navy">{formatVnd(course.estimatedFee)}</dd>
                  </div>
                </dl>
                {course.classType !== "ONE_ON_ONE" && (
                  <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-emerald-50 px-3 py-2 text-[12.5px] leading-relaxed text-emerald-800">
                    <Icon name="savings" className="mt-px text-[16px]" />
                    Khi lớp chốt sĩ số, bạn được hoàn vào ví 20% (2–3 người), 35% (4–5 người) hoặc 40% (6–8 người) học phí.
                  </p>
                )}

                <div className="mt-5">{methods}</div>

                <button
                  disabled={
                    start.isPending ||
                    Boolean(activeId && !state) ||
                    course.status !== "ENROLLING" ||
                    course.spotsLeft < 1 ||
                    walletShort
                  }
                  onClick={() => start.mutate()}
                  className={`${PORTAL_BTN_PRIMARY} mt-5 h-12 w-full text-[15px]`}
                >
                  <Icon name={paymentMethod === "WALLET" ? "account_balance_wallet" : "lock"} className="text-[19px]" />
                  {start.isPending
                    ? "Đang xử lý…"
                    : paymentMethod === "WALLET"
                      ? "Thanh toán bằng ví"
                      : "Thanh toán qua VNPay"}
                </button>
                <p className="mt-3 flex items-start gap-1.5 text-[12px] leading-relaxed text-brand-muted">
                  <Icon name="verified_user" className="mt-px text-[15px]" />
                  Chỗ của bạn được giữ trong lúc thanh toán. Thông tin thẻ chỉ nhập trên trang VNPay.
                </p>
              </aside>
            </div>
          )}
          {!lockedClassId && (
            <>
              {catalog.isError && (
                <AuthNotice tone="error">
                  Không tải được danh sách lớp. <button onClick={() => void catalog.refetch()}>Thử lại</button>
                </AuthNotice>
              )}
              {catalog.isPending && <p className="text-brand-muted">Đang tải lớp học…</p>}
              {catalog.data?.content.length === 0 && <p className="text-brand-muted">Chưa có lớp phù hợp đang mở đăng ký.</p>}
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
                    className={`${PORTAL_CARD} space-y-1.5 p-5 text-left transition-colors ${
                      classId === group.id ? "ring-2 ring-brand-navy" : "hover:border-brand-navy/40"
                    }`}
                  >
                    <strong className="block text-[15.5px] text-brand-navy">{group.courseName}</strong>
                    <span className="block text-[13px] text-brand-muted">Mã lớp {group.classCode}</span>
                    <span className="block text-[13.5px] text-brand-ink">
                      {labelOf(SCHEDULE_PATTERN_OPTIONS, group.schedulePattern)} - {group.timeSlotLabel}
                    </span>
                    <span className="block text-[13.5px] text-brand-ink">
                      Khai giảng {formatDate(parseIsoDate(group.startDate))} - Còn {group.spotsLeft} chỗ
                    </span>
                    <span className="block pt-1 text-[15px] font-extrabold tabular-nums text-brand-navy">{formatVnd(group.estimatedFee)}</span>
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
