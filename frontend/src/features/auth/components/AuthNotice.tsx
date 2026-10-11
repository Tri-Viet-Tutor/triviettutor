import { type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

type NoticeTone = "error" | "success" | "info";

const TONE: Record<NoticeTone, { box: string; icon: string; iconName: string }> = {
  error: { box: "border-red-200 bg-red-50 text-red-800", icon: "text-red-600", iconName: "error" },
  success: { box: "border-emerald-200 bg-emerald-50 text-emerald-900", icon: "text-emerald-600", iconName: "check_circle" },
  info: { box: "border-brand-navy/20 bg-brand-tint text-brand-navyDeep", icon: "text-brand-navy", iconName: "info" },
};

interface AuthNoticeProps {
  tone: NoticeTone;
  children: ReactNode;
}

/** Hộp báo kết quả trong form xác thực: lỗi (đọc ngay cho trình đọc màn hình), thành công hoặc ghi chú. */
export function AuthNotice({ tone, children }: AuthNoticeProps) {
  const style = TONE[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={`flex gap-2 rounded-md border px-3 py-2.5 text-[13.5px] leading-relaxed ${style.box}`}
    >
      <Icon name={style.iconName} className={`mt-px shrink-0 text-[18px] ${style.icon}`} />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
