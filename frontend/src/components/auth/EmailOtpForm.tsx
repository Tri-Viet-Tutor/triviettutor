import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { OtpInput } from "@/components/auth/OtpInput";
import { OTP_LENGTH, OTP_TTL_SECONDS, RESEND_COOLDOWN_SECONDS } from "@/constants/auth";
import { AUTH_TEXT_LINK } from "@/constants/classNames";
import { ROUTES } from "@/constants/routes";
import { formatClock, useCountdown } from "@/hooks/useCountdown";
import type { AuthLocationState, EmailOtpFormProps } from "@/interfaces/auth";
import { resendVerification, verifyEmail } from "@/services/authService";
import { updateMe } from "@/services/portalService";
import { useAuthStore } from "@/stores/authStore";
import { authErrorCode, authErrorMessage } from "@/utils/errors";
import { clearPendingEmail, readPendingPhone, savePendingEmail, secondsSinceOtpSent } from "@/utils/pendingEmail";

// Form nhập mã OTP gửi qua email để xác thực tài khoản, có gửi lại mã
export function EmailOtpForm({ email, onVerified, onChangeEmail, signIn = true, align = "center", loginState }: EmailOtpFormProps) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [otp, setOtp] = useState("");
  // Vừa gửi lại mã thành công — để hiện thông báo
  const [resent, setResent] = useState(false);

  // Chỉ đếm ngược khi biết mã được gửi lúc nào (vừa đăng ký hoặc vừa bấm gửi lại); tải lại trang vẫn đếm tiếp
  const [sentSecondsAgo] = useState(() => secondsSinceOtpSent(email));
  const [timing, setTiming] = useState(sentSecondsAgo !== null);
  const [expiresIn, restartExpiry] = useCountdown(Math.max(0, OTP_TTL_SECONDS - (sentSecondsAgo ?? OTP_TTL_SECONDS)));
  const [cooldown, restartCooldown] = useCountdown(Math.max(0, RESEND_COOLDOWN_SECONDS - (sentSecondsAgo ?? RESEND_COOLDOWN_SECONDS)));

  const verify = useMutation({ mutationFn: verifyEmail });
  const resend = useMutation({ mutationFn: resendVerification });

  // Đã nhập đủ số chữ số chưa
  const otpComplete = new RegExp(`^\\d{${OTP_LENGTH}}$`).test(otp);
  const expired = timing && expiresIn === 0;
  // Tài khoản đã kích hoạt từ trước → chỉ đường sang trang đăng nhập
  const alreadyVerified = [verify.error, resend.error].some((error) => error && authErrorCode(error) === "ACCOUNT_ALREADY_VERIFIED");

  // Gửi mã; đúng thì xóa email đang chờ, lưu phiên (nếu `signIn`) rồi báo lên trên
  function handleVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!otpComplete) return;
    resend.reset();
    setResent(false);
    verify.mutate(
      { email, otp },
      {
        onSuccess: (response) => {
          const phone = readPendingPhone(email);
          clearPendingEmail();
          if (signIn) {
            setAuth(response.accessToken, response.user);
            // Số điện thoại nhập lúc đăng ký: lưu vào hồ sơ; lỗi thì học viên tự thêm ở trang Hồ sơ
            if (phone && response.user.role === "ROLE_STUDENT")
              void updateMe({ fullName: response.user.fullName, phone }).catch(() => undefined);
          }
          onVerified(response);
        },
      },
    );
  }

  // Gửi lại mã: xóa mã đang nhập và đếm lại cả hạn mã lẫn thời gian chờ gửi lại
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
        <button type="button" onClick={onChangeEmail} className={`text-[14px] ${AUTH_TEXT_LINK}`}>
          Đổi email
        </button>
      </p>

      <form onSubmit={handleVerify} className="space-y-4">
        <OtpInput value={otp} onChange={setOtp} length={OTP_LENGTH} invalid={Boolean(verify.error)} disabled={verify.isPending} />

        <p aria-live="polite" className="flex items-center justify-between gap-3 text-[14px] text-brand-muted">
          <span>
            {!timing && `Mã có hiệu lực ${OTP_TTL_SECONDS / 60} phút kể từ lúc gửi.`}
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
            className={`shrink-0 disabled:cursor-not-allowed disabled:font-medium disabled:text-brand-muted disabled:no-underline ${AUTH_TEXT_LINK}`}
          >
            {resend.isPending ? "Đang gửi…" : cooldown > 0 ? `Gửi lại sau ${cooldown}s` : "Gửi lại mã"}
          </button>
        </p>

        {resent && !verify.error && <AuthNotice tone="success">Đã gửi mã mới. Hãy kiểm tra hộp thư (cả mục thư rác).</AuthNotice>}
        {verify.error && <AuthNotice tone="error">{authErrorMessage(verify.error, "Chưa xác thực được. Vui lòng thử lại.")}</AuthNotice>}
        {resend.error && <AuthNotice tone="error">{authErrorMessage(resend.error, "Chưa gửi lại được mã. Vui lòng thử lại.")}</AuthNotice>}
        {alreadyVerified && (
          <Link
            to={ROUTES.login}
            state={{ ...loginState, email } satisfies AuthLocationState}
            className={`block text-[14.5px] ${AUTH_TEXT_LINK}`}
          >
            Tới trang đăng nhập
          </Link>
        )}

        <AuthSubmitButton label="Xác thực" pendingLabel="Đang xác thực…" isPending={verify.isPending} disabled={!otpComplete} />
      </form>
    </div>
  );
}
