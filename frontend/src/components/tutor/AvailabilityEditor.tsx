import { useMutation, useQueryClient } from "@tanstack/react-query";
import { type CSSProperties, type FormEvent, useMemo, useState } from "react";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { Icon } from "@/components/ui/Icon";
import { AUTH_ERROR, AUTH_INPUT, AUTH_LABEL, PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY } from "@/constants/classNames";
import { TIME_SLOT_OPTIONS } from "@/constants/classOptions";
import type { AvailabilityResponse } from "@/interfaces/dto";
import { replaceAvailability } from "@/services/tutorService";
import { addDays, formatDate, parseIsoDate, startOfToday, toIsoDate, weekdayName } from "@/utils/date";
import { portalErrorMessage } from "@/utils/errors";
import { validateNotPast, validateTimeOrder } from "@/utils/validation";
import type { AvailabilityEditorProps } from "@/interfaces/portal";
import { DateField } from "@/components/ui/DateField";
import { TimeField } from "@/components/ui/TimeField";
import { Select } from "@/components/ui/Select";

// Các ca của trung tâm (enum TimeSlot) để chọn nhanh; "CUSTOM" là tự nhập giờ
const PRESETS = TIME_SLOT_OPTIONS.map((slot) => {
  const [start, end] = slot.hint.split(" - ");
  return { value: slot.value as string, label: `${slot.label} (${slot.hint})`, start, end };
});

// Giá trị của lựa chọn "Giờ khác…"
const CUSTOM = "CUSTOM";

// Mỗi lần thêm luôn tạo đủ 4 ca (4 tuần liên tiếp), không cho chọn số tuần khác
const REPEAT_WEEKS = 4;

// "18:00:00" → "18:00"
const hhmm = (time: string) => time.slice(0, 5);

// Khóa so sánh / sắp xếp một khung giờ: "2026-10-12 18:00 20:00"
const slotKey = (slot: AvailabilityResponse) => `${slot.availableDate} ${hhmm(slot.startTime)} ${hhmm(slot.endTime)}`;

// Góc nghiêng của tờ giấy note, suy ra từ chính chuỗi ngày nên mỗi tờ luôn nghiêng y như cũ
// qua mọi lần vẽ lại. Năm mức từ -1.6° đến 1.6°, đủ để bảng trông như dán tay mà chữ vẫn thẳng.
function tiltOf(day: string): string {
  const sum = [...day].reduce((total, char) => total + char.charCodeAt(0), 0);
  return `${[-1.6, -0.8, 0, 0.9, 1.6][sum % 5]}deg`;
}

// Hai khung cùng ngày có chồng giờ nhau không
const overlaps = (a: AvailabilityResponse, b: AvailabilityResponse) =>
  a.availableDate === b.availableDate && hhmm(a.startTime) < hhmm(b.endTime) && hhmm(b.startTime) < hhmm(a.endTime);

// Sắp xếp theo ngày rồi giờ
const bySlot = (a: AvailabilityResponse, b: AvailabilityResponse) => slotKey(a).localeCompare(slotKey(b));

// Sửa lịch rảnh của gia sư (PUT /tutor/availability thay toàn bộ danh sách): thêm khung giờ theo ca của
// trung tâm hoặc tự nhập, lặp lại nhiều tuần, bỏ từng khung, rồi bấm lưu. Trung tâm dùng lịch này để gợi ý
// khi phân công lớp. Các khung đã qua vẫn được giữ nguyên khi lưu.
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

  // Thêm khung (lặp nhiều tuần nếu chọn); kiểm tra ngày, giờ và chồng lấn trước
  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const chosen = PRESETS.find((item) => item.value === preset);
    const startTime = chosen ? chosen.start : start;
    const endTime = chosen ? chosen.end : end;
    const dateError = validateNotPast(date, "Ngày rảnh", todayIso);
    if (dateError) return setFormError(dateError);
    const timeError = validateTimeOrder(startTime, endTime);
    if (timeError) return setFormError(timeError);

    const first = parseIsoDate(date);
    const added: AvailabilityResponse[] = Array.from({ length: REPEAT_WEEKS }, (_, week) => ({
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

  // Bỏ một khung khỏi bản đang sửa
  function removeSlot(target: AvailabilityResponse) {
    setSlots((current) => current.filter((slot) => slotKey(slot) !== slotKey(target)));
    setJustSaved(false);
    save.reset();
  }

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      <form
        onSubmit={handleAdd}
        className="relative space-y-4 rounded-b-2xl rounded-t-sm border border-brand-sandLine bg-[#fffdf7] px-5 pb-5 pt-7 shadow-[0_1px_1px_rgba(20,33,61,0.06),0_14px_26px_-20px_rgba(20,33,61,0.5)] sm:px-6 sm:pb-6 lg:sticky lg:top-24 lg:col-span-5"
      >
        {
          // Mép trên răng cưa: tập giấy vừa xé ra một tờ
        }
        <span aria-hidden="true" className="notepad-edge absolute inset-x-0 top-0 h-[10px]" />
        <h2 className="text-[18px] font-bold text-brand-navy">Thêm khung giờ rảnh</h2>
        <div>
          <label htmlFor="availability-date" className={`mb-1.5 ${AUTH_LABEL}`}>
            Ngày
          </label>
          <DateField
            id="availability-date"
            required
            min={todayIso}
            value={date}
            onChange={(value) => setDate(value)}
            className={AUTH_INPUT}
          />
        </div>
        <div>
          <label htmlFor="availability-preset" className={`mb-1.5 ${AUTH_LABEL}`}>
            Ca
          </label>
          <Select id="availability-preset" value={preset} onChange={(event) => setPreset(event.target.value)} className={AUTH_INPUT}>
            {PRESETS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
            <option value={CUSTOM}>Giờ khác…</option>
          </Select>
        </div>
        {preset === CUSTOM && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="availability-start" className={`mb-1.5 ${AUTH_LABEL}`}>
                Từ
              </label>
              <TimeField
                id="availability-start"
                required
                value={start}
                onChange={(value) => setStart(value)}
                className={AUTH_INPUT}
              />
            </div>
            <div>
              <label htmlFor="availability-end" className={`mb-1.5 ${AUTH_LABEL}`}>
                Đến
              </label>
              <TimeField
                id="availability-end"
                required
                value={end}
                onChange={(value) => setEnd(value)}
                className={AUTH_INPUT}
              />
            </div>
          </div>
        )}
        <p className="text-[13px] text-brand-muted">Mỗi lần thêm sẽ tự áp dụng cho 4 tuần liên tiếp cùng thứ, cùng giờ.</p>
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
            <p className="mt-2 text-[16px] font-semibold text-brand-navy">Chưa có khung giờ rảnh nào sắp tới.</p>
            <p className="mx-auto mt-1 max-w-md text-[14.5px] leading-relaxed text-brand-muted">
              Thêm các khung giờ bạn dạy được để trung tâm ưu tiên phân công lớp phù hợp.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2 xl:grid-cols-3">
            {days.map((day, index) => {
              const dayDate = parseIsoDate(day);
              const daySlots = upcoming.filter((slot) => slot.availableDate === day);
              return (
                <li
                  key={day}
                  style={{ "--tilt": tiltOf(day) } as CSSProperties}
                  className={`note-paper relative rounded-[3px] px-4 pb-4 pt-6 ${index % 3 === 1 ? "note-paper-cool" : ""}`}
                >
                  {
                    // Băng dán vắt qua mép trên, lệch sang một bên như dán tay
                  }
                  <span
                    aria-hidden="true"
                    className={`note-tape absolute -top-2 h-[18px] w-[72px] ${index % 2 ? "right-5 rotate-3" : "left-5 -rotate-2"}`}
                  />
                  <p className="text-[19px] font-extrabold leading-none text-brand-navy">{weekdayName(dayDate)}</p>
                  <p className="mt-1 text-[13.5px] tabular-nums text-brand-muted">{formatDate(dayDate)}</p>
                  <ul className="mt-3 space-y-1.5 border-t border-dashed border-brand-sandLine pt-3">
                    {daySlots.map((slot) => (
                      <li key={slotKey(slot)} className="flex items-center justify-between gap-2">
                        <span className="flex items-baseline gap-1.5 text-[15px] font-bold tabular-nums text-brand-ink">
                          {hhmm(slot.startTime)}
                          <span className="text-[13px] font-medium text-brand-muted">đến</span>
                          {hhmm(slot.endTime)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeSlot(slot)}
                          aria-label={`Bỏ khung ${hhmm(slot.startTime)} đến ${hhmm(slot.endTime)} ngày ${formatDate(dayDate)}`}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-brand-muted transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-navy"
                        >
                          <Icon name="close" className="text-[17px]" />
                        </button>
                      </li>
                    ))}
                  </ul>
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
