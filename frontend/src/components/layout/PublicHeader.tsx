import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { ASSETS } from "@/constants/assets";
import { ROUTES } from "@/constants/routes";
import { getRoleHome } from "@/services/authService";
import { useAuthStore } from "@/stores/authStore";

/** Các mục của menu chính (3 mục đầu nằm ở trang trái của "cuốn sách", còn lại ở trang phải) */
const NAV_ITEMS = [
  { label: "Trang chủ", to: ROUTES.home },
  { label: "Khối lớp / Môn học", to: ROUTES.subjects },
  { label: "Tìm gia sư", to: ROUTES.tutorSearch },
  { label: "Mua khóa học", to: ROUTES.pricing },
  { label: "Liên hệ", to: ROUTES.contact },
];

/**
 * Thanh đầu trang của các trang công khai.
 * Hàng 1: logo + nút tài khoản / đăng ký; hàng 2 (màn hình lớn): menu hình cuốn sách mở;
 * màn hình nhỏ: menu thả xuống.
 */
export function PublicHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  // Đã đăng nhập thì nút "Đăng nhập" đổi thành lối vào tài khoản + nút đăng xuất
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const accountLink = user ? getRoleHome(user.role) : ROUTES.login;
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <header className="w-full z-50 sticky top-0 bg-white shadow-sm">
      {/* ── Hàng 1: Logo, nút hành động ───────────────────────────────── */}
      <div className="bg-white py-2 sm:py-2.5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-6">
          {/* Logo + tên trung tâm */}
          <Link to={ROUTES.home} className="flex items-center gap-3.5 shrink-0">
            <div className="w-11 h-11 rounded-full p-0.5 ring-1 ring-[#DCE6F5] flex items-center justify-center overflow-hidden shrink-0 bg-white">
              <img src={ASSETS.common.logo} alt="Logo Gia Sư Trí Việt" className="w-full h-full rounded-full object-contain" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-[18px] sm:text-[20px] font-extrabold text-[#0B3A8C] tracking-tight uppercase leading-tight">
                  Tri Viet
                </span>
                <span className="text-[18px] sm:text-[20px] font-extrabold text-[#F5A00F] tracking-tight uppercase leading-tight">
                  Tutor
                </span>
              </div>
              <span className="text-[12px] text-slate-500 font-medium leading-none mt-1">Cùng em vững bước tương lai</span>
            </div>
          </Link>

          {/* Nút hành động */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              to={accountLink}
              className="hidden sm:inline-flex items-center gap-2 h-10 pl-4 pr-5 rounded-full border border-[#0B3A8C]/15 text-[#0B3A8C] hover:border-[#0B3A8C]/40 hover:bg-[#F3F7FF] font-semibold text-[14px] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B3A8C]"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
                account_circle
              </span>
              <span className="max-w-[150px] truncate">{user ? user.fullName : "Đăng nhập"}</span>
            </Link>
            {user && (
              <button
                type="button"
                onClick={logout}
                className="hidden sm:inline-flex h-10 items-center rounded-full px-2 text-[14px] font-semibold text-slate-500 hover:text-[#0B3A8C] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B3A8C]"
              >
                Đăng xuất
              </button>
            )}
            {!user && (
              <Link
                to={ROUTES.register}
                className="group hidden sm:inline-flex items-center gap-3 h-10 pl-5 pr-1.5 rounded-full bg-[#F5A00F] hover:bg-[#FFB534] text-[#082A66] font-bold text-[14px] shadow-[0_10px_22px_-10px_rgba(245,160,15,0.9)] transition-colors shrink-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B3A8C]"
              >
                <span>Đăng ký</span>
                <span
                  aria-hidden="true"
                  className="material-symbols-outlined flex h-7 w-7 items-center justify-center rounded-full bg-[#082A66] text-[17px] text-white transition-transform duration-200 group-hover:translate-x-0.5"
                >
                  arrow_forward
                </span>
              </Link>
            )}

            {/* Nút mở / đóng menu trên điện thoại */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="lg:hidden w-11 h-11 flex items-center justify-center text-[#0B3A8C] rounded-lg hover:bg-[#F3F7FF]"
              aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu"}
              aria-expanded={mobileMenuOpen}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[26px]">
                {mobileMenuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Hàng 2: Thanh menu hình cuốn sách đang mở ─────────────────────
           Hai trang xanh đậm, gáy sách ở giữa, các lớp giấy và bìa lộ ra phía dưới.
           Mục đang chọn được đánh dấu bằng dải ruy băng kẹp sách màu cam. */}
      <div className="hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative -mx-5 h-[54px]">
            <svg
              aria-hidden="true"
              viewBox="0 0 1000 86"
              preserveAspectRatio="none"
              className="pointer-events-none absolute inset-x-0 top-0 h-[86px] w-full"
              style={{ filter: "drop-shadow(0 8px 8px rgba(8, 42, 102, 0.2))" }}
            >
              <defs>
                <linearGradient id="book-spread" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0" stopColor="#0E449F" />
                  <stop offset="0.38" stopColor="#0A3480" />
                  <stop offset="0.5" stopColor="#051B45" />
                  <stop offset="0.62" stopColor="#0A3480" />
                  <stop offset="1" stopColor="#0E449F" />
                </linearGradient>
              </defs>
              {/* Bìa sách */}
              <path d="M0,40 L1000,40 L1000,66 Q1000,70 996,70.3 Q750,73 500,83 Q250,73 4,70.3 Q0,70 0,66 Z" fill="#051B45" />
              {/* Các lớp giấy */}
              <path
                d="M8,40 L992,40 L992,61 Q992,65 988,65.3 Q750,68 500,78 Q250,68 12,65.3 Q8,65 8,61 Z"
                fill="#E9EEF7"
                stroke="rgba(8,42,102,0.35)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d="M4,40 L996,40 L996,56 Q996,60 992,60.3 Q750,63 500,72.5 Q250,63 8,60.3 Q4,60 4,56 Z"
                fill="#FFFFFF"
                stroke="rgba(8,42,102,0.35)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              {/* Hai trang sách */}
              <path
                d="M0,6 Q250,-1 500,7 Q750,-1 1000,6 L1000,50 Q1000,54 996,54.3 Q750,57 500,66 Q250,57 4,54.3 Q0,54 0,50 Z"
                fill="url(#book-spread)"
              />
              {/* Mép sáng phía trên trang */}
              <path
                d="M0,6 Q250,-1 500,7 Q750,-1 1000,6"
                fill="none"
                stroke="rgba(255,255,255,0.28)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              {/* Gáy sách */}
              <path d="M500,7 L500,66" stroke="rgba(0,0,0,0.45)" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
            </svg>

            <nav aria-label="Menu chính" className="relative grid h-full grid-cols-2 pt-1.5">
              {[NAV_ITEMS.slice(0, 3), NAV_ITEMS.slice(3)].map((page, pageIndex) => (
                <div key={pageIndex} className="flex items-center gap-2 px-5">
                  {page.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === ROUTES.home}
                      className={({ isActive }) =>
                        `relative px-4 py-2 text-[14px] rounded-lg transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                          isActive ? "font-bold text-white bg-white/15" : "font-medium text-white/80 hover:text-white hover:bg-white/10"
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {item.label}
                          {isActive && (
                            <span
                              aria-hidden="true"
                              className="pointer-events-none absolute left-1/2 top-[calc(100%+4px)] h-[34px] w-[16px] -translate-x-1/2 bg-gradient-to-r from-[#F5A00F] via-[#FFB534] to-[#DE8B00] shadow-[0_4px_6px_-2px_rgba(8,42,102,0.45)] [clip-path:polygon(0_0,100%_0,100%_100%,50%_76%,0_100%)]"
                            />
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* ── Menu thả xuống trên điện thoại ───────────────────────────── */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200 px-4 py-4 space-y-3 shadow-xl">
          <nav className="flex flex-col space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === ROUTES.home}
                onClick={closeMobileMenu}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-between ${
                    isActive ? "bg-[#0B3A8C] text-white" : "text-slate-700 hover:bg-slate-100"
                  }`
                }
              >
                <span>{item.label}</span>
                <span className="material-symbols-outlined text-[16px]">chevron_right</span>
              </NavLink>
            ))}
          </nav>

          <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
            <Link
              to={accountLink}
              onClick={closeMobileMenu}
              className="w-full py-2.5 text-center text-[13px] font-semibold text-[#0B3A8C] border border-[#0B3A8C]/20 rounded-full hover:bg-[#F3F7FF]"
            >
              {user ? `Tài khoản: ${user.fullName}` : "Đăng nhập tài khoản"}
            </Link>
            {user && (
              <button
                type="button"
                onClick={() => {
                  logout();
                  closeMobileMenu();
                }}
                className="w-full py-2.5 text-center text-[13px] font-semibold text-slate-500 border border-slate-200 rounded-full hover:bg-slate-50"
              >
                Đăng xuất
              </button>
            )}
            {!user && (
              <Link
                to={ROUTES.register}
                onClick={closeMobileMenu}
                className="w-full py-2.5 text-center text-[13px] font-bold text-[#082A66] bg-[#F5A00F] rounded-full"
              >
                Đăng ký
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
