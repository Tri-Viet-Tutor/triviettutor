import { Link } from "react-router-dom";
import { ASSETS } from "@/constants/assets";

export function PublicFooter() {
  return (
    <footer className="w-full bg-[#001230] text-white pt-12 pb-8 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 mb-10">
        {/* Brand information */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-[#ff7a00] shadow-sm shrink-0">
              <img
                src={ASSETS.logo}
                alt="Logo Gia Sư TP. Hồ Chí Minh"
                className="w-full h-full object-cover bg-white"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1">
                <span className="font-black text-base tracking-tight text-white">GIA SƯ</span>
                <span className="font-bold text-sm text-[#ff7a00]">TP. HỒ CHÍ MINH</span>
              </div>
              <span className="text-[11px] text-gray-400">Cùng em vững bước tương lai</span>
            </div>
          </Link>
          <p className="text-xs text-gray-400 leading-relaxed">
            Hệ thống kết nối phụ huynh, học sinh và gia sư tiêu chuẩn sư phạm hàng đầu tại TP. Hồ
            Chí Minh và các quận huyện lân cận. Cam kết nâng cao năng lực và điểm số vượt trội.
          </p>
          <div className="flex flex-col gap-1.5 text-xs text-gray-400">
            <p className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#ff7a00]">
                location_on
              </span>
              <span>
                <strong>Trụ sở:</strong> Tòa nhà Saigon Tower, 29 Lê Duẩn, Bến Nghé, Quận 1, TP. Hồ Chí Minh
              </span>
            </p>
            <p className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#ff7a00]">verified</span>
              <span>Chứng nhận chất lượng giáo dục GD-TPHCM 2026</span>
            </p>
          </div>
        </div>

        {/* Column: For Parents */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <h4 className="text-sm text-white font-bold border-l-2 border-[#ff7a00] pl-2 uppercase">
            Dành cho Phụ huynh
          </h4>
          <ul className="flex flex-col gap-2 text-xs text-gray-400">
            <li>
              <Link to="/lien-he#form-lien-he" className="hover:text-[#ff7a00] transition-colors">
                Quy trình tìm gia sư nhanh 24h
              </Link>
            </li>
            <li>
              <Link to="/bang-hoc-phi" className="hover:text-[#ff7a00] transition-colors">
                Học phí niêm yết công khai
              </Link>
            </li>
            <li>
              <Link to="/lien-he" className="hover:text-[#ff7a00] transition-colors">
                Chính sách đổi gia sư miễn phí
              </Link>
            </li>
            <li>
              <Link to="/cap-hoc-mon-hoc" className="hover:text-[#ff7a00] transition-colors">
                Cam kết đảm bảo tiến bộ sau 10 buổi
              </Link>
            </li>
            <li>
              <Link to="/lien-he#form-lien-he" className="hover:text-[#ff7a00] transition-colors">
                Đăng ký test trình độ & xếp lớp
              </Link>
            </li>
          </ul>
        </div>

        {/* Column: For Tutors */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          <h4 className="text-sm text-white font-bold border-l-2 border-[#ff7a00] pl-2 uppercase">
            Dành cho Gia sư
          </h4>
          <ul className="flex flex-col gap-2 text-xs text-gray-400">
            <li>
              <Link to="/register" className="hover:text-[#ff7a00] transition-colors">
                Quy chế tuyển dụng & kiểm duyệt
              </Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-[#ff7a00] transition-colors">
                Đăng ký làm gia sư đối tác
              </Link>
            </li>
            <li>
              <Link to="/tim-gia-su" className="hover:text-[#ff7a00] transition-colors">
                Danh sách lớp mới cần gia sư
              </Link>
            </li>
            <li>
              <Link to="/bang-hoc-phi" className="hover:text-[#ff7a00] transition-colors">
                Quyền lợi & Chính sách phí nhận lớp
              </Link>
            </li>
            <li>
              <Link to="/lien-he" className="hover:text-[#ff7a00] transition-colors">
                Cẩm nang phương pháp sư phạm
              </Link>
            </li>
          </ul>
        </div>

        {/* Column: Contact & Support */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          <h4 className="text-sm text-white font-bold border-l-2 border-[#ff7a00] pl-2 uppercase">
            Liên hệ & Hỗ trợ
          </h4>
          <div className="flex flex-col gap-2 text-xs text-gray-400">
            <p>
              <strong className="text-white">Hotline:</strong> (028) 3888 9999 – 0988 123 456
            </p>
            <p>
              <strong className="text-white">Email:</strong> lienhe@giasutphcm.vn
            </p>
            <p>
              <strong className="text-white">Địa chỉ:</strong> Tòa nhà Saigon Tower, 29 Lê Duẩn, Bến
              Nghé, Quận 1, TP. Hồ Chí Minh
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-white/10">
            <span className="text-[11px] text-gray-400 block mb-1.5">Tải ứng dụng sổ liên lạc:</span>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#0a2540] border border-white/15 rounded-lg text-white hover:border-[#ff7a00] cursor-pointer transition-colors">
              <span className="material-symbols-outlined text-[18px] text-[#ff7a00]">
                phone_iphone
              </span>
              <span className="text-xs font-semibold">App Store & Google Play</span>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-gray-500">
        <div>© 2026 Gia Sư TP. Hồ Chí Minh (VietTriTutor). Hệ thống kết nối giáo dục uy tín K-12.</div>
        <div className="flex gap-4">
          <Link to="/lien-he" className="hover:text-gray-400">Điều khoản dịch vụ</Link>
          <Link to="/lien-he" className="hover:text-gray-400">Chính sách bảo mật</Link>
          <Link to="/cap-hoc-mon-hoc" className="hover:text-gray-400">Sơ đồ môn học</Link>
        </div>
      </div>
    </footer>
  );
}
