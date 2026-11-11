import { AttachmentField } from "@/components/ui/AttachmentField";
import { AttachmentLink } from "@/components/ui/AttachmentLink";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING, PORTAL_INPUT, PORTAL_LABEL } from "@/constants/classNames";
import type { HomeworkQuestionRequest, HomeworkQuestionResponse, QuestionMediaType } from "@/interfaces/api";
import { attachmentKind } from "@/utils/attachments";

/** Một câu hỏi đang soạn trong form tạo bài tập (HW-01) */
export interface DraftQuestion {
  text: string;
  mediaUrl: string;
}

/** "ảnh"/"video" từ URL; null nếu link không nhận ra là ảnh hay video (ví dụ PDF, trang web thường) */
function mediaTypeOf(url: string): QuestionMediaType | null {
  const kind = attachmentKind(url);
  if (kind === "image") return "IMAGE";
  if (kind === "video" || kind === "youtube") return "VIDEO";
  return null;
}

/** Chuyển các câu hỏi đang soạn (bỏ câu rỗng) sang payload gửi lên khi tạo bài tập */
export function draftQuestionsToRequest(drafts: DraftQuestion[]): HomeworkQuestionRequest[] {
  return drafts
    .filter((question) => question.text.trim())
    .map((question) => {
      const mediaUrl = question.mediaUrl.trim();
      const mediaType = mediaUrl ? mediaTypeOf(mediaUrl) ?? undefined : undefined;
      return { text: question.text.trim(), mediaUrl: mediaUrl || undefined, mediaType };
    });
}

/**
 * Soạn bảng câu hỏi khi tạo bài tập: mỗi câu một đề bài nhỏ + ảnh/video minh họa riêng (tải lên hoặc dán link,
 * kể cả YouTube). Không bắt buộc — bài tập có thể chỉ dùng "Đề bài / yêu cầu" chung như trước, không cần câu hỏi nào.
 */
export function HomeworkQuestionEditor({
  questions,
  onChange,
}: {
  questions: DraftQuestion[];
  onChange: (next: DraftQuestion[]) => void;
}) {
  function update(index: number, patch: Partial<DraftQuestion>) {
    onChange(questions.map((question, i) => (i === index ? { ...question, ...patch } : question)));
  }
  function remove(index: number) {
    onChange(questions.filter((_, i) => i !== index));
  }
  function add() {
    onChange([...questions, { text: "", mediaUrl: "" }]);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className={PORTAL_LABEL}>Câu hỏi (không bắt buộc)</span>
        <button
          type="button"
          onClick={add}
          className={`inline-flex h-8 items-center gap-1 rounded-lg border border-brand-navy px-2.5 text-[12.5px] font-semibold text-brand-navy hover:bg-brand-tint ${FOCUS_RING}`}
        >
          <Icon name="add" className="text-[16px]" />
          Thêm câu hỏi
        </button>
      </div>

      {questions.length === 0 && (
        <p className="text-[12.5px] text-brand-muted">
          Chưa có câu hỏi nào — bài tập sẽ chỉ dùng phần "Đề bài / yêu cầu" chung ở trên.
        </p>
      )}

      {questions.map((question, index) => {
        const mediaUrl = question.mediaUrl.trim();
        const unrecognized = mediaUrl.length > 0 && mediaTypeOf(mediaUrl) === null;
        return (
          <div key={index} className="space-y-2 rounded-xl border border-brand-sandLine bg-white p-3">
            <div className="flex items-start gap-2">
              <span className="mt-2 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-tint text-[12px] font-bold text-brand-navy">
                {index + 1}
              </span>
              <textarea
                aria-label={`Nội dung câu hỏi ${index + 1}`}
                value={question.text}
                onChange={(event) => update(index, { text: event.target.value })}
                rows={2}
                placeholder="Nội dung câu hỏi"
                className={`${PORTAL_INPUT} h-auto flex-1 py-2 leading-relaxed`}
              />
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label="Xóa câu hỏi"
                className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 ${FOCUS_RING}`}
              >
                <Icon name="close" className="text-[18px]" />
              </button>
            </div>
            <div className="pl-8">
              <AttachmentField
                id={`question-media-${index}`}
                label="Ảnh / video minh họa cho câu hỏi này"
                value={question.mediaUrl}
                onChange={(value) => update(index, { mediaUrl: value })}
              />
              {unrecognized && (
                <p className="mt-1 text-[12px] text-amber-700">
                  Chưa nhận diện được đây là ảnh hay video — thử dán link trực tiếp tới ảnh/video, hoặc tải ảnh lên.
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Hiện bảng câu hỏi đã giao (chỉ xem): nội dung + ảnh/video minh họa từng câu */
export function HomeworkQuestionList({ questions }: { questions: HomeworkQuestionResponse[] }) {
  if (questions.length === 0) return null;
  return (
    <ol className="space-y-2.5">
      {questions.map((question) => (
        <li key={question.id} className="rounded-xl border border-brand-sandLine bg-brand-sand/20 p-3">
          <p className="flex gap-2 text-[13.5px] text-brand-ink">
            <span className="shrink-0 font-bold text-brand-navy">{question.order + 1}.</span>
            <span className="whitespace-pre-line">{question.text}</span>
          </p>
          {question.mediaUrl && (
            <div className="mt-2 pl-5">
              <AttachmentLink url={question.mediaUrl} preview />
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}
