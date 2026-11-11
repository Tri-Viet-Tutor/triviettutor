import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { OrderHistory } from "@/components/student/OrderHistory";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING, PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY, PORTAL_CARD } from "@/constants/classNames";
import { ROUTES } from "@/constants/routes";
import { patternLabel, subjectIcon, subjectLabel } from "@/constants/management";
import { cartKey, useCart, useCartMutations } from "@/hooks/useCart";
import type { ErrorCode, CartOrderResponse, TuitionClass } from "@/interfaces/api";
import { apiErrorMessage, getApiError } from "@/services/api";
import { cancelOrder, checkoutCart, payOrderMock } from "@/services/cartService";
import { listTuitionClasses } from "@/services/tuitionPaymentService";
import { useAuthStore } from "@/stores/authStore";
import { StarRating } from "@/components/ui/StarRating";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { cartCourseKey, preferredCartClass, preferredCartCourse, rememberCartCourse } from "@/utils/cartPreference";
import { formatVnd } from "@/utils/currency";
import { formatDate, parseIsoDate } from "@/utils/date";
import { displayCode } from "@/utils/classes";

/** Câu báo cho các lỗi của giỏ hàng / đơn hàng */
const CART_ERROR_TEXT: Partial<Record<ErrorCode, string>> = {
  CART_CHANGED: "Giỏ hàng vừa thay đổi ở nơi khác. Đã tải lại giỏ, hãy chọn lớp và đặt đơn lại.",
  CART_LIMIT_EXCEEDED: "Giỏ hàng chứa tối đa 20 môn.",
  CART_ITEM_NOT_FOUND: "Môn này không còn trong giỏ.",
  CLASS_FULL: "Một lớp đã đủ sĩ số. Hãy chọn lớp khác.",
  CLASS_NOT_ENROLLING: "Một lớp đã đóng đăng ký. Hãy chọn lớp khác.",
  STUDENT_SCHEDULE_CONFLICT: "Các lớp đã chọn bị trùng giờ với nhau hoặc với lớp bạn đang học.",
  ENROLLMENT_ALREADY_EXISTS: "Bạn đã học một trong các lớp này.",
  ORDER_SUBJECT_MISMATCH: "Lớp đã chọn không thuộc môn trong giỏ.",
  ORDER_EXPIRED: "Đơn đã hết thời gian giữ giá. Hãy đặt đơn lại.",
  ORDER_NOT_PENDING: "Đơn này không còn chờ thanh toán.",
  PAYMENT_MOCK_DISABLED:
    "Thanh toán đơn nhiều lớp hiện chưa mở. Hãy mua từng lớp bằng nút “Mua ngay”.",
  PAYMENT_PRICE_CHANGED: "Học phí vừa thay đổi. Hãy đặt đơn lại.",
};

const errorText = (error: unknown, fallback: string) => apiErrorMessage(error, CART_ERROR_TEXT, fallback);

/**
 * Giỏ hàng của học viên (/student/cart): mỗi dòng là một môn; chọn một lớp đang mở cho từng môn,
 * đặt đơn (máy chủ tính giá, kể cả giảm theo sĩ số, và giữ giá trong thời hạn đơn) rồi thanh toán cả đơn.
 * Muốn mua đúng một lớp thì dùng "Mua ngay" ở trang Khóa học đang mở.
 */
export function StudentCartPage() {
  const userId = useAuthStore((state) => state.user?.id);
  const queryClient = useQueryClient();
  const cart = useCart();
  const { remove } = useCartMutations();
  const items = useMemo(() => cart.data?.items ?? [], [cart.data]);
  // Lớp đã chọn cho từng dòng giỏ (cartItemId → classId)
  const [choice, setChoice] = useState<Record<number, number>>({});
  // Dòng đang mở danh sách để đổi lớp
  const [changing, setChanging] = useState<number | null>(null);
  const [order, setOrder] = useState<CartOrderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Khóa chống gửi trùng: giữ nguyên khi bấm lại cùng một lựa chọn
  const checkoutKey = useRef<{ fingerprint: string; key: string } | null>(null);
  const payKey = useRef<string>(crypto.randomUUID());

  // Lớp đang mở của từng môn trong giỏ
  const offers = useQueries({
    queries: items.map((item) => ({
      queryKey: ["catalog-classes-by-subject", item.subjectName],
      queryFn: () => listTuitionClasses({ subject: item.subjectName, page: 0, size: 50 }),
    })),
  });

  // Bỏ lựa chọn của các dòng không còn trong giỏ
  useEffect(() => {
    setChoice((current) => Object.fromEntries(Object.entries(current).filter(([id]) => items.some((item) => item.id === Number(id)))));
  }, [items]);

  // Chọn sẵn lớp: lớp học viên đã bấm "Thêm vào giỏ", không có thì lớp khai giảng sớm nhất
  const offersLoaded = offers.map((offer) => offer.dataUpdatedAt).join(",");
  useEffect(() => {
    setChoice((current) => {
      const next = { ...current };
      items.forEach((item, index) => {
        const classes = offers[index]?.data?.content ?? [];
        if (classes.length === 0 || (next[item.id] !== undefined && classes.some((group) => group.id === next[item.id]))) return;
        const preferred = preferredCartClass(userId, item.subjectName);
        const course = preferredCartCourse(userId, item.subjectName);
        const byStart = [...classes].sort((first, second) => first.startDate.localeCompare(second.startDate));
        // Lớp đã chọn; không có thì lớp khai giảng sớm nhất của khóa đã thêm vào giỏ
        const pick =
          classes.find((group) => group.id === preferred) ??
          byStart.find((group) => cartCourseKey(group.courseName, group.subject, group.gradeLevel) === course) ??
          [...classes].sort((first, second) => first.startDate.localeCompare(second.startDate))[0];
        next[item.id] = pick.id;
      });
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, offersLoaded, userId]);

  const classById = new Map<number, TuitionClass>();
  offers.forEach((offer) => offer.data?.content.forEach((item) => classById.set(item.id, item)));
  const ready = items.length > 0 && items.every((item) => choice[item.id] !== undefined);
  const estimate = items.reduce((sum, item) => sum + (classById.get(choice[item.id])?.estimatedFee ?? 0), 0);

  const checkout = useMutation({
    mutationFn: () => {
      const selection = items.map((item) => ({ cartItemId: item.id, classId: choice[item.id] }));
      const fingerprint = `${cart.data?.cartVersion}:${selection.map((s) => `${s.cartItemId}=${s.classId}`).join(",")}`;
      if (checkoutKey.current?.fingerprint !== fingerprint) checkoutKey.current = { fingerprint, key: crypto.randomUUID() };
      return checkoutCart({ cartVersion: cart.data?.cartVersion ?? 0, items: selection }, checkoutKey.current.key);
    },
    onSuccess: (created) => {
      setError(null);
      setOrder(created);
      payKey.current = crypto.randomUUID();
      void queryClient.invalidateQueries({ queryKey: ["me", userId, "orders"] });
    },
    onError: (failure) => {
      setError(errorText(failure, "Chưa đặt được đơn. Vui lòng thử lại."));
      if (getApiError(failure).errorCode === "CART_CHANGED") void cart.refetch();
    },
  });

  const pay = useMutation({
    mutationFn: () => payOrderMock(order!.id, payKey.current),
    onSuccess: (paid) => {
      setError(null);
      setOrder(paid);
      void queryClient.invalidateQueries({ queryKey: cartKey(userId) });
      void queryClient.invalidateQueries({ queryKey: ["me"] });
    },
    onError: (failure) => setError(errorText(failure, "Chưa thanh toán được đơn. Vui lòng thử lại.")),
  });

  const cancel = useMutation({
    mutationFn: () => cancelOrder(order!.id, "Học viên đổi lựa chọn trong giỏ", crypto.randomUUID()),
    onSettled: () => {
      setOrder(null);
      checkoutKey.current = null;
      void queryClient.invalidateQueries({ queryKey: ["me", userId, "orders"] });
    },
  });

  return (
    <div>
      <PortalPageHeader
        icon="shopping_cart"
        title="Giỏ hàng"
        description="Kiểm tra lớp đã chọn cho từng môn rồi thanh toán học phí."
      />

      {error && (
        <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 px-4 py-3 text-[14px] font-medium text-red-700">
          <Icon name="error" className="mt-px text-[19px]" />
          {error}
        </p>
      )}

      {order?.status === "PAID" ? (
        <PaidOrder order={order} />
      ) : order ? (
        <PendingOrder
          order={order}
          paying={pay.isPending}
          cancelling={cancel.isPending}
          onPay={() => pay.mutate()}
          onCancel={() => cancel.mutate()}
        />
      ) : cart.isPending ? (
        <PortalLoading label="Đang tải giỏ hàng" rows={3} />
      ) : cart.isError ? (
        <PortalError message="Không tải được giỏ hàng." onRetry={() => void cart.refetch()} />
      ) : items.length === 0 ? (
        <PortalEmpty
          icon="shopping_cart"
          title="Giỏ hàng đang trống."
          description="Thêm môn từ trang chi tiết khóa học, rồi quay lại đây để chọn lớp và thanh toán học phí."
          action={
            <Link to={ROUTES.studentCatalog} className={PORTAL_BTN_PRIMARY}>
              Xem khóa học đang mở
            </Link>
          }
        />
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <ul className="space-y-3">
            {items.map((item, index) => {
              const offer = offers[index];
              const classes = offer?.data?.content ?? [];
              const selected = classById.get(choice[item.id]);
              // Đổi lớp chỉ trong cùng khóa đã chọn (Toán 11 chỉ đổi sang lớp Toán 11 khác); chưa rõ khóa thì hiện mọi lớp của môn
              const keyOf = (group: TuitionClass) => cartCourseKey(group.courseName, group.subject, group.gradeLevel);
              const course = selected ? keyOf(selected) : preferredCartCourse(userId, item.subjectName);
              const sameCourse = course ? classes.filter((group) => keyOf(group) === course) : [];
              const options = sameCourse.length > 0 ? sameCourse : classes;
              const picking = changing === item.id || (!selected && classes.length > 0);
              return (
                <li key={item.id} className={`overflow-hidden ${PORTAL_CARD}`}>
                  {/* Môn + lớp đang chọn */}
                  <div className="flex items-start gap-4 p-4 sm:p-5">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand-navy">
                      <Icon name={subjectIcon(item.subjectName)} className="text-[23px]" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-bold uppercase tracking-wide text-brand-muted">{subjectLabel(item.subjectName)}</p>
                      {offer?.isPending ? (
                        <p className="mt-1 text-[14px] text-brand-muted">Đang tải lớp…</p>
                      ) : classes.length === 0 ? (
                        <p className="mt-1 text-[14px] text-brand-muted">Môn này hiện chưa có lớp mở đăng ký.</p>
                      ) : selected ? (
                        <ClassSummary group={selected} />
                      ) : (
                        <p className="mt-1 text-[14px] text-brand-muted">Chọn một lớp bên dưới.</p>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {selected && (
                        <span className="text-[17px] font-extrabold tabular-nums text-brand-navy">{formatVnd(selected.estimatedFee)}</span>
                      )}
                      <div className="flex items-center gap-1">
                        {selected && options.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setChanging(changing === item.id ? null : item.id)}
                            className={`h-8 rounded-lg px-2.5 text-[13px] font-semibold text-brand-navy hover:bg-brand-tint ${FOCUS_RING}`}
                          >
                            {changing === item.id ? "Đóng" : "Đổi lớp"}
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={remove.isPending}
                          onClick={() => remove.mutate(item.id)}
                          aria-label={`Xóa ${subjectLabel(item.subjectName)} khỏi giỏ`}
                          className={`flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50 ${FOCUS_RING}`}
                        >
                          <Icon name="delete" className="text-[19px]" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Danh sách lớp để chọn / đổi */}
                  {picking && (
                    <fieldset className="border-t border-brand-sandLine bg-brand-sand/40 px-4 py-3 sm:px-5">
                      <legend className="sr-only">Chọn lớp {subjectLabel(item.subjectName)}</legend>
                      <ul className="space-y-1.5">
                        {options.map((group) => {
                          const checked = choice[item.id] === group.id;
                          return (
                            <li key={group.id}>
                              <label
                                className={`flex cursor-pointer items-center gap-3 rounded-lg border bg-white px-3 py-2 text-[13.5px] transition-colors ${
                                  checked ? "border-brand-navy ring-1 ring-brand-navy" : "border-transparent hover:border-brand-navy/30"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name={`cart-item-${item.id}`}
                                  checked={checked}
                                  onChange={() => {
                                    setChoice((current) => ({ ...current, [item.id]: group.id }));
                                    rememberCartCourse(userId, item.subjectName, cartCourseKey(group.courseName, group.subject, group.gradeLevel), group.id);
                                    setChanging(null);
                                  }}
                                  className="accent-[#0B3A8C]"
                                />
                                <span className="min-w-0 flex-1 truncate">
                                  {options !== sameCourse && <span className="font-semibold text-brand-navy">{group.courseName} - </span>}
                                  <span className="font-semibold text-brand-ink">{patternLabel(group.schedulePattern)}</span>
                                  <span className="text-brand-muted">
                                    {" "}- {group.timeSlotLabel} - từ {formatDate(parseIsoDate(group.startDate))}
                                    {group.tutorName && <> - {group.tutorName}</>}
                                  </span>
                                </span>
                                <span className="shrink-0 font-semibold tabular-nums text-brand-ink">{formatVnd(group.estimatedFee)}</span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </fieldset>
                  )}
                </li>
              );
            })}
          </ul>

          <aside className={`space-y-4 p-5 lg:sticky lg:top-24 ${PORTAL_CARD}`}>
            <h2 className="text-[16px] font-bold text-brand-navy">Đơn hàng</h2>
            <ul className="space-y-2 text-[14px]">
              {items.map((item) => {
                const selected = classById.get(choice[item.id]);
                return (
                  <li key={item.id} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate text-brand-muted">{subjectLabel(item.subjectName)}</span>
                    <span className="shrink-0 font-semibold tabular-nums">{selected ? formatVnd(selected.estimatedFee) : "Chưa chọn lớp"}</span>
                  </li>
                );
              })}
            </ul>
            <p className="flex items-baseline justify-between border-t border-brand-sandLine pt-3">
              <span className="font-semibold text-brand-ink">Tạm tính</span>
              <span className="text-[20px] font-extrabold tabular-nums text-brand-navy">{formatVnd(estimate)}</span>
            </p>
            <button
              type="button"
              disabled={!ready || checkout.isPending}
              onClick={() => checkout.mutate()}
              className={`${PORTAL_BTN_PRIMARY} w-full`}
            >
              {checkout.isPending ? "Đang xử lý…" : "Thanh toán học phí"}
            </button>
            <p className="text-[12.5px] leading-relaxed text-brand-muted">
              {ready
                ? "Đóng đủ học phí khi thanh toán. Lớp nhóm được hoàn 20–40% vào ví khi lớp chốt sĩ số."
                : "Chọn lớp cho tất cả các môn để thanh toán học phí."}
            </p>
          </aside>
        </div>
      )}
      <OrderHistory />
    </div>
  );
}

/** Đơn đã đặt, chờ thanh toán: giá chốt từng lớp, hạn giữ giá, thanh toán hoặc hủy */
function PendingOrder({
  order,
  paying,
  cancelling,
  onPay,
  onCancel,
}: {
  order: CartOrderResponse;
  paying: boolean;
  cancelling: boolean;
  onPay: () => void;
  onCancel: () => void;
}) {
  const expires = new Date(order.expiresAt);
  return (
    <section className={`mx-auto max-w-[640px] p-6 ${PORTAL_CARD}`}>
      <h2 className="text-[18px] font-bold text-brand-navy">Đơn {displayCode("order", order.id)} đang chờ thanh toán</h2>
      <p className="mt-1 text-[13.5px] text-brand-muted">
        Giá được giữ đến {expires.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}. Quá hạn bạn cần đặt đơn lại.
      </p>
      <ul className="mt-4 divide-y divide-brand-sandLine">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-start justify-between gap-4 py-3 text-[14px]">
            <span>
              <span className="block font-semibold text-brand-ink">{item.courseName}</span>
              <span className="block text-brand-muted">{item.classCode}</span>
            </span>
            <span className="font-bold tabular-nums text-brand-ink">{formatVnd(item.unitPrice)}</span>
          </li>
        ))}
      </ul>
      <p className="flex justify-between border-t border-brand-sandLine pt-3 text-[16px]">
        <span className="font-semibold">Tổng cộng</span>
        <span className="font-extrabold tabular-nums text-brand-navy">{formatVnd(order.totalAmount)}</span>
      </p>
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" disabled={cancelling || paying} onClick={onCancel} className={PORTAL_BTN_SECONDARY}>
          Hủy đơn, chọn lại
        </button>
        <button type="button" disabled={paying} onClick={onPay} className={PORTAL_BTN_PRIMARY}>
          {paying ? "Đang thanh toán…" : `Thanh toán ${formatVnd(order.totalAmount)}`}
        </button>
      </div>
    </section>
  );
}

/** Đơn đã thanh toán xong */
function PaidOrder({ order }: { order: CartOrderResponse }) {
  return (
    <section className={`mx-auto max-w-[560px] p-8 text-center ${PORTAL_CARD}`}>
      <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
        <Icon name="check" className="text-[30px]" />
      </span>
      <h2 className="mt-3 text-[19px] font-bold text-brand-navy">Đã thanh toán đơn {displayCode("order", order.id)}</h2>
      <p className="mt-1 text-[14px] text-brand-muted">
        Bạn đã ghi danh {order.items.length} lớp, tổng {formatVnd(order.totalAmount)}.
      </p>
      <Link to={ROUTES.studentEnrollments} className={`${PORTAL_BTN_PRIMARY} mt-5`}>
        Xem lớp của tôi
      </Link>
    </section>
  );
}

/** Thông tin gọn của lớp đang chọn trong giỏ */
function ClassSummary({ group }: { group: TuitionClass }) {
  return (
    <div className="mt-0.5 min-w-0">
      <p className="truncate text-[15.5px] font-bold text-brand-ink">{group.courseName}</p>
      {group.tutorName && (
        <p className="mt-1 flex items-center gap-2 text-[13.5px] text-brand-ink">
          <UserAvatar userId={group.tutorId} name={group.tutorName} size={22} />
          <span className="truncate">Gia sư {group.tutorName}</span>
          <StarRating value={group.tutorRating && (group.tutorRatingCount ?? 0) > 0 ? group.tutorRating : null} size={13} />
        </p>
      )}
      <p className="mt-0.5 text-[13px] text-brand-muted">
        {patternLabel(group.schedulePattern)} - {group.timeSlotLabel} - {group.totalSessions} buổi - khai giảng{" "}
        {formatDate(parseIsoDate(group.startDate))}
      </p>
    </div>
  );
}
