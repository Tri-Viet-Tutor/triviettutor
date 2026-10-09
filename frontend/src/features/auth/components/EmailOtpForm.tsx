import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { resendVerification, verifyEmail } from "@/features/auth/api/authApi";
import { AuthNotice } from "@/features/auth/components/AuthNotice";
import { AuthSubmitButton } from "@/features/auth/components/AuthSubmitButton";
import { OtpInput } from "@/features/auth/components/OtpInput";
import {
  authErrorCode,
  authErrorMessage,
  OTP_LENGTH,
  OTP_TTL_SECONDS,
  RESEND_COOLDOWN_SECONDS,
} from "@/features/auth/data/authMessages";
import {
  clearPendingEmail,
  savePendingEmail,
  secondsSinceOtpSent,
  type AuthLocationState,
} from "@/features/auth/data/pendingEmail";
import { formatClock, useCountdown } from "@/hooks/useCountdown";
import { useAuthStore } from "@/stores/authStore";
import type { AuthResponse } from "@/types/api";

const TEXT_LINK = "font-semibold text-brand-navy underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

interface EmailOtpFormProps {
  /** Email vừa nhận mã — đổi email thì đặt `key={email}` để form làm lại từ đầu */
  email: string;
  /** Mã đúng: tài khoản đã kích hoạt (và phiên đăng nhập đã được lưu, trừ khi `signIn` là false) */
  onVerified: (response: AuthResponse) => void;
  /** false: chỉ kích hoạt tài khoản, không đăng nhập luôn — người dùng tự đăng nhập sau. Mặc định true */
  signIn?: boolean;
  onChangeEmail: () => void;
  /** Căn giữa dòng mô tả (trang xác thực) hay căn trái (trong trang thanh toán) */
  align?: "center" | "left";
  /** Trạng thái gửi kèm khi dẫn sang trang đăng nhập (tài khoản đã kích hoạt từ trước) */
  loginState?: AuthLocationState;
}

/**
 * Form nhập mã OTP kích hoạt tài khoản gửi qua email (POST /auth/verify-email):
 * 6 ô số, đồng hồ đếm ngược hạn của mã (5 phút) và nút gửi lại mã (khóa 60 giây).
 * Mã đúng thì backend trả luôn phiên đăng nhập — form lưu phiên (nếu `signIn`) rồi gọi `onVerified`.
 */
export function EmailOtpForm({ email, onVerified, onChangeEmail, signIn = true, align = "center", loginState }: EmailOtpFormProps) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [otp, setOtp] = useState("");
  const [resent, setResent] = useState(false);

  // Chỉ đếm ngược khi biết mã được gửi lúc nào (vừa đăng ký hoặc vừa bấm gửi lại); tải lại trang vẫn đếm tiếp
  const [sentSecondsAgo] = useState(() => secondsSinceOtpSent(email));
  const [timing, setTiming] = useState(sentSecondsAgo !== null);
  const [expiresIn, restartExpiry] = useCountdown(Math.max(0, OTP_TTL_SECONDS - (sentSecondsAgo ?? OTP_TTL_SECONDS)));
  const [cooldown, restartCooldown] = useCountdown(Math.max(0, RESEND_COOLDOWN_SECONDS - (sentSecondsAgo ?? RESEND_COOLDOWN_SECONDS)));

  const verify = useMutation({ mutationFn: verifyEmail });
  const resend = useMutation({ mutationFn: resendVerification });

  const otpComplete = new RegExp(`^\\d{${OTP_LENGTH}}$`).test(otp);
  const expired = timing && expiresIn === 0;
  const alreadyVerified = [verify.error, resend.error].some((error) => error && authErrorCode(error) === "ACCOUNT_ALREADY_VERIFIED");

  function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!otpComplete) return;
    resend.reset();
    setResent(false);
    verify.mutate(
      { email, otp },
      {
        onSuccess: (response) => {
          clearPendingEmail();
          if (signIn) setAuth(response.accessToken, response.user);
          onVerified(response);
        },
      },
    );
  }

  function handleResend() {
    verify.reset();
    resend.mutate(
      { email },
      {
        onSuccess: () => {
          savePendingEmail(email, true);
          setOtp("");
          setResent(true);
          setTiming(true);
          restartExpiry(OTP_TTL_SECONDS);
          restartCooldown(RESEND_COOLDOWN_SECONDS);
        },
      },
    );
  }

  return (
    <div>
      <p className={`mb-6 text-[14.5px] leading-relaxed text-brand-muted ${align === "center" ? "text-center" : ""}`}>
        Mã {OTP_LENGTH} chữ số đã gửi tới <strong className="break-all font-semibold text-brand-navy">{email}</strong>.{" "}
        <button type="button" onClick={onChangeEmail} className={`text-[14px] ${TEXT_LINK}`}>
          Đổi email
        </button>
      </p>

      <form onSubmit={handleVerify} className="space-y-4">
        <OtpInput value={otp} onChange={setOtp} length={OTP_LENGTH} invalid={Boolean(verify.error)} disabled={verify.isPending} />

        <p aria-live="polite" className="flex items-center justify-between gap-3 text-[14px] text-brand-muted">
          <span>
            {!timing && "Mã có hiệu lực 5 phút kể từ lúc gửi."}
            {timing && !expired && (
              <>
                Mã hết hạn sau <strong className="font-bold tabular-nums text-brand-navy">{formatClock(expiresIn)}</strong>
              </>
            )}
            {expired && <span className="font-semibold text-red-700">Mã đã hết hạn.</span>}
          </span>
          <button
            type="button"
            onClick={handleResend}
            disabled={resend.isPending || cooldown > 0}
            className={`shrink-0 disabled:cursor-not-allowed disabled:font-medium disabled:text-brand-muted disabled:no-underline ${TEXT_LINK}`}
          >
            {resend.isPending ? "Đang gửi…" : cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi lại mã"}
          </button>
        </p>

        {resent && !verify.error && <AuthNotice tone="success">Đã gửi mã mới. Hãy kiểm tra hộp thư (cả mục thư rác).</AuthNotice>}
        {verify.error && <AuthNotice tone="error">{authErrorMessage(verify.error, "Chưa xác thực được. Vui lòng thử lại.")}</AuthNotice>}
        {resend.error && <AuthNotice tone="error">{authErrorMessage(resend.error, "Chưa gửi lại được mã. Vui lòng thử lại.")}</AuthNotice>}
        {alreadyVerified && (
          <Link to={ROUTES.login} state={{ ...loginState, email } satisfies AuthLocationState} className={`block text-[14.5px] ${TEXT_LINK}`}>
            Tới trang đăng nhập
          </Link>
        )}

        <AuthSubmitButton label="Xác thực" pendingLabel="Đang xác thực…" isPending={verify.isPending} disabled={!otpComplete} />
      </form>
    </div>
  );
}
