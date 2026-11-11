import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";
import { ROUTES } from "@/constants/routes";
import { AUTH_TEXT_LINK } from "@/constants/classNames";
import { AuthField } from "@/components/auth/AuthField";
import { AuthHeading } from "@/components/auth/AuthHeading";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { Icon } from "@/components/ui/Icon";
import type { ForgotFormValues } from "@/interfaces/auth";
import { requestPasswordReset } from "@/services/authService";
import { authErrorMessage } from "@/utils/errors";

// Kiểm tra form quên mật khẩu
const forgotSchema = z.object({
  email: z.string().email("Email chưa đúng"),
});

// Trang "Quên mật khẩu": nhập email để nhận liên kết đặt lại mật khẩu qua email.
export function ForgotPasswordPage() {
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);
  const { mutate, isPending, error, reset } = useMutation({ mutationFn: requestPasswordReset });
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotFormValues>({ resolver: zodResolver(forgotSchema) });

  // Gửi email đặt lại mật khẩu
  function onSubmit(data: ForgotFormValues) {
    mutate(data, {
      onSuccess: () => {
        setSubmittedEmail(data.email);
      },
    });
  }

  // Quay lại form để nhập email khác
  function handleRetry() {
    setSubmittedEmail(null);
    reset();
  }

  if (submittedEmail) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <Icon name="mail" className="text-[28px]" />
        </div>

        <AuthHeading title="Kiểm tra hộp thư của bạn" description={`Chúng tôi đã gửi hướng dẫn đặt lại mật khẩu tới ${submittedEmail}.`} />

        <div className="my-6 rounded-lg border border-brand-navy/10 bg-brand-tint/60 p-4 text-left text-[14px] text-brand-navyDeep">
          <p className="font-medium">Các bước tiếp theo:</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-brand-muted">
            <li>Mở email từ VietTriTutor (kiểm tra cả mục Spam / Thư rác).</li>
            <li>
              Nhấn vào nút <strong>"Đặt lại mật khẩu"</strong> trong email.
            </li>
            <li>
              Liên kết có hiệu lực trong vòng <strong>15 phút</strong>.
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <button
            type="button"
            onClick={handleRetry}
            className="w-full rounded-lg border border-brand-navy/20 bg-white py-2.5 text-[14px] font-semibold text-brand-navy transition hover:bg-slate-50"
          >
            Gửi lại hoặc đổi email khác
          </button>

          <p className="text-[14px] text-brand-muted">
            <Link to={ROUTES.login} className={AUTH_TEXT_LINK}>
              Quay lại đăng nhập
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AuthHeading title="Quên mật khẩu" description="Nhập email đã đăng ký, hệ thống sẽ gửi liên kết để bạn đặt lại mật khẩu." />

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

        {error && <AuthNotice tone="error">{authErrorMessage(error, "Chưa gửi được email. Vui lòng thử lại.")}</AuthNotice>}

        <AuthSubmitButton label="Gửi liên kết đặt lại" pendingLabel="Đang gửi…" isPending={isPending} />
      </form>

      <p className="mt-6 text-center text-[14px] text-brand-muted">
        Nhớ ra mật khẩu rồi?{" "}
        <Link to={ROUTES.login} className={AUTH_TEXT_LINK}>
          Đăng nhập
        </Link>
      </p>
    </div>
  );
}
