import { Icon } from "@/components/ui/Icon";
import { PORTAL_TEXT_LINK } from "@/constants/classNames";
import { attachmentName } from "@/services/fileService";
import { ATTACHMENT_KIND_ICON, ATTACHMENT_KIND_LABEL, attachmentKind, youtubeEmbedUrl } from "@/utils/attachments";

/**
 * Hiện một đính kèm (resourceUrl của bài tập / bài nộp): tên + nhãn loại (Ảnh / Video / Tài liệu),
 * kèm xem trước — ảnh hiện thumbnail, video/YouTube hiện trình phát ngay dưới liên kết.
 */
export function AttachmentLink({ url, preview = false }: { url: string; preview?: boolean }) {
  const kind = attachmentKind(url);
  const embed = kind === "youtube" ? youtubeEmbedUrl(url) : null;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <a href={url} target="_blank" rel="noreferrer" className={`${PORTAL_TEXT_LINK} inline-flex items-center gap-1 text-[13.5px]`}>
          <Icon name={ATTACHMENT_KIND_ICON[kind]} className="text-[16px]" />
          {attachmentName(url)}
        </a>
        <span className="rounded-full bg-brand-tint px-1.5 py-0.5 text-[10.5px] font-bold text-brand-navy">{ATTACHMENT_KIND_LABEL[kind]}</span>
      </div>
      {preview && kind === "image" && (
        <img
          src={url}
          alt=""
          loading="lazy"
          className="max-h-56 w-full rounded-lg border border-brand-sandLine bg-brand-sand/30 object-contain"
        />
      )}
      {preview && kind === "video" && (
        <video src={url} controls preload="metadata" className="max-h-56 w-full rounded-lg border border-brand-sandLine bg-black" />
      )}
      {preview && kind === "youtube" && embed && (
        <iframe
          src={embed}
          title={attachmentName(url)}
          allowFullScreen
          className="aspect-video w-full rounded-lg border border-brand-sandLine"
        />
      )}
    </div>
  );
}
