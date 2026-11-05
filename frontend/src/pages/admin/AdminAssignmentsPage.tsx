import { useQueries } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SubstitutePanel } from "@/components/admin/SubstitutePanel";
import { TutorBoard } from "@/components/admin/TutorBoard";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { subjectIcon } from "@/constants/management";
import { adminKeys, useAdminLeaveRequests, useUserDirectory } from "@/hooks/useAdminData";
import { managementKeys } from "@/hooks/useManagementData";
import type { AdminClassesQuery, ClassStatus } from "@/interfaces/api";
import { fetchSession } from "@/services/admin";
import { fetchAdminClasses } from "@/services/managementService";
import { displayCode } from "@/utils/classes";
import { parseIsoDate, weekdayName } from "@/utils/date";
import { dayLabel, formatTimeRange } from "@/utils/sessions";
import { normalizeText } from "@/utils/text";

/** Lớp có thể có buổi cần dạy thay */
const CLASS_STATUSES: ClassStatus[] = ["ENROLLING", "ASSIGNED", "IN_PROGRESS"];

/**
 * Trang Phân công dạy thay: gia sư chính đã được chọn ngay lúc mở lớp, nên trang này chỉ lo các buổi
 * gia sư phụ trách xin nghỉ (đơn chờ duyệt của gia sư, GET /admin/leave-requests). Chọn một buổi ở bên trái,
 * bên phải hiện gia sư rảnh đúng giờ đó và lịch rảnh họ đã khai, rồi nhờ người dạy thay (SubstitutePanel).
 * Buổi đang chọn nằm ở ?don=<mã đơn>.
 */
export function AdminAssignmentsPage() {
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const { nameOf } = useUserDirectory();
  const leaves = useAdminLeaveRequests({ status: "PENDING", page: 0, size: 100 });
  // Chỉ đơn của gia sư, buổi gần nhất lên trước
  const requests = (leaves.data?.content ?? []).filter((request) => request.requesterRole === "ROLE_TUTOR");
  const sessionQueries = useQueries({
    queries: [...new Set(requests.map((request) => request.sessionId))].map((sessionId) => ({
      queryKey: adminKeys.session(sessionId),
      queryFn: () => fetchSession(sessionId),
    })),
  });
  const classQueries = useQueries({
    queries: CLASS_STATUSES.map((status) => {
      const query: AdminClassesQuery = { status, page: 0, size: 100 };
      return { queryKey: managementKeys.classes(query), queryFn: () => fetchAdminClasses(query) };
    }),
  });
  const sessionById = new Map(sessionQueries.flatMap((query) => (query.data ? [[query.data.sessionId, query.data] as const] : [])));
  const classById = new Map(classQueries.flatMap((query) => query.data?.content ?? []).map((item) => [item.id, item]));

  const items = requests
    .flatMap((request) => {
      const session = sessionById.get(request.sessionId);
      return session && session.status !== "CANCELLED" ? [{ request, session, info: classById.get(session.classGroupId) }] : [];
    })
    .sort((a, b) => `${a.session.date}${a.session.startTime}`.localeCompare(`${b.session.date}${b.session.startTime}`));
  const keyword = normalizeText(search);
  const visible = items.filter(
    ({ request, session, info }) =>
      !keyword ||
      normalizeText(`${info?.courseName ?? ""} ${displayCode("class", session.classGroupId)} ${nameOf(request.requesterId) ?? ""}`).includes(keyword),
  );
  const selectedId = Number(params.get("don")) || null;
  const selected = items.find((item) => item.request.leaveRequestId === selectedId) ?? null;
  const urgent = items.filter((item) => item.request.isLateNotice).length;
  const loading = leaves.isPending || sessionQueries.some((query) => query.isPending);
  const busyName = (tutorId: number) => nameOf(tutorId) ?? `Gia sư ${displayCode("tutor", tutorId)}`;

  return (
    <>
      <PortalPageHeader
        icon="assignment_ind"
        title="Phân công dạy thay"
        description="Buổi có gia sư xin nghỉ — chọn buổi để xem ai rảnh đúng giờ đó và nhờ dạy thay."
        action={
          !loading && (
            <dl className="flex flex-wrap gap-2">
              <div className="flex items-baseline gap-1.5 rounded-full bg-white px-3.5 py-1.5 text-brand-navy ring-1 ring-brand-sandLine">
                <dd className="text-[16px] font-extrabold tabular-nums">{items.length}</dd>
                <dt className="text-[12.5px] font-medium">buổi cần người dạy thay</dt>
              </div>
              {urgent > 0 && (
                <div className="flex items-baseline gap-1.5 rounded-full bg-orange-50 px-3.5 py-1.5 text-orange-800 ring-1 ring-orange-200">
                  <dd className="text-[16px] font-extrabold tabular-nums">{urgent}</dd>
                  <dt className="text-[12.5px] font-medium">báo gấp</dt>
                </div>
              )}
            </dl>
          )
        }
      />

      {loading ? (
        <PortalLoading label="Đang tải các buổi cần dạy thay" />
      ) : leaves.isError ? (
        <PortalError message="Không tải được đơn xin nghỉ của gia sư." onRetry={() => void leaves.refetch()} />
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-brand-navy/25 bg-white/60 px-6 py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
            <Icon name="task_alt" className="text-[34px]" />
          </span>
          <p className="mt-4 text-[17px] font-extrabold text-brand-navy">Không có buổi nào cần người dạy thay.</p>
          <p className="mt-1 max-w-md text-[14px] text-brand-muted">
            Khi gia sư phụ trách xin nghỉ một buổi, buổi đó sẽ hiện ở đây để bạn chọn người dạy thay.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
          {/* Danh sách buổi cần dạy thay */}
          <section aria-label="Buổi cần dạy thay" className="lg:sticky lg:top-24">
            <div className="flex flex-col overflow-hidden rounded-2xl border border-brand-sandLine bg-white shadow-[0_14px_34px_-26px_rgba(11,58,140,0.35)]">
              <div className="space-y-3 p-4 pb-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-[16px] font-extrabold text-brand-navy">Buổi cần dạy thay</h2>
                  <span className="text-[12.5px] text-brand-muted">{visible.length} buổi</span>
                </div>
                <label className="flex h-10 items-center gap-2 rounded-xl bg-brand-sand/70 px-3 focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-navy/30">
                  <Icon name="search" className="text-[20px] text-brand-muted" />
                  <span className="sr-only">Tìm buổi</span>
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Tên khóa, mã lớp hoặc gia sư"
                    className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-[14px] outline-none placeholder:text-slate-400 focus:ring-0"
                  />
                </label>
              </div>
              <ul className="max-h-[calc(100vh-300px)] min-h-[160px] space-y-2 overflow-y-auto px-3 pb-3">
                {visible.map(({ request, session, info }) => {
                  const active = request.leaveRequestId === selected?.request.leaveRequestId;
                  const day = parseIsoDate(session.date);
                  return (
                    <li key={request.leaveRequestId}>
                      <button
                        type="button"
                        aria-pressed={active}
                        onClick={() => setParams({ don: String(request.leaveRequestId) })}
                        className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-navy ${
                          active
                            ? "border-brand-navy bg-brand-tint/70 shadow-[0_10px_24px_-18px_rgba(11,58,140,0.8)]"
                            : "border-brand-sandLine bg-white hover:border-brand-navy/30 hover:bg-brand-sand/30"
                        }`}
                      >
                        <span
                          className={`flex w-12 shrink-0 flex-col items-center rounded-xl py-1.5 ${active ? "bg-brand-navy text-white" : "bg-brand-sand text-brand-navy"}`}
                        >
                          <span className="text-[10.5px] font-bold uppercase">{weekdayName(day, true)}</span>
                          <span className="text-[19px] font-extrabold leading-tight">{day.getDate()}</span>
                          <span className={`text-[10px] font-semibold ${active ? "text-white/75" : "text-brand-muted"}`}>Th {day.getMonth() + 1}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="flex min-w-0 items-center gap-1.5 text-[14.5px] font-bold text-brand-ink">
                              {info && <Icon name={subjectIcon(info.subject)} className="shrink-0 text-[17px] text-brand-navy/70" />}
                              <span className="truncate">{info?.courseName ?? `Lớp ${displayCode("class", session.classGroupId)}`}</span>
                            </span>
                            {request.isLateNotice && (
                              <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-[11px] font-bold text-orange-800">Gấp</span>
                            )}
                          </span>
                          <span className="mt-0.5 block text-[12.5px] text-brand-muted">
                            {dayLabel(day)} - {formatTimeRange(session)} - {displayCode("class", session.classGroupId)} - buổi {session.sessionNumber}
                          </span>
                          <span className="mt-2 flex items-center gap-1.5 border-t border-dashed border-brand-sandLine pt-2 text-[12.5px] text-brand-ink">
                            <UserAvatar userId={request.requesterId} name={busyName(request.requesterId)} size={20} />
                            <span className="truncate">
                              <strong className="font-semibold">{busyName(request.requesterId)}</strong> xin nghỉ
                            </span>
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
                {visible.length === 0 && <li className="py-6 text-center text-[13.5px] text-brand-muted">Không có buổi phù hợp.</li>}
              </ul>
            </div>
          </section>

          <section aria-label="Gia sư rảnh để dạy thay">
            {selected ? (
              // key: đổi buổi thì bỏ trạng thái (form ghi chú, thông báo) của buổi trước
              <SubstitutePanel
                key={selected.request.leaveRequestId}
                request={selected.request}
                session={selected.session}
                info={selected.info}
                busyName={busyName(selected.request.requesterId)}
              />
            ) : (
              <div className="flex flex-col items-center rounded-2xl border border-dashed border-brand-navy/25 bg-white/60 px-6 py-16 text-center">
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-tint text-brand-navy">
                  <Icon name="touch_app" className="text-[34px]" />
                </span>
                <p className="mt-4 text-[17px] font-extrabold text-brand-navy">Chọn một buổi để tìm người dạy thay.</p>
                <p className="mt-1 max-w-sm text-[14px] text-brand-muted">Gia sư trống đúng giờ của buổi đó cùng lịch rảnh họ đã khai sẽ hiện ở đây.</p>
                <button
                  type="button"
                  onClick={() => setParams({ don: String(items[0].request.leaveRequestId) })}
                  className="mt-5 inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-navy px-4 text-[14px] font-semibold text-white hover:bg-brand-navyDeep"
                >
                  Xem buổi gần nhất
                  <Icon name="arrow_forward" className="text-[18px]" />
                </button>
              </div>
            )}
          </section>
        </div>
      )}
      {/* Bảng lịch rảnh của mọi gia sư để tra nhanh ai rảnh ngày nào */}
      <TutorBoard />
    </>
  );
}
