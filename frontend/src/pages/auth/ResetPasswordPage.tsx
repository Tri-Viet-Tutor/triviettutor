import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { ROUTES } from "@/constants/routes";
import { requestPasswordReset, resetPassword } from "@/services/authService";
import { AUTH_LABEL, AUTH_TEXT_LINK } from "@/constants/classNames";
import { AuthField } from "@/components/auth/AuthField";
import { AuthHeading } from "@/components/auth/AuthHeading";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { OtpInput } from "@/components/auth/OtpInput";
import { authErrorMessage } from "@/utils/errors";
import { OTP_LENGTH, OTP_TTL_SECONDS, PASSWORD_MAX, PASSWORD_MIN, RESEND_COOLDOWN_SECONDS } from "@/constants/auth";
import { clearPendingEmail, readPendingEmail, savePendingEmail, secondsSinceOtpSent } from "@/utils/pendingEmail";
import type { AuthLocationState, ResetFormValues } from "@/interfaces/auth";
import { formatClock, useCountdown } from "@/hooks/useCountdown";

/** Kiểm tra form đặt lại mật khẩu (mã OTP kiểm tra riêng vì không qua react-hook-form) */
const resetSchema = z
  .object({
    email: z.string().email("Email chưa đúng"),
    newPassword: z
      .string()
      .min(PASSWORD_MIN, `Mật khẩu có ít nhất ${PASSWORD_MIN} ký tự`)
      .max(PASSWORD_MAX, `Mật khẩu tối đa ${PASSWORD_MAX} ký tự`),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Hai mật khẩu chưa khớp",
    path: ["confirmPassword"],
  });

/**
 * Trang đặt lại mật khẩu: email, mã OTP gửi qua email và mật khẩu mới.
 * Xong thì về trang đăng nhập kèm câu báo thành công.
 * Backend chưa có endpoint cho việc này — xem ghi chú ở services/authService.ts.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const state = useLocation().state as AuthLocationState | null;
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  // Vừa gửi lại mã thành công — để hiện thông báo
  const [resent, setResent] = useState(false);
  // Đếm ngược từ lúc mã được gửi (nếu biết); tải lại trang vẫn đếm tiếp
  const [initialEmail] = useState(() => state?.email ?? readPendingEmail());
  const [sentSecondsAgo] = useState(() => secondsSinceOtpSent(initialEmail));
  const [timing, setTiming] = useState(sentSecondsAgo !== null);
  const [expiresIn, restartExpiry] = useCountdown(Math.max(0, OTP_TTL_SECONDS - (sentSecondsAgo ?? OTP_TTL_SECONDS)));
  const [cooldown, restartCooldown] = useCountdown(Math.max(0, RESEND_COOLDOWN_SECONDS - (sentSecondsAgo ?? RESEND_COOLDOWN_SECONDS)));

  const reset = useMutation({ mutationFn: resetPassword });
  const resend = useMutation({ mutationFn: requestPasswordReset });

  const {
    register,
    handleSubmit,
    getValues,
    trigger,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { email: initialEmail, newPassword: "", confirmPassword: "" },
  });

  /** Kiểm tra mã OTP đủ số rồi gửi; thành công thì về trang đăng nhập kèm câu báo */
  function onSubmit(data: ResetFormValues) {
    if (!new RegExp(`^\\d{${OTP_LENGTH}}$`).test(otp)) {
      setOtpError(`Nhập đủ ${OTP_LENGTH} chữ số của mã xác thực`);
      return;
    }
    setOtpError("");
    setResent(false);
    resend.reset();
    reset.mutate(
      { email: data.email, otp, newPassword: data.newPassword },
      {
        onSuccess: () => {
          clearPendingEmail();
          navigate(ROUTES.login, {
            replace: true,
            state: { email: data.email, notice: "Đã đặt lại mật khẩu. Hãy đăng nhập bằng mật khẩu mới." } satisfies AuthLocationState,
          });
        },
      },
    );
  }

  /** Gửi lại mã tới email đang nhập, đếm lại hạn mã và thời gian chờ */
  async function handleResend() {
    // Email phải hợp lệ mới gửi lại được mã
    if (!(await trigger("email"))) return;
    reset.reset();
    const email = getValues("email");
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

  // Lỗi gần nhất của một trong hai thao tác
  const failure = reset.error ?? resend.error;
  const expired = timing && expiresIn === 0;

  return (
    <div>
      <AuthHeading title="Đặt lại mật khẩu" description="Nhập mã đã gửi tới email của bạn và mật khẩu mới." />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <AuthField
          id="reset-email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="ban@example.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <div>
          <p className={`mb-1.5 ${AUTH_LABEL}`}>Mã xác thực</p>
          <OtpInput
            value={otp}
            onChange={(value) => {
              setOtp(value);
              setOtpError("");
            }}
            length={OTP_LENGTH}
            invalid={Boolean(otpError)}
            disabled={reset.isPending}
          />
          <p aria-live="polite" className="mt-2 flex items-center justify-between gap-3 text-[14px] text-brand-muted">
            <span>
              {otpError && <span className="font-semibold text-red-700">{otpError}</span>}
              {!otpError && !timing && `Mã có hiệu lực ${OTP_TTL_SECONDS / 60} phút kể từ lúc gửi.`}
              {!otpError && timing && !expired && (
                <>
                  Mã hết hạn sau <strong className="font-bold tabular-nums text-brand-navy">{formatClock(expiresIn)}</strong>
                </>
              )}
              {!otpError && expired && <span className="font-semibold text-red-700">Mã đã hết hạn.</span>}
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
        </div>

        <AuthField
          id="reset-password"
          label="Mật khẩu mới"
          type="password"
          autoComplete="new-password"
          placeholder={`Ít nhất ${PASSWORD_MIN} ký tự`}
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />
        <AuthField
          id="reset-confirm"
          label="Nhập lại mật khẩu mới"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        {resent && !failure && <AuthNotice tone="success">Đã gửi mã mới. Hãy kiểm tra hộp thư (cả mục thư rác).</AuthNotice>}
        {failure && <AuthNotice tone="error">{authErrorMessage(failure, "Chưa đặt lại được mật khẩu. Vui lòng thử lại.")}</AuthNotice>}

        <AuthSubmitButton label="Đặt lại mật khẩu" pendingLabel="Đang lưu…" isPending={reset.isPending} />
      </form>

      <p className="mt-6 text-center text-[14px] text-brand-muted">
        <Link to={ROUTES.login} className={AUTH_TEXT_LINK}>
          Quay lại đăng nhập
        </Link>
      </p>
    </div>
  );
}
