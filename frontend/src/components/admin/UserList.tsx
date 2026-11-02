import { useMutation } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { ConfirmDialog } from "@/components/dashboard/ConfirmDialog";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY, PORTAL_INPUT, PORTAL_LABEL } from "@/constants/classNames";
import { deleteUser, updateUser } from "@/services/admin";
import { TutorProfileForm } from "@/components/admin/TutorForms";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { PORTAL_CARD } from "@/constants/classNames";
import { ROLE_NAME } from "@/constants/labels";
import type { AdminUserResponse, AdminUserStatus, Role } from "@/interfaces/api";
import type { Tone } from "@/interfaces/ui";
import { displayCode } from "@/utils/classes";
import { formatDate } from "@/utils/date";
import type { UserListProps } from "@/interfaces/admin";
import { useRefreshAdmin } from "@/hooks/useAdminData";
import { updateUserStatus } from "@/services/admin";
import { useAuthStore } from "@/stores/authStore";
import { portalErrorMessage } from "@/utils/errors";

/** Màu nhãn vai trò */
const ROLE_TONE: Record<Role, Tone> = { ROLE_STUDENT: "navy", ROLE_TUTOR: "green", ROLE_ADMIN: "amber" };
/** Mã hiển thị theo vai trò: HV003, GV012, ND001 */
const codeOf = (role: Role, id: number) => displayCode(role === "ROLE_STUDENT" ? "student" : role === "ROLE_TUTOR" ? "tutor" : "user", id);

const GRID = "lg:grid lg:grid-cols-[88px_minmax(0,1fr)_130px_130px_120px_128px] lg:items-center lg:gap-x-4";
const ICON_BTN =
  "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-brand-sandLine bg-white px-2.5 text-[13px] font-semibold text-brand-navy transition-colors hover:border-brand-navy/40 hover:bg-brand-tint focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy";

/** Form sửa họ tên / email ngay dưới dòng; gia sư có thêm phần lương và giới thiệu (TutorProfileForm) */
function EditUserPanel({ user, onClose }: { user: AdminUserResponse; onClose: () => void }) {
  const refresh = useRefreshAdmin();
  const [fullName, setFullName] = useState(user.fullName);
  const [email, setEmail] = useState(user.email);
  const [saved, setSaved] = useState(false);
  const save = useMutation({
    mutationFn: () => updateUser(user.id, { fullName: fullName.trim(), email: email.trim() }),
    onSuccess: () => {
      setSaved(true);
      void refresh();
    },
  });
  const valid = fullName.trim() !== "" && /\S+@\S+\.\S+/.test(email.trim());

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (valid) save.mutate();
  }

  return (
    <div className="border-t border-brand-sandLine bg-brand-sand/30">
      <form onSubmit={submit} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <div>
          <label htmlFor={`user-name-${user.id}`} className={PORTAL_LABEL}>
            Họ và tên
          </label>
          <input id={`user-name-${user.id}`} value={fullName} onChange={(event) => { setFullName(event.target.value); setSaved(false); }} className={PORTAL_INPUT} />
        </div>
        <div>
          <label htmlFor={`user-email-${user.id}`} className={PORTAL_LABEL}>
            Email
          </label>
          <input id={`user-email-${user.id}`} type="email" value={email} onChange={(event) => { setEmail(event.target.value); setSaved(false); }} className={PORTAL_INPUT} />
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className={PORTAL_BTN_SECONDARY}>
            Đóng
          </button>
          <button type="submit" disabled={!valid || save.isPending} className={PORTAL_BTN_PRIMARY}>
            {save.isPending ? "Đang lưu…" : "Lưu"}
          </button>
        </div>
        {(saved || save.error) && (
          <div className="sm:col-span-3">
            {saved ? (
              <AuthNotice tone="success">Đã lưu thông tin tài khoản.</AuthNotice>
            ) : (
              <AuthNotice tone="error">{portalErrorMessage(save.error, "Chưa lưu được. Vui lòng thử lại.")}</AuthNotice>
            )}
          </div>
        )}
      </form>
      {user.role === "ROLE_TUTOR" && <TutorProfileForm tutor={user} onClose={onClose} />}
    </div>
  );
}

/** Nhãn và màu trạng thái tài khoản */
const STATUS_LABEL: Record<AdminUserStatus, { label: string; tone: Tone }> = {
  ACTIVE: { label: "Hoạt động", tone: "green" },
  LOCKED: { label: "Đã khóa", tone: "red" },
  UNVERIFIED: { label: "Chưa kích hoạt", tone: "slate" },
};

/** Nút khóa / mở khóa một tài khoản (PATCH /admin/users/{id}/status), hỏi lại bằng hộp xác nhận */
function LockToggle({ user }: { user: AdminUserResponse }) {
  const refresh = useRefreshAdmin();
  const [asking, setAsking] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setAsking(true)}
        title={user.locked ? "Mở khóa" : "Khóa"}
        aria-label={user.locked ? `Mở khóa ${user.fullName}` : `Khóa ${user.fullName}`}
        className={`${ICON_BTN} w-9 px-0`}
      >
        <Icon name={user.locked ? "lock_open" : "lock"} className="text-[18px]" />
      </button>
      <ConfirmDialog
        open={asking}
        tone={user.locked ? "primary" : "danger"}
        icon={user.locked ? "lock_open" : "lock"}
        title={user.locked ? "Mở khóa tài khoản?" : "Khóa tài khoản?"}
        message={
          user.locked ? (
            <>
              <strong className="text-brand-ink">{user.fullName}</strong> ({user.email}) sẽ đăng nhập lại được bình thường.
            </>
          ) : (
            <>
              <strong className="text-brand-ink">{user.fullName}</strong> ({user.email}) sẽ không đăng nhập được và phiên đang dùng
              bị đăng xuất.
            </>
          )
        }
        confirmLabel={user.locked ? "Mở khóa" : "Khóa tài khoản"}
        pendingLabel="Đang lưu…"
        onClose={() => setAsking(false)}
        onConfirm={async () => {
          await updateUserStatus(user.id, { locked: !user.locked });
          void refresh();
        }}
      />
    </>
  );
}

/**
 * Bảng người dùng của khu quản trị: mã theo vai trò, ảnh + họ tên + email, vai trò, trạng thái, ngày tạo và thao tác
 * Chỉnh sửa (họ tên, email; gia sư thêm lương / giới thiệu), Khóa / mở khóa và Xóa (chỉ tài khoản chưa có dữ liệu).
 * Không khóa hay xóa chính mình.
 */
export function UserList({ users }: UserListProps) {
  const me = useAuthStore((state) => state.user?.id);
  const refresh = useRefreshAdmin();
  // Người đang mở form chỉnh sửa (mỗi lúc chỉ mở một) và người đang chờ xác nhận xóa
  const [editingId, setEditingId] = useState<number | null>(null);
  const [removing, setRemoving] = useState<AdminUserResponse | null>(null);

  return (
    <div className={`overflow-hidden ${PORTAL_CARD}`}>
      {/* Hàng tiêu đề cột — chỉ hiện ở màn hình rộng */}
      <div
        aria-hidden="true"
        className={`hidden border-b border-brand-sandLine bg-brand-sand/60 px-5 py-3 text-[12px] font-bold uppercase tracking-wide text-brand-muted ${GRID}`}
      >
        <span>Mã</span>
        <span>Người dùng</span>
        <span>Vai trò</span>
        <span>Trạng thái</span>
        <span>Ngày tạo</span>
        <span className="text-right">Thao tác</span>
      </div>
      <ul className="divide-y divide-brand-sandLine">
        {users.map((user) => {
          const editing = editingId === user.id;
          return (
            <li key={user.id} className={editing ? "bg-brand-tint/30" : "transition-colors hover:bg-brand-sand/30"}>
              <div className={`flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3 sm:px-5 ${GRID}`}>
                <span className="order-2 rounded-md bg-brand-sand px-2 py-0.5 font-mono text-[12px] font-bold text-brand-muted lg:order-none lg:justify-self-start">
                  {codeOf(user.role, user.id)}
                </span>
                <div className="order-1 flex min-w-0 flex-1 basis-full items-center gap-3 lg:order-none lg:basis-auto">
                  <UserAvatar userId={user.id} name={user.fullName} size={38} />
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-bold text-brand-ink">{user.fullName}</p>
                    <p className="truncate text-[13px] text-brand-muted">{user.email}</p>
                  </div>
                </div>
                <span className="order-2 lg:order-none">
                  <StatusChip tone={ROLE_TONE[user.role]}>{ROLE_NAME[user.role]}</StatusChip>
                </span>
                <span className="order-2 lg:order-none">
                  <StatusChip tone={STATUS_LABEL[user.status].tone}>{STATUS_LABEL[user.status].label}</StatusChip>
                </span>
                <span className="order-2 text-[13.5px] tabular-nums text-brand-muted lg:order-none">
                  <span className="lg:hidden">Tạo ngày </span>
                  {formatDate(new Date(user.createdAt))}
                </span>
                <div className="order-3 flex basis-full flex-wrap justify-end gap-1.5 lg:order-none lg:basis-auto lg:flex-nowrap">
                  <button
                    type="button"
                    aria-expanded={editing}
                    onClick={() => setEditingId(editing ? null : user.id)}
                    title={editing ? "Đóng" : "Chỉnh sửa"}
                    aria-label={editing ? `Đóng chỉnh sửa ${user.fullName}` : `Chỉnh sửa ${user.fullName}`}
                    className={`${ICON_BTN} w-9 px-0 ${editing ? "border-brand-navy bg-brand-navy text-white hover:bg-brand-navyDeep" : ""}`}
                  >
                    <Icon name={editing ? "close" : "edit"} className="text-[18px]" />
                  </button>
                  {user.id !== me && <LockToggle user={user} />}
                  {user.id !== me && (
                    <button
                      type="button"
                      onClick={() => setRemoving(user)}
                      title="Xóa"
                      aria-label={`Xóa ${user.fullName}`}
                      className={`${ICON_BTN} w-9 px-0 text-red-700 hover:border-red-300 hover:bg-red-50`}
                    >
                      <Icon name="delete" className="text-[18px]" />
                    </button>
                  )}
                </div>
              </div>
              {editing && <EditUserPanel user={user} onClose={() => setEditingId(null)} />}
            </li>
          );
        })}
      </ul>
      <ConfirmDeleteDialog
        open={removing !== null}
        title="Xóa người dùng"
        message={
          removing
            ? `Xóa tài khoản ${removing.fullName} (${removing.email})? Chỉ xóa được tài khoản chưa có lớp học, thanh toán, ví hay buổi dạy.`
            : ""
        }
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          await deleteUser(removing.id);
          setRemoving(null);
          void refresh();
        }}
      />
    </div>
  );
}
