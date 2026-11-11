import type { HomeworkResponse, QuestionDraft, QuestionInput, QuestionResponse } from "@/interfaces/homework";
import { formatClockTime, formatDate, weekdayName } from "@/utils/date";

// Các hàm dùng chung cho bài tập: hiển thị giờ, thời lượng trễ, câu hỏi đang soạn, ảnh chụp bài làm.

// "Thứ Sáu, 12/06/2026, 09:55" theo giờ máy người xem
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${weekdayName(date)}, ${formatDate(date)}, ${formatClockTime(date)}`;
}

// Thời lượng kiểu "1 ngày 2 giờ 5 phút"; dưới một phút ghi "dưới 1 phút"
export function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const parts = [days && `${days} ngày`, hours && `${hours} giờ`, minutes && `${minutes} phút`].filter(Boolean);
  return parts.length ? parts.join(" ") : "dưới 1 phút";
}

// Điểm gọn: 8 thay vì 8.00, 7.5 giữ nguyên
export function formatScore(value: number): string {
  return String(Number(value.toFixed(2)));
}

// ISO → giá trị cho ô <input type="datetime-local"> (giờ máy người xem)
export function toLocalInput(iso?: string): string {
  if (!iso) return "";
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

// Giá trị ô datetime-local → ISO có múi giờ; ô trống → undefined
export function fromLocalInput(value: string): string | undefined {
  return value ? new Date(value).toISOString() : undefined;
}

// Học viên đang ở giai đoạn nào của bài: chưa mở, đang mở, đã quá hạn (vẫn có thể nộp trễ) hay đã đóng
export function homeworkPhase(homework: HomeworkResponse, now: Date): "upcoming" | "open" | "overdue" | "closed" {
  if (homework.status === "CLOSED") return "closed";
  if (homework.openAt && new Date(homework.openAt).getTime() > now.getTime()) return "upcoming";
  return new Date(homework.dueAt).getTime() > now.getTime() ? "open" : "overdue";
}

// Học viên còn bắt đầu / sửa / nộp bài được không
export function acceptsWork(homework: HomeworkResponse, now: Date): boolean {
  const phase = homeworkPhase(homework, now);
  return phase === "open" || (phase === "overdue" && homework.allowLateSubmission);
}

let draftKey = 0;

// Câu hỏi trống mới để gia sư soạn
export function newQuestionDraft(type: QuestionDraft["type"]): QuestionDraft {
  draftKey += 1;
  return {
    key: `q${draftKey}`,
    type,
    prompt: "",
    options: type === "MULTIPLE_CHOICE" ? ["", "", "", ""] : [],
    correctOptions: [0],
    multiple: false,
    points: "1",
    mediaUrl: "",
    mediaType: null,
  };
}

// Câu hỏi đã lưu → câu hỏi đang soạn
export function toQuestionDrafts(questions: QuestionResponse[] = []): QuestionDraft[] {
  return questions.map((question) => {
    const correct = question.correctOptions ?? (question.correctOption !== undefined ? [question.correctOption] : [0]);
    return {
      ...newQuestionDraft(question.type),
      prompt: question.prompt,
      options: question.options ?? [],
      correctOptions: correct,
      multiple: correct.length > 1,
      points: String(question.points),
      mediaUrl: question.mediaUrl ?? "",
      mediaType: question.mediaType ?? null,
    };
  });
}

// Câu hỏi đang soạn → dữ liệu gửi backend (bỏ các phương án để trống, dời đáp án đúng theo)
export function toQuestionInputs(drafts: QuestionDraft[]): QuestionInput[] {
  return drafts.map((draft) => {
    const points = Number(draft.points);
    // Ảnh/video chỉ gửi khi có đủ cả link lẫn loại, vì backend bắt đi theo cặp
    const url = draft.mediaUrl.trim();
    const media = url && draft.mediaType ? { mediaUrl: url, mediaType: draft.mediaType } : {};
    if (draft.type === "ESSAY") return { type: "ESSAY", prompt: draft.prompt.trim(), points, ...media };
    const kept = draft.options.map((text, index) => ({ text: text.trim(), index })).filter((option) => option.text);
    const correct = kept
      .map((option, newIndex) => (draft.correctOptions.includes(option.index) ? newIndex : -1))
      .filter((index) => index >= 0);
    const correctOptions = correct.length ? correct : [0];
    return {
      type: "MULTIPLE_CHOICE",
      prompt: draft.prompt.trim(),
      options: kept.map((option) => option.text),
      correctOption: correctOptions[0],
      ...(correctOptions.length > 1 ? { correctOptions } : {}),
      points,
      ...media,
    };
  });
}

// Các phương án học viên đã chọn (bài làm cũ chỉ có selectedOption)
export function pickedOptions(answer?: { selectedOption?: number; selectedOptions?: number[] }): number[] {
  if (answer?.selectedOptions?.length) return [...answer.selectedOptions].sort((a, b) => a - b);
  return answer?.selectedOption !== undefined ? [answer.selectedOption] : [];
}

// Các đáp án đúng của câu (gia sư mới nhận được)
export function correctOptionsOf(question: QuestionResponse): number[] {
  if (question.correctOptions?.length) return [...question.correctOptions].sort((a, b) => a - b);
  return question.correctOption !== undefined ? [question.correctOption] : [];
}

// Hai tập phương án giống hệt nhau (đã sắp xếp)
export function sameOptions(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

const LETTERS = "ABCDEFGHIJ";

// [0, 2] → "A, C"
export function optionLetters(indexes: number[]): string {
  return indexes.map((index) => LETTERS[index]).join(", ");
}

// Lỗi đầu tiên của bộ câu hỏi (để báo trước khi gửi), hoặc null nếu hợp lệ
export function questionDraftError(drafts: QuestionDraft[]): string | null {
  for (const [index, draft] of drafts.entries()) {
    const label = `Câu ${index + 1}`;
    if (!draft.prompt.trim()) return `${label}: chưa có nội dung câu hỏi.`;
    const points = Number(draft.points);
    if (!Number.isFinite(points) || points <= 0) return `${label}: điểm phải lớn hơn 0.`;
    if (draft.type === "MULTIPLE_CHOICE") {
      const filled = draft.options.filter((option) => option.trim()).length;
      if (filled < 2) return `${label}: cần ít nhất 2 phương án.`;
      const correct = draft.correctOptions.filter((index) => draft.options[index]?.trim());
      if (correct.length !== draft.correctOptions.length || correct.length === 0)
        return `${label}: hãy chọn đáp án đúng là phương án có nội dung.`;
      if (draft.multiple && correct.length < 2) return `${label}: câu nhiều đáp án cần chọn ít nhất 2 đáp án đúng.`;
    }
  }
  const total = totalPoints(drafts);
  if (total > MAX_QUIZ_TOTAL)
    return `Tổng điểm các câu đang là ${total}, tối đa ${MAX_QUIZ_TOTAL}. Bấm “Chia đều ${MAX_QUIZ_TOTAL} điểm” hoặc giảm điểm từng câu.`;
  return null;
}

// Bài có câu hỏi chấm theo thang 10: tổng điểm các câu tối đa 10 (backend cũng chặn)
export const MAX_QUIZ_TOTAL = 10;

// Chia đều `total` điểm cho các câu, tính theo phần trăm điểm (0,01) để tổng đúng bằng `total`:
// 61 câu → 37 câu 0,16 điểm và 24 câu 0,17 điểm (các câu đầu nhận phần dư).
export function distributePoints<T extends { points: string }>(drafts: T[], total = MAX_QUIZ_TOTAL): T[] {
  if (drafts.length === 0) return drafts;
  const cents = Math.round(total * 100);
  const base = Math.floor(cents / drafts.length);
  const extra = cents - base * drafts.length;
  return drafts.map((draft, index) => ({ ...draft, points: String((base + (index < extra ? 1 : 0)) / 100) }));
}

// Tổng điểm các câu (làm tròn 2 chữ số như backend)
export function totalPoints(drafts: { points: string | number }[]): number {
  return Math.round(drafts.reduce((sum, draft) => sum + (Number(draft.points) || 0), 0) * 100) / 100;
}

// Ảnh lớn hơn mức này thì thu nhỏ trước khi gửi để điện thoại tải lên nhanh
const COMPRESS_ABOVE_BYTES = 1.5 * 1024 * 1024;
const MAX_IMAGE_SIDE = 2000;
const NATIVE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

// Chuẩn bị tệp trước khi gửi: PDF và ảnh nhỏ giữ nguyên; ảnh lớn hoặc định dạng khác (HEIC của iPhone…)
// vẽ lại thành JPEG cạnh dài tối đa 2000px. Trình duyệt không đọc được ảnh thì gửi nguyên tệp để backend báo lỗi.
export async function prepareUpload(file: File): Promise<{ blob: Blob; name: string }> {
  const native = NATIVE_TYPES.includes(file.type);
  if (!file.type.startsWith("image/") || (native && file.size <= COMPRESS_ABOVE_BYTES)) return { blob: file, name: file.name };
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
    if (!blob) return { blob: file, name: file.name };
    return { blob, name: file.name.replace(/\.[^.]+$/, "") + ".jpg" };
  } catch {
    return { blob: file, name: file.name };
  }
}

// Kích thước tệp dễ đọc: 820 KB, 2,4 MB
export function formatFileSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}
