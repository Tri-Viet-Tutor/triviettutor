import { Link, Outlet } from "react-router-dom";
import { ASSETS } from "@/constants/assets";
import { ROUTES } from "@/constants/routes";
import { AuthBrandPanel } from "@/features/auth/components/AuthBrandPanel";
import { BackHomeLink } from "@/features/auth/components/BackHomeLink";

/**
 * AuthLayout
 *
 * Khung chung của các trang xác thực (/login, /register, /verify-email, /forgot-password, /reset-password).
 * Chia đôi màn hình: bên trái là tấm ảnh phủ xanh (từ màn hình lớn), bên phải là form
 * trong một khung trắng bo góc, đầu khung có logo trung tâm.
 */
export function AuthLayout() {
  return (
    <div className="min-h-screen bg-[#F3F6FC] text-brand-ink lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <AuthBrandPanel />

      <div className="flex min-h-screen flex-col px-4 py-6 sm:px-8 lg:py-10">
        {/* Nút về trang chủ cho màn hình nhỏ; từ màn hình lớn nút này nằm ở tấm ảnh bên trái */}
        <header className="lg:hidden">
          <BackHomeLink tone="onLight" />
        </header>

        <main className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-[420px] rounded-2xl border border-slate-200 bg-white px-6 py-8 shadow-[0_24px_48px_-32px_rgba(8,42,102,0.45)] sm:px-9 sm:py-10">
            <Link
              to={ROUTES.home}
              aria-label="Tri Viet Tutor — về trang chủ"
              className="mx-auto mb-6 flex w-fit items-center gap-2.5 rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-navy"
            >
              <img src={ASSETS.common.logo} alt="" className="h-11 w-11 rounded-full border border-slate-200 bg-white object-contain" />
              <span className="text-[17px] font-extrabold tracking-tight text-brand-navy">
                TRI VIET <span className="text-brand-orangeHover">TUTOR</span>
              </span>
            </Link>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
