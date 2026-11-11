import { PAYROLL_STATUS } from "@/constants/labels";
import type { PayrollLineResponse } from "@/interfaces/api";

/* Xuất bảng lương ra file CSV mở được bằng Excel (PAYR-02). */

/** Tiêu đề cột của file xuất */
const HEADERS = [
  "Tháng",
  "Mã gia sư",
  "Gia sư",
  "Lương cứng",
  "Thù lao / buổi",
  "Buổi hợp lệ",
  "Buổi hủy",
  "Buổi được dạy thay",
  "Buổi chưa chốt",
  "Thù lao theo buổi",
  "Thực nhận",
  "Trạng thái",
  "Lý do khiếu nại",
];

/** Bọc một ô theo chuẩn CSV; ô bắt đầu bằng = + - @ được thêm ' để Excel không chạy như công thức */
function cell(value: string | number): string {
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Nội dung CSV của các dòng lương (số tiền là số nguyên VND để Excel cộng trừ được) */
export function payrollCsv(lines: PayrollLineResponse[]): string {
  const rows = lines.map((line) => [
    `${String(line.month).padStart(2, "0")}/${line.year}`,
    line.tutorId,
    line.tutorName,
    line.baseSalary,
    line.sessionRate,
    line.validSessions,
    line.cancelledSessions,
    line.substitutedOutSessions,
    line.unfinalizedSessions,
    line.sessionPay,
    line.totalPay,
    PAYROLL_STATUS[line.status].label,
    line.disputeReason ?? "",
  ]);
  return [HEADERS, ...rows].map((row) => row.map(cell).join(",")).join("\r\n");
}

/** Tải file CSV về máy; BOM UTF-8 để Excel hiện đúng tiếng Việt */
export function downloadPayrollCsv(lines: PayrollLineResponse[], fileName: string): void {
  const blob = new Blob(["\uFEFF", payrollCsv(lines)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
