import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { ROUTES } from "@/constants/routes";

interface BackHomeLinkProps {
  /** "onPhoto": chữ trắng trên tấm ảnh xanh; "onLight": chữ xanh trên nền trắng */
  tone: "onPhoto" | "onLight";
  className?: string;
}

const TONE = {
  onPhoto: "text-white/85 hover:text-white focus-visible:outline-white",
  onLight: "text-brand-navy/80 hover:text-brand-navy focus-visible:outline-brand-navy",
};

/** Liên kết "Về trang chủ", luôn nằm ở góc trên bên trái các trang xác thực. */
export function BackHomeLink({ tone, className = "" }: BackHomeLinkProps) {
  return (
    <Link
      to={ROUTES.home}
      className={`group inline-flex items-center gap-1.5 rounded text-[14px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 ${TONE[tone]} ${className}`}
    >
      <Icon name="arrow_back" className="text-[18px] transition-transform duration-200 group-hover:-translate-x-0.5" />
      Về trang chủ
    </Link>
  );
}
