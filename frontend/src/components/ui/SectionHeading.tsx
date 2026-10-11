import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { Reveal } from "@/components/motion";
import { Icon } from "@/components/ui/Icon";
import { TEXT_LINK } from "@/constants/classNames";

interface SectionHeadingProps {
  title: string;
  description?: string;
  action?: { label: string; to: string };
  icon?: ReactNode;
}

/** Tiêu đề một phần: tiêu đề, mô tả ngắn và liên kết tuỳ chọn ở bên phải. */
export function SectionHeading({
  title,
  description,
  action,
  icon,
}: SectionHeadingProps) {
  return (
    <Reveal className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-10">
      <div className="flex max-w-2xl items-start gap-3 sm:gap-4">
        {icon}
        <div>
          <h2 className="text-[28px] lg:text-[36px] leading-tight font-extrabold tracking-tight text-brand-navy text-balance">
            {title}
          </h2>
          {description && (
            <p className="mt-3 text-[16px] lg:text-[17px] leading-relaxed text-brand-muted">{description}</p>
          )}
        </div>
      </div>
      {action && (
        <Link to={action.to} className={`${TEXT_LINK} shrink-0`}>
          {action.label}
          <Icon name="arrow_forward" className="text-[18px]" />
        </Link>
      )}
    </Reveal>
  );
}
