import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING } from "@/constants/classNames";

/** Nội dung thông báo nổi */
export interface AdminNotice {
  tone: "ok" | "error";
  text: string;
}

/** Thông báo nổi ở góc trên bên phải (dưới thanh trên cùng), không đẩy bảng xuống */
export function AdminToast({ notice, onClose }: { notice: AdminNotice | null; onClose: () => void }) {
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-4 top-20 z-50 flex justify-end sm:left-auto sm:right-6">
      {notice && (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className="pointer-events-auto flex w-full max-w-[400px] animate-[toast-in_200ms_ease-out] items-start gap-3 rounded-xl border border-brand-sandLine bg-white p-4 shadow-[0_16px_40px_-16px_rgba(8,42,102,0.4)] motion-reduce:animate-none"
        >
          <style>{"@keyframes toast-in{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:none}}"}</style>
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
              notice.tone === "ok" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
            }`}
          >
            <Icon name={notice.tone === "ok" ? "check" : "error"} className="text-[19px]" />
          </span>
          <p className="flex-1 pt-1 text-[14px] leading-snug text-brand-ink">{notice.text}</p>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={onClose}
            className={`-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-brand-muted hover:bg-brand-sand hover:text-brand-navy ${FOCUS_RING}`}
          >
            <Icon name="close" className="text-[18px]" />
          </button>
        </div>
      )}
    </div>
  );
}
