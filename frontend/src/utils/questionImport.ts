import type { QuestionDraft, QuestionImportResponse } from "@/interfaces/homework";
import { newQuestionDraft } from "@/utils/homework";

/* Nhập câu hỏi từ file và mẫu đáp án D (HW-02). */

/** Câu chữ chuẩn của đáp án D */
export const ALL_CORRECT_TEXT = "Tất cả các đáp án trên đều đúng";

/** Bỏ dấu tiếng Việt, chữ thường, gom khoảng trắng — để so câu chữ */
function plain(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Phương án có phải "Tất cả các đáp án trên đều đúng" (cùng quy tắc với backend) */
export function isAllCorrect(text: string): boolean {
  const p = plain(text);
  return p.includes("all of the above") || (p.includes("tat ca") && (p.includes("dung") || p.includes("tren")));
}

/**
 * Đặt D = "Tất cả các đáp án trên đều đúng" và chọn D là đáp án đúng.
 * Thiếu thì thêm cho đủ A–C; D đang có nội dung khác thì chèn vào vị trí D, các phương án sau lùi xuống.
 */
export function withAllCorrectD(draft: QuestionDraft): QuestionDraft {
  const options = [...draft.options];
  while (options.length < 3) options.push("");
  if (options.length === 3 || !options[3].trim()) options[3] = ALL_CORRECT_TEXT;
  else if (!isAllCorrect(options[3])) options.splice(3, 0, ALL_CORRECT_TEXT);
  return { ...draft, options: options.slice(0, 10), correctOption: 3 };
}

/** Câu hỏi backend đọc từ file → câu hỏi đang soạn trong form */
export function importedToDrafts(questions: QuestionImportResponse["questions"]): QuestionDraft[] {
  return questions.map((question) => ({
    ...newQuestionDraft(question.type),
    prompt: question.prompt,
    options: question.type === "MULTIPLE_CHOICE" ? (question.options ?? []) : [],
    correctOption: question.correctOption ?? 0,
    points: String(question.points),
  }));
}

/** Nội dung file mẫu: dòng tiêu đề + ví dụ (có câu D tự nhận đáp án và câu tự luận) */
const TEMPLATE_ROWS = [
  ["cau_hoi", "loai", "A", "B", "C", "D", "dap_an", "diem", "publish_time"],
  ["2 + 3 bằng bao nhiêu?", "trắc nghiệm", "4", "5", "6", "7", "B", "1", "2026-12-01 19:30"],
  ["Số nào là số chẵn?", "trắc nghiệm", "2", "4", "6", ALL_CORRECT_TEXT, "", "1", ""],
  ["Trình bày cách giải phương trình bậc nhất.", "tự luận", "", "", "", "", "", "2", ""],
];

/** Tải file mẫu CSV (BOM UTF-8 để Excel hiện đúng tiếng Việt) */
export function downloadQuestionTemplate(): void {
  const csv = TEMPLATE_ROWS.map((row) =>
    row.map((cell) => (/[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell)).join(","),
  ).join("\r\n");
  saveBlob(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }), "mau-cau-hoi.csv");
}

/** L\u01B0u m\u1ED9t Blob v\u1EC1 m\u00E1y v\u1EDBi t\u00EAn file cho tr\u01B0\u1EDBc (t\u1EA3i xu\u1ED1ng, kh\u00F4ng m\u1EDF trang m\u1EDBi) */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
