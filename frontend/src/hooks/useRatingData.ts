import { useQueries, useQuery } from "@tanstack/react-query";
import { useMyEnrollments } from "@/hooks/useManagementData";
import type { TuitionClass } from "@/interfaces/api";
import { fetchMyRating } from "@/services/ratingService";
import { getTuitionClass } from "@/services/tuitionPaymentService";

export interface StudentTutor {
  id: number;
  name: string;
  classes: TuitionClass[];
}

/** Gia sư của các lớp học viên đang học (GET /enrollments/my → GET /catalog/classes/{id}), gom theo gia sư */
export function useStudentTutors() {
  const enrollments = useMyEnrollments();
  const classIds = [...new Set((enrollments.data?.content ?? []).filter((item) => item.status === "ACTIVE").map((item) => item.classGroupId))];
  const classes = useQueries({
    queries: classIds.map((id) => ({ queryKey: ["catalog-class", id], queryFn: () => getTuitionClass(id), staleTime: 5 * 60_000, retry: false })),
  });
  const byTutor = new Map<number, StudentTutor>();
  for (const query of classes) {
    const item = query.data;
    if (!item?.tutorId) continue;
    const entry = byTutor.get(item.tutorId) ?? { id: item.tutorId, name: item.tutorName ?? "Gia sư", classes: [] };
    entry.classes.push(item);
    byTutor.set(item.tutorId, entry);
  }
  return {
    tutors: [...byTutor.values()],
    isPending: enrollments.isPending || classes.some((query) => query.isPending),
    isError: enrollments.isError,
    refetch: () => void enrollments.refetch(),
  };
}

/** Đánh giá của tôi cho một gia sư (null: chưa đánh giá) */
export function useMyRating(tutorId: number) {
  return useQuery({ queryKey: ["my-rating", tutorId], queryFn: () => fetchMyRating(tutorId), retry: false });
}
