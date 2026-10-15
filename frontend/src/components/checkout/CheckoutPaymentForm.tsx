import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { VnpayCodePanel } from "@/components/checkout/VnpayCodePanel";
import { Icon } from "@/components/ui/Icon";
import { AUTH_TEXT_LINK } from "@/constants/classNames";
import { DELIVERY_MODE_OPTIONS, GRADE_OPTIONS } from "@/constants/classOptions";
import { ROUTES } from "@/constants/routes";
import type { AuthLocationState } from "@/interfaces/auth";
import type { PendingPayment, CheckoutPaymentFormProps } from "@/interfaces/checkout";
import { confirmPayment, createVnpayPayment } from "@/services/orderService";
import { cartTotal } from "@/utils/checkout";
import { formatVnd } from "@/utils/currency";
import { authErrorCode } from "@/utils/errors";

/**
 * Bước 2 của thanh toán: bấm "Tạo mã VNPay" rồi thanh toán bằng thẻ ATM nội địa (thẻ + mã OTP)
 * hoặc quét mã QR. Xem services/orderService.ts về chế độ demo.
 */
export function CheckoutPaymentForm({ courses, customer, onEditCustomer, onPaid }: CheckoutPaymentFormProps) {
  // Mã thanh toán đã tạo; null là chưa tạo
  const [payment, setPayment] = useState<PendingPayment | null>(null);

  const create = useMutation({ mutationFn: createVnpayPayment });
  const confirm = useMutation({ mutationFn: confirmPayment });

  /** Tạo mã thanh toán (lần đầu hoặc khi mã hết hạn) */
  function createCode() {
    confirm.reset();
    create.mutate({ courses, customer }, { onSuccess: setPayment });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    createCode();
  }

  const emailTaken = Boolean(create.error) && authErrorCode(create.error) === "EMAIL_ALREADY_EXISTS";

  const gradeLabel = GRADE_OPTIONS.find((grade) => grade.value === customer.gradeLevel)?.label;
  const modeLabel = DELIVERY_MODE_OPTIONS.find((mode) => mode.value === customer.deliveryMode)?.label;

  // Dòng tóm tắt thông tin học viên, kèm nút sửa khi chưa tạo mã
  const customerLine = (
    <div className="flex items-start gap-2.5 rounded-md bg-brand-tint px-3 py-2.5 text-[14px] text-brand-navyDeep">
      <Icon name="person" className="mt-px text-[19px] text-brand-navy" />
      <p className="min-w-0 flex-1 leading-relaxed">
        <strong className="font-semibold">{customer.fullName}</strong>
        <span className="break-all"> · {customer.email}</span>
        <span className="block text-brand-navyDeep/80">
          {gradeLabel} · {modeLabel}
        </span>
      </p>
      {!payment && (
        <button
          type="button"
          onClick={onEditCustomer}
          className="shrink-0 rounded text-[13.5px] font-semibold text-brand-navy underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
        >
          Sửa
        </button>
      )}
    </div>
  );

  if (payment) {
    return (
      <div className="space-y-6">
        {customerLine}
        {/* key theo mã đơn để đồng hồ đếm lại từ đầu khi tạo mã mới */}
        <VnpayCodePanel
          key={payment.orderCode}
          payment={payment}
          isConfirming={confirm.isPending}
          onConfirm={() => confirm.mutate(payment, { onSuccess: onPaid })}
          onRenew={createCode}
        />
        {(confirm.error || create.error) && <AuthNotice tone="error">Chưa xác nhận được thanh toán. Vui lòng thử lại sau.</AuthNotice>}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {customerLine}

      <p className="flex items-center gap-3 rounded-md border border-slate-300 px-3.5 py-3 text-[15px] text-brand-ink">
        <Icon name="qr_code_2" className="text-[22px] text-brand-navy" />
        <span>
          Thanh toán qua <strong className="font-semibold text-brand-navy">VNPay</strong> bằng thẻ ATM hoặc mã QR ·{" "}
          <strong className="font-semibold text-brand-navy">{formatVnd(cartTotal(courses))}</strong>
        </span>
      </p>

      {create.error &&
        (emailTaken ? (
          // Máy chủ báo email đã có tài khoản: phải đăng nhập rồi mới mua tiếp
          <AuthNotice tone="info">
            Email này đã có tài khoản.
            <Link
              to={ROUTES.login}
              state={{ email: customer.email, resumeCheckout: true } satisfies AuthLocationState}
              className={`mt-1 block ${AUTH_TEXT_LINK}`}
            >
              Đăng nhập để thanh toán
            </Link>
          </AuthNotice>
        ) : (
          <AuthNotice tone="error">Chưa tạo được mã thanh toán. Vui lòng thử lại sau.</AuthNotice>
        ))}

      <AuthSubmitButton label="Tạo mã VNPay" pendingLabel="Đang tạo mã…" isPending={create.isPending} />
    </form>
  );
}
