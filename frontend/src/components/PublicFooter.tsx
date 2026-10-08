import { Link } from "react-router-dom";
import { ASSETS } from "@/constants/assets";

export function PublicFooter() {
  return (
    <footer className="w-full bg-gradient-to-b from-[#EAF2FF] to-[#DCEAFF] text-[#0B2A6B] pt-12 pb-8 border-t-2 border-[#1560D6]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 mb-10">
        {/* Brand information */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <Link to="/" className="flex items-center gap-3 shrink-0 group w-fit">
            <div className="w-11 h-11 rounded-full p-0.5 shadow-sm ring-2 ring-[#0B3A8C]/10 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform bg-white">
              <img
                src={ASSETS.logo}
                alt="Logo Gia Sư Trí Việt"
                className="w-full h-full rounded-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-[18px] sm:text-[19px] font-extrabold text-[#0B2A6B] tracking-tight uppercase leading-tight group-hover:text-[#F5A00F] transition-colors">
                  Tri Viet
                </span>
                <span className="text-[18px] sm:text-[19px] font-extrabold text-[#F5A00F] tracking-tight uppercase leading-tight">
                  Tutor
                </span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium leading-none mt-0.5">
                Cùng em vững bước tương lai
              </span>
            </div>
          </Link>
          <p className="text-xs text-slate-500 leading-relaxed">
            Hệ thống kết nối phụ huynh, học sinh và gia sư tiêu chuẩn sư phạm hàng đầu tại TP. Hồ
            Chí Minh và các quận huyện lân cận. Cam kết nâng cao năng lực và điểm số vượt trội.
          </p>
          <div className="flex flex-col gap-1.5 text-xs text-slate-500">
            <p className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#F5A00F]">
                location_on
              </span>
              <span>
                <strong>Trụ sở:</strong> Tòa nhà Saigon Tower, 29 Lê Duẩn, Bến Nghé, Quận 1, TP. Hồ Chí Minh
              </span>
            </p>
            <p className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-[#F5A00F]">verified</span>
              <span>Chứng nhận chất lượng giáo dục GD-TPHCM 2026</span>
            </p>
          </div>
        </div>

        {/* Column: For Parents */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <h4 className="text-sm text-[#0B2A6B] font-bold border-l-2 border-[#F5A00F] pl-2 uppercase">
            Dành cho Phụ huynh
          </h4>
          <ul className="flex flex-col gap-2 text-xs text-slate-500">
            <li>
              <Link to="/lien-he#form-lien-he" className="hover:text-[#F5A00F] transition-colors">
                Quy trình tìm gia sư nhanh 24h
              </Link>
            </li>
            <li>
              <Link to="/bang-hoc-phi" className="hover:text-[#F5A00F] transition-colors">
                Học phí niêm yết công khai
              </Link>
            </li>
            <li>
              <Link to="/lien-he" className="hover:text-[#F5A00F] transition-colors">
                Chính sách chuyển lớp
              </Link>
            </li>
            <li>
              <Link to="/cap-hoc-mon-hoc" className="hover:text-[#F5A00F] transition-colors">
                Cam kết đảm bảo tiến bộ sau 10 buổi
              </Link>
            </li>
            <li>
              <Link to="/lien-he#form-lien-he" className="hover:text-[#F5A00F] transition-colors">
                Đăng ký tư vấn chọn lớp
              </Link>
            </li>
          </ul>
        </div>

        {/* Column: For Tutors */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          <h4 className="text-sm text-[#0B2A6B] font-bold border-l-2 border-[#F5A00F] pl-2 uppercase">
            Dành cho Gia sư
          </h4>
          <ul className="flex flex-col gap-2 text-xs text-slate-500">
            <li>
              <Link to="/register" className="hover:text-[#F5A00F] transition-colors">
                Quy chế tuyển dụng & kiểm duyệt
              </Link>
            </li>
            <li>
              <Link to="/register" className="hover:text-[#F5A00F] transition-colors">
                Đăng ký làm gia sư đối tác
              </Link>
            </li>
            <li>
              <Link to="/tim-gia-su" className="hover:text-[#F5A00F] transition-colors">
                Danh sách lớp mới cần gia sư
              </Link>
            </li>
            <li>
              <Link to="/bang-hoc-phi" className="hover:text-[#F5A00F] transition-colors">
                Quyền lợi & Chính sách phí nhận lớp
              </Link>
            </li>
            <li>
              <Link to="/lien-he" className="hover:text-[#F5A00F] transition-colors">
                Cẩm nang phương pháp sư phạm
              </Link>
            </li>
          </ul>
        </div>

        {/* Column: Contact & Support */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          <h4 className="text-sm text-[#0B2A6B] font-bold border-l-2 border-[#F5A00F] pl-2 uppercase">
            Liên hệ & Hỗ trợ
          </h4>
          <div className="flex flex-col gap-2 text-xs text-slate-500">
            <p>
              <strong className="text-[#0B2A6B]">Hotline:</strong> (028) 3888 9999 – 0988 123 456
            </p>
            <p>
              <strong className="text-[#0B2A6B]">Email:</strong> lienhe@giasutphcm.vn
            </p>
            <p>
              <strong className="text-[#0B2A6B]">Địa chỉ:</strong> Tòa nhà Saigon Tower, 29 Lê Duẩn, Bến
              Nghé, Quận 1, TP. Hồ Chí Minh
            </p>
          </div>
          <div className="mt-2 pt-2 border-t border-[#1560D6]/15">
            <span className="text-[11px] text-slate-500 block mb-1.5">Tải ứng dụng sổ liên lạc:</span>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[#0B2A6B] hover:border-[#F5A00F] cursor-pointer transition-colors">
              <span className="material-symbols-outlined text-[18px] text-[#F5A00F]">
                phone_iphone
              </span>
              <span className="text-xs font-semibold">App Store & Google Play</span>
            </div>
          </div>
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 border-t border-[#1560D6]/15 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-500">
        <div>© 2026 Tri Viet Tutor. Hệ thống gia sư THPT uy tín cho học sinh lớp 10 – 12.</div>
        <div className="flex gap-4">
          <Link to="/lien-he" className="hover:text-slate-500">Điều khoản dịch vụ</Link>
          <Link to="/lien-he" className="hover:text-slate-500">Chính sách bảo mật</Link>
          <Link to="/cap-hoc-mon-hoc" className="hover:text-slate-500">Sơ đồ môn học</Link>
        </div>
      </div>
    </footer>
  );
}
