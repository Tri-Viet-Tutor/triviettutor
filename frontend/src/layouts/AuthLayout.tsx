import { Outlet, Link } from "react-router-dom";
import { ASSETS } from "@/constants/assets";

/**
 * AuthLayout
 *
 * Centered card layout for /login and /register pages.
 * Styled with Gia Sư TP. Hồ Chí Minh brand palette and logo.
 */
export function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#071e3d] via-[#0a2540] to-[#071e3d] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Brand header */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex flex-col items-center group">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-[#ff7a00] shadow-lg mb-3 group-hover:scale-105 transition-transform bg-white">
              <img
                src={ASSETS.logo}
                alt="Logo Gia Sư TP. Hồ Chí Minh"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="font-black text-2xl tracking-tight text-white">GIA SƯ</span>
              <span className="font-bold text-xl text-[#ff7a00]">TP. HỒ CHÍ MINH</span>
            </div>
            <p className="text-gray-300 mt-1 text-xs">Cùng em vững bước tương lai • VietTriTutor</p>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          <Outlet />
        </div>

        <div className="text-center mt-6 text-xs text-gray-400">
          <Link to="/" className="hover:text-[#ff7a00] transition-colors flex items-center justify-center gap-1">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Quay lại trang chủ
          </Link>
        </div>
      </div>
    </div>
  );
}
