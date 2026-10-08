import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import type { ApiResponse } from "@/lib/auth";
import { useAuthStore, type AuthUser } from "@/stores/authStore";

interface MyProfile extends AuthUser {
  profile: { phone?: string; address?: string; bio?: string } | null;
}

export function AccountDashboard() {
  const userId = useAuthStore((s) => s.user?.id);
  const { data: me, isPending, isError, refetch } = useQuery({
    queryKey: ["me", userId],
    queryFn: async () => (await api.get<ApiResponse<MyProfile>>("/me")).data.data,
  });

  if (isPending) return <p role="status">Đang tải hồ sơ...</p>;
  if (isError || !me) return (
    <div role="alert">
      <p>Không thể tải hồ sơ. Vui lòng thử lại.</p>
      <button className="mt-3 text-primary-600 underline" onClick={() => void refetch()}>Thử lại</button>
    </div>
  );

  const schedulePath = me.role === "ROLE_ADMIN" ? "/admin/sessions"
    : me.role === "ROLE_TUTOR" ? "/tutor/sessions" : "/student/schedule";

  return (
    <section className="max-w-3xl space-y-6">
      <h1 className="text-2xl font-semibold">Xin chào, {me.fullName}</h1>
      <dl className="space-y-3 rounded-lg border bg-white p-6">
        <div><dt className="text-sm text-gray-500">Email</dt><dd>{me.email}</dd></div>
        <div><dt className="text-sm text-gray-500">Vai trò</dt><dd>
          {me.role === "ROLE_ADMIN" ? "Quản trị viên" : me.role === "ROLE_TUTOR" ? "Gia sư" : "Học viên"}
        </dd></div>
        {me.profile?.phone && <div><dt className="text-sm text-gray-500">Điện thoại</dt><dd>{me.profile.phone}</dd></div>}
        {me.profile?.address && <div><dt className="text-sm text-gray-500">Địa chỉ</dt><dd>{me.profile.address}</dd></div>}
        {me.profile?.bio && <div><dt className="text-sm text-gray-500">Giới thiệu</dt><dd>{me.profile.bio}</dd></div>}
      </dl>
      <Link className="inline-block rounded-lg bg-primary-600 px-4 py-2 text-white" to={schedulePath}>
        Xem lịch học
      </Link>
    </section>
  );
}
