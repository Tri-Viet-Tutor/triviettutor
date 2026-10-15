import { Icon } from "@/components/ui/Icon";
import { useAdminLeaveRequests } from "@/features/admin/hooks/useAdminData";
import type { AdminUserResponse } from "@/types/api";
import { formatDate } from "@/utils/date";

const AVATAR_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-orange-500", "bg-purple-500",
  "bg-teal-500", "bg-rose-500", "bg-indigo-500", "bg-amber-500",
];

function avatarBg(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function twoLetterInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return fullName.slice(0, 2).toUpperCase();
}

const LEAVE_STATUS_LABEL: Record<string, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
};
const LEAVE_STATUS_COLOR: Record<string, string> = {
  PENDING: "text-amber-600 bg-amber-50",
  APPROVED: "text-emerald-700 bg-emerald-50",
  REJECTED: "text-red-600 bg-red-50",
};

interface StudentDetailPanelProps {
  student: AdminUserResponse;
  onClose: () => void;
}

/** Hồ sơ chi tiết học sinh — dữ liệu thực từ /admin/users và /admin/leave-requests */
export function StudentDetailPanel({ student, onClose }: StudentDetailPanelProps) {
  const leavesQuery = useAdminLeaveRequests({ requesterId: student.id, page: 0, size: 5 });
  const leaves = leavesQuery.data?.content ?? [];

  const initials = twoLetterInitials(student.fullName);
  const color = avatarBg(student.id);
  const studentCode = `HS-${String(student.id).padStart(4, "0")}`;

  return (
    <aside className="flex flex-col overflow-hidden rounded-2xl border border-brand-line bg-white shadow-soft">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-brand-line px-5 py-3.5">
        <div className="flex items-center gap-1.5">
          <Icon name="assignment_ind" className="text-[18px] text-brand-navy" />
          <span className="text-[14px] font-semibold text-brand-ink">Hồ Sơ Chi Tiết Học Sinh</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng hồ sơ"
          className="rounded-lg p-1 text-brand-muted hover:bg-brand-tint hover:text-brand-ink"
        >
          <Icon name="close" className="text-[20px]" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Avatar & tên */}
        <div className="px-5 py-5 text-center">
          <div className={`relative mx-auto flex h-16 w-16 items-center justify-center rounded-full ${color} text-[22px] font-bold text-white`}>
            {initials}
            <span className="absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400" />
          </div>
          <p className="mt-3 text-[18px] font-bold text-brand-ink">{student.fullName}</p>
          <p className="mt-0.5 text-[13px] text-brand-muted">
            {student.email} • <span className="font-medium text-brand-navy">#{studentCode}</span>
          </p>
          <span className="mt-2 inline-block rounded-full bg-emerald-100 px-3 py-1 text-[12px] font-semibold text-emerald-700">
            Học viên
          </span>
        </div>

        {/* Thông tin cơ bản */}
        <div className="grid grid-cols-2 gap-2 border-t border-brand-line px-5 py-4">
          <div className="rounded-xl bg-brand-tint px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Ngày đăng ký</p>
            <p className="mt-1 text-[14px] font-semibold text-brand-ink">
              {formatDate(new Date(student.createdAt))}
            </p>
          </div>
          <div className="rounded-xl bg-brand-tint px-3 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-brand-muted">Mã học sinh</p>
            <p className="mt-1 text-[14px] font-semibold text-brand-ink">#{studentCode}</p>
          </div>
        </div>

        {/* Lịch sử xin nghỉ */}
        <div className="border-t border-brand-line px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-muted">
              Đơn xin nghỉ gần đây
            </p>
            {leavesQuery.data && leavesQuery.data.totalElements > 0 && (
              <span className="text-[12px] text-brand-muted">
                {leavesQuery.data.totalElements} đơn
              </span>
            )}
          </div>

          {leavesQuery.isPending ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-brand-tint" />
              ))}
            </div>
          ) : leaves.length === 0 ? (
            <p className="text-[13px] text-brand-muted">Chưa có đơn xin nghỉ nào.</p>
          ) : (
            <ul className="space-y-2">
              {leaves.map((leave) => (
                <li key={leave.leaveRequestId} className="rounded-xl border border-brand-line p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-medium text-brand-ink">
                      Buổi học #{leave.sessionId}
                    </p>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${LEAVE_STATUS_COLOR[leave.status]}`}>
                      {LEAVE_STATUS_LABEL[leave.status] ?? leave.status}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-1 text-[12px] text-brand-muted">{leave.reason}</p>
                  <p className="mt-1 text-[11px] text-brand-muted">
                    {formatDate(new Date(leave.requestedAt))}
                    {leave.isLateNotice && (
                      <span className="ml-1 text-amber-600">(Trễ)</span>
                    )}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </aside>
  );
}
