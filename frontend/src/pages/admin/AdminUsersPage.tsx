import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { StudentDetailPanel } from "@/features/admin/components/StudentDetailPanel";
import { CreateTutorForm } from "@/features/admin/components/TutorForms";
import { UserList } from "@/features/admin/components/UserList";
import { useAdminUsers } from "@/features/admin/hooks/useAdminData";
import { FilterTabs } from "@/features/portal/components/FilterTabs";
import { Pager } from "@/features/portal/components/Pager";
import { PortalPageHeader } from "@/features/portal/components/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/features/portal/components/PortalState";
import { ROLE_NAME } from "@/features/portal/data/labels";
import { PORTAL_BTN_PRIMARY, PORTAL_INPUT } from "@/features/portal/data/ui";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { AdminUserResponse, Role } from "@/types/api";
import { formatDate } from "@/utils/date";

const PAGE_SIZE = 20;

const ROLE_TABS: { value: Role | ""; label: string }[] = [
  { value: "", label: "Tất cả" },
  { value: "ROLE_STUDENT", label: ROLE_NAME.ROLE_STUDENT },
  { value: "ROLE_TUTOR", label: ROLE_NAME.ROLE_TUTOR },
];

const AVATAR_COLORS = [
  "bg-blue-500", "bg-emerald-500", "bg-orange-500", "bg-purple-500",
  "bg-teal-500", "bg-rose-500", "bg-indigo-500", "bg-amber-500",
];

function avatarBg(id: number) {
  return AVATAR_COLORS[id % AVATAR_COLORS.length];
}

function twoInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return fullName.slice(0, 2).toUpperCase();
}

/** Hàng học sinh trong bảng danh sách */
function StudentRow({
  student,
  selected,
  onClick,
}: {
  student: AdminUserResponse;
  selected: boolean;
  onClick: () => void;
}) {
  const code = `HS-${String(student.id).padStart(4, "0")}`;
  const color = avatarBg(student.id);

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-brand-tint sm:px-5 ${
          selected ? "border-l-[3px] border-brand-navy bg-brand-tint" : "border-l-[3px] border-transparent"
        }`}
      >
        {/* Avatar */}
        <span className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${color} text-[14px] font-bold text-white`}>
          {twoInitials(student.fullName)}
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-400" />
        </span>

        {/* Tên & email */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-semibold text-brand-ink">{student.fullName}</p>
          <p className="truncate text-[12.5px] text-brand-muted">
            {student.email} • <span className="font-medium text-brand-navy">#{code}</span>
          </p>
        </div>

        {/* Ngày đăng ký */}
        <span className="hidden shrink-0 text-[12.5px] tabular-nums text-brand-muted sm:block">
          {formatDate(new Date(student.createdAt))}
        </span>

        <Icon name="chevron_right" className="shrink-0 text-[18px] text-slate-400" />
      </button>
    </li>
  );
}

/** Giao diện quản lý học sinh — tách riêng với bảng + panel chi tiết bên phải */
function StudentManagementView() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedStudent, setSelectedStudent] = useState<AdminUserResponse | null>(null);
  const keyword = useDebouncedValue(search.trim());

  const query = useAdminUsers({
    role: "ROLE_STUDENT",
    ...(keyword ? { search: keyword } : {}),
    page,
    size: PAGE_SIZE,
  });
  const users = query.data;

  function handleSelect(student: AdminUserResponse) {
    setSelectedStudent((prev) => (prev?.id === student.id ? null : student));
  }

  return (
    <>
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[26px] font-bold text-brand-ink">Quản Lý Học Sinh</h1>
            {users && (
              <span className="rounded-full bg-brand-navy px-3 py-1 text-[13px] font-semibold text-white">
                Tổng số: {users.totalElements.toLocaleString("vi-VN")} học sinh
              </span>
            )}
          </div>
          <p className="mt-1 text-[14px] text-brand-muted">
            Theo dõi hồ sơ và lịch sử hoạt động của học sinh trong hệ thống
          </p>
        </div>
      </div>

      {/* Thanh tìm kiếm */}
      <div className="mb-4 relative">
        <Icon
          name="search"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400"
        />
        <input
          type="search"
          aria-label="Tìm kiếm học sinh theo tên hoặc email"
          placeholder="Tìm kiếm học sinh theo tên, email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
            setSelectedStudent(null);
          }}
          className={`pl-10 ${PORTAL_INPUT}`}
        />
      </div>

      {/* Nội dung chính: danh sách + panel */}
      <div className="flex items-start gap-5">
        {/* Danh sách học sinh */}
        <div className={`min-w-0 flex-1 ${selectedStudent ? "lg:max-w-[calc(100%-380px)]" : ""}`}>
          {query.isPending ? (
            <PortalLoading label="Đang tải học sinh" rows={6} />
          ) : query.isError || !users ? (
            <PortalError message="Không tải được danh sách học sinh." onRetry={() => void query.refetch()} />
          ) : users.content.length === 0 ? (
            <PortalEmpty
              icon="school"
              title="Không tìm thấy học sinh"
              description={keyword ? `Không có ai khớp với "${keyword}".` : undefined}
            />
          ) : (
            <>
              {/* Tiêu đề cột */}
              <div className="mb-1 hidden grid-cols-[1fr_auto] items-center gap-3 px-5 sm:grid">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-brand-muted">Học sinh</span>
                <span className="text-[11px] font-semibold uppercase tracking-widest text-brand-muted">Ngày đăng ký</span>
              </div>

              <ul className="overflow-hidden rounded-2xl border border-brand-line bg-white shadow-soft divide-y divide-brand-line">
                {users.content.map((student) => (
                  <StudentRow
                    key={student.id}
                    student={student}
                    selected={selectedStudent?.id === student.id}
                    onClick={() => handleSelect(student)}
                  />
                ))}
              </ul>

              <div className="mt-2 text-[13px] text-brand-muted">
                Hiển thị {page * PAGE_SIZE + 1} – {Math.min((page + 1) * PAGE_SIZE, users.totalElements)} trong tổng số{" "}
                <span className="font-semibold text-brand-ink">{users.totalElements.toLocaleString("vi-VN")}</span> học sinh
              </div>

              <Pager page={page} totalPages={users.totalPages} onChange={(p) => { setPage(p); setSelectedStudent(null); }} label="Phân trang học sinh" />
            </>
          )}
        </div>

        {/* Panel chi tiết — hiện khi chọn học sinh */}
        {selectedStudent && (
          <div className="hidden w-[360px] shrink-0 lg:block">
            <StudentDetailPanel
              student={selectedStudent}
              onClose={() => setSelectedStudent(null)}
            />
          </div>
        )}
      </div>

      {/* Panel chi tiết trên mobile — hiện bên dưới danh sách */}
      {selectedStudent && (
        <div className="mt-5 lg:hidden">
          <StudentDetailPanel
            student={selectedStudent}
            onClose={() => setSelectedStudent(null)}
          />
        </div>
      )}
    </>
  );
}

/**
 * Trang Người dùng của quản trị (GET /admin/users): tìm theo họ tên / email, lọc theo vai trò,
 * thêm tài khoản gia sư (POST /admin/users/tutors) và sửa hồ sơ gia sư (PUT /admin/users/{id}/tutor-profile).
 */
export function AdminUsersPage() {
  const [role, setRole] = useState<Role | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const keyword = useDebouncedValue(search.trim());

  // Học sinh có giao diện riêng
  if (role === "ROLE_STUDENT") {
    return (
      <>
        {/* Tab lọc vai trò — giữ nguyên */}
        <div className="mb-5">
          <FilterTabs
            label="Lọc theo vai trò"
            tabs={ROLE_TABS}
            value={role}
            onChange={(next) => {
              setRole(next);
              setPage(0);
            }}
          />
        </div>
        <StudentManagementView />
      </>
    );
  }

  // Gia sư và quản trị viên — giao diện cũ
  const usersQuery = useAdminUsers({ ...(role ? { role } : {}), ...(keyword ? { search: keyword } : {}), page, size: PAGE_SIZE });
  const users = usersQuery.data;

  return (
    <>
      <PortalPageHeader
        title="Người dùng"
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
        <PortalEmpty icon="group" title="Không tìm thấy người dùng nào" description={keyword ? `Không có ai khớp với "${keyword}".` : undefined} />
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
