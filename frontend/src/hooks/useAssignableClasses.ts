import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";
import { adminKeys, useAdminSessions } from "@/hooks/useAdminData";
import { managementKeys } from "@/hooks/useManagementData";
import type { ClassSummary } from "@/interfaces/admin";
import type { AdminClassesQuery, AdminSessionsQuery, ClassStatus, IsoDate } from "@/interfaces/api";
import { fetchAdminSessions } from "@/services/admin";
import { fetchAdminClasses } from "@/services/managementService";
import { summarizeClasses } from "@/utils/classes";

/** Số buổi / lớp tối đa mỗi lần tải (giới hạn của backend) */
const PAGE_SIZE = 100;

/** Lớp còn phân công hoặc đổi gia sư được: đang tuyển sinh, đã phân công, đang học */
const ASSIGNABLE_STATUSES: ClassStatus[] = ["ENROLLING", "ASSIGNED", "IN_PROGRESS"];

/**
 * Các lớp còn phân công được (GET /admin/classes theo trạng thái), mỗi lớp kèm buổi sắp tới và gia sư hiện tại.
 * Buổi sắp tới lấy một lần cho 100 buổi gần nhất (GET /admin/sessions); lớp nào chưa có trong đó thì tải riêng
 * buổi của lớp đó. Lớp không còn buổi nào từ `from` trở đi thì bỏ qua vì không còn buổi để phân công.
 */
export function useAssignableClasses(from: IsoDate) {
  const sessionsQuery = useAdminSessions({ from, page: 0, size: PAGE_SIZE });
  const classQueries = useQueries({
    queries: ASSIGNABLE_STATUSES.map((status) => {
      const query: AdminClassesQuery = { status, page: 0, size: PAGE_SIZE };
      return { queryKey: managementKeys.classes(query), queryFn: () => fetchAdminClasses(query) };
    }),
  });

  // Mã các lớp còn phân công được (chỉ có khi đã tải xong cả ba trạng thái)
  const assignableIds = classQueries.every((query) => query.data)
    ? new Set(classQueries.flatMap((query) => query.data?.content.map((item) => item.id) ?? []))
    : null;
  const scanned = useMemo(() => summarizeClasses(sessionsQuery.data?.content ?? []), [sessionsQuery.data]);
  // Lớp còn phân công được nhưng không có buổi nào trong 100 buổi gần nhất
  const missingIds =
    sessionsQuery.data && assignableIds ? [...assignableIds].filter((id) => !scanned.some((item) => item.classId === id)) : [];
  const missingQueries = useQueries({
    queries: missingIds.map((classGroupId) => {
      const query: AdminSessionsQuery = { from, classGroupId, page: 0, size: PAGE_SIZE };
      return { queryKey: adminKeys.sessions(query), queryFn: () => fetchAdminSessions(query) };
    }),
  });

  // Thông tin từng lớp (tên khóa, lịch, sĩ số, gia sư đã phân công trước khi có buổi)
  const infoById = new Map(classQueries.flatMap((query) => query.data?.content ?? []).map((item) => [item.id, item]));
  const classes: ClassSummary[] = assignableIds
    ? [
        ...scanned.filter((item) => assignableIds.has(item.classId)),
        ...missingQueries.flatMap((query) => summarizeClasses(query.data?.content ?? [])),
      ]
        .map((item) => {
          const info = infoById.get(item.classId);
          return { ...item, info, tutorId: item.tutorId ?? info?.tutorId ?? null };
        })
        .sort((a, b) => Number(a.tutorId !== null) - Number(b.tutorId !== null) || a.classId - b.classId)
    : [];
  const all = [sessionsQuery, ...classQueries, ...missingQueries];
  return {
    classes,
    isPending: all.some((query) => query.isPending),
    isError: all.some((query) => query.isError),
    refetch: () => all.forEach((query) => void query.refetch()),
  };
}
