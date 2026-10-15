import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";
import { ROUTES } from "@/constants/routes";
import { AUTH_TEXT_LINK } from "@/constants/classNames";
import { AuthField } from "@/components/auth/AuthField";
import { AuthHeading } from "@/components/auth/AuthHeading";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { authErrorCode, authErrorMessage } from "@/utils/errors";
import { PASSWORD_MIN } from "@/constants/auth";
import { savePendingEmail } from "@/utils/pendingEmail";
import type { AuthLocationState, LoginFormValues } from "@/interfaces/auth";
import { getRoleHome, login as loginRequest } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";

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

  // Tài khoản chưa kích hoạt → gợi ý nhập mã thay vì báo lỗi
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
    </div>
  );
}
