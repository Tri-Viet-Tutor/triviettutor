import { Icon } from "@/components/ui/Icon";
import type { QuestionResponse } from "@/interfaces/homework";

/**
 * Ảnh hoặc video minh họa của một câu hỏi. Ảnh do gia sư tải lên nên hiện thẳng;
 * video là link ngoài nên chỉ mở ở tab mới, không nhúng trình phát của bên thứ ba vào trang.
 */
export function QuestionMedia({ question, index }: { question: QuestionResponse; index: number }) {
  if (!question.mediaUrl) return null;
  if (question.mediaType === "VIDEO") {
    return (
      <a
        href={question.mediaUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-2 inline-flex items-center gap-1.5 text-[14px] font-semibold text-brand-navy underline"
      >
        <Icon name="smart_display" className="text-[19px]" />
        Xem video minh họa
      </a>
    );
  }
  return (
    <img
      src={question.mediaUrl}
      alt={`Minh họa câu ${index + 1}`}
      loading="lazy"
      className="mt-2 max-h-72 rounded-xl border border-brand-sandLine object-contain"
    />
  );
}
