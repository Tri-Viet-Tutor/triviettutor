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
    } else {
      navigate("/tim-gia-su");
    }
  };

  const navLinks = [
    { label: "Trang chủ", to: "/" },
    { label: "Cấp học / Môn học", to: "/cap-hoc-mon-hoc" },
    { label: "Tìm gia sư", to: "/tim-gia-su" },
    { label: "Bảng học phí", to: "/bang-hoc-phi" },
    { label: "Liên hệ", to: "/lien-he" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white shadow-sm border-b border-gray-200/80">
      {/* Top Banner (Navy #071e3d) */}
      <div className="bg-[#071e3d] text-white py-1.5 px-4 sm:px-6 lg:px-8 border-b border-[#122e54]">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-xs">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[15px] text-[#ff7a00]">verified</span>
              Hệ thống kết nối gia sư chất lượng cao tại TP. Hồ Chí Minh
            </span>
            <span className="hidden md:flex items-center gap-1 text-gray-300">
              <span className="material-symbols-outlined text-[15px] text-[#ff7a00]">schedule</span>
              Giờ làm việc: 7:30 - 21:30 (Cả T7 & CN)
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="tel:02838889999"
              className="flex items-center gap-1 font-semibold text-white hover:text-[#ff7a00] transition-colors"
            >
              <span className="material-symbols-outlined text-[15px] text-[#ff7a00]">call</span>
              Hotline: (028) 3888 9999
            </a>
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="h-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        {/* Brand Logo & Name */}
        <Link to="/" className="flex items-center gap-3 shrink-0 group">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-[#ff7a00] shadow-sm shrink-0 group-hover:scale-105 transition-transform">
            <img
              src={ASSETS.logo}
              alt="Logo Gia Sư TP. Hồ Chí Minh"
              className="w-full h-full object-cover bg-white"
            />
          </div>
          <div className="flex flex-col">
            <div className="flex items-baseline gap-1">
              <span className="font-black text-[17px] tracking-tight text-[#0a2540] leading-none">
                GIA SƯ
              </span>
              <span className="font-bold text-[15px] text-[#ff7a00] leading-none">
                TP. HỒ CHÍ MINH
              </span>
            </div>
            <span className="text-[10px] text-gray-500 font-medium tracking-normal mt-0.5">
              Cùng em vững bước tương lai
            </span>
          </div>
        </Link>

        {/* Global Search Bar */}
        <form onSubmit={handleSearch} className="hidden md:flex items-center relative flex-1 max-w-md mx-4">
          <span className="material-symbols-outlined absolute left-3 text-gray-400 text-[18px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-[#0a2540] focus:bg-white text-gray-700 transition-all"
            placeholder="Tìm kiếm gia sư, môn học, cấp lớp (Toán, Văn, Anh, Lý, Hóa...)"
          />
        </form>

        {/* Auth CTA & Quick Action */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold text-[#0a2540] hover:text-[#ff7a00] border border-gray-300 rounded-lg hover:border-[#ff7a00] transition-colors"
          >
            Đăng nhập
          </Link>
          <Link
            to="/lien-he#form-lien-he"
            className="inline-flex items-center justify-center px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-bold text-white bg-[#f58220] hover:bg-[#e06d10] rounded-lg shadow-sm transition-all gap-1.5"
          >
            <span>Đăng ký tìm gia sư</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
          {/* Mobile menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-gray-600 hover:text-gray-900 rounded-md"
            aria-label="Toggle menu"
          >
            <span className="material-symbols-outlined">
              {mobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>
      </div>

      {/* Desktop Navigation Links */}
      <div className="border-t border-gray-100 bg-white hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-start gap-8 h-11 text-sm">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === "/"}
                className={({ isActive }) =>
                  isActive
                    ? "text-[#ff7a00] font-bold flex items-center h-full border-b-2 border-[#ff7a00]"
                    : "text-gray-700 hover:text-[#0a2540] font-medium transition-colors flex items-center h-full border-b-2 border-transparent hover:border-gray-300"
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-t border-gray-200 px-4 py-3 space-y-2 shadow-lg">
          <form onSubmit={handleSearch} className="relative mb-3">
            <span className="material-symbols-outlined absolute left-3 top-2 text-gray-400 text-[18px]">
              search
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:border-[#0a2540] text-gray-700"
              placeholder="Tìm kiếm gia sư, môn học..."
            />
          </form>
          {navLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === "/"}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `block px-3 py-2 rounded-md text-sm font-medium ${
                  isActive
                    ? "bg-orange-50 text-[#ff7a00] font-bold"
                    : "text-gray-700 hover:bg-gray-100"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>
      )}
    </header>
  );
}
