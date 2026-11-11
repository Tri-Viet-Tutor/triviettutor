import { useRef, useState } from "react";
import { AttachmentLink } from "@/components/ui/AttachmentLink";
import { Icon } from "@/components/ui/Icon";
import { AUTH_ERROR, FOCUS_RING, PORTAL_INPUT, PORTAL_LABEL } from "@/constants/classNames";
import { ATTACHMENT_ACCEPT, MAX_ATTACHMENT_BYTES, attachmentName, isUploadedFile, uploadAttachment } from "@/services/fileService";
import { portalErrorMessage } from "@/utils/errors";
import { attachmentKind } from "@/utils/attachments";
import { validateFile } from "@/utils/validation";

// Đính kèm cho bài tập / bài nộp: tải tệp từ máy lên (PDF, Word, ảnh… tối đa 10 MB) hoặc dán link https.
// Giá trị là một đường dẫn duy nhất (resourceUrl).
export function AttachmentField({
  id,
  label,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Kiểm tra file vừa chọn rồi tải lên làm tài liệu đính kèm
  async function pick(file: File | undefined) {
    if (!file) return;
    const fileError = validateFile(file, { maxBytes: MAX_ATTACHMENT_BYTES, sizeLabel: "10 MB" });
    if (fileError) return setError(fileError);
    setError(null);
    setUploading(true);
    try {
      const uploaded = await uploadAttachment(file);
      onChange(uploaded.url);
    } catch (failure) {
      setError(portalErrorMessage(failure, "Chưa tải được tệp lên. Kiểm tra loại tệp (PDF, Word, Excel, ảnh, zip…) rồi thử lại."));
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <label htmlFor={id} className={PORTAL_LABEL}>
        {label}
      </label>
      {value && isUploadedFile(value) ? (
        <div className="flex items-center gap-2 rounded-xl border border-brand-sandLine bg-white px-3 py-2">
          <Icon name="description" className="text-[20px] text-brand-navy" />
          <a href={value} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-[14px] font-semibold text-brand-navy hover:text-brand-navyDeep">
            {attachmentName(value)}
          </a>
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange("")}
              aria-label="Bỏ tệp đính kèm"
              className={`flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 ${FOCUS_RING}`}
            >
              <Icon name="close" className="text-[18px]" />
            </button>
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            id={id}
            type="url"
            value={value}
            disabled={disabled}
            onChange={(event) => onChange(event.target.value)}
            placeholder="Dán link https://… (ảnh, video, YouTube…) hoặc tải tệp lên"
            className={`${PORTAL_INPUT} min-w-0 flex-1`}
          />
          {!disabled && (
            <>
              <button
                type="button"
                onClick={() => input.current?.click()}
                disabled={uploading}
                className={`inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-brand-navy px-3 text-[13.5px] font-semibold text-brand-navy hover:bg-brand-tint disabled:opacity-50 ${FOCUS_RING}`}
              >
                <Icon name="upload_file" className="text-[18px]" />
                {uploading ? "Đang tải…" : "Tải tệp"}
              </button>
              <input
                ref={input}
                type="file"
                accept={ATTACHMENT_ACCEPT}
                className="hidden"
                onChange={(event) => void pick(event.target.files?.[0])}
              />
            </>
          )}
        </div>
      )}
      {value && !isUploadedFile(value) && attachmentKind(value) !== "file" && (
        <div className="mt-2">
          <AttachmentLink url={value} preview />
        </div>
      )}
      <p className="mt-1 text-[12px] text-brand-muted">PDF, Word, Excel, PowerPoint, ảnh, zip — tối đa 10 MB khi tải lên; dán link thì nhận cả ảnh, video và YouTube.</p>
      {error && <p className={AUTH_ERROR}>{error}</p>}
    </div>
  );
}
