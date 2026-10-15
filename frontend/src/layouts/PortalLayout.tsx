import { Link, Outlet, useNavigate } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { ASSETS } from "@/constants/assets";
import { FOCUS_RING as FOCUS, PORTAL_SURFACE } from "@/constants/classNames";
import { ROUTES } from "@/constants/routes";
import { PortalNav } from "@/components/dashboard/PortalNav";
import { nameInitial } from "@/utils/sessions";
import { useAuthStore } from "@/stores/authStore";
import type { PortalLayoutProps } from "@/interfaces/portal";

/**
 * Khung chung của ba khu sau đăng nhập: thanh trên có logo, tên khu và tài khoản;
 * thanh điều hướng bên trái (điện thoại: thanh dưới đáy); nền chấm bi nhạt.
 * Việc chặn theo đăng nhập / vai trò vẫn do PrivateRoute + RoleRoute ở AppRouter lo.
 */
export function PortalLayout({ areaLabel, homeTo, profileTo, navItems }: PortalLayoutProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  /** Đăng xuất rồi đưa về trang đăng nhập */
  function handleLogout() {
    logout();
    navigate(ROUTES.login);
  }

  return (
    <div className={`min-h-screen font-sans text-brand-ink antialiased ${PORTAL_SURFACE}`}>
      {/* Thanh trên cùng: logo + tên khu bên trái, tài khoản bên phải */}
      <header className="fixed inset-x-0 top-0 z-40 h-16 border-b border-slate-200 bg-white">
        <div className="flex h-full items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Link to={homeTo} className={`flex items-center gap-2.5 rounded ${FOCUS}`}>
              <img src={ASSETS.common.logo} alt="" className="h-10 w-10 rounded-full bg-white object-contain ring-1 ring-brand-line" />
              <span className="whitespace-nowrap text-[17px] font-extrabold uppercase tracking-tight text-brand-navy">
                Tri Viet <span className="text-brand-orange">Tutor</span>
              </span>
            </Link>
            <span className="hidden rounded-full bg-brand-tint px-3 py-1 text-[13px] font-semibold text-brand-navy md:block">
              {areaLabel}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              to={profileTo}
              aria-label={`Hồ sơ của ${user?.fullName ?? "tôi"}`}
              className={`flex items-center gap-2.5 rounded-full border border-slate-200 bg-white p-1 transition-colors hover:border-brand-navy/40 sm:pr-3.5 ${FOCUS}`}
            >
              <span
                aria-hidden="true"
                className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-navy text-[14px] font-bold text-white"
              >
                {nameInitial(user?.fullName ?? "")}
              </span>
              <span className="hidden max-w-[180px] truncate text-[14px] font-semibold text-brand-ink sm:block">{user?.fullName}</span>
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Đăng xuất"
              className={`flex h-10 w-10 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-navy lg:hidden ${FOCUS}`}
            >
              <Icon name="logout" className="text-[21px]" />
            </button>
          </div>
        </div>
      </header>

      <PortalNav items={navItems} label={areaLabel} onLogout={handleLogout} />

      {/* Nền chấm bi nhạt như trang vở */}
      <div className="min-h-screen bg-[radial-gradient(#DCE6F5_1px,transparent_1.4px)] pt-16 [background-size:22px_22px] lg:pl-[240px]">
        <main className="mx-auto max-w-[1180px] px-4 pb-28 pt-7 sm:px-6 lg:px-10 lg:pb-14">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
