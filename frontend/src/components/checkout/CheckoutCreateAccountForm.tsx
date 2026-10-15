import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { AuthField } from "@/components/auth/AuthField";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/constants/auth";
import { AUTH_TEXT_LINK } from "@/constants/classNames";
import { ROUTES } from "@/constants/routes";
import type { AuthLocationState } from "@/interfaces/auth";
import { registerStudent } from "@/services/authService";
import { authErrorCode, authErrorMessage } from "@/utils/errors";
import { savePendingEmail } from "@/utils/pendingEmail";
import type { CheckoutAccountFormValues, CheckoutCreateAccountFormProps } from "@/interfaces/checkout";

/** Kiểm tra form tạo tài khoản */
const accountSchema = z
  .object({
    // Giới hạn theo RegisterRequest của backend: họ tên 2 – 100, mật khẩu 6 – 128
    fullName: z.string().trim().min(2, "Họ tên có ít nhất 2 ký tự").max(100, "Họ tên tối đa 100 ký tự"),
    email: z.string().trim().email("Email chưa đúng"),
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

/**
 * Bước cuối của thanh toán, chỉ hiện sau khi đã thanh toán xong: đặt mật khẩu để tạo tài khoản học viên.
 * Gọi POST /auth/register (backend gửi mã OTP qua email); trang thanh toán hiện tiếp ô nhập mã ngay tại chỗ.
 */
export function CheckoutCreateAccountForm({ fullName, email, onRegistered }: CheckoutCreateAccountFormProps) {
  const { mutate, isPending, error } = useMutation({ mutationFn: registerStudent });
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<CheckoutAccountFormValues>({ resolver: zodResolver(accountSchema), defaultValues: { fullName, email } });

  /** Gửi đăng ký; thành công thì ghi nhớ email đang chờ mã và báo lên trên */
  function onSubmit(data: CheckoutAccountFormValues) {
    const accountEmail = data.email.trim();
    mutate(
      { email: accountEmail, password: data.password, fullName: data.fullName.trim() },
      {
        onSuccess: () => {
          // Ghi nhớ để tải lại trang vẫn ở bước nhập mã
          savePendingEmail(accountEmail, true, true);
          onRegistered(accountEmail);
        },
      },
    );
  }

  // Email đã có tài khoản → gợi ý đăng nhập thay vì báo lỗi
  const emailTaken = Boolean(error) && authErrorCode(error) === "EMAIL_ALREADY_EXISTS";

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <input type="hidden" {...register("fullName")} />
      <AuthField
        id="account-email"
        label="Email đăng nhập"
        type="email"
        autoComplete="email"
        error={errors.email?.message ?? errors.fullName?.message}
        {...register("email")}
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AuthField
          id="account-password"
          label="Mật khẩu"
          type="password"
          autoComplete="new-password"
          placeholder={`Ít nhất ${PASSWORD_MIN} ký tự`}
          error={errors.password?.message}
          {...register("password")}
        />
        <AuthField
          id="account-confirm"
          label="Nhập lại mật khẩu"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
      </div>

      {error && (
        <AuthNotice tone={emailTaken ? "info" : "error"}>
          {authErrorMessage(error, "Chưa tạo được tài khoản. Vui lòng thử lại.")}
          {emailTaken && (
            <Link
              to={ROUTES.login}
              state={{ email: getValues("email") } satisfies AuthLocationState}
              className={`mt-1 block ${AUTH_TEXT_LINK}`}
            >
              Đăng nhập
            </Link>
          )}
        </AuthNotice>
      )}

      <AuthSubmitButton label="Tạo tài khoản" pendingLabel="Đang gửi mã xác thực…" isPending={isPending} />
    </form>
  );
}
