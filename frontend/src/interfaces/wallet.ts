import type { IntentDetail } from "@/interfaces/dto";

export interface StudentWallet {
  walletId: number;
  balance: number;
  currency: "VND";
  minTopupAmount: number;
  maxTopupAmount: number;
}
export interface WalletTopup {
  topupId: number;
  amount: number;
  status: "PENDING" | "COMPLETED" | "FAILED" | "EXPIRED";
  reference: string;
  paymentUrl: string | null;
  expiresAt: string;
  paidAt: string | null;
}
export interface WalletTransaction {
  transactionId: number;
  type: "TOPUP" | "TUITION" | "REFUND" | "CLASS_DISCOUNT";
  amount: number;
  balanceAfter: number;
  description: string;
  createdAt: string;
}
export interface WalletPaymentConfirmation {
  intentId: number;
  status: "COMPLETED";
  payment: NonNullable<IntentDetail["payment"]>;
  enrollment: NonNullable<IntentDetail["enrollment"]>;
}

export interface TopupAttempt {
  amount: number;
  key: string;
  id?: number;
}
