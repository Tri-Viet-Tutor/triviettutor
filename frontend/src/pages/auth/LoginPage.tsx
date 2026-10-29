import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { ROUTES } from "@/constants/routes";
import { AUTH_TEXT_LINK } from "@/constants/classNames";
import { AuthField } from "@/components/auth/AuthField";
import { AuthHeading } from "@/components/auth/AuthHeading";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { authErrorCode, authErrorMessage, googleLoginErrorMessage } from "@/utils/errors";
import { PASSWORD_MIN } from "@/constants/auth";
import { savePendingEmail } from "@/utils/pendingEmail";
import type { AuthLocationState, LoginFormValues } from "@/interfaces/auth";
import { GOOGLE_LOGIN_ENABLED, getRoleHome, googleLoginUrl, login as loginRequest } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";
import { checkoutReturnPath, consumeCheckoutReturn } from "@/utils/checkoutReturn";

/** Kiểm tra form đăng nhập */
const loginSchema = z.object({
  email: z.string().email("Email chưa đúng"),
  password: z.string().min(PASSWORD_MIN, `Mật khẩu có ít nhất ${PASSWORD_MIN} ký tự`),
});

/**
 * Trang đăng nhập: đăng nhập xong thì chuyển tới trang chủ của vai trò (BR-01),
 * hoặc quay lại trang thanh toán nếu đang mua khóa học dở.
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
  // Đăng nhập Google không thành công: backend chuyển về /login?error=MÃ_LỖI
  const [searchParams] = useSearchParams();
  const googleError = searchParams.get("error");

  const {
    mutate: login,
    isPending,
    error,
  } = useMutation({
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

  /** Gửi đăng nhập; thành công thì lưu phiên và chuyển trang */
  function onSubmit(data: LoginFormValues) {
    login(data, {
      onSuccess: (response) => {
        setAuth(response.accessToken, response.user);
        const savedReturn = consumeCheckoutReturn();
        const returnTo = checkoutReturnPath(locationState?.returnTo) ?? savedReturn;
        navigate(
          response.user.role === "ROLE_STUDENT" && returnTo ? returnTo : resumeCheckout ? ROUTES.checkout : getRoleHome(response.user.role),
          { replace: true },
        );
      },
    });
  }

  /** Tài khoản chưa kích hoạt: sang trang nhập mã OTP với email đang gõ */
  function goToVerification() {
    const email = getValues("email");
    savePendingEmail(email, false, resumeCheckout);
    navigate(ROUTES.verifyEmail, { state: { email, resumeCheckout } satisfies AuthLocationState });
  }

  // Tài khoản chưa kích hoạt → gợi ý nhập mã thay vì báo lỗi
  const notVerified = Boolean(error) && authErrorCode(error) === "ACCOUNT_NOT_VERIFIED";

  return (
    <div>
      <AuthHeading title="Đăng nhập" description="Xem lịch học và theo dõi lớp của bạn." />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        {notice && !error && <AuthNotice tone="success">{notice}</AuthNotice>}
        {googleError && !error && <AuthNotice tone="error">{googleLoginErrorMessage(googleError)}</AuthNotice>}

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
          <Link to={ROUTES.forgotPassword} className={`text-[13.5px] ${AUTH_TEXT_LINK}`}>
            Quên mật khẩu?
          </Link>
        </p>

        {error && (
          <AuthNotice tone={notVerified ? "info" : "error"}>
            {authErrorMessage(error, "Đăng nhập chưa thành công. Vui lòng thử lại.")}
            {notVerified && (
              <button type="button" onClick={goToVerification} className={`mt-1.5 block ${AUTH_TEXT_LINK}`}>
                Nhập mã xác thực
              </button>
            )}
          </AuthNotice>
        )}

        <AuthSubmitButton id="login-submit" label="Đăng nhập" pendingLabel="Đang đăng nhập…" isPending={isPending} />
      </form>

      {GOOGLE_LOGIN_ENABLED && (
        <>
          {/* Đăng nhập Google đi thẳng tới backend (Spring Security OAuth2), xong quay về /oauth2/success */}
          <div className="my-5 flex items-center gap-3 text-[13px] text-brand-muted" aria-hidden="true">
            <span className="h-px flex-1 bg-brand-sandLine" />
            hoặc
            <span className="h-px flex-1 bg-brand-sandLine" />
          </div>
          <a
            id="login-google"
            href={googleLoginUrl()}
            className="flex h-11 w-full items-center justify-center gap-2.5 rounded-md border border-brand-sandLine bg-white text-[15px] font-semibold text-brand-ink transition-colors hover:bg-brand-sand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
          >
            <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5">
              <path
                fill="#FFC107"
                d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
              />
              <path
                fill="#FF3D00"
                d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
              />
              <path
                fill="#4CAF50"
                d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"
              />
              <path
                fill="#1976D2"
                d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
              />
            </svg>
            Đăng nhập bằng Google
          </a>
        </>
      )}
    </div>
  );
}
