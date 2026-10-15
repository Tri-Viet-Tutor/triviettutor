import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { ProfileForm } from "@/components/dashboard/ProfileForm";
import { PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { ROLE_NAME } from "@/constants/labels";
import { nameInitial } from "@/utils/sessions";
import { PORTAL_CARD } from "@/constants/classNames";
import { useMe } from "@/hooks/usePortalData";
import { formatVnd } from "@/utils/currency";
import { formatDate } from "@/utils/date";

/**
 * Trang Hồ sơ dùng chung cho ba khu (GET / PUT /me): xem và sửa thông tin của chính mình.
 * Gia sư thấy thêm lương cơ bản và thù lao mỗi buổi — hai số này chỉ quản trị viên sửa được.
 */
export function ProfilePage() {
  const meQuery = useMe();
  const me = meQuery.data;

  return (
    <>
      <PortalPageHeader title="Hồ sơ" />

      {meQuery.isPending ? (
        <PortalLoading label="Đang tải hồ sơ" />
      ) : meQuery.isError || !me ? (
        <PortalError message="Không tải được hồ sơ." onRetry={() => void meQuery.refetch()} />
      ) : (
        <div className={`max-w-2xl overflow-hidden ${PORTAL_CARD}`}>
          <div className="flex items-center gap-4 bg-brand-navy px-5 py-5 text-white sm:px-7">
            <span
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white text-[24px] font-bold text-brand-navy"
            >
              {nameInitial(me.fullName)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[19px] font-bold leading-tight">{me.fullName}</p>
              <p className="mt-0.5 text-[14px] text-white/80">
                {ROLE_NAME[me.role]} từ {formatDate(new Date(me.createdAt))}
              </p>
            </div>
          </div>

          {/* Gia sư: lương và thù lao (chỉ xem, quản trị sửa) */}
          {me.role === "ROLE_TUTOR" && (
            <dl className="grid grid-cols-2 divide-x divide-slate-200 border-b border-slate-200 text-center">
              <div className="px-3 py-4">
                <dt className="text-[13.5px] text-brand-muted">Lương cơ bản</dt>
                <dd className="mt-0.5 text-[17px] font-bold text-brand-navy">
                  {typeof me.profile?.baseSalary === "number" ? formatVnd(me.profile.baseSalary) : "Chưa có"}
                </dd>
              </div>
              <div className="px-3 py-4">
                <dt className="text-[13.5px] text-brand-muted">Thù lao mỗi buổi</dt>
                <dd className="mt-0.5 text-[17px] font-bold text-brand-navy">
                  {typeof me.profile?.sessionRate === "number" ? formatVnd(me.profile.sessionRate) : "Chưa có"}
                </dd>
              </div>
            </dl>
          )}

          <div className="px-5 py-6 sm:px-7">
            <ProfileForm me={me} />
          </div>
        </div>
      )}
    </>
  );
}
