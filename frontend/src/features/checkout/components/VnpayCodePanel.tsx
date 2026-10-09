import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { QrCode } from "@/components/ui/QrCode";
import { type PendingPayment } from "@/features/checkout/api/orderApi";
import { DemoCardForm } from "@/features/checkout/components/DemoCardForm";
import { formatClock, useCountdown } from "@/hooks/useCountdown";
import { formatVnd } from "@/utils/currency";

const BTN_PRIMARY =
  "flex h-11 shrink-0 items-center justify-center rounded-md bg-brand-navy px-5 text-[15px] font-semibold text-white transition-colors hover:bg-brand-navyDeep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy disabled:cursor-not-allowed disabled:opacity-50";

type PayTab = "card" | "qr";

const TABS: { value: PayTab; label: string; icon: string }[] = [
  { value: "card", label: "Thẻ ATM nội địa", icon: "credit_card" },
  { value: "qr", label: "Mã QR", icon: "qr_code_2" },
];

interface VnpayCodePanelProps {
  payment: PendingPayment;
  isConfirming: boolean;
  /** Người dùng thanh toán xong (thẻ + OTP hợp lệ, hoặc bấm "Tôi đã thanh toán" sau khi quét mã) */
  onConfirm: () => void;
  /** Bấm "Tạo mã mới" */
  onRenew: () => void;
}

/**
 * Mã thanh toán VNPay vừa tạo: mã đơn, số tiền, đồng hồ đếm ngược.
 * Bản demo có hai cách thanh toán ngay tại chỗ: nhập thẻ ATM nội địa hoặc quét mã QR.
 * Thanh toán thật chỉ có một nút chuyển sang trang của VNPay (mã QR và ô nhập thẻ nằm bên đó).
 * Hết hạn thì chỉ còn nút tạo mã mới.
 */
export function VnpayCodePanel({ payment, isConfirming, onConfirm, onRenew }: VnpayCodePanelProps) {
  const [secondsLeft] = useCountdown(payment.ttlSeconds);
  const [tab, setTab] = useState<PayTab>("card");
  const expired = secondsLeft === 0;

  return (
    <div>
      <p className="flex items-center gap-2 text-[16px] font-bold text-brand-navy">
        Thanh toán qua VNPay
        {payment.demo && (
          <span className="rounded bg-brand-orange/20 px-1.5 py-0.5 text-[11.5px] font-bold uppercase tracking-wide text-brand-navyDeep">
            Demo
          </span>
        )}
      </p>

      <dl className="mt-3 grid grid-cols-3 divide-x divide-slate-200 rounded-md border border-slate-200 text-center">
        <div className="px-2 py-2.5">
          <dt className="text-[12.5px] text-brand-muted">Mã đơn</dt>
          <dd className="mt-0.5 break-all text-[14.5px] font-semibold tracking-wide text-brand-ink">{payment.orderCode}</dd>
        </div>
        <div className="px-2 py-2.5">
          <dt className="text-[12.5px] text-brand-muted">Số tiền</dt>
          <dd className="mt-0.5 text-[14.5px] font-semibold text-brand-ink">{formatVnd(payment.amount)}</dd>
        </div>
        <div className="px-2 py-2.5">
          <dt className="text-[12.5px] text-brand-muted">Hết hạn sau</dt>
          <dd className={`mt-0.5 text-[14.5px] font-semibold tabular-nums ${expired ? "text-red-700" : "text-brand-navy"}`}>
            {formatClock(secondsLeft)}
          </dd>
        </div>
      </dl>

      {expired ? (
        <div className="mt-6 text-center">
          <p className="text-[15px] font-semibold text-red-700">Mã đã hết hạn</p>
          <button type="button" onClick={onRenew} className={`mx-auto mt-4 ${BTN_PRIMARY}`}>
            Tạo mã mới
          </button>
        </div>
      ) : !payment.demo ? (
        <div className="mt-6">
          <a href={payment.paymentUrl} className={`w-full gap-2 ${BTN_PRIMARY}`}>
            Thanh toán tại VNPay
            <Icon name="arrow_forward" className="text-[18px]" />
          </a>
          
        </div>
      ) : (
        <>
          <div role="tablist" aria-label="Cách thanh toán" className="mt-6 flex border-b border-slate-200">
            {TABS.map((item) => {
              const selected = item.value === tab;
              return (
                <button
                  key={item.value}
                  type="button"
                  role="tab"
                  id={`pay-tab-${item.value}`}
                  aria-selected={selected}
                  aria-controls="pay-tabpanel"
                  onClick={() => setTab(item.value)}
                  className={`-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-[14.5px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-navy ${
                    selected ? "border-brand-navy text-brand-navy" : "border-transparent text-brand-muted hover:text-brand-navy"
                  }`}
                >
                  <Icon name={item.icon} className="text-[19px]" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div id="pay-tabpanel" role="tabpanel" aria-labelledby={`pay-tab-${tab}`} className="mt-5">
            {tab === "card" ? (
              <DemoCardForm isConfirming={isConfirming} onPaid={onConfirm} />
            ) : (
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                <div className="w-[180px] shrink-0 rounded-xl border border-slate-200 bg-white p-2.5">
                  <QrCode value={payment.qrContent} label={`Mã QR thanh toán đơn ${payment.orderCode}`} className="block h-auto w-full" />
                </div>
                <div className="flex-1 self-stretch">
                  <p className="text-[14.5px] leading-relaxed text-brand-muted">
                    Mở ứng dụng ngân hàng, quét mã rồi bấm nút bên dưới.
                  </p>
                  <button type="button" onClick={onConfirm} disabled={isConfirming} className={`mt-4 w-full ${BTN_PRIMARY}`}>
                    {isConfirming ? "Đang kiểm tra…" : "Tôi đã thanh toán"}
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="mt-5 text-center text-[13.5px] text-brand-muted">
            <button
              type="button"
              onClick={onRenew}
              disabled={isConfirming}
              className="rounded font-semibold text-brand-navy underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy disabled:opacity-50"
            >
              Tạo mã mới
            </button>
          </p>
        </>
      )}
    </div>
  );
}
