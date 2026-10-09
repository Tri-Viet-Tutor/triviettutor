import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { resendVerification, verifyEmail } from "@/features/auth/api/authApi";
import { AUTH_INPUT, AUTH_LABEL } from "@/features/auth/components/AuthField";
import { AuthHeading } from "@/features/auth/components/AuthHeading";
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
  readPendingEmail,
  savePendingEmail,
  secondsSinceOtpSent,
  type AuthLocationState,
} from "@/features/auth/data/pendingEmail";
import { formatClock, useCountdown } from "@/features/auth/hooks/useCountdown";
import { getRoleHome } from "@/lib/auth";
import { useAuthStore } from "@/stores/authStore";

const TEXT_LINK = "font-semibold text-brand-navy underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

/**
 * Trang nhập mã OTP kích hoạt tài khoản (POST /auth/verify-email).
 * Tới từ trang đăng ký (mã vừa gửi) hoặc từ trang đăng nhập khi tài khoản chưa kích hoạt.
 * Mã đúng thì backend trả luôn phiên đăng nhập, nên vào thẳng trang của vai trò.
 */
export function VerifyEmailPage() {
  const navigate = useNavigate();
  const state = useLocation().state as AuthLocationState | null;
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail] = useState(() => state?.email ?? readPendingEmail());
  // Chưa biết email (mở thẳng trang này) thì hỏi email trước
  const [emailLocked, setEmailLocked] = useState(() => Boolean(state?.email ?? readPendingEmail()));
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

  function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    savePendingEmail(email.trim());
    setEmail(email.trim());
    setEmailLocked(true);
    // Email mới: chưa biết mã gửi lúc nào nên ngừng đếm, cho bấm gửi lại ngay
    setTiming(false);
    restartCooldown(0);
  }

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
          setAuth(response.accessToken, response.user);
          navigate(getRoleHome(response.user.role), { replace: true });
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

  if (!emailLocked) {
    return (
      <div>
        <AuthHeading title="Xác thực email" description="Nhập email bạn đã dùng để đăng ký." />
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label htmlFor="verify-email" className={`mb-1.5 ${AUTH_LABEL}`}>
              Email
            </label>
            <input
              id="verify-email"
              type="email"
              required
              autoComplete="email"
              placeholder="ban@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={AUTH_INPUT}
            />
          </div>
          <AuthSubmitButton label="Tiếp tục" pendingLabel="Tiếp tục" isPending={false} />
        </form>
        <p className="mt-6 text-center text-[14px] text-brand-muted">
          <Link to={ROUTES.login} className={TEXT_LINK}>
            Quay lại đăng nhập
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      <AuthHeading title="Nhập mã xác thực" />
      <p className="-mt-5 mb-6 text-center text-[14.5px] leading-relaxed text-brand-muted">
        Mã {OTP_LENGTH} chữ số đã gửi tới <strong className="break-all font-semibold text-brand-navy">{email}</strong>.{" "}
        <button
          type="button"
          onClick={() => {
            setEmailLocked(false);
            setOtp("");
            verify.reset();
            resend.reset();
          }}
          className={`text-[14px] ${TEXT_LINK}`}
        >
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
          <Link to={ROUTES.login} state={{ email } satisfies AuthLocationState} className={`block text-[14.5px] ${TEXT_LINK}`}>
            Tới trang đăng nhập
          </Link>
        )}

        <AuthSubmitButton label="Xác thực" pendingLabel="Đang xác thực…" isPending={verify.isPending} disabled={!otpComplete} />
      </form>

      <p className="mt-6 text-center text-[14px] text-brand-muted">
        <Link to={ROUTES.login} className={TEXT_LINK}>
          Quay lại đăng nhập
        </Link>
      </p>
    </div>
  );
}
