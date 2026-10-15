import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useAdminProfiles, type AdminProfilesQuery } from "@/features/admin/api/adminProfileApi";
import { FilterTabs } from "@/features/portal/components/FilterTabs";
import { Pager } from "@/features/portal/components/Pager";
import { PortalPageHeader } from "@/features/portal/components/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/features/portal/components/PortalState";
import { ROLE_NAME } from "@/features/portal/data/labels";
import { nameInitial } from "@/features/portal/data/sessions";
import { PORTAL_CARD, PORTAL_INPUT } from "@/features/portal/data/ui";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { MeResponse } from "@/types/api";
import { formatVnd } from "@/utils/currency";
import { formatDate } from "@/utils/date";

const PAGE_SIZE = 20;

type ProfileRole = AdminProfilesQuery["role"];

const ROLE_TABS: { value: ProfileRole; label: string }[] = [
  { value: "ROLE_TUTOR", label: ROLE_NAME.ROLE_TUTOR },
  { value: "ROLE_STUDENT", label: ROLE_NAME.ROLE_STUDENT },
];

const EMPTY = "Chưa có";

function money(value: number | null | undefined): string {
  return typeof value === "number" ? formatVnd(value) : EMPTY;
}

function text(value: string | null | undefined): string {
  return value && value.trim() ? value : EMPTY;
}

function Field({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-[12.5px] font-semibold uppercase tracking-wide text-brand-muted">{label}</dt>
      <dd className={`mt-0.5 whitespace-pre-line text-[14.5px] ${value === EMPTY ? "text-slate-400" : "text-brand-ink"}`}>{value}</dd>
    </div>
  );
}

/** Thẻ hồ sơ đầy đủ của một gia sư hoặc học viên */
function ProfileCard({ user }: { user: MeResponse }) {
  const isTutor = user.role === "ROLE_TUTOR";
  return (
    <li className={`overflow-hidden ${PORTAL_CARD}`}>
      <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
        <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-navy text-[18px] font-bold text-white">
          {nameInitial(user.fullName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-bold text-brand-ink">{user.fullName}</p>
          <p className="truncate text-[13.5px] text-brand-muted">{user.email}</p>
        </div>
        <span className="shrink-0 text-[13px] tabular-nums text-brand-muted">#{user.id}</span>
      </div>
      <dl className="grid gap-x-6 gap-y-3 px-5 py-4 sm:grid-cols-2">
        <Field label="Vai trò" value={ROLE_NAME[user.role]} />
        <Field label="Ngày tạo tài khoản" value={formatDate(new Date(user.createdAt))} />
        {isTutor ? (
          <>
            <Field label="Lương cơ bản" value={money(user.profile?.baseSalary)} />
            <Field label="Thù lao mỗi buổi" value={money(user.profile?.sessionRate)} />
            <Field label="Giới thiệu" value={text(user.profile?.bio)} wide />
          </>
        ) : (
          <>
            <Field label="Số điện thoại" value={text(user.profile?.phone)} />
            <Field label="Địa chỉ" value={text(user.profile?.address)} />
          </>
        )}
      </dl>
    </li>
  );
}

/**
 * Trang Hồ sơ của quản trị viên (GET /admin/profiles): xem toàn bộ thông tin hồ sơ
 * của gia sư và học viên thay vì hồ sơ của chính tài khoản quản trị.
 */
export function AdminProfilesPage() {
  const [role, setRole] = useState<ProfileRole>("ROLE_TUTOR");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const keyword = useDebouncedValue(search.trim());

  const query = useAdminProfiles({ role, ...(keyword ? { search: keyword } : {}), page, size: PAGE_SIZE });
  const profiles = query.data;
  const roleName = ROLE_NAME[role].toLowerCase();

  return (
    <>
      <PortalPageHeader title="Hồ sơ" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <FilterTabs
          label="Chọn loại hồ sơ"
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

      {query.isPending ? (
        <PortalLoading label="Đang tải hồ sơ" rows={4} />
      ) : query.isError || !profiles ? (
        <PortalError message="Không tải được hồ sơ." onRetry={() => void query.refetch()} />
      ) : profiles.content.length === 0 ? (
        <PortalEmpty
          icon="badge"
          title={`Không có hồ sơ ${roleName} nào`}
          description={keyword ? `Không có ai khớp với "${keyword}".` : undefined}
        />
      ) : (
        <>
          <p className="mb-2.5 text-[14px] text-brand-muted">
            <span className="font-semibold tabular-nums text-brand-ink">{profiles.totalElements}</span> {roleName}
          </p>
          <ul className="grid gap-4 xl:grid-cols-2">
            {profiles.content.map((user) => (
              <ProfileCard key={user.id} user={user} />
            ))}
          </ul>
          <Pager page={page} totalPages={profiles.totalPages} onChange={setPage} label="Phân trang hồ sơ" />
        </>
      )}
    </>
  );
}
