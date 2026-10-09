import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { ROUTES } from "@/constants/routes";
import { requestPasswordReset, resetPassword } from "@/features/auth/api/authApi";
import { AUTH_LABEL, AuthField } from "@/features/auth/components/AuthField";
import { AuthHeading } from "@/features/auth/components/AuthHeading";
import { AuthNotice } from "@/features/auth/components/AuthNotice";
import { AuthSubmitButton } from "@/features/auth/components/AuthSubmitButton";
import { OtpInput } from "@/features/auth/components/OtpInput";
import {
  authErrorMessage,
  OTP_LENGTH,
  OTP_TTL_SECONDS,
  PASSWORD_MAX,
  PASSWORD_MIN,
  RESEND_COOLDOWN_SECONDS,
} from "@/features/auth/data/authMessages";
import {
  clearPendingEmail,
  readPendingEmail,
  savePendingEmail,
  secondsSinceOtpSent,
  type AuthLocationState,
} from "@/features/auth/data/pendingEmail";
import { formatClock, useCountdown } from "@/hooks/useCountdown";

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

type ResetFormValues = z.infer<typeof resetSchema>;

const TEXT_LINK = "font-semibold text-brand-navy underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

/**
 * Trang đặt lại mật khẩu: email, mã OTP gửi qua email và mật khẩu mới.
 * Xong thì về trang đăng nhập kèm câu báo thành công.
 * Backend chưa có endpoint cho việc này — xem ghi chú ở features/auth/api/authApi.ts.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const state = useLocation().state as AuthLocationState | null;
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
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
              {!otpError && !timing && "Mã có hiệu lực 5 phút kể từ lúc gửi."}
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
              className={`shrink-0 disabled:cursor-not-allowed disabled:font-medium disabled:text-brand-muted disabled:no-underline ${TEXT_LINK}`}
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
        <Link to={ROUTES.login} className={TEXT_LINK}>
          Quay lại đăng nhập
        </Link>
      </p>
    </div>
  );
}
