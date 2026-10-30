import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { CreateTutorForm } from "@/components/admin/TutorForms";
import { UserList } from "@/components/admin/UserList";
import { useAdminUsers } from "@/hooks/useAdminData";
import { FilterTabs } from "@/components/dashboard/FilterTabs";
import { Pager } from "@/components/dashboard/Pager";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { ROLE_NAME } from "@/constants/labels";
import { PORTAL_BTN_PRIMARY, PORTAL_INPUT } from "@/constants/classNames";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { Role } from "@/interfaces/api";

/** Số người dùng mỗi trang */
const PAGE_SIZE = 20;

/** Thẻ lọc theo vai trò; chuỗi rỗng là tất cả */
const ROLE_TABS: { value: Role | ""; label: string }[] = [
  { value: "", label: "Tất cả" },
  { value: "ROLE_STUDENT", label: ROLE_NAME.ROLE_STUDENT },
  { value: "ROLE_TUTOR", label: ROLE_NAME.ROLE_TUTOR },
  { value: "ROLE_ADMIN", label: ROLE_NAME.ROLE_ADMIN },
];

/**
 * Trang Người dùng của quản trị (GET /admin/users): tìm theo họ tên / email, lọc theo vai trò,
 * thêm tài khoản gia sư (POST /admin/users/tutors), sửa hồ sơ gia sư (PUT /admin/users/{id}/tutor-profile)
 * và khóa / mở khóa tài khoản (PATCH /admin/users/{id}/status) ngay trên từng dòng.
 * Học viên tự đăng ký khi mua khóa học nên không có nút thêm học viên.
 */
export function AdminUsersPage() {
  const [role, setRole] = useState<Role | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  // Đang mở form thêm gia sư
  const [creating, setCreating] = useState(false);
  // Chờ người dùng ngừng gõ rồi mới gọi API tìm
  const keyword = useDebouncedValue(search.trim());

  const usersQuery = useAdminUsers({ ...(role ? { role } : {}), ...(keyword ? { search: keyword } : {}), page, size: PAGE_SIZE });
  const users = usersQuery.data;

  return (
    <>
      <PortalPageHeader
        icon="group"
        title="Người dùng"
        description="Học viên, gia sư và quản trị viên của trung tâm."
        action={
          !creating && (
            <button type="button" onClick={() => setCreating(true)} className={`self-start ${PORTAL_BTN_PRIMARY}`}>
              <Icon name="person_add" className="text-[19px]" />
              Thêm gia sư
            </button>
          )
        }
      />

      {creating && (
        <div className="mb-6">
          <CreateTutorForm onClose={() => setCreating(false)} />
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          label="Lọc theo vai trò"
          tabs={ROLE_TABS}
          value={role}
          onChange={(next) => {
            setRole(next);
            setPage(0);
          }}
        />
        <div className="relative sm:w-[300px]">
          <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400" />
          <input
            type="search"
            aria-label="Tìm theo họ tên hoặc email"
            placeholder="Tìm họ tên hoặc email"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(0);
            }}
            className={`pl-10 ${PORTAL_INPUT}`}
          />
        </div>
      </div>

      {usersQuery.isPending ? (
        <PortalLoading label="Đang tải người dùng" rows={5} />
      ) : usersQuery.isError || !users ? (
        <PortalError message="Không tải được danh sách người dùng." onRetry={() => void usersQuery.refetch()} />
      ) : users.content.length === 0 ? (
        <PortalEmpty
          icon="group"
          title="Không tìm thấy người dùng nào."
          description={keyword ? `Không có ai khớp với "${keyword}".` : undefined}
        />
      ) : (
        <>
          <p className="mb-2.5 text-[14px] text-brand-muted">
            <span className="font-semibold tabular-nums text-brand-ink">{users.totalElements}</span> người dùng
          </p>
          <UserList users={users.content} />
          <Pager page={page} totalPages={users.totalPages} onChange={setPage} label="Phân trang người dùng" />
        </>
      )}
    </>
  );
}
