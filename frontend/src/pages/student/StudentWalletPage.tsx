import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY, PORTAL_CARD, PORTAL_INPUT } from "@/constants/classNames";
import { ROUTES } from "@/constants/routes";
import { walletService } from "@/services/walletService";
import { useAuthStore } from "@/stores/authStore";
import { formatVnd } from "@/utils/currency";
import { readTopup, saveTopup, walletError } from "@/utils/wallet";
import type { TopupAttempt } from "@/utils/wallet";

const STATUS = {
  PENDING: "Đang chờ xác nhận từ VNPay",
  COMPLETED: "Đã nạp tiền vào ví",
  FAILED: "Giao dịch không thành công",
  EXPIRED: "Yêu cầu đã hết hạn",
};

/** Adapted from Bike Exchange WalletTab, using persisted IPN results and the student portal UI. */
export function StudentWalletPage() {
  const user = useAuthStore((s) => s.user);
  return user ? <WalletContent key={user.id} userId={user.id} fullName={user.fullName} /> : null;
}
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
    if (!returning || !returned.data) return;
    const value = returned.data;
    setActiveId(value.topupId);
    const saved = { amount: value.amount, key: attempt.current?.key ?? crypto.randomUUID(), id: value.topupId };
    attempt.current = saved;
    saveTopup(userId, saved);
    cache.setQueryData(["wallet-topup", userId, value.topupId], value);
    const code = new URLSearchParams(search).get("vnp_ResponseCode");
    setNotice(
      code === "00"
        ? "VNPay đã trả kết quả thành công. Số dư chỉ cập nhật sau khi hệ thống nhận xác nhận."
        : "Bạn đã hủy hoặc VNPay chưa xác nhận thành công. Hãy kiểm tra trạng thái bên dưới.",
    );
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
  const reconcile = useMutation({
    mutationFn: (id: number) => walletService.reconcileTopup(id),
    onSuccess: (value) => {
      cache.setQueryData(["wallet-topup", userId, value.topupId], value);
      setNotice(value.status === "COMPLETED" ? "" : "VNPay chưa xác nhận giao dịch này đã thanh toán.");
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
  function refresh() {
    void wallet.refetch();
    if (topupId) void detail.refetch();
    if (returning) void returned.refetch();
    void cache.invalidateQueries({ queryKey: ["wallet-history", userId] });
  }
  return (
    <div className="space-y-6">
      <PortalPageHeader
        icon="account_balance_wallet"
        title="Ví của tôi"
        description="Nạp qua VNPay Sandbox, dùng số dư đóng học phí và theo dõi từng giao dịch."
        action={
          <button type="button" onClick={refresh} className={PORTAL_BTN_SECONDARY}>
            Làm mới
          </button>
        }
      />
      {notice && <AuthNotice tone="info">{notice}</AuthNotice>}
      {error && <AuthNotice tone="error">{walletError(error)}</AuthNotice>}
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl bg-brand-navy p-7 text-white">
          <Icon name="account_balance_wallet" className="mb-5 text-3xl" />
          <h2 className="text-sm text-white/75">Số dư khả dụng</h2>
          <p className="my-3 break-words text-4xl font-bold">{wallet.data ? formatVnd(wallet.data.balance) : "—"}</p>
          <p className="mt-6 border-t border-white/20 pt-4 text-sm">{fullName}</p>
          <Link to={ROUTES.studentCheckout} className="mt-5 inline-block rounded-xl bg-white px-4 py-2 font-semibold text-brand-navy">
            Dùng ví đóng học phí
          </Link>
          {wallet.isPending && (
            <p role="status" className="mt-3">
              Đang tải số dư…
            </p>
          )}
          {wallet.isError && (
            <p role="alert" className="mt-3">
              Không tải được ví. Bấm Làm mới để thử lại.
            </p>
          )}
        </section>
        <section className={`${PORTAL_CARD} space-y-4 p-6`}>
          <h2 className="text-xl font-bold text-brand-navy">Nạp tiền vào ví</h2>
          <p className="text-sm text-brand-muted">Môi trường thử nghiệm VNPay Sandbox. Nhập thẻ và OTP tại trang VNPay.</p>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (validAmount && !pending && !create.isPending) create.mutate();
            }}
          >
            <label className="block text-sm font-semibold" htmlFor="wallet-amount">
              Số tiền nạp (VNĐ)
            </label>
            <input
              id="wallet-amount"
              inputMode="numeric"
              autoComplete="off"
              pattern="[0-9]+"
              required
              aria-describedby="wallet-limits"
              className={PORTAL_INPUT}
              value={amount}
              disabled={create.isPending || pending || returning}
              onChange={(e) => {
                setAmount(e.target.value.replace(/\D/g, ""));
                create.reset();
              }}
              placeholder="Nhập số tiền"
            />
            <p id="wallet-limits" className="text-sm text-brand-muted">
              {wallet.data
                ? `Từ ${formatVnd(wallet.data.minTopupAmount)} đến ${formatVnd(wallet.data.maxTopupAmount)}. Không thu phí nạp.`
                : "Đang tải giới hạn nạp…"}
            </p>
            <button type="submit" disabled={!validAmount || create.isPending || pending || returning} className={PORTAL_BTN_PRIMARY}>
              {create.isPending ? "Đang kết nối VNPay…" : "Nạp qua VNPay Sandbox"}
            </button>
          </form>
        </section>
      </div>
      {(topup || returning || (detail.isPending && Boolean(topupId))) && (
        <section className={`${PORTAL_CARD} space-y-3 p-6`} aria-live="polite">
          <h2 className="text-lg font-bold text-brand-navy">Yêu cầu nạp tiền</h2>
          {topup ? (
            <>
              <p>
                Yêu cầu #{topup.topupId} · {formatVnd(topup.amount)}
              </p>
              <AuthNotice tone={topup.status === "COMPLETED" ? "success" : topup.status === "FAILED" ? "error" : "info"}>
                {STATUS[topup.status]}
              </AuthNotice>
              {pending && (
                <p className="text-sm text-brand-muted">
                  Hiệu lực đến {new Date(topup.expiresAt).toLocaleString("vi-VN")}. Nếu xác nhận bị chậm, bấm kiểm tra trạng thái.
                </p>
              )}
              {topup.status === "EXPIRED" && (
                <p className="text-sm">
                  Nếu VNPay đã thu tiền, hệ thống vẫn ghi nhận khi nhận được xác nhận. Liên hệ trung tâm và cung cấp mã yêu cầu nếu cần đối
                  soát.
                </p>
              )}
              <div className="flex flex-wrap gap-3">
                {topup.paymentUrl && (
                  <a href={topup.paymentUrl} className={PORTAL_BTN_PRIMARY}>
                    Tiếp tục tại VNPay
                  </a>
                )}
                <button type="button" onClick={refresh} className={PORTAL_BTN_SECONDARY}>
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
            <p>Đang xác minh kết quả nạp…</p>
          )}
          {returned.isError && (
            <button type="button" onClick={() => void returned.refetch()} className={PORTAL_BTN_SECONDARY}>
              Xác minh lại
            </button>
          )}
        </section>
      )}
      <WalletHistory userId={userId} />
    </div>
  );
}
function WalletHistory({ userId }: { userId: number }) {
  const [page, setPage] = useState(0);
  const history = useQuery({ queryKey: ["wallet-history", userId, page], queryFn: () => walletService.history(page) });
  const labels = { TOPUP: "Nạp tiền", TUITION: "Học phí", REFUND: "Hoàn tiền" };
  return (
    <section className={`${PORTAL_CARD} p-6`}>
      <h2 className="mb-4 text-xl font-bold text-brand-navy">Lịch sử giao dịch</h2>
      {history.isPending && <p>Đang tải lịch sử…</p>}
      {history.isError && (
        <AuthNotice tone="error">
          Không tải được lịch sử.{" "}
          <button type="button" onClick={() => void history.refetch()}>
            Thử lại
          </button>
        </AuthNotice>
      )}
      {history.data?.content.length === 0 && <p className="text-brand-muted">Chưa có giao dịch ví.</p>}
      {Boolean(history.data?.content.length) && (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Các khoản nạp, trả học phí và hoàn tiền vào ví</caption>
            <thead>
              <tr className="border-b">
                <th scope="col" className="p-3">
                  Thời gian
                </th>
                <th scope="col" className="p-3">
                  Giao dịch
                </th>
                <th scope="col" className="p-3 text-right">
                  Số tiền
                </th>
                <th scope="col" className="p-3 text-right">
                  Số dư sau giao dịch
                </th>
              </tr>
            </thead>
            <tbody>
              {history.data?.content.map((t) => (
                <tr key={t.transactionId} className="border-b border-brand-sandLine">
                  <td className="whitespace-nowrap p-3">{new Date(t.createdAt).toLocaleString("vi-VN")}</td>
                  <td className="p-3">
                    <strong>{labels[t.type]}</strong>
                    <p className="text-brand-muted">{t.description}</p>
                  </td>
                  <td
                    className={`whitespace-nowrap p-3 text-right font-semibold ${t.type === "TUITION" ? "text-brand-ink" : "text-emerald-700"}`}
                  >
                    {t.type === "TUITION" ? "−" : "+"}
                    {formatVnd(t.amount)}
                  </td>
                  <td className="whitespace-nowrap p-3 text-right">{formatVnd(t.balanceAfter)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {history.data && history.data.totalPages > 1 && (
        <div className="mt-4 flex items-center gap-3">
          <button type="button" className={PORTAL_BTN_SECONDARY} disabled={page === 0} onClick={() => setPage(page - 1)}>
            Trang trước
          </button>
          <span>
            {page + 1}/{history.data.totalPages}
          </span>
          <button
            type="button"
            className={PORTAL_BTN_SECONDARY}
            disabled={page + 1 >= history.data.totalPages}
            onClick={() => setPage(page + 1)}
          >
            Trang sau
          </button>
        </div>
      )}
    </section>
  );
}
