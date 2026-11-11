import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING, PORTAL_BTN_ACCENT, PORTAL_BTN_GHOST, PORTAL_CARD, PORTAL_INPUT, PORTAL_LABEL } from "@/constants/classNames";
import { HOMEWORK_STATUS } from "@/constants/labels";
import { ROUTES, homeworkPath } from "@/constants/routes";
import { useTutorHomeworks } from "@/hooks/useHomeworkData";
import type { TutorHomeworkResponse } from "@/interfaces/homework";
import { displayCode } from "@/utils/classes";
import { formatClockTime, formatDate, formatDayMonth, parseIsoDate } from "@/utils/date";
import { formatDateTime } from "@/utils/homework";
import {
  FILTER_OPTIONS,
  GROUP_BY_OPTIONS,
  SORT_OPTIONS,
  groupHomeworks,
  sessionOpenByDefault,
  sortHomeworks,
  type ClassGroup,
  type HomeworkFilter,
  type HomeworkGroupBy,
  type HomeworkSort,
  type SessionGroup,
} from "@/utils/tutorHomeworks";

/** Đọc một giá trị hợp lệ từ thanh địa chỉ, không có thì dùng mặc định */
function pick<T extends string>(raw: string | null, options: { value: T }[], fallback: T): T {
  return options.some((option) => option.value === raw) ? (raw as T) : fallback;
}

/**
 * Trang Bài tập của gia sư: nhóm theo lớp → buổi → bài, sắp xếp và lọc theo trạng thái
 * (lưu trên thanh địa chỉ). Bấm một bài để sửa, công bố, đóng hoặc chấm.
 */
export function TutorHomeworksPage() {
  const homeworks = useTutorHomeworks();
  const [params, setParams] = useSearchParams();
  const groupBy = pick<HomeworkGroupBy>(params.get("group"), GROUP_BY_OPTIONS, "class");
  const sort = pick<HomeworkSort>(params.get("sort"), SORT_OPTIONS, "due-nearest");
  const filter = pick<HomeworkFilter>(params.get("status"), FILTER_OPTIONS, "all");
  /** Các nhóm người dùng đã tự mở / thu gọn (ghi đè mặc định) */
  const [openOverrides, setOpenOverrides] = useState<Record<string, boolean>>({});

  const setParam = (key: string, value: string, fallback: string) => {
    const next = new URLSearchParams(params);
    if (value === fallback) next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const sorted = useMemo(() => sortHomeworks(homeworks.data ?? [], sort, filter, new Date()), [homeworks.data, sort, filter]);
  const groups = useMemo(() => groupHomeworks(sorted), [sorted]);

  const isClassOpen = (group: ClassGroup) => openOverrides[group.key] ?? true;
  const isSessionOpen = (group: ClassGroup, session: SessionGroup) => openOverrides[session.key] ?? sessionOpenByDefault(group, session);
  const toggle = (key: string, current: boolean) => setOpenOverrides((prev) => ({ ...prev, [key]: !current }));
  const setAll = (open: boolean) => {
    const next: Record<string, boolean> = {};
    for (const group of groups) {
      next[group.key] = open;
      for (const session of group.sessions) next[session.key] = open;
    }
    setOpenOverrides(next);
  };

  const createLink = (
    <Link to={ROUTES.tutorHomeworkNew} className={PORTAL_BTN_ACCENT}>
      <Icon name="add" className="text-[19px]" />
      Tạo bài tập
    </Link>
  );

  const total = homeworks.data?.length ?? 0;

  return (
    <>
      <PortalPageHeader
        icon="assignment"
        title="Bài tập"
        description="Tạo bài tập, bài kiểm tra trắc nghiệm / tự luận cho từng buổi, đặt giờ mở, hạn nộp, mật khẩu và chấm bài học viên nộp."
        action={createLink}
      />

      {homeworks.isPending && <PortalLoading label="Đang tải bài tập" />}
      {homeworks.isError && <PortalError message="Chưa tải được danh sách bài tập." onRetry={() => void homeworks.refetch()} />}
      {homeworks.data && total === 0 && (
        <PortalEmpty
          icon="assignment_add"
          title="Bạn chưa tạo bài tập nào"
          description="Tạo bài tập cho một buổi học, công bố để học viên của lớp thấy đường dẫn và vào làm."
          action={createLink}
        />
      )}

      {homeworks.data && total > 0 && (
        <>
          {/* Thanh công cụ */}
          <div className={`mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:flex-wrap sm:items-end ${PORTAL_CARD}`}>
            <ToolbarSelect
              id="hw-group"
              label="Nhóm theo"
              value={groupBy}
              options={GROUP_BY_OPTIONS}
              onChange={(value) => setParam("group", value, "class")}
            />
            <ToolbarSelect
              id="hw-sort"
              label="Sắp xếp"
              value={sort}
              options={SORT_OPTIONS}
              onChange={(value) => setParam("sort", value, "due-nearest")}
            />
            <ToolbarSelect
              id="hw-status"
              label="Lọc"
              value={filter}
              options={FILTER_OPTIONS}
              onChange={(value) => setParam("status", value, "all")}
            />
            {groupBy === "class" && sorted.length > 0 && (
              <div className="flex gap-1 sm:ml-auto">
                <button type="button" className={PORTAL_BTN_GHOST} onClick={() => setAll(true)}>
                  <Icon name="unfold_more" className="text-[18px]" />
                  Mở hết
                </button>
                <button type="button" className={PORTAL_BTN_GHOST} onClick={() => setAll(false)}>
                  <Icon name="unfold_less" className="text-[18px]" />
                  Thu gọn hết
                </button>
              </div>
            )}
          </div>

          {sorted.length === 0 && (
            <PortalEmpty icon="filter_alt_off" title="Không có bài tập khớp bộ lọc" description="Thử chọn trạng thái khác trong ô Lọc." />
          )}

          {groupBy === "none" && sorted.length > 0 && (
            <ul className="space-y-3">
              {sorted.map((item) => (
                <li key={item.homework.id}>
                  <HomeworkCard item={item} />
                </li>
              ))}
            </ul>
          )}

          {groupBy === "class" && sorted.length > 0 && (
            <div className="space-y-4">
              {groups.map((group) => {
                const classOpen = isClassOpen(group);
                return (
                  <section key={group.key} className={`overflow-hidden ${PORTAL_CARD}`}>
                    <button
                      type="button"
                      aria-expanded={classOpen}
                      onClick={() => toggle(group.key, classOpen)}
                      className={`flex w-full flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3.5 text-left transition-colors hover:bg-brand-tint sm:px-5 ${FOCUS_RING}`}
                    >
                      <Icon
                        name="expand_more"
                        className={`text-[22px] text-brand-navy transition-transform ${classOpen ? "" : "-rotate-90"}`}
                      />
                      <span className="text-[17px] font-bold text-brand-navy">Lớp {displayCode("class", group.classGroupId)}</span>
                      <span className="text-[14px] text-brand-muted">
                        {group.total} bài tập · {group.sessions.length} buổi
                      </span>
                      <span className="ml-auto flex flex-wrap gap-2">
                        {group.pendingCount > 0 && (
                          <StatusChip tone="amber" icon="pending_actions">
                            {group.pendingCount} chờ chấm
                          </StatusChip>
                        )}
                        {group.draftCount > 0 && (
                          <StatusChip tone="slate" icon="edit_note">
                            {group.draftCount} nháp
                          </StatusChip>
                        )}
                      </span>
                    </button>

                    {classOpen && (
                      <div className="border-t border-brand-sandLine">
                        {group.sessions.map((session) => {
                          const sessionOpen = isSessionOpen(group, session);
                          return (
                            <div key={session.key} className="border-b border-brand-sandLine/70 last:border-b-0">
                              <button
                                type="button"
                                aria-expanded={sessionOpen}
                                onClick={() => toggle(session.key, sessionOpen)}
                                className={`flex w-full items-center gap-2 py-2.5 pl-8 pr-4 text-left transition-colors hover:bg-brand-sand/60 sm:pl-10 sm:pr-5 ${FOCUS_RING}`}
                              >
                                <Icon
                                  name="expand_more"
                                  className={`text-[19px] text-brand-muted transition-transform ${sessionOpen ? "" : "-rotate-90"}`}
                                />
                                <span className="text-[14.5px] font-semibold text-brand-ink">
                                  Buổi {session.sessionNumber} — {formatDate(parseIsoDate(session.sessionDate))}
                                </span>
                                <span className="text-[13.5px] text-brand-muted">({session.items.length} bài)</span>
                                {session.pendingCount > 0 && (
                                  <span className="ml-auto">
                                    <StatusChip tone="amber" icon="pending_actions">
                                      {session.pendingCount} chờ chấm
                                    </StatusChip>
                                  </span>
                                )}
                              </button>
                              {sessionOpen && (
                                <ul className="pb-2">
                                  {session.items.map((item) => (
                                    <li key={item.homework.id}>
                                      <HomeworkRow item={item} />
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          )}
        </>
      )}
    </>
  );
}

function ToolbarSelect<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
}: {
  id: string;
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="sm:w-52">
      <label htmlFor={id} className={PORTAL_LABEL}>
        {label}
      </label>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value as T)} className={PORTAL_INPUT}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Các nhãn trạng thái của một bài */
function HomeworkChips({ item }: { item: TutorHomeworkResponse }) {
  const status = HOMEWORK_STATUS[item.homework.status];
  return (
    <div className="flex flex-wrap items-center gap-2">
      {item.submittedCount > 0 && (
        <StatusChip tone="amber" icon="pending_actions">
          {item.submittedCount} bài chờ chấm
        </StatusChip>
      )}
      {item.gradedCount > 0 && <StatusChip tone="slate">{item.gradedCount} đã chấm</StatusChip>}
      {item.homework.passwordProtected && (
        <StatusChip tone="navy" icon="key">
          Có mật khẩu
        </StatusChip>
      )}
      <StatusChip tone={status.tone} icon={status.icon}>
        {status.label}
      </StatusChip>
    </div>
  );
}

/** Một bài trong nhóm buổi: gọn, chỉ tên và hạn nộp */
function HomeworkRow({ item }: { item: TutorHomeworkResponse }) {
  const due = new Date(item.homework.dueAt);
  return (
    <Link
      to={homeworkPath(item.homework.id, "tutor")}
      className={`flex flex-col gap-2 py-2.5 pl-14 pr-4 transition-colors hover:bg-brand-tint sm:flex-row sm:items-center sm:justify-between sm:pl-[4.5rem] sm:pr-5 ${FOCUS_RING}`}
    >
      <div className="min-w-0">
        <p className="truncate text-[15px] font-bold text-brand-navy">{item.homework.title}</p>
        <p className="text-[13.5px] text-brand-muted">
          Hạn {formatDayMonth(due)} {formatClockTime(due)}
        </p>
      </div>
      <HomeworkChips item={item} />
    </Link>
  );
}

/** Thẻ đầy đủ khi không nhóm */
function HomeworkCard({ item }: { item: TutorHomeworkResponse }) {
  return (
    <Link
      to={homeworkPath(item.homework.id, "tutor")}
      className={`flex flex-col gap-3 p-4 transition-colors hover:border-brand-navy/40 sm:flex-row sm:items-center sm:justify-between sm:p-5 ${PORTAL_CARD} ${FOCUS_RING}`}
    >
      <div className="min-w-0">
        <p className="truncate text-[16px] font-bold text-brand-navy">{item.homework.title}</p>
        <p className="mt-0.5 text-[14px] text-brand-muted">
          Lớp {displayCode("class", item.classGroupId)}, buổi {item.sessionNumber} ({formatDate(parseIsoDate(item.sessionDate))}) · Hạn nộp{" "}
          {formatDateTime(item.homework.dueAt)}
        </p>
      </div>
      <HomeworkChips item={item} />
    </Link>
  );
}
