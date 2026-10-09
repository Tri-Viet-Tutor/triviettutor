import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { ROUTES } from "@/constants/routes";
import { requestPasswordReset } from "@/features/auth/api/authApi";
import { AuthField } from "@/features/auth/components/AuthField";
import { AuthHeading } from "@/features/auth/components/AuthHeading";
import { AuthNotice } from "@/features/auth/components/AuthNotice";
import { AuthSubmitButton } from "@/features/auth/components/AuthSubmitButton";
import { authErrorMessage } from "@/features/auth/data/authMessages";
import { savePendingEmail, type AuthLocationState } from "@/features/auth/data/pendingEmail";

const forgotSchema = z.object({
  email: z.string().email("Email chưa đúng"),
});

type ForgotFormValues = z.infer<typeof forgotSchema>;

const TEXT_LINK = "font-semibold text-brand-navy underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

/**
 * Trang "Quên mật khẩu": nhập email để nhận mã OTP đặt lại mật khẩu, rồi sang trang đặt lại.
 * Backend chưa có endpoint cho việc này (xem features/auth/api/authApi.ts) — khi máy chủ chưa hỗ trợ,
 * trang chỉ báo "Chưa gửi được mã".
 */
export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { mutate, isPending, error } = useMutation({ mutationFn: requestPasswordReset });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormValues>({ resolver: zodResolver(forgotSchema) });

  function onSubmit(data: ForgotFormValues) {
    mutate(data, {
      onSuccess: () => {
        savePendingEmail(data.email, true);
        navigate(ROUTES.resetPassword, { state: { email: data.email } satisfies AuthLocationState });
      },
    });
  }

  return (
    <div>
      <AuthHeading title="Quên mật khẩu" description="Nhập email đã đăng ký, trung tâm gửi mã để bạn đặt lại mật khẩu." />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <AuthField
          id="forgot-email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="ban@example.com"
          error={errors.email?.message}
          {...register("email")}
        />

        {error && <AuthNotice tone="error">{authErrorMessage(error, "Chưa gửi được mã. Vui lòng thử lại.")}</AuthNotice>}

        <AuthSubmitButton label="Gửi mã đặt lại" pendingLabel="Đang gửi…" isPending={isPending} />
      </form>

      <p className="mt-6 text-center text-[14px] text-brand-muted">
        Nhớ ra mật khẩu rồi?{" "}
        <Link to={ROUTES.login} className={TEXT_LINK}>
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
