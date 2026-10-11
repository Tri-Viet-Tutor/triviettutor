import { useQuery } from "@tanstack/react-query";
import { PortalPageHeader } from "@/features/portal/components/PortalPageHeader";
import { PortalError, PortalLoading } from "@/features/portal/components/PortalState";
import { useUserId } from "@/features/portal/hooks/usePortalData";
import { fetchAvailability } from "@/features/tutor/api/tutorApi";
import { AvailabilityEditor } from "@/features/tutor/components/AvailabilityEditor";

/** Trang Lịch rảnh của gia sư: khai các khung giờ dạy được (GET / PUT /tutor/availability). */
export function TutorAvailabilityPage() {
  const userId = useUserId();
  const queryKey = ["tutor", userId, "availability"] as const;
  const query = useQuery({ queryKey, queryFn: fetchAvailability });

  return (
    <>
      <PortalPageHeader title="Lịch rảnh" description="Trung tâm dựa vào lịch này để gợi ý khi phân công lớp." />
      {query.isPending ? (
        <PortalLoading label="Đang tải lịch rảnh" />
      ) : query.isError ? (
        <PortalError message="Không tải được lịch rảnh." onRetry={() => void query.refetch()} />
      ) : (
        <AvailabilityEditor saved={query.data} queryKey={queryKey} />
      )}
    </>
  );
}
