import { Link } from "react-router-dom";
import { ASSETS } from "@/constants/assets";
import { ROUTES } from "@/constants/routes";

/* Các trang công khai, cùng tên với thanh menu */
const FOOTER_LINKS = [
  { label: "Khối lớp / Môn học", to: ROUTES.subjects },
  { label: "Tìm gia sư", to: ROUTES.tutorSearch },
  { label: "Bảng học phí", to: ROUTES.pricing },
  { label: "Đăng ký tư vấn", to: ROUTES.contactForm },
];

export function PublicFooter() {
  return (
    <footer className="w-full bg-[#082A66] text-white pt-14 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-12 gap-8 mb-10">
        {/* Brand information */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          <Link to={ROUTES.home} className="flex items-center gap-3 shrink-0 group w-fit">
            <div className="w-11 h-11 rounded-full p-0.5 shadow-sm ring-2 ring-white/20 flex items-center justify-center overflow-hidden shrink-0 group-hover:scale-105 transition-transform bg-white">
              <img
                src={ASSETS.common.logo}
                alt="Logo Gia Sư Trí Việt"
                className="w-full h-full rounded-full object-contain"
              />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1">
                <span className="text-[18px] sm:text-[19px] font-extrabold text-white tracking-tight uppercase leading-tight">
                  Tri Viet
                </span>
                <span className="text-[18px] sm:text-[19px] font-extrabold text-[#F5A00F] tracking-tight uppercase leading-tight">
                  Tutor
                </span>
              </div>
              <span className="text-[11px] text-white/70 font-medium leading-none mt-0.5">
                Cùng em vững bước tương lai
              </span>
            </div>
          </Link>
          <p className="text-[13px] text-white/70 leading-relaxed">
            Khóa học theo từng môn cho học sinh lớp 10 – 12, học tại trung tâm hoặc trực tuyến.
          </p>
        </div>

        {/* Column: Site links */}
        <div className="lg:col-span-3 flex flex-col gap-3">
          <h4 className="text-sm text-white font-bold border-l-2 border-[#F5A00F] pl-2 uppercase">Khám phá</h4>
          <ul className="flex flex-col gap-2.5 text-[13px] text-white/70">
            {FOOTER_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="hover:text-white transition-colors">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Column: Contact */}
        <div className="lg:col-span-4 flex flex-col gap-3">
          <h4 className="text-sm text-white font-bold border-l-2 border-[#F5A00F] pl-2 uppercase">Liên hệ</h4>
          <div className="flex flex-col gap-2.5 text-[13px] text-white/70">
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
        </div>
      </div>

      {/* Copyright Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 border-t border-white/15 text-center sm:text-left text-[13px] text-white/60">
        © 2026 Tri Viet Tutor
      </div>
    </footer>
  );
}
