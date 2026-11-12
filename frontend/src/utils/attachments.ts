/**
 * Nhận diện loại tệp/link đính kèm (bài tập, bài nộp) từ resourceUrl để hiện đúng xem trước:
 * ảnh hiện thumbnail, video hiện trình phát, link YouTube nhúng iframe, còn lại chỉ là liên kết.
 * Thuần phía giao diện — không có trường "loại" riêng ở backend (HomeworkRequest từ chối field lạ).
 */
export type AttachmentKind = "image" | "video" | "youtube" | "file";

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg)(\?.*)?$/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogv)(\?.*)?$/i;

/** Link YouTube (xem thường hoặc youtu.be) → URL nhúng iframe, hoặc null nếu không phải YouTube */
export function youtubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = parsed.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname === "/watch") {
        const id = parsed.searchParams.get("v");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      if (parsed.pathname.startsWith("/embed/")) return url;
      if (parsed.pathname.startsWith("/shorts/")) return `https://www.youtube.com/embed/${parsed.pathname.split("/")[2]}`;
    }
  } catch {
    // không phải URL hợp lệ
  }
  return null;
}

/** Loại đính kèm suy ra từ phần mở rộng của URL (ảnh / video) hoặc nền tảng (YouTube), còn lại coi là tệp/link thường */
export function attachmentKind(url: string): AttachmentKind {
  if (youtubeEmbedUrl(url)) return "youtube";
  const path = url.split("?")[0];
  if (IMAGE_EXT.test(path)) return "image";
  if (VIDEO_EXT.test(path)) return "video";
  return "file";
}

export const ATTACHMENT_KIND_LABEL: Record<AttachmentKind, string> = {
  image: "Ảnh",
  video: "Video",
  youtube: "Video (YouTube)",
  file: "Tài liệu",
};

export const ATTACHMENT_KIND_ICON: Record<AttachmentKind, string> = {
  image: "image",
  video: "movie",
  youtube: "smart_display",
  file: "attach_file",
};
