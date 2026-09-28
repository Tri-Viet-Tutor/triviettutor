import { Outlet, Link } from "react-router-dom";
import { ASSETS } from "@/constants/assets";

/**
 * AuthLayout
 *
 * Centered card layout for /login and /register pages.
 */
export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0B3A8C] via-[#0B3A8C] to-[#0B3A8C] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex flex-col items-center group">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#F5A00F] shadow-lg mb-3 group-hover:scale-105 transition-transform bg-white">
              <img
                src={ASSETS.logo}
                alt="Logo Gia Sư Trí Việt"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-black text-2xl tracking-tight text-white">GIA SƯ</span>
              <span className="font-bold text-xl text-[#F5A00F]">TRÍ VIỆT</span>
            </div>
            <p className="text-slate-300 mt-1 text-xs">Cùng em vững bước tương lai • TriVietTutor</p>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-slate-100">
          <Outlet />
        </div>

        <div className="text-center mt-6 text-xs text-slate-400">
          <Link to="/" className="hover:text-[#F5A00F] transition-colors flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
