import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { ASSETS } from "@/constants/assets";

export function PublicHeader() {
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/tim-gia-su?q=${encodeURIComponent(searchQuery.trim())}`);
      setMobileMenuOpen(false);
    } else {
      navigate("/tim-gia-su");
      setMobileMenuOpen(false);
    }
  };

  const navItems = [
    { label: "Trang chủ", to: "/" },
    { label: "Cấp học / Môn học", to: "/cap-hoc-mon-hoc" },
    { label: "Tìm gia sư", to: "/tim-gia-su" },
    { label: "Bảng học phí", to: "/bang-hoc-phi" },
    { label: "Liên hệ", to: "/lien-he" },
  ];

  return (
    <header className="w-full z-50 sticky top-0 bg-white shadow-sm">
      {/* ── Level 1: Top Bar (Deep Navy #071e3d) ────────────────────────── */}
      <div className="bg-[#071e3d] text-white text-[12px] py-1.5 border-b border-[#14325a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium">
              <span className="material-symbols-outlined text-[15px] text-[#f58220]">verified</span>
              Hệ thống kết nối gia sư chất lượng cao tại TP. Hồ Chí Minh
            </span>
            <span className="hidden md:inline text-white/30">|</span>
            <span className="hidden md:inline-flex items-center gap-1 text-slate-300">
              <span className="material-symbols-outlined text-[15px] text-[#f58220]">schedule</span>
              Giờ làm việc: 7:30 - 21:30 (Cả T7 & CN)
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="tel:02838889999"
              className="flex items-center gap-1 text-[#ffb26b] hover:text-[#f58220] transition-colors font-bold"
            >
              <span className="material-symbols-outlined text-[15px]">call</span>
              Hotline: (028) 3888 9999
            </a>
            <span className="hidden sm:inline text-white/30">|</span>
            <span className="hidden sm:inline-flex items-center gap-1 text-slate-300 font-medium">
              <span className="material-symbols-outlined text-[15px] text-emerald-400">verified</span>
              Bộ GD&ĐT kiểm duyệt
            </span>
          </div>
        </div>
      </div>

      {/* ── Level 2: Middle Header Bar (Logo, Search, CTA) ─────────────── */}
      <div className="bg-white border-b border-slate-100 py-2.5 sm:py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
          {/* Brand Logo & Title */}
          <Link to="/" className="flex items-center gap-3 shrink-0 group">
            <div className="w-11 h-11 rounded-full p-0.5 shadow-sm ring-2 ring-[#071e3d]/10 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform bg-white">
              <img
                src={ASSETS.logo}
                alt="Logo Gia Sư TP. Hồ Chí Minh"
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-[18px] sm:text-[19px] font-extrabold text-[#071e3d] tracking-tight uppercase leading-tight group-hover:text-[#f58220] transition-colors">
                  GIA SƯ
                </span>
                <span className="text-[18px] sm:text-[19px] font-extrabold text-[#f58220] tracking-tight uppercase leading-tight">
                  TP. HỒ CHÍ MINH
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
                Cùng em vững bước tương lai
              </span>
            </div>
          </Link>

          {/* Search Box (Desktop / Tablet) */}
          <form onSubmit={handleSearch} className="hidden md:flex flex-1 max-w-lg mx-6">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm gia sư theo môn học, lớp, hoặc tên gia sư..."
                className="w-full pl-10 pr-4 py-2 text-[13px] bg-slate-50 border border-slate-200/80 rounded-full focus:outline-none focus:border-[#f58220] focus:ring-1 focus:ring-[#f58220] focus:bg-white text-slate-800 placeholder-slate-400 transition-all"
              />
            </div>
          </form>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              to="/login"
              className="hidden sm:inline-flex items-center px-4 py-2 rounded-lg border border-[#071e3d] text-[#071e3d] hover:bg-[#071e3d] hover:text-white font-semibold text-[13px] transition-all"
            >
              Đăng nhập
            </Link>
            <Link
              to="/lien-he#form-lien-he"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#f58220] hover:bg-[#d96e10] text-white font-bold text-[13px] shadow-sm hover:shadow transition-all transform hover:-translate-y-0.5 shrink-0"
            >
              <span>Đăng ký tìm gia sư</span>
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>

            {/* Mobile Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-slate-700 hover:text-[#071e3d] rounded-lg border border-slate-200 hover:bg-slate-50"
              aria-label="Toggle menu"
            >
              <span className="material-symbols-outlined text-[22px]">
                {mobileMenuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Level 3: Navigation Bar (Synchronized active state) ───────── */}
      <div className="bg-slate-50 border-t border-slate-200/80 py-1.5 hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <nav className="flex items-center gap-1 sm:gap-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  isActive
                    ? "px-3.5 py-1.5 text-[13px] font-bold text-white bg-[#071e3d] rounded-md shadow-sm transition-all flex items-center gap-1.5"
                    : "px-3.5 py-1.5 text-[13px] font-medium text-slate-700 hover:text-[#071e3d] hover:bg-white rounded-md transition-all flex items-center gap-1.5"
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#f58220]"></span>
                    )}
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-4 text-[12px] text-slate-500 font-medium">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-[#f58220]">bolt</span>
              Kết nối gia sư trong 30 phút
            </span>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1 text-emerald-600 font-medium">
              <span className="material-symbols-outlined text-[15px]">verified_user</span>
              Học thử 02 buổi miễn phí
            </span>
          </div>
        </div>
      </div>

      {/* ── Mobile Drawer Menu ────────────────────────────────────────── */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-slate-200 px-4 py-4 space-y-3 shadow-xl">
          <form onSubmit={handleSearch} className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm gia sư, môn học..."
              className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-full focus:outline-none focus:border-[#f58220] text-slate-800"
            />
          </form>

          <nav className="flex flex-col space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-between ${
                    isActive
                      ? "bg-[#071e3d] text-white"
                      : "text-slate-700 hover:bg-slate-100"
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
              to="/login"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2 text-center text-xs font-semibold text-[#071e3d] border border-[#071e3d] rounded-lg hover:bg-slate-50"
            >
              Đăng nhập tài khoản
            </Link>
            <Link
              to="/lien-he#form-lien-he"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-2 text-center text-xs font-bold text-white bg-[#f58220] rounded-lg shadow-sm"
            >
              Đăng ký tìm gia sư
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
