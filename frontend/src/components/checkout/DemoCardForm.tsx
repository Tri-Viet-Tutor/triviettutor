import { type FormEvent, useState } from "react";
import { OtpInput } from "@/components/auth/OtpInput";
import { Icon } from "@/components/ui/Icon";
import { Select } from "@/components/ui/Select";
import { DEMO_TEST_CARD } from "@/constants/checkout";
import {
  AUTH_ERROR,
  AUTH_INPUT,
  AUTH_LABEL,
  CHECKOUT_BTN_PRIMARY as BTN_PRIMARY,
  CHECKOUT_BTN_SECONDARY as BTN_SECONDARY,
} from "@/constants/classNames";
import type { CardDetails, DemoCardFormProps } from "@/interfaces/checkout";
import { cardDigits, matchesDemoCard } from "@/utils/checkout";

/** Form trống, ngân hàng chọn sẵn ngân hàng của thẻ thử nghiệm */
const EMPTY_CARD: CardDetails = { bank: DEMO_TEST_CARD.bank, number: "", holder: "", issueDate: "" };

/** Chèn khoảng trắng mỗi 4 số: "9704198526191432198" → "9704 1985 2619 1432 198" */
function formatCardNumber(value: string): string {
  return cardDigits(value)
    .slice(0, 19)
    .replace(/(.{4})(?=.)/g, "$1 ");
}

/** Thêm dấu "/" giữa tháng và năm: "0715" → "07/15" */
function formatIssueDate(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

/**
 * Thanh toán bằng thẻ ATM nội địa — BẢN DEMO, hai bước như cổng thanh toán: nhập thông tin thẻ rồi nhập mã OTP.
 * Chỉ nhận đúng thẻ thử nghiệm (DEMO_TEST_CARD); mọi thẻ khác đều bị từ chối.
 * Thông tin nhập vào chỉ so sánh ngay trên trình duyệt, không gửi đi đâu và không lưu lại.
 */
export function DemoCardForm({ isConfirming, onPaid }: DemoCardFormProps) {
  const [card, setCard] = useState<CardDetails>(EMPTY_CARD);
  // Hai bước: nhập thẻ → nhập OTP
  const [step, setStep] = useState<"card" | "otp">("card");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");

  /** Sửa một phần thông tin thẻ và xóa lỗi cũ */
  function update(patch: Partial<CardDetails>) {
    setCard((current) => ({ ...current, ...patch }));
    setError("");
  }

  /** Điền nhanh thẻ thử nghiệm */
  function fillTestCard() {
    setCard({
      bank: DEMO_TEST_CARD.bank,
      number: formatCardNumber(DEMO_TEST_CARD.number),
      holder: DEMO_TEST_CARD.holder,
      issueDate: DEMO_TEST_CARD.issueDate,
    });
    setError("");
  }

  /** Bước 1: thẻ khớp thẻ thử nghiệm thì sang bước OTP */
  function submitCard(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!matchesDemoCard(card)) {
      setError("Thông tin thẻ không đúng.");
      return;
    }
    setError("");
    setStep("otp");
  }

  /** Bước 2: OTP đúng thì báo đã thanh toán */
  function submitOtp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (otp !== DEMO_TEST_CARD.otp) {
      setError("Mã OTP không đúng.");
      return;
    }
    setError("");
    onPaid();
  }

  if (step === "otp") {
    return (
      <form onSubmit={submitOtp} className="space-y-4">
        <p className="text-[14.5px] leading-relaxed text-brand-muted">
          Nhập mã OTP ngân hàng gửi tới chủ thẻ <strong className="font-semibold text-brand-navy">{card.holder}</strong>.
        </p>
        <OtpInput
          value={otp}
          onChange={(value) => {
            setOtp(value);
            setError("");
          }}
          length={DEMO_TEST_CARD.otp.length}
          invalid={Boolean(error)}
          disabled={isConfirming}
        />
        <p className="text-[13px] text-brand-muted">
          Mã OTP thử nghiệm: <strong className="font-semibold tracking-wide text-brand-navy">{DEMO_TEST_CARD.otp}</strong>
        </p>
        {error && (
          <p role="alert" className={AUTH_ERROR}>
            {error}
          </p>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button type="submit" disabled={isConfirming || otp.length < DEMO_TEST_CARD.otp.length} className={`${BTN_PRIMARY} sm:flex-1`}>
            {isConfirming ? "Đang xử lý…" : "Xác nhận thanh toán"}
          </button>
          <button
            type="button"
            disabled={isConfirming}
            onClick={() => {
              setStep("card");
              setOtp("");
              setError("");
            }}
            className={BTN_SECONDARY}
          >
            Quay lại
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={submitCard} autoComplete="off" className="space-y-4">
      {/* Nhắc rõ đây là demo và cho điền nhanh thẻ thử nghiệm */}
      <div className="flex flex-col gap-2.5 rounded-md border border-brand-navy/20 bg-brand-tint px-3.5 py-3 text-[13.5px] leading-relaxed text-brand-navyDeep sm:flex-row sm:items-center sm:justify-between">
        <p className="flex gap-2">
          <Icon name="info" className="mt-px shrink-0 text-[18px] text-brand-navy" />
          Bản demo chỉ nhận thẻ thử nghiệm.
        </p>
        <button
          type="button"
          onClick={fillTestCard}
          className="shrink-0 self-start rounded font-semibold text-brand-navy underline underline-offset-4 hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy sm:self-auto"
        >
          Điền thẻ thử nghiệm
        </button>
      </div>

      <div>
        <label htmlFor="card-bank" className={`mb-1.5 ${AUTH_LABEL}`}>
          Ngân hàng
        </label>
        <Select id="card-bank" value={card.bank} onChange={(event) => update({ bank: event.target.value })} className={AUTH_INPUT}>
          <option value={DEMO_TEST_CARD.bank}>{DEMO_TEST_CARD.bank}</option>
        </Select>
      </div>

      <div>
        <label htmlFor="card-number" className={`mb-1.5 ${AUTH_LABEL}`}>
          Số thẻ
        </label>
        <input
          id="card-number"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="9704 •••• •••• •••• •••"
          value={card.number}
          onChange={(event) => update({ number: formatCardNumber(event.target.value) })}
          aria-invalid={Boolean(error)}
          className={`${AUTH_INPUT} tracking-wide`}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_150px]">
        <div>
          <label htmlFor="card-holder" className={`mb-1.5 ${AUTH_LABEL}`}>
            Tên chủ thẻ
          </label>
          <input
            id="card-holder"
            type="text"
            autoComplete="off"
            placeholder="Không dấu, như in trên thẻ"
            value={card.holder}
            onChange={(event) => update({ holder: event.target.value.toUpperCase() })}
            aria-invalid={Boolean(error)}
            className={AUTH_INPUT}
          />
        </div>
        <div>
          <label htmlFor="card-issue" className={`mb-1.5 ${AUTH_LABEL}`}>
            Ngày phát hành
          </label>
          <input
            id="card-issue"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="MM/YY"
            value={card.issueDate}
            onChange={(event) => update({ issueDate: formatIssueDate(event.target.value) })}
            aria-invalid={Boolean(error)}
            className={AUTH_INPUT}
          />
        </div>
      </div>

      {error && (
        <p role="alert" className={AUTH_ERROR}>
          {error}
        </p>
      )}

      <button type="submit" className={`${BTN_PRIMARY} w-full`}>
        Tiếp tục
      </button>
    </form>
  );
}
