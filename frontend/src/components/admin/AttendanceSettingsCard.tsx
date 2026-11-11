import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_BTN_ACCENT, PORTAL_CARD, PORTAL_INPUT, PORTAL_LABEL, PORTAL_TEXT_LINK } from "@/constants/classNames";
import { ROUTES } from "@/constants/routes";
import { fetchAttendanceSettings, updateAttendanceSettings } from "@/services/settingsService";
import { portalErrorMessage } from "@/utils/errors";

/** Khóa cache của cài đặt điểm danh */
const ATTENDANCE_SETTINGS_KEY = ["admin", "settings", "attendance"] as const;

/**
 * Cấu hình điểm danh tự động qua phòng học trực tuyến (ATT-01): học viên ở trong phòng đủ số phút thì hệ thống
 * ghi "Có mặt". Không ghi đè điểm danh gia sư / quản trị đã nhập; quản trị vẫn sửa và điểm danh bù trong từng buổi.
 * API: GET / PUT /admin/settings/attendance.
 */
export function AttendanceSettingsCard() {
  const cache = useQueryClient();
  const query = useQuery({ queryKey: ATTENDANCE_SETTINGS_KEY, queryFn: fetchAttendanceSettings });
  const [minutes, setMinutes] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    if (query.data) setMinutes(String(query.data.autoPresentMinutes));
  }, [query.data]);
  const save = useMutation({
    mutationFn: (value: number) => updateAttendanceSettings(value),
    onSuccess: (data) => {
      cache.setQueryData(ATTENDANCE_SETTINGS_KEY, data);
      setSaved(true);
    },
  });
  const value = Number(minutes);
  const valid = minutes.trim() !== "" && Number.isInteger(value) && value >= 0 && value <= 240;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaved(false);
    if (valid) save.mutate(value);
  }

  return (
    <section className={`p-5 sm:p-6 ${PORTAL_CARD}`} aria-labelledby="attendance-settings-title">
      <h2 id="attendance-settings-title" className="flex items-center gap-2 text-[18px] font-bold text-brand-navy">
        <Icon name="how_to_reg" className="text-[22px]" />
        Điểm danh tự động qua phòng học
      </h2>
      <p className="mt-1 text-[14px] leading-relaxed text-brand-muted">
        Học viên ở trong phòng học trực tuyến của buổi đủ số phút dưới đây (cộng dồn các lần vào lại, chỉ tính trong giờ học) thì được ghi
        “Có mặt”. Hệ thống không ghi đè điểm danh mà gia sư hoặc quản trị đã nhập.
      </p>

      {query.isPending ? (
        <p className="mt-4 text-brand-muted">Đang tải…</p>
      ) : query.isError ? (
        <div className="mt-4">
          <AuthNotice tone="error">Không tải được cài đặt điểm danh.</AuthNotice>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="auto-present-minutes" className={PORTAL_LABEL}>
              Ngưỡng có mặt (phút)
            </label>
            <input
              id="auto-present-minutes"
              type="number"
              min={0}
              max={240}
              step={1}
              inputMode="numeric"
              value={minutes}
              onChange={(event) => {
                setMinutes(event.target.value);
                setSaved(false);
              }}
              className={`${PORTAL_INPUT} w-[140px]`}
            />
          </div>
          <button type="submit" disabled={!valid || save.isPending} className={PORTAL_BTN_ACCENT}>
            <Icon name="save" className="text-[18px]" />
            {save.isPending ? "Đang lưu…" : "Lưu"}
          </button>
          <p className="basis-full text-[13px] text-brand-muted">
            Nhập 1–240 phút; nhập 0 để tắt điểm danh tự động.
            {query.data.updatedAt &&
              ` Cập nhật lần cuối ${new Date(query.data.updatedAt).toLocaleString("vi-VN")}${query.data.updatedByName ? ` bởi ${query.data.updatedByName}` : ""}.`}
          </p>
          {!valid && minutes.trim() !== "" && (
            <p className="basis-full text-[13.5px] font-medium text-red-700">Ngưỡng phải là số nguyên từ 0 đến 240.</p>
          )}
        </form>
      )}
      {save.error && (
        <div className="mt-3">
          <AuthNotice tone="error">{portalErrorMessage(save.error, "Chưa lưu được cài đặt. Vui lòng thử lại.")}</AuthNotice>
        </div>
      )}
      {saved && query.data && (
        <div className="mt-3">
          <AuthNotice tone="success">
            {query.data.enabled
              ? `Đã lưu: học viên ở trong phòng từ ${query.data.autoPresentMinutes} phút trở lên được tự ghi “Có mặt”.`
              : "Đã tắt điểm danh tự động."}
          </AuthNotice>
        </div>
      )}
      <p className="mt-4 border-t border-brand-sandLine pt-3 text-[13.5px] text-brand-muted">
        Cần sửa hoặc điểm danh bù thủ công? Mở{" "}
        <Link to={ROUTES.adminSessions} className={PORTAL_TEXT_LINK}>
          Buổi học
        </Link>
        , chọn buổi rồi sửa điểm danh từng học viên (kể cả khi đã khóa).
      </p>
    </section>
  );
}
