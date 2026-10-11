import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { registerStudent } from "@/lib/auth";
import { ROUTES } from "@/constants/routes";
import { AuthField } from "@/features/auth/components/AuthField";
import { AuthHeading } from "@/features/auth/components/AuthHeading";
import { AuthNotice } from "@/features/auth/components/AuthNotice";
import { AuthSubmitButton } from "@/features/auth/components/AuthSubmitButton";
import { authErrorMessage, PASSWORD_MAX, PASSWORD_MIN } from "@/features/auth/data/authMessages";
import { savePendingEmail, type AuthLocationState } from "@/features/auth/data/pendingEmail";

const registerSchema = z.object({
  // Limits mirror the backend's RegisterRequest: fullName 2–100, password 6–128
  fullName: z
    .string()
    .trim()
    .min(2, "Họ tên có ít nhất 2 ký tự")
    .max(100, "Họ tên tối đa 100 ký tự"),
  email: z.string().email("Email chưa đúng"),
  password: z
    .string()
    .min(PASSWORD_MIN, `Mật khẩu có ít nhất ${PASSWORD_MIN} ký tự`)
    .max(PASSWORD_MAX, `Mật khẩu tối đa ${PASSWORD_MAX} ký tự`),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Hai mật khẩu chưa khớp",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

const TEXT_LINK = "font-semibold text-brand-navy underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

/**
 * RegisterPage
 *
 * Self-registration for students/parents (BR-01.04).
 * Admin and tutor accounts are created by the admin.
 *
 * Backend không đăng nhập ngay sau khi đăng ký nữa: POST /auth/register tạo tài khoản chưa kích hoạt
 * và gửi mã OTP qua email (trả về { email, message }). Vì vậy đăng ký xong thì chuyển sang
 * trang nhập mã OTP; phiên đăng nhập chỉ có sau khi xác thực (xem VerifyEmailPage).
 */
export function RegisterPage() {
  const navigate = useNavigate();

  const { mutate: register, isPending, error } = useMutation({
    mutationFn: registerStudent,
  });

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  function onSubmit(data: RegisterFormValues) {
    register(
      { email: data.email, password: data.password, fullName: data.fullName },
      { onSuccess: () => {
        savePendingEmail(data.email, true);
        navigate(ROUTES.verifyEmail, { state: { email: data.email } satisfies AuthLocationState });
      } }
    );
  }

  return (
    <div>
      <AuthHeading title="Đăng ký học viên" description="Tạo tài khoản để đăng ký lớp và xem lịch học." />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <AuthField
          id="fullName"
          label="Họ tên"
          autoComplete="name"
          placeholder="Nguyễn Văn An"
          error={errors.fullName?.message}
          {...formRegister("fullName")}
        />
        <AuthField
          id="reg-email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="ban@example.com"
          error={errors.email?.message}
          {...formRegister("email")}
        />
        <AuthField
          id="reg-password"
          label="Mật khẩu"
          type="password"
          autoComplete="new-password"
          placeholder={`Ít nhất ${PASSWORD_MIN} ký tự`}
          error={errors.password?.message}
          {...formRegister("password")}
        />
        <AuthField
          id="confirmPassword"
          label="Nhập lại mật khẩu"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...formRegister("confirmPassword")}
        />

        {error && <AuthNotice tone="error">{authErrorMessage(error, "Đăng ký chưa thành công. Vui lòng thử lại.")}</AuthNotice>}

<<<<<<< Updated upstream
        <AuthSubmitButton id="register-submit" label="Tạo tài khoản" pendingLabel="Đang tạo tài khoản…" isPending={isPending} />
      </form>

      <p className="mt-6 text-center text-[14px] text-brand-muted">
        Đã có tài khoản?{" "}
        <Link to={ROUTES.login} className={TEXT_LINK}>
          Đăng nhập
        </Link>
=======
        <div>
          <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
          <input
            id="reg-password"
            type="password"
            {...formRegister("password")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>}
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
          <input
            id="confirmPassword"
            type="password"
            {...formRegister("confirmPassword")}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
          {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword.message}</p>}
        </div>

        {error && <p className="text-sm text-red-600">Registration failed. The email may already be in use.</p>}

        <button
          id="register-submit"
          type="submit"
          disabled={isPending}
          className="w-full py-2 px-4 bg-brand-navy hover:bg-brand-navyDark text-white font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          {isPending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link to="/login" className="text-primary hover:underline">Sign in</Link>
>>>>>>> Stashed changes
      </p>
    </div>
  );
}
