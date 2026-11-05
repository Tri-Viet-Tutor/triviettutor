import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_MORE_LINK } from "@/constants/classNames";
import { ROUTES } from "@/constants/routes";
import { useSessionHomeworks } from "@/hooks/useLearningData";
import type { SessionHomeworkListProps } from "@/interfaces/learning";
import { formatDateTime } from "@/utils/date";

/** Bài tập đã công bố của một buổi học (GET /sessions/{id}/homeworks), kèm lối sang trang Bài tập để làm bài. */
export function SessionHomeworkList({ sessionId }: SessionHomeworkListProps) {
  const homeworks = useSessionHomeworks(sessionId);
  const items = homeworks.data?.content ?? [];
  // Không tải được hoặc buổi không có bài thì không hiện gì, tránh làm rối chi tiết buổi học
  if (homeworks.isPending || homeworks.isError || items.length === 0) return null;

  return (
    <section className="mt-4" aria-label="Bài tập của buổi">
      <h3 className="mb-2 text-[15px] font-bold text-brand-navy">Bài tập</h3>
      <ul className="space-y-1.5 text-[14.5px] text-brand-ink">
        {items.map((homework) => (
          <li key={homework.id} className="flex flex-wrap items-center gap-x-2">
            <Icon name="assignment" className="text-[18px] text-brand-navy" />
            <span className="font-medium">{homework.title}</span>
            <span className="text-brand-muted">- hạn nộp {formatDateTime(new Date(homework.dueAt))}</span>
          </li>
        ))}
      </ul>
      <Link to={ROUTES.studentHomework} className={`${PORTAL_MORE_LINK} mt-2 text-[14px]`}>
        Làm bài tập
        <Icon name="arrow_forward" className="text-[17px]" />
      </Link>
    </section>
  );
}
