import { Icon } from "@/components/ui/Icon";
import { PORTAL_CARD, PORTAL_TEXT_LINK } from "@/constants/classNames";
import { attachmentName } from "@/services/fileService";
import { formatDateTime, formatScore, homeworkPhase } from "@/utils/homework";
import type { HomeworkInfoProps } from "@/interfaces/homework";

// Khung thông tin của một bài tập: giờ mở, hạn nộp, mật khẩu, nộp trễ, điểm tối đa và đề bài.
// Dùng chung cho trang của gia sư và học viên.
export function HomeworkInfo({ homework, now }: HomeworkInfoProps) {
  const phase = homeworkPhase(homework, now);
  const questionCount = homework.questions?.length;

  return (
    <section className={`p-5 sm:p-6 ${PORTAL_CARD}`} aria-label="Thông tin bài tập">
      <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-[14.5px] sm:grid-cols-2">
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-bold text-brand-navy">Mở bài:</dt>
          <dd className="text-brand-ink">{homework.openAt ? formatDateTime(homework.openAt) : "Ngay khi công bố"}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-bold text-brand-navy">Hạn nộp:</dt>
          <dd className={phase === "overdue" ? "font-semibold text-red-700" : "text-brand-ink"}>{formatDateTime(homework.dueAt)}</dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-bold text-brand-navy">Điểm tối đa:</dt>
          <dd className="text-brand-ink">
            {formatScore(homework.maxScore)}
            {questionCount ? ` (${questionCount} câu hỏi)` : ""}
          </dd>
        </div>
        <div className="flex flex-wrap gap-x-2">
          <dt className="font-bold text-brand-navy">Nộp trễ:</dt>
          <dd className="text-brand-ink">
            {homework.allowLateSubmission ? "Được nộp sau hạn (ghi nhận thời gian trễ)" : "Không nhận bài sau hạn"}
          </dd>
        </div>
      </dl>

      <ul className="mt-4 space-y-1.5 border-t border-brand-sandLine pt-4 text-[14.5px] text-brand-ink">
        {homework.passwordProtected && (
          <li className="flex items-start gap-2">
            <Icon name="key" className="mt-px text-[18px] text-brand-orange" />
            Cần mật khẩu do gia sư cung cấp để bắt đầu làm bài.
          </li>
        )}
        {phase === "upcoming" && (
          <li className="flex items-start gap-2">
            <Icon name="schedule" className="mt-px text-[18px] text-brand-navy" />
            Bài chưa mở. Bạn có thể bắt đầu làm từ {homework.openAt && formatDateTime(homework.openAt)}.
          </li>
        )}
        {phase === "overdue" && (
          <li className="flex items-start gap-2">
            <Icon name="alarm" className="mt-px text-[18px] text-red-600" />
            {homework.allowLateSubmission ? "Đã quá hạn nộp. Bài nộp lúc này sẽ bị ghi là nộp trễ." : "Đã quá hạn nộp."}
          </li>
        )}
        {phase === "closed" && (
          <li className="flex items-start gap-2">
            <Icon name="lock" className="mt-px text-[18px] text-brand-navy" />
            Bài tập đã đóng, không nhận thêm bài làm.
          </li>
        )}
      </ul>

      <div className="mt-4 whitespace-pre-line text-[15px] leading-relaxed text-brand-ink">{homework.instructions}</div>
      {homework.resourceUrl && (
        <a
          href={homework.resourceUrl}
          target="_blank"
          rel="noreferrer noopener"
          className={`mt-3 inline-block text-[14.5px] ${PORTAL_TEXT_LINK}`}
        >
          <Icon name="attach_file" className="mr-1 text-[18px]" />
          {attachmentName(homework.resourceUrl)}
        </a>
      )}
    </section>
  );
}
