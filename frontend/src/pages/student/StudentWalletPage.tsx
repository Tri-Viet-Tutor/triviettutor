import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY, PORTAL_CARD } from "@/constants/classNames";
import { ROUTES } from "@/constants/routes";
import { walletService } from "@/services/walletService";
import { useAuthStore } from "@/stores/authStore";
import { formatVnd } from "@/utils/currency";
import { clearTopup, readTopup, saveTopup, walletError } from "@/utils/wallet";
import type { TopupAttempt } from "@/interfaces/wallet";
import { displayCode } from "@/utils/classes";

const STATUS = {
  PENDING: "Đang chờ xác nhận từ VNPay",
  COMPLETED: "Đã nạp tiền vào ví",
  FAILED: "Giao dịch không thành công",
  EXPIRED: "Yêu cầu đã hết hạn",
};

// Adapted from Bike Exchange WalletTab, using persisted IPN results and the student portal UI.
export function StudentWalletPage() {
  const user = useAuthStore((s) => s.user);
  return user ? <WalletContent key={user.id} userId={user.id} fullName={user.fullName} /> : null;
}
// Nội dung trang ví: thẻ ví, nạp tiền và lịch sử giao dịch
function WalletContent({ userId, fullName }: { userId: number; fullName: string }) {
  const cache = useQueryClient();
  const navigate = useNavigate();
  const { search } = useLocation();
  const attempt = useRef<TopupAttempt | null>(readTopup(userId));
  const [activeId, setActiveId] = useState<number | null>(() => readTopup(userId)?.id ?? null);
  const [amount, setAmount] = useState(() => String(readTopup(userId)?.amount ?? ""));
  const [notice, setNotice] = useState("");
  const wallet = useQuery({ queryKey: ["wallet", userId], queryFn: walletService.getWallet });
  const returning = new URLSearchParams(search).has("vnp_TxnRef") || new URLSearchParams(search).has("vnp_SecureHash");
  const returned = useQuery({
    queryKey: ["wallet-return", userId, search],
    queryFn: () => walletService.verifyReturn(search),
    enabled: returning,
    retry: false,
  });
  const topupId = returning ? returned.data?.topupId : activeId;
  const detail = useQuery({
    queryKey: ["wallet-topup", userId, topupId],
    queryFn: () => walletService.getTopup(topupId!),
    enabled: Boolean(topupId),
    retry: false,
    refetchInterval: (q) => (q.state.data?.status === "PENDING" && q.state.dataUpdateCount < 21 ? 3000 : false),
  });
  const topup = detail.data ?? (returning ? returned.data : undefined);

  useEffect(() => {
    if (detail.isError) {
      clearTopup(userId);
      setActiveId(null);
      attempt.current = null;
    }
  }, [detail.isError, userId]);
  const reconcile = useMutation({
    mutationFn: (id: number) => walletService.reconcileTopup(id),
    onSuccess: (value) => {
      cache.setQueryData(["wallet-topup", userId, value.topupId], value);
      setNotice(value.status === "COMPLETED" ? "VNPay đã xác nhận. Số tiền đã được cộng vào ví." : "VNPay chưa xác nhận giao dịch này đã thanh toán.");
    },
  });
  const reconcileTopup = useRef(reconcile.mutate);
  reconcileTopup.current = reconcile.mutate;
  const handledReturn = useRef("");
  useEffect(() => {
    if (!returning || !returned.data || handledReturn.current === search) return;
    handledReturn.current = search;
    const value = returned.data;
    setActiveId(value.topupId);
    const saved = { amount: value.amount, key: attempt.current?.key ?? crypto.randomUUID(), id: value.topupId };
    attempt.current = saved;
    saveTopup(userId, saved);
    cache.setQueryData(["wallet-topup", userId, value.topupId], value);
    const code = new URLSearchParams(search).get("vnp_ResponseCode");
    if (value.status === "COMPLETED") {
      setNotice("VNPay đã xác nhận. Số tiền đã được cộng vào ví.");
    } else if (code === "00") {
      setNotice("VNPay đã xác nhận thanh toán. Hệ thống đang cộng tiền vào ví.");
      reconcileTopup.current(value.topupId);
    } else {
      setNotice("Bạn đã hủy hoặc VNPay chưa xác nhận thành công. Hãy kiểm tra trạng thái bên dưới.");
    }
    navigate(ROUTES.studentWallet, { replace: true });
  }, [returning, returned.data, cache, navigate, search, userId]);
  useEffect(() => {
    if (topup?.status !== "COMPLETED") return;
    void cache.invalidateQueries({ queryKey: ["wallet", userId] });
    void cache.invalidateQueries({ queryKey: ["wallet-history", userId] });
  }, [topup?.status, topup?.topupId, cache, userId]);

  const create = useMutation({
    mutationFn: async () => {
      const value = Number(amount);
      if (!attempt.current || attempt.current.amount !== value || attempt.current.id) {
        attempt.current = { amount: value, key: crypto.randomUUID() };
      }
      saveTopup(userId, attempt.current);
      return walletService.createTopup(value, attempt.current.key);
    },
    onSuccess: (value) => {
      const saved = { amount: value.amount, key: attempt.current!.key, id: value.topupId };
      attempt.current = saved;
      saveTopup(userId, saved);
      setActiveId(value.topupId);
      setNotice("");
      cache.setQueryData(["wallet-topup", userId, value.topupId], value);
      if (value.paymentUrl) window.location.assign(value.paymentUrl);
    },
  });
  const value = Number(amount);
  const validAmount = Boolean(
    wallet.data &&
    /^\d+$/.test(amount) &&
    Number.isSafeInteger(value) &&
    value >= wallet.data.minTopupAmount &&
    value <= wallet.data.maxTopupAmount,
  );
  const pending = topup?.status === "PENDING";
  const error = create.error ?? reconcile.error ?? returned.error ?? detail.error;
  // Tải lại số dư và trạng thái lần nạp đang chờ
  function refresh() {
    void wallet.refetch();
    if (topupId) void detail.refetch();
    if (returning) void returned.refetch();
    void cache.invalidateQueries({ queryKey: ["wallet-history", userId] });
  }
  const limits = wallet.data;
  const quick = [100_000, 200_000, 500_000, 1_000_000, 2_000_000].filter(
    (option) => !limits || (option >= limits.minTopupAmount && option <= limits.maxTopupAmount),
  );
  const locked = create.isPending || pending || returning;
  // Ba bước của một lần nạp: tạo yêu cầu → thanh toán ở VNPay → cộng vào ví
  const step = !topup ? 0 : topup.status === "COMPLETED" ? 3 : topup.status === "PENDING" ? 2 : 1;

  return (
    <div className="space-y-6">
      <PortalPageHeader
        icon="account_balance_wallet"
        title="Ví của tôi"
        description="Nạp tiền qua VNPay, dùng số dư đóng học phí và nhận tiền hoàn ưu đãi lớp nhóm."
      />
      {notice && <AuthNotice tone="info">{notice}</AuthNotice>}
      {error && <AuthNotice tone="error">{walletError(error)}</AuthNotice>}

      <div className="grid items-start gap-6 lg:grid-cols-[420px_minmax(0,1fr)]">
        {
          // Thẻ ví
        }
        <section className="relative mx-auto flex aspect-[1.586/1] w-full max-w-[420px] flex-col overflow-hidden rounded-3xl bg-gradient-to-br from-brand-navyDeep via-brand-navy to-[#2563C9] p-5 text-white shadow-[0_30px_60px_-34px_rgba(8,42,102,0.9)] sm:p-6">
          <div aria-hidden="true" className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-white/10" />
          <div aria-hidden="true" className="pointer-events-none absolute -bottom-28 -left-10 h-64 w-64 rounded-full bg-brand-orange/25 blur-2xl" />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:14px_14px]"
          />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[12px] font-bold uppercase tracking-[0.2em] text-white/70">Ví học phí</p>
              <p className="mt-0.5 text-[15px] font-extrabold uppercase tracking-tight">
                Tri Viet <span className="text-brand-orange">Tutor</span>
              </p>
            </div>
            {
              // Chip thẻ
            }
            <span aria-hidden="true" className="grid h-9 w-12 grid-cols-3 gap-px overflow-hidden rounded-md bg-gradient-to-br from-[#F7D98B] to-[#C9A24A] p-1 opacity-90">
              {Array.from({ length: 6 }, (_, index) => (
                <span key={index} className="rounded-[2px] bg-black/10" />
              ))}
            </span>
          </div>

          <div className="relative mt-auto pt-3">
            <p className="text-[13px] text-white/70">Số dư khả dụng</p>
            <p className="mt-1 break-words text-[30px] font-extrabold leading-none tracking-tight tabular-nums sm:text-[34px]">
              {wallet.isPending ? "…" : wallet.data ? formatVnd(wallet.data.balance) : "—"}
            </p>
            {wallet.isError && (
              <p role="alert" className="mt-2 text-[13px] text-white/80">
                Không tải được ví. Vui lòng tải lại trang.
              </p>
            )}
          </div>

          <div className="relative mt-4 flex items-end justify-between gap-3 border-t border-white/15 pt-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/60">Chủ ví</p>
              <p className="truncate text-[14.5px] font-bold">{fullName}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link
                to={ROUTES.studentCatalog}
                className="inline-flex h-9 items-center gap-1 rounded-xl bg-white px-3 text-[13px] font-semibold text-brand-navy hover:bg-brand-tint"
              >
                <Icon name="school" className="text-[18px]" />
                Đóng học phí
              </Link>
            </div>
          </div>
        </section>

        {
          // Nạp tiền
        }
        <section className={`${PORTAL_CARD} flex flex-col p-6`}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[19px] font-extrabold text-brand-navy">Nạp tiền vào ví</h2>
              <p className="mt-0.5 text-[13.5px] text-brand-muted">Thanh toán bằng thẻ ATM, thẻ quốc tế hoặc QR tại cổng VNPay.</p>
            </div>
          </div>
          <form
            className="mt-5 flex flex-1 flex-col"
            onSubmit={(e) => {
              e.preventDefault();
              if (validAmount && !pending && !create.isPending) create.mutate();
            }}
          >
            <label className="text-[13px] font-semibold text-brand-muted" htmlFor="wallet-amount">
              Số tiền muốn nạp
            </label>
            <div
              className={`mt-2 flex h-16 items-center gap-3 rounded-2xl border-2 bg-white px-4 transition-colors focus-within:border-brand-navy ${
                amount && !validAmount ? "border-red-300" : "border-brand-sandLine"
              }`}
            >
              <input
                id="wallet-amount"
                inputMode="numeric"
                autoComplete="off"
                required
                aria-describedby="wallet-limits"
                className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[28px] font-extrabold leading-none tabular-nums text-brand-navy outline-none placeholder:text-slate-300 focus:ring-0"
                value={amount ? Number(amount).toLocaleString("vi-VN") : ""}
                disabled={locked}
                onChange={(e) => {
                  setAmount(e.target.value.replace(/\D/g, "").replace(/^0+/, ""));
                  create.reset();
                }}
                placeholder="0"
              />
              <span className="shrink-0 rounded-lg bg-brand-sand px-2.5 py-1 text-[13px] font-bold text-brand-muted">VNĐ</span>
            </div>
            <p id="wallet-limits" className={`mt-2 text-[12.5px] ${amount && !validAmount ? "text-red-700" : "text-brand-muted"}`}>
              {limits
                ? `Mỗi lần nạp từ ${formatVnd(limits.minTopupAmount)} đến ${formatVnd(limits.maxTopupAmount)} - không thu phí.`
                : "Đang tải giới hạn nạp…"}
            </p>

            <p className="mt-5 text-[13px] font-semibold text-brand-muted">Chọn nhanh</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
              {quick.map((option) => {
                const active = Number(amount) === option;
                return (
                  <button
                    key={option}
                    type="button"
                    disabled={locked}
                    onClick={() => {
                      setAmount(String(option));
                      create.reset();
                    }}
                    className={`h-10 rounded-xl border px-1 text-[12.5px] font-bold tabular-nums transition-colors disabled:opacity-50 ${
                      active
                        ? "border-brand-navy bg-brand-navy text-white"
                        : "border-brand-sandLine bg-white text-brand-ink hover:border-brand-navy/40 hover:bg-brand-tint hover:text-brand-navy"
                    }`}
                  >
                    {formatVnd(option)}
                  </button>
                );
              })}
            </div>

            <div className="mt-auto pt-6">
            <button type="submit" disabled={!validAmount || locked} className={`${PORTAL_BTN_PRIMARY} h-12 w-full text-[15px]`}>
              <Icon name="lock" className="text-[18px]" />
              {create.isPending ? "Đang kết nối VNPay…" : validAmount ? `Nạp ${formatVnd(value)} qua VNPay` : "Nạp qua VNPay"}
            </button>
            {pending && <p className="mt-2 text-center text-[12.5px] text-brand-muted">Đang có một yêu cầu chờ xác nhận bên dưới.</p>}
            </div>
          </form>
        </section>
      </div>

      {(topup || returning || (detail.isPending && Boolean(topupId))) && (
        <section className={`${PORTAL_CARD} p-6`} aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-[17px] font-extrabold text-brand-navy">Yêu cầu nạp tiền</h2>
              {topup && (
                <p className="mt-0.5 text-[13.5px] text-brand-muted">
                  {displayCode("topup", topup.topupId)} - <strong className="text-brand-ink">{formatVnd(topup.amount)}</strong>
                </p>
              )}
            </div>
            {topup && (
              <span
                className={`rounded-full px-3 py-1 text-[12.5px] font-bold ${
                  topup.status === "COMPLETED"
                    ? "bg-emerald-100 text-emerald-800"
                    : topup.status === "PENDING"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {STATUS[topup.status]}
              </span>
            )}
          </div>

          {topup ? (
            <>
              {
                // Tiến trình
              }
              <ol className="mt-5 grid grid-cols-3 gap-2">
                {["Tạo yêu cầu", "Thanh toán tại VNPay", "Cộng vào ví"].map((label, index) => {
                  const done = index < step;
                  const failed = (topup.status === "FAILED" || topup.status === "EXPIRED") && index === 1;
                  return (
                    <li key={label} className="flex flex-col gap-1.5">
                      <span className={`h-1.5 rounded-full ${failed ? "bg-red-400" : done ? "bg-emerald-500" : index === step ? "bg-amber-400" : "bg-brand-sand"}`} />
                      <span className={`text-[12.5px] font-semibold ${done ? "text-emerald-700" : failed ? "text-red-700" : "text-brand-muted"}`}>{label}</span>
                    </li>
                  );
                })}
              </ol>
              {pending && (
                <p className="mt-4 text-[13px] text-brand-muted">
                  Hiệu lực đến {new Date(topup.expiresAt).toLocaleString("vi-VN")}. Nếu xác nhận bị chậm, bấm kiểm tra trạng thái.
                </p>
              )}
              {topup.status === "EXPIRED" && (
                <p className="mt-4 text-[13px] text-brand-muted">
                  Nếu VNPay đã thu tiền, hệ thống vẫn ghi nhận khi nhận được xác nhận. Liên hệ trung tâm và cung cấp mã yêu cầu nếu cần đối soát.
                </p>
              )}
              <div className="mt-4 flex flex-wrap gap-2.5">
                {topup.paymentUrl && pending && (
                  <a href={topup.paymentUrl} className={PORTAL_BTN_PRIMARY}>
                    Tiếp tục tại VNPay
                  </a>
                )}
                <button type="button" onClick={refresh} className={PORTAL_BTN_SECONDARY}>
                  <Icon name="refresh" className="text-[18px]" />
                  Kiểm tra trạng thái
                </button>
                {(pending || topup.status === "EXPIRED") && (
                  <button
                    type="button"
                    onClick={() => reconcile.mutate(topup.topupId)}
                    disabled={reconcile.isPending}
                    className={PORTAL_BTN_SECONDARY}
                  >
                    {reconcile.isPending ? "Đang đối soát…" : "Đối soát với VNPay"}
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="mt-3 text-brand-muted">Đang xác minh kết quả nạp…</p>
          )}
          {returned.isError && (
            <button type="button" onClick={() => void returned.refetch()} className={`${PORTAL_BTN_SECONDARY} mt-3`}>
              Xác minh lại
            </button>
          )}
        </section>
      )}
      <WalletHistory userId={userId} />
    </div>
  );
}

// Kiểu giao dịch: nhãn, biểu tượng, màu và dấu cộng / trừ
const KINDS = {
  TOPUP: { label: "Nạp tiền", icon: "south_west", tone: "bg-emerald-50 text-emerald-700", sign: "+" },
  TUITION: { label: "Đóng học phí", icon: "school", tone: "bg-brand-tint text-brand-navy", sign: "−" },
  REFUND: { label: "Hoàn tiền", icon: "undo", tone: "bg-sky-50 text-sky-700", sign: "+" },
  CLASS_DISCOUNT: { label: "Hoàn ưu đãi lớp nhóm", icon: "savings", tone: "bg-amber-50 text-amber-700", sign: "+" },
} as const;
type Kind = keyof typeof KINDS;

// Lịch sử giao dịch: lọc theo loại, nhóm theo ngày, mỗi dòng có biểu tượng loại và số dư sau giao dịch
function WalletHistory({ userId }: { userId: number }) {
  const [page, setPage] = useState(0);
  const [kind, setKind] = useState<Kind | "">("");
  const history = useQuery({ queryKey: ["wallet-history", userId, page], queryFn: () => walletService.history(page) });
  const items = (history.data?.content ?? []).filter((item) => !kind || item.type === kind);
  const groups = new Map<string, typeof items>();
  for (const item of items) {
    const key = new Date(item.createdAt).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
    groups.set(key, [...(groups.get(key) ?? []), item]);
  }

  return (
    <section className={`${PORTAL_CARD} overflow-hidden`}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-sandLine px-5 py-4 sm:px-6">
        <h2 className="text-[18px] font-extrabold text-brand-navy">Lịch sử giao dịch</h2>
        <div className="flex flex-wrap gap-1.5">
          {([["", "Tất cả"], ["TOPUP", "Nạp tiền"], ["TUITION", "Học phí"], ["REFUND", "Hoàn tiền"], ["CLASS_DISCOUNT", "Ưu đãi"]] as const).map(
            ([value, label]) => (
              <button
                key={value || "all"}
                type="button"
                aria-pressed={kind === value}
                onClick={() => setKind(value)}
                className={`h-8 rounded-full px-3 text-[12.5px] font-semibold transition-colors ${
                  kind === value ? "bg-brand-navy text-white" : "bg-brand-sand text-brand-ink hover:bg-brand-sandLine"
                }`}
              >
                {label}
              </button>
            ),
          )}
        </div>
      </div>

      <div className="px-5 py-4 sm:px-6">
        {history.isPending && <p className="text-brand-muted">Đang tải lịch sử…</p>}
        {history.isError && (
          <AuthNotice tone="error">
            Không tải được lịch sử.{" "}
            <button type="button" onClick={() => void history.refetch()} className="font-semibold underline">
              Thử lại
            </button>
          </AuthNotice>
        )}
        {history.data && items.length === 0 && (
          <div className="flex flex-col items-center py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-sand text-brand-muted">
              <Icon name="receipt_long" className="text-[28px]" />
            </span>
            <p className="mt-3 text-[15px] font-bold text-brand-ink">Không có giao dịch.</p>
            <p className="mt-0.5 text-[13px] text-brand-muted">Các lần nạp tiền, đóng học phí và hoàn tiền sẽ hiện ở đây.</p>
          </div>
        )}
        <div className="space-y-5">
          {[...groups].map(([day, list]) => (
            <div key={day}>
              <p className="mb-2 text-[12px] font-bold uppercase tracking-wide text-brand-muted first-letter:uppercase">{day}</p>
              <ul className="divide-y divide-brand-sandLine rounded-2xl border border-brand-sandLine">
                {list.map((t) => {
                  const meta = KINDS[t.type];
                  const income = meta.sign === "+";
                  return (
                    <li key={t.transactionId} className="flex items-center gap-3 px-4 py-3">
                      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.tone}`}>
                        <Icon name={meta.icon} className="text-[20px]" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-bold text-brand-ink">{meta.label}</p>
                        <p className="truncate text-[12.5px] text-brand-muted" title={t.description}>
                          {new Date(t.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                          {t.description && ` - ${t.description}`}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className={`text-[15px] font-extrabold tabular-nums ${income ? "text-emerald-700" : "text-brand-ink"}`}>
                          {meta.sign}
                          {formatVnd(t.amount)}
                        </p>
                        <p className="text-[11.5px] tabular-nums text-brand-muted">Số dư {formatVnd(t.balanceAfter)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {history.data && history.data.totalPages > 1 && (
          <div className="mt-5 flex items-center justify-center gap-3">
            <button type="button" className={PORTAL_BTN_SECONDARY} disabled={page === 0} onClick={() => setPage(page - 1)}>
              <Icon name="chevron_left" className="text-[18px]" />
              Trang trước
            </button>
            <span className="text-[13.5px] font-semibold tabular-nums text-brand-muted">
              {page + 1}/{history.data.totalPages}
            </span>
            <button
              type="button"
              className={PORTAL_BTN_SECONDARY}
              disabled={page + 1 >= history.data.totalPages}
              onClick={() => setPage(page + 1)}
            >
              Trang sau
              <Icon name="chevron_right" className="text-[18px]" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
