import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_BTN_GHOST, PORTAL_BTN_SECONDARY } from "@/constants/classNames";
import type { QuestionImportProps, QuestionImportResponse } from "@/interfaces/homework";
import { fetchQuestionTemplate, importQuestions } from "@/services/homeworkService";
import { portalErrorMessage } from "@/utils/errors";
import { downloadQuestionTemplate, importedToDrafts, saveBlob } from "@/utils/questionImport";

/** Số lỗi tối đa hiện ra (file lỗi nhiều thì chỉ cần sửa dần) */
const MAX_SHOWN_ERRORS = 15;

/** Các loại file mẫu: Word / Excel do backend tạo, CSV tạo ngay trên trình duyệt */
const TEMPLATES = [
  { format: "docx", label: "Mẫu Word (.docx)", hint: "Gõ như đề thi: Câu 1, A. B. C. D., Đáp án", icon: "description" },
  { format: "xlsx", label: "Mẫu Excel (.xlsx)", hint: "Mỗi dòng một câu hỏi", icon: "table_view" },
  { format: "csv", label: "Mẫu CSV (.csv)", hint: "Bảng tính dạng chữ, mở được bằng mọi phần mềm", icon: "csv" },
] as const;

/**
 * Nhập câu hỏi trắc nghiệm / tự luận từ file Word, Excel hoặc CSV (HW-02). Backend chỉ đọc file, câu hỏi được đưa vào form
 * để gia sư xem lại rồi lưu như bình thường; giờ mở bài trong file điền vào giờ mở bài.
 * API: POST /homeworks/questions/import, GET /homeworks/questions/template/{xlsx|docx}.
 */
export function QuestionImport({ hasQuestions, onImport }: QuestionImportProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const template = useMutation({
    mutationFn: async (format: (typeof TEMPLATES)[number]["format"]) => {
      if (format === "csv") return downloadQuestionTemplate();
      saveBlob(await fetchQuestionTemplate(format), `mau-cau-hoi.${format}`);
    },
    onSuccess: () => setMenuOpen(false),
  });
  // Kết quả đọc file đang chờ gia sư chọn thay thế / thêm vào cuối
  const [pending, setPending] = useState<QuestionImportResponse | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const read = useMutation({
    mutationFn: importQuestions,
    onSuccess: (result) => {
      setDone(null);
      if (result.errors.length > 0) return setPending(result);
      if (hasQuestions) return setPending(result);
      apply(result, "replace");
    },
  });

  function apply(result: QuestionImportResponse, mode: "replace" | "append") {
    onImport(importedToDrafts(result.questions), result.publishTime, mode);
    setPending(null);
    const detected = result.questions.filter((question) => question.answerDetected).length;
    setDone(
      `Đã nhập ${result.questions.length} câu hỏi${detected ? `, ${detected} câu tự nhận đáp án “Tất cả các đáp án trên đều đúng”` : ""}` +
        (result.publishTime
          ? `. Giờ mở bài: ${new Date(result.publishTime).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}.`
          : "."),
    );
  }

  const errors = pending?.errors ?? [];

  return (
    <div className="mb-4 rounded-2xl border border-dashed border-brand-sandLine bg-brand-sand/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <label className={`${PORTAL_BTN_SECONDARY} cursor-pointer ${read.isPending ? "pointer-events-none opacity-60" : ""}`}>
          <Icon name="upload_file" className="text-[18px]" />
          {read.isPending ? "Đang đọc file…" : "Nhập từ Word / Excel"}
          <input
            type="file"
            accept=".docx,.doc,.xlsx,.xls,.csv"
            className="sr-only"
            disabled={read.isPending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) read.mutate(file);
            }}
          />
        </label>
        <div
          className="relative"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) setMenuOpen(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setMenuOpen(false);
          }}
        >
          <button
            type="button"
            className={PORTAL_BTN_GHOST}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <Icon name="download" className="text-[18px]" />
            Tải file mẫu
            <Icon name="expand_more" className={`text-[18px] transition-transform ${menuOpen ? "rotate-180" : ""}`} />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute left-0 top-full z-20 mt-1 w-72 rounded-xl border border-brand-sandLine bg-white p-1 shadow-[0_14px_34px_-18px_rgba(11,58,140,0.45)]"
            >
              {TEMPLATES.map((item) => (
                <button
                  key={item.format}
                  type="button"
                  role="menuitem"
                  disabled={template.isPending}
                  onClick={() => template.mutate(item.format)}
                  className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left transition-colors hover:bg-brand-tint disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-navy"
                >
                  <Icon name={item.icon} className="mt-0.5 text-[20px] text-brand-navy" />
                  <span>
                    <span className="block text-[14px] font-semibold text-brand-ink">
                      {template.isPending && template.variables === item.format ? "Đang tải…" : item.label}
                    </span>
                    <span className="block text-[12.5px] text-brand-muted">{item.hint}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-brand-muted">
        <strong className="font-semibold">Word:</strong> mỗi câu bắt đầu bằng “Câu 1:”, có thể ghi “(tự luận, 2 điểm)”; phương án “A. …”;
        đáp án “Đáp án: B” hoặc đánh dấu “*B.”. <strong className="font-semibold">Excel/CSV:</strong> mỗi dòng một câu với các cột cau_hoi,
        loai, A–D, dap_an, diem, publish_time. Để trống đáp án nếu có phương án “Tất cả các đáp án trên đều đúng”, hệ thống tự chọn phương
        án đó. Câu nhiều đáp án đúng ghi “A, C” (hoặc đánh dấu “*” ở từng đáp án) — học viên phải chọn đủ và đúng mới có điểm.
      </p>

      {template.error && (
        <div className="mt-3">
          <AuthNotice tone="error">{portalErrorMessage(template.error, "Chưa tải được file mẫu. Vui lòng thử lại.")}</AuthNotice>
        </div>
      )}
      {read.error && (
        <div className="mt-3">
          <AuthNotice tone="error">
            {portalErrorMessage(read.error, "Không đọc được file. Hãy dùng file mẫu Word (.docx), Excel (.xlsx) hoặc .csv.")}
          </AuthNotice>
        </div>
      )}
      {done && (
        <div className="mt-3">
          <AuthNotice tone="success">{done}</AuthNotice>
        </div>
      )}
      {errors.length > 0 && (
        <div role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-[13.5px] text-red-800">
          <p className="font-semibold">File có {errors.length} lỗi, chưa nhập câu nào. Sửa file rồi nhập lại:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {errors.slice(0, MAX_SHOWN_ERRORS).map((error) => (
              <li key={`${error.row}-${error.message}`}>
                {error.label ?? `Dòng ${error.row}`}: {error.message}
              </li>
            ))}
          </ul>
          {errors.length > MAX_SHOWN_ERRORS && <p className="mt-1">…và {errors.length - MAX_SHOWN_ERRORS} lỗi khác.</p>}
        </div>
      )}
      {pending && errors.length === 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 text-[14px]">
          <span className="font-semibold text-brand-ink">Đọc được {pending.questions.length} câu. Form đang có câu hỏi:</span>
          <button type="button" className={PORTAL_BTN_SECONDARY} onClick={() => apply(pending, "replace")}>
            Thay thế
          </button>
          <button type="button" className={PORTAL_BTN_SECONDARY} onClick={() => apply(pending, "append")}>
            Thêm vào cuối
          </button>
          <button type="button" className={PORTAL_BTN_GHOST} onClick={() => setPending(null)}>
            Hủy
          </button>
        </div>
      )}
    </div>
  );
}
