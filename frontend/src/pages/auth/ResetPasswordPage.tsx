import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { ROUTES } from "@/constants/routes";
import { resetPassword } from "@/features/auth/api/authApi";
import { AuthField } from "@/features/auth/components/AuthField";
import { AuthHeading } from "@/features/auth/components/AuthHeading";
import { AuthNotice } from "@/features/auth/components/AuthNotice";
import { AuthSubmitButton } from "@/features/auth/components/AuthSubmitButton";
import {
  authErrorMessage,
  PASSWORD_MAX,
  PASSWORD_MIN,
} from "@/features/auth/data/authMessages";
import type { AuthLocationState } from "@/features/auth/data/pendingEmail";
import { Icon } from "@/components/ui/Icon";

const resetSchema = z
  .object({
    newPassword: z
      .string()
      .min(PASSWORD_MIN, `Mật khẩu có ít nhất ${PASSWORD_MIN} ký tự`)
      .max(PASSWORD_MAX, `Mật khẩu tối đa ${PASSWORD_MAX} ký tự`),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Hai mật khẩu chưa khớp nhau",
    path: ["confirmPassword"],
  });

type ResetFormValues = z.infer<typeof resetSchema>;

const TEXT_LINK = "font-semibold text-brand-navy underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

/**
 * Trang đặt lại mật khẩu: nhận token từ query param ?token=... trong liên kết email,
 * cho phép người dùng nhập mật khẩu mới và xác nhận để đổi mật khẩu.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const resetMutation = useMutation({ mutationFn: resetPassword });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  function onSubmit(data: ResetFormValues) {
    if (!token) return;

    resetMutation.mutate(
      { token, newPassword: data.newPassword },
      {
        onSuccess: () => {
          navigate(ROUTES.login, {
            replace: true,
            state: {
              notice: "Đã đặt lại mật khẩu thành công. Hãy đăng nhập bằng mật khẩu mới của bạn.",
            } satisfies AuthLocationState,
          });
        },
      },
    );
  }

  // Nếu người dùng truy cập trực tiếp mà không có token từ link email
  if (!token) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <Icon name="warning" className="text-[28px]" />
        </div>

        <AuthHeading
          title="Liên kết không hợp lệ"
          description="Không tìm thấy mã xác thực token đặt lại mật khẩu trong liên kết của bạn."
        />

        <p className="mb-6 text-[14px] text-brand-muted">
          Vui lòng kiểm tra lại email hoặc gửi yêu cầu mới để nhận liên kết hợp lệ.
        </p>

        <div className="space-y-3">
          <Link
            to={ROUTES.forgotPassword}
            className="inline-block w-full rounded-lg bg-brand-navy py-2.5 text-center text-[14px] font-semibold text-white shadow-sm transition hover:bg-brand-navy/90"
          >
            Gửi lại yêu cầu quên mật khẩu
          </Link>

          <p className="text-[14px] text-brand-muted">
            <Link to={ROUTES.login} className={TEXT_LINK}>
              Quay lại đăng nhập
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AuthHeading
        title="Đặt lại mật khẩu"
        description="Tạo mật khẩu mới cho tài khoản của bạn để hoàn tất việc khôi phục."
      />

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <AuthField
          id="reset-new-password"
          label="Mật khẩu mới"
          type="password"
          autoComplete="new-password"
          placeholder={`Ít nhất ${PASSWORD_MIN} ký tự`}
          error={errors.newPassword?.message}
          {...register("newPassword")}
        />

        <AuthField
          id="reset-confirm-password"
          label="Nhập lại mật khẩu mới"
          type="password"
          autoComplete="new-password"
          placeholder="Nhập lại chính xác mật khẩu mới"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        {resetMutation.error && (
          <div className="space-y-2">
            <AuthNotice tone="error">
              {authErrorMessage(resetMutation.error, "Chưa đặt lại được mật khẩu. Vui lòng thử lại.")}
            </AuthNotice>
            <p className="text-right text-[13px]">
              <Link to={ROUTES.forgotPassword} className={TEXT_LINK}>
                Gửi lại yêu cầu mới?
              </Link>
            </p>
          </div>
        )}

        <AuthSubmitButton
          label="Cập nhật mật khẩu"
          pendingLabel="Đang lưu…"
          isPending={resetMutation.isPending}
        />
      </form>

      <p className="mt-6 text-center text-[14px] text-brand-muted">
        <Link to={ROUTES.login} className={TEXT_LINK}>
          Quay lại đăng nhập
        </Link>
      </p>
    </div>
  );
}
