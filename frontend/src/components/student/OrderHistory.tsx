import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_BTN_SECONDARY, PORTAL_CARD } from "@/constants/classNames";
import { transactionStatus } from "@/constants/labels";
import { useUserId } from "@/hooks/usePortalData";
import { listMyOrders } from "@/services/cartService";
import { displayCode } from "@/utils/classes";
import { formatVnd } from "@/utils/currency";

// Số đơn mỗi trang
const PAGE_SIZE = 10;

// Lịch sử thanh toán học phí của học viên (PAY-01): mỗi đơn kèm nhãn trạng thái chuẩn
// Thành công / Đang xử lý / Giữ chỗ / Thất bại / Đã hoàn tiền.
// API: GET /orders/my.
export function OrderHistory() {
  const userId = useUserId();
  const [page, setPage] = useState(0);
  const orders = useQuery({ queryKey: ["me", userId, "orders", page], queryFn: () => listMyOrders(page, PAGE_SIZE) });
  const list = orders.data?.content ?? [];

  return (
    <section className={`mt-8 overflow-hidden ${PORTAL_CARD}`} aria-labelledby="order-history-title">
      <h2 id="order-history-title" className="border-b border-brand-sandLine px-5 py-4 text-[18px] font-extrabold text-brand-navy sm:px-6">
        Lịch sử thanh toán học phí
      </h2>
      <div className="px-5 py-4 sm:px-6">
        {orders.isPending && <p className="text-brand-muted">Đang tải lịch sử…</p>}
        {orders.isError && (
          <p role="alert" className="text-[14px] font-medium text-red-700">
            Không tải được lịch sử thanh toán.{" "}
            <button type="button" onClick={() => void orders.refetch()} className="font-semibold underline">
              Thử lại
            </button>
          </p>
        )}
        {orders.data && list.length === 0 && <p className="py-6 text-center text-brand-muted">Bạn chưa thanh toán học phí lần nào.</p>}
        {list.length > 0 && (
          <ul className="divide-y divide-brand-sandLine">
            {list.map((order) => {
              const status = transactionStatus(order.status);
              return (
                <li key={order.id} className="flex flex-col gap-2 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-bold text-brand-ink">
                      Đơn {displayCode("order", order.id)}
                      <span className="ml-2 text-[13px] font-normal text-brand-muted">
                        {new Date(order.createdAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}
                      </span>
                    </p>
                    <p className="truncate text-[13.5px] text-brand-muted">
                      {order.items.map((item) => `${item.courseName}${item.classCode ? ` - ${item.classCode}` : ""}`).join(", ")}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                    <p className="text-[16px] font-extrabold tabular-nums text-brand-navy">{formatVnd(order.totalAmount)}</p>
                    {order.refundedAmount > 0 && (
                      <p className="text-[12.5px] tabular-nums text-brand-muted">đã hoàn {formatVnd(order.refundedAmount)}</p>
                    )}
                    <StatusChip tone={status.tone} icon={status.icon}>
                      {status.label}
                    </StatusChip>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {orders.data && orders.data.totalPages > 1 && (
          <div className="mt-3 flex items-center justify-end gap-2">
            <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className={PORTAL_BTN_SECONDARY}>
              <Icon name="chevron_left" className="text-[20px]" />
              Trước
            </button>
            <span className="text-[13.5px] tabular-nums text-brand-muted">
              {page + 1}/{orders.data.totalPages}
            </span>
            <button
              type="button"
              disabled={page + 1 >= orders.data.totalPages}
              onClick={() => setPage(page + 1)}
              className={PORTAL_BTN_SECONDARY}
            >
              Sau
              <Icon name="chevron_right" className="text-[20px]" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
