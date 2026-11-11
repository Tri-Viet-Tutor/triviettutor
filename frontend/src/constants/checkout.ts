
export const PAYMENT_DEMO = import.meta.env.VITE_PAYMENT_DEMO !== "false";

// Mã thanh toán có hiệu lực 15 phút
export const PAYMENT_CODE_TTL_SECONDS = 15 * 60;

export const DEMO_TEST_CARD = {
  bank: "NCB",
  number: "9704198526191432198",
  holder: "NGUYEN VAN A",
  // Ngày phát hành, dạng MM/YY
  issueDate: "07/15",
  otp: "123456",
} as const;
