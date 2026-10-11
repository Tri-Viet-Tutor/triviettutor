import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useMutation } from "@tanstack/react-query";
import { login as loginRequest, getRoleHome } from "@/lib/auth";
import { ROUTES } from "@/constants/routes";
import { AuthField } from "@/features/auth/components/AuthField";
import { AuthHeading } from "@/features/auth/components/AuthHeading";
import { AuthNotice } from "@/features/auth/components/AuthNotice";
import { AuthSubmitButton } from "@/features/auth/components/AuthSubmitButton";
import { authErrorCode, authErrorMessage } from "@/features/auth/data/authMessages";
import { savePendingEmail, type AuthLocationState } from "@/features/auth/data/pendingEmail";

const loginSchema = z.object({
  email: z.string().email("Email chưa đúng"),
  password: z.string().min(6, "Mật khẩu có ít nhất 6 ký tự"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const TEXT_LINK = "font-semibold text-brand-navy underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

/**
 * LoginPage
 *
 * Handles user login and redirects to the appropriate dashboard
 * based on the user's role (BR-01).
 * Tài khoản chưa kích hoạt (ACCOUNT_NOT_VERIFIED) được dẫn sang trang nhập mã OTP.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const locationState = location.state as AuthLocationState | null;
  // Câu báo từ trang trước, ví dụ sau khi đặt lại mật khẩu
  const notice = locationState?.notice;
  // Đang mua khóa học dở: đăng nhập xong quay lại trang thanh toán
  const resumeCheckout = locationState?.resumeCheckout === true;

  const { mutate: login, isPending, error } = useMutation({
    mutationFn: loginRequest,
  });

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: locationState?.email ?? "", password: "" },
  });

  function onSubmit(data: LoginFormValues) {
    login(data, {
      onSuccess: (response) => {
        setAuth(response.accessToken, response.user);
        navigate(resumeCheckout ? ROUTES.checkout : getRoleHome(response.user.role), { replace: true });
      },
    });
  }

  /** Tài khoản chưa kích hoạt: sang trang nhập mã OTP với email đang gõ */
  function goToVerification() {
    const email = getValues("email");
    savePendingEmail(email, false, resumeCheckout);
    navigate(ROUTES.verifyEmail, { state: { email, resumeCheckout } satisfies AuthLocationState });
  }

  const notVerified = Boolean(error) && authErrorCode(error) === "ACCOUNT_NOT_VERIFIED";

  return (
    <div>
      <AuthHeading title="Đăng nhập" description="Xem lịch học và theo dõi lớp của bạn." />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {notice && !error && <AuthNotice tone="success">{notice}</AuthNotice>}

        <AuthField
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="ban@example.com"
          error={errors.email?.message}
          {...register("email")}
        />

        <AuthField
          id="password"
          label="Mật khẩu"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register("password")}
        />

        {/* "Quên mật khẩu?" nằm dưới ô mật khẩu, ngay trên nút đăng nhập */}
        <p className="!mt-2.5 text-right">
          <Link to={ROUTES.forgotPassword} className={`text-[13.5px] ${TEXT_LINK}`}>
            Quên mật khẩu?
          </Link>
        </p>

        {error && (
          <AuthNotice tone={notVerified ? "info" : "error"}>
            {authErrorMessage(error, "Đăng nhập chưa thành công. Vui lòng thử lại.")}
            {notVerified && (
              <button type="button" onClick={goToVerification} className={`mt-1.5 block ${TEXT_LINK}`}>
                Nhập mã xác thực
              </button>
            )}
          </AuthNotice>
        )}

        <AuthSubmitButton id="login-submit" label="Đăng nhập" pendingLabel="Đang đăng nhập…" isPending={isPending} />
      </form>
    </div>
  );
}
