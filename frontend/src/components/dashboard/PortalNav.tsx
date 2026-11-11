import { Link, NavLink } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { ASSETS } from "@/constants/assets";
import { FOCUS_RING as FOCUS } from "@/constants/classNames";
import type { PortalNavProps } from "@/interfaces/portal";

// Đai nổi ngang trên gáy sách: gờ vải nổi kẹp giữa hai đường chỉ vàng
function SpineBand() {
  return (
    <div aria-hidden="true" className="relative mx-0 h-3.5 shrink-0">
      <div className="absolute inset-x-0 top-0 h-px bg-[#D9B45A]/70" />
      <div className="absolute inset-x-0 top-[3px] h-[8px] bg-gradient-to-b from-white/[0.12] via-black/10 to-black/35" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-[#D9B45A]/70" />
    </div>
  );
}

// Viền bàn phím trên nền navy
const FOCUS_ON_DARK = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-orange";

// Điều hướng của một khu sau đăng nhập (học viên, gia sư, quản trị).
// Máy tính: thanh bên là gáy sách bìa cứng bọc vải navy — tên trường và mục lục ép nhũ vàng, các đai nổi ngang;
// mục đang mở là nhãn giấy dán trên gáy kèm dải ruy băng cam đánh dấu trang.
// Tài khoản và đăng xuất nằm ở menu avatar góc phải thanh trên (PortalLayout).
// Điện thoại: thanh dưới đáy màn hình, cao 64px.
export function PortalNav({ items, label, homeTo }: PortalNavProps) {
  // Thanh dưới của điện thoại bỏ các mục chỉ dành cho máy tính
  const mobileItems = items.filter((item) => !item.desktopOnly);
  return (
    <>
      {
        // Máy tính: thanh bên trái thiết kế như gáy một cuốn sách bìa cứng bọc vải navy, chữ ép nhũ vàng
      }
      <aside
        className="fixed inset-y-0 left-0 z-40 hidden w-[228px] flex-col overflow-hidden text-[#F3E3B5] lg:flex"
        style={{
          // Vải bọc: nền navy + thớ vải dọc rất mờ
          backgroundColor: "#0A2B6B",
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 3px), repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0 1px, transparent 1px 4px)",
        }}
      >
        {
          // Độ cong của gáy: tối ở hai mép, sáng ở giữa
        }
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.12) 9%, rgba(255,255,255,0.07) 38%, rgba(255,255,255,0.03) 62%, rgba(0,0,0,0.18) 88%, rgba(0,0,0,0.5) 100%)",
          }}
        />
        {
          // Rãnh bản lề sát mép phải, nơi gáy gặp bìa
        }
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-[7px] w-px bg-black/35" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-[6px] w-px bg-white/10" />

        {
          // Đai nổi trên cùng (gân gáy) với hai đường chỉ vàng
        }
        <SpineBand />

        {
          // Nhãn gáy: tên trường ép nhũ trong khung viền vàng đôi
        }
        <div className="relative px-4 pb-4 pt-4">
          <Link
            to={homeTo}
            className={`block rounded-md border border-[#D9B45A]/70 p-[3px] transition-colors hover:border-[#F1D48A] ${FOCUS_ON_DARK}`}
          >
            <span className="flex flex-col items-center gap-1.5 rounded-[4px] border border-[#D9B45A]/45 px-2 py-3 text-center">
              <img src={ASSETS.common.logo} alt="" className="h-10 w-10 rounded-full bg-[#F6EFDF] object-contain p-0.5 ring-2 ring-[#D9B45A]/70" />
              <span className="font-serif text-[15px] font-bold uppercase leading-tight tracking-[0.18em] text-[#F1D48A] [text-shadow:0_1px_0_rgba(0,0,0,0.45)]">
                Tri Viet
                <br />
                Tutor
              </span>
              <span aria-hidden="true" className="flex items-center gap-1.5 text-[#D9B45A]/80">
                <span className="h-px w-5 bg-current" />
                <span className="text-[9px]">◆</span>
                <span className="h-px w-5 bg-current" />
              </span>
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.22em] text-[#E8D5A0]/80">{label}</span>
            </span>
          </Link>
        </div>

        <SpineBand />

        {
          // Mục lục: mỗi mục là một dòng ép nhũ; mục đang mở là nhãn giấy dán trên gáy, có dải ruy băng cam
        }
        <nav aria-label={label} className="relative flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `group relative flex min-h-[40px] items-center gap-2.5 rounded-[5px] py-1.5 pl-3 pr-2.5 text-[13.5px] transition-colors ${FOCUS_ON_DARK} ${
                  isActive
                    ? "bg-[#F6EFDF] font-bold text-brand-navyDeep shadow-[inset_0_0_0_1px_rgba(217,180,90,0.9),inset_0_0_0_3px_#F6EFDF,inset_0_0_0_4px_rgba(217,180,90,0.45),0_6px_14px_-8px_rgba(0,0,0,0.7)]"
                    : "font-medium text-[#E8D5A0]/80 hover:bg-white/[0.06] hover:text-[#F7E7B8]"
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {
                    // Dải ruy băng đánh dấu trang, thò ra từ mép trên nhãn
                  }
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-1 right-3 h-[calc(100%+12px)] w-2.5 bg-brand-orange shadow-[0_2px_3px_rgba(0,0,0,0.35)] [clip-path:polygon(0_0,100%_0,100%_100%,50%_82%,0_100%)]"
                    />
                  )}
                  <Icon
                    name={item.icon}
                    className={`shrink-0 text-[19px] ${isActive ? "text-brand-navy" : "text-[#D9B45A]/85 group-hover:text-[#F1D48A]"}`}
                  />
                  <span className="pr-4 leading-snug [text-shadow:inherit]">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {
          // Đai nổi dưới cùng và dấu nhà xuất bản
        }
        <SpineBand />
        <div className="relative flex justify-center pb-5 pt-3" aria-hidden="true">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#D9B45A]/60 text-[#D9B45A]">
            <Icon name="auto_stories" className="text-[18px]" />
          </span>
        </div>
      </aside>

      {
        // Điện thoại: thanh dưới đáy, chia đều số cột theo số mục
      }
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
