import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_BTN_GHOST, PORTAL_BTN_SECONDARY } from "@/constants/classNames";
import type { QuestionImportProps, QuestionImportResponse } from "@/interfaces/homework";
import { importQuestions } from "@/services/homeworkService";
import { portalErrorMessage } from "@/utils/errors";
import { downloadQuestionTemplate, importedToDrafts } from "@/utils/questionImport";

/** Số lỗi tối đa hiện ra (file lỗi nhiều thì chỉ cần sửa dần) */
const MAX_SHOWN_ERRORS = 15;

/**
 * Nhập câu hỏi trắc nghiệm / tự luận từ file Excel hoặc CSV (HW-02). Backend chỉ đọc file, câu hỏi được đưa vào form
 * để gia sư xem lại rồi lưu như bình thường; cột publish_time điền vào giờ mở bài.
 * API: POST /homeworks/questions/import.
 */
export function QuestionImport({ hasQuestions, onImport }: QuestionImportProps) {
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
          {read.isPending ? "Đang đọc file…" : "Nhập từ Excel/CSV"}
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="sr-only"
            disabled={read.isPending}
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) read.mutate(file);
            }}
          />
        </label>
        <button type="button" className={PORTAL_BTN_GHOST} onClick={downloadQuestionTemplate}>
          <Icon name="download" className="text-[18px]" />
          Tải file mẫu
        </button>
      </div>
      <p className="mt-2 text-[13px] leading-relaxed text-brand-muted">
        Mỗi dòng một câu: cau_hoi, loai, A–D, dap_an, diem, publish_time (giờ mở bài). Để trống dap_an nếu phương án là “Tất cả các đáp án
        trên đều đúng”, hệ thống tự chọn phương án đó.
      </p>

      {read.error && (
        <div className="mt-3">
          <AuthNotice tone="error">{portalErrorMessage(read.error, "Không đọc được file. Hãy dùng file mẫu .csv hoặc .xlsx.")}</AuthNotice>
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
                Dòng {error.row}: {error.message}
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
