import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useMemo, useState } from "react";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { Icon } from "@/components/ui/Icon";
import { AUTH_ERROR, AUTH_INPUT, AUTH_LABEL, PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY, PORTAL_CARD } from "@/constants/classNames";
import { TIME_SLOT_OPTIONS } from "@/constants/classOptions";
import type { AvailabilityResponse } from "@/interfaces/api";
import { replaceAvailability } from "@/services/tutorService";
import { addDays, formatDate, parseIsoDate, startOfToday, toIsoDate, weekdayName } from "@/utils/date";
import { portalErrorMessage } from "@/utils/errors";
import type { AvailabilityEditorProps } from "@/interfaces/portal";

/** Các ca của trung tâm (enum TimeSlot) để chọn nhanh; "CUSTOM" là tự nhập giờ */
const PRESETS = TIME_SLOT_OPTIONS.map((slot) => {
  const [start, end] = slot.hint.split(" – ");
  return { value: slot.value as string, label: `${slot.label} (${slot.hint})`, start, end };
});

/** Giá trị của lựa chọn "Giờ khác…" */
const CUSTOM = "CUSTOM";

/** Lặp lại khung giờ cùng thứ trong bao nhiêu tuần */
const REPEAT_OPTIONS = [
  { weeks: 1, label: "Chỉ ngày này" },
  { weeks: 4, label: "4 tuần liên tiếp" },
  { weeks: 8, label: "8 tuần liên tiếp" },
];

/** "18:00:00" → "18:00" */
const hhmm = (time: string) => time.slice(0, 5);

/** Khóa so sánh / sắp xếp một khung giờ: "2026-10-12 18:00 20:00" */
const slotKey = (slot: AvailabilityResponse) => `${slot.availableDate} ${hhmm(slot.startTime)} ${hhmm(slot.endTime)}`;

/** Hai khung cùng ngày có chồng giờ nhau không */
const overlaps = (a: AvailabilityResponse, b: AvailabilityResponse) =>
  a.availableDate === b.availableDate && hhmm(a.startTime) < hhmm(b.endTime) && hhmm(b.startTime) < hhmm(a.endTime);

/** Sắp xếp theo ngày rồi giờ */
const bySlot = (a: AvailabilityResponse, b: AvailabilityResponse) => slotKey(a).localeCompare(slotKey(b));

/**
 * Sửa lịch rảnh của gia sư (PUT /tutor/availability thay toàn bộ danh sách): thêm khung giờ theo ca của
 * trung tâm hoặc tự nhập, lặp lại nhiều tuần, bỏ từng khung, rồi bấm lưu. Trung tâm dùng lịch này để gợi ý
 * khi phân công lớp. Các khung đã qua vẫn được giữ nguyên khi lưu.
 */
export function AvailabilityEditor({ saved, queryKey }: AvailabilityEditorProps) {
  const queryClient = useQueryClient();
  const todayIso = toIsoDate(startOfToday());
  // Bản đang sửa (chưa lưu) của lịch rảnh
  const [slots, setSlots] = useState<AvailabilityResponse[]>(() => [...saved].sort(bySlot));
  // Các ô của form thêm khung; mặc định chọn ca tối (SLOT_EVENING)
  const [date, setDate] = useState(todayIso);
  const [preset, setPreset] = useState(PRESETS[2]?.value ?? CUSTOM);
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("20:00");
  const [repeatWeeks, setRepeatWeeks] = useState(1);
  const [formError, setFormError] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  const save = useMutation({
    mutationFn: () => replaceAvailability({ slots }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queryKey, updated);
      setSlots([...updated].sort(bySlot));
      setJustSaved(true);
    },
  });

  // Có thay đổi so với bản đã lưu không
  const dirty = useMemo(() => slots.map(slotKey).join("|") !== [...saved].sort(bySlot).map(slotKey).join("|"), [slots, saved]);
  const upcoming = slots.filter((slot) => slot.availableDate >= todayIso);
  const pastCount = slots.length - upcoming.length;
  // Các ngày có khung rảnh sắp tới (đã sắp xếp), mỗi ngày một dòng
  const days = [...new Set(upcoming.map((slot) => slot.availableDate))];

  /** Thêm khung (lặp nhiều tuần nếu chọn); kiểm tra ngày, giờ và chồng lấn trước */
  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const chosen = PRESETS.find((item) => item.value === preset);
    const startTime = chosen ? chosen.start : start;
    const endTime = chosen ? chosen.end : end;
    if (!date || !startTime || !endTime) return setFormError("Hãy chọn đủ ngày và giờ.");
    if (date < todayIso) return setFormError("Ngày rảnh không được ở quá khứ.");
    if (startTime >= endTime) return setFormError("Giờ bắt đầu phải trước giờ kết thúc.");

    const first = parseIsoDate(date);
    const added: AvailabilityResponse[] = Array.from({ length: repeatWeeks }, (_, week) => ({
      availableDate: toIsoDate(addDays(first, week * 7)),
      startTime: `${startTime}:00`,
      endTime: `${endTime}:00`,
    }));
    const clash = added.find((slot) => slots.some((existing) => overlaps(existing, slot)));
    if (clash) return setFormError(`Khung giờ ngày ${formatDate(parseIsoDate(clash.availableDate))} chồng lên khung đã có.`);

    setSlots((current) => [...current, ...added].sort(bySlot));
    setFormError("");
    setJustSaved(false);
    save.reset();
  }

  /** Bỏ một khung khỏi bản đang sửa */
  function removeSlot(target: AvailabilityResponse) {
    setSlots((current) => current.filter((slot) => slotKey(slot) !== slotKey(target)));
    setJustSaved(false);
    save.reset();
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <form onSubmit={handleAdd} className={`space-y-4 p-5 sm:p-6 lg:sticky lg:top-24 lg:col-span-5 ${PORTAL_CARD}`}>
        <h2 className="text-[18px] font-bold text-brand-navy">Thêm khung giờ rảnh</h2>
        <div>
          <label htmlFor="availability-date" className={`mb-1.5 ${AUTH_LABEL}`}>
            Ngày
          </label>
          <input
            id="availability-date"
            type="date"
            required
            min={todayIso}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className={AUTH_INPUT}
          />
        </div>
        <div>
          <label htmlFor="availability-preset" className={`mb-1.5 ${AUTH_LABEL}`}>
            Ca
          </label>
          <select id="availability-preset" value={preset} onChange={(event) => setPreset(event.target.value)} className={AUTH_INPUT}>
            {PRESETS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
            <option value={CUSTOM}>Giờ khác…</option>
          </select>
        </div>
        {preset === CUSTOM && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="availability-start" className={`mb-1.5 ${AUTH_LABEL}`}>
                Từ
              </label>
              <input
                id="availability-start"
                type="time"
                required
                value={start}
                onChange={(event) => setStart(event.target.value)}
                className={AUTH_INPUT}
              />
            </div>
            <div>
              <label htmlFor="availability-end" className={`mb-1.5 ${AUTH_LABEL}`}>
                Đến
              </label>
              <input
                id="availability-end"
                type="time"
                required
                value={end}
                onChange={(event) => setEnd(event.target.value)}
                className={AUTH_INPUT}
              />
            </div>
          </div>
        )}
        <div>
          <label htmlFor="availability-repeat" className={`mb-1.5 ${AUTH_LABEL}`}>
            Lặp lại
          </label>
          <select
            id="availability-repeat"
            value={repeatWeeks}
            onChange={(event) => setRepeatWeeks(Number(event.target.value))}
            className={AUTH_INPUT}
          >
            {REPEAT_OPTIONS.map((option) => (
              <option key={option.weeks} value={option.weeks}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        {formError && (
          <p role="alert" className={AUTH_ERROR}>
            {formError}
          </p>
        )}
        <button type="submit" className={`w-full ${PORTAL_BTN_SECONDARY}`}>
          <Icon name="add" className="text-[19px]" />
          Thêm vào lịch
        </button>
      </form>

      <section className="lg:col-span-7" aria-labelledby="availability-list-title">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 id="availability-list-title" className="text-[18px] font-bold text-brand-navy">
            Lịch rảnh sắp tới
          </h2>
          <button type="button" onClick={() => save.mutate()} disabled={!dirty || save.isPending} className={PORTAL_BTN_PRIMARY}>
            {save.isPending ? "Đang lưu…" : "Lưu lịch rảnh"}
          </button>
        </div>

        {dirty && !save.isPending && <p className="mb-3 text-[14px] font-medium text-amber-800">Có thay đổi chưa lưu.</p>}
        {justSaved && !dirty && (
          <div className="mb-3">
            <AuthNotice tone="success">Đã lưu lịch rảnh.</AuthNotice>
          </div>
        )}
        {save.error && (
          <div className="mb-3">
            <AuthNotice tone="error">{portalErrorMessage(save.error, "Chưa lưu được lịch rảnh. Vui lòng thử lại.")}</AuthNotice>
          </div>
        )}

        {days.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-brand-sandLine bg-white/60 px-6 py-10 text-center">
            <Icon name="event_available" className="text-[40px] text-slate-300" />
            <p className="mt-2 text-[16px] font-semibold text-brand-navy">Chưa có khung giờ rảnh nào sắp tới</p>
            <p className="mx-auto mt-1 max-w-md text-[14.5px] leading-relaxed text-brand-muted">
              Thêm các khung giờ bạn dạy được để trung tâm ưu tiên phân công lớp phù hợp.
            </p>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {days.map((day) => {
              const dayDate = parseIsoDate(day);
              return (
                <li key={day} className={`flex flex-col gap-2.5 px-4 py-3.5 sm:flex-row sm:items-center sm:gap-5 ${PORTAL_CARD}`}>
                  <span className="w-[196px] shrink-0 text-[15px] font-semibold text-brand-navy">
                    {weekdayName(dayDate)}, {formatDate(dayDate)}
                  </span>
                  <span className="flex flex-wrap gap-2">
                    {upcoming
                      .filter((slot) => slot.availableDate === day)
                      .map((slot) => (
                        <span
                          key={slotKey(slot)}
                          className="inline-flex items-center gap-1 rounded-full bg-brand-tint py-1 pl-3 pr-1 text-[13.5px] font-semibold tabular-nums text-brand-navy"
                        >
                          {hhmm(slot.startTime)} – {hhmm(slot.endTime)}
                          <button
                            type="button"
                            onClick={() => removeSlot(slot)}
                            aria-label={`Bỏ khung ${hhmm(slot.startTime)} – ${hhmm(slot.endTime)} ngày ${formatDate(dayDate)}`}
                            className="flex h-6 w-6 items-center justify-center rounded-full text-brand-navy/70 transition-colors hover:bg-white hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-navy"
                          >
                            <Icon name="close" className="text-[16px]" />
                          </button>
                        </span>
                      ))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {pastCount > 0 && <p className="mt-3 text-[13.5px] text-brand-muted">{pastCount} khung giờ đã qua vẫn được giữ nguyên.</p>}
      </section>
    </div>
  );
}
