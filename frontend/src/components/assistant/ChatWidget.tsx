import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { AntMascot } from "@/components/dashboard/AntMascot";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING } from "@/constants/classNames";
import { apiErrorMessage } from "@/services/api";
import { askAssistant, type AssistantTurn } from "@/services/assistantService";
import { useAuthStore } from "@/stores/authStore";

/** Giới hạn độ dài câu hỏi, khớp với backend */
const MAX_MESSAGE = 500;

const ERROR_TEXT = {
  ASSISTANT_RATE_LIMITED: "Bạn đã hỏi quá nhiều trong thời gian ngắn hoặc hết lượt hôm nay. Vui lòng thử lại sau.",
  ASSISTANT_UNAVAILABLE: "Trợ lý tạm thời chưa sẵn sàng. Vui lòng thử lại sau hoặc liên hệ trung tâm.",
  VALIDATION_ERROR: "Câu hỏi chưa hợp lệ (tối đa 500 ký tự).",
};

const SUGGESTIONS = ["Có những lớp nào đang mở?", "Học phí lớp Toán 11 bao nhiêu?", "Quy định nghỉ học và học bù thế nào?"];

/**
 * Khung chat nổi hỏi trợ lý AI về khóa học, lớp đang mở, học phí, quy định nghỉ/học bù.
 * Đã đăng nhập thì hỏi được lịch học của chính mình. Hội thoại chỉ giữ trong lúc mở trang.
 * placement: "public" nằm góc trái (góc phải có nút lên đầu trang); "portal" nằm góc phải, trên thanh điều hướng điện thoại.
 */
export function ChatWidget({ placement }: { placement: "public" | "portal" }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<AssistantTurn[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const ask = useMutation({
    mutationFn: (message: string) => askAssistant(message, turns),
    onSuccess: (result) => {
      setTurns((current) => [...current, { role: "assistant", text: result.reply }]);
      setRemaining(result.remainingToday);
    },
  });

  // Đổi tài khoản thì xóa hội thoại cũ để không lộ lịch của người trước
  useEffect(() => {
    setTurns([]);
    setRemaining(null);
  }, [isAuthenticated]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [turns, ask.isPending, open]);

  function send(text: string) {
    const message = text.trim().slice(0, MAX_MESSAGE);
    if (!message || ask.isPending) return;
    setTurns((current) => [...current, { role: "user", text: message }]);
    setInput("");
    ask.mutate(message);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    send(input);
  }

  const position = placement === "public" ? "left-4 bottom-4 sm:left-5 sm:bottom-5" : "right-4 bottom-20 sm:right-5 lg:bottom-6";

  return (
    <div className={`fixed z-50 ${position}`}>
      {open && (
        <section
          aria-label="Trợ lý tư vấn"
          className={`mb-3 flex h-[min(520px,calc(100vh-140px))] w-[min(360px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl ${
            placement === "portal" ? "ml-auto" : ""
          }`}
        >
          <header className="flex items-center justify-between gap-2 bg-brand-navy px-4 py-3 text-white">
            <div>
              <p className="font-bold">Trợ lý Tri Việt</p>
              <p className="text-xs text-white/80">
                {isAuthenticated ? "Hỏi về lớp, học phí, quy định hoặc lịch học của bạn" : "Hỏi về khóa học, lớp đang mở, học phí"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Đóng trợ lý"
              className={`rounded-full p-1 hover:bg-white/15 ${FOCUS_RING}`}
            >
              <Icon name="close" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-3 py-4 text-sm" aria-live="polite">
            <p className="max-w-[85%] rounded-2xl rounded-tl-sm bg-white px-3 py-2 text-slate-700 shadow-sm">
              Xin chào! Mình có thể giúp bạn tìm lớp đang mở, xem học phí và quy định nghỉ/học bù
              {isAuthenticated ? ", hoặc xem lịch học của bạn" : ""}.
            </p>
            {turns.length === 0 && (
              <div className="flex flex-wrap gap-2">
                {[...SUGGESTIONS, ...(isAuthenticated ? ["Tuần này mình học buổi nào?"] : [])].map((text) => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => send(text)}
                    className={`rounded-full border border-brand-navy/30 bg-white px-3 py-1 text-xs text-brand-navy hover:bg-brand-navy hover:text-white ${FOCUS_RING}`}
                  >
                    {text}
                  </button>
                ))}
              </div>
            )}
            {turns.map((turn, index) => (
              <p
                key={index}
                className={`max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 shadow-sm ${
                  turn.role === "user" ? "ml-auto rounded-tr-sm bg-brand-navy text-white" : "rounded-tl-sm bg-white text-slate-700"
                }`}
              >
                {turn.text}
              </p>
            ))}
            {ask.isPending && <p className="w-fit rounded-2xl bg-white px-3 py-2 text-slate-400 shadow-sm">Đang trả lời…</p>}
            {ask.isError && (
              <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-red-700">
                {apiErrorMessage(ask.error, ERROR_TEXT, "Chưa gửi được câu hỏi. Vui lòng thử lại.")}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-slate-200 p-3">
            <label className="sr-only" htmlFor="assistant-input">
              Câu hỏi
            </label>
            <textarea
              id="assistant-input"
              rows={1}
              value={input}
              maxLength={MAX_MESSAGE}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  send(input);
                }
              }}
              placeholder="Nhập câu hỏi…"
              className="max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || ask.isPending}
              aria-label="Gửi câu hỏi"
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-orange text-white disabled:opacity-40 ${FOCUS_RING}`}
            >
              <Icon name="send" className="text-[20px]" />
            </button>
          </form>
          {remaining !== null && <p className="px-3 pb-2 text-right text-[11px] text-slate-400">Còn {remaining} câu hỏi hôm nay</p>}
        </section>
      )}

      {/* Chú kiến linh vật làm nút mở trợ lý: nhún nhảy, thỉnh thoảng nói "Hỏi mình nhé!" */}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Đóng trợ lý tư vấn" : "Mở trợ lý tư vấn"}
        className={`chat-pet group relative block h-[88px] w-[85px] rounded-2xl ${placement === "portal" ? "ml-auto" : ""} ${FOCUS_RING}`}
      >
        {!open && (
          <span
            aria-hidden="true"
            className={`chat-pet-bubble absolute bottom-full mb-1 whitespace-nowrap rounded-2xl bg-white px-3 py-1.5 text-xs font-bold text-brand-navy shadow-md ring-1 ring-brand-sandLine ${
              placement === "portal" ? "right-2 origin-bottom-right" : "left-2 origin-bottom-left"
            }`}
          >
            Hỏi mình nhé!
          </span>
        )}
        <AntMascot
          variant="leaf"
          className="chat-pet-body h-full w-full drop-shadow-md transition-transform duration-200 group-hover:scale-110"
        />
        {open && (
          <span
            aria-hidden="true"
            className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-brand-navy text-white shadow"
          >
            <Icon name="close" className="text-[16px]" />
          </span>
        )}
      </button>
    </div>
  );
}
