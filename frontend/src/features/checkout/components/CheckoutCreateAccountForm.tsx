import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { ROUTES } from "@/constants/routes";
import { AuthField } from "@/features/auth/components/AuthField";
import { AuthNotice } from "@/features/auth/components/AuthNotice";
import { AuthSubmitButton } from "@/features/auth/components/AuthSubmitButton";
import { authErrorCode, authErrorMessage, PASSWORD_MAX, PASSWORD_MIN } from "@/features/auth/data/authMessages";
import { savePendingEmail, type AuthLocationState } from "@/features/auth/data/pendingEmail";
import { registerStudent } from "@/lib/auth";

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

type AccountValues = z.infer<typeof accountSchema>;

const TEXT_LINK =
  "font-semibold text-brand-navy underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

interface CheckoutCreateAccountFormProps {
  /** Họ tên và email đã điền ở bước thông tin học viên */
  fullName: string;
  email: string;
  /** Tài khoản vừa được tạo, backend đã gửi mã OTP tới email này */
  onRegistered: (email: string) => void;
}

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
  } = useForm<AccountValues>({ resolver: zodResolver(accountSchema), defaultValues: { fullName, email } });

  function onSubmit(data: AccountValues) {
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
            <Link to={ROUTES.login} state={{ email: getValues("email") } satisfies AuthLocationState} className={`mt-1 block ${TEXT_LINK}`}>
              Đăng nhập
            </Link>
          )}
        </AuthNotice>
      )}

      <AuthSubmitButton label="Tạo tài khoản" pendingLabel="Đang gửi mã xác thực…" isPending={isPending} />
    </form>
  );
}
