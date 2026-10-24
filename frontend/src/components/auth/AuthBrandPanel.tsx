import { BackHomeLink } from "@/components/auth/BackHomeLink";
import { Icon } from "@/components/ui/Icon";
import { ASSETS } from "@/constants/assets";
import { CLASS_PERKS } from "@/constants/classOptions";

/** Hai dòng chữ lớn ở tấm bên trái */
const BRAND_LINES = ["Học Cùng", "Trí Việt Tutor"];

/**
 * Tấm ảnh bên trái các trang xác thực (chỉ hiện từ màn hình lớn): ảnh học sinh phủ lớp xanh navy,
 * đậm dần xuống dưới. Góc trên trái là nút về trang chủ; phần chữ dồn xuống đáy —
 * dòng chữ lớn và ba việc làm được sau khi đăng nhập xếp thành một hàng. Logo nằm ở đầu khung form bên phải.
 * Tấm cao đúng một màn hình và đứng yên (sticky) khi cuộn form dài, nên chữ ở đáy luôn nhìn thấy.
 */
export function AuthBrandPanel() {
  return (
    <aside className="relative isolate hidden overflow-hidden bg-brand-navyDeep lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-between lg:self-start lg:p-10 xl:p-14">
      <img
        src={ASSETS.public.students.highSchool}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-10 h-full w-full object-cover object-[32%_center]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,rgba(11,58,140,0.62)_0%,rgba(11,58,140,0.58)_38%,rgba(8,42,102,0.95)_100%)]"
      />

      <BackHomeLink tone="onPhoto" className="self-start" />

      <div>
        <p className="text-[44px] font-extrabold leading-[1.1] tracking-tight text-white xl:text-[56px]">
          {BRAND_LINES[0]}
          <span className="block text-brand-orange">{BRAND_LINES[1]}</span>
        </p>

        <ul className="mt-9 grid grid-cols-3 gap-6 border-t border-white/25 pt-6">
          {CLASS_PERKS.slice(0, 3).map((perk) => (
            <li key={perk.icon}>
              <Icon name={perk.icon} className="text-[24px] text-brand-orange" />
              <span className="mt-2 block text-[14.5px] font-medium leading-snug text-white/90">{perk.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}
