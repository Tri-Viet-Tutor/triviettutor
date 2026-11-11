import { api, unwrap } from "@/services/apiClient";
import type { ApiResponse, PageResponse } from "@/interfaces/dto";
import type { StudentWallet, WalletTopup, WalletTransaction, WalletPaymentConfirmation } from "@/interfaces/wallet";

// Adapted from Bike Exchange walletService. A verified VNPay return or IPN credits the wallet once.
export const walletService = {
  // Số dư ví của tôi
  async getWallet(): Promise<StudentWallet> {
    return unwrap(await api.get<ApiResponse<StudentWallet>>("/wallet"));
  },
  // Lịch sử giao dịch ví, 20 dòng mỗi trang
  async history(page: number): Promise<PageResponse<WalletTransaction>> {
    return unwrap(await api.get<ApiResponse<PageResponse<WalletTransaction>>>("/wallet/transactions", { params: { page, size: 20 } }));
  },
  // Tạo lệnh nạp tiền vào ví
  async createTopup(amount: number, key: string): Promise<WalletTopup> {
    return unwrap(await api.post<ApiResponse<WalletTopup>>("/wallet/topups", { amount }, { headers: { "Idempotency-Key": key } }));
  },
  // Trạng thái một lệnh nạp tiền
  async getTopup(id: number): Promise<WalletTopup> {
    return unwrap(await api.get<ApiResponse<WalletTopup>>(`/wallet/topups/${id}`));
  },
  // Asks the backend to query VNPay when the IPN never arrived; only a signed paid result credits the wallet.
  async reconcileTopup(id: number): Promise<WalletTopup> {
    return unwrap(await api.post<ApiResponse<WalletTopup>>(`/wallet/topups/${id}/reconcile`));
  },
  // Kiểm tra kết quả VNPay khi nạp tiền xong quay lại web
  async verifyReturn(search: string): Promise<WalletTopup> {
    return unwrap(await api.get<ApiResponse<WalletTopup>>("/wallet/vnpay/return", { params: new URLSearchParams(search) }));
  },
  // Trả học phí bằng ví
  async payTuition(id: number, key: string): Promise<WalletPaymentConfirmation> {
    return unwrap(
      await api.post<ApiResponse<WalletPaymentConfirmation>>(`/payment-intents/${id}/wallet`, undefined, {
        headers: { "Idempotency-Key": key },
      }),
    );
  },
};
