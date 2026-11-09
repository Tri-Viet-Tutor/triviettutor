import { api, unwrap } from "@/services/api";
import type { ApiResponse, PageResponse } from "@/interfaces/api";
import type { StudentWallet, WalletTopup, WalletTransaction, WalletPaymentConfirmation } from "@/interfaces/wallet";

/** Adapted from Bike Exchange walletService. A verified VNPay return or IPN credits the wallet once. */
export const walletService = {
  async getWallet(): Promise<StudentWallet> {
    return unwrap(await api.get<ApiResponse<StudentWallet>>("/wallet"));
  },
  async history(page: number): Promise<PageResponse<WalletTransaction>> {
    return unwrap(await api.get<ApiResponse<PageResponse<WalletTransaction>>>("/wallet/transactions", { params: { page, size: 20 } }));
  },
  async createTopup(amount: number, key: string): Promise<WalletTopup> {
    return unwrap(await api.post<ApiResponse<WalletTopup>>("/wallet/topups", { amount }, { headers: { "Idempotency-Key": key } }));
  },
  async getTopup(id: number): Promise<WalletTopup> {
    return unwrap(await api.get<ApiResponse<WalletTopup>>(`/wallet/topups/${id}`));
  },
  /** Asks the backend to query VNPay when the IPN never arrived; only a signed paid result credits the wallet. */
  async reconcileTopup(id: number): Promise<WalletTopup> {
    return unwrap(await api.post<ApiResponse<WalletTopup>>(`/wallet/topups/${id}/reconcile`));
  },
  async verifyReturn(search: string): Promise<WalletTopup> {
    return unwrap(await api.get<ApiResponse<WalletTopup>>("/wallet/vnpay/return", { params: new URLSearchParams(search) }));
  },
  async payTuition(id: number, key: string): Promise<WalletPaymentConfirmation> {
    return unwrap(
      await api.post<ApiResponse<WalletPaymentConfirmation>>(`/payment-intents/${id}/wallet`, undefined, {
        headers: { "Idempotency-Key": key },
      }),
    );
  },
};
