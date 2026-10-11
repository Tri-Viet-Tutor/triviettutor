import { NavLink } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import type { PortalNavItem } from "@/features/portal/data/ui";

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

interface PortalNavProps {
  /** Các trang của khu; thanh dưới ở điện thoại chỉ vừa 5 mục, mục thừa đánh dấu `desktopOnly` */
  items: PortalNavItem[];
  /** Tên khu, đọc cho trình đọc màn hình */
  label: string;
  onLogout: () => void;
}

/**
 * Điều hướng của một khu sau đăng nhập (học viên, gia sư, quản trị).
 * Máy tính: thanh bên trái màu trắng, nằm dưới thanh trên (biểu tượng + tên trang, cuối thanh là nút
 * đăng xuất). Điện thoại: thanh dưới đáy màn hình, cao 60px.
 */
export function PortalNav({ items, label, onLogout }: PortalNavProps) {
  const mobileItems = items.filter((item) => !item.desktopOnly);
  return (
    <>
      <aside className="fixed bottom-0 left-0 top-16 z-30 hidden w-[240px] flex-col border-r border-slate-200 bg-white px-4 pb-5 pt-6 lg:flex">
        <nav aria-label={label} className="flex flex-1 flex-col gap-1.5">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex h-12 items-center gap-3 rounded-xl px-4 text-[15px] transition-colors ${FOCUS} ${
                  isActive ? "bg-brand-tint font-semibold text-brand-navy" : "font-medium text-brand-muted hover:bg-slate-50 hover:text-brand-navy"
                }`
              }
            >
              <Icon name={item.icon} className="text-[23px]" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <button
          type="button"
          onClick={onLogout}
          className={`flex h-11 items-center justify-center gap-2 rounded-full text-[14px] font-semibold text-brand-muted transition-colors hover:bg-slate-50 hover:text-brand-navy ${FOCUS}`}
        >
          <Icon name="logout" className="text-[19px]" />
          Đăng xuất
        </button>
      </aside>

      <nav
        aria-label={label}
        style={{ gridTemplateColumns: `repeat(${mobileItems.length}, minmax(0, 1fr))` }}
        className="fixed inset-x-0 bottom-0 z-40 grid h-[60px] items-center border-t border-slate-200 bg-white lg:hidden"
      >
        {mobileItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 py-1.5 text-[11.5px] font-medium focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-navy ${
                isActive ? "text-brand-navy" : "text-slate-500"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`flex h-7 w-11 items-center justify-center rounded-full ${isActive ? "bg-brand-tint" : ""}`}>
                  <Icon name={item.icon} className="text-[22px]" />
                </span>
                {item.shortLabel ?? item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
