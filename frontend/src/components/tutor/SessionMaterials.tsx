import { useQuery } from "@tanstack/react-query";
import { AttachmentLink } from "@/components/ui/AttachmentLink";
import { listSessionHomeworks } from "@/services/homeworkService";
import { portalErrorMessage } from "@/utils/errors";

/**
 * Tab "Tài liệu" của một buổi: các file / link tài liệu đính kèm theo từng bài tập của buổi này
 * (ô "File / link tài liệu" khi giao bài) — ảnh và video hiện xem trước ngay, YouTube nhúng trình phát.
 * Dùng chung dữ liệu bài tập với tab "Bài tập" (cùng khoá truy vấn).
 */
export function SessionMaterials({ sessionId }: { sessionId: number }) {
  const homeworks = useQuery({ queryKey: ["session-homeworks", sessionId], queryFn: () => listSessionHomeworks(sessionId) });
  const items = (homeworks.data?.content ?? []).filter((homework) => homework.resourceUrl);

  if (homeworks.isPending) return <p className="text-[13.5px] text-brand-muted">Đang tải tài liệu…</p>;
  if (homeworks.isError)
    return <p className="text-[13.5px] text-brand-muted">{portalErrorMessage(homeworks.error, "Không tải được tài liệu.")}</p>;
  if (items.length === 0)
    return <p className="text-[13.5px] text-brand-muted">Buổi này chưa có tài liệu đính kèm nào (thêm khi giao bài tập ở tab Bài tập).</p>;

  return (
    <ul className="space-y-3">
      {items.map((homework) => (
        <li key={homework.id} className="rounded-xl border border-brand-sandLine bg-white px-3.5 py-3">
          <p className="mb-1.5 truncate text-[14px] font-semibold text-brand-ink">{homework.title}</p>
          <AttachmentLink url={homework.resourceUrl ?? ""} preview />
        </li>
      ))}
    </ul>
  );
}
