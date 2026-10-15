import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { EmailOtpForm } from "@/components/auth/EmailOtpForm";
import { CheckoutCreateAccountForm } from "@/components/checkout/CheckoutCreateAccountForm";
import { CheckoutCustomerForm } from "@/components/checkout/CheckoutCustomerForm";
import { CheckoutPaymentForm } from "@/components/checkout/CheckoutPaymentForm";
import { CheckoutSteps } from "@/components/checkout/CheckoutSteps";
import { OrderSummary } from "@/components/checkout/OrderSummary";
import { Fireworks } from "@/components/motion";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/constants/routes";
import type { AuthLocationState } from "@/interfaces/auth";
import type { CustomerInfo, PaidCustomer, PaidOrder, CheckoutFlowProps } from "@/interfaces/checkout";
import { fetchVnpayResult, hasVnpayReturn } from "@/services/orderService";
import { useAuthStore } from "@/stores/authStore";
import { useCartStore } from "@/stores/cartStore";
import { cartCourses } from "@/utils/checkout";
import { formatVnd } from "@/utils/currency";
import { clearPendingEmail, pendingResumesCheckout, readPendingEmail } from "@/utils/pendingEmail";

/** Khung thẻ trắng của từng bước */
const CARD = "rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_24px_48px_-36px_rgba(8,42,102,0.45)] sm:p-8";

/** Liên kết dạng nút chính */
const PRIMARY_LINK =
  "inline-flex h-11 items-center justify-center rounded-md bg-brand-navy px-6 text-[15px] font-semibold text-white transition-colors hover:bg-brand-navyDeep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

/** Khách chưa có tài khoản: thanh toán xong mới tạo tài khoản. Học viên đã đăng nhập thì không có bước cuối. */
const GUEST_STEPS = ["Thông tin học viên", "Thanh toán", "Tạo tài khoản"];

const STUDENT_STEPS = GUEST_STEPS.slice(0, 2);

/** Vị trí bước "Tạo tài khoản" */
const ACCOUNT_STEP = 2;

/** Thanh toán thật: VNPay có thể báo kết quả cho máy chủ chậm vài giây, nên hỏi lại mỗi 3 giây trong tối đa 1 phút */
const VNPAY_RECHECK_MS = 3000;

const VNPAY_WAIT_MS = 60_000;

/**
 * Toàn bộ luồng thanh toán các khóa trong giỏ — trang công khai và trang trong khu học viên dùng chung.
 *   1. Thông tin học viên — chỉ điền, chưa tạo tài khoản; không lưu lại, rời trang là phải điền lại.
 *   2. Thanh toán qua VNPay bằng thẻ hoặc mã QR (đang là demo); xong thì bắn pháo hoa.
 *   3. Khách chưa có tài khoản: đặt mật khẩu, nhập mã OTP gửi qua email, rồi mới đăng nhập được.
 * Học viên đã đăng nhập chỉ đi bước 1 và 2.
 *
 * Thanh toán thật (tắt demo): bước 2 chuyển sang trang VNPay; VNPay trả người mua về lại trang này kèm
 * các tham số vnp_..., trang gửi chúng cho máy chủ kiểm tra rồi mới hiện kết quả.
 */
export function CheckoutFlow({ shopTo = ROUTES.pricing, stickyTopClassName = "lg:top-[150px]" }: CheckoutFlowProps) {
  const user = useAuthStore((state) => state.user);
  const subjects = useCartStore((state) => state.subjects);
  const removeFromCart = useCartStore((state) => state.remove);
  const clearCart = useCartStore((state) => state.clear);

  // Thông tin bước 1 chỉ nằm trong bộ nhớ của trang này
  const [customer, setCustomer] = useState<CustomerInfo | null>(null);
  // Đang ở bước 1 (điền / sửa thông tin)?
  const [editingCustomer, setEditingCustomer] = useState(true);
  // Đơn vừa thanh toán xong ở bản demo (thanh toán thật lấy kết quả từ máy chủ, xem `vnpay` bên dưới)
  const [demoPaidOrder, setDemoPaidOrder] = useState<PaidOrder | null>(null);
  // Tài khoản vừa tạo sau khi thanh toán, đang chờ nhập mã OTP. Giỏ trống + còn email chờ mã
  // nghĩa là trang vừa được tải lại giữa bước tạo tài khoản, nên quay lại đúng bước đó.
  const [verifyingEmail, setVerifyingEmail] = useState(() => (pendingResumesCheckout() && subjects.length === 0 ? readPendingEmail() : ""));
  // Email của tài khoản đã kích hoạt xong
  const [readyEmail, setReadyEmail] = useState("");

  const courses = cartCourses(subjects);
  const isStudent = user?.role === "ROLE_STUDENT";
  const account = user && isStudent ? { fullName: user.fullName, email: user.email } : undefined;

  // VNPay vừa trả người mua về: hỏi máy chủ kết quả. Giữ nguyên tham số trên đường dẫn để tải lại trang vẫn hỏi lại được.
  const { search } = useLocation();
  const returnSearch = hasVnpayReturn(search) ? search : "";
  // Mốc mở trang — để giới hạn thời gian chờ VNPay xác nhận
  const [openedAt] = useState(() => Date.now());
  const vnpay = useQuery({
    queryKey: ["vnpay-return", returnSearch],
    queryFn: () => fetchVnpayResult(returnSearch),
    enabled: returnSearch !== "",
    retry: false,
    staleTime: Infinity,
    refetchInterval: (query) =>
      query.state.data?.status === "PENDING_PAYMENT" && Date.now() - openedAt < VNPAY_WAIT_MS ? VNPAY_RECHECK_MS : false,
  });
  const returned = vnpay.data;
  const returnedPaid = returned?.status === "PAID";
  const awaitingVnpay =
    returnSearch !== "" && (vnpay.isPending || (returned?.status === "PENDING_PAYMENT" && vnpay.dataUpdatedAt - openedAt < VNPAY_WAIT_MS));

  // Đơn đã thanh toán: bản demo lấy từ state, thanh toán thật lấy từ kết quả máy chủ
  const paidOrder: PaidOrder | null =
    demoPaidOrder ?? (returned && returnedPaid ? { orderCode: returned.orderCode, amount: returned.amount, demo: false } : null);
  // Người mua để tạo tài khoản ở bước 3: bản demo lấy từ bước 1, thanh toán thật lấy từ đơn trên máy chủ
  const paidCustomer: PaidCustomer | null =
    customer ?? (returned && returnedPaid ? { fullName: returned.fullName, email: returned.email } : null);

  // Mở trang thì cuộn lên đầu
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  // Thanh toán thật thành công thì làm trống giỏ
  useEffect(() => {
    if (returnedPaid) clearCart();
  }, [returnedPaid, clearCart]);

  /** Bản demo thanh toán xong: lưu đơn, làm trống giỏ, cuộn lên đầu */
  function handlePaid(order: PaidOrder) {
    setDemoPaidOrder(order);
    clearCart();
    window.scrollTo({ top: 0 });
  }

  // Thanh toán thật không thành công: báo ở đầu trang, giỏ vẫn còn để thử lại
  const returnNotice =
    returnSearch === "" || awaitingVnpay || returnedPaid ? null : vnpay.isError ? (
      <AuthNotice tone="error">Không xác minh được kết quả thanh toán. Nếu đã bị trừ tiền, hãy liên hệ trung tâm.</AuthNotice>
    ) : returned?.status === "PENDING_PAYMENT" ? (
      <AuthNotice tone="info">VNPay chưa xác nhận xong giao dịch. Hãy tải lại trang sau ít phút.</AuthNotice>
    ) : (
      <AuthNotice tone="error">Thanh toán chưa thành công. Bạn có thể thử lại.</AuthNotice>
    );

  // Dải xanh báo đã thanh toán, đặt ở đầu các bước sau thanh toán
  const paidBanner = paidOrder && (
    <p className="mb-6 flex items-start gap-2.5 rounded-md border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-[14.5px] text-emerald-900">
      <Icon name="check_circle" className="mt-px text-[20px] text-emerald-600" />
      <span>
        <strong className="font-semibold">{paidOrder.demo ? "Đã ghi nhận thanh toán (demo)" : "Thanh toán thành công"}</strong>
        <span className="block text-[13.5px]">
          Đơn {paidOrder.orderCode} · {formatVnd(paidOrder.amount)}
        </span>
      </span>
    </p>
  );

  // Chọn nội dung theo trạng thái của luồng (thứ tự kiểm tra quan trọng)
  let content: ReactNode;
  if (readyEmail) {
    // Bước 3 xong: tài khoản đã kích hoạt, giờ mới đăng nhập
    content = (
      <div className={`mx-auto mt-8 max-w-xl ${CARD}`}>
        <CheckoutSteps steps={GUEST_STEPS} active={GUEST_STEPS.length} />
        <div className="text-center">
          <Icon name="how_to_reg" className="text-[52px] text-emerald-600" />
          <h2 className="mt-2 text-[22px] font-bold text-brand-navy">Tài khoản đã sẵn sàng</h2>
          <p className="mt-2 break-all text-[15px] text-brand-muted">{readyEmail}</p>
          <Link
            to={ROUTES.login}
            state={{ email: readyEmail, notice: "Tài khoản đã kích hoạt. Đăng nhập để xem lịch học." } satisfies AuthLocationState}
            className={`mt-6 ${PRIMARY_LINK}`}
          >
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  } else if (awaitingVnpay) {
    // Đang chờ máy chủ xác minh kết quả VNPay
    content = (
      <div className={`mx-auto mt-8 max-w-lg text-center ${CARD}`} role="status">
        <Icon name="hourglass_top" className="text-[44px] text-brand-navy" />
        <h2 className="mt-2 text-[20px] font-bold text-brand-navy">Đang kiểm tra thanh toán…</h2>
      </div>
    );
  } else if (!user && verifyingEmail) {
    // Bước 3: nhập mã OTP ngay tại đây; mã đúng thì tài khoản được kích hoạt
    content = (
      <div className={`mx-auto mt-8 max-w-xl ${CARD}`}>
        <CheckoutSteps steps={GUEST_STEPS} active={ACCOUNT_STEP} />
        {paidBanner}
        <h2 className="mb-2 text-[19px] font-bold text-brand-navy">Nhập mã xác thực</h2>
        <EmailOtpForm
          key={verifyingEmail}
          email={verifyingEmail}
          align="left"
          signIn={false}
          onVerified={(response) => {
            setVerifyingEmail("");
            setReadyEmail(response.user.email);
          }}
          onChangeEmail={() => {
            clearPendingEmail();
            setVerifyingEmail("");
          }}
        />
      </div>
    );
  } else if (paidOrder && !user && returned?.accountExists) {
    // Thanh toán thật bằng email đã có tài khoản: chỉ cần đăng nhập
    content = (
      <div className={`mx-auto mt-8 max-w-xl ${CARD}`}>
        {paidBanner}
        <div className="text-center">
          <p className="text-[15px] text-brand-muted">
            <span className="break-all font-semibold text-brand-navy">{returned.email}</span> đã có tài khoản.
          </p>
          <Link to={ROUTES.login} state={{ email: returned.email } satisfies AuthLocationState} className={`mt-5 ${PRIMARY_LINK}`}>
            Đăng nhập
          </Link>
        </div>
      </div>
    );
  } else if (paidOrder && !user && paidCustomer) {
    // Bước 3: thanh toán xong mới được đặt mật khẩu tạo tài khoản
    content = (
      <div className={`mx-auto mt-8 max-w-xl ${CARD}`}>
        <CheckoutSteps steps={GUEST_STEPS} active={ACCOUNT_STEP} />
        {paidBanner}
        <h2 className="mb-4 text-[19px] font-bold text-brand-navy">Tạo mật khẩu để vào học</h2>
        <CheckoutCreateAccountForm fullName={paidCustomer.fullName} email={paidCustomer.email} onRegistered={setVerifyingEmail} />
      </div>
    );
  } else if (paidOrder) {
    // Học viên đã đăng nhập: thanh toán xong là hết
    content = (
      <div className={`mx-auto mt-8 max-w-lg text-center ${CARD}`}>
        <Icon name="check_circle" className="text-[52px] text-emerald-600" />
        <h2 className="mt-2 text-[22px] font-bold text-brand-navy">
          {paidOrder.demo ? "Đã ghi nhận thanh toán (demo)" : "Thanh toán thành công"}
        </h2>
        <p className="mt-2 text-[15px] leading-relaxed text-brand-muted">
          Đơn {paidOrder.orderCode} · {formatVnd(paidOrder.amount)}.{" "}
          {paidOrder.demo ? "Đây là bản demo nên chưa có giao dịch và chưa ghi danh vào lớp." : "Lịch học sẽ hiện trong tài khoản của bạn."}
        </p>
        <Link to={ROUTES.studentSchedule} className={`mt-6 ${PRIMARY_LINK}`}>
          Xem lịch học
        </Link>
      </div>
    );
  } else if (courses.length === 0) {
    // Chưa thanh toán mà giỏ trống
    content = (
      <div className={`mx-auto mt-8 max-w-lg text-center ${CARD}`}>
        <Icon name="shopping_cart" className="text-[48px] text-slate-300" />
        <h2 className="mt-2 text-[20px] font-bold text-brand-navy">Giỏ đang trống</h2>
        <p className="mt-2 text-[15px] text-brand-muted">Chọn khóa học trước khi thanh toán.</p>
        <Link to={shopTo} className={`mt-6 ${PRIMARY_LINK}`}>
          Chọn khóa học
        </Link>
      </div>
    );
  } else {
    // Bước 1 hoặc 2: form bên trái, đơn hàng dính bên phải
    const fillingInfo = editingCustomer || !customer;
    content = (
      <div className="mt-8 grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
        <section className={`lg:col-span-7 ${CARD}`}>
          <CheckoutSteps steps={user ? STUDENT_STEPS : GUEST_STEPS} active={fillingInfo ? 0 : 1} />

          {user && !isStudent ? (
            <p className="rounded-md border border-slate-200 bg-slate-50 px-3.5 py-3 text-[14.5px] text-brand-ink">
              Chỉ tài khoản học viên mới mua được khóa học.
            </p>
          ) : fillingInfo ? (
            <CheckoutCustomerForm
              // Đăng nhập / đăng xuất thì form làm lại từ đầu
              key={account?.email ?? "guest"}
              account={account}
              initial={customer}
              onSubmit={(info) => {
                setCustomer(info);
                setEditingCustomer(false);
              }}
            />
          ) : (
            // key theo giỏ: đổi giỏ thì mã thanh toán đang hiện bị bỏ, phải tạo mã mới cho số tiền mới
            <CheckoutPaymentForm
              key={subjects.join(",")}
              courses={courses}
              customer={customer}
              onEditCustomer={() => setEditingCustomer(true)}
              onPaid={handlePaid}
            />
          )}
        </section>

        <aside className={`lg:sticky ${stickyTopClassName} lg:col-span-5 ${CARD}`}>
          <h2 className="text-[17px] font-bold text-brand-navy">Đơn hàng</h2>
          <div className="mt-2">
            <OrderSummary courses={courses} onRemove={removeFromCart} />
          </div>
        </aside>
      </div>
    );
  }

  return (
    <>
      {paidOrder && <Fireworks />}
      <Link
        to={shopTo}
        className="group inline-flex items-center gap-1.5 rounded text-[14px] font-medium text-brand-navy/80 transition-colors hover:text-brand-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-navy"
      >
        <Icon name="arrow_back" className="text-[18px] transition-transform duration-200 group-hover:-translate-x-0.5" />
        Chọn thêm khóa học
      </Link>
      <h1 className="mt-3 text-[30px] font-bold leading-tight tracking-tight text-brand-navy lg:text-[36px]">Thanh toán</h1>
      {returnNotice && <div className="mt-6 max-w-2xl">{returnNotice}</div>}
      {content}
    </>
  );
}
