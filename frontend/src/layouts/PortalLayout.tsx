import { Link, Outlet, useNavigate } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { ASSETS } from "@/constants/assets";
import { FOCUS_RING as FOCUS, PORTAL_SURFACE } from "@/constants/classNames";
import { ROLE_NAME } from "@/constants/labels";
import { ROUTES } from "@/constants/routes";
import { AccountMenu } from "@/components/dashboard/AccountMenu";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { PortalNav } from "@/components/dashboard/PortalNav";
import { ChatWidget } from "@/components/assistant/ChatWidget";
import { ClickSpark } from "@/components/motion";
import { formatLongDate } from "@/utils/sessions";
import { startOfToday } from "@/utils/date";
import { useAuthStore } from "@/stores/authStore";
import type { Role } from "@/interfaces/dto";
import type { PortalLayoutProps } from "@/interfaces/portal";

// Khung chung của ba khu sau đăng nhập.
// Máy tính: thanh bên màu navy (logo, điều hướng) + thanh trên mờ có ngày hôm nay.
// Điện thoại: thanh trên có logo, điều hướng nằm ở thanh dưới đáy.
// Cả hai: avatar góc phải thanh trên mở menu tài khoản (Hồ sơ, Đăng xuất).
// Nền giấy kẻ ô màu be — cùng tông với trang chủ. Việc chặn theo đăng nhập / vai trò do PrivateRoute + RoleRoute lo.
export function PortalLayout({ areaLabel, homeTo, profileTo, navItems }: PortalLayoutProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const roleName = user ? ROLE_NAME[user.role as Role] : "";

  // Đăng xuất rồi đưa về trang đăng nhập
  function handleLogout() {
    logout();
    navigate(ROUTES.login);
  }

  return (
    <div className={`min-h-screen font-sans text-brand-ink antialiased ${PORTAL_SURFACE}`}>
      <PortalNav items={navItems} label={areaLabel} homeTo={homeTo} />
      {
        // Bóng gáy sách đổ lên trang giấy bên cạnh
      }
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-y-0 left-[228px] z-30 hidden w-5 bg-gradient-to-r from-[#082A66]/20 to-transparent lg:block"
      />

      <div className="min-h-screen lg:pl-[228px]">
        {
          // Thanh trên: điện thoại có logo; máy tính chỉ có ngày hôm nay và tài khoản
        }
        <header className="sticky top-0 z-30 border-b border-brand-sandLine/80 bg-brand-sand/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-[1240px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
            <Link to={homeTo} className={`flex min-w-0 items-center gap-2.5 rounded lg:hidden ${FOCUS}`}>
              <img src={ASSETS.common.logo} alt="" className="h-9 w-9 rounded-full bg-white object-contain ring-1 ring-brand-sandLine" />
              <span className="whitespace-nowrap text-[16px] font-extrabold uppercase tracking-tight text-brand-navy">
                Tri Viet <span className="text-brand-orange">Tutor</span>
              </span>
            </Link>

            <p className="hidden items-center gap-2 text-[14px] font-medium text-brand-muted lg:flex">
              <Icon name="calendar_today" className="text-[18px] text-brand-orange" />
              {formatLongDate(startOfToday())}
            </p>

            <div className="flex items-center gap-2.5">
              <NotificationBell />
              <AccountMenu
                userId={user?.id}
                fullName={user?.fullName ?? ""}
                roleName={roleName}
                email={user?.email}
                profileTo={profileTo}
                onLogout={handleLogout}
              />
            </div>
          </div>
        </header>

        {
          // Nền giấy kẻ ô thật mờ, giống các trang công khai
        }
        <div className="paper-grid-soft">
          <main className="mx-auto max-w-[1240px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pb-12 lg:pt-7">
            <Outlet />
          </main>
        </div>
      </div>
      <ChatWidget placement="portal" />
      {
        // Hiệu ứng tia sáng khi bấm chuột, giống các trang công khai (tự tắt nếu máy bật giảm chuyển động)
      }
      <ClickSpark />
    </div>
  );
}
