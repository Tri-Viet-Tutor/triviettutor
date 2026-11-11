import { Icon } from "@/components/ui/Icon";
import { PORTAL_BTN_GHOST, PORTAL_BTN_SECONDARY, PORTAL_INPUT, PORTAL_LABEL } from "@/constants/classNames";
import { newQuestionDraft, totalPoints } from "@/utils/homework";
import { ALL_CORRECT_TEXT, withAllCorrectD } from "@/utils/questionImport";
import type { QuestionBuilderProps, QuestionDraft } from "@/interfaces/homework";

const MAX_OPTIONS = 10;
const OPTION_LETTERS = "ABCDEFGHIJ";

/**
 * Soạn danh sách câu hỏi: trắc nghiệm (một hoặc nhiều đáp án đúng, hệ thống tự chấm — câu nhiều đáp án phải chọn
 * đủ và đúng mới có điểm) hoặc tự luận
 * (học viên viết / chụp ảnh bài làm, gia sư chấm). Bài đã công bố thì chỉ xem.
 */
export function QuestionBuilder({ questions, onChange, readOnly = false }: QuestionBuilderProps) {
  /** Sửa một câu theo vị trí */
  function patch(index: number, change: Partial<QuestionDraft>) {
    onChange(questions.map((question, i) => (i === index ? { ...question, ...change } : question)));
  }

  /** Đổi chỗ câu `index` với câu kế bên */
  function move(index: number, offset: -1 | 1) {
    const next = [...questions];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    onChange(next);
  }

  return (
    <div>
      {questions.length > 0 && (
        <ol className="space-y-4">
          {questions.map((question, index) => (
            <li key={question.key} className="rounded-2xl border border-brand-sandLine bg-brand-sand/40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[14.5px] font-bold text-brand-navy">
                  Câu {index + 1} ·{" "}
                  {question.type === "ESSAY"
                    ? "Tự luận"
                    : question.multiple
                      ? `Trắc nghiệm nhiều đáp án (chọn ${question.correctOptions.length})`
                      : "Trắc nghiệm"}
                </p>
                {!readOnly && (
                  <div className="flex items-center">
                    <button
                      type="button"
                      className={PORTAL_BTN_GHOST}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                      aria-label={`Đưa câu ${index + 1} lên`}
                    >
                      <Icon name="arrow_upward" className="text-[18px]" />
                    </button>
                    <button
                      type="button"
                      className={PORTAL_BTN_GHOST}
                      disabled={index === questions.length - 1}
                      onClick={() => move(index, 1)}
                      aria-label={`Đưa câu ${index + 1} xuống`}
                    >
                      <Icon name="arrow_downward" className="text-[18px]" />
                    </button>
                    <button
                      type="button"
                      className={`${PORTAL_BTN_GHOST} text-red-700 hover:bg-red-50`}
                      onClick={() => onChange(questions.filter((_, i) => i !== index))}
                      aria-label={`Xóa câu ${index + 1}`}
                    >
                      <Icon name="delete" className="text-[18px]" />
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_120px]">
                <div>
                  <label htmlFor={`${question.key}-prompt`} className={PORTAL_LABEL}>
                    Nội dung câu hỏi
                  </label>
                  <textarea
                    id={`${question.key}-prompt`}
                    rows={2}
                    maxLength={5000}
                    readOnly={readOnly}
                    value={question.prompt}
                    onChange={(event) => patch(index, { prompt: event.target.value })}
                    className={`${PORTAL_INPUT} h-auto resize-y py-2 leading-relaxed`}
                  />
                </div>
                <div>
                  <label htmlFor={`${question.key}-points`} className={PORTAL_LABEL}>
                    Điểm
                  </label>
                  <input
                    id={`${question.key}-points`}
                    type="number"
                    min="0.01"
                    step="0.01"
                    inputMode="decimal"
                    readOnly={readOnly}
                    value={question.points}
                    onChange={(event) => patch(index, { points: event.target.value })}
                    className={PORTAL_INPUT}
                  />
                </div>
              </div>

              {question.type === "MULTIPLE_CHOICE" && (
                <fieldset className="mt-3" aria-label={`Phương án câu ${index + 1}`}>
                  <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                    <p className={`${PORTAL_LABEL} mb-0`}>
                      {question.multiple
                        ? "Phương án (tích mọi đáp án đúng — học viên phải chọn đủ và đúng mới có điểm)"
                        : "Phương án (chọn nút tròn ở đáp án đúng)"}
                    </p>
                    <label className="flex cursor-pointer items-center gap-2 text-[13.5px] font-semibold text-brand-navy">
                      <input
                        type="checkbox"
                        checked={question.multiple}
                        disabled={readOnly}
                        onChange={(event) =>
                          patch(index, {
                            multiple: event.target.checked,
                            // Tắt nhiều đáp án: giữ lại đáp án đúng đầu tiên
                            correctOptions: event.target.checked ? question.correctOptions : question.correctOptions.slice(0, 1),
                          })
                        }
                        className="h-4 w-4 accent-brand-navy"
                      />
                      Nhiều đáp án đúng
                    </label>
                  </div>
                  <ul className="space-y-2">
                    {question.options.map((option, optionIndex) => {
                      const isCorrect = question.correctOptions.includes(optionIndex);
                      return (
                        <li key={optionIndex} className="flex items-center gap-2">
                          <input
                            type={question.multiple ? "checkbox" : "radio"}
                            name={`${question.key}-correct`}
                            checked={isCorrect}
                            disabled={readOnly}
                            onChange={() =>
                              patch(index, {
                                correctOptions: question.multiple
                                  ? isCorrect
                                    ? question.correctOptions.filter((i) => i !== optionIndex)
                                    : [...question.correctOptions, optionIndex].sort((a, b) => a - b)
                                  : [optionIndex],
                              })
                            }
                            aria-label={`Đáp án đúng là ${OPTION_LETTERS[optionIndex]}`}
                            className="h-4 w-4 shrink-0 accent-emerald-600"
                          />
                          <span className="w-5 shrink-0 text-[14px] font-bold text-brand-muted">{OPTION_LETTERS[optionIndex]}.</span>
                          <input
                            type="text"
                            maxLength={1000}
                            readOnly={readOnly}
                            value={option}
                            placeholder={`Phương án ${OPTION_LETTERS[optionIndex]}`}
                            onChange={(event) =>
                              patch(index, { options: question.options.map((text, i) => (i === optionIndex ? event.target.value : text)) })
                            }
                            className={`${PORTAL_INPUT} ${isCorrect ? "border-emerald-500" : ""}`}
                          />
                          {!readOnly && question.options.length > 2 && (
                            <button
                              type="button"
                              className={PORTAL_BTN_GHOST}
                              aria-label={`Xóa phương án ${OPTION_LETTERS[optionIndex]}`}
                              onClick={() => {
                                // Bỏ phương án bị xóa khỏi đáp án đúng, dời các đáp án phía sau lên một vị trí
                                const shifted = question.correctOptions
                                  .filter((i) => i !== optionIndex)
                                  .map((i) => (i > optionIndex ? i - 1 : i));
                                patch(index, {
                                  options: question.options.filter((_, i) => i !== optionIndex),
                                  correctOptions: shifted.length || question.multiple ? shifted : [0],
                                });
                              }}
                            >
                              <Icon name="close" className="text-[18px]" />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {!readOnly && question.options.length < MAX_OPTIONS && (
                    <button
                      type="button"
                      className={`mt-2 ${PORTAL_BTN_GHOST}`}
                      onClick={() => patch(index, { options: [...question.options, ""] })}
                    >
                      <Icon name="add" className="text-[18px]" />
                      Thêm phương án
                    </button>
                  )}
                  {!readOnly && question.options.length < MAX_OPTIONS && (
                    <button
                      type="button"
                      className={`mt-2 ${PORTAL_BTN_GHOST}`}
                      onClick={() => onChange(questions.map((q, i) => (i === index ? withAllCorrectD(q) : q)))}
                    >
                      <Icon name="done_all" className="text-[18px]" />D = “{ALL_CORRECT_TEXT}”
                    </button>
                  )}
                </fieldset>
              )}
              {question.type === "ESSAY" && (
                <p className="mt-2 text-[13.5px] text-brand-muted">
                  Học viên viết câu trả lời hoặc chụp ảnh bài làm gửi kèm; bạn chấm điểm câu này sau khi nộp.
                </p>
              )}
            </li>
          ))}
        </ol>
      )}

      {!readOnly && (
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={PORTAL_BTN_SECONDARY}
            onClick={() => onChange([...questions, newQuestionDraft("MULTIPLE_CHOICE")])}
          >
            <Icon name="radio_button_checked" className="text-[18px]" />
            Thêm câu trắc nghiệm
          </button>
          <button type="button" className={PORTAL_BTN_SECONDARY} onClick={() => onChange([...questions, newQuestionDraft("ESSAY")])}>
            <Icon name="edit_note" className="text-[18px]" />
            Thêm câu tự luận
          </button>
        </div>
      )}
      {questions.length > 0 && <p className="mt-3 text-[14px] font-semibold text-brand-navy">Tổng điểm: {totalPoints(questions)}</p>}
    </div>
  );
}
