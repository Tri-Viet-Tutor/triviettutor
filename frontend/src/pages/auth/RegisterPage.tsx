import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { ROUTES } from "@/constants/routes";
import { AUTH_TEXT_LINK } from "@/constants/classNames";
import { AuthField } from "@/components/auth/AuthField";
import { AuthHeading } from "@/components/auth/AuthHeading";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { authErrorMessage } from "@/utils/errors";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/constants/auth";
import { savePendingEmail, savePendingPhone } from "@/utils/pendingEmail";
import type { AuthLocationState, RegisterFormValues } from "@/interfaces/auth";
import { registerStudent } from "@/services/authService";

// Kiểm tra form đăng ký
const registerSchema = z
  .object({
    // Giới hạn giống RegisterRequest của backend: họ tên 2 – 100, mật khẩu 6 – 128 ký tự
    fullName: z.string().trim().min(2, "Họ tên có ít nhất 2 ký tự").max(100, "Họ tên tối đa 100 ký tự"),
    email: z.string().email("Email chưa đúng"),
    // Số Việt Nam: 0 hoặc +84 rồi 9 chữ số; cho phép gõ kèm khoảng trắng, dấu chấm, gạch nối
    phone: z
      .string()
      .trim()
      .min(1, "Hãy nhập số điện thoại")
      .transform((value) => value.replace(/[\s.-]/g, ""))
      .refine((value) => /^(0|\+84)\d{9}$/.test(value), "Số điện thoại chưa đúng (ví dụ 0912 345 678)"),
    password: z
      .string()
      .min(PASSWORD_MIN, `Mật khẩu có ít nhất ${PASSWORD_MIN} ký tự`)
      .max(PASSWORD_MAX, `Mật khẩu tối đa ${PASSWORD_MAX} ký tự`),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hai mật khẩu chưa khớp",
    path: ["confirmPassword"],
  });

// Trang tự đăng ký tài khoản cho học viên / phụ huynh (BR-01.04).
// Tài khoản quản trị và gia sư do quản trị viên tạo.
// Backend không đăng nhập ngay sau khi đăng ký nữa: POST /auth/register tạo tài khoản chưa kích hoạt
// và gửi mã OTP qua email (trả về { email, message }). Vì vậy đăng ký xong thì chuyển sang
// trang nhập mã OTP; phiên đăng nhập chỉ có sau khi xác thực (xem VerifyEmailPage).
// Backend /auth/register chưa nhận số điện thoại, nên số được giữ tạm và lưu vào hồ sơ (PUT /me)
// ngay sau khi xác thực xong (xem EmailOtpForm).
export function RegisterPage() {
  const navigate = useNavigate();

  const {
    mutate: register,
    isPending,
    error,
  } = useMutation({
    mutationFn: registerStudent,
  });

  const {
    register: formRegister,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  // Gửi đăng ký; thành công thì ghi nhớ email đang chờ mã và sang trang nhập OTP
  function onSubmit(data: RegisterFormValues) {
    register(
      { email: data.email, password: data.password, fullName: data.fullName },
      {
        onSuccess: () => {
          savePendingEmail(data.email, true);
          savePendingPhone(data.email, data.phone);
          navigate(ROUTES.verifyEmail, { state: { email: data.email } satisfies AuthLocationState });
        },
      },
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
          id="reg-phone"
          label="Số điện thoại"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="0912 345 678"
          error={errors.phone?.message}
          {...formRegister("phone")}
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

        <AuthSubmitButton id="register-submit" label="Tạo tài khoản" pendingLabel="Đang tạo tài khoản…" isPending={isPending} />
      </form>

      <p className="mt-6 text-center text-[14px] text-brand-muted">
        Đã có tài khoản?{" "}
        <Link to={ROUTES.login} className={AUTH_TEXT_LINK}>
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
