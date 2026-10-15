import { ROUTES } from "@/constants/routes";
import { AdminTodoPanel } from "@/components/admin/AdminTodoPanel";
import type { TodoTile } from "@/interfaces/admin";
import { PendingLeaveList } from "@/components/admin/PendingLeaveList";
import { useAdminLeaveRequests, useAdminSessions, useUserCounts } from "@/hooks/useAdminData";
import { PortalGreeting } from "@/components/dashboard/PortalGreeting";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import type { SummaryRow } from "@/interfaces/ui";
import { UpcomingList } from "@/components/dashboard/UpcomingList";
import { formatLongDate, givenName } from "@/utils/sessions";
import { useAuthStore } from "@/stores/authStore";
import { startOfToday, toIsoDate } from "@/utils/date";

/** Số buổi học hiện ở trang Tổng quan */
const UPCOMING_PREVIEW = 6;
/** Số đơn chờ duyệt hiện ở trang Tổng quan */
const PENDING_PREVIEW = 4;

/** Số đếm dạng chữ; "…" khi chưa tải xong */
function countText(count: number | undefined): string {
  return count === undefined ? "…" : String(count);
}

/**
 * Trang Tổng quan của quản trị: việc cần xử lý (đơn chờ duyệt, buổi chờ xếp lại lịch, buổi học hôm nay),
 * các buổi học từ hôm nay, đơn xin nghỉ mới và số người dùng theo vai trò.
 * Dữ liệu từ GET /admin/leave-requests, /admin/sessions và /admin/users.
 */
export function AdminHomePage() {
  const user = useAuthStore((state) => state.user);
  const today = startOfToday();
  const todayIso = toIsoDate(today);

  // Chỉ cần totalElements nên các truy vấn đếm lấy size nhỏ
  const pendingLeave = useAdminLeaveRequests({ status: "PENDING", page: 0, size: PENDING_PREVIEW });
  const toReschedule = useAdminSessions({ status: "PENDING_RESCHEDULE", page: 0, size: 1 });
  const todaySessions = useAdminSessions({ from: todayIso, to: todayIso, page: 0, size: 1 });
  const upcoming = useAdminSessions({ from: todayIso, page: 0, size: UPCOMING_PREVIEW });
  const counts = useUserCounts();

  const fullName = user?.fullName ?? "bạn";
  // Ba ô "Việc cần xử lý"; "tu=" rỗng nghĩa là xem cả các buổi đã qua
  const tiles: TodoTile[] = [
    {
      to: ROUTES.adminReschedules,
      icon: "event_busy",
      label: "Đơn xin nghỉ chờ duyệt",
      count: pendingLeave.data?.totalElements,
      actionable: true,
    },
    {
      to: `${ROUTES.adminSessions}?trangthai=PENDING_RESCHEDULE&tu=`,
      icon: "pending",
      label: "Buổi chờ xếp lại lịch",
      count: toReschedule.data?.totalElements,
      actionable: true,
    },
    {
      to: `${ROUTES.adminSessions}?tu=${todayIso}&den=${todayIso}`,
      icon: "today",
      label: "Buổi học hôm nay",
      count: todaySessions.data?.totalElements,
      actionable: false,
    },
  ];
  // Số người dùng theo vai trò
  const rows: SummaryRow[] = [
    {
      icon: "school",
      iconClassName: "text-[#1F63D8]",
      label: "Học viên",
      value: countText(counts.ROLE_STUDENT),
      valueClassName: "text-[#1F63D8]",
    },
    {
      icon: "co_present",
      iconClassName: "text-emerald-600",
      label: "Gia sư",
      value: countText(counts.ROLE_TUTOR),
      valueClassName: "text-emerald-600",
    },
    {
      icon: "shield_person",
      iconClassName: "text-brand-orange",
      label: "Quản trị viên",
      value: countText(counts.ROLE_ADMIN),
      valueClassName: "text-brand-orangeHover",
    },
  ];

  return (
    <>
      <PortalGreeting fullName={fullName} name={givenName(fullName)} description={formatLongDate(today)} />

      <div className="grid grid-cols-1 items-start gap-x-8 gap-y-7 lg:grid-cols-12">
        <div className="space-y-7 lg:col-span-8">
          <AdminTodoPanel name={givenName(fullName)} tiles={tiles} />
          <UpcomingList
            title="Buổi học từ hôm nay"
            sessions={upcoming.data?.content ?? []}
            today={today}
            scheduleTo={ROUTES.adminSessions}
            emptyText={
              upcoming.isError ? "Không tải được buổi học." : upcoming.isPending ? "Đang tải…" : "Chưa có buổi học nào được xếp từ hôm nay."
            }
          />
        </div>

        <div className="space-y-7 lg:col-span-4">
          <SummaryCard id="user-summary-title" title="Người dùng" linkLabel="Xem danh sách" linkTo={ROUTES.adminUsers} rows={rows} />
          <PendingLeaveList requests={pendingLeave.data?.content} isError={pendingLeave.isError} />
        </div>
      </div>
    </>
  );
}
