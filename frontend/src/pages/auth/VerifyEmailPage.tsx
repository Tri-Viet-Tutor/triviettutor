import { type FormEvent, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import { AUTH_INPUT, AUTH_LABEL, AUTH_TEXT_LINK } from "@/constants/classNames";
import { AuthHeading } from "@/components/auth/AuthHeading";
import { AuthSubmitButton } from "@/components/auth/AuthSubmitButton";
import { EmailOtpForm } from "@/components/auth/EmailOtpForm";
import { pendingResumesCheckout, readPendingEmail, savePendingEmail } from "@/utils/pendingEmail";
import type { AuthLocationState } from "@/interfaces/auth";
import { getRoleHome } from "@/services/authService";

/**
 * Trang nhập mã OTP kích hoạt tài khoản (POST /auth/verify-email).
 * Tới từ trang đăng ký (mã vừa gửi) hoặc từ trang đăng nhập khi tài khoản chưa kích hoạt.
 * Mã đúng thì backend trả luôn phiên đăng nhập, nên vào thẳng trang của vai trò
 * (hoặc quay lại trang thanh toán nếu đang mua khóa học dở).
 */
export function VerifyEmailPage() {
  const navigate = useNavigate();
  const state = useLocation().state as AuthLocationState | null;

  const [email, setEmail] = useState(() => state?.email ?? readPendingEmail());
  // Chưa biết email (mở thẳng trang này) thì hỏi email trước
  const [emailLocked, setEmailLocked] = useState(() => Boolean(state?.email ?? readPendingEmail()));
  // Đang mua khóa học dở: xác thực xong quay lại trang thanh toán
  const [resumeCheckout] = useState(() => state?.resumeCheckout ?? pendingResumesCheckout());

  /** Chốt email rồi chuyển sang bước nhập mã */
  function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.trim()) return;
    savePendingEmail(email.trim());
    setEmail(email.trim());
    setEmailLocked(true);
  }

  // Liên kết quay lại đăng nhập, dùng ở cả hai bước
  const backToLogin = (
    <p className="mt-6 text-center text-[14px] text-brand-muted">
      <Link to={ROUTES.login} className={AUTH_TEXT_LINK}>
        Quay lại đăng nhập
      </Link>
    </p>
  );

  if (!emailLocked) {
    return (
      <div>
        <AuthHeading title="Xác thực email" description="Nhập email bạn đã dùng để đăng ký." />
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label htmlFor="verify-email" className={`mb-1.5 ${AUTH_LABEL}`}>
              Email
            </label>
            <input
              id="verify-email"
              type="email"
              required
              autoComplete="email"
              placeholder="ban@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className={AUTH_INPUT}
            />
          </div>
          <AuthSubmitButton label="Tiếp tục" pendingLabel="Tiếp tục" isPending={false} />
        </form>
        {backToLogin}
      </div>
    );
  }

  return (
    <div>
      <AuthHeading title="Nhập mã xác thực" />
      <div className="-mt-5">
        <EmailOtpForm
          key={email}
          email={email}
          onChangeEmail={() => setEmailLocked(false)}
          onVerified={(response) => navigate(resumeCheckout ? ROUTES.checkout : getRoleHome(response.user.role), { replace: true })}
          loginState={{ resumeCheckout }}
        />
      </div>
      {backToLogin}
    </div>
  );
}
