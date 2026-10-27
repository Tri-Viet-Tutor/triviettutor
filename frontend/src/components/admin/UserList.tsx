import { useState } from "react";
import { TutorProfileForm } from "@/components/admin/TutorForms";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { PORTAL_BTN_SECONDARY, PORTAL_CARD } from "@/constants/classNames";
import { ROLE_NAME } from "@/constants/labels";
import type { Role } from "@/interfaces/api";
import type { Tone } from "@/interfaces/ui";
import { formatDate } from "@/utils/date";
import type { UserListProps } from "@/interfaces/admin";

/** Màu nhãn vai trò */
const ROLE_TONE: Record<Role, Tone> = { ROLE_STUDENT: "navy", ROLE_TUTOR: "green", ROLE_ADMIN: "amber" };

/** Danh sách người dùng của khu quản trị; dòng của gia sư có nút mở form sửa hồ sơ ngay bên dưới. */
export function UserList({ users }: UserListProps) {
  // Gia sư đang mở form sửa hồ sơ (mỗi lúc chỉ mở một)
  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <div className={`overflow-hidden ${PORTAL_CARD}`}>
      {/* Hàng tiêu đề cột — chỉ hiện ở màn hình rộng, nơi các cột có độ rộng cố định và thẳng hàng */}
      <div
        aria-hidden="true"
        className="hidden items-center gap-x-4 border-b border-brand-sandLine bg-brand-sand/70 px-5 py-3 text-[12.5px] font-bold uppercase tracking-wide text-brand-muted lg:flex"
      >
        <span className="w-[52px] shrink-0">Mã</span>
        <span className="min-w-0 flex-1">Người dùng</span>
        <div className="flex items-center gap-x-3">
          <span className="w-[118px]">Vai trò</span>
          <span className="w-[150px]">Ngày tạo</span>
          <span className="w-[104px] text-right">Thao tác</span>
        </div>
      </div>
      <ul className="divide-y divide-brand-sandLine">
        {users.map((user) => {
          const editing = editingId === user.id;
          return (
            <li key={user.id}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 sm:px-5">
                <span className="w-10 shrink-0 text-[13.5px] font-semibold tabular-nums text-brand-muted lg:w-[52px]">{user.id}</span>
                <div className="min-w-0 flex-1 basis-[180px]">
                  <p className="truncate text-[15.5px] font-semibold text-brand-ink">{user.fullName}</p>
                  <p className="truncate text-[14px] text-brand-muted">{user.email}</p>
                </div>
                {/* Màn hình rộng: ba cột rộng cố định để các dòng thẳng hàng */}
                <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <span className="lg:w-[118px]">
                    <StatusChip tone={ROLE_TONE[user.role]}>{ROLE_NAME[user.role]}</StatusChip>
                  </span>
                  <span className="text-[13.5px] tabular-nums text-brand-muted lg:w-[150px]">
                    Tạo ngày {formatDate(new Date(user.createdAt))}
                  </span>
                  <span className="lg:w-[104px] lg:text-right">
                    {user.role === "ROLE_TUTOR" && (
                      <button
                        type="button"
                        aria-expanded={editing}
                        onClick={() => setEditingId(editing ? null : user.id)}
                        className={PORTAL_BTN_SECONDARY}
                      >
                        {editing ? "Đóng" : "Sửa hồ sơ"}
                      </button>
                    )}
                  </span>
                </div>
              </div>
              {editing && <TutorProfileForm tutor={user} onClose={() => setEditingId(null)} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
