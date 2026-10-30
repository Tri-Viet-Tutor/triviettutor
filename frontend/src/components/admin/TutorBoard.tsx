import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { PortalError } from "@/components/dashboard/PortalState";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { adminKeys } from "@/hooks/useAdminData";
import { fetchTutorBoard } from "@/services/admin";
import { displayCode } from "@/utils/classes";
import { addDays, formatDayMonth, startOfToday, startOfWeek, toIsoDate, weekdayName } from "@/utils/date";
import { normalizeText } from "@/utils/text";
import { TimeField } from "@/components/ui/TimeField";

const FOCUS = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";
const hhmm = (time: string) => time.slice(0, 5);
/** "18:30" → số phút trong ngày */
const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5));

/**
 * Bảng lịch gia sư theo tuần cho trang Phân công dạy thay (GET /admin/tutor-board):
 * mỗi dòng một gia sư, mỗi cột một ngày (Thứ 2 → Chủ nhật); ô xanh là khung rảnh gia sư đã khai,
 * ô navy là buổi đang dạy. Tìm theo tên, lọc theo thứ và khung giờ để thấy ngay ai rảnh.
 */
export function TutorBoard() {
  const today = startOfToday();
  const [weekOffset, setWeekOffset] = useState(0);
  const [search, setSearch] = useState("");
  // Thứ đang lọc: -1 là mọi ngày, 0..6 là Thứ 2..Chủ nhật của tuần đang xem
  const [day, setDay] = useState(-1);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [onlyFree, setOnlyFree] = useState(false);

  const monday = addDays(startOfWeek(today), weekOffset * 7);
  const days = Array.from({ length: 7 }, (_, index) => addDays(monday, index));
  const isoDays = days.map(toIsoDate);
  const query = useQuery({
    queryKey: adminKeys.tutorBoard(isoDays[0], isoDays[6]),
    queryFn: () => fetchTutorBoard(isoDays[0], isoDays[6]),
  });

  const timeSet = from !== "" && to !== "" && minutes(from) < minutes(to);
  /** Gia sư rảnh trọn khung [from, to] của ngày `iso` (đã khai rảnh phủ đủ và không có buổi dạy chồng lên) */
  const freeAt = (row: NonNullable<typeof query.data>[number], iso: string) => {
    const slots = row.availability.filter((slot) => slot.availableDate === iso);
    if (!timeSet) return slots.length > 0;
    const start = minutes(from);
    const end = minutes(to);
    const covered = slots.some((slot) => minutes(slot.startTime) <= start && minutes(slot.endTime) >= end);
    const clash = row.teaching.some(
      (lesson) => lesson.date === iso && minutes(lesson.startTime) < end && minutes(lesson.endTime) > start,
    );
    return covered && !clash;
  };

  const rows = useMemo(() => {
    const keyword = normalizeText(search);
    const targetDays = day === -1 ? isoDays : [isoDays[day]];
    return (query.data ?? [])
      .filter((row) => !keyword || normalizeText(row.tutorName).includes(keyword))
      .map((row) => ({ row, freeDays: targetDays.filter((iso) => freeAt(row, iso)).length }))
      .filter(({ freeDays }) => !onlyFree || freeDays > 0)
      .sort((a, b) => b.freeDays - a.freeDays || a.row.tutorName.localeCompare(b.row.tutorName, "vi"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query.data, search, day, from, to, onlyFree, weekOffset]);

  const filtering = search !== "" || day !== -1 || timeSet || onlyFree;
  const weekLabel = `${formatDayMonth(days[0])} – ${formatDayMonth(days[6])}`;

  return (
    <section aria-labelledby="tutor-board-title" className="mt-8 overflow-hidden rounded-2xl border border-brand-sandLine bg-white shadow-[0_14px_34px_-26px_rgba(11,58,140,0.35)]">
      {/* Tiêu đề + chọn tuần */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-sandLine px-5 py-4">
        <div>
          <h2 id="tutor-board-title" className="flex items-center gap-2 text-[17px] font-extrabold text-brand-navy">
            <Icon name="calendar_view_week" className="text-[22px]" />
            Lịch rảnh của gia sư
          </h2>
          <p className="mt-0.5 text-[13px] text-brand-muted">Khung rảnh gia sư tự khai và các buổi họ đang dạy trong tuần.</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setWeekOffset((value) => value - 1)}
            aria-label="Tuần trước"
            className={`flex h-9 w-9 items-center justify-center rounded-lg border border-brand-sandLine hover:bg-brand-sand ${FOCUS}`}
          >
            <Icon name="chevron_left" className="text-[20px]" />
          </button>
          <span className="min-w-[124px] text-center text-[14px] font-bold tabular-nums text-brand-ink">{weekLabel}</span>
          <button
            type="button"
            onClick={() => setWeekOffset((value) => value + 1)}
            aria-label="Tuần sau"
            className={`flex h-9 w-9 items-center justify-center rounded-lg border border-brand-sandLine hover:bg-brand-sand ${FOCUS}`}
          >
            <Icon name="chevron_right" className="text-[20px]" />
          </button>
          {weekOffset !== 0 && (
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className={`ml-1 h-9 rounded-lg px-3 text-[13px] font-semibold text-brand-navy hover:bg-brand-tint ${FOCUS}`}
            >
              Tuần này
            </button>
          )}
        </div>
      </div>

      {/* Bộ tìm chi tiết */}
      <div className="flex flex-wrap items-end gap-3 border-b border-brand-sandLine bg-brand-sand/40 px-5 py-3.5">
        <label className="min-w-[200px] flex-1">
          <span className="mb-1 block text-[12px] font-semibold text-brand-muted">Gia sư</span>
          <span className="flex h-10 items-center gap-2 rounded-xl border border-brand-sandLine bg-white px-3 focus-within:border-brand-navy">
            <Icon name="search" className="text-[19px] text-brand-muted" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm theo tên"
              className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] outline-none focus:ring-0"
            />
          </span>
        </label>
        <label>
          <span className="mb-1 block text-[12px] font-semibold text-brand-muted">Thứ</span>
          <select
            value={day}
            onChange={(event) => setDay(Number(event.target.value))}
            className="h-10 rounded-xl border border-brand-sandLine bg-white pl-3 pr-8 text-[14px] font-semibold outline-none focus:border-brand-navy"
          >
            <option value={-1}>Cả tuần</option>
            {days.map((date, index) => (
              <option key={isoDays[index]} value={index}>
                {weekdayName(date)} {formatDayMonth(date)}
              </option>
            ))}
          </select>
        </label>
        <div>
          <span className="mb-1 block text-[12px] font-semibold text-brand-muted">Rảnh trong khung giờ</span>
          <span className="flex items-center gap-1.5">
            <TimeField
              value={from}
              onChange={(value) => setFrom(value)}
              aria-label="Từ giờ"
              className="h-10 w-[112px] rounded-xl border border-brand-sandLine bg-white px-2.5 text-[14px] outline-none focus:border-brand-navy"
            />
            <span className="text-brand-muted">–</span>
            <TimeField
              value={to}
              onChange={(value) => setTo(value)}
              aria-label="Đến giờ"
              className="h-10 w-[112px] rounded-xl border border-brand-sandLine bg-white px-2.5 text-[14px] outline-none focus:border-brand-navy"
            />
          </span>
        </div>
        <label className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-brand-sandLine bg-white px-3 text-[13.5px] font-semibold text-brand-ink">
          <input type="checkbox" checked={onlyFree} onChange={(event) => setOnlyFree(event.target.checked)} className="accent-[#0B3A8C]" />
          Chỉ người rảnh
        </label>
        {filtering && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setDay(-1);
              setFrom("");
              setTo("");
              setOnlyFree(false);
            }}
            className={`h-10 rounded-xl px-3 text-[13px] font-semibold text-brand-navy hover:bg-brand-tint ${FOCUS}`}
          >
            Xóa lọc
          </button>
        )}
      </div>

      {/* Chú thích */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 pt-3 text-[12px] text-brand-muted">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-emerald-100 ring-1 ring-emerald-300" /> Đã khai rảnh
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded bg-brand-navy" /> Đang dạy
        </span>
        {timeSet && (
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded ring-2 ring-emerald-500" /> Rảnh trọn {from} – {to}
          </span>
        )}
      </div>

      {query.isError ? (
        <div className="p-5">
          <PortalError message="Không tải được lịch của gia sư." onRetry={() => void query.refetch()} />
        </div>
      ) : (
        <div className="overflow-x-auto p-3 pt-2">
          <table className="w-full min-w-[920px] border-separate border-spacing-1 text-left">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-[200px] bg-white px-2 py-2 text-[12px] font-semibold text-brand-muted">
                  {query.isPending ? "Đang tải…" : `${rows.length} gia sư`}
                </th>
                {days.map((date, index) => {
                  const isToday = isoDays[index] === toIsoDate(today);
                  const dimmed = day !== -1 && day !== index;
                  return (
                    <th
                      key={isoDays[index]}
                      className={`rounded-lg px-2 py-2 text-center ${isToday ? "bg-brand-navy text-white" : "bg-brand-sand/70 text-brand-ink"} ${dimmed ? "opacity-40" : ""}`}
                    >
                      <span className="block text-[12.5px] font-bold">{weekdayName(date)}</span>
                      <span className={`block text-[11.5px] ${isToday ? "text-white/75" : "text-brand-muted"}`}>{formatDayMonth(date)}</span>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ row, freeDays }) => (
                <tr key={row.tutorId}>
                  <th scope="row" className="sticky left-0 z-10 bg-white px-2 py-1.5 align-top">
                    <span className="flex items-center gap-2">
                      <UserAvatar userId={row.tutorId} name={row.tutorName} size={30} />
                      <span className="min-w-0">
                        <span className="block truncate text-[13.5px] font-bold text-brand-ink">{row.tutorName}</span>
                        <span className="block text-[11.5px] font-medium text-brand-muted">
                          {freeDays > 0 ? `Rảnh ${freeDays} ngày` : "Không có ngày rảnh"}
                        </span>
                      </span>
                    </span>
                  </th>
                  {isoDays.map((iso, index) => {
                    const free = row.availability.filter((slot) => slot.availableDate === iso);
                    const lessons = row.teaching.filter((lesson) => lesson.date === iso);
                    const dimmed = day !== -1 && day !== index;
                    const match = timeSet && !dimmed && freeAt(row, iso);
                    return (
                      <td
                        key={iso}
                        className={`h-[60px] rounded-lg border p-1 align-top ${
                          match ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500" : "border-brand-sandLine/70 bg-brand-sand/20"
                        } ${dimmed ? "opacity-35" : ""}`}
                      >
                        <span className="flex flex-col gap-1">
                          {free.map((slot, slotIndex) => (
                            <span
                              key={`f${slotIndex}`}
                              className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[11.5px] font-semibold text-emerald-800 ring-1 ring-emerald-200"
                            >
                              {hhmm(slot.startTime)}–{hhmm(slot.endTime)}
                            </span>
                          ))}
                          {lessons.map((lesson) => (
                            <span
                              key={lesson.sessionId}
                              title={`Đang dạy lớp ${displayCode("class", lesson.classGroupId)}`}
                              className="rounded-md bg-brand-navy px-1.5 py-0.5 text-[11.5px] font-semibold text-white"
                            >
                              {hhmm(lesson.startTime)} - {displayCode("class", lesson.classGroupId)}
                            </span>
                          ))}
                        </span>
                      </td>
                    );
                  })}
                </tr>
              ))}
              {!query.isPending && rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[13.5px] text-brand-muted">
                    Không có gia sư phù hợp bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
