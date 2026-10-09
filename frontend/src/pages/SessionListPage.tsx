import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ApiResponse } from "@/lib/auth";
import { useAuthStore } from "@/stores/authStore";

interface Session {
  sessionId: number;
  classGroupId: number;
  sessionNumber: number;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
}

interface SessionPage {
  content: Session[];
  totalPages: number;
}

const statusLabels: Record<string, string> = {
  SCHEDULED: "Đã lên lịch", IN_SESSION: "Đang học", COMPLETED: "Hoàn thành",
  PENDING_RESCHEDULE: "Chờ xếp lịch", CANCELLED: "Đã hủy",
};

export function SessionListPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "ROLE_ADMIN";
  const [page, setPage] = useState(0);
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["sessions", user?.id, user?.role, page],
    queryFn: async () => {
      if (isAdmin) {
        const response = await api.get<ApiResponse<SessionPage>>("/admin/sessions", { params: { page, size: 20 } });
        return { sessions: response.data.data.content, totalPages: response.data.data.totalPages };
      }
      const response = await api.get<ApiResponse<Session[]>>("/me/sessions");
      return { sessions: response.data.data, totalPages: 1 };
    },
  });

  return (
    <section className="space-y-5">
      <h1 className="text-2xl font-semibold">Lịch học</h1>
      {isPending ? <p role="status">Đang tải lịch học...</p> : isError ? (
        <div role="alert"><p>Không thể tải lịch học.</p>
          <button className="mt-3 text-primary-600 underline" onClick={() => void refetch()}>Thử lại</button>
        </div>
      ) : !data?.sessions.length ? <p>Chưa có buổi học nào.</p> : (
        <div className="overflow-x-auto rounded-lg border bg-white">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Danh sách buổi học</caption>
            <thead className="bg-gray-50"><tr>
              <th scope="col" className="p-3">Lớp</th><th scope="col" className="p-3">Buổi</th>
              <th scope="col" className="p-3">Ngày</th><th scope="col" className="p-3">Giờ</th>
              <th scope="col" className="p-3">Trạng thái</th>
            </tr></thead>
            <tbody>{data.sessions.map((session) => (
              <tr className="border-t" key={session.sessionId}>
                <td className="p-3">#{session.classGroupId}</td><td className="p-3">{session.sessionNumber}</td>
                <td className="p-3">{session.date.split("-").reverse().join("/")}</td>
                <td className="p-3">{session.startTime.slice(0, 5)} – {session.endTime.slice(0, 5)}</td>
                <td className="p-3">{statusLabels[session.status] || session.status}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {isAdmin && data && data.totalPages > 1 && <nav aria-label="Phân trang" className="flex items-center gap-4">
        <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="disabled:opacity-40">Trang trước</button>
        <span>Trang {page + 1} / {data.totalPages}</span>
        <button disabled={page + 1 >= data.totalPages} onClick={() => setPage((p) => p + 1)} className="disabled:opacity-40">Trang sau</button>
      </nav>}
    </section>
  );
}
