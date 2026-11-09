import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING } from "@/constants/classNames";
import { fetchAttachmentBlob } from "@/services/homeworkService";
import { formatFileSize } from "@/utils/homework";
import type { AttachmentListProps, AttachmentResponse } from "@/interfaces/homework";

/** Tải tệp kèm JWT rồi tạo đường dẫn tạm (blob:) để xem; tự thu hồi khi rời trang. */
function useAttachmentUrl(attachmentId: number): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let objectUrl: string | undefined;
    let cancelled = false;
    fetchAttachmentBlob(attachmentId)
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [attachmentId]);
  return url;
}

function AttachmentTile({ attachment, onRemove, removing }: { attachment: AttachmentResponse; onRemove?: () => void; removing: boolean }) {
  const url = useAttachmentUrl(attachment.id);
  const isImage = attachment.contentType.startsWith("image/");

  return (
    <li className="relative w-[132px] overflow-hidden rounded-xl border border-brand-sandLine bg-white">
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Mở ${attachment.fileName}`}
        className={`flex h-[110px] items-center justify-center bg-brand-sand/60 ${FOCUS_RING}`}
      >
        {isImage && url ? (
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icon name={isImage ? "image" : "picture_as_pdf"} className="text-[38px] text-brand-navy/60" />
        )}
      </a>
      <p className="truncate px-2 pt-1.5 text-[12.5px] font-semibold text-brand-ink" title={attachment.fileName}>
        {attachment.fileName}
      </p>
      <p className="px-2 pb-1.5 text-[12px] text-brand-muted">{formatFileSize(attachment.sizeBytes)}</p>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          disabled={removing}
          aria-label={`Xóa ${attachment.fileName}`}
          className={`absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-600 shadow hover:bg-red-50 disabled:opacity-50 ${FOCUS_RING}`}
        >
          <Icon name={removing ? "hourglass_top" : "delete"} className="text-[18px]" />
        </button>
      )}
    </li>
  );
}

/** Lưới ảnh chụp / PDF của bài làm; bấm vào để mở cỡ lớn ở thẻ mới. */
export function AttachmentList({ attachments, onRemove, removingId }: AttachmentListProps) {
  if (attachments.length === 0) return null;
  return (
    <ul className="flex flex-wrap gap-3">
      {attachments.map((attachment) => (
        <AttachmentTile
          key={attachment.id}
          attachment={attachment}
          onRemove={onRemove && (() => onRemove(attachment))}
          removing={removingId === attachment.id}
        />
      ))}
    </ul>
  );
}
