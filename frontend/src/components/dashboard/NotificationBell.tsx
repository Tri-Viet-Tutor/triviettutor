import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING as FOCUS, PORTAL_BTN_GHOST } from "@/constants/classNames";
import { homeworkKeys, useNotifications, useUnreadCount } from "@/hooks/useHomeworkData";
import { useUserId } from "@/hooks/usePortalData";
import { markAllNotificationsRead, markNotificationRead } from "@/services/homeworkService";
import { formatDateTime } from "@/utils/homework";
import type { NotificationResponse } from "@/interfaces/homework";

/** Biểu tượng theo loại thông báo */
const TYPE_ICON: Record<string, string> = {
  HOMEWORK_PUBLISHED: "assignment",
  HOMEWORK_SUBMITTED: "outgoing_mail",
  HOMEWORK_LATE_SUBMISSION: "alarm",
  HOMEWORK_GRADED: "grading",
};

/**
 * Chuông thông báo ở thanh trên: số chưa đọc (tự cập nhật mỗi phút), bấm mở danh sách mới nhất;
 * bấm một thông báo thì đánh dấu đã đọc và mở trang liên quan (bài nộp mới, bài trễ, điểm…).
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const userId = useUserId();
  const queryClient = useQueryClient();
  const unread = useUnreadCount();
  const list = useNotifications(open);
  const count = unread.data ?? 0;

  const refresh = () => void queryClient.invalidateQueries({ queryKey: homeworkKeys.notifications(userId) });
  const readOne = useMutation({ mutationFn: markNotificationRead, onSuccess: refresh });
  const readAll = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: refresh });

  // Bấm ra ngoài hoặc nhấn Esc thì đóng
  useEffect(() => {
    if (!open) return;
    function handlePointer(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handlePointer);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointer);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  function openNotification(notification: NotificationResponse) {
    if (!notification.readAt) readOne.mutate(notification.id);
    setOpen(false);
    if (notification.link) navigate(notification.link);
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={count ? `Thông báo, ${count} chưa đọc` : "Thông báo"}
        onClick={() => setOpen((value) => !value)}
        className={`relative flex h-10 w-10 items-center justify-center rounded-full border bg-white shadow-sm transition-colors ${
          open ? "border-brand-navy/40" : "border-brand-sandLine hover:border-brand-navy/40"
        } ${FOCUS}`}
      >
        <Icon name="notifications" className="text-[22px] text-brand-navy" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-bold tabular-nums text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Thông báo"
          className="absolute right-0 top-12 z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-brand-sandLine bg-white shadow-[0_24px_60px_-24px_rgba(8,42,102,0.55)]"
        >
          <div className="flex items-center justify-between border-b border-brand-sandLine px-4 py-3">
            <p className="text-[15px] font-bold text-brand-navy">Thông báo</p>
            {count > 0 && (
              <button type="button" disabled={readAll.isPending} onClick={() => readAll.mutate()} className={PORTAL_BTN_GHOST}>
                Đánh dấu đã đọc hết
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            {list.isPending && <p className="px-4 py-6 text-center text-[14px] text-brand-muted">Đang tải…</p>}
            {list.isError && <p className="px-4 py-6 text-center text-[14px] text-brand-muted">Chưa tải được thông báo.</p>}
            {list.data?.content.length === 0 && (
              <p className="px-4 py-6 text-center text-[14px] text-brand-muted">Chưa có thông báo nào.</p>
            )}
            <ul>
              {list.data?.content.map((notification) => (
                <li key={notification.id}>
                  <button
                    type="button"
                    onClick={() => openNotification(notification)}
                    className={`flex w-full gap-3 border-b border-brand-sandLine/70 px-4 py-3 text-left transition-colors hover:bg-brand-sand/60 ${FOCUS} ${
                      notification.readAt ? "" : "bg-brand-tint/60"
                    }`}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-brand-sandLine">
                      <Icon
                        name={TYPE_ICON[notification.type] ?? "notifications"}
                        className={`text-[18px] ${notification.type === "HOMEWORK_LATE_SUBMISSION" ? "text-red-600" : "text-brand-navy"}`}
                      />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-semibold text-brand-ink">{notification.title}</span>
                      <span className="mt-0.5 block text-[13.5px] leading-snug text-brand-muted">{notification.message}</span>
                      <span className="mt-1 block text-[12px] text-brand-muted">{formatDateTime(notification.createdAt)}</span>
                    </span>
                    {!notification.readAt && (
                      <span aria-label="Chưa đọc" className="ml-auto mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-orange" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
