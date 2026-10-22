import { Link, NavLink } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { ASSETS } from "@/constants/assets";
import { FOCUS_RING as FOCUS } from "@/constants/classNames";
import type { PortalNavProps } from "@/interfaces/portal";

/** Viền bàn phím trên nền navy */
const FOCUS_ON_DARK = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange";

/**
 * Điều hướng của một khu sau đăng nhập (học viên, gia sư, quản trị).
 * Máy tính: thanh bên màu navy như dải băng menu ở trang chủ — mục đang mở nền trắng, có thẻ đánh dấu màu cam.
 * Tài khoản và đăng xuất nằm ở menu avatar góc phải thanh trên (PortalLayout).
 * Điện thoại: thanh dưới đáy màn hình, cao 64px.
 */
export function PortalNav({ items, label, homeTo }: PortalNavProps) {
  // Thanh dưới của điện thoại bỏ các mục chỉ dành cho máy tính
  const mobileItems = items.filter((item) => !item.desktopOnly);
  return (
    <>
      {/* Máy tính: thanh bên trái */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[228px] flex-col overflow-hidden bg-gradient-to-b from-brand-navyDeep via-brand-navyDark to-brand-navy text-white lg:flex">
        {/* Hoa văn: lưới mờ + vầng sáng cam ở góc */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:28px_28px]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-brand-orange/25 blur-3xl"
        />

        <div className="relative px-4 pb-3 pt-4">
          <Link to={homeTo} className={`flex items-center gap-3 rounded-xl ${FOCUS_ON_DARK}`}>
            <img src={ASSETS.common.logo} alt="" className="h-9 w-9 rounded-full bg-white object-contain p-0.5 shadow-lg" />
            <span className="whitespace-nowrap text-[15.5px] font-extrabold uppercase tracking-tight">
              Tri Viet <span className="text-brand-orange">Tutor</span>
            </span>
          </Link>
        </div>

        <nav aria-label={label} className="relative flex flex-1 flex-col gap-0.5 overflow-y-auto px-2.5 pb-4">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `group relative flex min-h-[40px] items-center gap-2.5 rounded-xl py-1.5 pl-3 pr-2.5 text-[13.5px] transition-colors ${FOCUS_ON_DARK} ${
                  isActive
                    ? "bg-white font-bold text-brand-navy shadow-[0_8px_20px_-10px_rgba(0,0,0,0.55)]"
                    : "font-medium text-white/75 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Thẻ đánh dấu trang đang mở, như dải ruy băng cam ở menu trang chủ */}
                  {isActive && <span aria-hidden="true" className="absolute -left-2.5 top-2 bottom-2 w-1 rounded-r-full bg-brand-orange" />}
                  <span
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      isActive ? "bg-brand-orange/15 text-brand-orangeHover" : "bg-white/5 text-white/80 group-hover:text-white"
                    }`}
                  >
                    <Icon name={item.icon} className="text-[18px]" />
                  </span>
                  <span className="leading-snug">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Điện thoại: thanh dưới đáy, chia đều số cột theo số mục */}
      <nav
        aria-label={label}
        style={{ gridTemplateColumns: `repeat(${mobileItems.length}, minmax(0, 1fr))` }}
        className="fixed inset-x-0 bottom-0 z-40 grid h-16 items-center border-t border-brand-sandLine bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {mobileItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-1.5 text-[11px] font-semibold ${FOCUS} ${isActive ? "text-brand-navy" : "text-slate-500"}`
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={`flex h-7 w-12 items-center justify-center rounded-full transition-colors ${
                    isActive ? "bg-brand-navy text-white" : ""
                  }`}
                >
                  <Icon name={item.icon} className="text-[21px]" />
                </span>
                <span className="max-w-full truncate px-0.5">{item.shortLabel ?? item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
