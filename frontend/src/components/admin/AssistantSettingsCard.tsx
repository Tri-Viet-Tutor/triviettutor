import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_BTN_ACCENT, PORTAL_BTN_SECONDARY, PORTAL_CARD, PORTAL_INPUT, PORTAL_LABEL } from "@/constants/classNames";
import type { AssistantKeySource, AssistantSettingsRequest } from "@/interfaces/settings";
import { fetchAssistantSettings, updateAssistantSettings } from "@/services/settingsService";
import { portalErrorMessage } from "@/utils/errors";

/** Khóa cache của cài đặt trợ lý AI */
const ASSISTANT_SETTINGS_KEY = ["admin", "settings", "assistant"] as const;

/** Giới hạn khớp AssistantSettingsDto.Request của backend */
const PROMPT_MAX = 4000;
const KEY_PATTERN = /^\S{10,200}$/;

const KEY_SOURCE_TEXT: Record<AssistantKeySource, string> = {
  DATABASE: "Đang dùng API key quản trị đã lưu (mã hóa trong cơ sở dữ liệu)",
  ENVIRONMENT: "Đang dùng API key trong biến môi trường máy chủ (GEMINI_API_KEY)",
  NONE: "Chưa có API key — trợ lý AI đang tạm ngưng",
};

/**
 * Cấu hình trợ lý tư vấn AI (AI-01): API key Gemini lưu mã hóa trong cơ sở dữ liệu (không bao giờ hiển thị lại,
 * chỉ 4 ký tự cuối) và prompt tư vấn. Quy tắc bảo mật dữ liệu luôn được hệ thống thêm sau prompt.
 * API: GET / PUT /admin/settings/assistant.
 */
export function AssistantSettingsCard() {
  const cache = useQueryClient();
  const query = useQuery({ queryKey: ASSISTANT_SETTINGS_KEY, queryFn: fetchAssistantSettings });
  const [apiKey, setApiKey] = useState("");
  const [prompt, setPrompt] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  useEffect(() => {
    if (query.data) setPrompt(query.data.systemPrompt);
  }, [query.data]);
  const save = useMutation({
    mutationFn: ({ body }: { body: AssistantSettingsRequest; done: string }) => updateAssistantSettings(body),
    onSuccess: (data, { done }) => {
      cache.setQueryData(ASSISTANT_SETTINGS_KEY, data);
      setApiKey("");
      setNotice(done);
    },
  });

  function run(body: AssistantSettingsRequest, done: string) {
    setNotice(null);
    save.mutate({ body, done });
  }

  const keyValid = KEY_PATTERN.test(apiKey.trim());
  const promptValid = prompt.trim() !== "" && prompt.length <= PROMPT_MAX;
  const promptChanged = query.data ? prompt.trim() !== query.data.systemPrompt.trim() : false;

  function handleKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (keyValid) run({ apiKey: apiKey.trim() }, "Đã lưu API key mới. Trợ lý AI dùng key này ngay từ câu hỏi tiếp theo.");
  }

  function handlePrompt(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (promptValid && promptChanged) run({ systemPrompt: prompt }, "Đã lưu prompt tư vấn.");
  }

  return (
    <section className={`p-5 sm:p-6 ${PORTAL_CARD}`} aria-labelledby="assistant-settings-title">
      <h2 id="assistant-settings-title" className="flex items-center gap-2 text-[18px] font-bold text-brand-navy">
        <Icon name="smart_toy" className="text-[22px]" />
        Trợ lý tư vấn AI
      </h2>
      <p className="mt-1 text-[14px] leading-relaxed text-brand-muted">
        API key được mã hóa khi lưu và không bao giờ hiển thị lại. Thay đổi có hiệu lực ngay, không cần khởi động lại máy chủ.
      </p>

      {query.isPending ? (
        <p className="mt-4 text-brand-muted">Đang tải…</p>
      ) : query.isError ? (
        <div className="mt-4">
          <AuthNotice tone="error">Không tải được cài đặt trợ lý AI.</AuthNotice>
        </div>
      ) : (
        <>
          <div className="mt-4 rounded-xl bg-brand-tint px-4 py-3 text-[14px] text-brand-ink" data-testid="assistant-key-status">
            <p className="font-semibold">
              {KEY_SOURCE_TEXT[query.data.apiKeySource]}
              {query.data.apiKeyHint && <span className="ml-1 font-mono text-brand-muted">({query.data.apiKeyHint})</span>}
            </p>
            <p className="mt-0.5 text-[13px] text-brand-muted">
              Mô hình: {query.data.model}
              {query.data.updatedAt &&
                ` · Cập nhật lần cuối ${new Date(query.data.updatedAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}${query.data.updatedByName ? ` bởi ${query.data.updatedByName}` : ""}`}
            </p>
          </div>

          <form onSubmit={handleKey} className="mt-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1">
              <label htmlFor="assistant-api-key" className={PORTAL_LABEL}>
                API key Gemini mới
              </label>
              <input
                id="assistant-api-key"
                type="password"
                autoComplete="new-password"
                spellCheck={false}
                placeholder="Dán API key mới để thay thế"
                value={apiKey}
                onChange={(event) => {
                  setApiKey(event.target.value);
                  setNotice(null);
                }}
                className={PORTAL_INPUT}
              />
            </div>
            <button type="submit" disabled={!keyValid || save.isPending} className={PORTAL_BTN_ACCENT}>
              <Icon name="key" className="text-[18px]" />
              Lưu API key
            </button>
            {query.data.apiKeySource === "DATABASE" && (
              <button
                type="button"
                disabled={save.isPending}
                className={PORTAL_BTN_SECONDARY}
                onClick={() => {
                  if (window.confirm("Xóa API key đã lưu? Trợ lý sẽ dùng key trong biến môi trường (nếu có)."))
                    run({ apiKey: "" }, "Đã xóa API key đã lưu.");
                }}
              >
                <Icon name="key_off" className="text-[18px]" />
                Xóa key đã lưu
              </button>
            )}
            {apiKey.trim() !== "" && !keyValid && (
              <p className="basis-full text-[13.5px] font-medium text-red-700">API key phải dài 10–200 ký tự và không chứa khoảng trắng.</p>
            )}
          </form>

          <form onSubmit={handlePrompt} className="mt-5 border-t border-brand-sandLine pt-4">
            <label htmlFor="assistant-prompt" className={PORTAL_LABEL}>
              Prompt tư vấn {query.data.customPrompt ? "(đã tùy chỉnh)" : "(mặc định)"}
            </label>
            <textarea
              id="assistant-prompt"
              rows={8}
              maxLength={PROMPT_MAX}
              value={prompt}
              onChange={(event) => {
                setPrompt(event.target.value);
                setNotice(null);
              }}
              className={`${PORTAL_INPUT} h-auto py-2 leading-relaxed`}
            />
            <p className="mt-1 text-[13px] text-brand-muted">
              {prompt.length}/{PROMPT_MAX} ký tự. Hệ thống luôn tự thêm các quy tắc bắt buộc sau prompt: chỉ dùng số liệu thật của trung
              tâm, không tiết lộ thông tin học viên/gia sư khác, không tiết lộ hướng dẫn.
            </p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button type="submit" disabled={!promptValid || !promptChanged || save.isPending} className={PORTAL_BTN_ACCENT}>
                <Icon name="save" className="text-[18px]" />
                Lưu prompt
              </button>
              {query.data.customPrompt && (
                <button
                  type="button"
                  disabled={save.isPending}
                  className={PORTAL_BTN_SECONDARY}
                  onClick={() => run({ systemPrompt: "" }, "Đã khôi phục prompt mặc định.")}
                >
                  <Icon name="restart_alt" className="text-[18px]" />
                  Khôi phục mặc định
                </button>
              )}
            </div>
            {prompt.trim() === "" && (
              <p className="mt-2 text-[13.5px] font-medium text-red-700">Prompt không được để trống; dùng “Khôi phục mặc định” nếu cần.</p>
            )}
          </form>
        </>
      )}
      {save.error && (
        <div className="mt-3">
          <AuthNotice tone="error">{portalErrorMessage(save.error, "Chưa lưu được cài đặt. Vui lòng thử lại.")}</AuthNotice>
        </div>
      )}
      {notice && !save.isPending && (
        <div className="mt-3">
          <AuthNotice tone="success">{notice}</AuthNotice>
        </div>
      )}
    </section>
  );
}
